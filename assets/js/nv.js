/* Neon Vault — shared helpers: best scores, recently played, chrome wiring. */
(function () {
  'use strict';
  window.NV = window.NV || {};

  var RECENT_KEY = 'nv.recent';
  var BEST_PREFIX = 'nv.best.';

  function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function safeSet(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignore */ } }

  NV.slug = (document.body && document.body.dataset.game) || 'unknown';

  NV.best = {
    get: function (slug) {
      var raw = parseInt(safeGet(BEST_PREFIX + (slug || NV.slug)) || '0', 10);
      return isNaN(raw) ? 0 : raw;
    },
    save: function (score, slug) {
      slug = slug || NV.slug;
      var current = NV.best.get(slug);
      var value = Math.max(0, Math.floor(Number(score) || 0));
      if (value > current) { safeSet(BEST_PREFIX + slug, String(value)); return true; }
      return false;
    }
  };

  NV.recent = {
    list: function () {
      try {
        var parsed = JSON.parse(safeGet(RECENT_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) { return []; }
    },
    push: function (slug) {
      var list = NV.recent.list().filter(function (s) { return s !== slug; });
      list.unshift(slug);
      safeSet(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
    }
  };

  /* Wires the shared game-page chrome: mute button state + label sync. */
  NV.setupMuteButton = function (button) {
    if (!button || !NV.audio) return;
    function sync() {
      var muted = NV.audio.isMuted();
      button.setAttribute('aria-pressed', muted ? 'true' : 'false');
      button.classList.toggle('is-muted', muted);
      var on = button.querySelector('.icon-sound-on');
      var off = button.querySelector('.icon-sound-off');
      if (on && off) { on.hidden = muted; off.hidden = !muted; }
    }
    button.addEventListener('click', function () {
      NV.audio.toggle();
      if (!NV.audio.isMuted()) NV.audio.play('select');
      sync();
    });
    sync();
  };

  /* Standard best-score readout element updater. */
  NV.renderBest = function (element, slug) {
    if (element) { element.textContent = String(NV.best.get(slug)); }
  };
})();
