/* Neon Vault — Memory Match */
(function () {
  'use strict';
  var gridEl = document.getElementById('grid');
  var movesEl = document.getElementById('moves');
  var timeEl = document.getElementById('time');
  var bestEl = document.getElementById('best');
  var restartBtn = document.getElementById('restartBtn');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlaySub = document.getElementById('overlaySub');
  var overlayScore = document.getElementById('overlayScore');
  var overlayBtn = document.getElementById('overlayBtn');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);
  NV.renderBest(bestEl);

  var GLYPHS = [
    { name: 'star', color: '#ffc247', svg: '<path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.5 6.2 20.55l1.1-6.5-4.7-4.6 6.5-.95z" fill="currentColor"/>' },
    { name: 'bolt', color: '#00e5ff', svg: '<path d="M13 2 5 13.5h5L9.5 22 18 10.5h-5.5z" fill="currentColor"/>' },
    { name: 'moon', color: '#b26bff', svg: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" fill="currentColor"/>' },
    { name: 'heart', color: '#ff2ea6', svg: '<path d="M12 21s-7.5-4.9-9.8-9.6C.9 8.4 3.6 5 6.9 5c2.1 0 3.8 1.2 5.1 3 1.3-1.8 3-3 5.1-3 3.3 0 6 3.4 4.7 6.4C19.5 16.1 12 21 12 21z" fill="currentColor"/>' },
    { name: 'diamond', color: '#a6ff3f', svg: '<path d="M7 3h10l4 6-9 12L3 9z" fill="currentColor"/>' },
    { name: 'planet', color: '#ff9f1c', svg: '<circle cx="12" cy="12" r="6" fill="currentColor"/><ellipse cx="12" cy="12" rx="11" ry="3.4" fill="none" stroke="currentColor" stroke-width="1.6" transform="rotate(-18 12 12)"/>' },
    { name: 'ghost', color: '#eceaff', svg: '<path d="M5 21V11a7 7 0 0 1 14 0v10l-2.4-2-2.3 2-2.3-2-2.3 2-2.4-2z" fill="currentColor"/><circle cx="9.6" cy="11.6" r="1.15" fill="#0d0a1e"/><circle cx="14.4" cy="11.6" r="1.15" fill="#0d0a1e"/>' },
    { name: 'crown', color: '#ffd23f', svg: '<path d="M4 17h16M4 17 3 8l5.5 4L12 5l3.5 7L21 8l-1 9z" fill="currentColor"/>' }
  ];

  var MODES = { rookie: 6, master: 8 };
  var mode = 'rookie';
  var deck, firstCard, lockBoard, moves, matchedPairs, startTime, timerId, started;

  function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = array[i]; array[i] = array[j]; array[j] = tmp;
    }
    return array;
  }
  function elapsed() { return started ? Math.floor((Date.now() - startTime) / 1000) : 0; }

  function newGame(newMode) {
    if (newMode) mode = newMode;
    var pairCount = MODES[mode];
    var chosen = GLYPHS.slice(0, pairCount);
    deck = shuffle(chosen.concat(chosen).map(function (g, i) { return { glyph: g, id: i }; }));
    firstCard = null; lockBoard = false; moves = 0; matchedPairs = 0; started = false;
    clearInterval(timerId);
    movesEl.textContent = '0';
    timeEl.textContent = '0';
    hideOverlay();
    document.querySelectorAll('.mm-chip').forEach(function (chip) {
      chip.setAttribute('aria-pressed', chip.dataset.mode === mode ? 'true' : 'false');
    });
    gridEl.innerHTML = deck.map(function (card, index) {
      return '<button class="mm-card" type="button" data-index="' + index + '" aria-label="Hidden card">' +
        '<span class="mm-card-inner"><span class="mm-face mm-back"></span>' +
        '<span class="mm-face mm-front" style="color:' + card.glyph.color + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + card.glyph.svg + '</svg></span>' +
        '</span></button>';
    }).join('');
  }

  function hideOverlay() { overlay.classList.remove('is-visible'); }
  function showOverlay(title, sub, scoreText, btnText) {
    overlayTitle.textContent = title;
    overlaySub.textContent = sub;
    overlayScore.textContent = scoreText || '';
    overlayBtn.textContent = btnText;
    overlay.classList.add('is-visible');
  }

  function flip(cardButton) {
    var index = parseInt(cardButton.dataset.index, 10);
    var card = deck[index];
    if (lockBoard || cardButton.classList.contains('is-up')) return;

    if (!started) {
      started = true;
      startTime = Date.now();
      timerId = setInterval(function () { timeEl.textContent = String(elapsed()); }, 300);
    }

    cardButton.classList.add('is-up');
    cardButton.setAttribute('aria-label', 'Card ' + card.glyph.name);
    NV.audio.play('flip');

    if (!firstCard) { firstCard = cardButton; return; }

    moves += 1;
    movesEl.textContent = String(moves);
    var a = deck[parseInt(firstCard.dataset.index, 10)];
    var isMatch = a.glyph.name === card.glyph.name;
    var first = firstCard;
    firstCard = null;

    if (isMatch) {
      matchedPairs += 1;
      first.classList.add('is-matched');
      cardButton.classList.add('is-matched');
      NV.audio.play('good');
      if (matchedPairs === MODES[mode]) endGame();
      return;
    }

    lockBoard = true;
    setTimeout(function () {
      first.classList.remove('is-up');
      cardButton.classList.remove('is-up');
      first.setAttribute('aria-label', 'Hidden card');
      cardButton.setAttribute('aria-label', 'Hidden card');
      lockBoard = false;
    }, 720);
  }

  function endGame() {
    clearInterval(timerId);
    var seconds = elapsed();
    var score = Math.max(50, 1500 - moves * 30 - seconds * 5 + (mode === 'master' ? 600 : 0));
    NV.audio.play('win');
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    showOverlay('ALL PAIRS!', isBest ? 'New vault record. Suspiciously powerful recall.' : 'Every pair found.', 'TIME ' + seconds + 's  ·  MOVES ' + moves + '  ·  SCORE ' + score, 'PLAY AGAIN');
  }

  gridEl.addEventListener('click', function (event) {
    var btn = event.target.closest('.mm-card');
    if (btn) flip(btn);
  });
  document.querySelectorAll('.mm-chip').forEach(function (chip) {
    chip.addEventListener('click', function () { NV.audio.play('select'); newGame(chip.dataset.mode); });
  });
  restartBtn.addEventListener('click', function () { NV.audio.play('select'); newGame(); });
  overlayBtn.addEventListener('click', function () { NV.audio.play('select'); newGame(); });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyR') { e.preventDefault(); newGame(); }
  });

  newGame('rookie');
})();
