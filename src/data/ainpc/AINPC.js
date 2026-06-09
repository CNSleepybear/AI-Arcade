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

// ─── 模块加载时立即注入光标（确保登录/标题画面就有） ───
injectCursor();

import { TRIGGER, processEvent, setCommentCallback, startIdleDetection, stopIdleDetection } from './offlineBrain.js';
import { queryOnline, testConnection, clearHistory } from './onlineClient.js';

// ─── 常亮 ───
const COMMENT_DURATION_MS = 8000;   // 每条评论持续 8 秒
const MAX_QUEUE = 3;                // 队列最多 3 条
const ONLINE_COOLDOWN_MS = 8000;    // 在线请求冷却

// ─── 内部状态 ───
let commentQueue = [];
let currentTimer = null;
let onlineCooldown = false;
let lastActivityTime = Date.now();
let contextSnapshot = null; // 由外部定期更新

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
  bindDOM();
  bindEvents();
  generateAvatar();

  // 注册离线脑回调
  setCommentCallback((text) => {
    enqueue(text);
  });

  // 启动空闲检测
  startIdleDetection(() => Date.now() - lastActivityTime);

  // 初始状态：显示手机面板
  syncPanelState();
  phoneEl?.classList.remove('eve-phone-hidden');

  // 登录问候（延迟 2 秒避免初始闪烁）
  const settings = loadSettings();
  if (!settings.enabled) {
    setTimeout(() => {
      const name = contextSnapshot?.charName || '旅人';
      const text = processEvent(TRIGGER.LOGIN, { name });
      if (text) enqueue(text);
    }, 2000);
  }
}

/** 切换手机面板显示 */
function togglePhone() {
  if (!phoneEl) return;
  if (phoneEl.classList.contains('eve-phone-hidden')) {
    phoneEl.classList.remove('eve-phone-hidden');
  } else {
    phoneEl.classList.add('eve-phone-hidden');
  }
}

/**
 * Canvas 程序化生成 E.V.E. 像素头像
 * 风格与 PixelTextureGenerator 一致，霓虹青色主色调
 */
function generateAvatar() {
  const canvas = document.getElementById('eve-avatar-canvas');
  const fallbackImg = document.getElementById('eve-avatar-img');
  if (!canvas) return;

  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, size, size);

  const px = 2; // pixel block size

  // 脸型 (neon cyan)
  ctx.fillStyle = '#00ffe0';
  for (let y = 10; y < 50; y += px) {
    const w = 18 + Math.sin((y - 10) / 40 * Math.PI) * 12;
    const sx = Math.floor((size - w * px) / 2);
    for (let x = 0; x < w; x++) {
      ctx.fillRect(sx + x * px, y, px, px);
    }
  }

  // 眼睛 (dark with cyan dot)
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(20, 22, 8, 8);
  ctx.fillRect(36, 22, 8, 8);
  ctx.fillStyle = '#00ffe0';
  ctx.fillRect(24, 22, 4, 4);
  ctx.fillRect(40, 22, 4, 4);

  // 嘴巴 (small smirk)
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(28, 36, 8, 4);
  ctx.fillStyle = '#00ffe0';
  ctx.fillRect(32, 36, 4, 2);

  // 刘海 (magenta accent)
  ctx.fillStyle = '#cc44aa';
  for (let x = 18; x < 46; x += px) {
    const h = 6 + ((x - 18) % 6 === 0 ? 2 : 0);
    for (let y = 4; y < 4 + h; y += px) {
      ctx.fillRect(x, y, px, px);
    }
  }

  // 霓虹边框发光 (subtle)
  ctx.strokeStyle = '#00ffe0';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  // 导出为 data URL 并设置到 img fallback
  const dataUrl = canvas.toDataURL('image/png');
  canvas.style.display = 'block';
  if (fallbackImg) { fallbackImg.src = dataUrl; /* keep hidden, canvas is primary */ }
}

/**
 * 注入像素风自定义鼠标光标
 * 24×24 霓虹青色十字准星，匹配街机厅赛博风格
 */
function injectCursor() {
  const size = 24;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 透明背景
  ctx.clearRect(0, 0, size, size);

  // 中心点 (3×3, neon cyan)
  ctx.fillStyle = '#00ffe0';
  ctx.fillRect(10, 10, 4, 4);

  // 十字线 (1px 宽)
  ctx.fillRect(11, 2, 2, 8);   // 上
  ctx.fillRect(11, 14, 2, 8);  // 下
  ctx.fillRect(2, 11, 8, 2);   // 左
  ctx.fillRect(14, 11, 8, 2);  // 右

  // 外框小点 (四角)
  ctx.fillRect(4, 4, 2, 2);
  ctx.fillRect(18, 4, 2, 2);
  ctx.fillRect(4, 18, 2, 2);
  ctx.fillRect(18, 18, 2, 2);

  const dataUrl = canvas.toDataURL('image/png');
  const style = document.createElement('style');
  style.id = 'eve-cursor-style';
  style.textContent = `
    html, body, #app, button, a, input, select, textarea, .clickable,
    #eve-phone, #eve-settings, #hud, #chat-phone, #bar-menu-panel,
    #char-select-panel, #msg-create-panel, #msg-vote-bar, #escape-menu,
    #auth-panel, #title-screen, #game-container, #fishing-ui {
      cursor: url(${dataUrl}) 12 12, crosshair !important;
    }
    body.eve-pointer-locked #game-canvas {
      cursor: none !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * 绑定 DOM 元素引用
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
  if (commentQueue.length > 0 && commentQueue[commentQueue.length - 1] === text) return;

  commentQueue.push(text);
  if (commentQueue.length > MAX_QUEUE) commentQueue.shift();

  // 显示最新一条
  showCurrent();
}

/**
 * 显示当前队列最新评论
 */
function showCurrent() {
  if (!bubbleEl || commentQueue.length === 0) return;
  const text = commentQueue[commentQueue.length - 1];
  bubbleEl.textContent = text;
  bubbleEl.classList.remove('eve-fade-out');
  bubbleEl.classList.add('eve-fade-in');

  // 新消息时自动显示面板
  phoneEl?.classList.remove('eve-phone-hidden');

  // 重置计时器
  if (currentTimer) clearTimeout(currentTimer);
  currentTimer = setTimeout(() => {
    bubbleEl.classList.add('eve-fade-out');
    currentTimer = null;
  }, COMMENT_DURATION_MS);
}

/**
 * 前进到下一条评论（点击气泡）
 */
function advanceQueue() {
  if (commentQueue.length <= 1) return;
  commentQueue.pop(); // 移除当前显示的
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
  // 更新最后活动时间
  lastActivityTime = Date.now();

  const settings = loadSettings();

  if (settings.enabled) {
    // 在线模式：走 API（带冷却）
    triggerOnline(eventType, payload);
  } else {
    // 离线模式：走状态机
    const text = processEvent(eventType, payload);
    if (text) enqueue(text);
  }
}

/**
 * 在线模式触发（带冷却 + 回退）
 */
let onlinePendingEvent = null;
let onlineDebounceTimer = null;

async function triggerOnline(eventType, payload) {
  // 收集最新事件描述
  const eventDesc = formatEvent(eventType, payload);
  if (!contextSnapshot) contextSnapshot = {};
  if (!contextSnapshot.recentEvents) contextSnapshot.recentEvents = [];
  contextSnapshot.recentEvents.push(eventDesc);
  if (contextSnapshot.recentEvents.length > 5) contextSnapshot.recentEvents.shift();

  // 冷却中则暂存
  if (onlineCooldown) {
    onlinePendingEvent = { eventType, payload };
    return;
  }

  onlineCooldown = true;
  const reply = await queryOnline(contextSnapshot);

  if (reply) {
    enqueue(reply);
  } else {
    // 在线失败，回退离线
    const text = processEvent(eventType, payload);
    if (text) enqueue(text);
  }

  // 冷却结束
  setTimeout(() => {
    onlineCooldown = false;
    // 处理暂存事件
    if (onlinePendingEvent) {
      const pending = onlinePendingEvent;
      onlinePendingEvent = null;
      triggerOnline(pending.eventType, pending.payload);
    }
  }, ONLINE_COOLDOWN_MS);
}

/**
 * 格式化事件为可读字符串
 */
function formatEvent(eventType, payload) {
  switch (eventType) {
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
  stopIdleDetection();
  if (currentTimer) clearTimeout(currentTimer);
  if (onlineDebounceTimer) clearTimeout(onlineDebounceTimer);
  commentQueue = [];
}

export { TRIGGER };
