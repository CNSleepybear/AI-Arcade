/**
 * Audio Registry — data-driven audio configuration table.
 * Add, remove, or modify audio assets and playlists here without touching engine code.
 *
 * PLAYISTS maps a playlist group name → array of audio entry IDs.
 * AudioManager.playPlaylist() auto-cycles through tracks.
 *
 * Usage:
 *   Drop your AI-generated .mp3 files into public/audio/
 *   Add an entry below with id + path
 *   Add the id to the appropriate playlist in PLAYLISTS
 */
export const AUDIO_REGISTRY = [
  // ==================== Tavern Playlist (Positional 3D, above skeleton stage) ====================
  {
    id: 'tavern_track_01',
    path: '/audio/tavern_track_01.mp3',
    type: 'music',
    spatial: true,
    zone: 'tavern',
    playlist: 'tavern_playlist',
    loop: true,
    volume: 0.50,
    refDistance: 3,
    maxDistance: 12,
    rolloffFactor: 1.5,
    title: '深渊低语',           // display name for HUD
  },
  {
    id: 'tavern_track_02',
    path: '/audio/tavern_track_02.mp3',
    type: 'music',
    spatial: true,
    zone: 'tavern',
    playlist: 'tavern_playlist',
    loop: true,
    volume: 0.50,
    refDistance: 3,
    maxDistance: 12,
    rolloffFactor: 1.5,
    title: '铁锚挽歌',
  },
  {
    id: 'tavern_track_03',
    path: '/audio/tavern_track_03.mp3',
    type: 'music',
    spatial: true,
    zone: 'tavern',
    playlist: 'tavern_playlist',
    loop: true,
    volume: 0.50,
    refDistance: 3,
    maxDistance: 12,
    rolloffFactor: 1.5,
    title: '虚空爵士',
  },

  // ==================== Plaza Music ====================
  {
    id: 'plaza_track_01',
    path: '/audio/plaza_track_01.mp3',
    type: 'music',
    spatial: true,
    zone: 'plaza',
    playlist: 'plaza_playlist',
    loop: true,
    volume: 0.30,
    refDistance: 5,
    maxDistance: 16,
    rolloffFactor: 1.0,
    title: '广场共振',
  },

  // ==================== Arcade Music ====================
  {
    id: 'arcade_track_01',
    path: '/audio/arcade_track_01.mp3',
    type: 'music',
    spatial: true,
    zone: 'arcade',
    playlist: 'arcade_playlist',
    loop: true,
    volume: 0.40,
    refDistance: 4,
    maxDistance: 10,
    rolloffFactor: 1.2,
    title: '蜂巢脉冲',
  },

  // ==================== Global (2D) ====================
  {
    id: 'title_theme',
    path: '/audio/title_theme.mp3',
    type: 'music',
    spatial: false,
    zone: 'global',
    loop: true,
    volume: 0.60,
    title: '标题画面',
  },

  // ==================== SFX (Non-spatial / 2D / one-shot) ====================
  { id: 'sfx_coin',  path: '/audio/sfx_coin.mp3',  type: 'sfx', spatial: false, loop: false, volume: 0.5 },
  { id: 'sfx_step',  path: '/audio/sfx_step.mp3',  type: 'sfx', spatial: false, loop: false, volume: 0.2 },
  { id: 'sfx_drink', path: '/audio/sfx_drink.mp3', type: 'sfx', spatial: false, loop: false, volume: 0.45 },
  { id: 'sfx_shard', path: '/audio/sfx_shard.mp3', type: 'sfx', spatial: false, loop: false, volume: 0.4 },

  // ==================== Ambient Loops (Spatial, continuous) ====================
  {
    id: 'ambient_tavern',
    path: '/audio/ambient_tavern.mp3',
    type: 'ambient', spatial: true, zone: 'tavern', playlist: 'ambient_tavern',
    loop: true, volume: 0.15, refDistance: 4, maxDistance: 14, rolloffFactor: 1.5,
    title: '酒馆氛围',
  },
  {
    id: 'ambient_arcade',
    path: '/audio/ambient_arcade.mp3',
    type: 'ambient', spatial: true, zone: 'arcade', playlist: 'ambient_arcade',
    loop: true, volume: 0.12, refDistance: 5, maxDistance: 16, rolloffFactor: 1.2,
    title: '街机厅氛围',
  },
  {
    id: 'ambient_plaza',
    path: '/audio/ambient_plaza.mp3',
    type: 'ambient', spatial: true, zone: 'plaza', playlist: 'ambient_plaza',
    loop: true, volume: 0.10, refDistance: 6, maxDistance: 18, rolloffFactor: 1.0,
    title: '广场氛围',
  },
];

// ==================== Playlists ====================
// Each playlist is an ordered array of audio entry IDs.
// AudioManager cycles through them with nextTrack() / prevTrack().
export const PLAYLISTS = {
  tavern_playlist:  ['tavern_track_01', 'tavern_track_02', 'tavern_track_03'],
  plaza_playlist:   ['plaza_track_01'],
  arcade_playlist:  ['arcade_track_01'],
  ambient_tavern:   ['ambient_tavern'],
  ambient_arcade:   ['ambient_arcade'],
  ambient_plaza:    ['ambient_plaza'],
};

/**
 * Given a playlist group name, return its ordered track IDs.
 * @param {string} group — e.g. 'tavern_playlist'
 * @returns {string[]}
 */
export function getPlaylistTrackIds(group) {
  return PLAYLISTS[group] || [];
}

// ==================== Lookups ====================

/** @param {string} id @returns {object|undefined} */
export function getAudioById(id) {
  return AUDIO_REGISTRY.find(a => a.id === id);
}

/** @param {'tavern'|'plaza'|'arcade'|'global'} zone @returns {object[]} */
export function getAudioByZone(zone) {
  return AUDIO_REGISTRY.filter(a => a.zone === zone);
}

/** @returns {object[]} */
export function getSpatialMusic() {
  return AUDIO_REGISTRY.filter(a => a.type === 'music' && a.spatial);
}
