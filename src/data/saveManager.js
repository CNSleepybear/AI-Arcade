import { CHARACTERS, getDefaultCharacter } from './characterDB.js';
import { supabase } from './supabase.js';

const SAVE_KEY = 'ai_arcade_save_v2';
const SESSION_PREFIX = 'ai_arcade_session_';
const CLOUD_DEBOUNCE_MS = 3000;

let _playerId = null;
let _cloudLastSaved = 0;
let _cloudPendingTimer = null;
let _cloudPendingData = null;
let _saveCache = null; // In-memory cache to avoid repeated localStorage reads

function buildDefaultSave() {
  const defaultChar = getDefaultCharacter();
  const characters = {};
  for (const c of CHARACTERS) {
    characters[c.id] = {
      stats: { ...c.baseStats },
      exp: 0,
      unlocked: c.unlockCondition === 'default',
      roshamboWins: 0,
      abyssAnglerBoss: false,
      paperRitualCompleted: false,
    };
  }
  return {
    currentCharId: defaultChar.id,
    characters,
    globalScore: 0,
    coins: 10,
    completedGames: [],
    shardsCollected: 0,
    hiddenMachineUnlocked: false,
    achievements: {},
    _lastScore: 0,
    _drinksBought: 0,
    _chatSent: 0,
  };
}

/** Merge two save objects: keep the higher globalScore, OR the union of per-character data. */
function _mergeSaves(local, remote) {
  if (!remote) return local;
  const merged = local;
  // Take higher globalScore
  if (remote.globalScore > merged.globalScore) merged.globalScore = remote.globalScore;
  // Union completedGames
  if (remote.completedGames) {
    for (const gid of remote.completedGames) {
      if (!merged.completedGames.includes(gid)) merged.completedGames.push(gid);
    }
  }
  // Take higher shardsCollected
  if (remote.shardsCollected > merged.shardsCollected) merged.shardsCollected = remote.shardsCollected;
  // Take hiddenMachineUnlocked if either is true
  if (remote.hiddenMachineUnlocked) merged.hiddenMachineUnlocked = true;
  // Per-character: take higher exp, higher stats, OR unlock flags
  if (remote.characters) {
    for (const [cid, rch] of Object.entries(remote.characters)) {
      if (!merged.characters[cid]) { merged.characters[cid] = rch; continue; }
      const lch = merged.characters[cid];
      if (rch.exp > lch.exp) lch.exp = rch.exp;
      if (rch.unlocked) lch.unlocked = true;
      if (rch.roshamboWins > (lch.roshamboWins || 0)) lch.roshamboWins = rch.roshamboWins;
      if (rch.abyssAnglerBoss) lch.abyssAnglerBoss = true;
      if (rch.paperRitualCompleted) lch.paperRitualCompleted = true;
      if (rch.stats) {
        for (const [sk, sv] of Object.entries(rch.stats)) {
          if (lch.stats[sk] !== undefined && sv > lch.stats[sk]) lch.stats[sk] = sv;
        }
      }
    }
  }
  return merged;
}

export const SaveManager = {
  /** Invalidate cache — called when cloud merge changes data */
  _invalidateCache() { _saveCache = null; },

  // Flush pending cloud save on page close (prevent data loss)
  // Flush pending cloud save on page close (prevent data loss)
  _flushOnBeforeUnload() {
    if (_cloudPendingTimer) {
      clearTimeout(_cloudPendingTimer);
      _cloudPendingTimer = null;
    }
    if (_cloudPendingData && _playerId) {
      // Fire-and-forget fetch with keepalive for reliable delivery before page unload
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      fetch(`${SUPABASE_URL}/rest/v1/rpc/save_game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ p_player_id: _playerId, p_data: _cloudPendingData }),
        keepalive: true,
      }).catch(() => {});
      _cloudPendingData = null;
    }
  },

  // ==================== Cloud Sync ====================

  /**
   * Set the current logged-in player. Must be called after login/register.
   * Triggers an async sync from cloud.
   * @param {string|null} playerId — null to disable cloud sync
   */
  setPlayerId(playerId) {
    _playerId = playerId;
    _cloudLastSaved = 0;
    if (playerId) {
      window.addEventListener('beforeunload', SaveManager._flushOnBeforeUnload);
    } else {
      window.removeEventListener('beforeunload', SaveManager._flushOnBeforeUnload);
    }
  },

  /**
   * Pull save from Supabase, merge with local, persist the merged result.
   * Call once after login. Returns the merged save object.
   * @returns {Promise<object>}
   */
  async syncFromCloud() {
    if (!_playerId) return this.load();

    const { data, error } = await supabase.rpc('load_game', { p_player_id: _playerId });

    if (error) {
      console.warn('[SaveManager] syncFromCloud error:', error.message);
      // If table doesn't exist yet, just use local
      const local = this.load();
      this._scheduleCloudPush(local);
      return local;
    }

    if (!data || data.length === 0) {
      // No cloud save yet — push local to cloud
      const local = this.load();
      this._scheduleCloudPush(local);
      return local;
    }

    const remote = data[0].data;
    const remoteTime = new Date(data[0].updated_at).getTime();
    const local = this.load();

    // Merge: cloud-first but union with local
    const merged = _mergeSaves(local, remote);
    this.save(merged);

    // If local had things cloud didn't, push back
    if (JSON.stringify(merged) !== JSON.stringify(remote)) {
      this._scheduleCloudPush(merged);
    } else {
      _cloudLastSaved = remoteTime;
    }

    console.log('[SaveManager] synced from cloud, globalScore:', merged.globalScore);
    return merged;
  },

  /** Debounced push to Supabase. Called automatically by save(). */
  async _pushToServer(data) {
    if (!_playerId) return;

    const { error } = await supabase.rpc('save_game', {
      p_player_id: _playerId,
      p_data: data,
    });

    if (error) {
      console.warn('[SaveManager] _pushToServer error:', error.message);
    } else {
      _cloudLastSaved = Date.now();
    }
  },

  _scheduleCloudPush(data) {
    _cloudPendingData = data;
    if (_cloudPendingTimer) return; // already scheduled
    _cloudPendingTimer = setTimeout(async () => {
      _cloudPendingTimer = null;
      const d = _cloudPendingData;
      _cloudPendingData = null;
      if (d) await this._pushToServer(d);
    }, CLOUD_DEBOUNCE_MS);
  },

  // ==================== Global Save ====================

  load() {
    if (_saveCache) return _saveCache;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const c of CHARACTERS) {
          if (!parsed.characters[c.id]) {
            parsed.characters[c.id] = {
              stats: { ...c.baseStats },
              exp: 0,
              unlocked: c.unlockCondition === 'default',
              roshamboWins: 0,
              abyssAnglerBoss: false,
              paperRitualCompleted: false,
            };
          }
        }
        _saveCache = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn('Save file corrupted, resetting:', e);
    }
    _saveCache = buildDefaultSave();
    return _saveCache;
  },

  save(data) {
    _saveCache = data;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save:', e);
    }
    // Schedule cloud push if logged in
    if (_playerId) {
      this._scheduleCloudPush(data);
    }
  },

  getCurrentChar() {
    const save = this.load();
    const dbEntry = CHARACTERS.find(c => c.id === save.currentCharId);
    const progress = save.characters[save.currentCharId];
    if (!dbEntry || !progress) {
      const def = getDefaultCharacter();
      save.currentCharId = def.id;
      this.save(save);
      return { ...def, ...save.characters[def.id], save };
    }
    return { ...dbEntry, ...progress, save };
  },

  setCurrentChar(id) {
    const save = this.load();
    if (save.characters[id]?.unlocked) {
      save.currentCharId = id;
      this.save(save);
      return true;
    }
    return false;
  },

  isUnlocked(charId) {
    return this.load().characters[charId]?.unlocked ?? false;
  },

  applyGameResult(charId, result) {
    const save = this.load();
    const char = save.characters[charId];
    if (!char) return save;

    char.exp += result.score || 0;
    save.globalScore += result.score || 0;

    if (result.statGrowth) {
      for (const [k, v] of Object.entries(result.statGrowth)) {
        if (char.stats[k] !== undefined) char.stats[k] += v;
      }
    }

    // Per-game achievement flags
    if (result.wins) char.roshamboWins = (char.roshamboWins || 0) + (result.wins || 0);
    if (result.abyssAnglerBoss) char.abyssAnglerBoss = true;
    if (result.paperRitualCompleted) char.paperRitualCompleted = true;

    if (result.gameId && !save.completedGames.includes(result.gameId)) {
      save.completedGames.push(result.gameId);
    }

    this._checkUnlocks(save);

    if (result.newUnlocks) {
      for (const uid of result.newUnlocks) {
        if (save.characters[uid]) save.characters[uid].unlocked = true;
      }
    }

    this.save(save);
    return save;
  },

  _checkUnlocks(save) {
    for (const c of CHARACTERS) {
      if (typeof c.unlockCondition === 'object' && !save.characters[c.id].unlocked) {
        const cond = c.unlockCondition;
        if (cond.type === 'score' && save.globalScore >= cond.threshold) {
          save.characters[c.id].unlocked = true;
        }
        if (cond.type === 'game' && save.completedGames.includes(cond.gameId)) {
          save.characters[c.id].unlocked = true;
        }
      }
    }
  },

  getUnlockedCharacters() {
    const save = this.load();
    return CHARACTERS.map(c => ({
      ...c,
      unlocked: save.characters[c.id]?.unlocked ?? false,
      stats: save.characters[c.id]?.stats ?? { ...c.baseStats },
      exp: save.characters[c.id]?.exp ?? 0,
    }));
  },

  // ==================== Per-Game Session ====================

  /** Save game session state (arbitrary JSON, keyed by gameId + charId) */
  saveSession(gameId, charId, data) {
    try {
      const key = SESSION_PREFIX + gameId + '_' + charId;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  },

  /** Restore previously saved game session */
  loadSession(gameId, charId) {
    try {
      const key = SESSION_PREFIX + gameId + '_' + charId;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  /** Clear session after game completion */
  clearSession(gameId, charId) {
    try {
      const key = SESSION_PREFIX + gameId + '_' + charId;
      localStorage.removeItem(key);
    } catch (e) { /* ignore */ }
  },
};
