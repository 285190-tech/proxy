/* Neon Vault — Minesweeper */
(function () {
  'use strict';
  var gridEl = document.getElementById('grid');
  var timeEl = document.getElementById('time');
  var minesLeftEl = document.getElementById('minesLeft');
  var bestEl = document.getElementById('best');
  var restartBtn = document.getElementById('restartBtn');
  var flagModeBtn = document.getElementById('flagModeBtn');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlaySub = document.getElementById('overlaySub');
  var overlayScore = document.getElementById('overlayScore');
  var overlayBtn = document.getElementById('overlayBtn');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);
  NV.renderBest(bestEl);

  var DIFFS = {
    cadet: { cols: 9, rows: 9, mines: 10 },
    veteran: { cols: 12, rows: 12, mines: 26 },
    legend: { cols: 16, rows: 16, mines: 48 }
  };
  var DIFF_BONUS = { cadet: 0, veteran: 1200, legend: 3000 };

  var diff = 'cadet';
  var cells, mines, adjacent, revealed, flagged, totalMines, revealedCount, flagCount;
  var started, over, startTime, timerId, flagMode;

  function cellSize() {
    var max = Math.min(40, Math.floor((Math.min(window.innerWidth, 560) - 48) / DIFFS[diff].cols) - 4);
    return Math.max(22, max);
  }
  function newBoard(newDiff) {
    if (newDiff) diff = newDiff;
    var cfg = DIFFS[diff];
    cells = new Array(cfg.cols * cfg.rows).fill(null);
    mines = new Array(cells.length).fill(false);
    adjacent = new Array(cells.length).fill(0);
    revealed = new Array(cells.length).fill(false);
    flagged = new Array(cells.length).fill(false);
    totalMines = cfg.mines;
    revealedCount = 0; flagCount = 0;
    started = false; over = false; flagMode = false;
    clearInterval(timerId);
    timeEl.textContent = '0';
    updateMinesLeft();
    flagModeBtn.setAttribute('aria-pressed', 'false');
    flagModeBtn.textContent = 'DIG MODE';
    hideOverlay();
    renderGrid();
    document.querySelectorAll('.ms-chip').forEach(function (chip) {
      chip.setAttribute('aria-pressed', chip.dataset.diff === diff ? 'true' : 'false');
    });
  }
  function placeMines(safeIndex) {
    var cfg = DIFFS[diff];
    var forbidden = neighbors(safeIndex).concat([safeIndex]);
    var placed = 0;
    while (placed < totalMines) {
      var i = (Math.random() * cells.length) | 0;
      if (mines[i] || forbidden.indexOf(i) !== -1) continue;
      mines[i] = true;
      placed++;
    }
    for (var j = 0; j < cells.length; j++) {
      adjacent[j] = neighbors(j).filter(function (n) { return mines[n]; }).length;
    }
  }
  function neighbors(index) {
    var cfg = DIFFS[diff];
    var col = index % cfg.cols, row = (index / cfg.cols) | 0, out = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var r = row + dr, c = col + dc;
        if (r < 0 || r >= cfg.rows || c < 0 || c >= cfg.cols) continue;
        out.push(r * cfg.cols + c);
      }
    }
    return out;
  }
  function updateMinesLeft() { minesLeftEl.textContent = String(Math.max(0, totalMines - flagCount)); }
  function elapsedSeconds() { return started ? Math.floor((Date.now() - startTime) / 1000) : 0; }

  function renderGrid() {
    var cfg = DIFFS[diff];
    var size = cellSize();
    gridEl.style.setProperty('--cell', size + 'px');
    gridEl.style.gridTemplateColumns = 'repeat(' + cfg.cols + ', ' + size + 'px)';
    var html = '';
    for (var i = 0; i < cells.length; i++) {
      html += '<button class="ms-cell" type="button" role="gridcell" data-index="' + i + '" aria-label="cell"></button>';
    }
    gridEl.innerHTML = html;
    for (var j = 0; j < cells.length; j++) updateCell(j);
  }
  function cellButton(index) { return gridEl.querySelector('[data-index="' + index + '"]'); }
  function updateCell(index) {
    var btn = cellButton(index);
    if (!btn) return;
    var classes = 'ms-cell';
    var inner = '';
    if (revealed[index]) {
      classes += ' is-open';
      if (mines[index]) {
        classes += ' is-mine';
        inner = '<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.4" r="6.6" fill="#ff4d5e"/><path d="M12 3v4.4M6.1 7.1l2.7 2.7M17.9 7.1l-2.7 2.7" stroke="#ff4d5e" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="13.4" r="1.5" fill="#ffd9de"/></svg>';
      } else if (adjacent[index] > 0) {
        inner = '<span class="n' + adjacent[index] + '">' + adjacent[index] + '</span>';
      }
      btn.setAttribute('aria-label', mines[index] ? 'mine' : 'open cell ' + adjacent[index]);
    } else if (flagged[index]) {
      classes += ' is-flag';
      inner = '⚑';
      btn.setAttribute('aria-label', 'flagged cell');
    } else {
      btn.setAttribute('aria-label', 'hidden cell');
    }
    btn.className = classes;
    btn.innerHTML = inner;
  }
  function revealQuiet(index) { /* batch: reveal without per-cell DOM churn */
    revealed[index] = true;
    revealedCount++;
    if (adjacent[index] === 0) neighbors(index).forEach(function (n) { if (!revealed[n] && !mines[n]) revealQuiet(n); });
  }
  function dig(index) {
    if (over || revealed[index] || flagged[index]) return;
    if (!started) {
      started = true;
      startTime = Date.now();
      placeMines(index);
      timerId = setInterval(function () { timeEl.textContent = String(elapsedSeconds()); }, 300);
    }
    if (mines[index]) {
      revealed[index] = true;
      loseGame();
      return;
    }
    revealQuiet(index);
    NV.audio.play('flip');
    for (var i = 0; i < cells.length; i++) updateCell(i);
    checkWin();
  }
  function toggleFlag(index) {
    if (revealed[index] || over) return;
    flagged[index] = !flagged[index];
    flagCount += flagged[index] ? 1 : -1;
    updateMinesLeft();
    updateCell(index);
    NV.audio.play('blip');
  }
  function checkWin() {
    if (revealedCount === cells.length - totalMines) {
      over = true;
      clearInterval(timerId);
      var seconds = elapsedSeconds();
      var bonus = Math.max(0, 600 - seconds) * 10;
      var score = DIFF_BONUS[diff] + totalMines * 50 + bonus;
      NV.audio.play('win');
      var isBest = NV.best.save(score);
      NV.renderBest(bestEl);
      showOverlay('CLEAR!', isBest ? 'New vault record. Cold-blooded logic.' : 'Every mine accounted for.', 'TIME ' + seconds + 's  ·  SCORE ' + score, 'PLAY AGAIN', true);
    }
  }
  function loseGame() {
    over = true;
    clearInterval(timerId);
    NV.audio.play('explode');
    for (var i = 0; i < cells.length; i++) {
      if (mines[i]) revealed[i] = true;
      updateCell(i);
      /* mark wrong flags */
      if (flagged[i] && !mines[i]) {
        var btn = cellButton(i);
        if (btn) btn.classList.add('is-wrong');
      }
    }
    showOverlay('BOOM', 'Stepped on one. The numbers were warning you.', 'TIME ' + elapsedSeconds() + 's', 'TRY AGAIN', false);
  }
  function hideOverlay() { overlay.classList.remove('is-visible'); }
  function showOverlay(title, sub, scoreText, btnText, cyan) {
    overlayTitle.textContent = title;
    overlayTitle.classList.toggle('overlay-title--cyan', !!cyan);
    overlaySub.textContent = sub;
    overlayScore.textContent = scoreText || '';
    overlayBtn.textContent = btnText;
    overlay.classList.add('is-visible');
  }

  /* interactions */
  gridEl.addEventListener('click', function (event) {
    var btn = event.target.closest('.ms-cell');
    if (!btn) return;
    var index = parseInt(btn.dataset.index, 10);
    if (flagMode) toggleFlag(index); else dig(index);
  });
  gridEl.addEventListener('contextmenu', function (event) {
    var btn = event.target.closest('.ms-cell');
    if (!btn) return;
    event.preventDefault();
    toggleFlag(parseInt(btn.dataset.index, 10));
  });
  /* long-press to flag on touch */
  var longPressTimer = null;
  var longPressFired = false;
  gridEl.addEventListener('pointerdown', function (event) {
    if (event.pointerType === 'mouse') return;
    var btn = event.target.closest('.ms-cell');
    if (!btn) return;
    longPressFired = false;
    var index = parseInt(btn.dataset.index, 10);
    longPressTimer = setTimeout(function () {
      longPressFired = true;
      toggleFlag(index);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 420);
  });
  ['pointerup', 'pointercancel', 'pointermove'].forEach(function (type) {
    gridEl.addEventListener(type, function () {
      clearTimeout(longPressTimer);
      if (type === 'pointerup' && longPressFired) {
        /* swallow the tap that completes a long-press */
        gridEl.addEventListener('click', function swallow(e) {
          e.stopPropagation(); e.preventDefault();
          gridEl.removeEventListener('click', swallow, true);
        }, true);
      }
    });
  });

  flagModeBtn.addEventListener('click', function () {
    flagMode = !flagMode;
    flagModeBtn.setAttribute('aria-pressed', flagMode ? 'true' : 'false');
    flagModeBtn.textContent = flagMode ? 'FLAG MODE' : 'DIG MODE';
    NV.audio.play('select');
  });
  document.querySelectorAll('.ms-chip').forEach(function (chip) {
    chip.addEventListener('click', function () { NV.audio.play('select'); newBoard(chip.dataset.diff); });
  });
  restartBtn.addEventListener('click', function () { NV.audio.play('select'); newBoard(); });
  overlayBtn.addEventListener('click', function () { NV.audio.play('select'); newBoard(); });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyR') { e.preventDefault(); newBoard(); }
  });
  window.addEventListener('resize', function () {
    if (cells) {
      var size = cellSize();
      gridEl.style.setProperty('--cell', size + 'px');
      gridEl.style.gridTemplateColumns = 'repeat(' + DIFFS[diff].cols + ', ' + size + 'px)';
    }
  });

  newBoard('cadet');
})();
