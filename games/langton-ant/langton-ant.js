/* Neon Vault ORIGINAL — Langton's Ant (and its chaotic cousins), on neon turf. */
(function () {
  'use strict';
  var canvas = document.getElementById('antCanvas');
  var ctx = canvas.getContext('2d');
  var stepsEl = document.getElementById('steps');
  var ruleNameEl = document.getElementById('ruleName');
  var playBtn = document.getElementById('playBtn');
  var stepBtn = document.getElementById('stepBtn');
  var resetBtn = document.getElementById('resetBtn');
  var ruleNoteEl = document.getElementById('ruleNote');
  var ruleChips = document.getElementById('ruleChips');
  var speedRange = document.getElementById('speedRange');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);

  var CELL = 4, COLS = 165, ROWS = 110; /* 660 x 440 */
  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; /* N E S W */
  var RULES = [
    { key: 'RL', name: 'CLASSIC', note: 'RL — white: right, flip. black: left, flip. The famous highway always emerges around step 10,000.', palette: ['#151027', '#ffc247'] },
    { key: 'RNR', name: 'SNAKE', note: 'RNR — a three-color wanderer that coils into long serpentine ribbons before settling into rhythm.', palette: ['#151027', '#00e5ff', '#123a44'] },
    { key: 'LRN', name: 'SILENT', note: 'LRN — left on cyan, right on teal, straight through the deep: symmetric still lifes bloom outward.', palette: ['#151027', '#00e5ff', '#2b1a4d'] },
    { key: 'LLRR', name: 'TWIN', note: 'LLRR — four states folding back on themselves. Grows a paisley garden that never stops flowering.', palette: ['#151027', '#ff2ea6', '#4a1440', '#ffc247'] },
    { key: 'RLR', name: 'WEAVE', note: 'RLR — right, left, right: herringbone bridges and braided streams across the dark.', palette: ['#151027', '#a6ff3f', '#3d5a1e'] },
    { key: 'RRLLLRLLLRRR', name: 'CHAOS', note: 'RRLLLRLLLRRR — the famous 12-state chaotic rule by Gale, Propp and Sutherland. Patterns inside patterns inside patterns.', palette: ['#151027', '#ff2ea6', '#b26bff', '#7a5cff', '#00e5ff', '#123a44', '#a6ff3f', '#3d5a1e', '#ffc247', '#4a3208', '#ff4d5e', '#4d1f28'] },
    { key: 'LLRRRLRLRLLR', name: 'GALAXY', note: 'LLRRRLRLRLLR — a 12-state sibling that paints spiral galaxy arms into the void. Give it 20,000 steps.', palette: ['#151027', '#00e5ff', '#0f4b5c', '#b26bff', '#3a1f5e', '#ff2ea6', '#4a1440', '#ffc247', '#4a3208', '#a6ff3f', '#3d5a1e', '#eceaff'] }
  ];
  var current = RULES[0];
  var grid = new Uint8Array(COLS * ROWS);
  var ant = { x: COLS >> 1, y: ROWS >> 1, dir: 1 };
  var steps = 0, playing = false, rafId = null;

  function idx(x, y) { return y * COLS + x; }
  function reset(rule) {
    if (rule) current = rule;
    grid = new Uint8Array(grid.length);
    ant = { x: COLS >> 1, y: ROWS >> 1, dir: 1 };
    steps = 0;
    ruleNameEl.textContent = current.key;
    ruleNoteEl.textContent = current.note;
    for (var i = 0; i < ruleChips.children.length; i++) {
      ruleChips.children[i].classList.toggle('is-active', ruleChips.children[i].dataset.rule === current.key);
    }
    stepsEl.textContent = '0';
    drawFull();
  }
  function stepAnt() {
    var i = idx(ant.x, ant.y);
    var state = grid[i];
    var instruction = current.key.charAt(state % current.key.length);
    if (instruction === 'R') ant.dir = (ant.dir + 1) % 4;
    else if (instruction === 'L') ant.dir = (ant.dir + 3) % 4;
    /* 'N' = walk straight on */
    grid[i] = (state + 1) % current.key.length;
    ant.x = (ant.x + DIRS[ant.dir][0] + COLS) % COLS;
    ant.y = (ant.y + DIRS[ant.dir][1] + ROWS) % ROWS;
    steps++;
  }
  function drawFull() {
    ctx.fillStyle = current.palette[0];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      var s = grid[idx(x, y)];
      if (s === 0) continue;
      ctx.fillStyle = current.palette[s % current.palette.length];
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
    drawAnt();
  }
  function drawAnt() {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.fillRect(ant.x * CELL - 1, ant.y * CELL - 1, CELL + 2, CELL + 2);
    ctx.shadowBlur = 0;
  }
  var dirty = [];
  function frame() {
    if (!playing) return;
    var bulk = Math.max(1, parseInt(speedRange.value, 10)) * 4;
    dirty.length = 0;
    for (var i = 0; i < bulk; i++) { dirty.push(idx(ant.x, ant.y)); stepAnt(); }
    dirty.push(idx(ant.x, ant.y));
    /* repaint only the cells we touched — plus the ant's old/new spots */
    for (var d = 0; d < dirty.length; d++) {
      var cell = dirty[d], cx = cell % COLS, cy = (cell - cx) / COLS;
      var s = grid[cell];
      ctx.fillStyle = current.palette[s % current.palette.length];
      ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
    }
    drawAnt();
    stepsEl.textContent = String(steps);
    rafId = requestAnimationFrame(frame);
  }
  function togglePlay() {
    playing = !playing;
    playBtn.textContent = playing ? 'PAUSE' : 'PLAY';
    if (playing) { if (rafId) cancelAnimationFrame(rafId); rafId = requestAnimationFrame(frame); }
    NV.audio.play('select');
  }
  RULES.forEach(function (rule) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'la-chip' + (rule === current ? ' is-active' : '');
    b.textContent = rule.name;
    b.dataset.rule = rule.key;
    b.title = rule.key;
    b.addEventListener('click', function () { NV.audio.play('select'); reset(rule); });
    ruleChips.appendChild(b);
  });
  playBtn.addEventListener('click', togglePlay);
  stepBtn.addEventListener('click', function () {
    NV.audio.play('tick');
    var was = playing; playing = false;
    for (var i = 0; i < 100; i++) stepAnt();
    if (was) playing = true;
    drawFull();
    stepsEl.textContent = String(steps);
  });
  resetBtn.addEventListener('click', function () { NV.audio.play('select'); reset(); });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'KeyS') { e.preventDefault(); stepBtn.click(); }
    else if (e.code === 'KeyR') { e.preventDefault(); reset(); }
  });
  reset();
})();
