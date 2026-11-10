/* Neon Vault — Breakout */
(function () {
  'use strict';
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var livesEl = document.getElementById('lives');
  var waveEl = document.getElementById('wave');
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
  var BRICK_COLORS = ['#ff2ea6', '#ff4d5e', '#ffc247', '#a6ff3f', '#00e5ff'];
  var COLS = 8, ROWS = 5, BW = 48, BH = 16, GAP = 6;
  var OFFSET_X = (W - (COLS * BW + (COLS - 1) * GAP)) / 2, OFFSET_Y = 52;

  var paddle, ball, bricks, particles, score, lives, wave, state, rafId, lastTime;
  /* state: 'ready' | 'playing' | 'paused' | 'over' */

  function buildBricks() {
    bricks = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        /* tougher bottom rows worth more, tinted by row */
        var hp = r < 1 ? 2 : 1;
        bricks.push({ x: OFFSET_X + c * (BW + GAP), y: OFFSET_Y + r * (BH + GAP), w: BW, h: BH, color: BRICK_COLORS[r], hp: hp, maxHp: hp });
      }
    }
  }
  function resetBall() {
    ball = { x: paddle.x + paddle.w / 2, y: paddle.y - 9, r: 6, vx: 0, vy: 0, speed: 250 + (wave - 1) * 40 };
    state = 'ready';
  }
  function reset() {
    paddle = { x: W / 2 - 44, y: H - 26, w: 88, h: 12, speed: 520 };
    score = 0; lives = 3; wave = 1; particles = [];
    buildBricks();
    resetBall();
    scoreEl.textContent = '0'; livesEl.textContent = '3'; waveEl.textContent = '1';
    hideOverlay();
    pauseBtn.textContent = 'PAUSE';
    showOverlay('READY?', 'Move the paddle, launch the ball.', 'SPACE / TAP TO LAUNCH', 'LAUNCH', true);
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

  function launch() {
    if (state !== 'ready') return;
    var angle = -Math.PI / 2 + (Math.random() * 0.6 - 0.3);
    ball.vx = Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;
    state = 'playing';
    hideOverlay();
    NV.audio.play('laser');
  }
  function togglePause() {
    if (state !== 'playing' && state !== 'paused' && state !== 'ready') return;
    if (state === 'paused') { state = ball.vx === 0 ? 'ready' : 'playing'; hideOverlay(); pauseBtn.textContent = 'PAUSE'; return; }
    state = 'paused';
    pauseBtn.textContent = 'RESUME';
    showOverlay('PAUSED', 'The wall waits, unimpressed.', 'SCORE ' + score, 'RESUME', true);
  }
  function gameOver() {
    state = 'over';
    NV.audio.play('over');
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    showOverlay('GAME OVER', isBest ? 'New vault record. Certified brick demolitionist.' : 'The wall remains. Humanity watches.', 'SCORE ' + score + '  ·  BEST ' + NV.best.get(), 'TRY AGAIN', false);
  }
  function nextWave() {
    wave += 1;
    waveEl.textContent = String(wave);
    buildBricks();
    resetBall();
    NV.audio.play('win');
    showOverlay('WAVE ' + wave, 'The wall rebuilds itself — meaner.', 'SCORE ' + score, 'LAUNCH', true);
  }
  function spawnParticles(x, y, color) {
    for (var i = 0; i < 12; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 40 + Math.random() * 130;
      particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.6 + Math.random() * 0.4, color: color, size: 2 + Math.random() * 3 });
    }
  }

  var keys = { left: false, right: false };
  document.addEventListener('keydown', function (e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = true; e.preventDefault(); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; e.preventDefault(); }
    else if (e.code === 'Space') { e.preventDefault(); if (state === 'ready') launch(); else if (state === 'over') reset(); }
    else if (e.code === 'KeyP') { e.preventDefault(); togglePause(); }
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
  canvas.addEventListener('mousemove', function (e) {
    paddle.x = clamp(canvasX(e.clientX) - paddle.w / 2, 0, W - paddle.w);
  });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    var t = e.touches[0];
    paddle.x = clamp(canvasX(t.clientX) - paddle.w / 2, 0, W - paddle.w);
  }, { passive: false });
  canvas.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    paddle.x = clamp(canvasX(t.clientX) - paddle.w / 2, 0, W - paddle.w);
    if (state === 'ready') launch();
  }, { passive: true });
  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

  document.querySelectorAll('[data-act]').forEach(function (btn) {
    var act = btn.dataset.act;
    var setDir = function (value) { return function () { if (act === 'left') keys.left = value; else keys.right = value; }; };
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (act === 'launch') { if (state === 'ready') launch(); else if (state === 'over') reset(); }
      else setDir(true)();
    });
    btn.addEventListener('pointerup', setDir(false));
    btn.addEventListener('pointercancel', setDir(false));
    btn.addEventListener('pointerleave', setDir(false));
  });

  function update(dt) {
    if (keys.left) paddle.x = clamp(paddle.x - paddle.speed * dt, 0, W - paddle.w);
    if (keys.right) paddle.x = clamp(paddle.x + paddle.speed * dt, 0, W - paddle.w);

    if (state === 'ready') {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - 9;
      return;
    }
    if (state !== 'playing') return;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); NV.audio.play('tick'); }
    else if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); NV.audio.play('tick'); }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); NV.audio.play('tick'); }

    /* paddle bounce with english based on hit position */
    if (ball.vy > 0 && ball.y + ball.r >= paddle.y && ball.y + ball.r <= paddle.y + paddle.h + 10 && ball.x >= paddle.x - ball.r && ball.x <= paddle.x + paddle.w + ball.r) {
      var rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); /* -1..1 */
      var speed = Math.min(560, Math.hypot(ball.vx, ball.vy) * 1.02 + 6);
      var angle = -Math.PI / 2 + rel * 0.95;
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.y = paddle.y - ball.r - 0.5;
      NV.audio.play('blip');
    }

    /* brick collisions */
    for (var i = bricks.length - 1; i >= 0; i--) {
      var b = bricks[i];
      var nx = clamp(ball.x, b.x, b.x + b.w);
      var ny = clamp(ball.y, b.y, b.y + b.h);
      var dx = ball.x - nx, dy = ball.y - ny;
      if (dx * dx + dy * dy <= ball.r * ball.r) {
        b.hp -= 1;
        if (b.hp <= 0) {
          bricks.splice(i, 1);
          score += 50;
          spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.color);
          NV.audio.play('explode');
        } else {
          score += 10;
          NV.audio.play('hit');
        }
        scoreEl.textContent = String(score);
        /* reflect on the axis of least penetration */
        var overlapX = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
        var overlapY = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
        if (overlapX < overlapY) ball.vx = (ball.x < b.x + b.w / 2 ? -1 : 1) * Math.abs(ball.vx);
        else ball.vy = (ball.y < b.y + b.h / 2 ? -1 : 1) * Math.abs(ball.vy);
        break;
      }
    }

    if (ball.y - ball.r > H) {
      lives -= 1;
      livesEl.textContent = String(lives);
      if (lives <= 0) { gameOver(); return; }
      NV.audio.play('hurt');
      resetBall();
      showOverlay('BALL LOST', lives + (lives === 1 ? ' ball' : ' balls') + ' remaining.', 'SCORE ' + score, 'LAUNCH', true);
    }

    if (bricks.length === 0) nextWave();

    /* particles */
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.life -= dt;
      if (pt.life <= 0) { particles.splice(p, 1); continue; }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 260 * dt;
    }
  }

  function draw() {
    ctx.fillStyle = '#070512';
    ctx.fillRect(0, 0, W, H);
    /* bricks */
    bricks.forEach(function (b) {
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = b.hp < b.maxHp ? shade(b.color, -0.45) : b.color;
      roundRect(b.x, b.y, b.w, b.h, 4);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x + 3, b.y + 2, b.w - 6, 3);
      ctx.restore();
    });
    /* particles */
    particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    /* paddle */
    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 14;
    var grad = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.w, 0);
    grad.addColorStop(0, '#00e5ff');
    grad.addColorStop(0.5, '#a5f3ff');
    grad.addColorStop(1, '#00e5ff');
    ctx.fillStyle = grad;
    roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
    ctx.fill();
    ctx.restore();
    /* ball */
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function shade(hex, amount) {
    var n = parseInt(hex.slice(1), 16);
    var r = clamp(Math.round(((n >> 16) & 255) * (1 + amount)), 0, 255);
    var g = clamp(Math.round(((n >> 8) & 255) * (1 + amount)), 0, 255);
    var b = clamp(Math.round((n & 255) * (1 + amount)), 0, 255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
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
  overlayBtn.addEventListener('click', function () {
    if (state === 'over') { reset(); return; }
    if (state === 'paused') { togglePause(); return; }
    launch();
  });

  reset();
  rafId = requestAnimationFrame(loop);
})();
