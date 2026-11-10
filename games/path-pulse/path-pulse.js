/* Neon Vault ORIGINAL — Path Pulse. BFS, Dijkstra, A*, Greedy Best-First on a neon maze. */
(function () {
  'use strict';
  var canvas = document.getElementById('mazeCanvas');
  var ctx = canvas.getContext('2d');
  var visitedEl = document.getElementById('visitedCount');
  var pathCostEl = document.getElementById('pathCost');
  var pathLengthEl = document.getElementById('pathLength');
  var statusEl = document.getElementById('status');
  var runBtn = document.getElementById('runBtn');
  var stepBtn = document.getElementById('stepBtn');
  var newMazeBtn = document.getElementById('newMazeBtn');
  var chipsWrap = document.getElementById('algoChips');
  var speedRange = document.getElementById('speedRange');
  var wallRange = document.getElementById('wallRange');
  var muteBtn = document.getElementById('muteBtn');
  if (NV.setupMuteButton) NV.setupMuteButton(muteBtn);

  var COLS = 22, ROWS = 12, CELL = 30;
  var START = { x: 1, y: 6 }, GOAL = { x: COLS - 2, y: 6 };
  var ROUGH_COST = 5;

  var ALGOS = [
    { key: 'bfs', name: 'BFS', note: 'Breadth-First — explores ring by ring. Sees walls, ignores terrain cost.', optimal: false },
    { key: 'dijkstra', name: 'DIJKSTRA', note: 'Dijkstra — always expands the cheapest node. Optimal, respects rough ground.', optimal: true },
    { key: 'astar', name: 'A*', note: 'A* — f = g + h. Same optimal guarantee as Dijkstra, far fewer expansions.', optimal: true },
    { key: 'greedy', name: 'GREEDY', note: 'Greedy Best-First — chases the heuristic hungrily. Fast, not optimal.', optimal: false }
  ];

  var walls, rough, anim, currentAlgo = 'astar', running = false, rafId = null;

  /* ---------- heap (binary min-heap keyed by .k) ---------- */
  function Heap() { this.a = []; }
  Heap.prototype.push = function (item) { this.a.push(item); this._up(this.a.length - 1); };
  Heap.prototype.pop = function () {
    var top = this.a[0], last = this.a.pop();
    if (this.a.length) { this.a[0] = last; this._down(0); }
    return top;
  };
  Heap.prototype.size = function () { return this.a.length; };
  Heap.prototype._up = function (i) {
    while (i > 0) {
      var p = (i - 1) >> 1;
      if (this.a[p].k <= this.a[i].k) break;
      var t = this.a[p]; this.a[p] = this.a[i]; this.a[i] = t; i = p;
    }
  };
  Heap.prototype._down = function (i) {
    var n = this.a.length;
    for (;;) {
      var l = 2 * i + 1, r = l + 1, s = i;
      if (l < n && this.a[l].k < this.a[s].k) s = l;
      if (r < n && this.a[r].k < this.a[s].k) s = r;
      if (s === i) break;
      var t = this.a[s]; this.a[s] = this.a[i]; this.a[i] = t; i = s;
    }
  };

  function idx(x, y) { return y * COLS + x; }
  function manhattan(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
  function neighbors(x, y) {
    var out = [];
    var d = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < 4; i++) {
      var nx = x + d[i][0], ny = y + d[i][1];
      if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && !walls[idx(nx, ny)]) out.push({ x: nx, y: ny });
    }
    return out;
  }
  function moveCost(x, y) { return rough[idx(x, y)] ? ROUGH_COST : 1; }

  function solve(algoKey) {
    var total = COLS * ROWS;
    var gScore = new Float64Array(total); for (var i = 0; i < total; i++) gScore[i] = Infinity;
    var cameFrom = new Int16Array(total); cameFrom.fill(-1);
    var closed = new Uint8Array(total);
    var order = [];
    var startIdx = idx(START.x, START.y), goalIdx = idx(GOAL.x, GOAL.y);
    gScore[startIdx] = 0;
    var frontier = new Heap();
    frontier.push({ i: startIdx, k: 0 });
    if (algoKey === 'bfs') {
      /* queue semantics with a tiny tweak so rough still animates fine */
      var q = [[START.x, START.y, 0]];
      var bfsDist = new Int32Array(total); bfsDist.fill(-1);
      bfsDist[startIdx] = 0;
      var qi = 0;
      var parent = new Int16Array(total); parent.fill(-1);
      while (qi < q.length) {
        var cell = q[qi++]; var cx = cell[0], cy = cell[1]; var ci = idx(cx, cy);
        order.push({ x: cx, y: cy });
        if (ci === goalIdx) break;
        var ns = neighbors(cx, cy);
        for (var n = 0; n < ns.length; n++) {
          var ni = idx(ns[n].x, ns[n].y);
          if (bfsDist[ni] === -1) { bfsDist[ni] = bfsDist[ci] + 1; parent[ni] = ci; q.push([ns[n].x, ns[n].y, 0]); }
        }
      }
      return finish(order, parent, goalIdx, total);
    }
    while (frontier.size()) {
      var node = frontier.pop();
      var ci2 = node.i;
      if (closed[ci2]) continue;
      closed[ci2] = 1;
      var cx2 = ci2 % COLS, cy2 = (ci2 - cx2) / COLS;
      order.push({ x: cx2, y: cy2 });
      if (ci2 === goalIdx) break;
      var f2 = neighbors(cx2, cy2);
      for (var n2 = 0; n2 < f2.length; n2++) {
        var nx2 = f2[n2].x, ny2 = f2[n2].y, ni2 = idx(nx2, ny2);
        if (closed[ni2]) continue;
        var tentative = gScore[ci2] + moveCost(nx2, ny2);
        if (tentative < gScore[ni2]) {
          gScore[ni2] = tentative;
          cameFrom[ni2] = ci2;
          var h = manhattan({ x: nx2, y: ny2 }, GOAL);
          var k = algoKey === 'dijkstra' ? tentative : algoKey === 'astar' ? tentative + h : h;
          frontier.push({ i: ni2, k: k });
        }
      }
    }
    return finish(order, cameFrom, goalIdx, total);
  }
  function finish(order, parent, goalIdx, total) {
    var found = parent[goalIdx] !== -1 || idx(START.x, START.y) === goalIdx;
    var path = [];
    if (found) {
      var cur = goalIdx, guard = 0;
      while (cur !== -1 && guard++ <= total) { path.push(cur); cur = parent[cur]; }
      path.reverse();
    }
    var cost = 0;
    for (var i = 1; i < path.length; i++) { var p = path[i]; cost += moveCost(p % COLS, ((p - (p % COLS)) / COLS) | 0); }
    return { order: order, path: path, found: found, cost: cost };
  }

  function newMaze() {
    var density = parseInt(wallRange.value, 10) / 100;
    var attempt = 0;
    do {
      walls = new Uint8Array(COLS * ROWS);
      rough = new Uint8Array(COLS * ROWS);
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
        var i = idx(x, y);
        var isSafe = (Math.abs(x - START.x) + Math.abs(y - START.y) <= 1) || (Math.abs(x - GOAL.x) + Math.abs(y - GOAL.y) <= 1);
        if (isSafe) continue;
        if (Math.random() < density) walls[i] = 1;
        else if (Math.random() < 0.13) rough[i] = 1;
      }
      attempt++;
    } while (!bfsSolvable() && attempt < 300);
    resetRun();
    statusEl.textContent = 'READY — pick an algorithm, hit RUN';
  }
  function bfsSolvable() {
    var seen = new Uint8Array(COLS * ROWS), q = [[START.x, START.y]]; seen[idx(START.x, START.y)] = 1;
    for (var h = 0; h < q.length; h++) {
      var ns = neighbors(q[h][0], q[h][1]);
      for (var i = 0; i < ns.length; i++) {
        var j = idx(ns[i].x, ns[i].y);
        if (seen[j]) continue;
        if (j === idx(GOAL.x, GOAL.y)) return true;
        seen[j] = 1; q.push([ns[i].x, ns[i].y]);
      }
    }
    return false;
  }

  function resetRun() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null; running = false;
    anim = null;
    runBtn.textContent = 'RUN';
    visitedEl.textContent = '0';
    pathCostEl.textContent = '–';
    pathLengthEl.textContent = '–';
    draw();
  }

  function startAnim(restart) {
    if (!anim || restart) {
      var result = solve(currentAlgo);
      anim = {
        order: result.order, path: result.path, found: result.found, cost: result.cost,
        reveal: 0, pathReveal: 0, done: false
      };
    }
    if (anim.done) { /* finished already — replay from scratch on RUN */ anim = null; startAnim(true); return; }
    running = !running;
    runBtn.textContent = running ? 'PAUSE' : 'RUN';
    statusEl.textContent = running ? algoName(currentAlgo) + ' — searching…' : 'PAUSED';
    if (running) tick();
  }
  function algoName(key) { for (var i = 0; i < ALGOS.length; i++) if (ALGOS[i].key === key) return ALGOS[i].name; return key; }
  function algoNote(key) { for (var i = 0; i < ALGOS.length; i++) if (ALGOS[i].key === key) return ALGOS[i].note; return ''; }

  function tick() {
    if (!running) return;
    var steps = parseInt(speedRange.value, 10);
    var total = anim.order.length;
    var before = anim.reveal;
    anim.reveal = Math.min(total, anim.reveal + steps);
    if (anim.reveal < total) {
      if (Math.floor(anim.reveal / 25) !== Math.floor(before / 25)) NV.audio.play('tick');
    } else if (anim.pathReveal === 0) {
      /* entering path phase */
      if (anim.found) { NV.audio.play('win'); } else { NV.audio.play('over'); }
    }
    if (anim.reveal >= total && anim.found) {
      anim.pathReveal = Math.min(anim.path.length, anim.pathReveal + Math.max(2, steps));
      if (anim.pathReveal >= anim.path.length && !anim.done) {
        anim.done = true; running = false; runBtn.textContent = 'RUN';
        pathCostEl.textContent = String(anim.cost);
        pathLengthEl.textContent = String(anim.path.length);
        statusEl.textContent = 'PATH FOUND — cost ' + anim.cost + ' · ' + anim.path.length + ' cells';
        draw();
        return;
      }
    } else if (anim.reveal >= total && !anim.found && !anim.done) {
      anim.done = true; running = false; runBtn.textContent = 'RUN';
      statusEl.textContent = 'NO PATH — hit NEW MAZE';
      pathCostEl.textContent = '∞'; pathLengthEl.textContent = '0';
      draw();
      return;
    }
    visitedEl.textContent = String(anim.reveal);
    draw();
    rafId = requestAnimationFrame(tick);
  }
  function stepOnce() {
    if (anim && anim.done) return;
    if (!anim) { startAnim(true); running = false; runBtn.textContent = 'RUN'; }
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    var steps = 1;
    var total = anim.order.length;
    anim.reveal = Math.min(total, anim.reveal + steps);
    if (anim.reveal >= total && anim.found) anim.pathReveal = Math.min(anim.path.length, anim.pathReveal + 1);
    visitedEl.textContent = String(anim.reveal);
    if (anim.found && anim.pathReveal >= anim.path.length) {
      anim.done = true;
      pathCostEl.textContent = String(anim.cost);
      pathLengthEl.textContent = String(anim.path.length);
      statusEl.textContent = 'PATH FOUND — cost ' + anim.cost + ' · ' + anim.path.length + ' cells';
    } else if (!anim.found && anim.reveal >= total) {
      anim.done = true;
      statusEl.textContent = 'NO PATH — hit NEW MAZE';
      pathCostEl.textContent = '∞'; pathLengthEl.textContent = '0';
    } else {
      statusEl.textContent = algoName(currentAlgo) + ' — stepping…';
    }
    runBtn.textContent = 'RUN';
    draw();
  }

  /* ---------- rendering ---------- */
  function drawCellFrame(x, y, fill, glow) {
    var px = x * CELL, py = y * CELL;
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); }
    if (glow) { ctx.strokeStyle = glow; ctx.lineWidth = 2; ctx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3); }
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    /* rough terrain */
    var i, x, y;
    for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
      i = idx(x, y);
      if (walls[i]) {
        var g = ctx.createLinearGradient(x * CELL, y * CELL, x * CELL + CELL, y * CELL + CELL);
        g.addColorStop(0, '#5b3df0'); g.addColorStop(1, '#3c2380');
        drawCellFrame(x, y, g);
      } else if (rough[i]) {
        drawCellFrame(x, y, '#241d12');
        ctx.fillStyle = 'rgba(255, 194, 71, .75)';
        var d = 3;
        ctx.beginPath(); ctx.arc(x * CELL + d + 3, y * CELL + d + 3, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x * CELL + CELL - d - 3, y * CELL + CELL - d - 3, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    /* visited wave — cyan, brighter near the frontier */
    if (anim) {
      for (i = 0; i < anim.reveal; i++) {
        var c = anim.order[i];
        if (idx(c.x, c.y) === idx(START.x, START.y) || idx(c.x, c.y) === idx(GOAL.x, GOAL.y)) continue;
        var t = anim.reveal > 1 ? i / anim.reveal : 1;
        var alpha = 0.22 + 0.5 * Math.pow(t, 2.6);
        drawCellFrame(c.x, c.y, 'rgba(0, 229, 255,' + alpha.toFixed(3) + ')');
      }
      /* frontier pulse — the newest expanded node burns amber */
      if (anim.reveal > 0 && anim.reveal <= anim.order.length) {
        var f = anim.order[anim.reveal - 1];
        drawCellFrame(f.x, f.y, null, '#ffc247');
      }
      /* path — lime tracer with glow */
      if (anim.pathReveal > 1) {
        ctx.save();
        ctx.strokeStyle = '#a6ff3f';
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.shadowColor = '#a6ff3f'; ctx.shadowBlur = 12;
        ctx.beginPath();
        for (i = 0; i < anim.pathReveal; i++) {
          var p = anim.path[i], px = (p % COLS) * CELL + CELL / 2, py = (((p - (p % COLS)) / COLS) | 0) * CELL + CELL / 2;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
    /* start + goal markers */
    drawMarker(START.x, START.y, '#a6ff3f', true);
    drawMarker(GOAL.x, GOAL.y, '#ff2ea6', false);
  }
  function drawMarker(cx, cy, color, isStart) {
    var px = cx * CELL + CELL / 2, py = cy * CELL + CELL / 2;
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (isStart) ctx.arc(px, py, CELL * 0.27, 0, Math.PI * 2);
    else {
      var r = CELL * 0.3;
      for (var i = 0; i < 5; i++) {
        var a = -Math.PI / 2 + (i * 2 * Math.PI / 5), a2 = a + Math.PI / 5;
        var x1 = px + Math.cos(a) * r, y1 = py + Math.sin(a) * r;
        var x2 = px + Math.cos(a2) * r * 0.45, y2 = py + Math.sin(a2) * r * 0.45;
        if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  /* ---------- controls ---------- */
  function selectAlgo(key) {
    currentAlgo = key;
    for (var i = 0; i < chipsWrap.children.length; i++) {
      chipsWrap.children[i].classList.toggle('is-active', chipsWrap.children[i].dataset.algo === key);
    }
    resetRun();
    statusEl.textContent = 'READY — ' + algoNote(key);
    NV.audio.play('select');
  }
  ALGOS.forEach(function (a) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pp-chip' + (a.key === currentAlgo ? ' is-active' : '');
    b.textContent = a.name;
    b.dataset.algo = a.key;
    b.title = a.note;
    b.addEventListener('click', function () { selectAlgo(a.key); });
    chipsWrap.appendChild(b);
  });
  runBtn.addEventListener('click', function () { NV.audio.play('select'); startAnim(false); });
  stepBtn.addEventListener('click', function () { NV.audio.play('tick'); stepOnce(); });
  newMazeBtn.addEventListener('click', function () { NV.audio.play('select'); newMaze(); });
  speedRange.addEventListener('input', function () {});
  wallRange.addEventListener('change', function () { NV.audio.play('select'); newMaze(); });

  document.addEventListener('keydown', function (e) {
    var map = { Digit1: 'bfs', Digit2: 'dijkstra', Digit3: 'astar', Digit4: 'greedy' };
    if (e.code in map) { e.preventDefault(); selectAlgo(map[e.code]); return; }
    if (e.code === 'Space') { e.preventDefault(); startAnim(false); }
    else if (e.code === 'KeyS') { e.preventDefault(); stepOnce(); }
    else if (e.code === 'KeyR') { e.preventDefault(); newMaze(); }
  });

  newMaze();
})();
