/* Neon Vault — Pong vs CPU */
(function () {
  'use strict';
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var matchEl = document.getElementById('match');
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
  var PADDLE_W = 10, PADDLE_H = 64, PADDLE_SPEED = 340, CPU_SPEED = 235;
  var WIN_SCORE = 7;

  var player, cpu, ball, playerScore, cpuScore, score, state, rafId, lastTime, serveTimer;
  /* state: 'serve' | 'playing' | 'paused' | 'over' */

  function resetMatch() {
    player = { x: 18, y: H / 2 - PADDLE_H / 2, vy: 0 };
    cpu = { x: W - 18 - PADDLE_W, y: H / 2 - PADDLE_H / 2 };
    playerScore = 0; cpuScore = 0; score = 0;
    matchEl.textContent = '0 : 0';
    scoreEl.textContent = '0';
    pauseBtn.textContent = 'PAUSE';
    serveBall(1);
    showOverlay('PONG', 'First to 7. The machine does not blink.', 'PRESS SERVE', 'SERVE', true);
  }
  function serveBall(direction) {
    var angle = (Math.random() * 0.7 - 0.35);
    var speed = 300;
    ball = { x: W / 2, y: H / 2, r: 6, vx: Math.cos(angle) * speed * direction, vy: Math.sin(angle) * speed, speed: speed };
    state = 'serve';
    serveTimer = 0;
  }
  function showOverlay(title, sub, scoreText, btnText, cyan) {
    overlayTitle.textContent = title;
    overlayTitle.classList.toggle('overlay-title--cyan', cyan !== false);
    overlaySub.textContent = sub;
    overlayScore.textContent = scoreText || '';
    overlayBtn.textContent = btnText;
    overlay.classList.add('is-visible');
  }
  function hideOverlay() { overlay.classList.remove('is-visible'); }
  function startPlay() {
    if (state === 'over') { resetMatch(); return; }
    state = 'playing';
    hideOverlay();
    NV.audio.play('laser');
  }
  function togglePause() {
    if (state !== 'playing' && state !== 'paused') return;
    if (state === 'paused') { state = 'playing'; hideOverlay(); pauseBtn.textContent = 'PAUSE'; return; }
    state = 'paused';
    pauseBtn.textContent = 'RESUME';
    showOverlay('PAUSED', 'Both paddles hold their breath.', 'YOU ' + playerScore + ' : ' + cpuScore + ' CPU', 'RESUME', true);
  }
  function pointScored(winner) {
    if (winner === 'player') {
      playerScore += 1;
      score += 100;
      NV.audio.play('coin');
    } else {
      cpuScore += 1;
      NV.audio.play('hurt');
    }
    scoreEl.textContent = String(score);
    matchEl.textContent = playerScore + ' : ' + cpuScore;
    if (playerScore >= WIN_SCORE || cpuScore >= WIN_SCORE) {
      endMatch(playerScore > cpuScore);
      return;
    }
    serveBall(winner === 'player' ? -1 : 1);
  }
  function endMatch(playerWon) {
    state = 'over';
    if (playerWon) { score += 250; scoreEl.textContent = String(score); }
    NV.audio.play(playerWon ? 'win' : 'over');
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    showOverlay(
      playerWon ? 'MATCH WON' : 'MATCH LOST',
      playerWon ? (isBest ? 'New vault record. The Serve-Bot is rethinking everything.' : 'The Serve-Bot demands a rematch.') : 'The Serve-Bot accepts your tribute.',
      'SCORE ' + score + '  ·  BEST ' + NV.best.get(),
      'REMATCH',
      playerWon
    );
  }

  var keys = { up: false, down: false };
  document.addEventListener('keydown', function (e) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { keys.up = true; e.preventDefault(); }
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') { keys.down = true; e.preventDefault(); }
    else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); startPlay(); }
    else if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); }
    else if (e.code === 'KeyR') { e.preventDefault(); resetMatch(); }
  });
  document.addEventListener('keyup', function (e) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
  });

  /* touch: drag anywhere on canvas to move paddle */
  function canvasY(clientY) {
    var rect = canvas.getBoundingClientRect();
    return (clientY - rect.top) * (H / rect.height);
  }
  var dragging = false;
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    if (e.pointerType === 'touch') e.preventDefault();
    movePlayerTo(canvasY(e.clientY));
  });
  canvas.addEventListener('pointermove', function (e) {
    if (dragging || e.pointerType === 'mouse') movePlayerTo(canvasY(e.clientY));
  });
  window.addEventListener('pointerup', function () { dragging = false; });
  function movePlayerTo(y) {
    player.y = clamp(y - PADDLE_H / 2, 0, H - PADDLE_H);
  }
  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

  document.querySelectorAll('[data-act]').forEach(function (btn) {
    var act = btn.dataset.act;
    var set = function (value) { return function (e) { e.preventDefault(); if (act === 'up') keys.up = value; else keys.down = value; }; };
    btn.addEventListener('pointerdown', set(true));
    btn.addEventListener('pointerup', set(false));
    btn.addEventListener('pointercancel', set(false));
    btn.addEventListener('pointerleave', set(false));
  });

  function update(dt) {
    if (state !== 'playing' && state !== 'serve') return;
    if (keys.up) player.y = clamp(player.y - PADDLE_SPEED * dt, 0, H - PADDLE_H);
    if (keys.down) player.y = clamp(player.y + PADDLE_SPEED * dt, 0, H - PADDLE_H);

    if (state === 'serve') {
      ball.x = W / 2; ball.y = H / 2;
      return;
    }

    /* CPU AI: track ball with lag + capped speed */
    var target = ball.y - PADDLE_H / 2 + Math.sin(performance.now() / 640) * 6;
    var diff = target - cpu.y;
    var step = clamp(diff, -CPU_SPEED * dt, CPU_SPEED * dt);
    cpu.y = clamp(cpu.y + step, 0, H - PADDLE_H);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); NV.audio.play('tick'); }
    else if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); NV.audio.play('tick'); }

    /* paddle collisions */
    if (ball.vx < 0 && ball.x - ball.r <= player.x + PADDLE_W && ball.x - ball.r >= player.x - 12 && ball.y + ball.r >= player.y && ball.y - ball.r <= player.y + PADDLE_H) {
      bounceOff(player, 1);
    } else if (ball.vx > 0 && ball.x + ball.r >= cpu.x && ball.x + ball.r <= cpu.x + PADDLE_W + 12 && ball.y + ball.r >= cpu.y && ball.y - ball.r <= cpu.y + PADDLE_H) {
      bounceOff(cpu, -1);
    }

    if (ball.x < -30) pointScored('cpu');
    else if (ball.x > W + 30) pointScored('player');
  }
  function bounceOff(paddle, direction) {
    var rel = (ball.y - (paddle.y + PADDLE_H / 2)) / (PADDLE_H / 2);
    rel = clamp(rel, -1, 1);
    ball.speed = Math.min(640, ball.speed + 22);
    var angle = rel * (Math.PI / 3.4);
    ball.vx = Math.cos(angle) * ball.speed * direction;
    ball.vy = Math.sin(angle) * ball.speed;
    ball.x = direction === 1 ? paddle.x + PADDLE_W + ball.r + 0.5 : paddle.x - ball.r - 0.5;
    NV.audio.play('blip');
  }

  function draw() {
    ctx.fillStyle = '#070512';
    ctx.fillRect(0, 0, W, H);
    /* center dashed line */
    ctx.strokeStyle = 'rgba(145,140,184,0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 12]);
    ctx.beginPath(); ctx.moveTo(W / 2, 10); ctx.lineTo(W / 2, H - 10); ctx.stroke();
    ctx.setLineDash([]);
    /* paddles */
    ctx.save();
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#00e5ff';
    roundRect(player.x, player.y, PADDLE_W, PADDLE_H, 5); ctx.fill();
    ctx.shadowColor = '#ff2ea6';
    ctx.fillStyle = '#ff2ea6';
    roundRect(cpu.x, cpu.y, PADDLE_W, PADDLE_H, 5); ctx.fill();
    ctx.restore();
    /* ball */
    ctx.save();
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);
    ctx.restore();
    /* scores on the field */
    ctx.fillStyle = 'rgba(236,234,255,0.24)';
    ctx.font = "700 44px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(String(playerScore), W / 2 - 70, 58);
    ctx.fillText(String(cpuScore), W / 2 + 70, 58);
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

  function loop(time) {
    rafId = requestAnimationFrame(loop);
    if (!lastTime) lastTime = time;
    var dt = Math.min(0.033, (time - lastTime) / 1000);
    lastTime = time;
    update(dt);
    draw();
  }

  pauseBtn.addEventListener('click', togglePause);
  restartBtn.addEventListener('click', function () { NV.audio.play('select'); resetMatch(); });
  overlayBtn.addEventListener('click', startPlay);

  resetMatch();
  rafId = requestAnimationFrame(loop);
})();
