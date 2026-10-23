/**
 * AINPC.js — E.V.E. 核心门面（单例模式）
 * 
 * 职责：
 * - 管理离线/在线模式切换
 * - 评论队列（最多 3 条，每条持续 8 秒）
 * - 向 UI 层暴露 show/hide/settings 接口
 * - 提供全局 trigger() 入口给 main.js 埋点
 */

import { loadSettings, saveSettings, resetSettings, API_PRESETS } from './npcSettings.js';
import { EveCompanionView } from '../../ui/EveCompanionView.js';
import { getLanguage } from '../i18n.js';

// One portrait controller and one set of bindings survive title re-entry.
let eveView = null;
let initialized = false;

import { TRIGGER, processEvent, setCommentCallback, startIdleDetection, stopIdleDetection } from './offlineBrain.js';
import { queryOnline, testConnection, clearHistory } from './onlineClient.js';

// ─── 常亮 ───
const COMMENT_DURATION_MS = 8000;   // 每条评论持续 8 秒
const MAX_QUEUE = 12;               // Keep recent replies available for rereading.
const ONLINE_COOLDOWN_MS = 8000;    // 在线请求冷却

// ─── 内部状态 ───
let commentQueue = [];
let historyCursor = 0;
let currentTimer = null;
let onlineCooldown = false;
let lastActivityTime = Date.now();
let contextSnapshot = null; // 由外部定期更新
let sessionVersion = 0;
let requestRunning = false;

// ─── DOM 引用（延迟绑定） ───
let phoneEl = null;
let bubbleEl = null;
let settingsEl = null;
let settingsOnlineToggle = null;
let settingsOfflineToggle = null;
let settingsUrlInput = null;
let settingsKeyInput = null;
let settingsModelInput = null;
let settingsTestBtn = null;
let settingsSaveBtn = null;
let settingsCancelBtn = null;
let gameAiBtn = null;
let closeBtn = null;

/**
 * 初始化 AINPC 模块：绑定 DOM、注册回调、启动空闲检测
 */
export function init() {
  if (initialized) { startIdleDetection(() => Date.now() - lastActivityTime); syncPanelState(); phoneEl?.classList.remove('eve-phone-hidden'); return; }
  initialized = true;
  bindDOM();
  bindEvents();
  generateAvatar();

  // 注册离线脑回调
  setCommentCallback((text) => {
    if (!document.hidden && document.getElementById('app').style.display !== 'none' && !loadSettings().enabled && !requestRunning) enqueue(text);
  });

  // 启动空闲检测
  startIdleDetection(() => Date.now() - lastActivityTime);

  // 初始状态：显示手机面板
  syncPanelState();
  phoneEl?.classList.remove('eve-phone-hidden');

  // main.js supplies the single login event with its current player snapshot.
}

/** 切换手机面板显示 */
function togglePhone() {
  if (!phoneEl) return;
  if(document.pointerLockElement) { document.exitPointerLock();phoneEl.classList.remove('eve-phone-hidden');return; }
  if (phoneEl.classList.contains('eve-phone-hidden')) {
    document.exitPointerLock();
    phoneEl.classList.remove('eve-phone-hidden');
  } else {
    phoneEl.classList.add('eve-phone-hidden');
  }
}

/**
 * Canvas 程序化生成 E.V.E. 像素头像
 * Nightshift portrait with message-driven expressions and reduced-motion support.
 */
function generateAvatar() {
  if (!eveView) eveView = new EveCompanionView();
  eveView.syncMode(loadSettings().enabled);
}

/**
 * Bind the companion's existing controls.
 */
function bindDOM() {
  phoneEl = document.getElementById('eve-phone');
  bubbleEl = document.getElementById('eve-bubble');
  settingsEl = document.getElementById('eve-settings');
  settingsOnlineToggle = document.getElementById('eve-setting-online');
  settingsOfflineToggle = document.getElementById('eve-mode-offline-radio');
  settingsUrlInput = document.getElementById('eve-setting-url');
  settingsKeyInput = document.getElementById('eve-setting-key');
  settingsModelInput = document.getElementById('eve-setting-model');
  settingsTestBtn = document.getElementById('eve-setting-test');
  settingsSaveBtn = document.getElementById('eve-setting-save');
  settingsCancelBtn = document.getElementById('eve-setting-cancel');
  gameAiBtn = document.getElementById('eve-game-ai');
  closeBtn = document.getElementById('eve-phone-close');
}

/**
 * 绑定 UI 事件
 */
function bindEvents() {
  document.getElementById('eve-chat-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const input=document.getElementById('eve-chat-input'),question=input.value.trim();
    if(!question)return;
    input.value='';
    trigger(TRIGGER.QUESTION,{question});
  });
  document.getElementById('eve-chat-input')?.addEventListener('focus',()=>document.exitPointerLock());
  document.getElementById('eve-previous')?.addEventListener('click', advanceQueue);
  // 折叠/展开
  closeBtn?.addEventListener('click', () => phoneEl?.classList.add('eve-phone-hidden'));

  // 键盘快捷键：反引号 ` 切换折叠
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Backquote' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      togglePhone();
    }
  });

  // 设置齿轮
  document.getElementById('eve-settings-gear')?.addEventListener('click', () => {
    openSettings();
  });

  // 在线/离线模式切换（两个 radio 都触发刷新）
  settingsOnlineToggle?.addEventListener('change', () => {
    refreshSettingsUI(settingsOnlineToggle.checked);
  });
  settingsOfflineToggle?.addEventListener('change', () => {
    // 当离线 radio 被选中时，在线 radio 自动取消选中
    refreshSettingsUI(false);
  });

  // 测试连接
  settingsTestBtn?.addEventListener('click', async () => {
    settingsTestBtn.disabled = true;
    settingsTestBtn.textContent = '测试中...';
    // 直接用输入框的值测试（用户可能还没点保存）
    const result = await testConnection({
      url: settingsUrlInput?.value || '',
      key: settingsKeyInput?.value || '',
      model: settingsModelInput?.value || 'deepseek-v4-flash',
    });
    settingsTestBtn.textContent = result.ok ? '✓ 连接成功' : '✗ 失败';
    settingsTestBtn.style.color = result.ok ? '#44ff44' : '#ff4444';
    setTimeout(() => {
      settingsTestBtn.textContent = '测试连接';
      settingsTestBtn.style.color = '';
      settingsTestBtn.disabled = false;
    }, 3000);
    // 显示 toast
    showToast(result.message, result.ok ? 'success' : 'error');
  });

  // 保存设置
  settingsSaveBtn?.addEventListener('click', () => {
    resetOnline();
    const enabled = settingsOnlineToggle?.checked || false;
    saveSettings({
      enabled,
      url: settingsUrlInput?.value || '',
      key: settingsKeyInput?.value || '',
      model: settingsModelInput?.value || 'gpt-4o-mini',
    });
    closeSettings();
    syncPanelState();

    if (enabled) {
      clearHistory();
      showToast('E.V.E. 在线模式已启用', 'success');
    } else {
      showToast('E.V.E. 已切换回离线模式', 'info');
      // 立即触发一条离线对话
      const text = processEvent(TRIGGER.IDLE_CHAT);
      if (text) enqueue(text);
    }
  });

  // 取消设置
  settingsCancelBtn?.addEventListener('click', () => {
    closeSettings();
  });

  // 游戏 AI 占位
  gameAiBtn?.addEventListener('click', () => {
    showToast('🚧 E.V.E. 的游戏 AI 模块正在训练中，预计下个版本上线！', 'info');
  });

  // 点击气泡区域切换评论
  bubbleEl?.addEventListener('click', () => {
    advanceQueue();
  });
}

/**
 * 刷新设置面板 UI：根据在线/离线模式显示或隐藏 API 配置区域
 * @param {boolean} isOnline
 */
function refreshSettingsUI(isOnline) {
  const presets = document.getElementById('eve-setting-presets');
  const urlGroup = document.getElementById('eve-setting-url-group');
  const keyGroup = document.getElementById('eve-setting-key-group');
  const modelGroup = document.getElementById('eve-setting-model-group');
  if (isOnline) {
    presets?.classList.remove('hidden');
    urlGroup?.classList.remove('hidden');
    keyGroup?.classList.remove('hidden');
    modelGroup?.classList.remove('hidden');
  } else {
    presets?.classList.add('hidden');
    urlGroup?.classList.add('hidden');
    keyGroup?.classList.add('hidden');
    modelGroup?.classList.add('hidden');
  }
  syncPanelState(isOnline);
}

/**
 * 打开设置面板
 */
function openSettings() {
  if (!settingsEl) return;
  document.exitPointerLock();
  const settings = loadSettings();
  // 同步两个 radio 按钮状态
  settingsOnlineToggle.checked = settings.enabled;
  if (settingsOfflineToggle) settingsOfflineToggle.checked = !settings.enabled;
  settingsUrlInput.value = settings.url;
  settingsKeyInput.value = settings.key;
  settingsModelInput.value = settings.model;

  // 渲染预设列表
  renderPresets();

  // 根据当前模式刷新 UI
  refreshSettingsUI(settings.enabled);

  settingsEl.classList.remove('hidden');
}

/** 渲染预设提供商列表 */
function renderPresets() {
  const list = document.getElementById('eve-preset-list');
  if (!list) return;
  list.innerHTML = '';
  for (const p of API_PRESETS) {
    const btn = document.createElement('button');
    btn.className = 'eve-preset-btn';
    btn.innerHTML = `<span>${p.icon}</span><span>${p.name}</span>`;
    btn.title = p.url;
    btn.addEventListener('click', () => {
      settingsUrlInput.value = p.url;
      settingsModelInput.value = p.models[0];
      list.querySelectorAll('.eve-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    list.appendChild(btn);
  }
}

/**
 * 关闭设置面板
 */
function closeSettings() {
  settingsEl?.classList.add('hidden');
}

/**
 * 同步面板视觉状态（在线/离线指示器）
 */
function syncPanelState(forceOnline = null) {
  const enabled = forceOnline !== null ? forceOnline : loadSettings().enabled;
  eveView?.syncMode(enabled);
  const indicator = document.getElementById('eve-mode-indicator');
  const avatar = document.getElementById('eve-avatar-img');

  if (enabled) {
    indicator?.classList.remove('eve-mode-offline');
    indicator?.classList.add('eve-mode-online');
    avatar?.classList.add('eve-avatar-online');
  } else {
    indicator?.classList.remove('eve-mode-online');
    indicator?.classList.add('eve-mode-offline');
    avatar?.classList.remove('eve-avatar-online');
  }
}

/**
 * 加入评论队列
 * @param {string} text
 */
function enqueue(text) {
  if (!text) return;

  // 去重：与队尾最后一条相同则跳过
  if (commentQueue.length > 0 && commentQueue[commentQueue.length - 1] === text) { eveView?.idle(); return; }

  commentQueue.push(text);
  historyCursor = 0;
  if (commentQueue.length > MAX_QUEUE) commentQueue.shift();

  // 显示最新一条
  showCurrent();
}

/**
 * 显示当前队列最新评论
 */
function showCurrent() {
  if (!bubbleEl || commentQueue.length === 0) return;
  const text = commentQueue[commentQueue.length - 1 - historyCursor];
  bubbleEl.removeAttribute('data-i18n');
  bubbleEl.textContent = text;
  bubbleEl.classList.remove('eve-fade-out');
  bubbleEl.classList.add('eve-fade-in');

  // 新消息时自动显示面板
  phoneEl?.classList.remove('eve-phone-hidden');
  eveView?.speak(text, commentQueue.length);

  // 重置计时器
  if (currentTimer) clearTimeout(currentTimer);
  currentTimer = setTimeout(() => {
    bubbleEl.classList.add('eve-fade-out');
    currentTimer = null;
  }, Math.min(16000, Math.max(COMMENT_DURATION_MS, text.length * 100)));
}

/**
 * 前进到下一条评论（点击气泡）
 */
function advanceQueue() {
  if (commentQueue.length <= 1) return;
  historyCursor = (historyCursor + 1) % commentQueue.length;
  if (commentQueue.length > 0) {
    showCurrent();
  } else {
    bubbleEl.textContent = '';
    bubbleEl.classList.add('eve-fade-out');
  }
}

/**
 * Toast 提示（复用项目已有样式或简单实现）
 */
function showToast(message, type) {
  // 尝试复用已有 toast 机制，没有则创建临时元素
  let toast = document.getElementById('eve-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'eve-toast';
    toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);z-index:300;padding:10px 24px;border-radius:8px;font-family:inherit;font-size:14px;pointer-events:none;transition:opacity 0.3s;';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = type === 'error' ? 'rgba(255,50,50,0.9)' : type === 'success' ? 'rgba(68,255,68,0.9)' : 'rgba(0,255,224,0.9)';
  toast.style.color = '#111';
  toast.style.opacity = '1';

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 3000);
}

// ─── 对外 API ───

/**
 * 全局触发入口 —— main.js 中各事件点调用
 * @param {string} eventType - TRIGGER 中的事件类型
 * @param {object} [payload={}] - 事件数据
 */
export function trigger(eventType, payload = {}) {
  eveView?.react(eventType);
  // 更新最后活动时间
  lastActivityTime = Date.now();

  const settings = loadSettings();

  if (settings.enabled) {
    // 在线模式：走 API（带冷却）
    triggerOnline(eventType, payload);
  } else {
    if(phoneEl)phoneEl.dataset.replySource='local';
    // 离线模式：走状态机
    const text = processEvent(eventType, {...payload,floor:contextSnapshot?.floor,district:contextSnapshot?.district,shards:contextSnapshot?.shardsCollected});
    if (text) enqueue(text);
  }
}

/**
 * 在线模式触发（带冷却 + 回退）
 */
let onlinePendingEvent = null;
let onlineDebounceTimer = null;

function resetOnline() {
  sessionVersion++;clearHistory();
  if(onlineDebounceTimer)clearTimeout(onlineDebounceTimer);
  onlineDebounceTimer=null;onlinePendingEvent=null;onlineCooldown=false;requestRunning=false;
  eveView?.idle();
}

async function triggerOnline(eventType, payload) {
  // 收集最新事件描述
  const eventDesc = formatEvent(eventType, payload);
  if (!contextSnapshot) contextSnapshot = {};
  if (!contextSnapshot.recentEvents) contextSnapshot.recentEvents = [];
  if(contextSnapshot.recentEvents.at(-1)!==eventDesc)contextSnapshot.recentEvents.push(eventDesc);
  if (contextSnapshot.recentEvents.length > 5) contextSnapshot.recentEvents.shift();

  // 冷却中则暂存
  if (requestRunning || (onlineCooldown && eventType !== TRIGGER.QUESTION)) {
    if(!onlinePendingEvent || eventType===TRIGGER.QUESTION || onlinePendingEvent.eventType!==TRIGGER.QUESTION)onlinePendingEvent = { eventType, payload };
    return;
  }

  if(onlineDebounceTimer)clearTimeout(onlineDebounceTimer);
  const version=sessionVersion;
  onlineCooldown = true;
  requestRunning = true;
  eveView?.thinking();
  const floor=contextSnapshot.floor;
  const reply = await queryOnline({...contextSnapshot,language:getLanguage(),latestEvent:eventDesc,userQuestion:eventType===TRIGGER.QUESTION?payload.question:undefined});
  if(version!==sessionVersion)return;
  requestRunning = false;
  // A reply about a previous room must not arrive after the player has left it.
  if(floor!==contextSnapshot.floor && eventType!==TRIGGER.QUESTION) {
    eveView?.idle();
  } else if (reply) {
    phoneEl.dataset.replySource='online';
    enqueue(reply);
  } else {
    phoneEl.dataset.replySource='local';
    const text = processEvent(eventType, {...payload,floor:contextSnapshot?.floor,district:contextSnapshot?.district,shards:contextSnapshot?.shardsCollected}, {force:true});
    if (text) enqueue(text); else eveView?.idle();
  }

  // 冷却结束
  onlineDebounceTimer=setTimeout(() => {
    onlineCooldown = false;
    // 处理暂存事件
    if (onlinePendingEvent) {
      const pending = onlinePendingEvent;
      onlinePendingEvent = null;
      triggerOnline(pending.eventType, pending.payload);
    }
  }, onlinePendingEvent?.eventType===TRIGGER.QUESTION?0:ONLINE_COOLDOWN_MS);
}

/**
 * 格式化事件为可读字符串
 */
function formatEvent(eventType, payload) {
  switch (eventType) {
    case TRIGGER.QUESTION: return `玩家提问：${payload.question || ''}`;
    case TRIGGER.ROOFTOP_ENTERED: return '到达天台观星台';
    case TRIGGER.SKY_VIEWED: return '正在用望远镜欣赏原创笔触星空';
    case TRIGGER.SANCTUARY_ENTERED: return '进入七座微缩世界的展览馆';
    case TRIGGER.GLOBE_VIEWING: return `正在细看展品：${payload.globe || ''}`;
    case TRIGGER.GLOBE_ZOOMED: return `进入微缩世界：${payload.globe || ''}`;
    case TRIGGER.CAT_PET: return `抚摸了${payload.name || '一只猫'}`;
    case TRIGGER.CHAT_MESSAGE: return `世界聊天 ${payload.author || ''}：${payload.text || ''}`;
    case TRIGGER.GAME_STARTED: return `开始游玩 ${payload.gameId || '街机'}`;
    case TRIGGER.GAME_OVER: return `${payload.gameId || '街机'} 结束，得分 ${payload.score || 0}`;
    case TRIGGER.FISH_CAUGHT: return `钓到 ${payload.loot || '东西'}`;
    case TRIGGER.FISH_MISSED: return '鱼跑了';
    case TRIGGER.SHARD_COLLECTED: return `收集碎片 ${payload.collected || 0}/${payload.total || 3}`;
    case TRIGGER.DRINK_BOUGHT: return `买了 ${payload.drink || '饮料'}`;
    case TRIGGER.BUFF_EXPIRED: return 'Buff 过期';
    case TRIGGER.HIGH_SCORE: return `新高分 ${payload.score || 0}`;
    case TRIGGER.DEPTHS_ENTERED: return '进入深渊';
    case TRIGGER.DEPTHS_EXITED: return '返回地表';
    case TRIGGER.CHARACTER_SWITCH: return `从 ${payload.from || '???'} 切换为 ${payload.to || '???'}`;
    case TRIGGER.LOGIN: return `${payload.name || '玩家'} 登录`;
    default: return eventType;
  }
}

/**
 * 更新上下文快照（由 main.js 定期调用或状态变更时调用）
 * @param {object} snapshot
 */
export function updateContext(snapshot) {
  contextSnapshot = { ...contextSnapshot, ...snapshot };
}

/**
 * 获取当前设置
 */
export function getSettings() {
  return loadSettings();
}

/**
 * 销毁 AINPC（清理定时器）
 */
export function destroy() {
  resetOnline();
  stopIdleDetection();
  if (currentTimer) clearTimeout(currentTimer);
  if (onlineDebounceTimer) clearTimeout(onlineDebounceTimer);
  commentQueue = [];
  historyCursor = 0;
  phoneEl?.classList.add('eve-phone-hidden');
}

export { TRIGGER };
