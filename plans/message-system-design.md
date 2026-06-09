# 深渊行者·霓虹留言系统 — 设计方案

## 灵感来源

黑暗之魂/艾尔登法环的留言系统：玩家在地面留下发光符文，其他玩家走到附近即可阅读并评价。本项目适合做**赛博朋克版**——霓虹全息投影留言。

---

## 核心限制（三个场景对比）

| 场景 | 范围 | 面积 | 地面特点 |
|------|------|------|----------|
| 禁区广场 | X[-5, 5], Z[-5, 5] | 10m×10m | 中央柱+地面屏，空旷 |
| 铁锚酒馆 | X[-15, -6], Z[-5, 5] | 9m×10m | 吧台、舞台、骷髅乐队 |
| 蜂巢游戏厅 | X[6, 15], Z[-5, 5] | 9m×10m | 街机机台靠墙排列 |

**关键约束**: 总面积仅 30m×10m，玩家边界 X[-14.8, 14.8], Z[-4.8, 4.8]

---

## 设计方案

### 1. 留言内容：固定模板（防滥用）

玩家不能自由输入文字，从预设模板中组合。参考黑魂的"前有果实"风格，适配赛博朋克世界观：

```
类别 A — 提示类:
  "前方有隐藏"  /  "小心陷阱"  /  "这里有宝物"
  "试着交互"    /  "注意身后"  /  "死路"

类别 B — 情感类:
  "好酒！"      /  "孤独……"   /  "怀念旧网"
  "欢迎新人"    /  "干杯"      /  "太强了"

类别 C — 游戏相关:
  "Roshambo 必胜法在此"  /  "深渊垂钓记录刷新点"
  "纸之仪式隐藏结局"    /  "找齐碎片"
```

### 2. 留言数量限制（防止刷屏）

| 限制维度 | 值 | 理由 |
|----------|-----|------|
| 每个场景最多同时显示 | **6 条** | 3个场景×6=18条，地面不拥挤 |
| 每个玩家最多同时存在 | **2 条** | 避免单人刷屏 |
| 留言存活时间 | **2 小时** | 过期自动清除，保持新鲜 |
| 新留言冷却 | **60 秒** | 防 spam |
| 读取距离 | **1.5m** | 走近才弹出气泡 |

### 3. 视觉表现

- **外观**: 地面上一束竖直的霓虹光束（0.08m 宽 × 1.2m 高青色光柱），底部有一个旋转的小全息符文环
- **颜色按类别**: A=青色 #00ffcc, B=品红 #ff00cc, C=金色 #ffcc00
- **交互**: 玩家走到 1.5m 内 → 半透明气泡浮现在光柱上方显示文字 + 作者名 + 👍/👎 计数
- **评价**: 气泡右下角两个小按钮 [👍] [👎]，按 E 点赞，长按 E 1.5 秒点踩（防误触）
- **寿命可视化**: 光柱高度随时间衰减，2小时后缩到0消失

### 4. UI 对比（与聊天系统的区别）

| | 聊天 | 留言 |
|---|---|---|
| 触发 | 按 T 打开输入框 | 走过即读，按 E 评价 |
| 内容 | 自由输入 | 预设模板 |
| 存在 | 广场屏幕滚动 | 地面上固定位置 |
| 持久 | 24小时可见 | 2小时存活 |
| 社交 | 纯阅读 | 可点赞/踩 |

---

## 技术实现

### 新增文件

| 文件 | 职责 |
|------|------|
| `src/data/messageDB.js` | 留言模板定义 + 类别枚举 |
| `src/three/MessageBeacon.js` | 单个留言的 3D 光柱 + 光环 + 气泡 UI（Three.js CSS2DRenderer） |
| `src/three/MessageSystem.js` | 管理所有留言：读写 Supabase、生成/销毁光柱、冷却、存活计时 |

### 改造文件

| 文件 | 变更 |
|------|------|
| `src/main.js` | 初始化 MessageSystem；E 键交互时检测附近留言（优先级低于机台/碎片）；处理点赞/踩 |
| `src/data/supabase.js` | 无需改 |
| `index.html` | 无需改 |

### 数据库表

```sql
CREATE TABLE messages_ground (
  id BIGSERIAL PRIMARY KEY,
  zone TEXT NOT NULL,           -- 'plaza' | 'tavern' | 'arcade'
  x REAL NOT NULL,              -- world X position
  z REAL NOT NULL,              -- world Z position
  template_id TEXT NOT NULL,    -- 模板 key like 'hint_treasure'
  author TEXT NOT NULL,         -- display name
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours')
);

-- 查询：拉取某场景未过期的留言
CREATE INDEX idx_messages_zone_expires ON messages_ground (zone, expires_at);

-- Realtime 订阅
ALTER TABLE messages_ground ENABLE REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE messages_ground;

-- RLS: 允许匿名读写
ALTER TABLE messages_ground ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON messages_ground FOR ALL USING (true);

-- RPC: 点赞/踩（原子操作）
CREATE OR REPLACE FUNCTION vote_message(p_id BIGINT, p_delta INTEGER)
RETURNS VOID LANGUAGE sql AS $$
  UPDATE messages_ground
  SET likes = CASE WHEN p_delta > 0 THEN likes + 1 ELSE likes END,
      dislikes = CASE WHEN p_delta < 0 THEN dislikes + 1 ELSE dislikes END
  WHERE id = p_id;
$$;

-- RPC: 清理过期留言
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS VOID LANGUAGE sql AS $$
  DELETE FROM messages_ground WHERE expires_at < NOW();
$$;
```

### 交互逻辑

```
玩家走到坐标 (x, z)
    ↓
MessageSystem.getNearbyMessages(x, z) → [beacon1, beacon2, ...]
    ↓ (1.5m内)
显示最近一个的气泡
    ↓ 玩家按 E
    ① 优先: 街机机台交互
    ② 次优: 碎片收集
    ③ 次优: 酒馆酒杯
    ④ 末位: 留言评价 (👍)
    ↓ 长按 E 1.5s
留言评价 (👎)
```

### 写留言流程

```
玩家按 M 键 → 弹出留言面板 (HTML overlay)
    ↓
选择场景（自动按当前位置） → 选择类别 → 选择模板
    ↓
确认 → 检查冷却 (60s) → 检查该玩家存活数 (≤2)
    ↓
Supabase INSERT → Realtime 推送给所有客户端
    ↓
3D 光柱立即出现在地面上
```

### 数据流

```
玩家A写留言
    ↓ Supabase INSERT
    ↓ Realtime broadcast
所有客户端 MessageSystem.onMessageCreated(payload)
    ↓
new MessageBeacon(scene, pos, template, author)
    ↓
光柱出现在 3D 世界中
    ↓ 其他玩家走过
气泡浮现 + 阅读
```

---

## 实施阶段

### 阶段 1: 数据库 + 模板 (30 min)
1. 在 Supabase SQL Editor 执行建表 DDL
2. 创建 `src/data/messageDB.js` — 模板定义

### 阶段 2: 3D 光柱 + 气泡 (45 min)
3. 创建 `src/three/MessageBeacon.js` — 光柱 mesh + CSS2D 气泡
4. 创建 `src/three/MessageSystem.js` — 管理 CRUD + Supabase Realtime

### 阶段 3: 玩家交互 (30 min)
5. 修改 `src/main.js` — 初始化 MessageSystem，E 键检测留言，M 键打开留言面板
6. 修改 `index.html` — 留言创建面板 overlay

### 阶段 4: 测试 (15 min)
7. 留一条→另一个浏览器看到→点赞→过期消失

---

## 与现有系统的关系

| 现有系统 | 关系 |
|----------|------|
| NetworkClient (聊天) | 独立，不冲突 |
| Supabase Realtime | 新增一个 channel `ground-messages` |
| SaveManager (存档) | 不关联，留言独立 |
| Interaction (E键) | 优先级链：机台 > 碎片 > 酒杯 > 留言 |
| 探索系统 (碎片) | 不关联 |

---

## 一句话总结

> **黑魂留言 × 赛博朋克：玩家在地面留下霓虹全息光柱，路过即读、点赞/踩，2小时过期，每场景最多6条。M键留、E键评、走过即看。**
