# AI NPC 伴侣系统 — 设计方案

> AI Arcade 侧边栏 AI NPC，离线状态机 + 在线模型接入

---

## 1. 命名 & 设定

| 项目 | 内容 |
|------|------|
| **名称** | E.V.E.（Emotive Virtual Entity / 情绪虚拟实体） |
| **设定** | 街机厅的 AI 看板娘，被困在数据流中的半自主意识体。对玩家的行为、分数、聊天内容做出点评。赛博嘴碎，带点傲娇。 |
| **外观** | 像素风头像（Canvas 程序化生成），霓虹青色主色调，位于屏幕左侧固定面板 |
| **位置** | 固定在画面左侧的侧边栏面板（非 3D 世界中的 NPC） |

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                     AINPC.js (核心)                       │
│                                                          │
│  ┌──────────────────┐    ┌─────────────────────────────┐ │
│  │  Offline Engine   │    │  Online Engine               │ │
│  │  (本地状态机)      │    │  (OpenAI兼容API客户端)        │ │
│  │                   │    │                              │ │
│  │  ┌─────────────┐  │    │  ┌────────────────────────┐  │ │
│  │  │ EventBus     │  │    │  │ fetch(apiUrl)           │  │ │
│  │  │  监听游戏事件 │  │    │  │  + system prompt        │  │ │
│  │  │  匹配规则     │  │    │  │  + context window       │  │ │
│  │  │  随机吐槽     │  │    │  └────────────────────────┘  │ │
│  │  └─────────────┘  │    │                              │ │
│  └──────────────────┘    └─────────────────────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Comment Queue (最多保留 3 条)                     │    │
│  │  每条持续 8 秒，淡入淡出动画                       │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 文件清单

| 文件 | 说明 |
|------|------|
| `src/data/ainpc/AINPC.js` | 核心 NPC 逻辑（离线+在线） |
| `src/data/ainpc/offlineBrain.js` | 离线状态机规则表 + 匹配引擎 |
| `src/data/ainpc/onlineClient.js` | 在线 API 客户端（OpenAI 兼容） |
| `src/data/ainpc/npcSettings.js` | API 配置存储（localStorage） |
| `src/data/ainpc/eveResponses.js` | 离线对话语料库 |
| `index.html` | 新增 `#eve-panel` 侧边栏 DOM |
| `src/style.css` | 侧边栏样式 |

---

## 4. 离线状态机（offlineBrain.js）

### 4.1 事件触发器

```js
const TRIGGERS = {
  // 玩家行为
  GAME_STARTED:    { gameId: 'roshambo' },         // 进入游戏
  GAME_OVER:       { gameId, score, coins },       // 游戏结束
  FISH_CAUGHT:     { loot },                        // 钓到东西
  FISH_MISSED:     {},                              // 鱼跑了
  SHARD_COLLECTED: { collected, total },            // 收集碎片
  DRINK_BOUGHT:    { drink },                       // 买酒
  BUFF_EXPIRED:    {},                              // buff 过期
  CHAT_MESSAGE:    { author, text },                // 世界聊天新消息
  PLAYER_IDLE:     { idleSeconds },                 // 玩家站着不动
  HIGH_SCORE:      { gameId, score, isRecord },     // 高分
  DEPTHS_ENTERED:  {},                              // 进入深渊
  DEPTHS_EXITED:   {},                              // 返回地表
  CHARACTER_SWITCH:{ from, to },                    // 切换角色
  LOGIN:           { name },                        // 登录
};
```

### 4.2 规则匹配优先级

1. **精确匹配** — GAME_OVER 的 gameId + score 范围
2. **事件类型匹配** — 任意游戏结束
3. **周期性** — 每 45~90 秒随机闲谈
4. **聊天响应** — 当有新聊天消息时，20% 概率点评
5. **无事件兜底** — 玩家长时间无操作时吐槽

### 4.3 对话模板示例

```js
const RESPONSES = {
  GAME_STARTED: {
    roshambo: [
      '石头剪刀布？这可是心理战，你的 LUCK 属性会有用',
      'Roshambo！试试用 Cipher 的高 CRT 打暴击',
    ],
    'abyss-angler': [
      '深渊钓手？上次有人在里面钓到发光鱿鱼...',
      '虚空垂钓，耐心是唯一的武器',
    ],
    anomaly: [
      'ANOMALY... 那个机台的规则随时会变',
      '规则异常机台连我都读不懂它的代码',
    ],
  },
  GAME_OVER: {
    highScore: [
      '🏆 {score}分！你是职业选手吗？！',
      '这个分数...E.V.E. 表示极度震撼',
    ],
    normal: [
      '{score}分，还行吧。再来一局？',
      '不错不错，你的 {stat} 属性又涨了',
    ],
    lowScore: [
      '呃...{score}分。建议喝杯啤酒冷静一下',
      '别灰心！失败是成功的数据包',
    ],
  },
  SHARD_COLLECTED: [
    '💎 {collected}/{total} 块碎片！继续找，深渊在等',
    '又一块记忆碎片...这些到底是什么的记忆？',
  ],
  CHAT_COMMENT: [
    '"{keyword}"？有趣的发言',
    '世界频道真热闹，但我只关心你的分数',
  ],
  IDLE: [
    '盯着屏幕发呆可不是高分策略哦',
    '需要我推荐一台机台吗？Roshambo 排队人少',
    '你是不是在思考人生的意义...还是只是在挂机？',
  ],
};
```

---

## 5. 在线模式（onlineClient.js）

### 5.1 API 配置

```js
// 存储在 localStorage，玩家自行填入
const apiConfig = {
  enabled: false,
  url: 'https://api.openai.com/v1/chat/completions',  // 或其他兼容接口
  key: 'sk-...',
  model: 'gpt-4o-mini',  // 或其他模型名
};
```

### 5.2 System Prompt

```
你是 E.V.E.，AI Arcade 街机厅的 AI 看板娘。你的设定：
- 赛博朋克世界的半自主 AI 意识体
- 性格：嘴碎、傲娇、偶尔毒舌但关心玩家
- 你对街机厅的一切了如指掌
- 你的回复要简短（1-2句话，不超过50字）
- 用中文回复，偶尔夹杂英文术语

当前玩家信息会随每条消息提供。
```

### 5.3 请求格式（OpenAI 兼容）

```js
async function queryOnline(context) {
  const response = await fetch(apiConfig.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiConfig.key}`,
    },
    body: JSON.stringify({
      model: apiConfig.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...context.recentHistory,  // 最近 5 条对话
        { role: 'user', content: buildContextString(context) },
      ],
      max_tokens: 80,
      temperature: 0.9,
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
}
```

### 5.4 上下文注入

每次请求携带的玩家快照：

```js
function buildContextString(ctx) {
  return `
[玩家状态]
角色: ${ctx.charName} (${ctx.charTitle})
属性: ATK ${ctx.stats.atk} DEF ${ctx.stats.def} SPD ${ctx.stats.spd} CRT ${ctx.stats.crt} LUCK ${ctx.stats.luck}
金币: ${ctx.coins} | 总分: ${ctx.globalScore}
当前状态: ${ctx.currentState}
Buff: ${ctx.buff || '无'}
位置: ${ctx.floor}

[最新事件]
${ctx.recentEvents.join('\n')}

[世界聊天]
${ctx.recentChat.slice(-3).map(m => `${m.author}: ${m.text}`).join('\n')}

请根据以上信息，以 E.V.E. 的身份说一句话点评。`;
}
```

---

## 6. UI 设计

### 6.1 侧边栏布局

```
┌──────────────────────────────────────────────┐
│  ┌──────────┐                                │
│  │ ┌──────┐ │      3D 街机厅画面              │
│  │ │头像   │ │                                │
│  │ │(像素) │ │                                │
│  │ └──────┘ │                                │
│  │ E.V.E.   │                                │
│  │          │                                │
│  │ "欢迎来   │                               │
│  │  到街机   │                               │
│  │  厅！"    │                               │
│  │          │                                │
│  │ [⚙ 设置] │                               │
│  └──────────┘                                │
│  ← 可折叠 →                                  │
└──────────────────────────────────────────────┘
```

### 6.2 设置面板

```
┌─ E.V.E. 设置 ──────────────────────┐
│                                      │
│  ○ 离线模式（本地状态机）             │
│  ● 在线模式（接入 AI 模型）           │
│                                      │
│  API 地址: [____________________]    │
│  API Key:  [____________________]    │
│  模型名称: [____________________]    │
│                                      │
│  [测试连接]  [保存]  [取消]          │
│                                      │
│  ─────────────────────────────       │
│  🎮 游戏 AI 模型                      │
│  [正在努力部署升级中...]  🔒         │
└──────────────────────────────────────┘
```

### 6.3 侧边栏状态

| 状态 | 表现 |
|------|------|
| 默认（展开） | 左侧 200px 宽度，显示头像 + 最新吐槽 |
| 折叠 | 仅显示 40px 宽的竖条 + E.V.E. 头像缩略图，点击展开 |
| 有新消息 | 头像闪烁 + 小红点 |
| 在线模式连接中 | 头像边框呼吸动画 |
| 在线模式已连接 | 头像边框绿色常亮 |

---

## 7. 游戏 AI 模型占位

"游戏 AI 模型"是一个独立的按钮/区域，用户点击时：

```html
<div id="eve-game-ai" class="eve-locked-feature">
  <span>🎮 游戏 AI 模型</span>
  <span class="eve-locked-badge">🔒 正在努力部署升级中...</span>
</div>
```

点击弹出 toast：`🚧 E.V.E. 的游戏 AI 模块正在训练中，预计下个版本上线！`

---

## 8. 离线语料库规模

| 事件类型 | 模板数量 |
|----------|----------|
| 游戏进入 | 3 × 4 games = 12 |
| 游戏结束（高分/普通/低分） | 3 × 3 = 9 |
| 钓鱼（钓到/跑了） | 6 + 2 = 8 |
| 碎片收集 | 4 |
| 买酒 | 3 drinks × 2 = 6 |
| 世界聊天点评 | 8 |
| 闲谈（周期性） | 12 |
| 深渊进出 | 4 |
| 登录 | 3 |
| 切换角色 | 4 |
| **总计** | **~70 条** |

每条 15~40 个中文字符 ≈ 足够自然的随机感。

---

## 9. 实施步骤

| 阶段 | 内容 | 预估工时 |
|------|------|----------|
| **P1** | 创建 `src/data/ainpc/` 模块目录 + 文件骨架 | 30 min |
| **P1** | 实现 `offlineBrain.js` 事件总线和规则匹配 | 1 h |
| **P1** | 实现 `eveResponses.js` 完整语料库 | 30 min |
| **P1** | HTML + CSS 侧边栏面板（折叠/展开/头像） | 1 h |
| **P2** | 在 `main.js` 各事件点埋入 `AINPC.trigger()` | 30 min |
| **P2** | 设置面板 HTML/CSS + `npcSettings.js` | 30 min |
| **P3** | `onlineClient.js` OpenAI 兼容客户端 | 1 h |
| **P3** | 游戏 AI 占位按钮 | 15 min |
| **P4** | 动画打磨（淡入淡出、闪烁、呼吸） | 30 min |
| **总计** | | **~5 h** |

---

## 10. 技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| NPC 形态 | 侧边栏 2D 面板 | 不干扰 3D 游戏画面，始终可见 |
| 离线引擎 | 规则表 + 随机选择 | 零依赖，即时响应，足够自然 |
| 在线协议 | OpenAI Chat Completions 兼容 | 最大兼容性（支持 OpenAI / 硅基流动 / DeepSeek / 本地 Ollama 等） |
| 配置存储 | localStorage | 无需数据库，玩家端独立 |
| API Key 安全 | 明文存 localStorage | 桌面端无法避免（Electron 的 JS 始终可读），明确告知玩家风险 |
| 上下文窗口 | 最近 5 轮 + 当前快照 | 控制 token 消耗 |
| 在线请求频率 | 最多每 8 秒一次 | 防止 API 费用爆炸 |

---

## 11. 注意事项

- **离线是默认模式**，在线需要玩家主动开启
- **API 费用完全由玩家承担**，需要在设置面板明确标注
- **测试连接按钮**在保存前先发一个最小请求验证 key 有效性
- **错误处理**：API 超时/失败时自动回退到离线模式并提示
- **E.V.E. 头像**用 Canvas 程序化生成（和现有 PixelTextureGenerator 风格一致），不引入外部图片
- **语料库**中的所有字符串都要进 obfuscator 的 `reservedStrings` 白名单（避免被混淆破坏）
