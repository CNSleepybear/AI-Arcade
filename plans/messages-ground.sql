-- ============================================================
-- 地面留言表 — 黑魂式霓虹留言系统 (Supabase SQL Editor 执行)
-- ============================================================

-- 1. 建表
CREATE TABLE messages_ground (
  id BIGSERIAL PRIMARY KEY,
  zone TEXT NOT NULL,
  x REAL NOT NULL,
  z REAL NOT NULL,
  template_id TEXT NOT NULL,
  author TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours')
);

-- 2. 索引
CREATE INDEX idx_messages_zone_expires ON messages_ground (zone, expires_at);

-- 3. Realtime 订阅
ALTER TABLE messages_ground ENABLE REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE messages_ground;

-- 4. RLS
ALTER TABLE messages_ground ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON messages_ground FOR ALL USING (true);

-- 5. RPC: 点赞/踩（原子操作，防止覆盖）
CREATE OR REPLACE FUNCTION vote_message(p_id BIGINT, p_delta INTEGER)
RETURNS VOID LANGUAGE sql AS $$
  UPDATE messages_ground
  SET likes = CASE WHEN p_delta > 0 THEN likes + 1 ELSE likes END,
      dislikes = CASE WHEN p_delta < 0 THEN dislikes + 1 ELSE dislikes END
  WHERE id = p_id;
$$;

-- 6. RPC: 执行过期清理（可定时调用或客户端触发）
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS VOID LANGUAGE sql AS $$
  DELETE FROM messages_ground WHERE expires_at < NOW();
$$;
