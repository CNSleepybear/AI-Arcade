/**
 * Arcade Game SDK — shared bridge between AI Arcade hall and iframe games.
 *
 * Responsibilities:
 *   1. ESC key → postMessage('EXIT_GAME') to parent (capture phase)
 *   2. Parse character stats + language from URL query params
 *   3. Listen for ARCADE_INIT / LANG_SWITCH postMessage from parent
 *   4. Hide in-game language toggle buttons (unified lang control)
 *   5. Expose window.ArcadeSDK API for games to call
 *
 * Load this BEFORE all game scripts in index.html:
 *   <script src="../shared/arcade-game-sdk.js"></script>
 */

(function () {
  'use strict';

  // ==================== Character Context ====================

  /** @type {{ charId: string, atk: number, def: number, spd: number, crt: number, luck: number, lang: string, name?: string, title?: string, exp?: number, stats?: Object }|null} */
  var _ctx = null;
  /** @type {Array<function(Object):void>} */
  var _readyCallbacks = [];
  /** @type {Array<function(string):void>} */
  var _langChangeCallbacks = [];

  // Parse URL query params (injected by loadGame in src/main.js)
  function _parseURLParams() {
    var p = new URLSearchParams(window.location.search);
    return {
      charId: p.get('charId') || 'unknown',
      atk: parseInt(p.get('atk')) || 10,
      def: parseInt(p.get('def')) || 10,
      spd: parseInt(p.get('spd')) || 10,
      crt: parseInt(p.get('crt')) || 5,
      luck: parseInt(p.get('luck')) || 10,
      lang: p.get('lang') || 'zh',
    };
  }

  // Initialize context from URL params immediately
  _ctx = _parseURLParams();
  _ctx.stats = { atk: _ctx.atk, def: _ctx.def, spd: _ctx.spd, crt: _ctx.crt, luck: _ctx.luck };

  // Listen for messages from parent (arcade hall)
  window.addEventListener('message', function (e) {
    if (!e.data || !e.data.type) return;

    // ARCADE_INIT: enriches context with character name/title/exp
    if (e.data.type === 'ARCADE_INIT') {
      var c = e.data.character;
      if (c) {
        _ctx.charId = c.id || _ctx.charId;
        _ctx.charName = c.name || _ctx.charName;
        _ctx.title = c.title || _ctx.title;
        _ctx.exp = c.exp !== undefined ? c.exp : _ctx.exp;
        if (c.stats) {
          _ctx.atk = c.stats.atk || _ctx.atk;
          _ctx.def = c.stats.def || _ctx.def;
          _ctx.spd = c.stats.spd || _ctx.spd;
          _ctx.crt = c.stats.crt || _ctx.crt;
          _ctx.luck = c.stats.luck || _ctx.luck;
          _ctx.stats = { atk: _ctx.atk, def: _ctx.def, spd: _ctx.spd, crt: _ctx.crt, luck: _ctx.luck };
        }
      }
      if (e.data.lang) _ctx.lang = e.data.lang;
      _fireReady();
      return;
    }

    // LANG_SWITCH: arcade hall changed language → notify game
    if (e.data.type === 'LANG_SWITCH') {
      var newLang = e.data.lang;
      if (newLang && newLang !== _ctx.lang) {
        _ctx.lang = newLang;
        for (var i = 0; i < _langChangeCallbacks.length; i++) {
          try { _langChangeCallbacks[i](newLang); } catch (err) {
            console.error('[ArcadeSDK] onLangChange error:', err);
          }
        }
      }
      return;
    }
  });

  // ==================== Language Toggle Hiding ====================

  // Inject CSS to hide in-game language toggle buttons.
  // Language is controlled by the arcade hall via URL param.
  (function _hideLangToggles() {
    var style = document.createElement('style');
    style.id = 'arcade-hide-lang-toggles';
    style.textContent =
      '#lang-toggle { display: none !important; }\n' +
      '#lang-btn-global { display: none !important; }\n' +
      '#lang-btn { display: none !important; }\n' +
      '.lang-toggle-btn { display: none !important; }\n' +
      '[class*="lang-switch"] { display: none !important; }\n' +
      '[id*="lang-toggle"] { display: none !important; }\n' +
      '[id*="lang-btn"] { display: none !important; }\n' +
      '[id*="lang-switcher"] { display: none !important; }';
    document.head.appendChild(style);
  })();

  function _fireReady() {
    var cbs = _readyCallbacks;
    _readyCallbacks = [];
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](_ctx); } catch (err) { console.error('[ArcadeSDK] onReady error:', err); }
    }
  }

  // ==================== ESC Key Handling ====================

  // Capture phase: intercept ESC before the game or browser gets it.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var tag = (document.activeElement || {}).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (window.__arcade_esc_handled) {
      window.__arcade_esc_handled = false;
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ type: 'EXIT_GAME' }, '*');
  }, true);

  // ==================== Public API ====================

  window.ArcadeSDK = {
    /**
     * Register a callback that fires when character data is available.
     * @param {function(Object):void} cb
     */
    onReady: function (cb) {
      if (_ctx && _ctx.charId !== 'unknown') {
        setTimeout(function () { try { cb(_ctx); } catch (e) { console.error(e); } }, 0);
      } else {
        _readyCallbacks.push(cb);
        if (_ctx) {
          setTimeout(function () { try { cb(_ctx); } catch (e) { console.error(e); } }, 0);
        }
      }
    },

    /**
     * Register a callback for runtime language changes.
     * Fires immediately with the current language, then again on each LANG_SWITCH.
     * @param {function(string):void} cb — receives 'zh' or 'en'
     */
    onLangChange: function (cb) {
      _langChangeCallbacks.push(cb);
      // Fire immediately with current language
      setTimeout(function () { try { cb(_ctx.lang); } catch (e) { console.error(e); } }, 0);
    },

    /**
     * Report game over with score and optional stat growth.
     */
    reportGameOver: function (data) {
      if (!data || typeof data.score !== 'number') {
        console.warn('[ArcadeSDK] reportGameOver called without valid score');
        return;
      }
      window.parent.postMessage({
        type: 'GAME_OVER',
        payload: {
          score: data.score,
          statGrowth: data.statGrowth || {},
          newUnlocks: data.newUnlocks || [],
          gameId: data.gameId || ''
        }
      }, '*');
      console.log('[ArcadeSDK] Game over reported — score:', data.score);
    },

    /** Notify the arcade hall that the game has started. */
    reportGameStarted: function () {
      window.parent.postMessage({ type: 'GAME_STARTED' }, '*');
    },

    /** @returns {Object|null} current character context */
    getCharacter: function () { return _ctx; },

    /** @returns {string} current language ('zh' or 'en') */
    getLanguage: function () { return _ctx.lang || 'zh'; },

    /** Request save */
    saveSession: function (state) {
      window.parent.postMessage({ type: 'REQUEST_SAVE', payload: { state: state } }, '*');
    },

    /** Request load */
    requestLoad: function () {
      window.parent.postMessage({ type: 'REQUEST_LOAD' }, '*');
    },

    /** Exit game */
    exit: function () {
      window.parent.postMessage({ type: 'EXIT_GAME' }, '*');
    }
  };

  console.log('[ArcadeSDK] Initialized — charId:', _ctx.charId, 'lang:', _ctx.lang);
})();
