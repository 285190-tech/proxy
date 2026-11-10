/* Neon Vault — Space Invaders */
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
  var COLS = 8, ROWS = 4, CELL_W = 46, CELL_H = 36, INV_W = 26, INV_H = 18;
  var PLAYER_W = 34, PLAYER_H = 14;

  var player, invaders, dir, stepTimer, playerBullets, enemyBullets, bunkers, ufo, particles;
  var score, lives, wave, state, rafId, lastTime, fireCooldown, ufoTimer;
  /* state: 'ready' | 'playing' | 'paused' | 'over' */

  function buildWave() {
    invaders = [];
    var offsetX = (W - COLS * CELL_W) / 2 + (CELL_W - INV_W) / 2;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var points = r === 0 ? 40 : r < 3 ? 20 : 10;
        invaders.push({ col: c, row: r, x: offsetX + c * CELL_W, y: 56 + r * CELL_H, w: INV_W, h: INV_H, points: points, alive: true });
      }
    }
    dir = 1;
    stepTimer = 0;
  }
  function buildBunkers() {
    bunkers = [];
    var bunkerW = 44, block = 11;
    var positions = [56, 176, 296, 416];
    positions.forEach(function (cx) {
      for (var r = 0; r < 2; r++) {
        for (var c = 0; c < 4; c++) {
          /* arch: skip top-middle to look like a bunker */
          if (r === 0 && (c === 1 || c === 2)) continue;
          bunkers.push({ x: cx - bunkerW / 2 + c * block, y: 292 + r * block, w: block - 1, h: block - 1 });
        }
      }
    });
  }
  function reset() {
    player = { x: W / 2 - PLAYER_W / 2, y: H - 26, w: PLAYER_W, h: PLAYER_H };
    playerBullets = []; enemyBullets = []; particles = [];
    ufo = null; ufoTimer = 14 + Math.random() * 8;
    score = 0; lives = 3; wave = 1; fireCooldown = 0; state = 'ready';
    buildWave(); buildBunkers();
    scoreEl.textContent = '0'; livesEl.textContent = '3'; waveEl.textContent = '1';
    hideOverlay();
    pauseBtn.textContent = 'PAUSE';
    showOverlay('SPACE INVADERS', 'Hold the line. Three lives. One planet.', 'PRESS START', 'START', true);
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
    showOverlay('PAUSED', 'The swarm hovers, waiting.', 'SCORE ' + score, 'RESUME', true);
  }
  function gameOver(win) {
    state = 'over';
    NV.audio.play(win ? 'win' : 'over');
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    showOverlay(win ? 'EARTH SAVED' : 'GAME OVER', isBest ? 'New vault record.' : (win ? 'Every last invader, dust.' : 'The swarm slips through.'), 'SCORE ' + score + '  ·  BEST ' + NV.best.get(), 'PLAY AGAIN', !!win);
  }
  function spawnParticles(x, y, color, n) {
    for (var i = 0; i < (n || 10); i++) {
      var a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 120;
      particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.5, color: color, size: 1.5 + Math.random() * 2.5 });
    }
  }
  var keys = { left: false, right: false, fire: false };
  document.addEventListener('keydown', function (e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = true; e.preventDefault(); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; e.preventDefault(); }
    else if (e.code === 'Space') { e.preventDefault(); keys.fire = true; if (state === 'ready' || state === 'over') startGame(); }
    else if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); }
    else if (e.code === 'KeyR') { e.preventDefault(); reset(); }
  });
  document.addEventListener('keyup', function (e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    else if (e.code === 'Space') keys.fire = false;
  });

  function canvasX(clientX) {
    var rect = canvas.getBoundingClientRect();
    return (clientX - rect.left) * (W / rect.width);
  }
  var dragging = false;
  canvas.addEventListener('pointerdown', function (e) { dragging = true; player.x = clamp(canvasX(e.clientX) - player.w / 2, 0, W - player.w); });
  canvas.addEventListener('pointermove', function (e) { if (dragging || e.pointerType === 'mouse') player.x = clamp(canvasX(e.clientX) - player.w / 2, 0, W - player.w); });
  window.addEventListener('pointerup', function () { dragging = false; });
  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

  document.querySelectorAll('[data-act]').forEach(function (btn) {
    var act = btn.dataset.act;
    var on = function (e) {
      e.preventDefault();
      if (act === 'fire') { keys.fire = true; if (state === 'ready' || state === 'over') startGame(); }
      else if (act === 'left') keys.left = true; else keys.right = true;
    };
    var off = function (e) {
      e.preventDefault();
      if (act === 'fire') keys.fire = false; else if (act === 'left') keys.left = false; else keys.right = false;
    };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('pointerleave', off);
  });

  function stepInterval() {
    var aliveCount = invaders.filter(function (i) { return i.alive; }).length;
    var base = 620 * Math.pow(0.94, wave - 1);
    return Math.max(70, base * (aliveCount / (COLS * ROWS)) + 55);
  }
  function aliveInvaders() { return invaders.filter(function (i) { return i.alive; }); }

  function update(dt) {
    fireCooldown = Math.max(0, fireCooldown - dt);
    /* particles always animate */
    for (var p = particles.length - 1; p >= 0; p--) {
      var pt = particles[p];
      pt.life -= dt;
      if (pt.life <= 0) { particles.splice(p, 1); continue; }
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    }
    if (state !== 'playing') return;

    /* player */
    var speed = 330;
    if (keys.left) player.x = clamp(player.x - speed * dt, 0, W - player.w);
    if (keys.right) player.x = clamp(player.x + speed * dt, 0, W - player.w);
    if (keys.fire && fireCooldown <= 0 && playerBullets.length < 3) {
      playerBullets.push({ x: player.x + player.w / 2, y: player.y - 4, vy: -430 });
      fireCooldown = 0.28;
      NV.audio.play('laser');
    }

    /* invader stepping */
    stepTimer += dt * 1000;
    var interval = stepInterval();
    if (stepTimer >= interval) {
      stepTimer = 0;
      var alive = aliveInvaders();
      var edgeHit = false;
      alive.forEach(function (inv) {
        inv.x += dir * 10;
        if (inv.x + inv.w > W - 8 || inv.x < 8) edgeHit = true;
      });
      if (edgeHit) {
        dir = -dir;
        alive.forEach(function (inv) { inv.y += 16; });
        NV.audio.play('tick');
      }
      /* enemy fire: random bottom-invader shoots */
      var shooters = {};
      alive.forEach(function (inv) {
        if (!shooters[inv.col] || shooters[inv.col].y < inv.y) shooters[inv.col] = inv;
      });
      var columns = Object.keys(shooters);
      if (columns.length && Math.random() < 0.55 + wave * 0.06) {
        var pick = shooters[columns[(Math.random() * columns.length) | 0]];
        enemyBullets.push({ x: pick.x + pick.w / 2, y: pick.y + pick.h, vy: 165 + wave * 22 });
      }
    }

    /* bullets */
    var b, i;
    for (i = playerBullets.length - 1; i >= 0; i--) {
      b = playerBullets[i];
      b.y += b.vy * dt;
      if (b.y < -10) { playerBullets.splice(i, 1); }
    }
    for (i = enemyBullets.length - 1; i >= 0; i--) {
      b = enemyBullets[i];
      b.y += b.vy * dt;
      if (b.y > H + 10) enemyBullets.splice(i, 1);
    }

    /* player bullets vs invaders */
    for (i = playerBullets.length - 1; i >= 0; i--) {
      b = playerBullets[i];
      var hit = false;
      for (var j = 0; j < invaders.length; j++) {
        var inv = invaders[j];
        if (!inv.alive) continue;
        if (b.x > inv.x && b.x < inv.x + inv.w && b.y > inv.y && b.y < inv.y + inv.h) {
          inv.alive = false;
          score += inv.points;
          scoreEl.textContent = String(score);
          spawnParticles(inv.x + inv.w / 2, inv.y + inv.h / 2, inv.row === 0 ? '#ff2ea6' : inv.row < 3 ? '#ffc247' : '#00e5ff', 12);
          NV.audio.play('explode');
          hit = true;
          break;
        }
      }
      /* vs UFO */
      if (!hit && ufo && b.x > ufo.x && b.x < ufo.x + ufo.w && b.y > ufo.y && b.y < ufo.y + ufo.h) {
        score += ufo.points;
        scoreEl.textContent = String(score);
        spawnParticles(ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, '#ff4d5e', 16);
        NV.audio.play('win');
        ufo = null;
        hit = true;
      }
      /* vs bunkers */
      if (!hit) {
        for (var k = bunkers.length - 1; k >= 0; k--) {
          var bk = bunkers[k];
          if (b.x > bk.x && b.x < bk.x + bk.w && b.y > bk.y && b.y < bk.y + bk.h) {
            bunkers.splice(k, 1); hit = true; break;
          }
        }
      }
      if (hit) playerBullets.splice(i, 1);
    }

    /* enemy bullets vs player + bunkers */
    for (i = enemyBullets.length - 1; i >= 0; i--) {
      b = enemyBullets[i];
      var consumed = false;
      for (var m = bunkers.length - 1; m >= 0; m--) {
        var bk2 = bunkers[m];
        if (b.x > bk2.x && b.x < bk2.x + bk2.w && b.y > bk2.y && b.y < bk2.y + bk2.h) {
          bunkers.splice(m, 1); consumed = true; break;
        }
      }
      if (!consumed && b.x > player.x && b.x < player.x + player.w && b.y > player.y && b.y < player.y + player.h) {
        consumed = true;
        lives -= 1;
        livesEl.textContent = String(lives);
        spawnParticles(player.x + player.w / 2, player.y, '#ffffff', 18);
        NV.audio.play('hurt');
        if (lives <= 0) { gameOver(false); return; }
      }
      if (consumed) enemyBullets.splice(i, 1);
    }

    /* invaders reaching the line */
    var aliveNow = aliveInvaders();
    if (!aliveNow.length) {
      wave += 1;
      waveEl.textContent = String(wave);
      NV.audio.play('win');
      buildWave();
      buildBunkers();
      showOverlay('WAVE ' + wave, 'They keep coming. Faster now.', 'SCORE ' + score, 'CONTINUE', true);
      state = 'ready'; /* CONTINUE button resumes */
      return;
    }
    for (i = 0; i < aliveNow.length; i++) {
      if (aliveNow[i].y + aliveNow[i].h >= player.y - 4) { gameOver(false); return; }
    }

    /* UFO */
    ufoTimer -= dt;
    if (!ufo && ufoTimer <= 0) {
      var fromLeft = Math.random() < 0.5;
      ufo = { x: fromLeft ? -60 : W + 60, y: 26, w: 40, h: 14, vx: fromLeft ? 95 : -95, points: [100, 150, 300][(Math.random() * 3) | 0] };
      ufoTimer = 18 + Math.random() * 12;
      NV.audio.play('level');
    }
    if (ufo) {
      ufo.x += ufo.vx * dt;
      if (ufo.x > W + 70 || ufo.x < -70) ufo = null;
    }
  }
  function drawInvader(inv) {
    var x = inv.x, y = inv.y, w = inv.w, h = inv.h;
    var color = inv.row === 0 ? '#ff2ea6' : inv.row < 3 ? '#ffc247' : '#00e5ff';
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    var u = w / 11;
    var rows;
    if (inv.row === 0) { /* top 'saucer eye' type */
      rows = ['..#####..', '.#######.', '##.###.##', '#########', '#.#...#.#'];
    } else if (inv.row < 3) {
      rows = ['.#.....#.', '..#...#..', '.#######.', '##.###.##', '#########', '#.#####.#', '#.#...#.#'];
    } else {
      rows = ['..#####..', '#########', '#########', '#.###.#.#', '#.#.#.#.#', '...#.#...'];
    }
    var cellW = w / 9;
    var cellH = h / rows.length;
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        if (rows[r][c] === '#') ctx.fillRect(x + c * cellW, y + r * cellH, cellW + 0.4, cellH + 0.4);
      }
    }
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#070512';
    ctx.fillRect(0, 0, W, H);
    /* stars */
    ctx.fillStyle = 'rgba(236,234,255,0.6)';
    STARFIELD.forEach(function (s) { ctx.globalAlpha = s.a; ctx.fillRect(s.x, s.y, s.size, s.size); });
    ctx.globalAlpha = 1;
    /* bunkers */
    ctx.fillStyle = '#a6ff3f';
    ctx.shadowColor = '#a6ff3f';
    ctx.shadowBlur = 6;
    bunkers.forEach(function (b) { ctx.fillRect(b.x, b.y, b.w, b.h); });
    ctx.shadowBlur = 0;
    /* invaders */
    invaders.forEach(function (inv) { if (inv.alive) drawInvader(inv); });
    /* UFO */
    if (ufo) {
      ctx.save();
      ctx.shadowColor = '#ff4d5e'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff4d5e';
      ctx.beginPath();
      ctx.ellipse(ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, ufo.w / 2, ufo.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd7de';
      ctx.fillRect(ufo.x + ufo.w / 2 - 4, ufo.y + 2, 8, 4);
      ctx.restore();
    }
    /* player */
    ctx.save();
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y + player.h);
    ctx.lineTo(player.x + player.w * 0.28, player.y + player.h * 0.4);
    ctx.lineTo(player.x + player.w * 0.42, player.y + player.h * 0.4);
    ctx.lineTo(player.x + player.w * 0.42, player.y);
    ctx.lineTo(player.x + player.w * 0.58, player.y);
    ctx.lineTo(player.x + player.w * 0.58, player.y + player.h * 0.4);
    ctx.lineTo(player.x + player.w * 0.72, player.y + player.h * 0.4);
    ctx.lineTo(player.x + player.w, player.y + player.h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    /* bullets */
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6;
    playerBullets.forEach(function (b) { ctx.fillRect(b.x - 1.5, b.y - 8, 3, 9); });
    ctx.fillStyle = '#ff9ff3';
    enemyBullets.forEach(function (b) { ctx.fillRect(b.x - 1.5, b.y, 3, 9); });
    ctx.shadowBlur = 0;
    /* particles */
    particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life * 1.6);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    /* baseline */
    ctx.strokeStyle = 'rgba(0,229,255,0.5)';
    ctx.beginPath(); ctx.moveTo(0, H - 8); ctx.lineTo(W, H - 8); ctx.stroke();
  }

  var STARFIELD = [];
  (function seedStars() {
    for (var i = 0; i < 70; i++) {
      STARFIELD.push({ x: Math.random() * W, y: Math.random() * 220, size: Math.random() < 0.8 ? 1.5 : 2.5, a: 0.25 + Math.random() * 0.6 });
    }
  })();

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
