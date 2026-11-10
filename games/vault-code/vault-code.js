/* Neon Vault ORIGINAL — Vault Code. Mastermind, but the vault is glowing. */
(function () {
  'use strict';
  var slotsWrap = document.getElementById('slots');
  var paletteEl = document.getElementById('palette');
  var logEl = document.getElementById('log');
  var attemptsLeftEl = document.getElementById('attemptsLeft');
  var bestEl = document.getElementById('best');
  var crackBtn = document.getElementById('crackBtn');
  var resetBtn = document.getElementById('resetBtn');
  var restartBtn = document.getElementById('restartBtn');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlaySub = document.getElementById('overlaySub');
  var overlayScore = document.getElementById('overlayScore');
  var overlayBtn = document.getElementById('overlayBtn');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);
  NV.renderBest(bestEl);

  var SIGILS = [
    { name: 'Pulse', color: '#00e5ff', svg: '<circle cx="12" cy="12" r="7.4" fill="none" stroke="{c}" stroke-width="2.3"/><circle cx="12" cy="12" r="2.1" fill="{c}"/>' },
    { name: 'Fang', color: '#ff2ea6', svg: '<path d="M12 2.8 21.4 20H2.6z" fill="{c}"/>' },
    { name: 'Slab', color: '#ffc247', svg: '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3" fill="none" stroke="{c}" stroke-width="2.4"/><rect x="9" y="9" width="6" height="6" fill="{c}"/>' },
    { name: 'Star', color: '#a6ff3f', svg: '<path d="M12 2.3l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.6 6.1 20.2l1.3-6.5L2.5 9.1l6.6-.8z" fill="{c}"/>' },
    { name: 'Bolt', color: '#ff4d5e', svg: '<path d="M13.2 2 5.4 13.4h4.8L8.6 22l8.6-11.4h-4.9z" fill="{c}"/>' },
    { name: 'Gem', color: '#b26bff', svg: '<path d="M12 2.6 20 9l-8 12.4L4 9z" fill="none" stroke="{c}" stroke-width="2.2" stroke-linejoin="round"/><path d="M4 9h16" stroke="{c}" stroke-width="2.2"/>' }
  ];
  var MAX_ATTEMPTS = 10, SLOTS = 4;

  var secret = [], guess = [0, 0, 0, 0], activeSlot = 0, selectedSigil = 0;
  var attemptsUsed = 0, over = true;

  function sigilSVG(index, sizeClass) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + SIGILS[index].svg.split('{c}').join(SIGILS[index].color) + '</svg>';
  }
  function renderSlots() {
    slotsWrap.innerHTML = '';
    for (var i = 0; i < SLOTS; i++) {
      (function (slotIndex) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'vc-slot' + (slotIndex === activeSlot ? ' is-active' : '');
        b.setAttribute('aria-label', 'Slot ' + (slotIndex + 1) + ', sigil ' + SIGILS[guess[slotIndex]].name);
        b.innerHTML = sigilSVG(guess[slotIndex]);
        b.addEventListener('click', function () {
          if (over) return;
          if (activeSlot === slotIndex) {
            guess[slotIndex] = (guess[slotIndex] + 1) % SIGILS.length; /* click again = cycle */
          } else {
            activeSlot = slotIndex;
            guess[slotIndex] = selectedSigil;
          }
          NV.audio.play('tick');
          renderSlots();
        });
        slotsWrap.appendChild(b);
      })(i);
    }
  }
  function renderPalette() {
    paletteEl.innerHTML = '';
    SIGILS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'vc-sigil' + (i === selectedSigil ? ' is-active' : '');
      b.setAttribute('aria-label', 'Sigil ' + s.name + ', key ' + (i + 1));
      b.title = s.name;
      b.innerHTML = sigilSVG(i);
      b.addEventListener('click', function () {
        selectedSigil = i;
        if (!over) guess[activeSlot] = i, activeSlot = Math.min(SLOTS - 1, activeSlot + 1);
        NV.audio.play('select');
        renderPalette(); renderSlots();
      });
      paletteEl.appendChild(b);
    });
  }
  function renderLogRow(indices, exact, partial, attemptNo) {
    var row = document.createElement('div');
    row.className = 'vc-row';
    var glyphs = '<div class="vc-row-glyphs">';
    for (var i = 0; i < SLOTS; i++) glyphs += sigilSVG(indices[i]);
    glyphs += '</div>';
    var pegs = '<div class="vc-pegs" aria-label="' + exact + ' exact, ' + partial + ' partial">';
    var p;
    for (p = 0; p < exact; p++) pegs += '<span class="vc-peg vc-peg--exact"></span>';
    for (p = 0; p < partial; p++) pegs += '<span class="vc-peg vc-peg--partial"></span>';
    for (p = exact + partial; p < SLOTS; p++) pegs += '<span class="vc-peg"></span>';
    pegs += '</div>';
    row.innerHTML = '<span class="vc-row-index">' + String(attemptNo).padStart(2, '0') + '</span>' + glyphs + pegs;
    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;
  }
  function pegScore(guessRow, secretRow) {
    var exact = 0, partial = 0;
    var remG = {}, remS = {}, i;
    for (i = 0; i < SLOTS; i++) {
      if (guessRow[i] === secretRow[i]) exact++;
      else { remG[guessRow[i]] = (remG[guessRow[i]] || 0) + 1; remS[secretRow[i]] = (remS[secretRow[i]] || 0) + 1; }
    }
    for (var key in remG) { if (remS[key]) partial += Math.min(remG[key], remS[key]); }
    return { exact: exact, partial: partial };
  }
  function newVault() {
    secret = [];
    for (var i = 0; i < SLOTS; i++) secret.push((Math.random() * SIGILS.length) | 0);
    guess = [0, 1, 2, 3];
    activeSlot = 0; selectedSigil = 0; attemptsUsed = 0; over = false;
    attemptsLeftEl.textContent = String(MAX_ATTEMPTS);
    logEl.innerHTML = '';
    overlay.classList.remove('is-visible');
    renderPalette(); renderSlots();
  }
  function crack() {
    if (over) return;
    var test = guess.slice();
    var result = pegScore(test, secret);
    attemptsUsed++;
    attemptsLeftEl.textContent = String(MAX_ATTEMPTS - attemptsUsed);
    renderLogRow(test, result.exact, result.partial, attemptsUsed);
    if (result.exact === SLOTS) {
      over = true;
      var gained = Math.max(100, 1000 - (attemptsUsed - 1) * 80);
      var isBest = NV.best.save(gained);
      NV.renderBest(bestEl);
      NV.audio.play('win');
      showOverlay('VAULT CRACKED', isBest ? 'Flawless work — a new vault record.' : 'The door sighs open. The vault yields.', 'SCORE ' + gained + '  ·  ' + attemptsUsed + ' ' + (attemptsUsed === 1 ? 'ATTEMPT' : 'ATTEMPTS'), 'CRACK ANOTHER', true);
      return;
    }
    NV.audio.play(result.exact > 0 ? 'good' : 'tick');
    if (attemptsUsed >= MAX_ATTEMPTS) {
      over = true;
      NV.audio.play('over');
      showOverlay('VAULT LOCKED', 'The correct sequence glows amber below. The vault keeps its gold this time.', 'THE CODE WAS ' + secret.map(function (i) { return SIGILS[i].name.toUpperCase(); }).join(' · '), 'TRY A NEW VAULT', false);
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
  crackBtn.addEventListener('click', function () { NV.audio.play('select'); crack(); });
  resetBtn.addEventListener('click', function () { guess = [0, 0, 0, 0]; activeSlot = 0; NV.audio.play('tick'); renderSlots(); });
  restartBtn.addEventListener('click', function () { NV.audio.play('select'); newVault(); });
  overlayBtn.addEventListener('click', function () { NV.audio.play('select'); newVault(); });

  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyR') { e.preventDefault(); newVault(); return; }
    if (e.code === 'Enter') { e.preventDefault(); if (over) { newVault(); } else { crack(); } return; }
    if (over) return;
    if (e.code === 'ArrowLeft') { e.preventDefault(); activeSlot = (activeSlot + SLOTS - 1) % SLOTS; renderSlots(); return; }
    if (e.code === 'ArrowRight') { e.preventDefault(); activeSlot = (activeSlot + 1) % SLOTS; renderSlots(); return; }
    var digit = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5 }[e.code];
    if (digit !== undefined) {
      e.preventDefault();
      selectedSigil = digit;
      guess[activeSlot] = digit;
      activeSlot = (activeSlot + 1) % SLOTS;
      NV.audio.play('tick');
      renderPalette(); renderSlots();
    }
  });

  /* idle screen — generate behind the overlay so Begin is instant */
  newVault();
  over = true;
  guess = [0, 0, 0, 0];
  activeSlot = 0;
  renderPalette(); renderSlots();
  overlay.classList.add('is-visible');
})();
