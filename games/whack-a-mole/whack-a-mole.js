/* Neon Vault — Whack-a-Mole */
(function () {
  'use strict';
  var fieldEl = document.getElementById('field');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var timeEl = document.getElementById('time');
  var restartBtn = document.getElementById('restartBtn');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlaySub = document.getElementById('overlaySub');
  var overlayScore = document.getElementById('overlayScore');
  var overlayBtn = document.getElementById('overlayBtn');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);
  NV.renderBest(bestEl);

  var ROUND_SECONDS = 45;
  var MOLE_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="30" rx="17" ry="14" fill="#a6793f"/><ellipse cx="24" cy="32" rx="11" ry="9" fill="#d8b98a"/><circle cx="17.5" cy="22" r="2.2" fill="#12080a"/><circle cx="30.5" cy="22" r="2.2" fill="#12080a"/><ellipse cx="24" cy="29.5" rx="2.6" ry="1.9" fill="#ff8fa3"/><path d="M14 30h-4M38 30h-4" stroke="#a6793f" stroke-width="2" stroke-linecap="round"/></svg>';
  var GOLD_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="30" rx="17" ry="14" fill="#ffd23f"/><ellipse cx="24" cy="32" rx="11" ry="9" fill="#fff3b0"/><circle cx="17.5" cy="22" r="2.2" fill="#3a2700"/><circle cx="30.5" cy="22" r="2.2" fill="#3a2700"/><ellipse cx="24" cy="29.5" rx="2.6" ry="1.9" fill="#ff8fa3"/><path d="M24 12l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#fff3b0"/></svg>';
  var BOMB_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="23" cy="29" r="13" fill="#2b2b3d"/><circle cx="19" cy="25" r="3.4" fill="#55557a"/><path d="M31 18c2-2.5 3.5-4 6-5" stroke="#ff9f1c" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M37.4 6.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" fill="#ffc247"/></svg>';

  var holes = [];
  var score, timeLeft, playing, spawnTimer, countdownTimer, activeMoles, whacks, taps;

  /* build holes */
  for (var i = 0; i < 9; i++) {
    var hole = document.createElement('button');
    hole.className = 'wm-hole';
    hole.type = 'button';
    hole.dataset.index = String(i);
    hole.setAttribute('aria-label', 'Hole ' + (i + 1));
    hole.innerHTML = '<span class="wm-mole">' + MOLE_SVG + '</span>';
    fieldEl.appendChild(hole);
    holes.push({ el: hole, mole: hole.querySelector('.wm-mole'), type: null, hideTimeout: null });
  }

  function setMoleVisual(hole, type) {
    hole.mole.innerHTML = type === 'golden' ? GOLD_SVG : type === 'bomb' ? BOMB_SVG : MOLE_SVG;
    hole.el.classList.toggle('is-golden', type === 'golden');
    hole.el.classList.toggle('is-bomb', type === 'bomb');
  }
  function clearMole(hole) {
    hole.el.classList.remove('is-up', 'is-golden', 'is-bomb', 'is-hit');
    hole.type = null;
    clearTimeout(hole.hideTimeout);
  }
  function freeHoles() { return holes.filter(function (h) { return !h.type; }); }

  function popMole() {
    if (!playing) return;
    var free = freeHoles();
    if (!free.length) return;
    var hole = free[(Math.random() * free.length) | 0];
    var roll = Math.random();
    var type = roll < 0.12 ? 'golden' : roll < 0.26 ? 'bomb' : 'mole';
    hole.type = type;
    setMoleVisual(hole, type);
    hole.el.classList.add('is-up');
    var upMs = Math.max(520, 1150 - (ROUND_SECONDS - timeLeft) * 14 - Math.random() * 260);
    hole.hideTimeout = setTimeout(function () { clearMole(hole); }, upMs);
    /* schedule next pop with ramping tempo */
    var interval = Math.max(240, 640 - (ROUND_SECONDS - timeLeft) * 9);
    spawnTimer = setTimeout(popMole, interval);
  }

  function reset() {
    score = 0; timeLeft = ROUND_SECONDS; playing = false; whacks = 0; taps = 0;
    clearTimeout(spawnTimer);
    clearInterval(countdownTimer);
    holes.forEach(clearMole);
    scoreEl.textContent = '0';
    timeEl.textContent = String(ROUND_SECONDS);
    hideOverlay();
    showOverlay('WHACK-A-MOLE', '45 seconds. Moles +10, golden +30, bombs −25. Go.', 'PRESS START WHEN READY', 'START ROUND');
  }
  function startRound() {
    score = 0; timeLeft = ROUND_SECONDS; playing = true; whacks = 0; taps = 0;
    scoreEl.textContent = '0';
    timeEl.textContent = String(ROUND_SECONDS);
    hideOverlay();
    NV.audio.play('level');
    spawnTimer = setTimeout(popMole, 350);
    countdownTimer = setInterval(function () {
      timeLeft -= 1;
      timeEl.textContent = String(timeLeft);
      if (timeLeft <= 5 && timeLeft > 0) NV.audio.play('tick');
      if (timeLeft <= 0) endRound();
    }, 1000);
  }
  function endRound() {
    playing = false;
    clearTimeout(spawnTimer);
    clearInterval(countdownTimer);
    holes.forEach(clearMole);
    NV.audio.play('win');
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    var accuracy = taps > 0 ? Math.round((whacks / taps) * 100) : 0;
    showOverlay('TIME!', isBest ? 'New vault record. Hammer of legend.' : 'Round over. The moles regroup.', 'SCORE ' + score + '  ·  ACCURACY ' + accuracy + '%', 'PLAY AGAIN');
  }
  function hideOverlay() { overlay.classList.remove('is-visible'); }
  function showOverlay(title, sub, scoreText, btnText) {
    overlayTitle.textContent = title;
    overlaySub.textContent = sub;
    overlayScore.textContent = scoreText || '';
    overlayBtn.textContent = btnText;
    overlay.classList.add('is-visible');
  }

  fieldEl.addEventListener('pointerdown', function (event) {
    var holeEl = event.target.closest('.wm-hole');
    if (!holeEl || !playing) return;
    event.preventDefault();
    taps += 1;
    var hole = holes[parseInt(holeEl.dataset.index, 10)];
    if (!hole.type) return;
    whacks += 1;
    var type = hole.type;
    hole.el.classList.add('is-hit');
    if (type === 'bomb') {
      score = Math.max(0, score - 25);
      hole.el.classList.add('wm-flash');
      setTimeout(function () { hole.el.classList.remove('wm-flash'); }, 260);
      NV.audio.play('hurt');
    } else {
      score += type === 'golden' ? 30 : 10;
      NV.audio.play(type === 'golden' ? 'good' : 'whack');
    }
    scoreEl.textContent = String(score);
    setTimeout(function () { clearMole(hole); }, 90);
  });

  restartBtn.addEventListener('click', function () { NV.audio.play('select'); reset(); });
  overlayBtn.addEventListener('click', function () { NV.audio.play('select'); startRound(); });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyR') { e.preventDefault(); reset(); }
  });

  reset();
})();
