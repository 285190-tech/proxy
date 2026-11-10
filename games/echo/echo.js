/* Neon Vault ORIGINAL — Echo. The vault hums a pattern; you play it back. */
(function () {
  'use strict';
  var boardEl = document.getElementById('board');
  var pads = Array.prototype.slice.call(boardEl.querySelectorAll('.echo-pad'));
  var roundEl = document.getElementById('round');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var statusEl = document.getElementById('status');
  var restartBtn = document.getElementById('restartBtn');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlaySub = document.getElementById('overlaySub');
  var overlayScore = document.getElementById('overlayScore');
  var overlayBtn = document.getElementById('overlayBtn');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);
  NV.renderBest(bestEl);

  var PAD_TONES = [261.63, 329.63, 392.0, 523.25]; /* C4 E4 G4 C5 — major arpeggio */
  var sequence = [];
  var playerIndex = 0;
  var score = 0;
  var round = 0;
  var phase = 'idle'; /* idle | showing | input | over */
  var showTimers = [];
  var audioCtx = null;

  function tone(freq, dur, when) {
    if (NV.audio && NV.audio.isMuted()) return;
    dur = dur || 0.22; when = when || 0;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      var c = audioCtx;
      if (c.state === 'suspended' && c.resume) c.resume();
      var t0 = c.currentTime + when;
      var osc = c.createOscillator(), gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    } catch (e) { /* audio optional */ }
  }
  function litPad(index, duration) {
    duration = duration || 240;
    var pad = pads[index];
    pad.classList.add('is-lit');
    setTimeout(function () { pad.classList.remove('is-lit'); }, duration);
  }
  function playPad(index, withSound) {
    litPad(index, 260);
    if (withSound !== false) tone(PAD_TONES[index], 0.34);
  }
  function clearShowTimers() {
    showTimers.forEach(function (id) { clearTimeout(id); });
    showTimers = [];
  }
  function setPhase(next) {
    phase = next;
    boardEl.classList.toggle('is-locked', phase !== 'input');
    if (phase === 'input') statusEl.innerHTML = '<b>YOUR TURN</b> — repeat the pattern';
    else if (phase === 'showing') statusEl.innerHTML = '<b>WATCH…</b>';
  }
  function updateHud() {
    roundEl.textContent = round > 0 ? String(round) : '–';
    scoreEl.textContent = String(score);
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
  function shout(ms, fn) { showTimers.push(setTimeout(fn, ms)); }

  function startGame() {
    clearShowTimers();
    sequence = [];
    score = 0;
    round = 0;
    hideOverlay();
    updateHud();
    nextRound();
  }
  function nextRound() {
    round += 1;
    sequence.push((Math.random() * 4) | 0);
    playerIndex = 0;
    updateHud();
    setPhase('showing');
    playSequence();
  }
  function playSequence() {
    var tempo = Math.max(210, 500 - (round - 1) * 32);
    var gap = Math.max(120, tempo * 0.42);
    sequence.forEach(function (padIndex, i) {
      shout(260 + i * (tempo + gap), function () {
        playPad(padIndex, true);
      });
    });
    shout(260 + sequence.length * (tempo + gap) + 60, function () {
      setPhase('input');
    });
  }
  function handlePad(index) {
    if (phase !== 'input') return;
    playPad(index, true);
    if (index === sequence[playerIndex]) {
      playerIndex += 1;
      if (playerIndex === sequence.length) {
        /* round cleared */
        score += 100 + (round - 1) * 25;
        updateHud();
        setPhase('showing');
        statusEl.innerHTML = '<b>NICE!</b> Sequence cleared';
        NV.audio.play('good');
        clearShowTimers();
        shout(760, nextRound);
      }
      return;
    }
    /* wrong pad — the pattern dies here */
    gameOver();
  }
  function gameOver() {
    setPhase('over');
    clearShowTimers();
    boardEl.classList.add('is-error');
    setTimeout(function () { boardEl.classList.remove('is-error'); }, 650);
    statusEl.innerHTML = '<b>BROKEN ECHO</b>';
    NV.audio.play('over');
    pads.forEach(function (pad) { litPad(pads.indexOf(pad), 120); });
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    showOverlay('BROKEN ECHO', isBest ? 'New vault record. The vault hums your name now.' : 'The pattern died on note ' + (playerIndex + 1) + ' of round ' + round + '.', 'SCORE ' + score + '  ·  BEST ' + NV.best.get(), 'HUM IT AGAIN', false);
  }

  pads.forEach(function (pad) {
    pad.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      handlePad(parseInt(pad.dataset.pad, 10));
    });
  });
  document.addEventListener('keydown', function (e) {
    var map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
    if (e.code in map) { e.preventDefault(); handlePad(map[e.code]); return; }
    if (e.code === 'KeyR') { e.preventDefault(); restartToStart(); }
    else if (e.code === 'Space' || e.code === 'Enter') {
      if (phase === 'idle' || phase === 'over') { e.preventDefault(); startGame(); }
    }
  });
  function restartToStart() {
    clearShowTimers();
    phase = 'idle';
    sequence = [];
    round = 0;
    score = 0;
    updateHud();
    statusEl.textContent = 'Press start — the vault will hum first';
    showOverlay('ECHO', 'Watch the pads sing. Repeat the pattern. Each round adds one more note to remember.', 'PRESS BEGIN', 'BEGIN', true);
  }

  restartBtn.addEventListener('click', function () { NV.audio.play('select'); restartToStart(); });
  overlayBtn.addEventListener('click', function () { NV.audio.play('select'); startGame(); });

  restartToStart();
})();
