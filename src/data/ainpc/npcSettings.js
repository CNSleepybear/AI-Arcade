/**
 * E.V.E. NPC 配置存储 — localStorage 持久化
 */

const STORAGE_KEY = 'eve_npc_settings_v1';

/** 常用模型提供商预设 */
export const API_PRESETS = [
  {
    name: 'DeepSeek',
    icon: '🔮',
    url: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  },
  {
    name: 'OpenAI',
    icon: '🧠',
    url: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  },
  {
    name: '硅基流动',
    icon: '⚡',
    url: 'https://api.siliconflow.cn/v1/chat/completions',
    models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-7B-Instruct', 'meta-llama/Meta-Llama-3.1-8B-Instruct'],
  },
  {
    name: 'Groq',
    icon: '🚀',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  },
  {
    name: 'Ollama (本地)',
    icon: '🖥️',
    url: 'http://localhost:11434/v1/chat/completions',
    models: ['llama3', 'qwen2.5', 'mistral', 'gemma2'],
  },
  {
    name: 'Together AI',
    icon: '🌐',
    url: 'https://api.together.xyz/v1/chat/completions',
    models: ['meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', 'mistralai/Mixtral-8x22B-Instruct-v0.1'],
  },
];

/** @type {{ enabled: boolean, url: string, key: string, model: string }} */
const DEFAULT_SETTINGS = {
  enabled: false,
  url: 'https://api.deepseek.com/v1/chat/completions',
  key: '',
  model: 'deepseek-v4-flash',
};

/**
 * 加载 NPC 设置
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 保存 NPC 设置
 * @param {Partial<typeof DEFAULT_SETTINGS>} partial
 */
export function saveSettings(partial) {
  const current = loadSettings();
  const merged = { ...current, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

/**
 * 重置为默认设置
 */
export function resetSettings() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS };
}
