/**
 * E.V.E. 离线对话语料库 — ~70 条中英双语对话模板
 * 
 * 所有字符串需保持在 obfuscator reservedStrings 白名单中。
 * 模板变量: {score}, {coins}, {gameName}, {collected}, {total},
 *           {drink}, {charName}, {stat}, {keyword}, {idleSeconds}
 */

import { t } from '../i18n.js';

export function getEveResponses() {
  return {
    // ─── 进入游戏 ───
    GAME_STARTED: {
      anomaly: [
        t('eve.game_started.anomaly.0'),
        t('eve.game_started.anomaly.1'),
        t('eve.game_started.anomaly.2'),
      ],
      'cyber-hunder': [
        t('eve.game_started.cyber-hunder.0'),
        t('eve.game_started.cyber-hunder.1'),
        t('eve.game_started.cyber-hunder.2'),
      ],
      'dark-water-stealth': [
        t('eve.game_started.dark-water-stealth.0'),
        t('eve.game_started.dark-water-stealth.1'),
        t('eve.game_started.dark-water-stealth.2'),
      ],
      'leave-at-6pm-evolved': [
        t('eve.game_started.leave-at-6pm-evolved.0'),
        t('eve.game_started.leave-at-6pm-evolved.1'),
        t('eve.game_started.leave-at-6pm-evolved.2'),
      ],
    },

    // ─── 游戏结束 ───
    GAME_OVER: {
      highScore: [
        t('eve.game_over.highScore.0'),
        t('eve.game_over.highScore.1'),
        t('eve.game_over.highScore.2'),
      ],
      normal: [
        t('eve.game_over.normal.0'),
        t('eve.game_over.normal.1'),
        t('eve.game_over.normal.2'),
      ],
      lowScore: [
        t('eve.game_over.lowScore.0'),
        t('eve.game_over.lowScore.1'),
        t('eve.game_over.lowScore.2'),
      ],
    },

    // ─── 钓鱼 ───
    FISH_CAUGHT: [
      t('eve.fish_caught.0'),
      t('eve.fish_caught.1'),
      t('eve.fish_caught.2'),
      t('eve.fish_caught.3'),
      t('eve.fish_caught.4'),
      t('eve.fish_caught.5'),
    ],
    FISH_MISSED: [
      t('eve.fish_missed.0'),
      t('eve.fish_missed.1'),
    ],

    // ─── 碎片收集 ───
    SHARD_COLLECTED: [
      t('eve.shard_collected.0'),
      t('eve.shard_collected.1'),
      t('eve.shard_collected.2'),
      t('eve.shard_collected.3'),
    ],

    // ─── 买酒 ───
    DRINK_BOUGHT: {
      VoidBeer: [
        t('eve.drink.VoidBeer.0'),
        t('eve.drink.VoidBeer.1'),
      ],
      RedstoneLiquor: [
        t('eve.drink.RedstoneLiquor.0'),
        t('eve.drink.RedstoneLiquor.1'),
      ],
      NetherBlend: [
        t('eve.drink.NetherBlend.0'),
        t('eve.drink.NetherBlend.1'),
      ],
    },

    // ─── Buff 过期 ───
    BUFF_EXPIRED: [
      t('eve.buff_expired.0'),
      t('eve.buff_expired.1'),
    ],

    // ─── 世界聊天点评 ───
    CHAT_COMMENT: [
      t('eve.chat_comment.0'),
      t('eve.chat_comment.1'),
      t('eve.chat_comment.2'),
      t('eve.chat_comment.3'),
      t('eve.chat_comment.4'),
      t('eve.chat_comment.5'),
      t('eve.chat_comment.6'),
      t('eve.chat_comment.7'),
    ],

    // ─── 闲谈（周期性） ───
    IDLE_CHAT: [
      t('eve.idle.0'),
      t('eve.idle.1'),
      t('eve.idle.2'),
      t('eve.idle.3'),
      t('eve.idle.4'),
      t('eve.idle.5'),
      t('eve.idle.6'),
      t('eve.idle.7'),
      t('eve.idle.8'),
      t('eve.idle.9'),
      t('eve.idle.10'),
      t('eve.idle.11'),
      t('eve.idle.12'),
    ],

    // ─── 深渊进出 ───
    DEPTHS_ENTERED: [
      t('eve.depths_entered.0'),
      t('eve.depths_entered.1'),
      t('eve.depths_entered.2'),
    ],
    DEPTHS_EXITED: [
      t('eve.depths_exited.0'),
      t('eve.depths_exited.1'),
    ],

    // ─── 登录 ───
    LOGIN: [
      t('eve.login.0'),
      t('eve.login.1'),
      t('eve.login.2'),
    ],

    // ─── 切换角色 ───
    CHARACTER_SWITCH: [
      t('eve.char_switch.0'),
      t('eve.char_switch.1'),
      t('eve.char_switch.2'),
      t('eve.char_switch.3'),
    ],

    // ─── 撸猫 ───
    CAT_PET: [
      t('eve.cat.0'),
      t('eve.cat.1'),
      t('eve.cat.2'),
      t('eve.cat.3'),
      t('eve.cat.4'),
      t('eve.cat.5'),
      t('eve.cat.6'),
      t('eve.cat.7'),
      t('eve.cat.8'),
    ],

    // ─── 万国馆 ───
    SANCTUARY_ENTERED: [
      t('eve.sanctuary.0'),
      t('eve.sanctuary.1'),
      t('eve.sanctuary.2'),
    ],
    GLOBE_VIEWING: [
      t('eve.globe_viewing.0'),
      t('eve.globe_viewing.1'),
      t('eve.globe_viewing.2'),
      t('eve.globe_viewing.3'),
    ],
    GLOBE_ZOOMED: [
      t('eve.globe_zoomed.0'),
      t('eve.globe_zoomed.1'),
      t('eve.globe_zoomed.2'),
      t('eve.globe_zoomed.3'),
    ],
  };
}

export const EVE_RESPONSES = getEveResponses();

/**
 * 从数组中随机选择一条，支持变量替换。
 * @param {string[]} templates
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
const lastPicks = new Map();
export function pickResponse(templates, vars = {}) {
  if (!templates || templates.length === 0) return '...';
  const key=templates.join('\u0000'),previous=lastPicks.get(key);
  let index=Math.floor(Math.random()*templates.length);
  if(templates.length>1&&index===previous)index=(index+1+Math.floor(Math.random()*(templates.length-1)))%templates.length;
  lastPicks.set(key,index);if(lastPicks.size>80)lastPicks.delete(lastPicks.keys().next().value);
  let text = templates[index];
  for (const [key, val] of Object.entries(vars)) {
    text = text.replaceAll(`{${key}}`, String(val));
  }
  return text;
}
