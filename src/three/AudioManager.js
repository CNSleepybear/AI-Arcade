import * as THREE from 'three';
import { AUDIO_REGISTRY, getAudioById, getPlaylistTrackIds } from '../data/audioRegistry.js';
import { SoundDesign } from './SoundDesign.js';

/**
 * AudioManager — loads, caches, and plays audio from AUDIO_REGISTRY config table.
 *
 * Supports playlist groups: multiple tracks per zone with nextTrack() / prevTrack().
 *
 * Usage:
 *   const audioMgr = new AudioManager(audioListener);
 *   await audioMgr.preloadAll();
 *   audioMgr.playPlaylist('tavern_playlist', worldPosition);  // start playlist at world pos
 *   audioMgr.nextTrack('tavern_playlist');                     // skip to next song
 *   audioMgr.prevTrack('tavern_playlist');                     // go back to previous
 */
export class AudioManager {
  /**
   * @param {THREE.AudioListener} listener — shared global AudioListener (attached to camera)
   */
  constructor(listener) {
    this.listener = listener;
    this.ctx = listener.context;
    this.sfx = new SoundDesign(this.ctx, listener.gain);

    /** @type {Map<string, AudioBuffer>} cache */
    this.buffers = new Map();

    /**
     * Active playlists keyed by playlist group name.
     * Each entry: { trackIds, currentIdx, positional, anchor, entry }
     * @type {Map<string, {trackIds:string[], currentIdx:number, positional:THREE.PositionalAudio, anchor:THREE.Object3D}>}
     */
    this._playlists = new Map();
  }

  // ==================== Preload ====================

  async preloadAll() {
    const seen = new Set();
    const promises = AUDIO_REGISTRY.map(async (entry) => {
      if (seen.has(entry.path)) return;
      seen.add(entry.path);
      try {
        const buffer = await this._loadBuffer(entry.path);
        this.buffers.set(entry.id, buffer);
        console.log(`[AudioManager] ✅ loaded "${entry.id}" (${entry.path})`);
      } catch (err) {
        console.warn(`[AudioManager] ⚠️ "${entry.id}" not found: ${entry.path} — skipping`);
      }
    });
    await Promise.all(promises);
    console.log(`[AudioManager] preload complete — ${this.buffers.size} buffers ready`);
  }

  async _loadBuffer(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return this.ctx.decodeAudioData(arrayBuf);
  }

  // ==================== Playlist (multi-track cycling) ====================

  /**
   * Start playing a playlist at a world position.
   * Replaces any currently playing playlist at the same group.
   * @param {string} group — e.g. 'tavern_playlist'
   * @param {THREE.Vector3|{x:number,y:number,z:number}} worldPos
   */
  playPlaylist(group, worldPos) {
    const trackIds = getPlaylistTrackIds(group);
    if (trackIds.length === 0) {
      console.warn(`[AudioManager] playlist "${group}" is empty`);
      return;
    }

    // Stop existing playlist at this group
    this.stopPlaylist(group);

    // Start first track
    this._playTrack(group, trackIds, 0, worldPos);
  }

  /**
   * Skip to next track in playlist.
   * @param {string} group
   */
  nextTrack(group) {
    const pl = this._playlists.get(group);
    if (!pl || pl.trackIds.length <= 1) return;

    const nextIdx = (pl.currentIdx + 1) % pl.trackIds.length;
    this._switchToTrack(group, pl, nextIdx);
  }

  /**
   * Go back to previous track in playlist.
   * @param {string} group
   */
  prevTrack(group) {
    const pl = this._playlists.get(group);
    if (!pl || pl.trackIds.length <= 1) return;

    const prevIdx = (pl.currentIdx - 1 + pl.trackIds.length) % pl.trackIds.length;
    this._switchToTrack(group, pl, prevIdx);
  }

  /**
   * Get current track info for HUD display.
   * @param {string} group
   * @returns {{title:string, index:number, total:number}|null}
   */
  /**
   * Get playback progress for a playlist group.
   * @param {string} group
   * @returns {{progress:number, currentTime:number, duration:number}|null}
   */
  getPlaybackProgress(group) {
    const pl = this._playlists.get(group);
    if (!pl || !pl.bufferDuration) return null;
    const elapsed = (Date.now() - pl.startedAt) / 1000;
    const duration = pl.bufferDuration;
    return {
      progress: (elapsed % duration) / duration,
      currentTime: elapsed % duration,
      duration,
    };
  }

  /** @returns {{title:string, index:number, total:number}|null} */
  getTrackInfo(group) {
    const pl = this._playlists.get(group);
    if (!pl) return null;
    const entry = getAudioById(pl.trackIds[pl.currentIdx]);
    return {
      title: entry?.title || pl.trackIds[pl.currentIdx],
      index: pl.currentIdx + 1,
      total: pl.trackIds.length,
    };
  }

  /** @private */
  _playTrack(group, trackIds, idx, worldPos) {
    const id = trackIds[idx];
    const entry = getAudioById(id);
    const buffer = this.buffers.get(id);

    if (!buffer) {
      console.warn(`[AudioManager] buffer not loaded for "${id}"`);
      return;
    }

    const positional = new THREE.PositionalAudio(this.listener);
    positional.setBuffer(buffer);
    positional.setRefDistance(entry?.refDistance ?? 3);
    positional.setMaxDistance(entry?.maxDistance ?? 12);
    positional.setRolloffFactor(entry?.rolloffFactor ?? 1);
    positional.setVolume(entry?.volume ?? 0.5);
    positional.setLoop(true);

    const anchor = new THREE.Object3D();
    anchor.position.copy(worldPos);
    anchor.add(positional);

    const bufferDuration = buffer.duration || 0;

    this._playlists.set(group, {
      trackIds,
      currentIdx: idx,
      positional,
      anchor,
      startedAt: Date.now(),
      bufferDuration,
    });

    positional.play();

    const title = entry?.title || id;
    console.log(`[AudioManager] 🎵 [${idx + 1}/${trackIds.length}] "${title}"`);
  }

  /** @private */
  _switchToTrack(group, pl, newIdx) {
    // Stop current
    try { pl.positional.stop(); pl.positional.disconnect(); } catch (e) {}
    if (pl.anchor?.parent) pl.anchor.parent.remove(pl.anchor);

    // Save world position
    const worldPos = pl.anchor.position.clone();

    // Play new
    this._playTrack(group, pl.trackIds, newIdx, worldPos);
  }

  /**
   * Stop and remove a playlist group.
   * @param {string} group
   */
  stopPlaylist(group) {
    const pl = this._playlists.get(group);
    if (!pl) return;
    try { pl.positional.stop(); pl.positional.disconnect(); } catch (e) {}
    if (pl.anchor?.parent) pl.anchor.parent.remove(pl.anchor);
    this._playlists.delete(group);
  }

  // ==================== Legacy single-track API (backwards compat) ====================

  /** @deprecated — use playPlaylist() instead */
  playMusic(id, worldPos) {
    const entry = getAudioById(id);
    if (!entry) return null;

    const plGroup = entry.playlist;
    if (plGroup) {
      this.playPlaylist(plGroup, worldPos);
      return this._playlists.get(plGroup)?.positional || null;
    }

    // Fallback: non-playlist single track
    const buffer = this.buffers.get(id);
    if (!buffer) return null;

    this.stop(id);

    const positional = new THREE.PositionalAudio(this.listener);
    positional.setBuffer(buffer);
    positional.setRefDistance(entry.refDistance ?? 3);
    positional.setMaxDistance(entry.maxDistance ?? 12);
    positional.setRolloffFactor(entry.rolloffFactor ?? 1);
    positional.setVolume(entry.volume ?? 0.5);
    positional.setLoop(entry.loop ?? true);

    const anchor = new THREE.Object3D();
    anchor.position.copy(worldPos);
    anchor.add(positional);

    this._playlists.set(`_single_${id}`, {
      trackIds: [id],
      currentIdx: 0,
      positional,
      anchor,
    });
    positional.play();
    return positional;
  }

  /** Play the unified procedural sound palette through the SFX volume bus. */
  playSFX(id, options = {}) {
    const entry = getAudioById(id);
    this.sfx.play(id, entry?.volume ?? 0.55, options);
  }

  /** @param {string} id */
  stop(id) {
    this.stopPlaylist(`_single_${id}`);
    // Also check if it's a playlist-track ID
    const entry = getAudioById(id);
    if (entry?.playlist) this.stopPlaylist(entry.playlist);
  }

  stopAll() {
    for (const group of this._playlists.keys()) this.stopPlaylist(group);
  }

  /** @param {string} group @returns {boolean} */
  isPlaying(group) {
    return this._playlists.has(group) || this._playlists.has(`_single_${group}`);
  }
}

export default AudioManager;
