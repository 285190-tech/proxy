/* Neon Vault — Tic-Tac-Toe vs AI (minimax) */
(function () {
  'use strict';
  var boardEl = document.getElementById('board');
  var statusEl = document.getElementById('status');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var tallyEl = document.getElementById('tally');
  var restartBtn = document.getElementById('restartBtn');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlaySub = document.getElementById('overlaySub');
  var overlayScore = document.getElementById('overlayScore');
  var overlayBtn = document.getElementById('overlayBtn');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);
  NV.renderBest(bestEl);

  var LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  var X_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="#00e5ff" stroke-width="2.6" stroke-linecap="round"/></svg>';
  var O_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.4" fill="none" stroke="#ff2ea6" stroke-width="2.6"/></svg>';

  var board, difficulty = 'adept', playerTurn, roundOver, cpuThinking;
  var score = 0, wins = 0, draws = 0, losses = 0;

  function winner(cells) {
    for (var i = 0; i < LINES.length; i++) {
      var line = LINES[i];
      var a = cells[line[0]], b = cells[line[1]], c = cells[line[2]];
      if (a && a === b && b === c) return { player: a, line: line };
    }
    return null;
  }
  function emptyIndices(cells) {
    var out = [];
    for (var i = 0; i < 9; i++) if (!cells[i]) out.push(i);
    return out;
  }
  function minimax(cells, isCpu) {
    var result = winner(cells);
    if (result) return result.player === 'O' ? 10 : -10;
    var empties = emptyIndices(cells);
    if (!empties.length) return 0;
    var bestScore = isCpu ? -Infinity : Infinity;
    for (var i = 0; i < empties.length; i++) {
      var idx = empties[i];
      cells[idx] = isCpu ? 'O' : 'X';
      var value = minimax(cells, !isCpu);
      cells[idx] = null;
      bestScore = isCpu ? Math.max(bestScore, value) : Math.min(bestScore, value);
    }
    return bestScore;
  }
  function cpuMove() {
    var empties = emptyIndices(board);
    if (!empties.length) return;
    var pick;
    if (difficulty === 'rookie') {
      pick = empties[(Math.random() * empties.length) | 0];
    } else if (difficulty === 'adept' && Math.random() < 0.35) {
      /* Adept: occasionally plays a suboptimal move */
      pick = empties[(Math.random() * empties.length) | 0];
    } else {
      var bestScore = -Infinity;
      var bestMoves = [];
      for (var i = 0; i < empties.length; i++) {
        var idx = empties[i];
        board[idx] = 'O';
        var value = minimax(board, false);
        board[idx] = null;
        if (value > bestScore) { bestScore = value; bestMoves = [idx]; }
        else if (value === bestScore) bestMoves.push(idx);
      }
      pick = bestMoves[(Math.random() * bestMoves.length) | 0];
    }
    board[pick] = 'O';
  }
  function render() {
    boardEl.innerHTML = board.map(function (cell, i) {
      var content = cell === 'X' ? X_SVG : cell === 'O' ? O_SVG : '';
      var label = cell ? (cell === 'X' ? 'Your X in cell ' : 'Machine O in cell ') + (i + 1) : 'Cell ' + (i + 1);
      return '<button class="ttt-cell" type="button" role="gridcell" data-index="' + i + '" aria-label="' + label + '"' + (cell || roundOver || cpuThinking || !playerTurn ? ' disabled' : '') + '>' + content + '</button>';
    }).join('');
    tallyEl.textContent = wins + '·' + draws + '·' + losses;
  }
  function setStatus(html) { statusEl.innerHTML = html; }
  function hideOverlay() { overlay.classList.remove('is-visible'); }
  function showOverlay(title, sub, scoreText, btnText, cyan) {
    overlayTitle.textContent = title;
    overlayTitle.classList.toggle('overlay-title--cyan', !!cyan);
    overlaySub.textContent = sub;
    overlayScore.textContent = scoreText;
    overlayBtn.textContent = btnText;
    overlay.classList.add('is-visible');
  }
  function highlightLine(line) {
    var buttons = boardEl.querySelectorAll('.ttt-cell');
    line.forEach(function (i) { if (buttons[i]) buttons[i].classList.add('win-cell'); });
  }
  function endRound(result) {
    roundOver = true;
    render();
    var title, sub, cyan;
    if (result && result.player === 'X') {
      wins += 1; score += 100; title = 'YOU WIN'; sub = 'Three in a row. Beautiful.'; cyan = true;
      NV.audio.play('win');
      highlightLine(result.line);
    } else if (result && result.player === 'O') {
      losses += 1; title = 'MACHINE WINS'; sub = 'The calculator does not gloat. It simply notes it.'; cyan = false;
      NV.audio.play('over');
      highlightLine(result.line);
    } else {
      draws += 1; score += 25; title = 'DRAW'; sub = 'Stalemate. The machine respects the result.'; cyan = true;
      NV.audio.play('level');
    }
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    scoreEl.textContent = String(score);
    tallyEl.textContent = wins + '·' + draws + '·' + losses;
    setStatus('<b>ROUND OVER</b>');
    showOverlay(title, isBest ? sub + ' New vault record.' : sub, 'SCORE ' + score + '  ·  BEST ' + NV.best.get(), 'NEXT ROUND', cyan);
  }
  function afterMove() {
    var result = winner(board);
    if (result || emptyIndices(board).length === 0) { endRound(result); return; }
    playerTurn = !playerTurn;
    if (!playerTurn) {
      cpuThinking = true;
      setStatus('<b>MACHINE MOVING…</b>');
      render();
      setTimeout(function () {
        cpuMove();
        cpuThinking = false;
        NV.audio.play('blip');
        var after = winner(board);
        if (after || emptyIndices(board).length === 0) { endRound(after); return; }
        playerTurn = true;
        setStatus('<b>YOUR MOVE</b> — you are X');
        render();
      }, 480);
    } else {
      setStatus('<b>YOUR MOVE</b> — you are X');
      render();
    }
  }
  function newRound() {
    board = [null, null, null, null, null, null, null, null, null];
    playerTurn = true; roundOver = false; cpuThinking = false;
    hideOverlay();
    setStatus('<b>YOUR MOVE</b> — you are X');
    render();
  }

  boardEl.addEventListener('click', function (event) {
    var btn = event.target.closest('.ttt-cell');
    if (!btn || roundOver || !playerTurn || cpuThinking) return;
    var i = parseInt(btn.dataset.index, 10);
    if (board[i]) return;
    board[i] = 'X';
    NV.audio.play('flip');
    afterMove();
  });
  document.querySelectorAll('.ttt-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      difficulty = chip.dataset.diff;
      document.querySelectorAll('.ttt-chip').forEach(function (c) {
        c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
      });
      NV.audio.play('select');
      newRound();
    });
  });
  restartBtn.addEventListener('click', function () { NV.audio.play('select'); newRound(); });
  overlayBtn.addEventListener('click', function () { NV.audio.play('select'); newRound(); });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyR') { e.preventDefault(); newRound(); }
  });

  newRound();
})();
