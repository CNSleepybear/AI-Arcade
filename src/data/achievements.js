/**
 * Achievement System — data-driven unlockables with toast notifications.
 *
 * Each achievement has:
 *   - id: unique key
 *   - title: display name
 *   - desc: flavor text
 *   - icon: emoji
 *   - check(save): returns true if unlocked
 */

import { t } from './i18n.js';

/**
 * Build achievements array with translated text.
 * Returns new array each call so language changes are reflected.
 */
export function getAchievements() {
  return [
    {
      id: 'first_game',
      title: t('ach.first_game.title'),
      desc: t('ach.first_game.desc'),
      icon: '🎮',
      check: (save) => (save.completedGames?.length || 0) >= 1,
    },
    {
      id: 'score_100',
      title: t('ach.score_100.title'),
      desc: t('ach.score_100.desc'),
      icon: '💯',
      check: (save) => (save._lastScore || 0) >= 100,
    },
    {
      id: 'score_1000',
      title: t('ach.score_1000.title'),
      desc: t('ach.score_1000.desc'),
      icon: '👑',
      check: (save) => (save.globalScore || 0) >= 1000,
    },
    {
      id: 'score_5000',
      title: t('ach.score_5000.title'),
      desc: t('ach.score_5000.desc'),
      icon: '🌟',
      check: (save) => (save.globalScore || 0) >= 5000,
    },
    {
      id: 'shard_1',
      title: t('ach.shard_1.title'),
      desc: t('ach.shard_1.desc'),
      icon: '💎',
      check: (save) => (save.shardsCollected || 0) >= 1,
    },
    {
      id: 'shard_3',
      title: t('ach.shard_3.title'),
      desc: t('ach.shard_3.desc'),
      icon: '🔮',
      check: (save) => (save.shardsCollected || 0) >= 3,
    },
    {
      id: 'drink_3',
      title: t('ach.drink_3.title'),
      desc: t('ach.drink_3.desc'),
      icon: '🍻',
      check: (save) => (save._drinksBought || 0) >= 3,
    },
    {
      id: 'coins_50',
      title: t('ach.coins_50.title'),
      desc: t('ach.coins_50.desc'),
      icon: '💰',
      check: (save) => (save.coins || 0) >= 50,
    },
    {
      id: 'unlock_char',
      title: t('ach.unlock_char.title'),
      desc: t('ach.unlock_char.desc'),
      icon: '🎭',
      check: (save) => {
        const chars = save.characters || {};
        return Object.values(chars).filter(c => c.unlocked).length >= 2;
      },
    },
    {
      id: 'chat_5',
      title: t('ach.chat_5.title'),
      desc: t('ach.chat_5.desc'),
      icon: '💬',
      check: (save) => (save._chatSent || 0) >= 5,
    },
    {
      id: 'hidden_machine',
      title: t('ach.hidden_machine.title'),
      desc: t('ach.hidden_machine.desc'),
      icon: '🚫',
      check: (save) => !!save.hiddenMachineUnlocked,
    },
    {
      id: 'all_ready',
      title: t('ach.all_ready.title'),
      desc: t('ach.all_ready.desc'),
      icon: '🏆',
      check: (save) => {
        return save.hiddenMachineUnlocked && (save.completedGames?.length || 0) >= 2;
      },
    },

    // ==================== Cat Achievements ====================
    {
      id: 'cat_first',
      title: t('ach.cat_first.title'),
      desc: t('ach.cat_first.desc'),
      icon: '🐱',
      check: (save) => (save._catStats?.totalPets || 0) >= 1,
    },
    {
      id: 'cat_all',
      title: t('ach.cat_all.title'),
      desc: t('ach.cat_all.desc'),
      icon: '🐈',
      check: (save) => (save._catStats?.uniqueCats || 0) >= 4,
    },
    {
      id: 'cat_20',
      title: t('ach.cat_20.title'),
      desc: t('ach.cat_20.desc'),
      icon: '🌿',
      check: (save) => (save._catStats?.totalPets || 0) >= 20,
    },
  ];
}

export const ACHIEVEMENTS = getAchievements();

/**
 * Check all achievements and return newly unlocked ones.
 * @param {object} save — full save object
 * @param {object} unlocked — existing unlocked set
 * @returns {{ id, title, desc, icon }[]} newly unlocked
 */
export function checkAchievements(save, unlocked = {}) {
  const newly = [];
  const achievements = getAchievements();
  for (const a of achievements) {
    if (unlocked[a.id]) continue;
    try {
      if (a.check(save)) {
        newly.push(a);
        unlocked[a.id] = true;
      }
    } catch (e) {
      // ignore errors in check
    }
  }
  return newly;
}
