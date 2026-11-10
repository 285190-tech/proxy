/* Neon Vault ORIGINAL — DVD Bounce. The screensaver your childhood deserved. */
(function () {
  'use strict';
  var canvas = document.getElementById('dvdCanvas');
  var ctx = canvas.getContext('2d');
  var wallEl = document.getElementById('wallHits');
  var cornerEl = document.getElementById('cornerHits');
  var bestEl = document.getElementById('best');
  var calmBtn = document.getElementById('calmBtn');
  var restartBtn = document.getElementById('restartBtn');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);
  NV.renderBest(bestEl);

  var W = canvas.width, H = canvas.height;
  var LOGO_W = 168, LOGO_H = 96;
  var x = W / 2 - LOGO_W / 2, y = H / 2 - LOGO_H / 2;
  var SPEED = 3.1, vx = SPEED, vy = SPEED * 0.62;
  var hue = 315, wallHits = 0, cornerHits = 0, calm = false;
  var sparks = [];
  var flash = 0;

  function reset() {
    x = W / 2 - LOGO_W / 2; y = H / 2 - LOGO_H / 2;
    var angle = (Math.random() * 0.7 + 0.35) * (Math.random() < 0.5 ? 1 : -1);
    vx = Math.cos(angle) * SPEED; vy = Math.sin(angle) * SPEED;
    if (Math.abs(vy) < 1.4) vy = 1.4 * (vy < 0 ? -1 : 1);
    hue = (Math.random() * 360) | 0;
    wallHits = 0; sparks = []; flash = 0;
    wallEl.textContent = '0';
    draw();
  }
  function celebrateCorner() {
    cornerHits++;
    cornerEl.textContent = String(cornerHits);
    NV.best.save(cornerHits);
    NV.renderBest(bestEl);
    NV.audio.play('win');
    flash = 1;
    var corners = [[0, 0], [W, 0], [0, H], [W, H]];
    corners.forEach(function (c) {
      for (var i = 0; i < 26; i++) {
        var a = Math.atan2(H / 2 - c[1], W / 2 - c[0]) + (Math.random() - 0.5) * 1.5;
        var sp = 1.5 + Math.random() * 4.5;
        sparks.push({ x: c[0], y: c[1], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 900 + Math.random() * 500, max: 1400, hue: (hue + Math.random() * 120) | 0 });
      }
    });
  }
  function drawLogo() {
    ctx.save();
    ctx.translate(x + LOGO_W / 2, y + LOGO_H / 2);
    ctx.shadowColor = 'hsl(' + hue + ' 100% 65%)';
    ctx.shadowBlur = 26;
    /* rounded-rectangle lozenge */
    var r = 18;
    ctx.beginPath();
    ctx.moveTo(-LOGO_W / 2 + r, -LOGO_H / 2);
    ctx.arcTo(LOGO_W / 2, -LOGO_H / 2, LOGO_W / 2, LOGO_H / 2, r);
    ctx.arcTo(LOGO_W / 2, LOGO_H / 2, -LOGO_W / 2, LOGO_H / 2, r);
    ctx.arcTo(-LOGO_W / 2, LOGO_H / 2, -LOGO_W / 2, -LOGO_H / 2, r);
    ctx.arcTo(-LOGO_W / 2, -LOGO_H / 2, LOGO_W / 2, -LOGO_H / 2, r);
    ctx.closePath();
    ctx.fillStyle = 'hsl(' + hue + ' 90% 58%)';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b0714';
    ctx.font = '700 30px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEON', 0, -12);
    ctx.font = '700 30px "Space Grotesk", sans-serif';
    ctx.fillText('VAULT', 0, 20);
    ctx.restore();
  }
  function draw() {
    if (calm) { ctx.fillStyle = 'rgba(11, 7, 20, .16)'; ctx.fillRect(0, 0, W, H); }
    else { ctx.clearRect(0, 0, W, H); }
    if (!calm && sparks.length === 0 && flash <= 0) {
      /* crisp CRT backdrop with a whisper of scanlines */
      ctx.fillStyle = '#0d0a1c';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.018)';
      for (var sy = 0; sy < H; sy += 6) ctx.fillRect(0, sy, W, 2);
    }
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255,' + (flash * 0.35).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      flash = Math.max(0, flash - 0.04);
    }
    sparks.forEach(function (s) {
      s.x += s.vx; s.y += s.vy; s.vy += 0.02; s.life -= 16;
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = 'hsl(' + s.hue + ' 100% 68%)';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    });
    sparks = sparks.filter(function (s) { return s.life > 0; });
    drawLogo();
  }
  var lastTs = null;
  function frame(ts) {
    if (lastTs === null) lastTs = ts;
    var dt = Math.min(40, ts - lastTs); lastTs = ts;
    var k = dt / 16.67;
    x += vx * k; y += vy * k;
    var bounced = false, cornered = false;
    if (x <= 0) { x = 0; vx = Math.abs(vx); bounced = true; }
    else if (x + LOGO_W >= W) { x = W - LOGO_W; vx = -Math.abs(vx); bounced = true; }
    if (y <= 0) { y = 0; vy = Math.abs(vy); bounced = true; }
    else if (y + LOGO_H >= H) { y = H - LOGO_H; vy = -Math.abs(vy); bounced = true; }
    if (bounced) {
      var atLeft = x <= 0, atRight = x + LOGO_W >= W, atTop = y <= 0, atBottom = y + LOGO_H >= H;
      if ((atLeft || atRight) && (atTop || atBottom)) cornered = true;
      wallHits++;
      wallEl.textContent = String(wallHits);
      hue = (hue + 36 + Math.random() * 30) % 360;
      if (cornered) celebrateCorner(); else NV.audio.play('tick');
    }
    draw();
    requestAnimationFrame(frame);
  }
  canvas.addEventListener('pointerdown', function (e) {
    var rect = canvas.getBoundingClientRect();
    var cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    var cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (cx >= x && cx <= x + LOGO_W && cy >= y && cy <= y + LOGO_H) {
      vx *= 1.28; vy *= 1.28;
      hue = (hue + 25) % 360;
      NV.audio.play('hit');
    }
  });
  calmBtn.addEventListener('click', function () {
    calm = !calm;
    calmBtn.textContent = calm ? 'PARTY' : 'CALM';
    if (!calm) { ctx.fillStyle = '#0d0a1c'; ctx.fillRect(0, 0, W, H); }
    NV.audio.play('select');
  });
  restartBtn.addEventListener('click', function () { NV.audio.play('select'); reset(); });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyR') { e.preventDefault(); reset(); }
    else if (e.code === 'Space') { e.preventDefault(); calmBtn.click(); }
  });
  reset();
  requestAnimationFrame(frame);
})();
