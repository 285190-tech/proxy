/* Neon Vault — 2048 */
(function () {
  'use strict';
  var boardEl = document.getElementById('board');
  var cells = Array.prototype.slice.call(boardEl.querySelectorAll('.g2048-cell'));
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var topTileEl = document.getElementById('topTile');
  var restartBtn = document.getElementById('restartBtn');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlaySub = document.getElementById('overlaySub');
  var overlayScore = document.getElementById('overlayScore');
  var overlayBtn = document.getElementById('overlayBtn');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);
  NV.renderBest(bestEl);

  var SIZE = 4;
  var grid, score, over, won, overlayMode;
  var lastSpawn = -1, mergeCells = [];

  function emptyGrid() {
    var g = [];
    for (var r = 0; r < SIZE; r++) g.push([0, 0, 0, 0]);
    return g;
  }
  function spawnTile() {
    var empties = [];
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) if (!grid[r][c]) empties.push(r * SIZE + c);
    if (!empties.length) return;
    var pick = empties[(Math.random() * empties.length) | 0];
    grid[(pick / SIZE) | 0][pick % SIZE] = Math.random() < 0.9 ? 2 : 4;
    lastSpawn = pick;
  }
  function lineCoords(dir) {
    /* returns list of lines, each a list of [r,c] in move direction */
    var lines = [];
    if (dir === 'left' || dir === 'right') {
      for (var r = 0; r < SIZE; r++) {
        var line = [];
        for (var c = 0; c < SIZE; c++) line.push([r, dir === 'left' ? c : SIZE - 1 - c]);
        lines.push(line);
      }
    } else {
      for (var c2 = 0; c2 < SIZE; c2++) {
        var line2 = [];
        for (var r2 = 0; r2 < SIZE; r2++) line2.push([dir === 'up' ? r2 : SIZE - 1 - r2, c2]);
        lines.push(line2);
      }
    }
    return lines;
  }
  function move(dir) {
    if (over) return;
    var totalGain = 0, moved = false;
    mergeCells = [];
    lastSpawn = -1;
    lineCoords(dir).forEach(function (coords) {
      var values = coords.map(function (rc) { return grid[rc[0]][rc[1]]; }).filter(function (v) { return v > 0; });
      var merged = [];
      for (var i = 0; i < values.length; i++) {
        if (values[i] === values[i + 1]) {
          var sum = values[i] * 2;
          merged.push(sum);
          totalGain += sum;
          mergeCells.push(coords[merged.length - 1].join(','));
          i++;
        } else {
          merged.push(values[i]);
        }
      }
      while (merged.length < SIZE) merged.push(0);
      for (var j = 0; j < SIZE; j++) {
        var rc = coords[j];
        var before = grid[rc[0]][rc[1]];
        if (before !== merged[j]) moved = true;
        grid[rc[0]][rc[1]] = merged[j];
      }
    });
    if (!moved) return;
    score += totalGain;
    spawnTile();
    scoreEl.textContent = String(score);
    if (score > NV.best.get()) bestEl.textContent = String(score);
    if (totalGain > 0) NV.audio.play('merge'); else NV.audio.play('blip');
    updateTopTile();
    render();
    var top = topTile();
    if (!won && top >= 2048) {
      won = true;
      over = true;
      overlayMode = 'win';
      NV.best.save(score);
      NV.renderBest(bestEl);
      NV.audio.play('win');
      showOverlay('2048!', 'You forged the vault\u2019s ultimate tile. Glorious.', 'SCORE ' + score, 'KEEP GOING', true);
      return;
    }
    if (!movesAvailable()) {
      over = true;
      overlayMode = 'over';
      var isBest = NV.best.save(score);
      NV.renderBest(bestEl);
      NV.audio.play('over');
      showOverlay('GAME OVER', isBest ? 'New vault record on a dead board.' : 'No moves left. The grid is sealed.', 'SCORE ' + score + '  ·  BEST ' + NV.best.get(), 'TRY AGAIN', false);
    }
  }
  function topTile() {
    var max = 0;
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) if (grid[r][c] > max) max = grid[r][c];
    return max;
  }
  function updateTopTile() {
    var t = topTile();
    topTileEl.textContent = t ? String(t) : '—';
  }
  function movesAvailable() {
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) {
      if (!grid[r][c]) return true;
      var v = grid[r][c];
      if (c + 1 < SIZE && grid[r][c + 1] === v) return true;
      if (r + 1 < SIZE && grid[r + 1][c] === v) return true;
    }
    return false;
  }
  function tileClass(v) { return v <= 2048 ? 't' + v : 'tsuper'; }
  function render() {
    for (var i = 0; i < SIZE * SIZE; i++) {
      var r = (i / SIZE) | 0, c = i % SIZE;
      var v = grid[r][c];
      var cell = cells[i];
      if (!v) { cell.innerHTML = ''; continue; }
      var cls = 'g2048-tile ' + tileClass(v);
      if (i === lastSpawn) cls += ' is-new';
      else if (mergeCells.indexOf(r + ',' + c) !== -1) cls += ' is-merge';
      cell.innerHTML = '<div class="' + cls + '">' + v + '</div>';
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
  function reset() {
    grid = emptyGrid();
    score = 0; over = false; won = false; overlayMode = null; mergeCells = [];
    scoreEl.textContent = '0';
    hideOverlay();
    spawnTile(); spawnTile();
    updateTopTile();
    render();
  }

  document.addEventListener('keydown', function (e) {
    var dir = null;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') dir = 'left';
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') dir = 'right';
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') dir = 'up';
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') dir = 'down';
    if (dir) { e.preventDefault(); move(dir); return; }
    if (e.code === 'KeyR') { e.preventDefault(); reset(); }
  });

  var touchStart = null;
  boardEl.addEventListener('pointerdown', function (e) { touchStart = { x: e.clientX, y: e.clientY }; });
  boardEl.addEventListener('pointerup', function (e) {
    if (!touchStart) return;
    var dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 26 && Math.abs(dy) < 26) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left'); else move(dy > 0 ? 'down' : 'up');
  });
  boardEl.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

  document.querySelectorAll('[data-dir]').forEach(function (btn) {
    btn.addEventListener('pointerdown', function (e) { e.preventDefault(); move(btn.dataset.dir); });
  });

  restartBtn.addEventListener('click', function () { NV.audio.play('select'); reset(); });
  overlayBtn.addEventListener('click', function () {
    if (overlayMode === 'win') { over = false; hideOverlay(); return; }
    reset();
  });

  reset();
})();
