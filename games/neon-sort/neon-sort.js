/* Neon Vault ORIGINAL — Neon Sort. Visualize six sorting algorithms; then name them blind. */
(function () {
  'use strict';
  var canvas = document.getElementById('sortCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var streakEl = document.getElementById('streak');
  var strikesEl = document.getElementById('strikes');
  var cmpEl = document.getElementById('cmpCount');
  var writeEl = document.getElementById('writeCount');
  var visStatusEl = document.getElementById('visStatus');
  var pauseBtn = document.getElementById('pauseBtn');
  var restartBtn = document.getElementById('restartBtn');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlaySub = document.getElementById('overlaySub');
  var overlayScore = document.getElementById('overlayScore');
  var overlayBtn = document.getElementById('overlayBtn');
  var algoChipsEl = document.getElementById('algoChips');
  var visualizerControls = document.getElementById('visualizerControls');
  var quizOptionsEl = document.getElementById('quizOptions');
  var modeVisualizeBtn = document.getElementById('modeVisualize');
  var modeQuizBtn = document.getElementById('modeQuiz');
  var sizeRange = document.getElementById('sizeRange');
  var speedRange = document.getElementById('speedRange');
  var stepBtn = document.getElementById('stepBtn');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);
  NV.renderBest(bestEl);

  var W = canvas.width, H = canvas.height;
  var CAPTION_H = 30;

  /* ============ Algorithm generators — each mutates `a` and yields steps ============ */
  function* bubbleSort(a) {
    for (var i = 0; i < a.length; i++) {
      for (var j = 0; j < a.length - 1 - i; j++) {
        yield { type: 'compare', i: j, j: j + 1 };
        if (a[j] > a[j + 1]) {
          var t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
          yield { type: 'swap', i: j, j: j + 1 };
        }
      }
      yield { type: 'sorted', i: a.length - 1 - i };
    }
  }
  function* selectionSort(a) {
    for (var i = 0; i < a.length; i++) {
      var min = i;
      for (var j = i + 1; j < a.length; j++) {
        yield { type: 'compare', i: min, j: j };
        if (a[j] < a[min]) min = j;
      }
      if (min !== i) {
        var t = a[i]; a[i] = a[min]; a[min] = t;
        yield { type: 'swap', i: i, j: min };
      }
      yield { type: 'sorted', i: i };
    }
  }
  function* insertionSort(a) {
    for (var i = 1; i < a.length; i++) {
      var key = a[i], j = i - 1;
      while (j >= 0) {
        yield { type: 'compare', i: j, j: j + 1 };
        if (a[j] > key) { a[j + 1] = a[j]; yield { type: 'set', i: j + 1, value: a[j] }; j--; }
        else break;
      }
      a[j + 1] = key; yield { type: 'set', i: j + 1, value: key };
    }
    for (var k = 0; k < a.length; k++) yield { type: 'sorted', i: k };
  }
  function* mergeSortRange(a, aux, lo, hi) {
    if (lo >= hi) return;
    var mid = (lo + hi) >> 1;
    yield* mergeSortRange(a, aux, lo, mid);
    yield* mergeSortRange(a, aux, mid + 1, hi);
    for (var i = lo; i <= hi; i++) aux[i] = a[i];
    var p = lo, q = mid + 1, k = lo;
    while (p <= mid && q <= hi) {
      yield { type: 'compare', i: p, j: q };
      if (aux[p] <= aux[q]) { a[k] = aux[p]; yield { type: 'set', i: k, value: aux[p] }; p++; }
      else { a[k] = aux[q]; yield { type: 'set', i: k, value: aux[q] }; q++; }
      k++;
    }
    while (p <= mid) { a[k] = aux[p]; yield { type: 'set', i: k, value: aux[p] }; p++; k++; }
    while (q <= hi) { a[k] = aux[q]; yield { type: 'set', i: k, value: aux[q] }; q++; k++; }
    for (var s = lo; s <= hi; s++) yield { type: 'sorted', i: s };
  }
  function* mergeSort(a) {
    var aux = a.slice();
    yield* mergeSortRange(a, aux, 0, a.length - 1);
  }
  function* quickSortRange(a, lo, hi) {
    if (lo >= hi) { if (lo === hi) yield { type: 'sorted', i: lo }; return; }
    var pivot = a[hi], i = lo;
    for (var j = lo; j < hi; j++) {
      yield { type: 'compare', i: j, j: hi };
      if (a[j] < pivot) {
        if (i !== j) { var t = a[i]; a[i] = a[j]; a[j] = t; yield { type: 'swap', i: i, j: j }; }
        i++;
      }
    }
    var t2 = a[i]; a[i] = a[hi]; a[hi] = t2;
    yield { type: 'swap', i: i, j: hi };
    yield { type: 'sorted', i: i };
    yield* quickSortRange(a, lo, i - 1);
    yield* quickSortRange(a, i + 1, hi);
  }
  function* quickSort(a) { yield* quickSortRange(a, 0, a.length - 1); }
  function* heapSort(a) {
    var n = a.length, start;
    for (start = (n >> 1) - 1; start >= 0; start--) yield* siftDown(a, start, n);
    for (var end = n - 1; end > 0; end--) {
      var t = a[0]; a[0] = a[end]; a[end] = t;
      yield { type: 'swap', i: 0, j: end };
      yield { type: 'sorted', i: end };
      yield* siftDown(a, 0, end);
    }
    if (n > 0) yield { type: 'sorted', i: 0 };
  }
  function* siftDown(a, root, end) {
    for (;;) {
      var child = root * 2 + 1;
      if (child >= end) return;
      if (child + 1 < end) {
        yield { type: 'compare', i: child, j: child + 1 };
        if (a[child] < a[child + 1]) child++;
      }
      yield { type: 'compare', i: root, j: child };
      if (a[root] < a[child]) {
        var t = a[root]; a[root] = a[child]; a[child] = t;
        yield { type: 'swap', i: root, j: child };
        root = child;
      } else return;
    }
  }

  var ALGORITHMS = [
    { key: 'bubble', name: 'Bubble Sort', gen: bubbleSort },
    { key: 'selection', name: 'Selection Sort', gen: selectionSort },
    { key: 'insertion', name: 'Insertion Sort', gen: insertionSort },
    { key: 'merge', name: 'Merge Sort', gen: mergeSort },
    { key: 'quick', name: 'Quick Sort', gen: quickSort },
    { key: 'heap', name: 'Heap Sort', gen: heapSort }
  ];
  var ALGO_BY_KEY = {};
  ALGORITHMS.forEach(function (a) { ALGO_BY_KEY[a.key] = a; });

  /* ============ Shared state ============ */
  var mode = 'visualize';
  var array = [], generator = null;
  var compares = 0, writes = 0;
  var sortedSet = {};
  var flashMap = {};      /* index -> frames of "just written" glow */
  var comparePair = null; /* [i, j] currently comparing */
  var visState = 'idle';  /* idle | running | paused | done */
  var currentAlgo = 'bubble';
  var stepAccumulator = 0, lastFrame = 0;
  var quiz = { state: 'ready', score: 0, streak: 0, strikes: 3, round: 0, algo: null, options: [], locked: false, feedbackTimer: 0 };
  var rafId = null;

  /* ============ Array helpers ============ */
  function randomArray(n) {
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(Math.floor(8 + Math.random() * 220));
    return arr;
  }
  function stepsPerSecond() {
    var v = Number(speedRange.value) / 100;
    return Math.round(10 + Math.pow(v, 2.1) * 520);
  }

  /* ============ Visualizer ============ */
  function loadVisualizer() {
    array = randomArray(Number(sizeRange.value));
    generator = null;
    compares = 0; writes = 0;
    sortedSet = {}; flashMap = {}; comparePair = null;
    visState = 'idle';
    stepAccumulator = 0;
    cmpEl.textContent = '0';
    writeEl.textContent = '0';
    visStatusEl.textContent = 'READY';
    pauseBtn.textContent = 'PAUSE';
    renderAlgoChips();
  }
  function startGenerator() {
    generator = ALGO_BY_KEY[currentAlgo].gen(array);
    visState = 'running';
    visStatusEl.textContent = 'RUNNING';
    pauseBtn.textContent = 'PAUSE';
  }
  function onVisualizerComplete() {
    visState = 'done';
    visStatusEl.textContent = 'SORTED';
    for (var i = 0; i < array.length; i++) sortedSet[i] = 1;
    NV.audio.play('win');
  }
  function executeStep() {
    if (!generator) generator = ALGO_BY_KEY[currentAlgo].gen(array);
    var next = generator.next();
    if (next.done) { onVisualizerComplete(); return; }
    var step = next.value;
    if (step.type === 'compare') {
      compares++;
      comparePair = [step.i, step.j];
      if (compares % 3 === 0) toneFor(array[step.i]);
    } else if (step.type === 'swap') {
      writes++;
      flashMap[step.i] = 9; flashMap[step.j] = 9;
      NV.audio.play('tick');
    } else if (step.type === 'set') {
      writes++;
      flashMap[step.i] = 9;
      NV.audio.play('blip');
    } else if (step.type === 'sorted') {
      sortedSet[step.i] = 1;
    }
    cmpEl.textContent = String(compares);
    writeEl.textContent = String(writes);
  }
  function toneFor(value) {
    /* map bar height to a pentatonic-ish pitch */
    var scale = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3];
    var idx = Math.min(scale.length - 1, Math.floor((value / 230) * scale.length));
    blip(scale[idx]);
  }
  function blip(freq) {
    /* direct low-volume square blip tuned to the bar */
    if (NV.audio.isMuted && NV.audio.isMuted()) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!blip._ctx) blip._ctx = new AC();
      var c = blip._ctx;
      if (c.state === 'suspended' && c.resume) c.resume();
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      var t0 = c.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.028, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + 0.08);
    } catch (e) { /* audio optional */ }
  }
  function visualizerTick(dt) {
    if (visState !== 'running' || !generator) return;
    stepAccumulator += dt * stepsPerSecond();
    var guard = 0;
    while (stepAccumulator >= 1 && guard < 2400) {
      guard++;
      stepAccumulator -= 1;
      executeStep();
      if (visState !== 'running') { stepAccumulator = 0; break; }
    }
  }

  /* ============ Quiz ============ */
  var quizArraySize = 26;
  function quizStepsPerSecond() { return 260; }
  function startQuiz() {
    quiz.state = 'showing';
    quiz.score = 0; quiz.streak = 0; quiz.strikes = 3; quiz.round = 0; quiz.locked = false;
    scoreEl.textContent = '0';
    streakEl.textContent = '0';
    strikesEl.textContent = '●●●';
    buildQuizRound();
  }
  function pickQuizAlgo() {
    var keys = ALGORITHMS.map(function (a) { return a.key; });
    var pick;
    do { pick = keys[(Math.random() * keys.length) | 0]; } while (pick === quiz.algo && keys.length > 1);
    return pick;
  }
  function buildQuizRound() {
    quiz.algo = pickQuizAlgo();
    quiz.options = shuffleOptions(quiz.algo);
    quiz.round += 1;
    quiz.locked = false;
    reloadQuizAnimation();
    renderQuizOptions('default');
  }
  function reloadQuizAnimation() {
    array = randomArray(quizArraySize);
    generator = ALGO_BY_KEY[quiz.algo].gen(array);
    sortedSet = {}; flashMap = {}; comparePair = null;
    compares = 0; writes = 0; stepAccumulator = 0;
  }
  function shuffleOptions(correctKey) {
    var others = ALGORITHMS.filter(function (a) { return a.key !== correctKey; });
    shuffle(others);
    var opts = others.slice(0, 3).map(function (a) { return a.key; });
    opts.push(correctKey);
    shuffle(opts);
    return opts;
  }
  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
    return list;
  }
  function renderQuizOptions(state, pickedKey) {
    quizOptionsEl.innerHTML = quiz.options.map(function (key, idx) {
      var algo = ALGO_BY_KEY[key];
      var cls = 'quiz-btn';
      if (state === 'reveal' && key === quiz.algo) cls += ' is-correct';
      if (state === 'reveal' && pickedKey && key === pickedKey && key !== quiz.algo) cls += ' is-wrong';
      return '<button type="button" class="' + cls + '" data-algo="' + key + '" data-index="' + (idx + 1) + '"' + (quiz.locked ? ' disabled' : '') + '><span class="opt-index">' + (idx + 1) + '</span> ' + algo.name.toUpperCase() + '</button>';
    }).join('');
  }
  function quizTick(dt) {
    if (quiz.state !== 'showing') return;
    stepAccumulator += dt * quizStepsPerSecond();
    var guard = 0;
    while (stepAccumulator >= 1 && guard < 1200) {
      guard++;
      stepAccumulator -= 1;
      if (!generator) { reloadQuizAnimation(); return; }
      var next = generator.next();
      if (next.done) {
        /* sorted flash, then loop the same algorithm on a fresh array */
        NV.audio.play('good');
        for (var i = 0; i < array.length; i++) sortedSet[i] = 1;
        reloadQuizAnimation();
        return;
      }
      var step = next.value;
      if (step.type === 'compare') { comparePair = [step.i, step.j]; }
      else if (step.type === 'swap') { flashMap[step.i] = 4; flashMap[step.j] = 4; }
      else if (step.type === 'set') { flashMap[step.i] = 4; }
      else if (step.type === 'sorted') { sortedSet[step.i] = 1; }
    }
  }
  function answerQuiz(key) {
    if (quiz.state !== 'showing' || quiz.locked) return;
    quiz.locked = true;
    if (key === quiz.algo) {
      quiz.streak += 1;
      var gained = 100 + quiz.streak * 25;
      quiz.score += gained;
      scoreEl.textContent = String(quiz.score);
      streakEl.textContent = String(quiz.streak);
      NV.audio.play('coin');
      renderQuizOptions('reveal', key);
      if (quiz.score > NV.best.get()) bestEl.textContent = String(quiz.score);
      setTimeout(function () { if (quiz.state === 'showing') { buildQuizRound(); } }, 950);
    } else {
      quiz.streak = 0;
      quiz.strikes -= 1;
      streakEl.textContent = '0';
      strikesEl.textContent = '●'.repeat(Math.max(0, quiz.strikes)) + '○'.repeat(3 - Math.max(0, quiz.strikes));
      NV.audio.play('hurt');
      quizOptionsEl.classList.add('shake');
      setTimeout(function () { quizOptionsEl.classList.remove('shake'); }, 380);
      renderQuizOptions('reveal', key);
      if (quiz.strikes <= 0) {
        quiz.state = 'over';
        var isBest = NV.best.save(quiz.score);
        NV.renderBest(bestEl);
        NV.audio.play('over');
        showOverlay('DEAD AIR', isBest ? 'New vault record. Certified algorithm whisperer.' : 'Three strikes. The answer was ' + ALGO_BY_KEY[quiz.algo].name + '.', 'SCORE ' + quiz.score + '  ·  BEST ' + NV.best.get(), 'PLAY AGAIN', false);
      } else {
        setTimeout(function () { if (quiz.state === 'showing') { quiz.locked = false; renderQuizOptions('default'); } }, 1100);
      }
    }
  }

  /* ============ Rendering ============ */
  function currentMaxValue() {
    var max = 1;
    for (var i = 0; i < array.length; i++) if (array[i] > max) max = array[i];
    return max;
  }
  function drawBars() {
    ctx.fillStyle = '#070512';
    ctx.fillRect(0, 0, W, H);
    var n = array.length;
    if (!n) return;
    var maxVal = currentMaxValue();
    var pad = 12;
    var slot = (W - pad * 2) / n;
    var barW = Math.max(2, slot - Math.min(3, slot * 0.18));
    var trackH = H - CAPTION_H - 14;
    for (var i = 0; i < n; i++) {
      var v = array[i];
      var h = Math.max(3, (v / maxVal) * trackH);
      var x = pad + i * slot + (slot - barW) / 2;
      var y = H - CAPTION_H - h;
      var color;
      var isCompare = comparePair && (comparePair[0] === i || comparePair[1] === i);
      if (sortedSet[i]) color = '#a6ff3f';
      else if (flashMap[i] > 0) color = '#ffc247';
      else if (isCompare) color = '#ff2ea6';
      else color = mixBarColor(v / maxVal);
      ctx.save();
      if (sortedSet[i] || isCompare || flashMap[i] > 0) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, h);
      ctx.restore();
      if (flashMap[i] > 0) flashMap[i] -= 1;
    }
    /* baseline */
    ctx.fillStyle = 'rgba(145,140,184,0.5)';
    ctx.fillRect(pad, H - CAPTION_H + 2, W - pad * 2, 1.5);
    /* caption strip */
    ctx.fillStyle = '#918cb8';
    ctx.font = "600 11px 'Space Grotesk', sans-serif";
    ctx.textBaseline = 'middle';
    var caption = mode === 'visualize'
      ? (visState === 'done' ? 'Sorted. ' + compares + ' comparisons, ' + writes + ' writes.' : ALGO_BY_KEY[currentAlgo].name + ' — watch the pattern.')
      : ('Round ' + quiz.round + ' — which algorithm is this?');
    ctx.fillText(caption, pad, H - CAPTION_H / 2 + 3);
    comparePair = null;
  }
  function mixBarColor(t) {
    /* cyan → violet ramp */
    var r = Math.round(0 + t * 178);
    var g = Math.round(229 - t * 120);
    var b = Math.round(255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ============ Overlay & mode ============ */
  function hideOverlay() { overlay.classList.remove('is-visible'); }
  function showOverlay(title, sub, scoreText, btnText, cyan) {
    overlayTitle.textContent = title;
    overlayTitle.classList.toggle('overlay-title--cyan', !!cyan);
    overlaySub.textContent = sub;
    overlayScore.textContent = scoreText || '';
    overlayBtn.textContent = btnText;
    overlay.classList.add('is-visible');
  }
  function setMode(next) {
    mode = next;
    modeVisualizeBtn.setAttribute('aria-pressed', mode === 'visualize' ? 'true' : 'false');
    modeQuizBtn.setAttribute('aria-pressed', mode === 'quiz' ? 'true' : 'false');
    var isVis = mode === 'visualize';
    visualizerControls.hidden = !isVis;
    algoChipsEl.hidden = !isVis;
    quizOptionsEl.hidden = isVis;
    pauseBtn.hidden = !isVis;
    restartBtn.textContent = isVis ? 'SHUFFLE' : 'RESTART';
    document.querySelectorAll('[data-mode-hud]').forEach(function (el) {
      el.hidden = el.dataset.modeHud !== mode;
    });
    hideOverlay();
    if (isVis) {
      loadVisualizer();
    } else {
      startQuiz();
    }
  }

  /* ============ Chips ============ */
  function renderAlgoChips() {
    algoChipsEl.innerHTML = ALGORITHMS.map(function (a) {
      var pressed = a.key === currentAlgo ? 'true' : 'false';
      return '<button type="button" class="neon-chip" data-algo="' + a.key + '" aria-pressed="' + pressed + '">' + a.name.toUpperCase() + '</button>';
    }).join('');
  }
  algoChipsEl.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-algo]');
    if (!btn) return;
    currentAlgo = btn.dataset.algo;
    loadVisualizer();
    NV.audio.play('select');
  });
  quizOptionsEl.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-algo]');
    if (!btn) return;
    answerQuiz(btn.dataset.algo);
  });

  modeVisualizeBtn.addEventListener('click', function () { setMode('visualize'); });
  modeQuizBtn.addEventListener('click', function () { setMode('quiz'); });
  sizeRange.addEventListener('input', function () { loadVisualizer(); });
  speedRange.addEventListener('input', function () { /* live speed change, nothing to rebuild */ });
  stepBtn.addEventListener('click', function () {
    if (visState === 'done') return;
    if (visState === 'idle' && !generator) { /* start paused so STEP advances one step */ }
    visState = 'paused';
    executeStep();
    visStatusEl.textContent = 'STEPPING';
    pauseBtn.textContent = 'RESUME';
  });
  pauseBtn.addEventListener('click', function () {
    if (visState === 'running') { visState = 'paused'; pauseBtn.textContent = 'RESUME'; visStatusEl.textContent = 'PAUSED'; }
    else if (visState === 'paused') { visState = 'running'; pauseBtn.textContent = 'PAUSE'; visStatusEl.textContent = 'RUNNING'; }
  });
  restartBtn.addEventListener('click', function () {
    NV.audio.play('select');
    if (mode === 'visualize') loadVisualizer(); else setMode('quiz');
  });
  overlayBtn.addEventListener('click', function () {
    NV.audio.play('select');
    hideOverlay();
    if (mode === 'visualize') { if (visState === 'idle') startGenerator(); }
    else startQuiz();
  });

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (mode === 'visualize') pauseBtn.click();
    } else if (e.code === 'KeyR') {
      e.preventDefault(); restartBtn.click();
    } else if (e.code === 'KeyP') {
      e.preventDefault(); if (mode === 'visualize') pauseBtn.click();
    } else if (/^Digit[1-6]$/.test(e.code)) {
      var n = parseInt(e.code.slice(5), 10);
      if (mode === 'visualize') {
        var algo = ALGORITHMS[n - 1];
        if (algo) { currentAlgo = algo.key; loadVisualizer(); NV.audio.play('select'); }
      } else {
        var key = quiz.options[n - 1];
        if (key) answerQuiz(key);
      }
    }
  });

  /* ============ Main loop ============ */
  function loop(time) {
    rafId = requestAnimationFrame(loop);
    if (!lastFrame) lastFrame = time;
    var dt = Math.min(0.05, (time - lastFrame) / 1000);
    lastFrame = time;
    if (mode === 'visualize') visualizerTick(dt); else quizTick(dt);
    drawBars();
  }

  /* boot */
  loadVisualizer();
  showOverlay('NEON SORT', 'Six classic algorithms under neon lights — watch them, then prove you can name them blind in GUESS THAT SORT.', 'PRESS START', 'START SORTING', true);
  rafId = requestAnimationFrame(loop);
})();
