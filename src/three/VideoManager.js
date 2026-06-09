import * as THREE from 'three';

/**
 * VideoManager — Jukebox-style MP4 audio player with cover art.
 *
 * Plays ONE track at a time. Auto-advances to next when current finishes.
 * MusicPlayer controls prev/next/pause via public methods.
 *
 * Usage:
 *   import { getVideoManager } from './VideoManager.js';
 *   const vm = getVideoManager();
 *   vm.initAll();
 *   vm.startJukebox();       // call after user interaction
 *   vm.nextTrack();           // skip
 *   vm.getCover('tavern');    // data: URL
 */

const BASE = import.meta.env.BASE_URL || './';

const TRACKS = [
  { key: 'tavern',   path: BASE + 'videos/Three_AM_at_the_Counter.mp4',     title: '凌晨三点的吧台',     zone: 'tavern' },
  { key: 'arcade',   path: BASE + 'videos/Seven_Miles_Past_the_Border.mp4', title: '越境七里',            zone: 'arcade' },
  { key: 'depths',   path: BASE + 'videos/Stone_Altar_Pulse.mp4',           title: '石坛脉动',            zone: 'depths' },
  { key: 'depths2',  path: BASE + 'videos/The_Weight_of_Stone.mp4',         title: '石之重',              zone: 'depths' },
  { key: 'depths3',  path: BASE + 'videos/Where_the_Planets_Sleep.mp4',     title: '群星沉眠处',          zone: 'depths' },
  { key: 'rooftop',  path: BASE + 'videos/Ascent_Of_The_Sun_Kings.mp4',     title: '日王升腾',            zone: 'rooftop' },
  { key: 'plaza',    path: BASE + 'videos/The_Key_Under_the_Mat.mp4',       title: '门垫下的钥匙',        zone: 'plaza' },
];

export class VideoManager {
  constructor() {
    /** @type {Map<string, {video: HTMLVideoElement, coverUrl: string|null, track: object}>} */
    this._videos = new Map();
    this._started = false;
    this._currentKey = null;
    /** @type {string[]} shuffle order */
    this._order = [];
    this._orderIdx = -1;
    this._onChange = null;  // callback(key) when track changes
  }

  /** Create all video elements, extract covers */
  initAll() {
    for (const track of TRACKS) {
      const video = document.createElement('video');
      video.src = track.path;
      video.loop = false;           // NO loop — we handle auto-advance
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.style.display = 'none';
      video.volume = 0.7;

      // Auto-advance when track ends
      video.addEventListener('ended', () => {
        if (this._currentKey === track.key) {
          this.nextTrack();
        }
      });

      document.body.appendChild(video);

      const entry = { video, coverUrl: null, track };
      this._videos.set(track.key, entry);
      this._extractCover(track.key, entry);
    }
  }

  /** Extract cover art from first video frame */
  _extractCover(key, entry) {
    const { video } = entry;
    const handler = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        if (canvas.width > 0 && canvas.height > 0) {
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          entry.coverUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch (e) { /* ignore */ }
      video.removeEventListener('loadeddata', handler);
    };
    video.addEventListener('loadeddata', handler);
    if (video.readyState >= 2) handler();
  }

  /** Start jukebox: pick first random track and play */
  startJukebox() {
    if (this._started) return;
    this._started = true;

    // Shuffle track order
    this._order = TRACKS.map(t => t.key);
    this._shuffle(this._order);
    this._orderIdx = 0;

    // Play first track
    this._playCurrent();
  }

  /** Pause all, play track at current index */
  _playCurrent() {
    if (this._orderIdx < 0 || this._orderIdx >= this._order.length) {
      this._orderIdx = 0;
      this._shuffle(this._order);
    }

    const key = this._order[this._orderIdx];
    const entry = this._videos.get(key);
    if (!entry) return;

    // Pause ALL videos
    for (const [, { video }] of this._videos) {
      video.pause();
      video.muted = true;
      video.currentTime = 0;
    }

    // Play selected
    entry.video.muted = false;
    entry.video.currentTime = 0;
    entry.video.play().catch(() => {
      // Retry on next gesture
      const retry = () => {
        entry.video.muted = false;
        entry.video.play().catch(() => {});
        document.removeEventListener('click', retry);
      };
      document.addEventListener('click', retry, { once: true });
    });

    this._currentKey = key;
    if (this._onChange) this._onChange(key);
  }

  /** Next track */
  nextTrack() {
    if (!this._started) return;
    this._orderIdx = (this._orderIdx + 1) % this._order.length;
    this._playCurrent();
  }

  /** Previous track */
  prevTrack() {
    if (!this._started) return;
    this._orderIdx = (this._orderIdx - 1 + this._order.length) % this._order.length;
    this._playCurrent();
  }

  /** Toggle play/pause current track */
  togglePlay() {
    if (!this._currentKey) return;
    const entry = this._videos.get(this._currentKey);
    if (!entry) return;
    if (entry.video.paused) {
      entry.video.muted = false;
      entry.video.play().catch(() => {});
    } else {
      entry.video.pause();
    }
  }

  /** Whether anything is currently playing */
  isPlaying() {
    if (!this._currentKey) return false;
    const entry = this._videos.get(this._currentKey);
    return entry ? !entry.video.paused : false;
  }

  /** Get current track key */
  getCurrentKey() {
    return this._currentKey;
  }

  /** Set callback for when track changes */
  onChange(fn) {
    this._onChange = fn;
  }

  /** Get cover data URL */
  getCover(key) {
    return this._videos.get(key)?.coverUrl || null;
  }

  /** Get track metadata */
  getTrack(key) {
    return this._videos.get(key)?.track || null;
  }

  /** Get all tracks */
  getTracks() {
    return TRACKS;
  }

  /** Fisher-Yates shuffle */
  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

/** Singleton */
let _instance = null;
export function getVideoManager() {
  if (!_instance) _instance = new VideoManager();
  return _instance;
}
