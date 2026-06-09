/**
 * messageDB.js — 地面留言预设模板数据库
 *
 * 设计原则：
 *   - 不允许自由输入（防滥用）
 *   - 三个类别（提示/情感/游戏），赛博朋克风格
 *   - 每条模板是纯文本，由客户端选择+组合
 */

import { t } from './i18n.js';

export function getMessageCategories() {
  return {
    hint:   { label: t('msgcat.hint'),   color: '#00ffcc' },
    emote:  { label: t('msgcat.emote'),   color: '#ff00cc' },
    game:   { label: t('msgcat.game'),   color: '#ffcc00' },
    depths: { label: t('msgcat.depths'),   color: '#8844ff' },
  };
}

export const MESSAGE_CATEGORIES = getMessageCategories();

export function getMessageTemplates() {
  return {
    // ---- 提示类 ----
    hint_treasure:     { category: 'hint', text: t('msgtpl.hint_treasure') },
    hint_hidden:       { category: 'hint', text: t('msgtpl.hint_hidden') },
    hint_interact:     { category: 'hint', text: t('msgtpl.hint_interact') },
    hint_look:         { category: 'hint', text: t('msgtpl.hint_look') },
    hint_be_careful:   { category: 'hint', text: t('msgtpl.hint_be_careful') },
    hint_secret:       { category: 'hint', text: t('msgtpl.hint_secret') },
    hint_shortcut:     { category: 'hint', text: t('msgtpl.hint_shortcut') },
    hint_dead_end:     { category: 'hint', text: t('msgtpl.hint_dead_end') },
    hint_item:         { category: 'hint', text: t('msgtpl.hint_item') },
    hint_wait:         { category: 'hint', text: t('msgtpl.hint_wait') },

    // ---- 情感类 ----
    emote_cheers:      { category: 'emote', text: t('msgtpl.emote_cheers') },
    emote_lonely:      { category: 'emote', text: t('msgtpl.emote_lonely') },
    emote_miss:        { category: 'emote', text: t('msgtpl.emote_miss') },
    emote_welcome:     { category: 'emote', text: t('msgtpl.emote_welcome') },
    emote_amazed:      { category: 'emote', text: t('msgtpl.emote_amazed') },
    emote_good_luck:   { category: 'emote', text: t('msgtpl.emote_good_luck') },
    emote_noob:        { category: 'emote', text: t('msgtpl.emote_noob') },
    emote_lets_go:     { category: 'emote', text: t('msgtpl.emote_lets_go') },
    emote_rest:        { category: 'emote', text: t('msgtpl.emote_rest') },
    emote_bye:         { category: 'emote', text: t('msgtpl.emote_bye') },

    // ---- 游戏类 ----
    game_anomaly:      { category: 'game', text: t('msgtpl.game_anomaly') },
    game_cyber_hunder: { category: 'game', text: t('msgtpl.game_cyber_hunder') },
    game_dark_water:   { category: 'game', text: t('msgtpl.game_dark_water') },
    game_leave_6pm:    { category: 'game', text: t('msgtpl.game_leave_6pm') },
    game_shard:        { category: 'game', text: t('msgtpl.game_shard') },
    game_high_score:   { category: 'game', text: t('msgtpl.game_high_score') },
    game_unlock:       { category: 'game', text: t('msgtpl.game_unlock') },
    game_boss_tip:     { category: 'game', text: t('msgtpl.game_boss_tip') },
    game_secret:       { category: 'game', text: t('msgtpl.game_secret') },

    // ---- 深渊类 (depths-exclusive) ----
    depths_echo:       { category: 'depths', text: t('msgtpl.depths_echo') },
    depths_whisper:    { category: 'depths', text: t('msgtpl.depths_whisper') },
    depths_data:       { category: 'depths', text: t('msgtpl.depths_data') },
    depths_forgotten:  { category: 'depths', text: t('msgtpl.depths_forgotten') },
    depths_ritual:     { category: 'depths', text: t('msgtpl.depths_ritual') },
    depths_machine:    { category: 'depths', text: t('msgtpl.depths_machine') },
    depths_signal:     { category: 'depths', text: t('msgtpl.depths_signal') },
    depths_void:       { category: 'depths', text: t('msgtpl.depths_void') },
  };
}

export const MESSAGE_TEMPLATES = getMessageTemplates();

/**
 * Get templates grouped by category for UI rendering.
 * @returns {{ category: string, templates: Array<{id:string, text:string}> }}
 */
export function getTemplatesByCategory() {
  const groups = {};
  for (const [id, tpl] of Object.entries(MESSAGE_TEMPLATES)) {
    const cat = tpl.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({ id, text: tpl.text });
  }
  return groups;
}

/**
 * Get the color for a template.
 * @param {string} templateId
 * @returns {string} hex color
 */
export function getTemplateColor(templateId) {
  const tpl = MESSAGE_TEMPLATES[templateId];
  if (!tpl) return '#00ffcc';
  return MESSAGE_CATEGORIES[tpl.category]?.color || '#00ffcc';
}

/**
 * Get the display text for a template.
 * @param {string} templateId
 * @returns {string}
 */
export function getTemplateText(templateId) {
  return MESSAGE_TEMPLATES[templateId]?.text || '…';
}

/**
 * Determine zone name from world X coordinate.
 * @param {number} x
 * @returns {'plaza'|'tavern'|'arcade'}
 */
export function getZoneFromX(x) {
  if (x >= -5 && x <= 5) return 'plaza';
  if (x < -5) return 'tavern';
  return 'arcade';
}
