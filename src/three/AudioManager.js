import * as THREE from 'three';
import { AUDIO_REGISTRY, getAudioById, getPlaylistTrackIds } from '../data/audioRegistry.js';

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

  /** @param {string} id */
  playSFX(id) {
    const entry = getAudioById(id);
    if (!entry) return;
    const buffer = this.buffers.get(id);
    const vol = entry.volume ?? 0.5;
    if (buffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      source.connect(gain);
      gain.connect(this.listener.gain);
      source.start();
      source.onended = () => { source.disconnect(); gain.disconnect(); };
    } else {
      this._playSyntheticSFX(id, vol);
    }
  }

  /**
   * Generate synthetic 8-bit/retro sounds via Web Audio API.
   * Covers all 4 SFX types — no external files needed.
   */
  _playSyntheticSFX(id, vol) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.value = vol;
    masterGain.connect(this.listener.gain);

    switch (id) {
      case 'sfx_step': {
        const bufSize = Math.floor(ctx.sampleRate * 0.06);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          const t = i / bufSize;
          data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 12) * 0.5;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        src.connect(filter);
        filter.connect(masterGain);
        src.start(now);
        src.onended = () => { src.disconnect(); filter.disconnect(); masterGain.disconnect(); };
        break;
      }
      case 'sfx_coin': {
        const osc1 = ctx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.linearRampToValueAtTime(1320, now + 0.06);
        const g1 = ctx.createGain();
        g1.gain.setValueAtTime(vol * 0.35, now);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(g1);
        g1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.16);
        osc1.onended = () => { osc1.disconnect(); g1.disconnect(); masterGain.disconnect(); };
        break;
      }
      case 'sfx_drink': {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(180, now + 0.25);
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol * 0.4, now);
        g.gain.setValueAtTime(vol * 0.4, now + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 12;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 40;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + 0.36);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.36);
        osc.onended = () => {
          osc.disconnect(); g.disconnect(); lfo.disconnect(); lfoGain.disconnect(); masterGain.disconnect();
        };
        break;
      }
      case 'sfx_shard': {
        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.value = 1600;
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 2400;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol * 0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc1.connect(g);
        osc2.connect(g);
        g.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.46);
        osc2.start(now);
        osc2.stop(now + 0.46);
        osc1.onended = () => {
          osc1.disconnect(); osc2.disconnect(); g.disconnect(); masterGain.disconnect();
        };
        break;
      }
      default:
        masterGain.disconnect();
        break;
    }
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
