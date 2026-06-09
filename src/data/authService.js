import { supabase } from './supabase.js';

/**
 * AuthService — player authentication via Supabase RPC functions.
 *
 * Prerequisite: run this SQL in Supabase SQL Editor:
 *
 *   CREATE EXTENSION IF NOT EXISTS pgcrypto;
 *   CREATE TABLE players (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     username TEXT NOT NULL,
 *     tag INTEGER NOT NULL,
 *     password_hash TEXT NOT NULL,
 *     created_at TIMESTAMPTZ DEFAULT NOW(),
 *     UNIQUE (username, tag)
 *   );
 *   CREATE INDEX idx_players_username ON players (username);
 *
 *   CREATE OR REPLACE FUNCTION login_player(p_username TEXT, p_password TEXT)
 *   RETURNS TABLE (id UUID, display_name TEXT)
 *   LANGUAGE plpgsql SECURITY DEFINER AS $$
 *   DECLARE v_player players%ROWTYPE;
 *   BEGIN
 *     SELECT * INTO v_player FROM players
 *     WHERE username = p_username AND password_hash = crypt(p_password, password_hash);
 *     IF NOT FOUND THEN RAISE EXCEPTION 'Invalid username or password'; END IF;
 *     RETURN QUERY SELECT v_player.id, (v_player.username || '#' || v_player.tag)::TEXT;
 *   END; $$;
 *
 *   CREATE OR REPLACE FUNCTION register_player(p_username TEXT, p_password TEXT)
 *   RETURNS TABLE (id UUID, display_name TEXT)
 *   LANGUAGE plpgsql SECURITY DEFINER AS $$
 *   DECLARE v_id UUID; v_dn TEXT;
 *   BEGIN
 *     INSERT INTO players (username, tag, password_hash)
 *     SELECT p_username, COALESCE(MAX(tag), 0) + 1, crypt(p_password, gen_salt('bf'))
 *     FROM players WHERE username = p_username
 *     RETURNING players.id, (players.username || '#' || players.tag)::TEXT INTO v_id, v_dn;
 *     id := v_id; display_name := v_dn; RETURN NEXT;
 *   END; $$;
 *
 *   ALTER TABLE players ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "read_own" ON players FOR SELECT USING (true);
 */

/** Cache loaded from localStorage on init, persisted on change */
let _playerId = null;
let _displayName = null;
let _loggedIn = false;
let _isGuest = false;

// Try restore from previous session (registered players only)
try {
  const saved = localStorage.getItem('arcade_auth');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.playerId && parsed.displayName && !parsed.isGuest) {
      _playerId = parsed.playerId;
      _displayName = parsed.displayName;
      _loggedIn = true;
      _isGuest = false;
    }
  }
} catch (e) { /* ignore */ }

/**
 * Register a new player. Tag auto-incremented per username.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{id:string, displayName:string}>}
 * @throws {Error} with user-friendly message
 */
export async function registerPlayer(username, password) {
  if (!username || username.trim().length < 2) throw new Error('用户名至少 2 个字符');
  if (!password || password.length < 4) throw new Error('密码至少 4 位');
  if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new Error('用户名只能包含字母、数字、下划线');

  const { data, error } = await supabase.rpc('register_player', {
    p_username: username.trim().toLowerCase(),
    p_password: password,
  });

  if (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate'))
      throw new Error('注册失败，请重试');
    throw new Error(error.message || '注册失败');
  }

  if (!data || data.length === 0) throw new Error('注册失败');

  _playerId = data[0].id;
  _displayName = data[0].display_name;
  _loggedIn = true;
  _persist();

  return { id: _playerId, displayName: _displayName };
}

/**
 * Login an existing player.
 * @param {string} username — without #tag suffix
 * @param {string} password
 * @returns {Promise<{id:string, displayName:string}>}
 * @throws {Error}
 */
export async function loginPlayer(username, password) {
  if (!username || !password) throw new Error('请输入用户名和密码');

  // If user typed "nullcipher#123" we extract just "nullcipher"
  const cleanName = username.trim().split('#')[0].toLowerCase();

  const { data, error } = await supabase.rpc('login_player', {
    p_username: cleanName,
    p_password: password,
  });

  if (error) throw new Error('用户名或密码错误');
  if (!data || data.length === 0) throw new Error('用户名或密码错误');

  _playerId = data[0].id;
  _displayName = data[0].display_name;
  _loggedIn = true;
  _persist();

  return { id: _playerId, displayName: _displayName };
}

/** Logout — clear session */
export function logoutPlayer() {
  _playerId = null;
  _displayName = null;
  _loggedIn = false;
  _isGuest = false;
  localStorage.removeItem('arcade_auth');
}

/**
 * Enter as guest — no registration, no cloud save.
 * Generates a random display name like '游客#a3f9b'.
 * @returns {{ id: string, displayName: string }}
 */
export function setGuestName() {
  const hex = Math.random().toString(16).slice(2, 7);
  _displayName = '游客#' + hex;
  _playerId = null;
  _loggedIn = true;
  _isGuest = true;
  return { id: null, displayName: _displayName };
}

/** @returns {boolean} true if current session is guest (no cloud sync) */
export function isGuest() { return _isGuest; }

/** @returns {boolean} */
export function isLoggedIn() { return _loggedIn; }

/** @returns {string|null} e.g. 'nullcipher#1' */
export function getDisplayName() { return _displayName; }

/** @returns {string|null} null for guests */
export function getPlayerId() { return _playerId; }

function _persist() {
  try {
    localStorage.setItem('arcade_auth', JSON.stringify({
      playerId: _playerId,
      displayName: _displayName,
    }));
  } catch (e) { /* ignore */ }
}
