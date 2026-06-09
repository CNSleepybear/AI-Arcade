/**
 * MusicPlayer — in-game music player overlay.
 *
 * Reads from AudioManager playlists and audioRegistry metadata.
 * Toggle with Backslash key. Styled to match retro pixel aesthetic.
 *
 * Usage:
 *   import { MusicPlayer } from './ui/MusicPlayer.js';
 *   const player = new MusicPlayer(audioManager);
 *   player.toggle();   // or bind to key
 *   player.update(dt); // call in animation loop for progress bar
 */

import { getVideoManager } from '../three/VideoManager.js';

const ACTIVE_PLAYLIST = 'tavern_playlist'; // primary playlist to display

export class MusicPlayer {
  /**
   * @param {import('../three/AudioManager.js').AudioManager} audioManager
   */
  constructor(audioManager) {
    this._am = audioManager;
    this._visible = false;
    this._panel = null;
    this._buildDOM();
  }

  // ═══════════════════════════════════════════
  // DOM Construction
  // ═══════════════════════════════════════════

  _buildDOM() {
    // Inject styles once
    if (!document.getElementById('music-player-styles')) {
      const style = document.createElement('style');
      style.id = 'music-player-styles';
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        #music-player-panel {
          position:fixed; bottom:20px; right:20px; z-index:90;
          width:320px; background:rgba(10,10,20,0.94);
          border:2px solid #00f0ff; border-radius:6px;
          box-shadow:0 0 20px rgba(0,240,255,0.2),inset 0 0 10px rgba(0,240,255,0.03);
          font-family:'VT323',monospace; color:#e0e0e0;
          padding:14px 16px 12px; pointer-events:all;
          transition:opacity 0.25s,transform 0.25s;
          backdrop-filter:blur(6px);
        }
        #music-player-panel.hidden { display:none; }
        #mp-header {
          display:flex; justify-content:space-between; align-items:center;
          margin-bottom:10px; border-bottom:1px solid rgba(0,240,255,0.15); padding-bottom:8px;
        }
        #mp-title {
          font-size:18px; color:#00f0ff; text-shadow:0 0 8px #00f0ff; letter-spacing:2px;
        }
        #mp-close {
          background:transparent; border:1px solid #555; color:#888; font-family:inherit;
          font-size:14px; width:24px; height:24px; cursor:pointer; border-radius:3px;
          transition:all 0.2s;
        }
        #mp-close:hover { color:#fff; border-color:#00f0ff; }
        #mp-now-playing { font-size:13px; color:#8b5cf6; margin-bottom:4px; }
        #mp-track-name {
          font-size:20px; color:#00f0ff; text-shadow:0 0 6px #00f0ff;
          margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        #mp-track-artist { font-size:13px; color:#ff006e; margin-bottom:6px; }
        #mp-cover-art {
          width:100%; height:90px; background:#111; border-radius:4px;
          margin-bottom:8px; background-size:cover; background-position:center;
          border:1px solid rgba(0,240,255,0.15);
        }
        #mp-cover-art.has-cover { border-color:rgba(0,240,255,0.4); }
        #mp-progress-row {
          display:flex; justify-content:space-between; font-size:11px; color:#888; margin-bottom:3px;
        }
        #mp-progress-bar {
          width:100%; height:4px; background:#1a1a2e; border-radius:2px;
          cursor:pointer; margin-bottom:10px;
        }
        #mp-progress-fill {
          height:100%; width:0%; background:linear-gradient(90deg,#00f0ff,#8b5cf6);
          border-radius:2px; box-shadow:0 0 6px #00f0ff; transition:width 0.15s linear;
        }
        #mp-controls {
          display:flex; gap:8px; align-items:center;
        }
        .mp-btn {
          background:transparent; border:1px solid #00f0ff; color:#00f0ff;
          font-family:inherit; font-size:14px; padding:4px 12px; cursor:pointer;
          border-radius:3px; transition:all 0.2s; letter-spacing:1px;
        }
        .mp-btn:hover { background:#00f0ff; color:#0a0a0f; box-shadow:0 0 10px #00f0ff; }
        .mp-btn.active { background:#ff006e; border-color:#ff006e; color:#fff; box-shadow:0 0 10px #ff006e; }
        .mp-btn-play { font-size:16px; padding:6px 16px; }
        #mp-playlist {
          margin-top:8px; border-top:1px solid rgba(0,240,255,0.1); padding-top:6px;
          max-height:140px; overflow-y:auto; scrollbar-width:thin;
          scrollbar-color:rgba(0,240,255,0.2) transparent;
        }
        .mp-pl-item {
          display:flex; align-items:center; gap:8px; padding:5px 6px;
          cursor:pointer; font-size:13px; transition:all 0.2s;
          border-left:2px solid transparent;
        }
        .mp-pl-item:hover { background:rgba(0,240,255,0.05); }
        .mp-pl-item.active { background:rgba(0,240,255,0.08); border-left-color:#00f0ff; }
        .mp-pl-num { color:#8b5cf6; width:20px; text-align:right; }
        .mp-pl-title { flex:1; color:#ddd; }
        .mp-pl-item.active .mp-pl-title { color:#00f0ff; }
        .mp-pl-status { color:#00f0ff; font-size:11px; opacity:0; }
        .mp-pl-item.active .mp-pl-status { opacity:1; }
      `;
      document.head.appendChild(style);
    }

    // Panel
    this._panel = document.createElement('div');
    this._panel.id = 'music-player-panel';
    this._panel.classList.add('hidden');
    this._panel.innerHTML = `
      <div id="mp-header">
        <span id="mp-title">🎵 JUKEBOX</span>
        <button id="mp-close">✕</button>
      </div>
      <div id="mp-now-playing">NOW PLAYING</div>
      <div id="mp-track-name">—</div>
      <div id="mp-track-artist">—</div>
      <div id="mp-cover-art"></div>
      <div id="mp-progress-row">
        <span id="mp-current">0:00</span>
        <span id="mp-duration">0:00</span>
      </div>
      <div id="mp-progress-bar"><div id="mp-progress-fill"></div></div>
      <div id="mp-controls">
        <button class="mp-btn" id="mp-prev">◀◀</button>
        <button class="mp-btn mp-btn-play" id="mp-play">▶</button>
        <button class="mp-btn" id="mp-next">▶▶</button>
        <button class="mp-btn" id="mp-loop">↻</button>
      </div>
      <div id="mp-playlist"></div>
    `;
    document.getElementById('app').appendChild(this._panel);

    // Events
    document.getElementById('mp-close').addEventListener('click', () => this.hide());
    document.getElementById('mp-prev').addEventListener('click', () => this._prevTrack());
    document.getElementById('mp-next').addEventListener('click', () => this._nextTrack());
    document.getElementById('mp-play').addEventListener('click', () => this._togglePlay());
    document.getElementById('mp-loop').addEventListener('click', () => this._toggleLoop());

    // Progress bar click
    document.getElementById('mp-progress-bar').addEventListener('click', (e) => {
      // Seek not supported for positional audio, just visual
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Backslash' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (document.activeElement?.tagName === 'INPUT') return;
        e.preventDefault();
        this.toggle();
      }
    });

    this._loopActive = false;
    this._buildPlaylist();
    this._refreshCover();

    // Listen for jukebox track changes
    getVideoManager().onChange(() => this._onJukeboxChange());
  }

  // ═══════════════════════════════════════════
  // Playlist (VideoManager tracks only)
  // ═══════════════════════════════════════════

  _buildPlaylist() {
    const container = document.getElementById('mp-playlist');
    container.innerHTML = '';

    const tracks = getVideoManager().getTracks();
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      const item = document.createElement('div');
      item.className = 'mp-pl-item mp-pl-item-video';
      item.innerHTML = `
        <span class="mp-pl-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="mp-pl-title">🎬 ${t.title}</span>
        <span class="mp-pl-zone">${t.zone}</span>
      `;
      item.addEventListener('click', () => {
        this._selectVideoTrack(t.key);
      });
      container.appendChild(item);
    }
  }

  _highlightPlaylist() {
    const info = this._am.getTrackInfo(ACTIVE_PLAYLIST);
    const items = document.getElementById('mp-playlist').children;
    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle('active', info && i === info.index - 1);
    }
  }

  // ═══════════════════════════════════════════
  // Controls (VideoManager jukebox)
  // ═══════════════════════════════════════════

  _prevTrack() {
    getVideoManager().prevTrack();
    this._onJukeboxChange();
  }

  _nextTrack() {
    getVideoManager().nextTrack();
    this._onJukeboxChange();
  }

  _togglePlay() {
    const vm = getVideoManager();
    vm.togglePlay();
    const playing = vm.isPlaying();
    document.getElementById('mp-play').textContent = playing ? '❚❚' : '▶';
    document.getElementById('mp-play').classList.toggle('active', playing);
  }

  _toggleLoop() {
    this._loopActive = !this._loopActive;
    document.getElementById('mp-loop').classList.toggle('active', this._loopActive);
    // Loop is always true in positional audio — this is cosmetic
  }

  _refresh() {
    const info = this._am.getTrackInfo(ACTIVE_PLAYLIST);
    if (info) {
      document.getElementById('mp-track-name').textContent = info.title;
    }
    const entry = getAudioById(
      getPlaylistTrackIds(ACTIVE_PLAYLIST)[info ? info.index - 1 : 0]
    );
    document.getElementById('mp-track-artist').textContent = entry?.title || 'Abyss Arcade OST';
    this._highlightPlaylist();
  }

  // ═══════════════════════════════════════════
  // Visibility
  // ═══════════════════════════════════════════

  show() {
    if (this._visible) return;
    this._visible = true;
    this._panel.classList.remove('hidden');
    this._onJukeboxChange();
    document.getElementById('mp-play').textContent = getVideoManager().isPlaying() ? '❚❚' : '▶';
  }

  hide() {
    if (!this._visible) return;
    this._visible = false;
    this._panel.classList.add('hidden');
  }

  _selectVideoTrack(key) {
    const vm = getVideoManager();
    const track = vm.getTrack(key);
    if (!track) return;

    // Show track info
    document.getElementById('mp-track-name').textContent = track.title;
    document.getElementById('mp-track-artist').textContent = '📀 ' + track.zone;

    // Show cover
    this._showCover(key);

    // Highlight
    const items = document.getElementById('mp-playlist').querySelectorAll('.mp-pl-item-video');
    items.forEach(el => el.classList.remove('active'));
    // Find and highlight the clicked item
    const idx = vm.getTracks().findIndex(t => t.key === key);
    if (idx >= 0 && items[idx]) items[idx].classList.add('active');
  }

  _showCover(key) {
    const coverEl = document.getElementById('mp-cover-art');
    const coverUrl = getVideoManager().getCover(key);
    if (coverUrl) {
      coverEl.style.backgroundImage = `url(${coverUrl})`;
      coverEl.classList.add('has-cover');
    } else {
      coverEl.style.backgroundImage = '';
      coverEl.classList.remove('has-cover');
      // Retry after a short delay
      setTimeout(() => {
        const retryUrl = getVideoManager().getCover(key);
        if (retryUrl) {
          coverEl.style.backgroundImage = `url(${retryUrl})`;
          coverEl.classList.add('has-cover');
        }
      }, 2000);
    }
  }

  _refreshCover() {
    // Try to show cover for first available track
    const tracks = getVideoManager().getTracks();
    if (tracks.length > 0) {
      this._showCover(tracks[0].key);
    }
  }

  /** Called when jukebox track changes (auto-advance or user skip) */
  _onJukeboxChange() {
    const vm = getVideoManager();
    const key = vm.getCurrentKey();
    if (!key) return;

    const track = vm.getTrack(key);
    document.getElementById('mp-track-name').textContent = track?.title || key;
    document.getElementById('mp-track-artist').textContent = '📀 ' + (track?.zone || '');
    document.getElementById('mp-play').textContent = vm.isPlaying() ? '❚❚' : '▶';
    document.getElementById('mp-play').classList.toggle('active', vm.isPlaying());
    this._showCover(key);
    this._highlightVideoItem(key);
  }

  _highlightVideoItem(key) {
    const items = document.getElementById('mp-playlist').querySelectorAll('.mp-pl-item-video');
    const tracks = getVideoManager().getTracks();
    const idx = tracks.findIndex(t => t.key === key);
    items.forEach((el, i) => el.classList.toggle('active', i === idx));
  }

  toggle() {
    if (this._visible) this.hide();
    else this.show();
  }

  // ═══════════════════════════════════════════
  // Update (call from animation loop)
  // ═══════════════════════════════════════════

  update(_dt) {
    if (!this._visible || this._paused) return;

    const prog = this._am.getPlaybackProgress(ACTIVE_PLAYLIST);
    if (prog) {
      document.getElementById('mp-progress-fill').style.width = (prog.progress * 100) + '%';
      document.getElementById('mp-current').textContent = this._fmt(prog.currentTime);
      document.getElementById('mp-duration').textContent = this._fmt(prog.duration);
    }
  }

  _fmt(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }
}

export default MusicPlayer;
