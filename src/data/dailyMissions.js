/**
 * Daily Missions — random rotating tasks with coin rewards.
 */

import { t } from './i18n.js';

export function getMissionPool() {
  return [
    { id: 'play_games_1', text: t('mission.play_1'), icon: '🎮', target: 1, reward: 5, key: '_dm_play' },
    { id: 'play_games_3', text: t('mission.play_3'), icon: '🕹️', target: 3, reward: 15, key: '_dm_play' },
    { id: 'drink_1',     text: t('mission.drink_1'), icon: '🍺', target: 1, reward: 3, key: '_dm_drink' },
    { id: 'drink_2',     text: t('mission.drink_2'), icon: '🍻', target: 2, reward: 8, key: '_dm_drink' },
    { id: 'chat_2',      text: t('mission.chat_2'), icon: '💬', target: 2, reward: 4, key: '_dm_chat' },
    { id: 'shard_1',     text: t('mission.shard_1'), icon: '💎', target: 1, reward: 10, key: '_dm_shard' },
    { id: 'score_50',    text: t('mission.score_50'), icon: '⭐', target: 50, reward: 8, key: '_dm_score' },
    { id: 'coins_earn',  text: t('mission.coins_earn'), icon: '🪙', target: 20, reward: 10, key: '_dm_coins' },
    { id: 'fish_3',      text: t('mission.fish_3'), icon: '🎣', target: 3, reward: 12, key: '_dm_fish' },
  ];
}

const MISSION_POOL = getMissionPool();

/**
 * Get today's date string (YYYY-MM-DD).
 */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Generate 3 daily missions. Reuses existing if same day.
 * @param {object} save
 * @returns {{ missions: object[], date: string }}
 */
export function getDailyMissions(save) {
  const date = todayStr();
  if (save.dailyDate === date && save.dailyMissions?.length) {
    // Refresh mission text in case language changed
    const pool = getMissionPool();
    for (const m of save.dailyMissions) {
      const found = pool.find(p => p.id === m.id);
      if (found) m.text = found.text;
    }
    return { missions: save.dailyMissions, date };
  }
  // Shuffle and pick 3
  const pool = getMissionPool();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const missions = pool.slice(0, 3).map(m => ({
    ...m,
    progress: 0,
    done: false,
    claimed: false,
  }));
  save.dailyMissions = missions;
  save.dailyDate = date;
  // Reset daily counters
  save._dm_play = 0;
  save._dm_drink = 0;
  save._dm_chat = 0;
  save._dm_shard = 0;
  save._dm_score = 0;
  save._dm_coins = 0;
  return { missions, date };
}

/**
 * Update mission progress based on key and delta.
 * @param {object} save
 * @param {string} key - counter key
 * @param {number} delta - amount to add
 * @returns {{ completed: {text,reward}[] }} newly completed missions
 */
export function updateMissionProgress(save, key, delta = 1) {
  if (save[key] !== undefined) save[key] = (save[key] || 0) + delta;
  if (!save.dailyMissions) return { completed: [] };
  const completed = [];
  for (const m of save.dailyMissions) {
    if (m.done || m.claimed) continue;
    if (m.key === key) {
      m.progress = Math.min(save[key] || 0, m.target);
      if (m.progress >= m.target) {
        m.done = true;
        completed.push({ text: m.text, reward: m.reward, icon: m.icon });
      }
    }
  }
  return { completed };
}

/**
 * Claim reward for a completed mission.
 * @returns {number} coins awarded, or -1 if not completable
 */
export function claimMission(save, missionIndex) {
  const m = save.dailyMissions?.[missionIndex];
  if (!m || !m.done || m.claimed) return -1;
  m.claimed = true;
  save.coins = (save.coins || 0) + m.reward;
  return m.reward;
}
