/* Neon Vault ORIGINAL — Neon Life. Conway's Game of Life, charged with neon. */
(function () {
  'use strict';
  var canvas = document.getElementById('lifeCanvas');
  var ctx = canvas.getContext('2d');
  var genEl = document.getElementById('generation');
  var popEl = document.getElementById('population');
  var playBtn = document.getElementById('playBtn');
  var stepBtn = document.getElementById('stepBtn');
  var randomBtn = document.getElementById('randomBtn');
  var clearBtn = document.getElementById('clearBtn');
  var speedRange = document.getElementById('speedRange');
  var presetsWrap = document.getElementById('presets');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);

  var COLS = 66, ROWS = 44, CELL = 10; /* 660 x 440 */
  var grid = new Uint8Array(COLS * ROWS);
  var next = new Uint8Array(COLS * ROWS);
  var age = new Uint8Array(COLS * ROWS);
  var generation = 0, playing = false, acc = 0, lastTs = null;

  function idx(x, y) { return y * COLS + x; }
  function population() { var n = 0; for (var i = 0; i < grid.length; i++) n += grid[i]; return n; }
  function randomize() {
    for (var i = 0; i < grid.length; i++) grid[i] = Math.random() < 0.26 ? 1 : 0;
    age = new Uint8Array(grid.length);
    generation = 0;
    updateHud();
    draw();
  }
  function clearBoard() {
    grid = new Uint8Array(grid.length); age = new Uint8Array(grid.length);
    generation = 0; updateHud(); draw();
  }
  function step() {
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var n = 0;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          var nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          n += grid[idx(nx, ny)];
        }
        var i = idx(x, y);
        next[i] = (grid[i] ? (n === 2 || n === 3) : (n === 3)) ? 1 : 0;
      }
    }
    var t = grid; grid = next; next = t;
    for (var j = 0; j < age.length; j++) {
      if (grid[j]) age[j] = Math.min(255, age[j] + 1); else age[j] = 0;
    }
    generation++;
    updateHud();
  }
  function updateHud() { genEl.textContent = String(generation); popEl.textContent = String(population()); }

  var PRESETS = {
    'BLINKER': [[0, 0], [1, 0], [2, 0]],
    'GLIDER': [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
    'PULSAR': [[2, 0], [3, 0], [4, 0], [8, 0], [9, 0], [10, 0], [0, 2], [5, 2], [7, 2], [12, 2], [0, 3], [5, 3], [7, 3], [12, 3], [0, 4], [5, 4], [7, 4], [12, 4], [2, 5], [3, 5], [4, 5], [8, 5], [9, 5], [10, 5], [2, 7], [3, 7], [4, 7], [8, 7], [9, 7], [10, 7], [0, 8], [5, 8], [7, 8], [12, 8], [0, 9], [5, 9], [7, 9], [12, 9], [0, 10], [5, 10], [7, 10], [12, 10], [2, 12], [3, 12], [4, 12], [8, 12], [9, 12], [10, 12]],
    'R-PENTOMINO': [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
    'LWSS': [[1, 0], [4, 0], [0, 1], [0, 2], [4, 2], [0, 3], [1, 3], [2, 3], [3, 3]],
    'GOSPER GUN': [[24, 0], [22, 1], [24, 1], [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2], [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3], [0, 4], [1, 4], [10, 4], [16, 4], [20, 4], [21, 4], [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5], [22, 5], [24, 5], [10, 6], [16, 6], [24, 6], [11, 7], [15, 7], [12, 8], [13, 8]]
  };
  function dropPreset(name) {
    var cells = PRESETS[name];
    var maxX = 0, maxY = 0;
    cells.forEach(function (c) { if (c[0] > maxX) maxX = c[0]; if (c[1] > maxY) maxY = c[1]; });
    var ox = Math.floor((COLS - maxX) / 2), oy = Math.floor((ROWS - maxY) / 2);
    clearBoard();
    cells.forEach(function (c) { var i = idx(c[0] + ox, c[1] + oy); if (i >= 0 && i < grid.length) grid[i] = 1; });
    generation = 0;
    updateHud();
    draw();
  }
  Object.keys(PRESETS).forEach(function (name) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nl-chip';
    b.textContent = name;
    b.addEventListener('click', function () { NV.audio.play('select'); dropPreset(name); });
    presetsWrap.appendChild(b);
  });

  function draw() {
    ctx.fillStyle = '#0d0a1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var i = idx(x, y);
        if (!grid[i]) continue;
        var a = Math.min(1, (age[i] + 1) / 14); /* newborns burn white-hot, elders settle into lime */
        ctx.fillStyle = 'rgba(' + Math.round(140 + 115 * a) + ', 255, ' + Math.round(70 + 150 * (1 - a)) + ', 1)';
        ctx.shadowColor = '#a6ff3f';
        ctx.shadowBlur = a > 0.85 ? 0 : 7;
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        ctx.shadowBlur = 0;
      }
    }
    /* faint grid lines */
    ctx.strokeStyle = 'rgba(178, 107, 255, .07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 0; gx <= COLS; gx += 6) { ctx.moveTo(gx * CELL + .5, 0); ctx.lineTo(gx * CELL + .5, canvas.height); }
    for (var gy = 0; gy <= ROWS; gy += 6) { ctx.moveTo(0, gy * CELL + .5); ctx.lineTo(canvas.width, gy * CELL + .5); }
    ctx.stroke();
  }

  function frame(ts) {
    if (!playing) return;
    if (lastTs === null) lastTs = ts;
    var dt = ts - lastTs; lastTs = ts;
    var gensPerSec = parseInt(speedRange.value, 10) * 2; /* slider 1-20 -> 2-40 gen/s */
    acc += dt / 1000 * gensPerSec;
    var stepped = 0;
    while (acc >= 1 && stepped < 8) { step(); acc -= 1; stepped++; }
    if (stepped) draw();
    requestAnimationFrame(frame);
  }
  function togglePlay() {
    playing = !playing;
    playBtn.textContent = playing ? 'PAUSE' : 'PLAY';
    lastTs = null; acc = 0;
    if (playing) requestAnimationFrame(frame);
    NV.audio.play('select');
  }
  playBtn.addEventListener('click', togglePlay);
  stepBtn.addEventListener('click', function () { NV.audio.play('tick'); step(); draw(); });
  randomBtn.addEventListener('click', function () { NV.audio.play('select'); randomize(); });
  clearBtn.addEventListener('click', function () { NV.audio.play('select'); clearBoard(); });

  /* pointer painting — paint cells on, drag to draw */
  var painting = false, paintValue = 1;
  function cellFromEvent(e) {
    var rect = canvas.getBoundingClientRect();
    var x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width) / CELL);
    var y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height) / CELL);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
    return { x: x, y: y };
  }
  canvas.addEventListener('pointerdown', function (e) {
    var cell = cellFromEvent(e); if (!cell) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    painting = true;
    paintValue = grid[idx(cell.x, cell.y)] ? 0 : 1;
    grid[idx(cell.x, cell.y)] = paintValue;
    age[idx(cell.x, cell.y)] = paintValue ? 1 : 0;
    updateHud(); draw();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!painting) return;
    var cell = cellFromEvent(e); if (!cell) return;
    var i = idx(cell.x, cell.y);
    if (grid[i] !== paintValue) {
      grid[i] = paintValue;
      age[i] = paintValue ? 1 : 0;
      updateHud(); draw();
    }
  });
  function endPaint() { painting = false; }
  canvas.addEventListener('pointerup', endPaint);
  canvas.addEventListener('pointercancel', endPaint);

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'KeyS') { e.preventDefault(); step(); draw(); }
    else if (e.code === 'KeyR') { e.preventDefault(); randomize(); }
    else if (e.code === 'KeyC') { e.preventDefault(); clearBoard(); }
  });

  randomize();
})();
