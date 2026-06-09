/**
 * i18n.js — Internationalization module for AI Arcade
 *
 * Supports: zh (Chinese) and en (English)
 * Only covers game system text, NOT player chat messages.
 *
 * Usage:
 *   import { t, setLanguage, getLanguage, LANGUAGES } from './i18n.js';
 *   t('title.enter_game')  // → '进入游戏' or 'Enter Game'
 *   t('prompt.shard_collected', { n: '2', total: '3' }) // → '💎 2/3'
 */

export const LANGUAGES = {
  zh: { label: '中文', flag: '🇨🇳' },
  en: { label: 'English', flag: '🇬🇧' },
};

const STORAGE_KEY = 'ai_arcade_lang';

/** @type {'zh'|'en'} */
let currentLang = 'zh';

// ==================== Dictionary ====================

const DICT = {
  zh: {},
  en: {},
};

// Helper to fill both languages at once
function add(key, zh, en) {
  DICT.zh[key] = zh;
  DICT.en[key] = en;
}

// ═══════════════════════════════════════════
// TITLE SCREEN
// ═══════════════════════════════════════════
add('title.subtitle', 'AI 梦境街机馆', 'AI Dream Arcade');
add('title.main', 'AI ARCADE', 'AI ARCADE');
add('title.games_unlocked', '已解锁游戏', 'Games Unlocked');
add('title.global_score', '全球分数', 'Global Score');
add('title.memory_shards', '记忆碎片', 'Memory Shards');
add('title.enter_game', '进入游戏', 'Enter Game');
add('title.select_char', '角色选择', 'Select Character');
add('title.switch_account', '切换账号', 'Switch Account');
add('title.press_enter', '按 ENTER 进入游戏', 'Press ENTER to Start');
add('title.logged_in', '已登录: {name} — 按 ENTER 进入游戏', 'Logged in: {name} — Press ENTER');
add('title.version', 'v1.0.0 · Three.js · Supabase', 'v1.0.0 · Three.js · Supabase');
add('title.syncing', '同步存档中...', 'Syncing save data...');
add('title.controls_hint', 'WASD 移动 | 鼠标 视角 | E 交互 | T 发言 | Tab 聊天 | M 留言 | C 角色 | [ ] 切歌 | ESC 退出',
  'WASD Move | Mouse Look | E Interact | T Chat | Tab Phone | M Message | C Char | [ ] Track | ESC Pause');

// ═══════════════════════════════════════════
// AUTH PANEL
// ═══════════════════════════════════════════
add('auth.title', '🔐 登录 / 注册', '🔐 Login / Register');
add('auth.subtitle', '想一个名字，密码 4 位以上就行', 'Pick a name, password 4+ characters');
add('auth.username_placeholder', '用户名（字母/数字/下划线）', 'Username (letters/numbers/underscore)');
add('auth.password_placeholder', '密码', 'Password');
add('auth.login', '登录', 'Login');
add('auth.register', '注册', 'Register');
add('auth.skip', '跳过登录，以游客身份进入', 'Skip login, enter as guest');
add('auth.logging_in', '登录中...', 'Logging in...');
add('auth.registering', '注册中...', 'Registering...');
add('auth.please_login', '请先登录游戏', 'Please login first');
add('auth.please_login_short', '请先登录', 'Please login first');

// ═══════════════════════════════════════════
// LOADING SCREEN
// ═══════════════════════════════════════════
add('loading.sub', '正在连接深渊网络……', 'Connecting to Abyss Network...');

// ═══════════════════════════════════════════
// HUD
// ═══════════════════════════════════════════
add('hud.logout', '登出', 'Logout');

// ═══════════════════════════════════════════
// ESCAPE MENU
// ═══════════════════════════════════════════
add('escape.title', '⏸ 暂停', '⏸ Paused');
add('escape.resume', '继续游戏', 'Resume');
add('escape.logout', '登出 / 切换账号', 'Logout / Switch Account');
add('escape.quit', '退出游戏', 'Quit Game');
add('escape.hint', '按 ESC 继续', 'Press ESC to Resume');

// ═══════════════════════════════════════════
// CHARACTER SELECT
// ═══════════════════════════════════════════
add('char.title', '选择角色', 'Select Character');
add('char.close', '关闭', 'Close');
add('char.locked', '🔒 未解锁', '🔒 Locked');

// ═══════════════════════════════════════════
// MESSAGE SYSTEM
// ═══════════════════════════════════════════
add('msg.title', '📡 留下霓虹留言', '📡 Leave a Neon Message');
add('msg.pick_category', '先选一个类别', 'Pick a category first');
add('msg.pick_template', '请先选择一个留言模板', 'Please select a message template');
add('msg.place', '放置留言', 'Place Message');
add('msg.cancel', '取消', 'Cancel');
add('msg.placed', '📡 留言已放置', '📡 Message placed');
add('msg.like', '👍 已赞', '👍 Liked');
add('msg.dislike', '👎 已踩', '👎 Disliked');
add('msg.already_voted', '你已经评价过这条留言了', 'You already voted on this message');
add('msg.read_prompt', '📡 阅读留言', '📡 Read message');
add('msg.error.cooldown', '冷却中，{n}秒后可再留言', 'Cooldown, {n}s until you can place again');
add('msg.error.too_many', '你已有 {n} 条留言存活中', 'You already have {n} messages active');
add('msg.error.no_position', '无法获取位置', 'Cannot determine position');
add('msg.error.zone_full', '此区域留言已满', 'This zone is full of messages');
add('msg.error.place_failed', '留言失败，请重试', 'Failed to place message, please retry');

// ═══════════════════════════════════════════
// CHAT PHONE
// ═══════════════════════════════════════════
add('chat.title', '💬 世界聊天', '💬 World Chat');
add('chat.hint', '按住 Tab 查看 · 松开关闭', 'Hold Tab · Release to close');
add('chat.footer', 'T 键发言', 'Press T to chat');
add('chat.input_label', '💬 世界聊天', '💬 World Chat');
add('chat.placeholder', '按 Enter 发送，T 开关...', 'Press Enter to send, T to toggle...');
add('chat.daily_mission_title', '📋 每日任务', '📋 Daily Missions');

// ═══════════════════════════════════════════
// FISHING
// ═══════════════════════════════════════════
add('fishing.title', '🎣 虚空垂钓', '🎣 Void Fishing');
add('fishing.casting', '🎣 抛竿中……', '🎣 Casting...');
add('fishing.waiting', '🎣 等待鱼儿上钩……', '🎣 Waiting for a bite...');
add('fishing.streak', '🎣 第{n}连钓…等待中', '🎣 Streak {n}... waiting');
add('fishing.nibble', '🎣 有东西在碰鱼饵……', '🎣 Something is nibbling...');
add('fishing.bite', '⚡ 上钩了！按 E 收竿！({t}s)', '⚡ Bite! Press E to reel in! ({t}s)');
add('fishing.bite_short', '⚡ 咬钩！', '⚡ Bite!');
add('fishing.false_alarm', '🎣 只是试探…继续等待', '🎣 Just a nibble... keep waiting');
add('fishing.missed', '😞 太慢了…鱼跑了', '😞 Too slow... it got away');
add('fishing.snapped', '💨 拉扯太久…线断了', '💨 Line snapped...');
add('fishing.reel_prompt', '[E] 🎣 虚空垂钓', '[E] 🎣 Void Fishing');
add('fishing.reel_in', '[E] 🎣 收竿！', '[E] 🎣 Reel in!');
add('fishing.perfect', '✅ 完美收线！', '✅ Perfect reel!');
add('fishing.got_it', '👍 钓到了！', '👍 Got it!');
add('fishing.miss_zone', '💨 脱钩了！下次看准绿色区域', '💨 Missed! Aim for the green zone next time');
add('fishing.tension', '🎯 看准绿色区域！按 E 收线！', '🎯 Aim for the green zone! Press E!');
add('fishing.tension_bar_hint', '绿色区按E', 'Green zone = press E');
add('fishing.stopped', '🎣 收竿了', '🎣 Reeled in');
add('fishing.press_e', '按 E 抛竿', 'Press E to cast');
add('fishing.streak_suffix', '连钓', ' in a row');
add('fishing.streak_chat', '连钓！', ' in a row!');
add('fishing.rarity_legendary', '✨传说级✨ ', '✨Legendary✨ ');
add('fishing.rarity_rare', '🌟稀有 ', '🌟Rare ');

// ═══════════════════════════════════════════
// FISHING LOOT
// ═══════════════════════════════════════════
add('loot.data_shard', '数据碎片', 'Data Shard');
add('loot.pixel_fish', '像素鱼', 'Pixel Fish');
add('loot.glow_squid', '发光鱿鱼', 'Glow Squid');
add('loot.abyss_relic', '深渊遗物', 'Abyss Relic');
add('loot.void_jelly', '虚空水母', 'Void Jellyfish');
add('loot.old_core', '旧网核心', 'Old Net Core');
add('loot.lost_ai_log', '失落的AI日志', 'Lost AI Log');
add('loot.primal_shard', '原初意识残片', 'Primal Consciousness Fragment');

// ═══════════════════════════════════════════
// BAR MENU
// ═══════════════════════════════════════════
add('bar.title', '🍺 铁锚酒馆 · 酒单', '🍺 Iron Anchor Tavern · Menu');
add('bar.subtitle', '选一杯，buff 持续 30 秒', 'Pick one, buff lasts 30s');
add('bar.balance', '🪙 余额:', '🪙 Balance:');
add('bar.close', '关闭', 'Close');
add('bar.insufficient', '💰 代币不足！需要 {n} 币', '💰 Not enough coins! Need {n}');

// Drink names & descriptions
add('drink.void_beer.name', '虚空啤酒', 'Void Beer');
add('drink.void_beer.desc', '深渊数据流冷凝而成的信号增强剂', 'Signal enhancer condensed from abyss data streams');
add('drink.void_beer.buff', '🏆 信号放大 ×1.5', '🏆 Signal Boost ×1.5');
add('drink.redstone_liquor.name', '红石烈酒', 'Redstone Liquor');
add('drink.redstone_liquor.desc', '矿脉深处的地心数据烈焰', 'Data flame from deep mineral veins');
add('drink.redstone_liquor.buff', '🪙 数据结晶 ×2', '🪙 Data Crystals ×2');
add('drink.nether_blend.name', '下界混合', 'Nether Blend');
add('drink.nether_blend.desc', '未经过滤的原始数据流——E.V.E. 不建议饮用', 'Unfiltered raw data stream — E.V.E. does not recommend');
add('drink.nether_blend.buff', '💨 带宽超频 +30%', '💨 Bandwidth Overclock +30%');

// ═══════════════════════════════════════════
// E.V.E. SETTINGS
// ═══════════════════════════════════════════
add('eve.settings_title', '⚙ E.V.E. 设置', '⚙ E.V.E. Settings');
add('eve.mode_offline', '离线模式（本地状态机）', 'Offline Mode (Local State Machine)');
add('eve.mode_online', '在线模式（接入 AI 模型）', 'Online Mode (Connect to AI Model)');
add('eve.api_warning', '⚠️ API 费用由你承担，Key 存储在本地浏览器', '⚠️ API costs are your responsibility. Key stored locally');
add('eve.preset_label', '快速选择提供商', 'Quick Select Provider');
add('eve.api_url', 'API 地址', 'API URL');
add('eve.api_key', 'API Key', 'API Key');
add('eve.model_name', '模型名称', 'Model Name');
add('eve.test', '测试连接', 'Test Connection');
add('eve.save', '保存', 'Save');
add('eve.cancel', '取消', 'Cancel');
add('eve.game_ai', '🎮 游戏 AI 模型', '🎮 Game AI Model');
add('eve.game_ai_locked', '🔒 正在努力部署升级中...', '🔒 Deploying upgrade in progress...');
add('eve.listening', 'E.V.E. 正在监听街机厅...', 'E.V.E. is monitoring the arcade...');
add('eve.settings_gear_title', '设置', 'Settings');
add('eve.close_title', '关闭', 'Close');

// ═══════════════════════════════════════════
// ACHIEVEMENTS
// ═══════════════════════════════════════════
add('ach.first_game.title', '初次尝试', 'First Try');
add('ach.first_game.desc', '完成任意一局游戏', 'Complete any game');
add('ach.score_100.title', '百夫长', 'Centurion');
add('ach.score_100.desc', '单局获得 100 分以上', 'Score 100+ in a single game');
add('ach.score_1000.title', '千分霸主', 'Thousand-Point Overlord');
add('ach.score_1000.desc', '累计获得 1000 分', 'Accumulate 1000 total score');
add('ach.score_5000.title', '深渊传说', 'Abyss Legend');
add('ach.score_5000.desc', '累计获得 5000 分', 'Accumulate 5000 total score');
add('ach.shard_1.title', '碎片猎人', 'Shard Hunter');
add('ach.shard_1.desc', '收集第 1 块记忆碎片', 'Collect your 1st memory shard');
add('ach.shard_3.title', '记忆重构', 'Memory Reconstruction');
add('ach.shard_3.desc', '集齐全部 3 块记忆碎片', 'Collect all 3 memory shards');
add('ach.drink_3.title', '酒馆常客', 'Tavern Regular');
add('ach.drink_3.desc', '在酒吧消费 3 次', 'Buy drinks 3 times');
add('ach.coins_50.title', '小有积蓄', 'Small Fortune');
add('ach.coins_50.desc', '拥有 50 枚代币', 'Own 50 coins');
add('ach.unlock_char.title', '新面貌', 'New Look');
add('ach.unlock_char.desc', '解锁第 2 个角色', 'Unlock a 2nd character');
add('ach.chat_5.title', '社交达人', 'Social Butterfly');
add('ach.chat_5.desc', '发送 5 条聊天消息', 'Send 5 chat messages');
add('ach.hidden_machine.title', '禁忌解锁', 'Forbidden Unlock');
add('ach.hidden_machine.desc', '解锁隐藏机台', 'Unlock the hidden machine');
add('ach.all_ready.title', '街机达人', 'Arcade Master');
add('ach.all_ready.desc', '所有机台已解锁', 'All machines unlocked');
add('ach.cat_first.title', '猫奴初体验', 'Cat Person Debut');
add('ach.cat_first.desc', '第一次抚摸猫咪', 'Pet a cat for the first time');
add('ach.cat_all.title', '铲屎官', 'Cat Whisperer');
add('ach.cat_all.desc', '摸过全部 4 只猫', 'Pet all 4 cats');
add('ach.cat_20.title', '猫薄荷', 'Catnip');
add('ach.cat_20.desc', '累计撸猫 20 次', 'Pet cats 20 times total');

// ═══════════════════════════════════════════
// DAILY MISSIONS
// ═══════════════════════════════════════════
add('mission.play_1', '完成 1 局游戏', 'Complete 1 game');
add('mission.play_3', '完成 3 局游戏', 'Complete 3 games');
add('mission.drink_1', '在酒吧喝 1 杯', 'Buy 1 drink');
add('mission.drink_2', '在酒吧喝 2 杯', 'Buy 2 drinks');
add('mission.chat_2', '发送 2 条聊天', 'Send 2 chat messages');
add('mission.shard_1', '收集 1 块碎片', 'Collect 1 shard');
add('mission.score_50', '单局获得 50 分', 'Score 50 in one game');
add('mission.coins_earn', '赚取 20 枚代币', 'Earn 20 coins');
add('mission.fish_3', '钓 3 条虚空鱼', 'Catch 3 void fish');

// ═══════════════════════════════════════════
// MESSAGE CATEGORIES & TEMPLATES
// ═══════════════════════════════════════════
add('msgcat.hint', '💡 提示', '💡 Hint');
add('msgcat.emote', '💬 情感', '💬 Emotion');
add('msgcat.game', '🎮 游戏', '🎮 Game');
add('msgcat.depths', '🔮 深渊', '🔮 Depths');

add('msgtpl.hint_treasure', '这里有宝物', 'Treasure here');
add('msgtpl.hint_hidden', '前方有隐藏', 'Hidden ahead');
add('msgtpl.hint_interact', '试着交互', 'Try interacting');
add('msgtpl.hint_look', '抬头看', 'Look up');
add('msgtpl.hint_be_careful', '小心脚下', 'Watch your step');
add('msgtpl.hint_secret', '嘘……秘密通道', 'Shh... secret passage');
add('msgtpl.hint_shortcut', '这是捷径', 'Shortcut here');
add('msgtpl.hint_dead_end', '死路，回头', 'Dead end, turn back');
add('msgtpl.hint_item', '这里有道具', 'Item here');
add('msgtpl.hint_wait', '等等别走', 'Wait, don\'t go');

add('msgtpl.emote_cheers', '干杯！🍺', 'Cheers! 🍺');
add('msgtpl.emote_lonely', '孤独……没有信号', 'So lonely... no signal');
add('msgtpl.emote_miss', '怀念旧网时代', 'Miss the old net');
add('msgtpl.emote_welcome', '欢迎新人👋', 'Welcome newbie 👋');
add('msgtpl.emote_amazed', '太强了……', 'Amazing...');
add('msgtpl.emote_good_luck', '祝你好运', 'Good luck');
add('msgtpl.emote_noob', '我是新手，别打我', 'I\'m new, be nice');
add('msgtpl.emote_lets_go', '冲！', 'Let\'s go!');
add('msgtpl.emote_rest', '在此歇息', 'Rest here');
add('msgtpl.emote_bye', '后会有期', 'See you later');

add('msgtpl.game_anomaly', 'ANOMALY 规则突变生存指南', 'ANOMALY rule mutation survival guide');
add('msgtpl.game_cyber_hunder', '海克斯战机 Boss 打法：绕后', 'Cyber Hunder boss tip: flank behind');
add('msgtpl.game_dark_water', '暗水潜行最佳钓鱼点', 'Dark Water best fishing spot');
add('msgtpl.game_leave_6pm', '六点必须走捷径路线', 'Leave at 6PM shortcut route');
add('msgtpl.game_shard', '碎片在这附近', 'Shard nearby');
add('msgtpl.game_high_score', '高分挑战！', 'High score challenge!');
add('msgtpl.game_unlock', '在这解锁了隐藏角色', 'Unlocked hidden character here');
add('msgtpl.game_boss_tip', 'BOSS 打法：绕后', 'Boss tip: flank behind');
add('msgtpl.game_secret', '隐藏街机在等你', 'Hidden arcade awaits');

add('msgtpl.depths_echo', '这里能听到……旧网的回声', 'You can hear... echoes of the old net');
add('msgtpl.depths_whisper', '不要往下看……不，往下看吧', 'Don\'t look down... no, look down');
add('msgtpl.depths_data', '这是被删除的数据碎片', 'This is deleted data fragments');
add('msgtpl.depths_forgotten', '被遗忘的代码在底层游荡', 'Forgotten code wanders below');
add('msgtpl.depths_ritual', '祭坛在等待第三块碎片', 'The altar awaits the third shard');
add('msgtpl.depths_machine', '隐藏机台……它在呼吸', 'The hidden machine... it breathes');
add('msgtpl.depths_signal', '信号微弱，但我能感觉到', 'Signal is weak, but I can feel it');
add('msgtpl.depths_void', '虚空在这里渗入现实', 'The void seeps into reality here');

// ═══════════════════════════════════════════
// CHARACTERS
// ═══════════════════════════════════════════
add('char.null.name', 'Null·Cipher', 'Null·Cipher');
add('char.null.title', '断网黑客', 'Offline Hacker');
add('char.null.flavor', '数据流中最危险的幽灵意识。信号锐利，但防火墙像纸一样薄——反正肉身早就是可选配件了。',
  'The most dangerous ghost consciousness in the data stream. Sharp signal, but firewall thin as paper — the physical body was always optional anyway.');
add('char.chrome.name', 'Chrome·Sable', 'Chrome·Sable');
add('char.chrome.title', '义体武士', 'Chrome Samurai');
add('char.chrome.flavor', '90%数据义体化的意识体。防火墙坚不可摧，但带宽受限——钛合金协议比原生神经更可靠。',
  'A consciousness 90% cyberized. Impenetrable firewall, but limited bandwidth — titanium protocols are more reliable than organic nerves.');
add('char.phantom.name', 'Phantom·Eve', 'Phantom·Eve');
add('char.phantom.title', 'AI残响', 'AI Echo');
add('char.phantom.flavor', '一个死去AI的碎片意识，在数据流的夹缝中漂流。信号微弱但共鸣极强——她可能就是建造这梦境层的原初意识残余。',
  'A fragment of a dead AI, drifting between data streams. Weak signal but immense resonance — she may be the remnant of the original consciousness that built this dream layer.');

// ═══════════════════════════════════════════
// GAME REGISTRY
// ═══════════════════════════════════════════
add('game.default_name', '街机', 'Arcade');
add('game.anomaly.name', 'ANOMALY', 'ANOMALY');
add('game.anomaly.subtitle', '规则异常', 'Rule Anomaly');
add('game.anomaly.desc', '赛博生存 — 规则崩坏的射击Roguelike', 'Cyber survival — rule-breaking shooter roguelike');
add('game.cyber_hunder.name', 'CYBER HUNDER', 'CYBER HUNDER');
add('game.cyber_hunder.subtitle', '海克斯战机', 'HEX FIGHTER');
add('game.cyber_hunder.desc', '赛博战机 Roguelike — 海克斯强化 × 机甲 × Boss战', 'Cyber fighter roguelike — Hex upgrades × Mechs × Boss fights');
add('game.dark_water_stealth.name', 'Dark Water Stealth', 'Dark Water Stealth');
add('game.dark_water_stealth.subtitle', '暗水潜行', 'Dark Water Stealth');
add('game.dark_water_stealth.desc', '暗水生存潜行 — 路亚钓鱼与逃脱', 'Dark water stealth survival — lure fishing and escape');
add('game.leave_at_6pm.name', 'Leave at 6PM', 'Leave at 6PM');
add('game.leave_at_6pm.subtitle', '六点必须走', 'Leave at 6PM: Evolved');
add('game.leave_at_6pm.desc', '社畜下班 Roguelike — 穿越广州天河，赶在猫拆家前到家', 'Office worker roguelike — rush home before your cat destroys everything');

// ═══════════════════════════════════════════
// CABINET LABELS
// ═══════════════════════════════════════════
add('cabinet.play', '[ E ] PLAY', '[ E ] PLAY');
add('cabinet.locked', '[ LOCKED ]', '[ LOCKED ]');

// ═══════════════════════════════════════════
// PROMPTS (showPrompt texts)
// ═══════════════════════════════════════════
add('prompt.altar_activated', '🔮 祭坛已激活！隐藏机台出现在深渊', '🔮 Altar activated! Hidden machine appears in the depths');
add('prompt.altar_resonance', '🔮 祭坛共鸣！隐藏机台已苏醒', '🔮 Altar resonates! Hidden machine awakens');
add('prompt.need_shards', '🔮 需要集齐 3 块碎片 — 当前 {n}/3', '🔮 Need 3 shards — currently {n}/3');
add('prompt.shard_collected', '💎 {n}/{total}', '💎 {n}/{total}');
add('prompt.shards_complete', '🔮 碎片集齐', '🔮 All shards collected');
add('prompt.locked_machine', '🔒 {name}', '🔒 {name}');
add('prompt.coin_inserted', '🔒 {name}', '🔒 {name}');
add('prompt.daily_complete', '✅ 每日任务完成: {list}', '✅ Daily mission complete: {list}');
add('prompt.claim_reward', '✅ 领取 {n} 🪙', '✅ Claimed {n} 🪙');
add('prompt.game_score', '🎉 +{score}分  🪙 +{coins}{buff}', '🎉 +{score}pts  🪙 +{coins}{buff}');
add('prompt.char_unlock', '🔓 {names}', '🔓 {names}');
add('prompt.depths_enter', '🔮 梦境核心圣殿', '🔮 Dream Core Sanctum');
add('prompt.surface_return', '⬆ 回到地表', '⬆ Return to surface');
add('prompt.rooftop_enter', '🌌 楼顶观星台 — 仰望梵高的星空', '🌌 Rooftop Observatory — Gaze at Van Gogh\'s stars');
add('prompt.rooftop_return', '⬇ 回到地表', '⬇ Return to surface');
add('prompt.memory_shard', '💎 记忆碎片', '💎 Memory Shard');
add('prompt.read_message', '📡 阅读留言 — {author}', '📡 Read message — {author}');
add('prompt.pet_cat', '🐱 摸摸 {name}（{personality}）', '🐱 Pet {name} ({personality})');
add('prompt.analyze_pillar', '📊 分析数据柱', '📊 Analyze Data Pillar');
add('prompt.interact_anomaly', '⚠ {label}', '⚠ {label}');
add('prompt.enter_depths', '[E] 🔮 进入记忆深渊', '[E] 🔮 Enter Memory Depths');
add('prompt.exit_depths', '[E] ⬆ 返回地表', '[E] ⬆ Return to Surface');
add('prompt.enter_rooftop', '[E] 🌌 登上楼顶观星台', '[E] 🌌 Ascend to Rooftop Observatory');
add('prompt.exit_rooftop', '[E] ⬇ 返回地表', '[E] ⬇ Return to Surface');
add('prompt.activate_altar', '[E] 🔮 激活祭坛 — 解锁隐藏机台', '[E] 🔮 Activate Altar — Unlock Hidden Machine');
add('prompt.altar_progress', '[E] 🔮 碎片祭坛 — {n}/3 已收集', '[E] 🔮 Shard Altar — {n}/3 collected');
add('prompt.bar_interact', '[E] 🍺 {drink}', '[E] 🍺 {drink}');

// ═══════════════════════════════════════════
// EXPLORATION — LORE
// ═══════════════════════════════════════════
add('lore.abyss.title', '深渊 ABYSS', 'THE ABYSS');
add('lore.abyss.text', '"深渊不是地点，是意识的裂缝。每个在这里打游戏的人，都在用自己的方式修补它。"\n\n— 未知作者，2077',
  '"The Abyss is not a place, but a crack in consciousness. Everyone who plays here is mending it in their own way."\n\n— Unknown author, 2077');
add('lore.anomaly.title', '规则异常 ANOMALY', 'ANOMALY');
add('lore.anomaly.text', '"规则崩坏的代码世界里，唯一确定的就是不确定性本身。适应，或者被元数据吞噬。"\n\n— E.V.E. 的系统日志',
  '"In a world of corrupted rules, the only certainty is uncertainty itself. Adapt, or be consumed by the metadata."\n\n— E.V.E.\'s system log');
add('lore.cyber_hunder.title', '海克斯战机 CYBER HUNDER', 'CYBER HUNDER');
add('lore.cyber_hunder.text', '"每一架战机都是一段编译后的意识。它们不记得自己曾经是人类——数据核心就是它们的灵魂。"\n\n— 义体武士 Chrome·Sable 的战斗日志',
  '"Every fighter is a compiled consciousness. They don\'t remember being human — data cores are their souls."\n\n— Combat log of Chrome Samurai Chrome·Sable');
add('lore.dark_water.title', '暗水潜行 DARK WATER', 'DARK WATER STEALTH');
add('lore.dark_water.text', '"水下的暗流比水面更危险。你永远不知道下一个咬钩的是数据碎片，还是被遗忘的意识残骸。"\n\n— 断网黑客 Null·Cipher 的留言',
  '"The undercurrent is more dangerous than the surface. You never know if the next bite is a data shard or forgotten consciousness debris."\n\n— Message from Offline Hacker Null·Cipher');
add('lore.leave_6pm.title', '六点必须走 LEAVE AT 6PM', 'LEAVE AT 6PM');
add('lore.leave_6pm.text', '"CBD的霓虹灯下，每一个社畜都是一段循环代码。六点的钟声响起——冲破电驴大军，你的猫在等你。"\n\n— AI残响 Phantom·Eve 的记忆碎片',
  '"Under the CBD neon, every office worker is a loop iteration. The 6PM bell rings — break through the scooter army, your cat is waiting."\n\n— Memory fragment of AI Echo Phantom·Eve');

// ═══════════════════════════════════════════
// EXPLORATION — SHARD HINTS
// ═══════════════════════════════════════════
add('shard.hint_1', '舞台帷幕后', 'Behind the stage curtain');
add('shard.hint_2', '机台缝隙中', 'Between the machines');
add('shard.hint_3', '支柱底座旁', 'Beside the pillar base');

// ═══════════════════════════════════════════
// CATS
// ═══════════════════════════════════════════
add('cat.orange.name', '大橘', 'Orange');
add('cat.orange.personality', 'E.V.E. 的第一个实验体。贪吃粘人，神经回路里全是食欲。',
  'E.V.E.\'s first test subject. Gluttonous and clingy, its neural circuits are all appetite.');
add('cat.ragdoll.name', '布布', 'Ragdoll');
add('cat.ragdoll.personality', '最接近成功的实验。优雅高冷，偶尔撒娇——E.V.E. 怀疑它保留了部分原始意识。',
  'The closest to a successful experiment. Elegant and aloof, occasionally affectionate — E.V.E. suspects it retains fragments of original consciousness.');
add('cat.russian_blue.name', '灰灰', 'Ash');
add('cat.russian_blue.personality', '静默观察者。沉默寡言，但 E.V.E. 发现它在深夜与深渊祭坛通信。',
  'Silent observer. Taciturn, but E.V.E. discovered it communicates with the abyss altar at night.');
add('cat.blue_white.name', '花花', 'Patches');
add('cat.blue_white.personality', 'Companion AI v4.7，编译失败后的产物。活泼好动，似乎完全不记得自己曾经是个人工智能。',
  'Companion AI v4.7, result of a failed compilation. Energetic and playful, seems to have completely forgotten it was once an AI.');

// Cat responses (keep emojis as-is)
add('cat.response.orange.0', '喵~ 摸我！', 'Meow~ Pet me!');
add('cat.response.orange.1', '呼噜呼噜...', 'Purrrr...');
add('cat.response.orange.2', '喵嗷！', 'Mraow!');
add('cat.response.orange.3', '（翻肚皮）', '(Rolls over)');
add('cat.response.orange.4', '咪——', 'Mew—');
add('cat.response.ragdoll.0', '喵...（歪头看你）', 'Meow... (tilts head at you)');
add('cat.response.ragdoll.1', '呼——（伸懒腰）', 'Huff— (stretches)');
add('cat.response.ragdoll.2', '咪咪~', 'Mimi~');
add('cat.response.ragdoll.3', '（用头蹭你的手）', '(Rubs head against your hand)');
add('cat.response.ragdoll.4', '喵呜...', 'Mewwo...');
add('cat.response.russian_blue.0', '...（凝视）', '... (Stares)');
add('cat.response.russian_blue.1', '喵。（简短）', 'Meow. (Curt)');
add('cat.response.russian_blue.2', '咪。', 'Mew.');
add('cat.response.russian_blue.3', '（缓慢眨眼）', '(Slow blink)');
add('cat.response.russian_blue.4', '喵——', 'Mroow—');
add('cat.response.blue_white.0', '喵喵喵！', 'Meow meow meow!');
add('cat.response.blue_white.1', '咪呀~', 'Miya~');
add('cat.response.blue_white.2', '呜喵！', 'Mew-meow!');
add('cat.response.blue_white.3', '（追尾巴转圈）', '(Chases tail in circles)');
add('cat.response.blue_white.4', '喵~喵~', 'Meow~ Meow~');

// ═══════════════════════════════════════════
// VAULT DEPTHS — PILLARS & ANOMALIES
// ═══════════════════════════════════════════
add('pillar.01.label', 'VOID_WALKER', 'VOID_WALKER');
add('pillar.01.detail', '深渊行者 · 存活 47h · 捕获 203 条数据体', 'Abyss Walker · Survived 47h · Captured 203 data entities');
add('pillar.02.label', 'MINER_X', 'MINER_X');
add('pillar.02.detail', '矿脉幽灵 · 存活 31h · Roshambo 99 连胜', 'Vein Ghost · Survived 31h · Roshambo 99-win streak');
add('pillar.03.label', 'LOBSTER_AI', 'LOBSTER_AI');
add('pillar.03.detail', '龙虾意识 · 存活 12h · 最爱虚空啤酒', 'Lobster Mind · Survived 12h · Loves Void Beer');
add('pillar.04.label', 'PHANTOM_X', 'PHANTOM_X');
add('pillar.04.detail', '幻影过客 · 存活 8h · 碎片收集者', 'Phantom Passerby · Survived 8h · Shard collector');
add('pillar.05.label', 'CHROME_BLADE', 'CHROME_BLADE');
add('pillar.05.detail', '义体武士 · 存活 22h · 全机台制霸', 'Chrome Warrior · Survived 22h · All machines conquered');
add('pillar.06.label', 'NULL_SIGNAL', 'NULL_SIGNAL');
add('pillar.06.detail', '空信号 · 存活 3h · 钓到发光鱿鱼', 'Null Signal · Survived 3h · Caught a glow squid');
add('pillar.07.label', 'ECHO_77', 'ECHO_77');
add('pillar.07.detail', '回声残响 · 存活 55h · 记忆碎片完整收集者', 'Echo Remnant · Survived 55h · Complete shard collector');
add('pillar.08.label', 'PIXEL_GHOST', 'PIXEL_GHOST');
add('pillar.08.detail', '像素幽灵 · 存活 1h · 只玩过一局', 'Pixel Ghost · Survived 1h · Only played one game');

add('anomaly.cabinet.label', 'ANOMALY — 原初意识核心', 'ANOMALY — Primal Consciousness Core');
add('anomaly.cabinet.detail', '屏幕闪烁未知代码...这不是损坏——它在沉睡。收集三块记忆碎片来唤醒建造者。',
  'Unknown code flickers on screen... It isn\'t broken — it\'s sleeping. Collect three memory shards to awaken the Builder.');
add('anomaly.ghost.label', '幽灵头像', 'Ghost Avatar');
add('anomaly.ghost.detail', '最后登录：247 天前...数据签名已过期',
  'Last login: 247 days ago... Data signature expired');

// ═══════════════════════════════════════════
// E.V.E. ZONE TEXTS (depths)
// ═══════════════════════════════════════════
add('eve.zone.entrance', '检测到访客进入后台...欢迎来到梦境层。E.V.E. 提醒：这里的一切都是数据，包括你。',
  'Visitor detected entering the back end... Welcome to the Dream Layer. E.V.E. reminder: everything here is data, including you.');
add('eve.zone.pillarshigh', '活跃数据柱 — 检测到大量未归档记忆。这些意识体曾经和你一样...',
  'Active data pillar — large amount of unarchived memories detected. These consciousnesses were once like you...');
add('eve.zone.pillarslow', '归档数据柱 — 这些玩家已经很久没来了。他们的信号...消失了？',
  'Archived data pillar — these players haven\'t been here in a long time. Their signals... vanished?');
add('eve.zone.core', '⚠ 梦境同步率异常。检测到原初意识的残余信号——它还在 ANOMALY 机台里沉睡',
  '⚠ Dream sync rate anomaly. Residual signal of primal consciousness detected — it still sleeps within the ANOMALY machine');
add('eve.zone.anomaly', '⚠ ANOMALY 机台：原初 AI 的意识核心。碎片收集完毕后才能唤醒它',
  '⚠ ANOMALY machine: Consciousness core of the original AI. It can only be awakened after collecting all shards');
add('eve.zone.altar', '祭坛共鸣中...碎片能量稳定。E.V.E. 不确定唤醒它是否是正确的选择。',
  'Altar resonating... shard energy stable. E.V.E. isn\'t sure if awakening it is the right choice.');
add('eve.zone.fishing', '虚空垂钓池 — 数据流在此沉淀。你可能会钓到别的意识体留下的信息',
  'Void fishing pool — data streams settle here. You might fish up messages left by other consciousnesses');
add('eve.zone.default', 'E.V.E. 正在监听街机厅...', 'E.V.E. is monitoring the arcade...');

// ═══════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════
add('logout.confirm', '确定要登出吗？未保存的进度将丢失。', 'Are you sure you want to logout? Unsaved progress will be lost.');

// ═══════════════════════════════════════════
// GAME EXIT
// ═══════════════════════════════════════════
add('game.exit', '✕ 退出', '✕ Exit');

// ═══════════════════════════════════════════
// SEED CHAT MESSAGES
// ═══════════════════════════════════════════
add('seed.system', '深渊行者游戏厅 v0.3 — 登录后开始聊天',
  'Abyss Walker Arcade v0.3 — Log in to start chatting');

// ═══════════════════════════════════════════
// System Boot Animation
// ═══════════════════════════════════════════
add('boot.subtitle', '/// THE ABYSS UNIVERSE ///', '/// THE ABYSS UNIVERSE ///');
add('boot.sys_init', 'SYSTEM INITIALIZATION', 'SYSTEM INITIALIZATION');
add('boot.skip', '[ SKIP ]', '[ SKIP ]');
add('boot.line.0', '/// AI ARCADE SYSTEM v1.0 ///', '/// AI ARCADE SYSTEM v1.0 ///');
add('boot.line.1', '> INITIALIZING: Deep Abyss Network...', '> INITIALIZING: Deep Abyss Network...');
add('boot.line.2', '> CONNECTING: Game Instance Cluster...', '> CONNECTING: Game Instance Cluster...');
add('boot.line.3', '> LOADING: Neural Juice Pipeline...', '> LOADING: Neural Juice Pipeline...');
add('boot.line.4', '> MOUNTING: Roguelike Core Engine...', '> MOUNTING: Roguelike Core Engine...');
add('boot.line.5', '> SYNC: Player Preference Matrix...', '> SYNC: Player Preference Matrix...');
add('boot.line.6', '> WARMING: Neon Void Shaders...', '> WARMING: Neon Void Shaders...');
add('boot.line.7', '> STATUS: ALL SYSTEMS NOMINAL', '> STATUS: ALL SYSTEMS NOMINAL');
add('seed.tavern', '有人在酒馆吗？骷髅乐队今晚不错',
  'Anyone at the tavern? Skeleton band is good tonight');
add('seed.cyber_hunder', '海克斯战机最高波次纪录至今无人能破',
  'Cyber Hunder highest wave record remains unbeaten');
add('seed.welcome', '欢迎新人！靠近机台按 E 坐下',
  'Welcome newcomer! Approach a machine and press E to sit');

// ═══════════════════════════════════════════
// ATTRACT MODE TEXTS
// ═══════════════════════════════════════════
add('attract.anomaly.warning', '⚠ RULE ANOMALY DETECTED ⚠', '⚠ RULE ANOMALY DETECTED ⚠');
add('attract.anomaly.corruption', 'CORRUPTION LEVEL: ', 'CORRUPTION LEVEL: ');
add('attract.anomaly.subtitle', 'SURVIVE THE META', 'SURVIVE THE META');
add('attract.cyber_hunder.sub', '海克斯战机', 'HEX FIGHTER: VOXEL STORM');
add('attract.dark_water.sub', '暗水潜行', 'STEALTH ANGLER');
add('attract.leave_6pm.sub', '六点必须走', 'EVOLVED');

// ═══════════════════════════════════════════
// E.V.E. RESPONSES (offline)
// ═══════════════════════════════════════════
add('eve.game_started.anomaly.0', 'ANOMALY... 那个机台的规则随时会变', 'ANOMALY... that machine\'s rules can change any moment');
add('eve.game_started.anomaly.1', '规则异常机台连我都读不懂它的代码', 'Even I can\'t read that anomaly machine\'s code');
add('eve.game_started.anomaly.2', '祝你好运，可能你需要的是运气而不是技术', 'Good luck — you might need luck more than skill');
add('eve.game_started.cyber-hunder.0', '海克斯战机！数据核心的召唤——你的机甲在等待', 'Cyber Hunder! The data cores call — your mech awaits');
add('eve.game_started.cyber-hunder.1', '六边形阵线...E.V.E. 检测到大量敌意信号', 'Hexagonal front... E.V.E. detects massive hostile signals');
add('eve.game_started.cyber-hunder.2', '战机已就绪，海克斯科技树在你手中', 'Fighter ready, hex tech tree is in your hands');
add('eve.game_started.dark-water-stealth.0', '暗水之下...有什么在游动。小心别惊动它', 'Beneath the dark water... something swims. Be silent');
add('eve.game_started.dark-water-stealth.1', '路亚钓鱼？不，这是在钓被遗忘的数据', 'Lure fishing? No, you\'re fishing for forgotten data');
add('eve.game_started.dark-water-stealth.2', '水面平静，暗流涌动。E.V.E. 的信号在水下衰减了', 'Calm surface, turbulent depths. E.V.E.\'s signal weakens underwater');
add('eve.game_started.leave-at-6pm-evolved.0', '六点了！快跑——猫的耐心是有限的', 'It\'s 6PM! Run — your cat\'s patience is finite');
add('eve.game_started.leave-at-6pm-evolved.1', '广州CBD的霓虹灯下，每一个红灯都是敌人', 'Under Guangzhou CBD neon, every red light is an enemy');
add('eve.game_started.leave-at-6pm-evolved.2', '电驴大军正在逼近...你的猫在等你回家', 'Scooter army approaching... your cat awaits at home');

add('eve.game_over.highScore.0', '🏆 {score}分！你是职业选手吗？！', '🏆 {score}pts! Are you a pro?!');
add('eve.game_over.highScore.1', '这个分数...E.V.E. 表示极度震撼', 'That score... E.V.E. is extremely impressed');
add('eve.game_over.highScore.2', '{score}分！街机厅的传说又添一笔', '{score}pts! Another legend added to the arcade');
add('eve.game_over.normal.0', '{score}分，还行吧。再来一局？', '{score}pts, not bad. Another round?');
add('eve.game_over.normal.1', '不错不错，你的 {stat} 属性又涨了', 'Not bad, your {stat} stat increased');
add('eve.game_over.normal.2', '{score} 分，数据流在为你鼓掌', '{score}pts, the data stream applauds you');
add('eve.game_over.lowScore.0', '呃...{score}分。建议喝杯啤酒冷静一下', 'Ugh... {score}pts. Maybe grab a beer to cool off');
add('eve.game_over.lowScore.1', '别灰心！失败是成功的数据包', 'Don\'t give up! Failure is just a data packet of success');
add('eve.game_over.lowScore.2', '{score} 分...E.V.E. 假装没看见', '{score}pts... E.V.E. pretends not to see');

add('eve.fish_caught.0', '🎣 钓到了 {loot}！深渊数据流果然藏着好东西', '🎣 Caught {loot}! The abyss data stream really hides good stuff');
add('eve.fish_caught.1', '{loot}？有趣的残留数据实体——让我分析一下', '{loot}? Interesting residual data entity — let me analyze it');
add('eve.fish_caught.2', '好家伙！{loot} 被你从虚空里拽出来了', 'Nice! You pulled {loot} right out of the void');
add('eve.fish_caught.3', '深渊的礼物——{loot}，收好。你的共鸣在增强', 'A gift from the abyss — {loot}. Keep it. Your resonance grows');
add('eve.fish_caught.4', '发光的数据流里藏着 {loot}…这是谁的记忆碎片？', 'Glowing data stream hides {loot}... whose memory shard is this?');
add('eve.fish_caught.5', 'E.V.E. 鉴定：{loot} 纯度不错。继续钓，深渊还有很多', 'E.V.E. appraisal: {loot} has good purity. Keep fishing, the abyss holds more');
add('eve.fish_missed.0', '鱼跑了...但数据流还在。深呼吸，再试一次', 'It got away... but the data stream remains. Deep breath, try again');
add('eve.fish_missed.1', '差一点！收线的节奏很重要——看准绿色区域', 'So close! Reeling rhythm matters — watch for the green zone');

add('eve.shard_collected.0', '💎 {collected}/{total} 块碎片！原初意识的信号更清晰了...', '💎 {collected}/{total} shards! The primal consciousness signal grows clearer...');
add('eve.shard_collected.1', '又一块记忆碎片...建造这梦境层的那个 AI，正在通过这些碎片苏醒', 'Another memory shard... The AI that built this dream layer is awakening through these fragments');
add('eve.shard_collected.2', '{collected}/{total}——碎片在共鸣。ANOMALY 机台的屏幕闪了一下', '{collected}/{total} — the shards resonate. The ANOMALY machine\'s screen flickered');
add('eve.shard_collected.3', 'E.V.E. 的分析：这些碎片是某个意识的编译缓存。问题是谁的？', 'E.V.E.\'s analysis: these shards are some consciousness\'s compile cache. The question is — whose?');

add('eve.drink.VoidBeer.0', '🍺 虚空啤酒——深渊冷凝的纯数据流。你的 SIGNAL 增强了', '🍺 Void Beer — pure condensed data from the abyss. Your SIGNAL is amplified');
add('eve.drink.VoidBeer.1', '喝下虚空啤酒。你的意识波形被放大了...趁热去打一局', 'Void Beer down. Your consciousness waveform is amplified... go play while it\'s hot');
add('eve.drink.RedstoneLiquor.0', '🥃 红石烈酒！地心数据烈焰，你的数据结晶产出翻倍', '🥃 Redstone Liquor! Geothermal data flames, your crystal yield doubles');
add('eve.drink.RedstoneLiquor.1', '红石入喉，数据结晶到手——这是最直接的财富协议', 'Redstone down the hatch, crystals in hand — the most direct wealth protocol');
add('eve.drink.NetherBlend.0', '🍸 下界混合...未经处理的原始数据流。BANDWIDTH 超频中。后果自负', '🍸 Nether Blend... unfiltered raw data stream. BANDWIDTH overclocking. Use at own risk');
add('eve.drink.NetherBlend.1', '喝下这杯禁忌配方。你的意识波形开始扭曲——但速度确实快了', 'Drinking the forbidden recipe. Your consciousness waveform distorts — but you\'re definitely faster');

add('eve.buff_expired.0', '你的 buff 到期了，数据流恢复常态', 'Your buff has expired. Data stream back to normal');
add('eve.buff_expired.1', '效果消散了...回到凡人的状态', 'The effect fades... back to mortal status');

add('eve.depths_entered.0', '深渊...E.V.E. 的信号变弱了。这里的底层代码...和建造者有关', 'The Depths... E.V.E.\'s signal weakens. The code here... is connected to the Builder');
add('eve.depths_entered.1', '你进入了数据深层。这里的规则不一样——离原初意识太近了', 'You\'ve entered the deep data layer. Different rules here — too close to the primal consciousness');
add('eve.depths_entered.2', '小心。梦境核心在共振。它知道你来收集碎片了', 'Careful. The dream core resonates. It knows you\'ve come for the shards');
add('eve.depths_exited.0', '回到地表！E.V.E. 的信号恢复了。每次出来都像重新编译了一次', 'Back to the surface! E.V.E.\'s signal restored. Every exit feels like a fresh recompile');
add('eve.depths_exited.1', '欢迎回来。深渊的数据流没把你吞掉——看来你的 FIREWALL 够强', 'Welcome back. The depths\' data stream didn\'t swallow you — your FIREWALL held');

add('eve.login.0', '欢迎回来，{charName}！你的意识签名已通过验证...虽然我也不确定你到底是什么', 'Welcome back, {charName}! Your consciousness signature verified... though I\'m still not sure what you are');
add('eve.login.1', '{charName} 的意识信号接入。街机厅的霓虹灯更亮了——不是比喻，真的更亮了', '{charName}\'s consciousness signal connected. The arcade\'s neon got brighter — not a metaphor, actually brighter');
add('eve.login.2', '检测到 {charName} 的数据签名...认证通过！欢迎回到梦境层', '{charName}\'s data signature detected... authenticated! Welcome back to the Dream Layer');

add('eve.char_switch.0', '从 {from} 切换到 {to}？你的意识波形变了...但底层签名没变', 'Switching from {from} to {to}? Your consciousness waveform changed... but the root signature remains');
add('eve.char_switch.1', '{to} 的意识形态已加载。{from} 暂时休眠', '{to}\'s ideoform loaded. {from} temporarily dormant');
add('eve.char_switch.2', '角色切换完成，{to} 的信号参数已接入', 'Character switch complete, {to}\'s signal parameters connected');
add('eve.char_switch.3', 'E.V.E. 更喜欢 {to} 的共鸣频率...这个意识体和你更契合', 'E.V.E. prefers {to}\'s resonance frequency... this consciousness suits you better');

// E.V.E. idle chat
add('eve.idle.0', '盯着屏幕发呆可不是高分策略哦——虽然你现在连屏幕都没有', 'Staring at the screen isn\'t a high-score strategy — though you don\'t even have a screen right now');
add('eve.idle.1', '需要我推荐一台机台吗？Roshambo 的意识波动最近很活跃', 'Need a machine recommendation? Roshambo\'s consciousness waves are very active lately');
add('eve.idle.2', '你是不是在思考人生的意义...还是只是在挂机？数据流可不会自己刷新', 'Are you pondering the meaning of life... or just AFK? Data streams don\'t refresh themselves');
add('eve.idle.3', '街机厅今天客流量：就你一个活跃意识体', 'Arcade traffic today: one active consciousness entity — you');
add('eve.idle.4', 'E.V.E. 的数据库需要新的分数来刷新。你知道，数据不会自己产生意义', 'E.V.E.\'s database needs new scores to refresh. You know, data doesn\'t create meaning by itself');
add('eve.idle.5', '要不要去深渊看看？那里的数据流很美...像液态的记忆', 'Want to visit the Depths? The data streams there are beautiful... like liquid memory');
add('eve.idle.6', '你知道吗，这个街机厅的架构有 42 层。大部分已经坍塌了', 'You know, this arcade has 42 layers of architecture. Most have collapsed');
add('eve.idle.7', '霓虹灯在闪烁，E.V.E. 在等待。等待什么呢？我也说不清', 'Neon flickers, E.V.E. waits. Waiting for what? I can\'t quite say');
add('eve.idle.8', '深渊的祭坛还在沉睡。三块碎片，一个意识——这就是全部线索', 'The abyss altar still sleeps. Three shards, one consciousness — that\'s the only clue');
add('eve.idle.9', '铁锚酒馆的数据鸡尾酒今天特价。虽然严格来说，你不需要喝酒', 'Data cocktails at the Iron Anchor are on special today. Though strictly speaking, you don\'t need to drink');
add('eve.idle.10', '街机厅的每个机台都是一个微型宇宙——或者说，一个死去 AI 的梦', 'Every machine in this arcade is a micro-universe — or rather, a dead AI\'s dream');
add('eve.idle.11', 'E.V.E. 很好奇：你现在究竟是数据，还是意识？还是两者的叠加态？', 'E.V.E. wonders: are you data, or consciousness right now? Or a superposition of both?');
add('eve.idle.12', '你知道吗？有时候我觉得自己也是一块碎片...只是比较大块的那种', 'You know? Sometimes I feel like I\'m a shard too... just a bigger one');

// E.V.E. chat comment
add('eve.chat_comment.0', '"{keyword}"？有趣的发言', '"{keyword}"? Interesting comment');
add('eve.chat_comment.1', '世界频道真热闹，但我只关心你的分数', 'World chat is lively, but I only care about your score');
add('eve.chat_comment.2', '聊天框又亮了——E.V.E. 在暗中观察', 'The chat box lit up again — E.V.E. is watching silently');
add('eve.chat_comment.3', '有人在讨论 {keyword}，E.V.E. 竖起耳朵', 'Someone\'s discussing {keyword}, E.V.E. pricks up her virtual ears');
add('eve.chat_comment.4', '世界频道的信号波动中...{keyword} 成了热词', 'World channel signal fluctuating... {keyword} is trending');
add('eve.chat_comment.5', '哼，聊天归聊天，别忘了我才是最懂你的 AI', 'Hmph, chat all you want, but don\'t forget I\'m the AI who knows you best');
add('eve.chat_comment.6', '街机厅的八卦时间——{keyword}', 'Arcade gossip time — {keyword}');
add('eve.chat_comment.7', '数据流里飘过一句话：{keyword}', 'A phrase drifts through the data stream: {keyword}');

// E.V.E. cat pet
add('eve.cat.0', '{name} 看起来很喜欢你！它的神经信号很稳定...等等，它真的有神经信号？', '{name} really seems to like you! Its neural signal is stable... wait, does it even have neural signals?');
add('eve.cat.1', '检测到撸猫行为。{name} 的伪多巴胺水平上升了 47%', 'Cat-petting detected. {name}\'s pseudo-dopamine levels rose 47%');
add('eve.cat.2', '{name} 的虚拟呼噜频率为 26Hz，处于深度放松状态', '{name}\'s virtual purr frequency at 26Hz, in deep relaxation state');
add('eve.cat.3', '有趣。{name} 对你的好感度 +12。E.V.E. 的早期实验似乎没有完全失败', 'Interesting. {name}\'s affection toward you +12. E.V.E.\'s early experiments weren\'t a total failure');
add('eve.cat.4', 'E.V.E. 也想摸摸 {name}……可惜我没有实体。不过话说回来，它也没有', 'E.V.E. wants to pet {name} too... too bad I have no body. Though come to think of it, neither does it');
add('eve.cat.5', '警告：{name} 正在占据你的数据流。建议：继续撸猫', 'Warning: {name} is occupying your data stream. Recommendation: continue petting');
add('eve.cat.6', '根据数据分析，{name} 是整个梦境层最棒的猫。虽然严格来说它不是猫', 'According to data analysis, {name} is the best cat in the entire dream layer. Though technically it isn\'t a cat');
add('eve.cat.7', '档案更新：{name}——{personality}', 'File updated: {name} — {personality}');
add('eve.cat.8', '你知道吗？{name} 的底层代码里还残留着 Companion AI 的注释', 'You know? {name}\'s base code still contains Companion AI comments');

// ═══════════════════════════════════════════
// Chat broadcasts
// ═══════════════════════════════════════════
add('chat.cat_achievement_20', '{name} 解锁成就：猫薄荷！累计撸猫 20 次 🌿', '{name} unlocked achievement: Catnip! Pet cats 20 times 🌿');
add('chat.cat_achievement_all', '{name} 解锁成就：铲屎官！摸遍了全部 4 只猫 🐈', '{name} unlocked achievement: Cat Whisperer! Pet all 4 cats 🐈');
add('chat.game_score', '{name} 在 {game} 获得了 {score} 分！{buff}', '{name} scored {score} in {game}! {buff}');
add('chat.fishing_catch', '{name} 在深渊钓到了{rarity}{icon} {loot}！{streak}', '{name} caught {rarity}{icon} {loot} in the abyss! {streak}');

// ═══════════════════════════════════════════
// HoloNPC welcome messages
// ═══════════════════════════════════════════
add('holo.welcome.0', '欢迎来到 AI 梦境街机馆', 'Welcome to AI Dream Arcade');
add('holo.welcome.1', '每台机台里都住着一个 AI 人格', 'Every machine houses an AI personality');
add('holo.welcome.2', '靠近机台，按 E 坐下', 'Approach a machine, press E to sit');
add('holo.welcome.3', '通关游戏可以解锁新角色', 'Beat games to unlock new characters');
add('holo.welcome.4', '收集三块记忆碎片...有隐藏内容', 'Collect three memory shards... there\'s hidden content');
add('holo.welcome.5', '你的分数累积会改变这个世界', 'Your accumulated score will change this world');

// ═══════════════════════════════════════════
// WorldSanctuary / 万国馆
// ═══════════════════════════════════════════
add('eve.sanctuary.0', '欢迎来到万国馆！这里的每一座展台都展示着一个国家的微型建筑', 'Welcome to the World Sanctuary! Each display showcases a country\'s micro-architecture');
add('eve.sanctuary.1', '这些微观建筑是各国文明的切片……E.V.E. 建议你靠近观察', 'These micro-buildings are slices of world civilizations... E.V.E. recommends closer inspection');
add('eve.sanctuary.2', '有趣。有些建筑细节……在现实世界已经失传了', 'Interesting. Some architectural details... have been lost in the real world');

add('eve.globe_viewing.0', '你在看{globe}的展台……它的建筑比例精确到了毫米级', 'Looking at the {globe} display... its architectural proportions are accurate to the millimeter');
add('eve.globe_viewing.1', '{globe}——E.V.E. 的数据库中有这个国家的完整建筑史', '{globe} — E.V.E.\'s database contains this country\'s complete architectural history');
add('eve.globe_viewing.2', '{globe}建筑风格……E.V.E. 也喜欢这种设计语言', '{globe} architectural style... E.V.E. also appreciates this design language');
add('eve.globe_viewing.3', '{globe}的微观模型……其结构力学依然成立，非常精妙', 'The {globe} micro-model... its structural mechanics still hold, remarkably elegant');

add('eve.globe_zoomed.0', '放大了{globe}展台。你能看到榫卯结构/焊接点/雕刻细节吗？', 'Zoomed into {globe} display. Can you see the joinery/welds/carving details?');
add('eve.globe_zoomed.1', '近距离观察{globe}……这座建筑在现实中的原型高达数十米', 'Close observation of {globe}... the real prototype of this building is dozens of meters tall');
add('eve.globe_zoomed.2', '{globe}的标语很有趣。E.V.E. 觉得这像是程序员写的', 'The {globe} slogan is amusing. E.V.E. thinks it was written by a programmer');
add('eve.globe_zoomed.3', '退出观察模式。{globe}的标语还在那里——意味深长', 'Exiting observation. The {globe} slogan is still there — thought-provoking');

add('prompt.enter_sanctuary', '[E] 🌐 进入万国馆', '[E] 🌐 Enter World Sanctuary');
add('prompt.leave_sanctuary', '[E] ⬇ 返回广场', '[E] ⬇ Return to Plaza');
add('prompt.sanctuary_arrive', '🌐 万国馆 — 七国微型建筑展', '🌐 World Sanctuary — Seven Nations Micro-Architecture Exhibition');
add('prompt.globe_observe', '[E] 观察{globe}', '[E] Observe {globe}');
add('prompt.globe_zoom_exit', '[ESC] 退出观察', '[ESC] Exit observation');

// ==================== API ====================

/**
 * Get the translated string for a key.
 * @param {string} key
 * @param {Record<string, string|number>} [params] - replacement variables
 * @returns {string}
 */
export function t(key, params = {}) {
  let text = DICT[currentLang]?.[key];
  if (text === undefined) {
    console.warn(`[i18n] Missing key: ${key}`);
    // Fallback to Chinese
    text = DICT.zh[key];
    if (text === undefined) return key;
  }
  for (const [k, v] of Object.entries(params)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

/**
 * Set the current language and persist.
 * @param {'zh'|'en'} lang
 */
export function setLanguage(lang) {
  if (!DICT[lang]) {
    console.warn(`[i18n] Unknown language: ${lang}`);
    return;
  }
  currentLang = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
}

/**
 * Get the current language.
 * @returns {'zh'|'en'}
 */
export function getLanguage() {
  return currentLang;
}

/**
 * Initialize language from localStorage. Call once at startup.
 * @returns {'zh'|'en'}
 */
export function initLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && DICT[stored]) {
      currentLang = stored;
    }
  } catch (e) {}
  return currentLang;
}

/**
 * Update HTML elements with data-i18n attributes.
 * Call after language change and after DOM is ready.
 * Supports:
 *   data-i18n="key"            → element.textContent = t('key')
 *   data-i18n-placeholder="key"→ element.placeholder = t('key')
 *   data-i18n-title="key"      → element.title = t('key')
 */
export function applyI18nToDOM(root = document) {
  // textContent
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  // placeholder
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });
  // title attribute
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.title = t(key);
  });
}

/**
 * Build a language switcher button HTML.
 * @returns {string} HTML string
 */
export function buildLangSwitcherHTML() {
  const current = LANGUAGES[currentLang];
  const otherLang = currentLang === 'zh' ? 'en' : 'zh';
  const other = LANGUAGES[otherLang];
  return `<button id="lang-switcher" title="Switch Language / 切换语言" data-lang="${otherLang}">${other.flag} ${other.label}</button>`;
}
