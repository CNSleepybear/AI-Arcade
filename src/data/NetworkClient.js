import { supabase } from './supabase.js';

// Theoretical maximum scores per game — any score exceeding these is rejected.
// These are set well above what a legitimate player can achieve in a single run.
const THEORETICAL_MAX_SCORES = {
  'anomaly':              500000,
  'cyber-hunder':         99999,
  'dark-water-stealth':   99999,
  'leave-at-6pm-evolved': 99999,
};

// Simple djb2 hash for integrity watermark (NOT cryptographic, just a tripwire)
function hashScore(gameId, score, ts) {
  let h = 5381;
  const s = `${gameId}:${score}:${ts}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

export class NetworkClient {
  constructor() {
    this._chatCallbacks = [];
    this._leaderboardCallbacks = [];
    this._connected = false;
    this._lastScoreReport = {}; // gameId → { score, ts } debounce
  }

  connect() {
    if (this._connected) return;
    this._connected = true;

    this._chatChannel = supabase
      .channel('chat-room')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new;
          for (const cb of this._chatCallbacks) {
            cb({
              author: msg.author,
              text: msg.text,
              color: msg.color || '#00ffcc',
              time: new Date(msg.created_at).getTime()
            });
          }
        }
      )
      .subscribe();

    this._scoreChannel = supabase
      .channel('score-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'scores' },
        (payload) => {
          for (const cb of this._leaderboardCallbacks) {
            cb(payload);
          }
        }
      )
      .subscribe();

    console.log('[NetworkClient] connected to Supabase Realtime');
  }

  disconnect() {
    this._connected = false;
    if (this._chatChannel) { supabase.removeChannel(this._chatChannel); this._chatChannel = null; }
    if (this._scoreChannel) { supabase.removeChannel(this._scoreChannel); this._scoreChannel = null; }
  }

  async sendChat(msg) {
    if (!msg.text || !msg.text.trim()) return;
    const { error } = await supabase.from('messages').insert({
      author: msg.author,
      text: msg.text.trim(),
      color: msg.color || '#00ffcc',
    });
    if (error) console.warn('[NetworkClient] sendChat error:', error.message);
  }

  onChat(cb) {
    this._chatCallbacks.push(cb);
  }

  /**
   * Fetch messages from the last 24 hours only.
   */
  async fetchChatHistory(limit = 50) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('messages')
      .select('author, text, color, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) { console.warn('[NetworkClient] fetchChatHistory error:', error.message); return []; }

    return (data || []).reverse().map(row => ({
      author: row.author,
      text: row.text,
      color: row.color || '#00ffcc',
      time: new Date(row.created_at).getTime()
    }));
  }

  async sendScore(gameId, name, score) {
    // --- Tamper-evident validations ---
    if (!Number.isFinite(score) || score < 0) {
      console.warn('[NetworkClient] Rejected: invalid score value', score);
      return;
    }
    const maxScore = THEORETICAL_MAX_SCORES[gameId];
    if (maxScore && score > maxScore) {
      console.warn('[NetworkClient] Rejected: score exceeds theoretical max', gameId, score, '>', maxScore);
      return;
    }
    // Rate-limit: same game can't report more than once per 2 seconds
    const now = Date.now();
    const last = this._lastScoreReport[gameId];
    if (last && (now - last.ts) < 2000 && score <= last.score) {
      return; // duplicate / spam
    }
    this._lastScoreReport[gameId] = { score, ts: now };

    // Integrity watermark — makes trivial memory editing harder
    const watermark = hashScore(gameId, score, now);

    const { error } = await supabase.rpc('upsert_score', {
      p_game_id: gameId,
      p_name: name,
      p_score: score,
      // The watermark can be verified server-side if you add it to the RPC
      // p_watermark: watermark,
    });
    if (error) console.warn('[NetworkClient] sendScore error:', error.message);
  }

  async fetchLeaderboard(gameId, limit = 10) {
    const { data, error } = await supabase
      .from('scores')
      .select('name, score')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .limit(limit);
    if (error) { console.warn('[NetworkClient] fetchLeaderboard error:', error.message); return []; }
    return data || [];
  }

  onLeaderboardChange(cb) {
    this._leaderboardCallbacks.push(cb);
  }
}

export const networkClient = new NetworkClient();
export default networkClient;
