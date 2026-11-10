/* Neon Vault ORIGINAL — Signal Pulse. One button. One beam. One beacon. */
(function () {
  'use strict';
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var comboEl = document.getElementById('combo');
  var strikesEl = document.getElementById('strikes');
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
  var CX = W / 2, CY = H / 2, RING_R = 128, RING_W = 20;

  var beam, target, rings, particles, flash;
  var score, combo, strikes, hits, phase;
  var state, rafId, lastTime, shakeTime;
  /* state: 'ready' | 'playing' | 'paused' | 'over' */

  function angleDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function relocateTarget() {
    /* place beacon at least 2 rad away from the beam */
    var center;
    do {
      center = Math.random() * Math.PI * 2;
    } while (Math.abs(angleDiff(center, beam.angle)) < 1.6);
    var arc = Math.max(0.5, 1.05 - (phase - 1) * 0.085); /* shrinks per phase */
    target = { center: center, arc: arc, patience: Math.max(3.4, 7.2 - (phase - 1) * 0.42), maxPatience: 0 };
    target.maxPatience = target.patience;
  }
  function reset() {
    beam = { angle: -Math.PI / 2, speed: 1.65 };
    rings = []; particles = []; flash = 0; shakeTime = 0;
    score = 0; combo = 0; strikes = 3; hits = 0; phase = 1;
    scoreEl.textContent = '0';
    comboEl.textContent = '×0';
    strikesEl.textContent = '●●●';
    state = 'ready';
    relocateTarget();
    hideOverlay();
    pauseBtn.textContent = 'PAUSE';
    showOverlay('SIGNAL PULSE', 'The beam sweeps. The beacon waits. Fire while the beam crosses the amber arc. Wild fire or an expired beacon costs a strike — three strikes, dead air.', 'PRESS OPEN CHANNEL', 'OPEN CHANNEL', true);
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
    NV.audio.play('level');
  }
  function togglePause() {
    if (state !== 'playing' && state !== 'paused') return;
    if (state === 'paused') { state = 'playing'; hideOverlay(); pauseBtn.textContent = 'PAUSE'; return; }
    state = 'paused';
    pauseBtn.textContent = 'RESUME';
    showOverlay('PAUSED', 'The beam holds its breath.', 'SCORE ' + score, 'RESUME', true);
  }
  function gameOver() {
    state = 'over';
    NV.audio.play('over');
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    showOverlay('DEAD AIR', isBest ? 'New vault record. The tower never heard silence like this.' : 'Three strikes. The channel goes quiet.', 'SCORE ' + score + '  ·  BEST ' + NV.best.get(), 'REOPEN CHANNEL', false);
  }
  function registerStrike(reason) {
    strikes -= 1;
    combo = 0;
    comboEl.textContent = '×0';
    strikesEl.textContent = '●'.repeat(Math.max(0, strikes)) + '○'.repeat(3 - Math.max(0, strikes));
    shakeTime = 0.35;
    flash = 0.4;
    NV.audio.play('hurt');
    spawnParticles(CX, CY, '#ff4d5e', 14);
    if (strikes <= 0) { gameOver(); return; }
    relocateTarget();
  }
  function spawnParticles(x, y, color, count) {
    for (var i = 0; i < (count || 14); i++) {
      var a = Math.random() * Math.PI * 2, s = 50 + Math.random() * 160;
      particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.45 + Math.random() * 0.45, color: color, size: 1.6 + Math.random() * 2.6 });
    }
  }
  function fire() {
    if (state !== 'playing') return;
    var diff = Math.abs(angleDiff(beam.angle, target.center));
    if (diff <= target.arc / 2) {
      /* hit! */
      combo = Math.min(8, combo + 1);
      hits += 1;
      var bullseye = diff <= target.arc / 6;
      var gained = 100 * combo + (bullseye ? 50 : 0);
      score += gained;
      scoreEl.textContent = String(score);
      comboEl.textContent = '×' + combo;
      if (score > NV.best.get()) bestEl.textContent = String(score);
      NV.audio.play(bullseye ? 'good' : 'coin');
      spawnParticles(CX + Math.cos(target.center) * RING_R, CY + Math.sin(target.center) * RING_R, '#ffc247', 16);
      rings.push({ r: RING_R - 14, maxR: RING_R + 34, alpha: 1, color: '#ffc247' });
      flash = 0.18;
      /* phase up every 5 hits: faster beam */
      if (hits % 5 === 0) {
        phase += 1;
        beam.speed = Math.min(3.6, beam.speed + 0.22);
        NV.audio.play('level');
      }
      relocateTarget();
    } else {
      registerStrike('wild');
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (state === 'ready' || state === 'over') startGame(); else fire();
    } else if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); }
    else if (e.code === 'KeyR') { e.preventDefault(); reset(); }
  });
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (state === 'ready' || state === 'over') { startGame(); return; }
    fire();
  });
  document.querySelectorAll('[data-act]').forEach(function (btn) {
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (state === 'ready' || state === 'over') { startGame(); return; }
      fire();
    });
  });

  function update(dt) {
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.life -= dt;
      if (pt.life <= 0) { particles.splice(p, 1); continue; }
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    }
    for (var r = rings.length - 1; r >= 0; r--) {
      var ring = rings[r];
      ring.r += 120 * dt;
      ring.alpha -= dt * 1.6;
      if (ring.alpha <= 0 || ring.r >= ring.maxR) rings.splice(r, 1);
    }
    shakeTime = Math.max(0, shakeTime - dt);
    flash = Math.max(0, flash - dt * 1.4);
    if (state !== 'playing') return;

    beam.angle = (beam.angle + beam.speed * dt) % (Math.PI * 2);
    target.patience -= dt;
    if (target.patience <= 0) {
      registerStrike('expired');
    }
  }

  function draw() {
    ctx.save();
    if (shakeTime > 0) {
      ctx.translate((Math.random() - 0.5) * shakeTime * 20, (Math.random() - 0.5) * shakeTime * 20);
    }
    ctx.fillStyle = '#070512';
    ctx.fillRect(-20, -20, W + 40, H + 40);

    /* backdrop glow */
    var bg = ctx.createRadialGradient(CX, CY, 20, CX, CY, W * 0.62);
    bg.addColorStop(0, 'rgba(178,107,255,0.10)');
    bg.addColorStop(1, 'rgba(178,107,255,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* faint radar rings */
    ctx.strokeStyle = 'rgba(60,52,110,0.5)';
    ctx.lineWidth = 1;
    [52, 88, 128, 168].forEach(function (radius) {
      ctx.beginPath(); ctx.arc(CX, CY, radius, 0, Math.PI * 2); ctx.stroke();
    });
    /* crosshair lines */
    ctx.beginPath(); ctx.moveTo(CX, 14); ctx.lineTo(CX, H - 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, CY); ctx.lineTo(W - 14, CY); ctx.stroke();

    /* the track ring */
    ctx.save();
    ctx.lineWidth = RING_W;
    ctx.strokeStyle = '#141026';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(CX, CY, RING_R, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    /* beacon arc (target) */
    var urgency = target ? target.patience / target.maxPatience : 1;
    var beaconColor = urgency > 0.5 ? '#ffc247' : urgency > 0.25 ? '#ff9f1c' : '#ff4d5e';
    if (target) {
      ctx.save();
      ctx.lineWidth = RING_W - 2;
      ctx.strokeStyle = beaconColor;
      ctx.shadowColor = beaconColor;
      ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(CX, CY, RING_R, target.center - target.arc / 2, target.center + target.arc / 2); ctx.stroke();
      /* bullseye sliver at the center of the arc */
      ctx.lineWidth = RING_W - 6;
      ctx.strokeStyle = '#fff3b0';
      ctx.beginPath(); ctx.arc(CX, CY, RING_R, target.center - target.arc / 6, target.center + target.arc / 6); ctx.stroke();
      ctx.restore();
      /* patience arc around the beacon */
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.arc(CX, CY, RING_R - RING_W / 2 - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * urgency); ctx.stroke();
      ctx.restore();
    }

    /* expanding hit rings */
    rings.forEach(function (ring) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ring.alpha);
      ctx.lineWidth = 4;
      ctx.strokeStyle = ring.color;
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(CX, CY, ring.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    });

    /* beam trail (fading wedge) */
    if (state === 'playing' || state === 'paused') {
      for (var t = 5; t >= 1; t--) {
        var past = beam.angle - beam.speed * 0.05 * t;
        ctx.save();
        ctx.globalAlpha = 0.07 * (6 - t);
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.arc(CX, CY, RING_R + 14, past - 0.09, past + 0.09);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      /* the beam itself */
      ctx.save();
      var grad = ctx.createLinearGradient(CX, CY, CX + Math.cos(beam.angle) * (RING_R + 14), CY + Math.sin(beam.angle) * (RING_R + 14));
      grad.addColorStop(0, 'rgba(0,229,255,0)');
      grad.addColorStop(0.25, 'rgba(0,229,255,0.65)');
      grad.addColorStop(1, '#00e5ff');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 5;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(beam.angle) * (RING_R + 14), CY + Math.sin(beam.angle) * (RING_R + 14)); ctx.stroke();
      ctx.fillStyle = '#dffbff';
      ctx.beginPath(); ctx.arc(CX + Math.cos(beam.angle) * (RING_R + 14), CY + Math.sin(beam.angle) * (RING_R + 14), 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    /* particles */
    particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life * 1.8);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;

    /* central core */
    ctx.save();
    var core = ctx.createRadialGradient(CX, CY, 2, CX, CY, 34);
    core.addColorStop(0, '#ff2ea6');
    core.addColorStop(0.55, '#a11a5e');
    core.addColorStop(1, 'rgba(161,26,94,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(CX, CY, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8ac2';
    ctx.shadowColor = '#ff2ea6'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(CX, CY, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(CX, CY, 5.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* hit flash */
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,194,71,' + (flash * 0.5) + ')';
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }
    ctx.restore();
  }

  function loop(time) {
    rafId = requestAnimationFrame(loop);
    if (!lastTime) lastTime = time;
    var dt = Math.min(0.05, (time - lastTime) / 1000);
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
