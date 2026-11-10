/* Neon Vault — synthesized SFX engine (Web Audio API, no assets). */
(function () {
  'use strict';
  window.NV = window.NV || {};

  var STORAGE_KEY = 'nv.muted';
  var muted = false;
  try { muted = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { /* private mode */ }

  var ctx = null;
  function ensure() {
    if (!ctx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        ctx = AC ? new AC() : null;
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended' && ctx.resume) { ctx.resume(); }
    return ctx;
  }

  function tone(freq, dur, type, vol, delay, slideTo) {
    var c = ensure(); if (!c) return;
    dur = dur || 0.08; type = type || 'square'; vol = vol == null ? 0.05 : vol; delay = delay || 0;
    var t0 = c.currentTime + delay;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, delay) {
    var c = ensure(); if (!c) return;
    dur = dur || 0.15; vol = vol == null ? 0.08 : vol; delay = delay || 0;
    var t0 = c.currentTime + delay;
    var len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) { data[i] = (Math.random() * 2 - 1) * (1 - i / len); }
    var src = c.createBufferSource(); src.buffer = buf;
    var gain = c.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    var filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900;
    src.connect(filter); filter.connect(gain); gain.connect(c.destination);
    src.start(t0);
  }

  var EFFECTS = {
    coin:    function () { tone(988, 0.07, 'square', 0.05); tone(1319, 0.18, 'square', 0.05, 0.07); },
    blip:    function () { tone(660, 0.05, 'square', 0.04); },
    select:  function () { tone(880, 0.04, 'triangle', 0.05); },
    hit:     function () { tone(220, 0.09, 'sawtooth', 0.06, 0, 140); },
    explode: function () { noise(0.22, 0.09); tone(180, 0.25, 'sawtooth', 0.06, 0, 60); },
    laser:   function () { tone(1200, 0.09, 'square', 0.035, 0, 500); },
    hurt:    function () { tone(160, 0.18, 'sawtooth', 0.07, 0, 80); noise(0.1, 0.05, 0.02); },
    over:    function () { tone(392, 0.15, 'square', 0.06); tone(311, 0.15, 'square', 0.06, 0.14); tone(233, 0.3, 'square', 0.06, 0.28); },
    win:     function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.16, 'square', 0.055, i * 0.13); }); },
    level:   function () { [440, 660, 880].forEach(function (f, i) { tone(f, 0.12, 'triangle', 0.06, i * 0.1); }); },
    whack:   function () { tone(500, 0.05, 'square', 0.06); noise(0.05, 0.05); },
    flip:    function () { tone(740, 0.04, 'triangle', 0.045); },
    merge:   function () { tone(587, 0.07, 'sine', 0.06); tone(880, 0.12, 'sine', 0.06, 0.06); },
    tick:    function () { tone(1000, 0.03, 'square', 0.035); },
    good:    function () { tone(1047, 0.1, 'sine', 0.06); tone(1568, 0.22, 'sine', 0.06, 0.09); }
  };

  NV.audio = {
    play: function (name) {
      if (muted) return;
      var fx = EFFECTS[name];
      if (fx) { try { fx(); } catch (e) { /* audio unavailable */ } }
    },
    isMuted: function () { return muted; },
    setMuted: function (value) {
      muted = !!value;
      try { localStorage.setItem(STORAGE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
      return muted;
    },
    toggle: function () { return NV.audio.setMuted(!muted); },
    unlock: function () { ensure(); }
  };
})();
