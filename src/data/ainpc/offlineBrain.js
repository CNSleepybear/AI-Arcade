/**
 * E.V.E. 离线状态机 — 事件总线 + 规则匹配引擎
 * 
 * 匹配优先级: 精确 > 事件类型 > 周期 > 聊天 > 空闲
 */

import { getEveResponses, pickResponse } from './eveResponses.js';
import { loadSettings } from './npcSettings.js';

// ─── 事件类型常量 ───
export const TRIGGER = {
  GAME_STARTED: 'GAME_STARTED',
  GAME_OVER: 'GAME_OVER',
  FISH_CAUGHT: 'FISH_CAUGHT',
  FISH_MISSED: 'FISH_MISSED',
  SHARD_COLLECTED: 'SHARD_COLLECTED',
  DRINK_BOUGHT: 'DRINK_BOUGHT',
  BUFF_EXPIRED: 'BUFF_EXPIRED',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  PLAYER_IDLE: 'PLAYER_IDLE',
  HIGH_SCORE: 'HIGH_SCORE',
  DEPTHS_ENTERED: 'DEPTHS_ENTERED',
  DEPTHS_EXITED: 'DEPTHS_EXITED',
  CHARACTER_SWITCH: 'CHARACTER_SWITCH',
  LOGIN: 'LOGIN',
  CAT_PET: 'CAT_PET',
  SANCTUARY_ENTERED: 'SANCTUARY_ENTERED',
  GLOBE_VIEWING: 'GLOBE_VIEWING',
  GLOBE_ZOOMED: 'GLOBE_ZOOMED',
};

// ─── 离线脑内部状态 ───
let idleTimer = null;
let idleChatTimer = null;
let lastTriggerTime = 0;
let onCommentCallback = null;

const IDLE_THRESHOLD_MS = 60000;    // 60s 无操作视为发呆
const IDLE_CHAT_MIN_MS = 45000;     // 最短闲谈间隔
const IDLE_CHAT_MAX_MS = 90000;     // 最长闲谈间隔
const MIN_TRIGGER_GAP_MS = 3000;    // 两次触发最小间隔

/**
 * 设置评论回调（由 AINPC.js 注册）
 * @param {(text: string) => void} cb
 */
export function setCommentCallback(cb) {
  onCommentCallback = cb;
}

/**
 * 发出评论（内部调用回调）
 */
function _comment(text) {
  if (!text || !onCommentCallback) return;
  const now = Date.now();
  if (now - lastTriggerTime < MIN_TRIGGER_GAP_MS) return;
  lastTriggerTime = now;
  onCommentCallback(text);
}

/**
 * 启动空闲检测（5 秒轮询一次不活动状态）
 * @param {() => number} getLastActivityMs - 返回距上次活动的时间戳
 */
export function startIdleDetection(getLastActivityMs) {
  stopIdleDetection();

  idleTimer = setInterval(() => {
    const idleMs = getLastActivityMs();
    if (idleMs > IDLE_THRESHOLD_MS) {
      _comment(pickResponse(getEveResponses().IDLE_CHAT, { idleSeconds: Math.floor(idleMs / 1000) }));
    }
  }, 5000);

  // 周期性闲谈
  scheduleIdleChat();
}

function scheduleIdleChat() {
  if (idleChatTimer) clearTimeout(idleChatTimer);
  const delay = IDLE_CHAT_MIN_MS + Math.random() * (IDLE_CHAT_MAX_MS - IDLE_CHAT_MIN_MS);
  idleChatTimer = setTimeout(() => {
    _comment(pickResponse(getEveResponses().IDLE_CHAT));
    scheduleIdleChat();
  }, delay);
}

/**
 * 停止所有定时器
 */
export function stopIdleDetection() {
  if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
  if (idleChatTimer) { clearTimeout(idleChatTimer); idleChatTimer = null; }
}

/**
 * 主触发入口：根据事件类型和 payload 匹配规则并返回对话文本。
 * 
 * @param {string} eventType - TRIGGER 中的事件类型
 * @param {object} payload - 事件携带数据
 * @returns {string|null} 匹配到的对话文本，或 null（无匹配）
 */
export function processEvent(eventType, payload = {}) {
  // 如果在线模式开启，跳过离线处理
  const settings = loadSettings();
  if (settings.enabled) return null;

  switch (eventType) {
    // ─── 1. 精确匹配 ───
    case TRIGGER.GAME_STARTED: {
      const gameId = payload.gameId || '';
      const templates = getEveResponses().GAME_STARTED?.[gameId];
      if (templates) return pickResponse(templates);
      return pickResponse(['进入游戏...E.V.E. 在看着你']);
    }

    case TRIGGER.GAME_OVER: {
      const { gameId, score, isRecord, statGrowth } = payload;
      const sc = score || 0;

      // 精确: 高分/普通/低分
      if (isRecord || sc >= 500) {
        return pickResponse(getEveResponses().GAME_OVER.highScore, { score: sc, gameName: gameId });
      }
      if (sc <= 20) {
        return pickResponse(getEveResponses().GAME_OVER.lowScore, { score: sc });
      }
      // 普通: 随机选一个 stat
      const stats = ['SIGNAL', 'FIREWALL', 'BANDWIDTH', 'GLITCH', 'RESONANCE'];
      const stat = statGrowth
        ? Object.keys(statGrowth)[0]?.toUpperCase() || stats[Math.floor(Math.random() * stats.length)]
        : stats[Math.floor(Math.random() * stats.length)];
      return pickResponse(getEveResponses().GAME_OVER.normal, { score: sc, stat });
    }

    case TRIGGER.FISH_CAUGHT: {
      return pickResponse(getEveResponses().FISH_CAUGHT, { loot: payload.loot || '神秘数据体' });
    }

    case TRIGGER.FISH_MISSED: {
      return pickResponse(getEveResponses().FISH_MISSED);
    }

    case TRIGGER.SHARD_COLLECTED: {
      return pickResponse(getEveResponses().SHARD_COLLECTED, {
        collected: payload.collected || 0,
        total: payload.total || 3,
      });
    }

    case TRIGGER.DRINK_BOUGHT: {
      const drink = payload.drink || '';
      const templates = getEveResponses().DRINK_BOUGHT[drink];
      if (templates) return pickResponse(templates);
      return pickResponse(['喝了一杯...E.V.E. 没看清是什么']);
    }

    case TRIGGER.BUFF_EXPIRED: {
      return pickResponse(getEveResponses().BUFF_EXPIRED);
    }

    // ─── 4. 聊天响应 ───
    case TRIGGER.CHAT_MESSAGE: {
      // 20% 概率点评
      if (Math.random() > 0.2) return null;
      const { text } = payload;
      const words = (text || '').split(/\s+/).filter(Boolean);
      const keyword = words.length > 0 ? words[Math.floor(Math.random() * words.length)] : '...';
      return pickResponse(getEveResponses().CHAT_COMMENT, { keyword: keyword.slice(0, 10) });
    }

    case TRIGGER.HIGH_SCORE: {
      return pickResponse(getEveResponses().GAME_OVER.highScore, {
        score: payload.score || 0,
        gameName: payload.gameId || '',
      });
    }

    case TRIGGER.DEPTHS_ENTERED: {
      return pickResponse(getEveResponses().DEPTHS_ENTERED);
    }

    case TRIGGER.DEPTHS_EXITED: {
      return pickResponse(getEveResponses().DEPTHS_EXITED);
    }

    case TRIGGER.CHARACTER_SWITCH: {
      return pickResponse(getEveResponses().CHARACTER_SWITCH, {
        from: payload.from || '???',
        to: payload.to || '???',
      });
    }

    case TRIGGER.LOGIN: {
      return pickResponse(getEveResponses().LOGIN, { charName: payload.name || '旅人' });
    }

    case TRIGGER.SANCTUARY_ENTERED: {
      return pickResponse(getEveResponses().SANCTUARY_ENTERED);
    }

    case TRIGGER.GLOBE_VIEWING: {
      return pickResponse(getEveResponses().GLOBE_VIEWING, {
        globe: payload.globe || '',
      });
    }

    case TRIGGER.GLOBE_ZOOMED: {
      return pickResponse(getEveResponses().GLOBE_ZOOMED, {
        globe: payload.globe || '',
      });
    }

    case TRIGGER.CAT_PET: {
      return pickResponse(getEveResponses().CAT_PET);
    }

    // ─── 无事件兜底 ───
    case TRIGGER.PLAYER_IDLE: {
      return pickResponse(getEveResponses().IDLE_CHAT, {
        idleSeconds: payload.idleSeconds || 60,
      });
    }

    default:
      return null;
  }
}
