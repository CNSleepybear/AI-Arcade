-- ============================================================
-- 玩家存档表 — 云端持久化 (Supabase SQL Editor 执行)
-- ============================================================

-- 1. 建表
CREATE TABLE saves (
  player_id UUID PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RPC: 保存存档（幂等 upsert）
CREATE OR REPLACE FUNCTION save_game(p_player_id UUID, p_data JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO saves (player_id, data, updated_at)
  VALUES (p_player_id, p_data, NOW())
  ON CONFLICT (player_id)
  DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
END;
$$;

-- 3. RPC: 加载存档
CREATE OR REPLACE FUNCTION load_game(p_player_id UUID)
RETURNS TABLE (data JSONB, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.data, s.updated_at
  FROM saves s
  WHERE s.player_id = p_player_id;
END;
$$;

-- 4. 安全策略（仅允许通过 RPC 访问，禁止直接表操作）
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
-- 不创建任何 SELECT/INSERT/UPDATE 策略 → 直接表访问全部拒绝
-- 所有操作通过 SECURITY DEFINER 函数完成
