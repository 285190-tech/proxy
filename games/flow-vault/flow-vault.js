/* Neon Vault ORIGINAL — Flow Vault. Motes, wind, and a finger in the storm. */
(function () {
  'use strict';
  var canvas = document.getElementById('flowCanvas');
  var ctx = canvas.getContext('2d');
  var moteCountEl = document.getElementById('moteCount');
  var paletteNameEl = document.getElementById('paletteName');
  var calmBtn = document.getElementById('calmBtn');
  var paletteBtn = document.getElementById('paletteBtn');
  var reseedBtn = document.getElementById('reseedBtn');
  var wipeBtn = document.getElementById('wipeBtn');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);

  var W = canvas.width, H = canvas.height;
  var MOTES = 1200;
  var PALETTES = [
    { name: 'CYBER', hues: [[304, 100, 62], [187, 100, 55]] },   /* magenta -> cyan */
    { name: 'AURORA', hues: [[140, 90, 60], [265, 95, 72]] },     /* lime -> violet */
    { name: 'EMBER', hues: [[28, 100, 60], [348, 95, 62]] }       /* amber -> red */
  ];
  var paletteIndex = 0, seed = Math.random() * 1000, calm = false;
  var particles = [];
  var pointer = { x: W / 2, y: H / 2, down: false };
  var lastTs = null;

  function spawn() {
    return { x: Math.random() * W, y: Math.random() * H, age: (Math.random() * 240) | 0 };
  }
  function resetParticles() {
    particles = [];
    for (var i = 0; i < MOTES; i++) particles.push(spawn());
    moteCountEl.textContent = String(MOTES);
  }
  function wipe() {
    ctx.fillStyle = '#0b0714';
    ctx.fillRect(0, 0, W, H);
  }
  /* layered trig pseudo-noise — smooth, curl-friendly, no tables */
  function flowAngle(x, y, t) {
    var s = seed;
    return Math.sin(x * 0.0085 + s + t * 0.11) * 1.9
         + Math.cos(y * 0.0105 + s * 1.7 - t * 0.07) * 1.6
         + Math.sin((x + y) * 0.005 + s * 0.6 + t * 0.05) * 0.9;
  }
  function moteColor(index, age) {
    var p = PALETTES[paletteIndex];
    var mix = (Math.sin(index * 0.7 + age * 0.02) + 1) / 2;
    var h = p.hues[0][0] + (p.hues[1][0] - p.hues[0][0]) * mix;
    var s = p.hues[0][1] + (p.hues[1][1] - p.hues[0][1]) * mix;
    var l = p.hues[0][2] + (p.hues[1][2] - p.hues[0][2]) * mix;
    return 'hsl(' + h.toFixed(1) + ' ' + s.toFixed(0) + '% ' + l.toFixed(0) + '%)';
  }
  var t = 0;
  function frame(ts) {
    if (lastTs === null) lastTs = ts;
    var dt = Math.min(40, ts - lastTs); lastTs = ts;
    t += dt / 1000;
    var speed = calm ? 0.55 : 1.35;
    /* translucent fade leaves silky trails */
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(11, 7, 20, ' + (calm ? '0.045' : '0.075') + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.6;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var angle = flowAngle(p.x, p.y, t);
      if (pointer.down) {
        var dx = p.x - pointer.x, dy = p.y - pointer.y;
        var dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        var influence = Math.max(0, 1 - dist / 150);
        angle += influence * 2.35; /* seize the wind — curl it around the finger */
      }
      var step = speed * (dt / 16.67);
      var nx = p.x + Math.cos(angle) * step, ny = p.y + Math.sin(angle) * step;
      ctx.strokeStyle = moteColor(i, p.age);
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      p.x = nx; p.y = ny; p.age++;
      if (p.x < 0 || p.x >= W || p.y < 0 || p.y >= H || p.age > 720) {
        particles[i] = spawn();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }
  function canvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  }
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    var p = canvasPos(e);
    pointer.x = p.x; pointer.y = p.y; pointer.down = true;
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!pointer.down) return;
    var p = canvasPos(e);
    pointer.x = p.x; pointer.y = p.y;
  });
  function release() { pointer.down = false; }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  calmBtn.addEventListener('click', function () { calm = !calm; calmBtn.textContent = calm ? 'CALM → STORM' : 'STORM → CALM'; NV.audio.play('select'); });
  paletteBtn.addEventListener('click', function () { paletteIndex = (paletteIndex + 1) % PALETTES.length; paletteNameEl.textContent = PALETTES[paletteIndex].name; NV.audio.play('level'); });
  reseedBtn.addEventListener('click', function () { seed = Math.random() * 1000; NV.audio.play('select'); });
  wipeBtn.addEventListener('click', function () { NV.audio.play('select'); wipe(); });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyR') { e.preventDefault(); seed = Math.random() * 1000; }
    else if (e.code === 'KeyC') { e.preventDefault(); wipe(); }
    else if (e.code === 'KeyP') { e.preventDefault(); paletteBtn.click(); }
  });
  resetParticles();
  wipe();
  requestAnimationFrame(frame);
})();
