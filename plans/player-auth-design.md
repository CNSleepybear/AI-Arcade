# 玩家认证系统设计

## 核心需求

- 用户名 + 密码登录/注册
- 用户名可重名，后缀 `#数字` 保证唯一，如 `sleepybear#65465`
- 聊天中显示 `sleepybear#65465`
- 无需邮箱，游戏友好

## 数据库设计

### `players` 表（Supabase SQL Editor 执行）

```sql
-- 启用 pgcrypto 扩展（密码哈希用）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 玩家表
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  tag INTEGER NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 联合唯一：同一 username 下 tag 不重复
  UNIQUE (username, tag)
);

-- 用于快速查重复用户名的索引
CREATE INDEX idx_players_username ON players (username);
```

### 后缀生成逻辑（客户端/数据库侧）

注册时：
1. 查 `SELECT COALESCE(MAX(tag), 0) + 1 FROM players WHERE username = $1`
   - 如果返回 1 → 你是第一个 `sleepybear` → `sleepybear#1`
   - 如果返回 5 → `sleepybear#5`
   
但并发导致 tag 重复！用**先插入再重试更安全**：

```
INSERT INTO players (username, tag, password_hash)
SELECT 'sleepybear', COALESCE(MAX(tag), 0) + 1, crypt('mypass', gen_salt('bf'))
FROM players WHERE username = 'sleepybear';
```

这条语句原子化执行——同一用户名下 tag 自增 +1，无并发竞争。

### RLS 策略（登录前需查表）

```sql
-- 登录时需要用 password 查表 → 需要绕过 RLS
-- 使用 Supabase RPC function 代替直接查表

CREATE OR REPLACE FUNCTION login_player(p_username TEXT, p_password TEXT)
RETURNS TABLE (id UUID, display_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_player players%ROWTYPE;
BEGIN
  SELECT * INTO v_player
  FROM players
  WHERE username = p_username
    AND password_hash = crypt(p_password, password_hash);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid username or password';
  END IF;

  RETURN QUERY
  SELECT v_player.id, (v_player.username || '#' || v_player.tag)::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION register_player(p_username TEXT, p_password TEXT)
RETURNS TABLE (id UUID, display_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_tag INTEGER;
  v_id UUID;
BEGIN
  -- 原子化获取下一个 tag（无并发重复）
  INSERT INTO players (username, tag, password_hash)
  SELECT p_username, COALESCE(MAX(tag), 0) + 1, crypt(p_password, gen_salt('bf'))
  FROM players WHERE username = p_username
  RETURNING id, (username || '#' || tag)::TEXT INTO v_id, display_name;
  
  id := v_id;
  RETURN NEXT;
END;
$$;
```

### RLS 策略

```sql
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
-- 只能读自己的行（不暴露密码哈希给前端）
CREATE POLICY "read_own" ON players FOR SELECT USING (id = current_setting('app.player_id', true)::UUID);
-- 注册/登录由 RPC function 绕过 RLS（SECURITY DEFINER）
```

---

## 前端架构

### 新增文件

| 文件 | 职责 |
|------|------|
| `src/data/authService.js` | `login(username, password)` / `register(username, password)` → 调 Supabase RPC |
| `src/ui/LoginScreen.js` | 登录/注册 HTML overlay UI（使用现有 `#title-screen` 改造） |

### 改造文件

| 文件 | 变更 |
|------|------|
| `index.html` | 新增 `#auth-panel` 登录表单 DOM（或复用 title-screen 区域） |
| `src/style.css` | 登录表单样式（霓虹主题） |
| `src/main.js` | 标题屏后先显示登录 → 调用 `authService.login()` → 成功后进入游戏；`currentCharData.name` 替换为 `displayName` |
| `src/data/NetworkClient.js` | `sendChat()` / `sendScore()` 的 `author` 字段改用 `currentDisplayName`（login 后设置） |

### 认证数据流

```
标题屏 → 点击"进入游戏"
          ↓
     登录面板弹出
     ┌──────────────────┐
     │ 用户名: sleepybear │
     │ 密码:   ********  │
     │ [登录]  [注册]     │
     └──────────────────┘
          ↓
   authService.login(username, password)
          ↓
   supabase.rpc('login_player', { p_username, p_password })
          ↓
   PostgreSQL: crypt() 验证密码
          ↓
   返回 { id: 'uuid', display_name: 'sleepybear#1' }
          ↓
   存入 sessionStorage:
     playerId: 'uuid'
     displayName: 'sleepybear#1'
          ↓
   main.js: currentCharData.name = displayName
   NetworkClient: 所有 sendChat/sendScore 用 displayName
```

### sessionStorage vs localStorage

| 存储位置 | 特点 |
|----------|------|
| `sessionStorage` | 关标签页即退出，安全 |
| `localStorage` | 持久登录，下次打开还在 |

**推荐 `localStorage`**：下次打开自动登录（存储 `playerId` + `displayName`，每次进游戏用 Supabase RPC 验证 token 或用简单 session）。

---

## 实施阶段

### 阶段 1: 数据库
1. 执行 players 表 DDL
2. 执行 login_player / register_player RPC functions
3. 执行 RLS 策略

### 阶段 2: 前端
1. 创建 `src/data/authService.js`
2. 创建 `#auth-panel` HTML + CSS
3. 改造 `main.js` — 在 `exitTitleScreen()` 前插入登录检查
4. 改造 `NetworkClient` — `author` 用 `displayName`
5. 改造 `SaveManager` — 角色数据绑定到 `playerId` 而非 localStorage key

### 阶段 3: 验证
1. 注册 sleepybear → `sleepybear#1`
2. 另一个浏览器注册 sleepybear → `sleepybear#2`
3. 聊天里发消息，显示各自的 `#1` `#2`
