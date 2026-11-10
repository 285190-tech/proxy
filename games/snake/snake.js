/* Neon Vault — Snake */
(function () {
  'use strict';
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
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

  var COLS = 20, ROWS = 20, CELL = 18;
  var snake, dir, pendingDir, food, score, alive, paused, stepMs, acc, lastTime, rafId;

  function reset() {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir = { x: 1, y: 0 }; pendingDir = dir;
    score = 0; alive = true; paused = false; acc = 0; lastTime = 0;
    stepMs = 135;
    spawnFood();
    scoreEl.textContent = '0';
    hideOverlay();
    pauseBtn.textContent = 'PAUSE';
  }

  function spawnFood() {
    while (true) {
      var p = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 };
      var onSnake = snake.some(function (s) { return s.x === p.x && s.y === p.y; });
      if (!onSnake) { food = p; return; }
    }
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

  function togglePause(force) {
    if (!alive) return;
    paused = typeof force === 'boolean' ? force : !paused;
    pauseBtn.textContent = paused ? 'RESUME' : 'PAUSE';
    if (paused) showOverlay('PAUSED', 'The serpent waits.', 'SCORE ' + score, 'RESUME', true);
    else hideOverlay();
  }

  function gameOver() {
    alive = false;
    NV.audio.play('over');
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    showOverlay('GAME OVER', isBest ? 'New vault record! The serpent remembers.' : 'The serpent remembers.', 'SCORE ' + score + '  ·  BEST ' + NV.best.get(), 'TRY AGAIN', false);
  }

  function tick() {
    dir = pendingDir;
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) return gameOver();
    for (var i = 0; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) return gameOver();
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = String(score);
      stepMs = Math.max(62, 135 - score * 0.9);
      NV.audio.play('coin');
      spawnFood();
    } else {
      snake.pop();
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    /* backdrop grid */
    ctx.fillStyle = '#070512';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(60,52,110,0.28)';
    ctx.lineWidth = 1;
    for (var g = CELL; g < canvas.width; g += CELL) {
      ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(canvas.width, g); ctx.stroke();
    }
    /* food orb */
    var pulse = 1 + Math.sin(time / 180) * 0.18;
    var fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
    ctx.save();
    ctx.shadowColor = '#ff2ea6'; ctx.shadowBlur = 16 * pulse;
    ctx.fillStyle = '#ff2ea6';
    ctx.beginPath(); ctx.arc(fx, fy, 6.2 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd7ee';
    ctx.beginPath(); ctx.arc(fx - 1.6, fy - 1.6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    /* snake body */
    for (var i = snake.length - 1; i >= 0; i--) {
      var s = snake[i];
      var t = i / snake.length;
      var shade = Math.round(255 - t * 140);
      ctx.save();
      ctx.shadowColor = '#a6ff3f'; ctx.shadowBlur = i === 0 ? 14 : 6;
      ctx.fillStyle = i === 0 ? '#c9ff7a' : 'rgb(' + Math.round(90 + t * 30) + ',' + shade + ',70)';
      roundRect(s.x * CELL + 1.5, s.y * CELL + 1.5, CELL - 3, CELL - 3, i === 0 ? 6 : 5);
      ctx.fill();
      ctx.restore();
    }
    /* head eyes */
    var h = snake[0];
    var cx = h.x * CELL + CELL / 2, cy = h.y * CELL + CELL / 2;
    var eyeOffset = dir.x !== 0 ? { x: 2.4 * dir.x, y: 3.6 } : { x: 3.6, y: 2.4 * dir.y };
    ctx.fillStyle = '#0b0714';
    ctx.beginPath(); ctx.arc(cx + (dir.x !== 0 ? eyeOffset.x : -eyeOffset.x), cy + (dir.x !== 0 ? -eyeOffset.y : eyeOffset.y * 0.9 - (dir.y > 0 ? 2.4 : 0) + (dir.y < 0 ? 2.4 : 0)), 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + (dir.x !== 0 ? eyeOffset.x : eyeOffset.x), cy + (dir.x !== 0 ? eyeOffset.y : eyeOffset.y * 0.9 - (dir.y > 0 ? 2.4 : 0) + (dir.y < 0 ? 2.4 : 0)), 1.7, 0, Math.PI * 2); ctx.fill();
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
    var delta = time - lastTime;
    lastTime = time;
    if (!paused && alive) {
      acc += delta;
      while (acc >= stepMs) { acc -= stepMs; tick(); if (!alive) break; }
    }
    draw(time);
  }

  function setDirection(x, y) {
    if (!alive) return;
    if (dir.x === -x && dir.y === -y) return; /* no reversing */
    if (pendingDir.x === x && pendingDir.y === y) return;
    if (x !== 0 && dir.x === x) return;
    if (y !== 0 && dir.y === y) return;
    pendingDir = { x: x, y: y };
  }

  var KEYMAP = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  document.addEventListener('keydown', function (e) {
    var move = KEYMAP[e.code];
    if (move) { e.preventDefault(); setDirection(move[0], move[1]); return; }
    if (e.code === 'KeyP') { e.preventDefault(); togglePause(); }
    else if (e.code === 'KeyR') { e.preventDefault(); reset(); }
  });

  document.querySelectorAll('[data-dir]').forEach(function (btn) {
    var d = btn.dataset.dir;
    var vec = d === 'up' ? [0, -1] : d === 'down' ? [0, 1] : d === 'left' ? [-1, 0] : [1, 0];
    btn.addEventListener('pointerdown', function (e) { e.preventDefault(); setDirection(vec[0], vec[1]); NV.audio.play('blip'); });
  });

  /* swipe steering */
  var touchStart = null;
  canvas.addEventListener('touchstart', function (e) { touchStart = e.touches[0]; }, { passive: true });
  canvas.addEventListener('touchend', function (e) {
    if (!touchStart) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStart.clientX, dy = t.clientY - touchStart.clientY;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0); else setDirection(0, dy > 0 ? 1 : -1);
    touchStart = null;
  }, { passive: true });

  pauseBtn.addEventListener('click', function () { togglePause(); });
  restartBtn.addEventListener('click', function () { NV.audio.play('select'); reset(); });
  overlayBtn.addEventListener('click', function () {
    if (!alive) { reset(); return; }
    togglePause();
  });

  reset();
  rafId = requestAnimationFrame(loop);
})();
