# 世界聊天 & 排行榜 — 后端架构方案

## 现状诊断

| 模块 | 当前实现 | 问题 |
|------|----------|------|
| `globalState.chatMessages` | 浏览器内存数组，种子数据写死在 `AbyssWorld._seedChatMessages()` | 刷新即消失，单人可见 |
| `globalState.arcadeHighScores` | 硬编码 `{ roshambo: { name:'MINER_X', score:99 }, ... }` | 不会随游戏结果更新，无持久化 |
| `SaveManager` | `localStorage` 存 JSON | 换浏览器丢失，无跨设备同步 |

---

## 两条技术路线对比

| 维度 | **方案 A: 自建 Node.js WS** | **方案 B: Supabase BaaS** |
|------|----------------------------|--------------------------|
| 后端代码 | 项目内 `server/` 目录，约 200 行 | 0 行后端代码，纯前端 SDK 调用 |
| 实时聊天 | `ws` 库 WebSocket 广播 | Supabase Realtime (Postgres LISTEN/NOTIFY) |
| 排行榜 | SQLite / JSON 文件 | PostgreSQL 表 + RLS 权限策略 |
| 部署 | 需要一台服务器运行 `node server.js` | 免费层 500MB DB, 50万 API 请求/月 |
| 延迟 | 毫秒级（同服务器） | ~100ms（Supabase 托管） |
| 玩家认证 | 可选：简单 token / 无认证 | 内置 Auth（匿名登录 / OAuth） |
| 运维 | 自己维护进程 | 零运维 |

---

## 方案 A: 自建 Node.js WebSocket 后端

### 架构图

```
┌──────────────────────────────────────────────────────┐
│  Browser (main.js)                                    │
│  ┌──────────────┐   ┌──────────────────┐             │
│  │ globalState   │   │ WebSocketClient  │  (new)     │
│  │ chatMessages  │◄──│ on('chat_broadcast')│         │
│  │ highScores    │◄──│ on('leaderboard')   │         │
│  └──────────────┘   │ send('chat', {...})  │         │
│                      │ send('score', {...}) │         │
│                      └────────┬───────────┘          │
└───────────────────────────────┼──────────────────────┘
                                │ ws://localhost:3001
┌───────────────────────────────┼──────────────────────┐
│  server/                      │                       │
│  ┌────────────────┐  ┌───────▼────────┐  ┌─────────┐ │
│  │ chat.js        │  │ wsServer.js    │  │ db.json  │ │
│  │ handleMessage()│  │ (ws 广播/单播) │  │(持久化)  │ │
│  │ handleScore()  │  │ heartbeat 30s  │  │         │ │
│  └────────────────┘  └────────────────┘  └─────────┘ │
└──────────────────────────────────────────────────────┘
```

### 新增文件清单

```
server/
├── index.js          # 入口：启动 WS server (port 3001)
├── db.json           # 持久化：{ messages: [...], scores: {...} }
├── chatHandler.js    # 聊天消息处理：广播/历史/timestamps
└── leaderboardHandler.js  # 排行榜：写入/查询 Top N
```

### WebSocket 协议（JSON）

```javascript
// 客户端 → 服务器
{ type: 'chat', payload: { author: 'Sleepybear', text: 'hello', color: '#ffcc00' } }
{ type: 'score', payload: { gameId: 'roshambo', name: 'Sleepybear', score: 150 } }
{ type: 'request_leaderboard', payload: { gameId: 'roshambo' } }
{ type: 'request_chat_history' }

// 服务器 → 客户端
{ type: 'chat_broadcast', payload: { author, text, color, time: 1716700000000 } }
{ type: 'leaderboard', payload: { gameId: 'roshambo', entries: [{name, score}, ...] } }
{ type: 'chat_history', payload: [{ author, text, color, time }, ...] }
```

### 前端改造点

| 文件 | 变更 |
|------|------|
| `src/data/NetworkClient.js` (new) | WebSocket 封装类：connect / send / on / reconnect |
| `src/main.js` | 初始化 `NetworkClient`，`GAME_OVER` 时 `send('score')`；`handleInteract` 酒馆喝酒时 `send('chat')` |
| `src/three/VoxelPlaza.js` | `drawScreen()` 的聊天面板从 `globalState.chatMessages` 读取（已有，无需改） |
| `AbyssWorld._seedChatMessages()` | 启动时从服务器拉 `chat_history` 替代种子数据 |

---

## 方案 B: Supabase（零运维 BaaS）

### 架构图

```
┌──────────────────────────────────────────────┐
│  Browser (main.js)                            │
│  ┌──────────────┐   ┌───────────────────┐    │
│  │ globalState   │   │ supabase.js       │    │
│  │ chatMessages  │◄──│ .channel('chat')  │    │
│  │ highScores    │◄──│ .on('INSERT', cb) │    │
│  └──────────────┘   │ .from('messages')  │    │
│                      │ .from('scores')    │    │
│                      └────────┬──────────┘    │
└───────────────────────────────┼───────────────┘
                                │ HTTPS (REST + WS)
┌───────────────────────────────┼───────────────┐
│  Supabase Cloud                │               │
│  ┌──────────┐  ┌──────────────▼──────┐        │
│  │ Auth     │  │ PostgreSQL           │        │
│  │ (匿名)   │  │ ┌─────────────────┐  │        │
│  └──────────┘  │ │ messages 表     │  │        │
│                │ │ id,uuid,author  │  │        │
│  ┌──────────┐  │ │ text,color,time │  │        │
│  │ Realtime │  │ ├─────────────────┤  │        │
│  │ (订阅)   │  │ │ scores 表       │  │        │
│  └──────────┘  │ │ game_id,name,   │  │        │
│                │ │ score,created_at│  │        │
│                │ └─────────────────┘  │        │
│                └──────────────────────┘        │
└───────────────────────────────────────────────┘
```

### 前端改造点（代码量更少）

| 文件 | 变更 |
|------|------|
| `src/data/supabase.js` (new) | `createClient(url, anonKey)` + 导出 `supabase` 实例 |
| `src/main.js` | 新增 `subscribeChat()` + `subscribeScores()`；`GAME_OVER` 时 `supabase.from('scores').upsert(...)`；喝酒时 `supabase.from('messages').insert(...)` |
| `package.json` | 新增依赖 `@supabase/supabase-js` |

### 数据库表 DDL

```sql
-- 聊天消息表
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  color TEXT DEFAULT '#00ffcc',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 排行榜表
CREATE TABLE scores (
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (game_id, name)
);
ALTER PUBLICATION supabase_realtime ADD TABLE scores;

-- RLS: 允许匿名读写（演示用，生产环境加 Auth）
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud" ON messages FOR ALL USING (true);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_crud" ON scores FOR ALL USING (true);
```

---

## 实施分阶段 Plan

无论选 A 或 B，前端改造模式一致——`NetworkClient` 作为抽象层隔离后端差异。

### 阶段 1: 抽象层 + 聊天

| # | 任务 | 产出 |
|---|------|------|
| 1 | 创建 `src/data/NetworkClient.js` 抽象类（接口：`sendChat`, `sendScore`, `onChat`, `onLeaderboard`） | 接口定义 |
| 2 | 实现具体后端（方案 A 用 `ws`；方案 B 用 `@supabase/supabase-js`） | 具体实现 |
| 3 | `main.js` 初始化 `NetworkClient`，绑定 `globalState.chatMessages` 双向同步 | 数据联通 |
| 4 | `main.js` 新增 `T` 键打开聊天输入框（HTML overlay `#chat-input`） | 输入 UI |
| 5 | 广场屏幕聊天面板已从 `globalState.chatMessages` 读取 → 自动生效 | 可视化 |

### 阶段 2: 排行榜

| # | 任务 | 产出 |
|---|------|------|
| 6 | `GAME_OVER` 事件中调用 `NetworkClient.sendScore(gameId, name, score)` | 上报分数 |
| 7 | 进入 ROAMING 时 `NetworkClient.fetchLeaderboard()` 填充 `globalState.arcadeHighScores` | 拉取排行 |
| 8 | 广场屏幕高分面板已从此字段读取 → 自动生效 | 可视化 |

### 阶段 3: 持久化

| # | 任务 | 产出 |
|---|------|------|
| 9 | `SaveManager` 扩展：`syncToServer()` / `syncFromServer()` | 云端存档 |
| 10 | 聊天历史分页加载（仅拉最近 50 条） | 性能优化 |

---

## 推荐

**选方案 A（自建 WS）** 如果你想要：
- 完全控制数据，不依赖第三方
- 代码全部在我们仓库里，部署到一台便宜 VPS 即可
- Node.js 经验充足

**选方案 B（Supabase）** 如果你想要：
- 最快速上线（只需建表 + 前端 SDK，无后端代码）
- 零运维
- 免费层足够小规模使用

---

## 下一步

请确认：
1. 选方案 A 还是 B？
2. 是否需要即时开始实施，还是先看方案满意再说？
