/* Neon Vault ORIGINAL — Lock On. Forty-five seconds of neon target practice. */
(function () {
  'use strict';
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var timeEl = document.getElementById('timeLeft');
  var scoreEl = document.getElementById('score');
  var streakEl = document.getElementById('streak');
  var accuracyEl = document.getElementById('accuracy');
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

  var W = canvas.width, H = canvas.height;
  var ROUND_SECONDS = 45;
  var targets = [];
  var sparks = [];
  var score = 0, streak = 0, bestStreak = 0, hits = 0, shots = 0;
  var timeLeft = ROUND_SECONDS, phase = 'idle'; /* idle | play | over */
  var lastSpawn = 0, elapsed = 0, lastTs = null, rafId = null;

  var TYPES = [
    { key: 'target', r: 30, color: '#ff2ea6', points: 100, weight: 0.66 },
    { key: 'gold',   r: 17, color: '#ffc247', points: 250, weight: 0.20 },
    { key: 'bomb',   r: 24, color: '#ff4d5e', points: -200, weight: 0.14 }
  ];

  function pickType() {
    var roll = Math.random(), acc = 0;
    for (var i = 0; i < TYPES.length; i++) { acc += TYPES[i].weight; if (roll <= acc) return TYPES[i]; }
    return TYPES[0];
  }
  function spawnInterval() { return Math.max(340, 720 - elapsed * 8.5); }
  function targetLifetime() { return Math.max(750, 1650 - elapsed * 19); }

  function spawnTarget() {
    var type = pickType();
    var margin = type.r + 8;
    targets.push({
      type: type,
      x: margin + Math.random() * (W - margin * 2),
      y: margin + Math.random() * (H - margin * 2),
      born: elapsed,
      lifetime: targetLifetime(),
      seed: Math.random() * Math.PI * 2
    });
  }
  function updateHud() {
    timeEl.textContent = String(Math.max(0, Math.ceil(timeLeft)));
    scoreEl.textContent = String(score);
    streakEl.textContent = String(streak);
    accuracyEl.textContent = shots === 0 ? '–' : Math.round((hits / shots) * 100) + '%';
  }
  function startGame() {
    targets = []; sparks = [];
    score = 0; streak = 0; bestStreak = 0; hits = 0; shots = 0;
    timeLeft = ROUND_SECONDS; elapsed = 0; lastSpawn = -600; lastTs = null;
    phase = 'play';
    overlay.classList.remove('is-visible');
    updateHud();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(frame);
  }
  function endGame() {
    phase = 'over';
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    targets = [];
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    NV.audio.play('over');
    showOverlay('TIME UP', isBest ? 'A new range record. The vault is impressed.' : 'The range goes quiet. Shake it off, reload, go again.', 'SCORE ' + score + '  ·  HITS ' + hits + '/' + shots + '  ·  BEST STREAK ×' + bestStreak, 'RUN IT BACK', false);
    updateHud();
    draw();
  }
  function frame(ts) {
    if (phase !== 'play') return;
    if (lastTs === null) lastTs = ts;
    var dt = Math.min(50, ts - lastTs); lastTs = ts;
    elapsed += dt;
    timeLeft -= dt / 1000;
    if (timeLeft <= 0) { timeLeft = 0; endGame(); return; }
    if (elapsed - lastSpawn >= spawnInterval() && targets.length < 4) { spawnTarget(); lastSpawn = elapsed; }
    /* expire old targets (they fade unfired) */
    for (var i = targets.length - 1; i >= 0; i--) {
      if (elapsed - targets[i].born > targets[i].lifetime) targets.splice(i, 1);
    }
    for (var j = sparks.length - 1; j >= 0; j--) { sparks[j].life -= dt; if (sparks[j].life <= 0) sparks.splice(j, 1); }
    updateHud();
    draw();
    rafId = requestAnimationFrame(frame);
  }
  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 2.4;
      sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 380 + Math.random() * 260, max: 640, color: color });
    }
  }
  function canvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    var cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    var cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    return { x: cx, y: cy };
  }
  function handleTap(x, y) {
    if (phase !== 'play') return;
    shots++;
    var hitIndex = -1;
    for (var i = targets.length - 1; i >= 0; i--) {
      var t = targets[i], dx = x - t.x, dy = y - t.y;
      if (dx * dx + dy * dy <= t.type.r * t.type.r) { hitIndex = i; break; }
    }
    if (hitIndex === -1) { streak = 0; NV.audio.play('tick'); updateHud(); return; }
    var target = targets.splice(hitIndex, 1)[0];
    burst(target.x, target.y, target.type.color, target.type.key === 'bomb' ? 18 : 12);
    if (target.type.key === 'bomb') {
      score = Math.max(0, score + target.type.points);
      streak = 0;
      NV.audio.play('explode');
    } else {
      score += target.type.points;
      hits++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      NV.audio.play(target.type.key === 'gold' ? 'coin' : 'hit');
    }
    updateHud();
    draw();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    /* range backdrop — faint concentric rings like a shooting range */
    ctx.save();
    ctx.strokeStyle = 'rgba(178, 107, 255, .10)';
    ctx.lineWidth = 1.4;
    for (var r = 55; r <= 320; r += 55) { ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0, 229, 255, .06)';
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.restore();
    /* targets */
    targets.forEach(function (t) {
      var age = (elapsed - t.born) / t.lifetime;
      var pulse = 1 + Math.sin(elapsed / 150 + t.seed) * 0.08;
      var appear = Math.min(1, (elapsed - t.born) / 110);
      var fade = age > 0.72 ? Math.max(0, (1 - age) / 0.28) : 1;
      var alpha = Math.min(appear, fade);
      var rad = t.type.r * pulse * (0.6 + 0.4 * appear);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = t.type.color; ctx.shadowBlur = 18;
      ctx.strokeStyle = t.type.color; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.arc(t.x, t.y, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha * 0.85;
      ctx.beginPath(); ctx.arc(t.x, t.y, rad * 0.62, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = t.type.color;
      ctx.beginPath(); ctx.arc(t.x, t.y, rad * 0.26, 0, Math.PI * 2); ctx.fill();
      if (t.type.key === 'bomb') {
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (var i = 0; i < 8; i++) {
          var a = (i * Math.PI / 4) + t.seed;
          ctx.moveTo(t.x + Math.cos(a) * (rad * 0.72), t.y + Math.sin(a) * (rad * 0.72));
          ctx.lineTo(t.x + Math.cos(a) * (rad * 1.18), t.y + Math.sin(a) * (rad * 1.18));
        }
        ctx.stroke();
      }
      ctx.restore();
    });
    /* sparks */
    sparks.forEach(function (s) {
      s.x += s.vx; s.y += s.vy;
      var a = Math.max(0, s.life / s.max);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }
  function showOverlay(title, sub, scoreText, btnText, cyan) {
    overlayTitle.textContent = title;
    overlayTitle.classList.toggle('overlay-title--cyan', !!cyan);
    overlaySub.textContent = sub;
    overlayScore.textContent = scoreText || '';
    overlayBtn.textContent = btnText;
    overlay.classList.add('is-visible');
  }
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var p = canvasPos(e);
    handleTap(p.x, p.y);
  });
  restartBtn.addEventListener('click', function () { NV.audio.play('select'); startGame(); });
  overlayBtn.addEventListener('click', function () { NV.audio.play('select'); startGame(); });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyR') { e.preventDefault(); startGame(); return; }
    if (e.code === 'Space' || e.code === 'Enter') {
      if (phase !== 'play') { e.preventDefault(); startGame(); }
    }
  });

  showOverlay('LOCK ON', overlaySub.textContent, 'BEST ' + NV.best.get(), 'TAKE THE SHOT', true);
  draw();
})();
