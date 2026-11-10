/* Neon Vault — homepage logic: registry, search, filter, recent, toggles. */
(function () {
  'use strict';

  var GAMES = [
    { slug: 'snake', name: 'Snake', cat: 'Classic', accent: '#a6ff3f',
      desc: 'Guide the neon serpent. Eat orbs, grow long, never bite yourself.',
      icon: '<path d="M3 17h6v-6h6V7h6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/><circle cx="21" cy="5" r="1.6" fill="currentColor"/><rect x="19" y="11" width="2.4" height="2.4" fill="currentColor"/>' },
    { slug: 'tetris', name: 'Tetris', cat: 'Puzzle', accent: '#b26bff',
      desc: 'Stack the falling tetrominoes. Clear lines. Chase the top-out glow.',
      icon: '<g fill="currentColor"><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="3" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/><rect x="15" y="9" width="6" height="6" rx="1"/></g>' },
    { slug: 'breakout', name: 'Breakout', cat: 'Classic', accent: '#ffc247',
      desc: 'One ball, one paddle, a wall of bricks. Classic arcade physics.',
      icon: '<g fill="currentColor"><rect x="3" y="4.5" width="5.4" height="2.6" rx=".6"/><rect x="9.3" y="4.5" width="5.4" height="2.6" rx=".6"/><rect x="15.6" y="4.5" width="5.4" height="2.6" rx=".6"/><rect x="6.1" y="9.3" width="5.4" height="2.6" rx=".6"/><rect x="12.5" y="9.3" width="5.4" height="2.6" rx=".6"/></g><circle cx="12" cy="15.6" r="1.7" fill="currentColor"/><rect x="6" y="19.4" width="12" height="1.9" rx=".95" fill="currentColor"/>' },
    { slug: 'pong', name: 'Pong vs CPU', cat: 'Classic', accent: '#eceaff',
      desc: 'The original duel. Outsmart the vault\u2019s own paddle intelligence.',
      icon: '<rect x="4" y="7" width="2.6" height="10" rx="1.3" fill="currentColor"/><rect x="17.4" y="7" width="2.6" height="10" rx="1.3" fill="currentColor" opacity=".55"/><rect x="11" y="11" width="2.4" height="2.4" fill="currentColor"/><path d="M12 3v2M12 11v2M12 19v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
    { slug: 'space-invaders', name: 'Space Invaders', cat: 'Action', accent: '#00e5ff',
      desc: 'Hold the line. Blast the descending swarm before it reaches you.',
      icon: '<path d="M7 4h2v2h2V4h2v2h2V4h2v3h2v3h-2v2h-2v2h-2v-2h-2v-2H9v2H7v-2H5v-2H3V7h2V4h2z" fill="currentColor" opacity=".92"/><rect x="6" y="21" width="12" height="1.6" fill="currentColor"/>' },
    { slug: 'minesweeper', name: 'Minesweeper', cat: 'Puzzle', accent: '#ffc247',
      desc: 'Every number is a clue. Flag the mines. Don\u2019t trust a single cell.',
      icon: '<circle cx="12" cy="14" r="6.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v4M5.6 6.6l2.6 2.6M18.4 6.6l-2.6 2.6M4 14h3M17 14h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="14" r="1.4" fill="currentColor"/>' },
    { slug: '2048', name: '2048', cat: 'Puzzle', accent: '#ff2ea6',
      desc: 'Slide and merge to 2048. One greedy move ruins the whole board.',
      icon: '<rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><g fill="currentColor"><rect x="6.4" y="6.4" width="4.6" height="4.6" rx="1" opacity=".55"/><rect x="13" y="6.4" width="4.6" height="4.6" rx="1" opacity=".8"/><rect x="6.4" y="13" width="4.6" height="4.6" rx="1" opacity=".8"/><rect x="13" y="13" width="4.6" height="4.6" rx="1"/></g>' },
    { slug: 'memory-match', name: 'Memory Match', cat: 'Puzzle', accent: '#00e5ff',
      desc: 'Six pairs of neon glyphs. Flip fast, forget never.',
      icon: '<rect x="3" y="6" width="11" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18 4l3 14-3 .8L15 6.4z" fill="currentColor" opacity=".8"/>' },
    { slug: 'echo', name: 'Echo', cat: 'Classic', accent: '#b26bff', original: true,
      desc: 'ORIGINAL — Simon says, vault edition. Watch the pattern, sing it back, survive the tempo.',
      icon: '<rect x="4" y="4" width="7" height="7" rx="2" fill="currentColor"/><rect x="13" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="13" y="13" width="7" height="7" rx="2" fill="currentColor" opacity=".45"/>' },
    { slug: 'tic-tac-toe', name: 'Tic-Tac-Toe', cat: 'Classic', accent: '#eceaff',
      desc: 'Three in a row against a minimax machine that never bluffs.',
      icon: '<path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".6"/><path d="M6.2 6.2l4 4m0-4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="15.4" cy="15.3" r="2.7" fill="none" stroke="currentColor" stroke-width="2"/>' },
    { slug: 'whack-a-mole', name: 'Whack-a-Mole', cat: 'Action', accent: '#ff4d5e',
      desc: 'Forty-five seconds, nine holes, zero mercy. Golden moles pay double.',
      icon: '<path d="M6 15a6 6 0 0 1 12 0" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8.5 11.5 7 8m8.5 3.5L17 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10.4" cy="12.6" r=".9" fill="currentColor"/><circle cx="13.6" cy="12.6" r=".9" fill="currentColor"/><path d="M4 19h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' },
    { slug: 'neon-sort', name: 'Neon Sort', cat: 'Learn', accent: '#ffd23f', original: true,
      desc: 'ORIGINAL — Watch six algorithms race under neon light, then name them blind in Guess That Sort.',
      icon: '<g fill="currentColor"><rect x="3.5" y="13" width="4" height="7" rx="1" opacity=".55"/><rect x="10" y="9" width="4" height="11" rx="1" opacity=".75"/><rect x="16.5" y="4" width="4" height="16" rx="1"/></g>' },
    { slug: 'comet-catcher', name: 'Comet Catcher', cat: 'Original', accent: '#ff2ea6', original: true,
      desc: 'ORIGINAL — Pilot the VAULT-9 scoop. Catch comets, dodge meteors, survive the storm.',
      icon: '<path d="M4 18 14 8M6 21 16 11M3 13 9 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".6"/><path d="M14.5 3.5 20 4l.5 5.5-4 4-5-5z" fill="currentColor"/>' },
    { slug: 'signal-pulse', name: 'Signal Pulse', cat: 'Original', accent: '#ffc247', original: true,
      desc: 'ORIGINAL — One button. One rotating beam. Fire only inside the beacon arc.',
      icon: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" opacity=".45"/><path d="M12 12 18 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 3a9 9 0 0 1 7.8 4.5" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="currentColor"/>' }
  ];

  var CATEGORIES = ['All', 'Action', 'Puzzle', 'Classic', 'Original', 'Learn'];
  var grid = document.getElementById('gameGrid');
  var emptyState = document.getElementById('emptyState');
  var searchInput = document.getElementById('searchInput');
  var chipsWrap = document.getElementById('categoryChips');
  var visibleCount = document.getElementById('visibleCount');
  var recentShelf = document.getElementById('recentShelf');
  var recentRow = document.getElementById('recentRow');
  var activeCategory = 'All';
  var query = '';

  function gameBySlug(slug) {
    for (var i = 0; i < GAMES.length; i++) { if (GAMES[i].slug === slug) return GAMES[i]; }
    return null;
  }

  function cardHTML(game) {
    var best = NV.best ? NV.best.get(game.slug) : 0;
    var badge = game.original ? '<span class="badge-original">VAULT ORIGINAL</span>' : '';
    return '' +
      '<a class="game-card" href="games/' + game.slug + '/index.html" data-slug="' + game.slug + '" style="--accent:' + game.accent + '" aria-label="Play ' + game.name + '">' +
        badge +
        '<span class="card-art" style="color:' + game.accent + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + game.icon + '</svg></span>' +
        '<h3 class="card-name">' + game.name.toUpperCase() + '</h3>' +
        '<p class="card-desc">' + game.desc + '</p>' +
        '<span class="card-foot"><span class="card-cat">' + game.cat + '</span>' +
        '<span class="card-best">BEST <b>' + best + '</b></span></span>' +
      '</a>';
  }

  function matches(game) {
    var catOK = activeCategory === 'All' || game.cat === activeCategory;
    if (!catOK) return false;
    if (!query) return true;
    var hay = (game.name + ' ' + game.cat + ' ' + game.desc).toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function renderGrid() {
    var visible = GAMES.filter(matches);
    grid.innerHTML = visible.map(cardHTML).join('');
    emptyState.hidden = visible.length !== 0;
    visibleCount.textContent = String(visible.length);
  }

  function renderChips() {
    chipsWrap.innerHTML = CATEGORIES.map(function (cat) {
      var pressed = cat === activeCategory ? 'true' : 'false';
      return '<button class="chip" type="button" data-cat="' + cat + '" aria-pressed="' + pressed + '">' + cat + '</button>';
    }).join('');
  }

  function renderRecent() {
    if (!NV.recent) return;
    var slugs = NV.recent.list().filter(gameBySlug).slice(0, 6);
    if (!slugs.length) { recentShelf.hidden = true; return; }
    recentShelf.hidden = false;
    recentRow.innerHTML = slugs.map(function (slug) {
      var g = gameBySlug(slug);
      return '<a class="recent-chip" href="games/' + g.slug + '/index.html" data-slug="' + g.slug + '" style="color:' + g.accent + '">' +
        '<span class="rc-icon"><svg viewBox="0 0 24 24" aria-hidden="true">' + g.icon + '</svg></span>' +
        '<span style="color:var(--text)"><small>CABINET</small><b>' + g.name + '</b></span>' +
      '</a>';
    }).join('');
  }

  /* ---------- Events ---------- */
  chipsWrap.addEventListener('click', function (event) {
    var btn = event.target.closest('.chip');
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    if (NV.audio) NV.audio.play('select');
    renderChips();
    renderGrid();
  });

  var debounceTimer = null;
  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      query = searchInput.value.trim().toLowerCase();
      renderGrid();
    }, 110);
  });

  document.addEventListener('click', function (event) {
    var link = event.target.closest('[data-slug]');
    if (!link) return;
    if (NV.recent) NV.recent.push(link.dataset.slug);
    if (NV.audio) { NV.audio.unlock(); NV.audio.play('coin'); }
  });

  var randomBtn = document.getElementById('randomGameBtn');
  if (randomBtn) {
    randomBtn.addEventListener('click', function () {
      var pick = GAMES[Math.floor(Math.random() * GAMES.length)];
      if (NV.recent) NV.recent.push(pick.slug);
      if (NV.audio) { NV.audio.unlock(); NV.audio.play('coin'); }
      window.location.href = 'games/' + pick.slug + '/index.html';
    });
  }

  /* mute + CRT toggles */
  var muteBtn = document.getElementById('muteToggle');
  if (muteBtn && NV.setupMuteButton) NV.setupMuteButton(muteBtn);

  var crtBtn = document.getElementById('crtToggle');
  function syncCrt() {
    var on = document.body.classList.contains('crt');
    if (crtBtn) { crtBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); crtBtn.classList.toggle('is-off', !on); }
  }
  try { if (localStorage.getItem('nv.crt') === '1') document.body.classList.add('crt'); } catch (e) { /* ignore */ }
  if (crtBtn) {
    crtBtn.addEventListener('click', function () {
      var on = document.body.classList.toggle('crt');
      try { localStorage.setItem('nv.crt', on ? '1' : '0'); } catch (e) { /* ignore */ }
      if (NV.audio) NV.audio.play('blip');
      syncCrt();
    });
    syncCrt();
  }

  /* ticker marquee — duplicated for a seamless loop */
  var ticker = document.getElementById('tickerInner');
  if (ticker) {
    var seq = GAMES.map(function (g) { return '<b>◆</b> ' + g.name.toUpperCase(); }).join(' ');
    ticker.innerHTML = '<span>' + seq + '</span><span>' + seq + '</span>';
  }

  /* Konami code → turbo hue spin */
  var konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var konamiIndex = 0;
  var toast = null;
  function showToast(message) {
    if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast); }
    toast.textContent = message;
    requestAnimationFrame(function () { toast.classList.add('is-visible'); });
    setTimeout(function () { toast.classList.remove('is-visible'); }, 2600);
  }
  document.addEventListener('keydown', function (event) {
    var key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === konami[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konami.length) {
        konamiIndex = 0;
        document.body.classList.add('turbo');
        if (NV.audio) NV.audio.play('win');
        showToast('1UP — TURBO MODE');
        setTimeout(function () { document.body.classList.remove('turbo'); }, 6000);
      }
    } else {
      konamiIndex = key === konami[0] ? 1 : 0;
    }
  });

  renderChips();
  renderGrid();
  renderRecent();
})();
