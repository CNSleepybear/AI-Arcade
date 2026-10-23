/**
 * E.V.E. 离线状态机 — 事件总线 + 规则匹配引擎
 * 
 * 匹配优先级: 精确 > 事件类型 > 周期 > 聊天 > 空闲
 */

import { getEveResponses, pickResponse } from './eveResponses.js';
import { loadSettings } from './npcSettings.js';
import { getLanguage } from '../i18n.js';

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
  ROOFTOP_ENTERED: 'ROOFTOP_ENTERED',
  SKY_VIEWED: 'SKY_VIEWED',
  QUESTION: 'QUESTION',
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
export function processEvent(eventType, payload = {}, { force = false } = {}) {
  // 如果在线模式开启，跳过离线处理
  const settings = loadSettings();
  if (settings.enabled && !force) return null;

  switch (eventType) {
    case TRIGGER.ROOFTOP_ENTERED:
      return getLanguage()==='en'?'The city is still awake down there. Up here, the sky keeps a slower rhythm.':'楼下的城市还没睡。到了这里，可以把节奏交给风和星光。';
    case TRIGGER.SKY_VIEWED:
      return getLanguage()==='en'?'Those blue currents and amber halos are a painted sky, not a live star chart. Pick a swirl; I will keep you company.':'蓝色流线和琥珀色光晕，是画出来的夜空，不是真实星图。挑一团旋涡看一会儿吧，我陪你。';
    case TRIGGER.QUESTION: {
      const question=String(payload.question||'').toLowerCase(),en=getLanguage()==='en';
      if(/在哪|where am|现在的位置/.test(question))return en?`You are in ${payload.district || 'the arcade'}. Take a look around; I will stay on this channel.`:`你现在在${payload.district || '街机馆'}。可以先环顾四周，我会一直留在这条频道上。`;
      if(/你好|嗨|hello|hi\b/.test(question))return en?'Hey. The lights are on, the city can wait. What would you like to explore tonight?':'嗨。灯还亮着，城市的事可以等一会儿。今晚想先去哪逛逛？';
      if(/你是谁|介绍|who are/.test(question))return en?'E.V.E., the voice that keeps this midnight arcade company. I know the rooms; the high scores are still your job.':'E.V.E.，这间午夜街机馆里陪你说话的声音。各个房间我认得路，高分还是得靠你自己。';
      if(/谢谢|thank/.test(question))return en?'You are welcome. Leave me a little time to enjoy the view with you.':'不客气。留一点时间让我和你一起看看风景，就当回礼了。';
      if(/输了|失败|打不过|lost|lose|failed/.test(question))return en?'That run is over, but it does not decide the next one. We can take a quiet lap before you try again.':'这一局结束了，不代表下一局也会如此。要不要先散一圈，回来再试？';
      if(/星空|starry|梵高/.test(question)&&!/怎么去|where|how.*get/.test(question))return processEvent(TRIGGER.SKY_VIEWED,payload,{force:true});
      if(/星|天台|sky|roof|望远镜/.test(question))return en?'The observatory is above the tavern. Use the rooftop telescope to look up at the painted sky; the hatch brings you back.':'观星台在酒馆上方。到天台后靠近望远镜按 E，就能抬头看那片笔触星空；舱口可以返回。';
      if(/展|馆|微缩|museum|globe/.test(question))return en?'The museum entrance is on the south side of the plaza. Approach a globe to examine its miniature world, then press E to enter.':'展览馆入口在广场南侧。走近玻璃球，里面的微缩世界会停下来等你细看，按 E 可以进入。';
      if(/碎|地下|深渊|archive|shard|basement/.test(question))return en?'The plaza pillar leads to the archive. Collect three memory shards to awaken its altar; the stairway returns to the surface.':'广场中央的柱子通往地下记忆档案馆。收集三枚记忆碎片后，祭坛会回应你；楼梯可以返回地表。';
      if(/钓|fish/.test(question))return en?'The fishing pool is in the archive. Press E near the water to cast, and E again when a bite appears.':'地下档案馆里有一处钓池。靠近水边按 E 下竿，有咬钩提示后再按 E 收线。';
      return en?'I am using local companion responses right now. I can help with the rooftop, museum, memory shards or fishing.':'我现在用的是本地陪伴回复。天台、展览馆、记忆碎片和钓鱼的事，我都能帮你指路。';
    }
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
