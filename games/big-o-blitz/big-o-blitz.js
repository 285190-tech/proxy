/* Neon Vault ORIGINAL — Big-O Blitz. Read the algorithm, name the complexity. */
(function () {
  'use strict';
  var codeBlock = document.getElementById('codeBlock');
  var optionsEl = document.getElementById('options');
  var whyEl = document.getElementById('why');
  var questionNoEl = document.getElementById('questionNo');
  var scoreEl = document.getElementById('score');
  var streakEl = document.getElementById('streak');
  var strikesEl = document.getElementById('strikes');
  var bestEl = document.getElementById('best');
  var progressEl = document.getElementById('progress');
  var restartBtn = document.getElementById('restartBtn');
  var overlay = document.getElementById('overlay');
  var overlayTitle = document.getElementById('overlayTitle');
  var overlaySub = document.getElementById('overlaySub');
  var overlayScore = document.getElementById('overlayScore');
  var overlayBtn = document.getElementById('overlayBtn');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);
  NV.renderBest(bestEl);

  var BUCKETS = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'];
  var PER_ROUND = 10;

  /* Each question: code, answer index into BUCKETS, one-line explanation. */
  var BANK = [
    { code: 'function pick(arr, index) {\n  return arr[index];\n}', a: 0, why: 'Direct index — one memory access, no matter how big the array.' },
    { code: 'function pushHead(list, node) {\n  node.next = list.head;\n  list.head = node;\n}', a: 0, why: 'Pointer surgery at the front — constant work.' },
    { code: 'function lookup(map, key) {\n  return map.entries[hash(key)];\n}', a: 0, why: 'Hash lookup is O(1) on average — the birthday gift of hashing.' },
    { code: 'function step(value, edge) {\n  let n = value, hops = 0;\n  while (n > 1) { n = Math.floor(n / edge); hops++; }\n  return hops;\n}', a: 1, why: 'Each iteration divides by the edge — logarithmic descent.' },
    { code: 'function halving(values, target) {\n  let lo = 0, hi = values.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (values[mid] === target) return mid;\n    if (values[mid] < target) lo = mid + 1; else hi = mid - 1;\n  }\n  return -1;\n}', a: 1, why: 'Binary search — halves the search space every comparison.' },
    { code: 'function halve(n) {\n  let i = 1;\n  while (i < n) i = i * 2;\n}', a: 1, why: 'Doubling from 1 to n takes log₂ n iterations.' },
    { code: 'function expo(base, exp) {\n  if (exp === 0) return 1;\n  const half = expo(base, Math.floor(exp / 2));\n  return half * half * (exp % 2 ? base : 1);\n}', a: 1, why: 'Exponentiation by squaring — one halving per recursive call.' },
    { code: 'function walk(items) {\n  for (let i = 0; i < items.length; i++) {\n    visit(items[i]);\n  }\n}', a: 2, why: 'One pass, n visits — linear time.' },
    { code: 'function pass1(xs) { for (const x of xs) sink(x); }\nfunction pass2(xs) { for (const x of xs) sink(x); }', a: 2, why: 'Two sequential passes — 2n is still O(n).' },
    { code: 'function smallest(a, b) {\n  return a < b ? a : b;\n}', a: 0, why: 'A single comparison — constant time.' },
    { code: 'function find(map, target) {\n  const seen = {};\n  for (const x of map) {\n    if (seen[target - x]) return true;\n    seen[x] = true;\n  }\n  return false;\n}', a: 2, why: 'One pass with hash lookups — linear overall.' },
    { code: 'function tally(pirates) {\n  const counts = Array(256).fill(0);\n  for (const p of pirates) counts[p.age]++;\n  return counts;\n}', a: 2, why: 'Ages bounded by 256 — still one pass over n pirates.' },
    { code: 'function middle(node) {\n  let cur = node, count = 0;\n  while (cur) { count++; cur = cur.next; }\n  cur = node;\n  for (let i = 0; i < Math.floor(count / 2); i++) cur = cur.next;\n  return cur;\n}', a: 2, why: 'Singly linked list — no random access, you physically walk it.' },
    { code: 'function mergeSort(items) {\n  if (items.length <= 1) return items;\n  const mid = items.length >> 1;\n  return merge(mergeSort(items.slice(0, mid)), mergeSort(items.slice(mid)));\n}', a: 3, why: 'Merge sort — log n levels of recursion, linear merge per level.' },
    { code: 'function heapSort(items) {\n  const heap = new BinaryHeap(items);\n  const out = [];\n  while (heap.size) out.push(heap.pop());\n  return out;\n}', a: 3, why: 'Heap sort — n pops at log n each.' },
    { code: 'function mergeLayers(layers) {\n  if (layers.length <= 1) return layers;\n  const mid = layers.length >> 1;\n  return combine(mergeLayers(layers.slice(0, mid)), mergeLayers(layers.slice(mid)));\n}', a: 3, why: 'Divide and conquer with linear stitch-up — n log n.' },
    { code: 'function bruteForce(grid) {\n  for (let row = 0; row < grid.length; row++) {\n    for (let col = 0; col < grid.length; col++) {\n      scan(grid[row][col]);\n    }\n  }\n}', a: 4, why: 'Nested loops over the same n — n squared visits.' },
    { code: 'function selectOrder(nums) {\n  for (let i = 0; i < nums.length; i++) {\n    let min = i;\n    for (let j = i + 1; j < nums.length; j++) if (nums[j] < nums[min]) min = j;\n    swap(nums, i, min);\n  }\n}', a: 4, why: 'Selection sort — n picks, each scanning the tail.' },
    { code: 'function naiveConcat(chars) {\n  let s = "";\n  for (const ch of chars) s = s + ch;\n  return s;\n}', a: 4, why: 'String concat copies the whole string each step — quadratic.' },
    { code: 'function triangle(rows) {\n  for (let i = 0; i < rows; i++) {\n    for (let j = 0; j < i; j++) {\n      paint(i, j);\n    }\n  }\n}', a: 4, why: 'j runs 0..i — the triangle sums to n²/2.' },
    { code: 'function bubble(nums) {\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = 0; j < nums.length - 1 - i; j++) {\n      if (nums[j] > nums[j + 1]) swap(nums, j, j + 1);\n    }\n  }\n}', a: 4, why: 'Bubble sort — classic n² nested scan.' },
    { code: 'function fib(n) {\n  if (n < 2) return n;\n  return fib(n - 1) + fib(n - 2);\n}', a: 5, why: 'Two recursive calls, no memo — the tree explodes exponentially.' },
    { code: 'function subsets(items, index, current) {\n  if (index === items.length) { emit(current); return; }\n  subsets(items, index + 1, current.concat(items[index]));\n  subsets(items, index + 1, current);\n}', a: 5, why: 'Every element doubles the branch count — 2ⁿ subsets.' },
    { code: 'function hanoi(n, from, to, via) {\n  if (n === 0) return;\n  hanoi(n - 1, from, via, to);\n  move(from, to);\n  hanoi(n - 1, via, to, from);\n}', a: 5, why: 'Towers of Hanoi — two recursive calls per disk, 2ⁿ − 1 moves.' }
  ];

  var bag = [], asked = 0, score = 0, streak = 0, strikes = 0, locked = false, over = true;
  var current = null;

  function refillBag() {
    bag = BANK.map(function (_, i) { return i; });
    for (var i = bag.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = bag[i]; bag[i] = bag[j]; bag[j] = t; }
  }
  function strikesText() { return '●'.repeat(Math.max(0, 3 - strikes)) + '○'.repeat(strikes); }
  function renderProgress() {
    progressEl.innerHTML = '';
    for (var i = 0; i < PER_ROUND; i++) {
      var pip = document.createElement('span');
      pip.className = 'bo-pip' + (i < asked ? ' is-done' : i === asked && !over ? ' is-now' : '');
      progressEl.appendChild(pip);
    }
  }
  function updateHud() {
    questionNoEl.textContent = over ? '–' : (asked + 1) + '/' + PER_ROUND;
    scoreEl.textContent = String(score);
    streakEl.textContent = String(streak);
    strikesEl.textContent = strikesText();
    renderProgress();
  }
  function renderOptions() {
    optionsEl.innerHTML = '';
    BUCKETS.forEach(function (bucket, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'bo-option';
      b.textContent = bucket;
      b.dataset.index = String(i);
      b.addEventListener('click', function () { answer(i); });
      optionsEl.appendChild(b);
    });
  }
  function askNext() {
    if (bag.length === 0) refillBag();
    current = BANK[bag.pop()];
    codeBlock.textContent = current.code;
    whyEl.innerHTML = '&nbsp;';
    locked = false;
    renderOptions();
    updateHud();
  }
  function answer(index) {
    if (over || locked) return;
    locked = true;
    var buttons = optionsEl.children;
    buttons[current.a].classList.add('is-correct');
    if (index === current.a) {
      score += 100 + streak * 25;
      streak++;
      NV.audio.play('good');
      whyEl.innerHTML = '<b>YES.</b> ' + current.why;
    } else {
      buttons[index].classList.add('is-wrong');
      streak = 0;
      strikes++;
      NV.audio.play('hurt');
      whyEl.innerHTML = '<b>NO.</b> ' + current.why;
    }
    asked++;
    updateHud();
    if (strikes >= 3) { finish(false); return; }
    if (asked >= PER_ROUND) { finish(true); return; }
    setTimeout(askNext, 1350);
  }
  function finish(survived) {
    over = true;
    var isBest = NV.best.save(score);
    NV.renderBest(bestEl);
    NV.audio.play(survived ? 'win' : 'over');
    whyEl.innerHTML = '&nbsp;';
    showOverlay(survived ? 'ROUND CLEAR' : 'THREE STRIKES', survived ? (isBest ? 'All ten read clean — a new vault record.' : 'All ten snippets classified. The compiler bows.') : 'The vault laughs at your complexity. Study the why-line, run it back.', 'SCORE ' + score + '  ·  BEST ' + NV.best.get(), 'RUN IT BACK', survived);
    updateHud();
  }
  function startRound() {
    refillBag(); asked = 0; score = 0; streak = 0; strikes = 0; locked = false; over = false;
    overlay.classList.remove('is-visible');
    askNext();
  }
  function showOverlay(title, sub, scoreText, btnText, cyan) {
    overlayTitle.textContent = title;
    overlayTitle.classList.toggle('overlay-title--cyan', !!cyan);
    overlaySub.textContent = sub;
    overlayScore.textContent = scoreText || '';
    overlayBtn.textContent = btnText;
    overlay.classList.add('is-visible');
  }
  restartBtn.addEventListener('click', function () { NV.audio.play('select'); startRound(); });
  overlayBtn.addEventListener('click', function () { NV.audio.play('select'); startRound(); });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyR') { e.preventDefault(); startRound(); return; }
    if (over) { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); startRound(); } return; }
    var digit = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5 }[e.code];
    if (digit !== undefined) { e.preventDefault(); answer(digit); }
  });

  renderOptions();
  updateHud();
  showOverlay('BIG-O BLITZ', overlaySub.textContent, 'BEST ' + NV.best.get(), 'BLIND THE COMPILER', true);
})();
