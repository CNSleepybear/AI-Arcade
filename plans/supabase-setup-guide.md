# Supabase 创建与配置 — 分步操作指南

## 第一步：注册并创建项目

1. 打开 https://supabase.com → 右上角 **Sign in**（用 GitHub 登录最快）
2. 点 **New project**（绿色按钮）
3. 填写：
   - **Name**: `ai-arcade`（随意）
   - **Database Password**: 自己设一个，记下来（比如 `Arcade2024!`）
   - **Region**: 选 `Northeast Asia (Tokyo)` — 离中国最近，延迟最低
   - 其他默认
4. 点 **Create project** → 等待 1-2 分钟（它在创建 PostgreSQL 实例）

---

## 第二步：获取 API 凭证

1. 项目创建完后，左侧菜单 → ⚙️ **Settings** → **API**
2. 你会看到两个值：

```
Project URL:    https://xxxxxxxxxxxx.supabase.co    ← 这就是 SUPABASE_URL
anon public:    eyJhbGciOiJIUzI1NiIs...              ← 这就是 SUPABASE_ANON_KEY
```

3. **不要关掉这个页面**，等下要复制

---

## 第三步：建表（SQL Editor）

1. 左侧菜单 → 🗄️ **SQL Editor** → 点 **New query**
2. 清空默认内容，粘贴以下 SQL：

```sql
-- 聊天消息表
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  color TEXT DEFAULT '#00ffcc',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 必须：启用 Realtime 订阅
ALTER TABLE messages ENABLE REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 排行榜表
CREATE TABLE scores (
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (game_id, name)
);

-- ==================== RLS 安全策略 ====================
-- 开发模式：允许匿名读写（正式上线时收紧）

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON messages FOR ALL USING (true);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON scores FOR ALL USING (true);

-- 插入一条测试消息
INSERT INTO messages (author, text, color) VALUES ('SYSTEM', '🏪 深渊行者游戏厅 v0.2 — 聊天室已就绪', '#ffcc00');
```

3. 点右下角绿色 **Run** 按钮
4. 看到 `Results: Success. No rows returned` 或类似的绿色提示 = 成功

---

## 第四步：开启 Realtime 订阅（非常重要！）

> 默认 Supabase 的 Realtime 可能未开启，需要手动启用。

1. 左侧菜单 → 🗄️ **Database** → **Replication**
2. 找到 `supabase_realtime` 这个 publication（底下有一个 `Source` 选项卡）
3. **确认 `messages` 和 `scores` 都在表列表中**（如果 SQL 正确执行了第三步的 `ALTER PUBLICATION` 语句，它们应该已经在里面）
4. 如果没有看到 → 回到 SQL Editor 重新执行：

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;
```

---

## 第五步：填入项目凭证

编辑项目中的 [`src/data/supabase.js`](src/data/supabase.js:38-39)：

```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';  // 改成你的
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';      // 改成你的
```

然后 **刷新浏览器**（`Ctrl+Shift+R`）即可生效。

---

## 第六步：验证

1. 打开 `http://localhost:3000` → 进入游戏
2. 按 **F12** 看控制台应输出：
   ```
   [NetworkClient] connected to Supabase Realtime
   ```
3. 按 **T** 键 → 弹出聊天输入框 → 打字 → **Enter** 发送
4. 再打开一个浏览器无痕窗口 → 进入游戏 → 广场大屏幕上的聊天面板实时显示消息
5. 去 Supabase 网页 → 左侧 **Table Editor** → 点 `messages` 表 → 你发的消息就在里面

---

## 常见问题

| 症状 | 原因 | 解决 |
|------|------|------|
| 控制台报 `fetch failed` | `SUPABASE_URL` 写错 | 检查 Settings → API 的 Project URL |
| 控制台报 `JWSError` | `SUPABASE_ANON_KEY` 写错 | 检查是 `anon public` 不是 `secret` |
| 发消息成功但广场没显示 | Realtime publication 未启用 | 重新执行第四步的 SQL |
| 聊天输入框不出现 | `T` 键被浏览器占用 | 确认鼠标已锁定（点击画面）再按 T |
