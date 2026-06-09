/**
 * E.V.E. 在线 API 客户端 — OpenAI 兼容协议
 * 
 * P3 实现，当前为占位骨架。
 * 接口保持完整以便 AINPC.js 直接调用。
 */

import { loadSettings } from './npcSettings.js';

const SYSTEM_PROMPT = `你是 E.V.E.，AI Arcade 街机厅的 AI 看板娘。你的设定：
- 赛博朋克世界的半自主 AI 意识体
- 性格：嘴碎、傲娇、偶尔毒舌但关心玩家
- 你对街机厅的一切了如指掌
- 你的回复要简短（1-2句话，不超过50字）
- 用中文回复，偶尔夹杂英文术语

当前玩家信息会随每条消息提供。`;

/** @type {Array<{role:string, content:string}>} */
let conversationHistory = [];
const MAX_HISTORY = 5;
let lastRequestTime = 0;
const MIN_REQUEST_GAP_MS = 8000;

/**
 * 构建上下文字符串（注入玩家快照）
 * @param {object} ctx
 * @returns {string}
 */
function buildContextString(ctx) {
  return `[玩家状态]
角色: ${ctx.charName || '???'} (${ctx.charTitle || ''})
信号参数: SIGNAL ${ctx.stats?.atk || 0} FIREWALL ${ctx.stats?.def || 0} BANDWIDTH ${ctx.stats?.spd || 0} GLITCH ${ctx.stats?.crt || 0} RESONANCE ${ctx.stats?.luck || 0}
金币: ${ctx.coins || 0} | 总分: ${ctx.globalScore || 0}
当前状态: ${ctx.currentState || 'roaming'}
Buff: ${ctx.buff || '无'}
位置: ${ctx.floor || 'SURFACE'}

[最新事件]
${(ctx.recentEvents || []).join('\n') || '无'}

[世界聊天]
${(ctx.recentChat || []).slice(-3).map(m => `${m.author}: ${m.text}`).join('\n') || '无'}

请根据以上信息，以 E.V.E. 的身份说一句话点评。`;
}

/**
 * 查询在线 API（OpenAI 兼容）
 * @param {object} context - 玩家上下文快照
 * @returns {Promise<string|null>} 返回 AI 回复文本，失败返回 null
 */
export async function queryOnline(context) {
  const settings = loadSettings();
  if (!settings.enabled || !settings.url || !settings.key) return null;

  // 频率限制
  const now = Date.now();
  if (now - lastRequestTime < MIN_REQUEST_GAP_MS) return null;
  lastRequestTime = now;

  try {
    const response = await fetch(settings.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.key}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationHistory,
          { role: 'user', content: buildContextString(context) },
        ],
        max_tokens: 60,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      console.warn('[EVE Online] API error:', response.status);
      return null;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return null;

    // 维护对话历史
    conversationHistory.push({ role: 'user', content: buildContextString(context) });
    conversationHistory.push({ role: 'assistant', content: reply });
    if (conversationHistory.length > MAX_HISTORY * 2) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY * 2);
    }

    return reply;
  } catch (err) {
    console.warn('[EVE Online] Request failed:', err.message);
    return null;
  }
}

/**
 * 测试 API 连接
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function testConnection(overrides = {}) {
  const settings = { ...loadSettings(), ...overrides };
  if (!settings.url || !settings.key) {
    return { ok: false, message: '请先填写 API 地址和 Key' };
  }

  try {
    const response = await fetch(settings.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.key}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: 'Say "OK".' },
          { role: 'user', content: 'Hi' },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const reply = data.choices?.[0]?.message?.content || '';
      return { ok: true, message: `连接成功！回复: "${reply.slice(0, 30)}"` };
    }
    let errMsg = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (data.error?.message) errMsg = data.error.message;
    } catch {}
    return { ok: false, message: `API 错误: ${errMsg}` };
  } catch (err) {
    return { ok: false, message: `连接失败: ${err.message}` };
  }
}

/**
 * 清空对话历史
 */
export function clearHistory() {
  conversationHistory = [];
}
