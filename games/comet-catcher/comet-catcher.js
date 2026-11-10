/* Neon Vault ORIGINAL — Comet Catcher. Pilot the VAULT-9 scoop, survive the storm. */
(function () {
  'use strict';
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var shieldEl = document.getElementById('shield');
  var stormEl = document.getElementById('storm');
  var pauseBtn = document.getElementById('pauseBtn');
  var restartBtn = document.getElementById('restartBtn');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlaySub = document.getElementById('overlaySub');
  var overlayScore = document.getElementById('overlayScore');
  var overlayBtn = document.getElementById('overlayBtn');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);
  NV.renderBest(bestEl);

  var W = canvas.width, H = canvas.height;
  var SHIP_W = 56, SHIP_H = 22;

  var ship, objects, particles, stars;
  var score, shield, stormLevel, elapsed, spawnAcc, spawnInterval, state, rafId, lastTime, shakeTime;
  /* state: 'ready' | 'playing' | 'paused' | 'over' */

  function seedStars() {
    stars = [];
    for (var i = 0; i < 80; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H, size: Math.random() < 0.75 ? 1.4 : 2.4, a: 0.2 + Math.random() * 0.7, drift: 12 + Math.random() * 26 });
    }
  }
  function reset() {
    ship = { x: W / 2 - SHIP_W / 2, y: H - 34, w: SHIP_W, h: SHIP_H };
    objects = []; particles = [];
    score = 0; shield = 3; stormLevel = 1; elapsed = 0; spawnAcc = 0; spawnInterval = 0.85; shakeTime = 0;
    seedStars();
    scoreEl.textContent = '0'; shieldEl.textContent = '3'; stormEl.textContent = '1';
    hideOverlay();
    pauseBtn.textContent = 'PAUSE';
    state = 'ready';
    showOverlay('COMET CATCHER', 'Catch comets (+10) and solar stars (+50). Meteors breach your shield (−1). Three shields. One storm.', 'PRESS LAUNCH', 'LAUNCH', true);
  }
  function showOverlay(title, sub, scoreText, btnText, cyan) {
    overlayTitle.textContent = title;
    overlayTitle.classList.toggle('overlay-title--cyan', !!cyan);
    overlaySub.textContent = sub;
    overlayScore.textContent = scoreText || '';
    overlayBtn.textContent = btnText;
    overlay.classList.add('is-visible');
  }
  function hideOverlay() { overlay.classList.remove('is-visible'); }
  function startGame() {
    if (state === 'over') { reset(); return; }
    state = 'playing';
    hideOverlay();
    NV.audio.play('laser');
  }
  function togglePause() {
    if (state !== 'playing' && state !== 'paused') return;
    if (state === 'paused') { state = 'playing'; hideOverlay(); pauseBtn.textContent = 'PAUSE'; return; }
    state = 'paused';
    pauseBtn.textContent = 'RESUME';
    showOverlay('PAUSED', 'Drifting through dead silence.', 'SCORE ' + score, 'RESUME', true);
  }
  function gameOver() {
    state = 'over';
    shakeTime = 0;
    NV.audio.play('over');
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    showOverlay('HULL BREACHED', isBest ? 'New vault record. The void sends regards.' : 'The VAULT-9 spins into the dark.', 'SCORE ' + score + '  ·  BEST ' + NV.best.get(), 'FLY AGAIN', false);
  }
  function spawnParticles(x, y, color, count) {
    for (var i = 0; i < (count || 12); i++) {
      var a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 140;
      particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0.5 + Math.random() * 0.5, color: color, size: 1.6 + Math.random() * 2.6 });
    }
  }
  function spawnObject() {
    var roll = Math.random();
    var type = roll < 0.60 ? 'comet' : roll < 0.86 ? 'meteor' : 'star';
    var speed = 120 + stormLevel * 32 + Math.random() * 60;
    objects.push({
      type: type,
      x: 20 + Math.random() * (W - 40),
      y: -30,
      vx: (Math.random() - 0.5) * 46,
      vy: speed,
      r: type === 'meteor' ? 11 + Math.random() * 5 : type === 'star' ? 8 : 9,
      spin: Math.random() * Math.PI * 2,
      spinRate: (Math.random() - 0.5) * 3
    });
  }

  var keys = { left: false, right: false };
  document.addEventListener('keydown', function (e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = true; e.preventDefault(); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; e.preventDefault(); }
    else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (state === 'ready' || state === 'over') startGame(); }
    else if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); }
    else if (e.code === 'KeyR') { e.preventDefault(); reset(); }
  });
  document.addEventListener('keyup', function (e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  });

  function canvasX(clientX) {
    var rect = canvas.getBoundingClientRect();
    return (clientX - rect.left) * (W / rect.width);
  }
  var dragging = false;
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    if (e.pointerType === 'touch') e.preventDefault();
    ship.x = clamp(canvasX(e.clientX) - ship.w / 2, 0, W - ship.w);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (dragging || e.pointerType === 'mouse') ship.x = clamp(canvasX(e.clientX) - ship.w / 2, 0, W - ship.w);
  });
  window.addEventListener('pointerup', function () { dragging = false; });
  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

  document.querySelectorAll('[data-act]').forEach(function (btn) {
    var act = btn.dataset.act;
    var on = function (e) { e.preventDefault(); if (act === 'left') keys.left = true; else keys.right = true; };
    var off = function (e) { e.preventDefault(); if (act === 'left') keys.left = false; else keys.right = false; };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('pointerleave', off);
  });

  function update(dt) {
    /* starfield drifts even on menus */
    stars.forEach(function (s) {
      s.y += s.drift * dt;
      if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
    });
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.life -= dt;
      if (pt.life <= 0) { particles.splice(p, 1); continue; }
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    }
    shakeTime = Math.max(0, shakeTime - dt);
    if (state !== 'playing') return;

    elapsed += dt;
    var newStorm = Math.min(6, 1 + Math.floor(elapsed / 12));
    if (newStorm !== stormLevel) {
      stormLevel = newStorm;
      stormEl.textContent = String(stormLevel);
      spawnInterval = Math.max(0.3, 0.85 - (stormLevel - 1) * 0.11);
      NV.audio.play('level');
      spawnParticles(W / 2, 40, '#b26bff', 18);
    }

    /* ship */
    var speed = 350;
    if (keys.left) ship.x = clamp(ship.x - speed * dt, 0, W - ship.w);
    if (keys.right) ship.x = clamp(ship.x + speed * dt, 0, W - ship.w);

    /* spawning */
    spawnAcc += dt;
    while (spawnAcc >= spawnInterval) {
      spawnAcc -= spawnInterval;
      spawnObject();
    }

    /* falling objects */
    for (var i = objects.length - 1; i >= 0; i--) {
      var o = objects[i];
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.spin += o.spinRate * dt;
      if (o.x < o.r || o.x > W - o.r) o.vx = -o.vx;

      /* catch test against scoop opening */
      var inScoopX = o.x > ship.x - 4 && o.x < ship.x + ship.w + 4;
      var atScoopY = o.y + o.r >= ship.y && o.y - o.r <= ship.y + 10;
      if (inScoopX && atScoopY) {
        if (o.type === 'comet') {
          score += 10; NV.audio.play('coin');
          spawnParticles(o.x, ship.y, '#00e5ff', 10);
        } else if (o.type === 'star') {
          score += 50; NV.audio.play('good');
          spawnParticles(o.x, ship.y, '#ffd23f', 16);
        } else {
          shield -= 1; shieldEl.textContent = String(shield);
          shakeTime = 0.4; NV.audio.play('hurt');
          spawnParticles(o.x, ship.y, '#ff4d5e', 16);
        }
        scoreEl.textContent = String(score);
        objects.splice(i, 1);
        if (shield <= 0) { gameOver(); return; }
        continue;
      }
      if (o.y - o.r > H + 20) objects.splice(i, 1);
    }
  }

  function drawComet(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(0,229,255,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    var tail = 3;
    for (var t = 0; t < tail; t++) {
      ctx.beginPath();
      ctx.moveTo(-o.vx * 0.02 * (t + 1) * 0.6, -o.r - 4 - t * 7);
      ctx.lineTo(-o.vx * 0.02 * (t + 1) * 0.6 + (Math.random() - 0.5) * 2, -o.r - 16 - t * 9);
      ctx.stroke();
    }
    ctx.fillStyle = '#a5f3ff';
    ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-2, -2, o.r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawMeteor(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.spin);
    ctx.shadowColor = '#ff4d5e'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff4d5e';
    ctx.beginPath();
    var spikes = 7;
    for (var i = 0; i < spikes; i++) {
      var angle = (i / spikes) * Math.PI * 2;
      var rad = i % 2 === 0 ? o.r : o.r * 0.62;
      var x = Math.cos(angle) * rad, y = Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a1020';
    ctx.beginPath(); ctx.arc(-2, 1, o.r * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3.5, -3, o.r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawStar(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.spin);
    ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      var rad = i % 2 === 0 ? o.r : o.r * 0.4;
      var x = Math.cos(angle) * rad, y = Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawShip() {
    var x = ship.x, y = ship.y;
    ctx.save();
    ctx.shadowColor = '#ff2ea6'; ctx.shadowBlur = 14;
    /* hull */
    var grad = ctx.createLinearGradient(x, 0, x + ship.w, 0);
    grad.addColorStop(0, '#ff2ea6');
    grad.addColorStop(0.5, '#ff8ac2');
    grad.addColorStop(1, '#ff2ea6');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, y + ship.h);
    ctx.lineTo(x + 6, y + 6);
    ctx.quadraticCurveTo(x + ship.w / 2, y - 6, x + ship.w - 6, y + 6);
    ctx.lineTo(x + ship.w, y + ship.h);
    ctx.closePath(); ctx.fill();
    /* cockpit */
    ctx.fillStyle = '#0d0920';
    ctx.beginPath(); ctx.ellipse(x + ship.w / 2, y + 11, 10, 5.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath(); ctx.ellipse(x + ship.w / 2, y + 10, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function draw() {
    ctx.save();
    if (shakeTime > 0) {
      ctx.translate((Math.random() - 0.5) * shakeTime * 22, (Math.random() - 0.5) * shakeTime * 22);
    }
    ctx.fillStyle = '#070512';
    ctx.fillRect(-20, -20, W + 40, H + 40);
    /* stars */
    stars.forEach(function (s) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#eceaff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1;
    /* nebula glow */
    var nebula = ctx.createRadialGradient(W * 0.75, H * 0.22, 10, W * 0.75, H * 0.22, 190);
    nebula.addColorStop(0, 'rgba(178,107,255,0.22)');
    nebula.addColorStop(1, 'rgba(178,107,255,0)');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, W, H);
    objects.forEach(function (o) {
      if (o.type === 'comet') drawComet(o);
      else if (o.type === 'meteor') drawMeteor(o);
      else drawStar(o);
    });
    particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life * 1.7);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    drawShip();
    ctx.restore();
  }

  function loop(time) {
    rafId = requestAnimationFrame(loop);
    if (!lastTime) lastTime = time;
    var dt = Math.min(0.033, (time - lastTime) / 1000);
    lastTime = time;
    update(dt);
    draw();
  }

  pauseBtn.addEventListener('click', togglePause);
  restartBtn.addEventListener('click', function () { NV.audio.play('select'); reset(); });
  overlayBtn.addEventListener('click', startGame);

  reset();
  rafId = requestAnimationFrame(loop);
})();
