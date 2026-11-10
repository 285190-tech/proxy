/* Neon Vault — Tetris (7-bag, ghost piece, levels) */
(function () {
  'use strict';
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var nextCanvas = document.getElementById('nextCanvas');
  var nctx = nextCanvas.getContext('2d');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var levelEl = document.getElementById('level');
  var linesEl = document.getElementById('lines');
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

  var COLS = 10, ROWS = 20, CELL = 22;
  var SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
    O: [[1,1],[1,1]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    T: [[0,1,0],[1,1,1],[0,0,0]]
  };
  var COLORS = { I: '#00e5ff', J: '#3f7dff', L: '#ff9f1c', O: '#ffd23f', S: '#a6ff3f', Z: '#ff4d5e', T: '#b26bff' };
  var LINE_SCORES = [0, 100, 300, 500, 800];

  var board, current, nextType, bag, score, lines, level, alive, paused, dropAcc, lastTime, rafId;

  function emptyBoard() {
    var b = [];
    for (var r = 0; r < ROWS; r++) { b.push(new Array(COLS).fill(null)); }
    return b;
  }
  function refillBag() {
    bag = ['I', 'J', 'L', 'O', 'S', 'Z', 'T'];
    for (var i = bag.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
    }
  }
  function takeFromBag() { if (!bag || !bag.length) refillBag(); return bag.pop(); }
  function dropInterval() { return Math.max(70, Math.round(760 * Math.pow(0.72, level - 1))); }

  function makePiece(type) {
    var matrix = SHAPES[type].map(function (row) { return row.slice(); });
    return { type: type, matrix: matrix, x: Math.floor((COLS - matrix[0].length) / 2), y: 0 };
  }
  function collides(piece, offsetX, offsetY, matrix) {
    var m = matrix || piece.matrix;
    for (var r = 0; r < m.length; r++) {
      for (var c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        var x = piece.x + c + (offsetX || 0);
        var y = piece.y + r + (offsetY || 0);
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && board[y][x]) return true;
      }
    }
    return false;
  }
  function rotateMatrix(m) {
    var N = m.length;
    var out = [];
    for (var c = 0; c < N; c++) {
      var row = [];
      for (var r = N - 1; r >= 0; r--) row.push(m[r][c]);
      out.push(row);
    }
    return out;
  }
  function tryRotate() {
    if (current.type === 'O') return;
    var rotated = rotateMatrix(current.matrix);
    var kicks = [0, -1, 1, -2, 2];
    for (var i = 0; i < kicks.length; i++) {
      if (!collides(current, kicks[i], 0, rotated)) {
        current.matrix = rotated;
        current.x += kicks[i];
        NV.audio.play('blip');
        return;
      }
    }
  }
  function mergePiece() {
    var m = current.matrix;
    for (var r = 0; r < m.length; r++) {
      for (var c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        var y = current.y + r, x = current.x + c;
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) board[y][x] = current.type;
      }
    }
  }
  function clearLines() {
    var cleared = 0;
    for (var r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(function (cell) { return cell; })) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(null));
        cleared++;
        r++;
      }
    }
    if (cleared > 0) {
      lines += cleared;
      var gained = LINE_SCORES[cleared] * level;
      score += gained;
      level = Math.floor(lines / 10) + 1;
      NV.audio.play(cleared >= 4 ? 'win' : 'level');
      scoreEl.textContent = String(score);
      linesEl.textContent = String(lines);
      levelEl.textContent = String(level);
    }
  }
  function spawnNext() {
    current = makePiece(nextType);
    nextType = takeFromBag();
    dropAcc = 0;
    if (collides(current, 0, 0)) { gameOver(); }
    drawNext();
  }
  function lockPiece() {
    mergePiece();
    NV.audio.play('hit');
    clearLines();
    spawnNext();
  }
  function hardDrop() {
    var dist = 0;
    while (!collides(current, 0, dist + 1)) dist++;
    current.y += dist;
    score += dist * 2;
    scoreEl.textContent = String(score);
    lockPiece();
  }
  function ghostY() {
    var dist = 0;
    while (!collides(current, 0, dist + 1)) dist++;
    return current.y + dist;
  }

  function reset() {
    board = emptyBoard();
    refillBag();
    score = 0; lines = 0; level = 1;
    alive = true; paused = false; lastTime = 0; dropAcc = 0;
    nextType = takeFromBag();
    scoreEl.textContent = '0'; linesEl.textContent = '0'; levelEl.textContent = '1';
    hideOverlay();
    pauseBtn.textContent = 'PAUSE';
    spawnNext();
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
    if (paused) showOverlay('PAUSED', 'Gravity on hold.', 'SCORE ' + score, 'RESUME', true);
    else hideOverlay();
  }
  function gameOver() {
    alive = false;
    NV.audio.play('over');
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    showOverlay('GAME OVER', isBest ? 'New vault record. Flawless stacking.' : 'The stack claims another.', 'SCORE ' + score + '  ·  BEST ' + NV.best.get(), 'TRY AGAIN', false);
  }

  function drawCell(context, x, y, size, color, ghost) {
    context.save();
    context.globalAlpha = ghost ? 0.22 : 1;
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = ghost ? 0 : 8;
    var pad = 1;
    context.fillRect(x * size + pad, y * size + pad, size - pad * 2, size - pad * 2);
    context.globalAlpha = ghost ? 0.1 : 0.55;
    context.fillStyle = '#ffffff';
    context.fillRect(x * size + pad, y * size + pad, size - pad * 2, 3);
    context.restore();
  }
  function draw() {
    ctx.fillStyle = '#070512';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    /* faint grid */
    ctx.strokeStyle = 'rgba(60,52,110,0.25)';
    for (var c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, canvas.height); ctx.stroke(); }
    for (var r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(canvas.width, r * CELL); ctx.stroke(); }
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (board[y][x]) drawCell(ctx, x, y, CELL, COLORS[board[y][x]], false);
      }
    }
    if (current && alive) {
      var gy = ghostY();
      var m = current.matrix;
      for (var gr = 0; gr < m.length; gr++) for (var gc = 0; gc < m[gr].length; gc++) {
        if (m[gr][gc] && gy + gr >= 0) drawCell(ctx, current.x + gc, gy + gr, CELL, COLORS[current.type], true);
      }
      for (var pr = 0; pr < m.length; pr++) for (var pc = 0; pc < m[pr].length; pc++) {
        if (m[pr][pc] && current.y + pr >= 0) drawCell(ctx, current.x + pc, current.y + pr, CELL, COLORS[current.type], false);
      }
    }
  }
  function drawNext() {
    nctx.fillStyle = '#0a0716';
    nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextType) return;
    var m = SHAPES[nextType];
    var size = 17;
    var rows = m.length, cols = m[0].length;
    var ox = (nextCanvas.width - cols * size) / 2;
    var oy = (nextCanvas.height - rows * size) / 2;
    nctx.save();
    nctx.translate(ox, oy);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      if (m[r][c]) {
        nctx.fillStyle = COLORS[nextType];
        nctx.shadowColor = COLORS[nextType];
        nctx.shadowBlur = 8;
        nctx.fillRect(c * size + 1, r * size + 1, size - 2, size - 2);
      }
    }
    nctx.restore();
  }

  function loop(time) {
    rafId = requestAnimationFrame(loop);
    if (!lastTime) lastTime = time;
    var delta = Math.min(100, time - lastTime);
    lastTime = time;
    if (!paused && alive) {
      dropAcc += delta;
      var interval = dropInterval();
      while (dropAcc >= interval) {
        dropAcc -= interval;
        if (!collides(current, 0, 1)) { current.y += 1; }
        else { lockPiece(); }
        interval = dropInterval();
      }
    }
    draw();
  }

  function move(dx) {
    if (!alive || paused) return;
    if (!collides(current, dx, 0)) { current.x += dx; }
  }
  function softDrop() {
    if (!alive || paused) return;
    if (!collides(current, 0, 1)) { current.y += 1; score += 1; scoreEl.textContent = String(score); dropAcc = 0; }
    else { lockPiece(); }
  }

  document.addEventListener('keydown', function (e) {
    if (e.code === 'ArrowLeft') { e.preventDefault(); move(-1); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); move(1); }
    else if (e.code === 'ArrowDown') { e.preventDefault(); softDrop(); }
    else if (e.code === 'ArrowUp' || e.code === 'KeyX') { e.preventDefault(); if (alive && !paused) tryRotate(); }
    else if (e.code === 'Space') { e.preventDefault(); if (alive && !paused) hardDrop(); }
    else if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); }
    else if (e.code === 'KeyR') { e.preventDefault(); reset(); }
  });

  document.querySelectorAll('[data-act]').forEach(function (btn) {
    var act = btn.dataset.act;
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (!alive || paused) { if (act !== 'left') return; }
      if (act === 'left') move(-1);
      else if (act === 'right') move(1);
      else if (act === 'down') softDrop();
      else if (act === 'rotate') tryRotate();
      else if (act === 'drop') hardDrop();
      NV.audio.play('blip');
    });
  });

  pauseBtn.addEventListener('click', function () { togglePause(); });
  restartBtn.addEventListener('click', function () { NV.audio.play('select'); reset(); });
  overlayBtn.addEventListener('click', function () { if (!alive) reset(); else togglePause(); });

  reset();
  rafId = requestAnimationFrame(loop);
})();
