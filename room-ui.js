"use strict";
/**
 * room-ui.js — Modal system, Bento grid morphing, lobby roster, leaderboard
 * Manages all multiplayer UI: setup modal, lobby, in-game leaderboard, post-game.
 */
(function () {
  var mp = null; // MultiplayerManager instance
  var overlay, modal, screens = {};
  var originalCardAbout = '', originalCardLegend = '', originalCardActions = '';
  var countdownOverlay = null;

  function init() {
    if (typeof MultiplayerManager === 'undefined') return;
    mp = new MultiplayerManager();
    window._mp = mp;
    cacheOriginalCards();
    bindFAB();
    bindModalClose();
    bindScreens();
    bindMPEvents();
    handleDeepLink();
    checkPeerAvailability();
  }

  function checkPeerAvailability() {
    if (typeof Peer === 'undefined') {
      var fab = document.getElementById('mp-fab');
      if (fab) { fab.disabled = true; fab.title = 'PeerJS not loaded — disable ad-blocker'; }
    }
  }

  function cacheOriginalCards() {
    var ca = document.getElementById('card-about');
    var cl = document.getElementById('card-legend');
    var cact = document.getElementById('card-actions');
    if (ca) originalCardAbout = ca.innerHTML;
    if (cl) originalCardLegend = cl.innerHTML;
    if (cact) originalCardActions = cact.innerHTML;
  }

  // ── FAB ──
  function bindFAB() {
    var fab = document.getElementById('mp-fab');
    if (!fab) return;
    fab.addEventListener('click', function () {
      if (fab.disabled) return;
      openModal(); showScreen('identity');
    });
  }

  // ── Modal open/close ──
  function openModal() {
    overlay = document.getElementById('mp-modal-overlay');
    if (overlay) overlay.classList.add('mp-modal-overlay--open');
  }
  function closeModal() {
    overlay = document.getElementById('mp-modal-overlay');
    if (overlay) overlay.classList.remove('mp-modal-overlay--open');
  }

  function bindModalClose() {
    var btn = document.getElementById('mp-modal-close');
    if (btn) btn.addEventListener('click', function () {
      closeModal();
      if (mp && mp.state !== MP_STATES.IN_GAME && mp.state !== MP_STATES.COUNTDOWN) mp.destroy();
    });
    // Close on overlay click
    overlay = document.getElementById('mp-modal-overlay');
    if (overlay) overlay.addEventListener('click', function (e) {
      if (e.target === overlay) { closeModal(); if (mp && mp.state !== MP_STATES.IN_GAME && mp.state !== MP_STATES.COUNTDOWN) mp.destroy(); }
    });
  }

  // ── Screen switching ──
  function showScreen(name) {
    var all = document.querySelectorAll('.mp-screen');
    for (var i = 0; i < all.length; i++)all[i].classList.remove('mp-screen--active');
    var el = document.getElementById('mp-screen-' + name);
    if (el) el.classList.add('mp-screen--active');
  }

  function bindScreens() {
    // Identity → Create
    var btnCreate = document.getElementById('mp-btn-create');
    if (btnCreate) btnCreate.addEventListener('click', function () {
      var name = getNameInput();
      localStorage.setItem('mp_player_name', name);
      mp.createRoom(name);
    });
    // Identity → Join
    var btnJoinNav = document.getElementById('mp-btn-join-nav');
    if (btnJoinNav) btnJoinNav.addEventListener('click', function () {
      var name = getNameInput();
      localStorage.setItem('mp_player_name', name);
      // Check if we have a deep link peer ID stored
      if (window._deepLinkPeerId) {
        showScreen('connecting');
        mp.joinRoom(window._deepLinkPeerId, name).catch(function () {
          window._deepLinkPeerId = null;
          showScreen('identity');
        });
      } else {
        // No deep link - show instructions
        showScreen('join');
      }
    });
    // Join → Back
    var btnBack = document.getElementById('mp-btn-back');
    if (btnBack) btnBack.addEventListener('click', function () { showScreen('identity'); });
    // Pre-fill name
    var saved = localStorage.getItem('mp_player_name') || '';
    var inp = document.getElementById('mp-name-input');
    if (inp && saved) inp.value = saved;
  }

  function getNameInput() {
    var inp = document.getElementById('mp-name-input');
    return inp ? inp.value.trim().slice(0, 16) || 'Player' : 'Player';
  }

  // ── MP Event Bindings ──
  function bindMPEvents() {
    mp.on('stateChange', function (d) { onStateChange(d.from, d.to); });
    mp.on('roomCreated', function (d) { onRoomCreated(d); });
    mp.on('lobbyUpdate', function (players) { renderLobbyRoster(players); });
    mp.on('countdown', function (d) { onCountdown(d); });
    mp.on('leaderboardUpdate', function (entries) { renderLeaderboard(entries); });
    mp.on('gameEnd', function (d) { onGameEnd(d); });
    mp.on('settingsSync', function (s) { applySettingsFromHost(s); });
    mp.on('playerDied', function (d) { showWaitingOverlay(d); });
    // Listen for ACCEPT to show client lobby
    mp.on('stateChange', function (d) {
      if (d.to === MP_STATES.LOBBY_CLIENT) {
        showScreen('lobby-client');
        renderLobbyRoster(mp._playerArray());
      }
      // ★ Handle host migration - switch to host screen
      if (d.to === MP_STATES.LOBBY_HOST && d.from === MP_STATES.LOBBY_CLIENT) {
        showScreen('lobby-host');
        var codeEl = document.getElementById('mp-room-code');
        if (codeEl) codeEl.textContent = mp.roomCode;
        bindCopyBtn(mp.roomCode, mp.hostPeerId);
        bindStartBtn();
        renderLobbyRoster(mp._playerArray());
      }
    });
  }

  function onStateChange(from, to) {
    var fab = document.getElementById('mp-fab');
    // Update FAB badge
    if (to === MP_STATES.LOBBY_HOST || to === MP_STATES.LOBBY_CLIENT || to === MP_STATES.IN_GAME) {
      if (fab) fab.classList.add('mp-fab--pulse');
      updateFabBadge();
    } else {
      if (fab) { fab.classList.remove('mp-fab--pulse'); removeFabBadge(); }
    }
    // Morph bento cards
    if (to === MP_STATES.LOBBY_HOST || to === MP_STATES.LOBBY_CLIENT) morphCardsToLobby();
    else if (to === MP_STATES.IN_GAME) morphCardsToGame();
    else if (to === MP_STATES.IDLE) {
      restoreCards();
      var isGameOver = false;
      var all = document.querySelectorAll('.mp-screen');
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === 'mp-screen-gameover' && all[i].classList.contains('mp-screen--active')) isGameOver = true;
      }
      if (!isGameOver) closeModal();
    }
  }

  // ── Room Created (Host) ──
  function onRoomCreated(d) {
    showScreen('lobby-host');
    var codeEl = document.getElementById('mp-room-code');
    if (codeEl) codeEl.textContent = d.roomCode;
    bindCopyBtn(d.roomCode, d.hostPeerId);
    bindStartBtn();
    renderLobbyRoster(mp._playerArray());
  }

  function bindCopyBtn(code, hostPeerId) {
    var btn = document.getElementById('mp-copy-btn');
    if (!btn) return;
    btn.onclick = function () {
      // ★ Copy the full peer ID in the URL, not just the 6-char code
      var url = window.location.origin + window.location.pathname + '?room=' + hostPeerId;
      navigator.clipboard.writeText(url).then(function () {
        btn.textContent = 'Copied! ✓'; setTimeout(function () { btn.textContent = 'Copy 🔗'; }, 2000);
      }).catch(function () { btn.textContent = 'Failed'; setTimeout(function () { btn.textContent = 'Copy 🔗'; }, 2000); });
    };
  }

  function bindStartBtn() {
    var btn = document.getElementById('mp-btn-start');
    if (!btn) return;
    btn.onclick = function () { if (mp.canStart() || mp.players.size === 1) mp.startGame(); };
  }

  // ── Lobby Roster ──
  function renderLobbyRoster(players) {
    // Modal roster (host)
    var list = document.getElementById('mp-roster');
    if (list) {
      list.innerHTML = '';
      var count = document.getElementById('mp-player-count');
      if (count) count.textContent = 'Players (' + players.length + '/' + 6 + ')';
      for (var i = 0; i < players.length; i++) {
        var p = players[i];
        var li = document.createElement('li');
        li.className = 'mp-roster__player' + (p.id === mp.localPlayerId ? ' mp-roster__player--you' : '');
        var nameSpan = document.createElement('span');
        nameSpan.className = 'mp-roster__name';
        var nt = document.createElement('span'); nt.textContent = p.name + (p.id === mp.localPlayerId ? ' (You)' : '');
        nameSpan.appendChild(nt);
        var status = document.createElement('span');
        status.className = 'mp-roster__status';
        if (p.isHost) { status.className += ' mp-roster__status--host'; status.textContent = 'HOST'; }
        else if (p.isReady) { status.className += ' mp-roster__status--ready'; status.textContent = 'READY'; }
        else { status.className += ' mp-roster__status--waiting'; status.textContent = 'waiting...'; }
        li.appendChild(nameSpan); li.appendChild(status);
        list.appendChild(li);
      }
    }

    // Modal roster (client)
    var listClient = document.getElementById('mp-roster-client');
    if (listClient) {
      listClient.innerHTML = '';
      var countClient = document.getElementById('mp-player-count-client');
      if (countClient) countClient.textContent = 'Players (' + players.length + '/' + 6 + ')';
      var codeClient = document.getElementById('mp-room-code-client');
      if (codeClient) codeClient.textContent = mp.roomCode || '------';
      for (var i = 0; i < players.length; i++) {
        var p = players[i];
        var li = document.createElement('li');
        li.className = 'mp-roster__player' + (p.id === mp.localPlayerId ? ' mp-roster__player--you' : '');
        var nameSpan = document.createElement('span');
        nameSpan.className = 'mp-roster__name';
        var nt = document.createElement('span'); nt.textContent = p.name + (p.id === mp.localPlayerId ? ' (You)' : '');
        nameSpan.appendChild(nt);
        var status = document.createElement('span');
        status.className = 'mp-roster__status';
        if (p.isHost) { status.className += ' mp-roster__status--host'; status.textContent = 'HOST'; }
        else if (p.isReady) { status.className += ' mp-roster__status--ready'; status.textContent = 'READY'; }
        else { status.className += ' mp-roster__status--waiting'; status.textContent = 'waiting...'; }
        li.appendChild(nameSpan); li.appendChild(status);
        listClient.appendChild(li);
      }
    }

    // Also render in card-about if morphed
    var cardRoster = document.getElementById('mp-card-roster');
    if (cardRoster) {
      cardRoster.innerHTML = '';
      for (var i = 0; i < players.length; i++) {
        var p = players[i];
        var li = document.createElement('li');
        li.className = 'mp-roster__player' + (p.id === mp.localPlayerId ? ' mp-roster__player--you' : '');
        var nameSpan = document.createElement('span');
        nameSpan.className = 'mp-roster__name';
        var nt = document.createElement('span'); nt.textContent = p.name + (p.id === mp.localPlayerId ? ' (You)' : '');
        nameSpan.appendChild(nt);
        var status = document.createElement('span');
        status.className = 'mp-roster__status';
        if (p.isHost) { status.className += ' mp-roster__status--host'; status.textContent = 'HOST'; }
        else if (p.isReady) { status.className += ' mp-roster__status--ready'; status.textContent = 'READY'; }
        else { status.className += ' mp-roster__status--waiting'; status.textContent = 'waiting...'; }
        li.appendChild(nameSpan); li.appendChild(status);
        cardRoster.appendChild(li);
      }
    }

    // Update start button state
    updateStartBtn();
    updateFabBadge();
    // Ready button for client
    var readyBtn = document.getElementById('mp-ready-btn');
    if (readyBtn && !mp.isHost) {
      var me = mp.players.get(mp.localPlayerId);
      if (me) {
        readyBtn.innerHTML = me.isReady ? '<span>Not Ready</span><span class="mp-ready-icon">○</span>' : '<span>Ready</span><span class="mp-ready-icon">✓</span>';
        readyBtn.className = 'mp-ready-btn ' + (me.isReady ? 'mp-ready-btn--ready' : 'mp-ready-btn--unready');
        readyBtn.onclick = function () { mp.toggleReady(); };
      }
    }
  }

  function updateStartBtn() {
    var btn = document.getElementById('mp-btn-start');
    if (!btn || !mp.isHost) return;
    var canStart = mp.canStart() || mp.players.size === 1;
    btn.disabled = !canStart;
    var unready = 0; mp.players.forEach(function (p) { if (!p.isHost && !p.isReady) unready++; });
    btn.innerHTML = unready > 0 ? '<span>Start Game</span><span class="mp-btn-icon">▶</span><span>(' + unready + ' unready)</span>' : '<span>Start Game</span><span class="mp-btn-icon">▶</span>';
  }

  function updateFabBadge() {
    var fab = document.getElementById('mp-fab'); if (!fab) return;
    var existing = fab.querySelector('.mp-fab__badge');
    if (mp.players.size > 0) {
      if (!existing) { existing = document.createElement('span'); existing.className = 'mp-fab__badge'; fab.appendChild(existing); }
      existing.textContent = mp.players.size;
    }
  }

  function removeFabBadge() {
    var fab = document.getElementById('mp-fab'); if (!fab) return;
    var b = fab.querySelector('.mp-fab__badge'); if (b) b.remove();
  }

  // ── Bento Card Morphing ──
  function morphCardsToLobby() {
    var ca = document.getElementById('card-about');
    var cl = document.getElementById('card-legend');
    if (ca) {
      ca.classList.add('mp-morphed');
      ca.innerHTML = '<span class="card__label">Lobby</span><ul class="mp-roster" id="mp-card-roster"></ul>';
    }
    if (cl) {
      cl.classList.add('mp-morphed');
      cl.innerHTML = '<span class="card__label">Room Name</span><div class="mp-room-code-display"><span class="mp-room-code-text" style="font-size:16px;">' + (mp.roomCode || '------') + '</span></div>';
    }
    // Lock settings for clients
    if (!mp.isHost) lockSettings('Settings controlled by host');
    // Update actions card
    var cact = document.getElementById('card-actions');
    if (cact) {
      var sndBtn = cact.querySelector('.sound-btn');
      var sndHtml = sndBtn ? sndBtn.outerHTML : '';
      cact.innerHTML = sndHtml + '<button class="mp-btn mp-btn--danger" id="mp-leave-btn" type="button" style="font-size:8px;padding:8px 14px;">Leave Room</button>';
      var leave = document.getElementById('mp-leave-btn');
      if (leave) leave.addEventListener('click', function () { closeModal(); mp.destroy(); });
    }
    renderLobbyRoster(mp._playerArray());
  }

  function morphCardsToGame() {
    var ca = document.getElementById('card-about');
    var cl = document.getElementById('card-legend');
    if (ca) {
      ca.classList.add('mp-morphed', 'mp-leaderboard-mode');
      ca.innerHTML = '<div class="mp-game-header"><span class="card__label">🏆 Live Leaderboard</span><span class="mp-game-status">Game in Progress</span></div><ul class="mp-leaderboard" id="mp-live-lb"></ul>';
    }
    if (cl) cl.classList.add('mp-leaderboard-mode');
    lockSettings('Locked during game');
    // Score label
    var sl = document.getElementById('score-label');
    if (sl) sl.textContent = 'Your Score';
    // Actions: host gets End Game
    var cact = document.getElementById('card-actions');
    if (cact) {
      var sndBtn = cact.querySelector('.sound-btn');
      var sndHtml = sndBtn ? sndBtn.outerHTML : '';
      if (mp.isHost) {
        cact.innerHTML = '<div class="mp-game-actions">' + sndHtml + '<button class="mp-end-game-btn" id="mp-end-btn" type="button"><span class="mp-end-game-icon">⏹</span><span>End Game</span></button></div>';
        var end = document.getElementById('mp-end-btn');
        if (end) end.addEventListener('click', function () {
          if (confirm('End the game for all players?')) {
            mp.endGame();
          }
        });
      } else {
        cact.innerHTML = '<div class="mp-game-actions">' + sndHtml + '<span class="mp-game-info"><span class="mp-pulse-dot"></span>Multiplayer game in progress</span></div>';
      }
    }
  }

  function lockSettings(msg) {
    var cs = document.getElementById('card-settings');
    if (!cs || cs.querySelector('.mp-settings-lock')) return;
    var lock = document.createElement('div'); lock.className = 'mp-settings-lock';
    lock.innerHTML = '<span class="mp-settings-lock__text">🔒 ' + msg + '</span>';
    cs.appendChild(lock);
  }

  function unlockSettings() {
    var cs = document.getElementById('card-settings'); if (!cs) return;
    var lock = cs.querySelector('.mp-settings-lock'); if (lock) lock.remove();
  }

  function restoreCards() {
    var ca = document.getElementById('card-about');
    var cl = document.getElementById('card-legend');
    var cact = document.getElementById('card-actions');
    if (ca && originalCardAbout) { ca.innerHTML = originalCardAbout; ca.className = 'card card--about'; }
    if (cl && originalCardLegend) { cl.innerHTML = originalCardLegend; cl.className = 'card card--legend'; }
    if (cact && originalCardActions) cact.innerHTML = originalCardActions;
    unlockSettings();
    var sl = document.getElementById('score-label');
    if (sl) sl.textContent = 'High Score';
    removeFabBadge();
  }

  // ── Leaderboard Render ──
  function renderLeaderboard(entries) {
    var ul = document.getElementById('mp-live-lb');
    if (!ul) return;
    ul.innerHTML = '';
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var li = document.createElement('li');
      li.className = 'mp-lb-entry';
      if (e.playerId === mp.localPlayerId) li.className += ' mp-lb-entry--you';
      if (e.isDead) li.className += ' mp-lb-entry--dead';
      if (e.isDisconnected) li.className += ' mp-lb-entry--disconnected';
      var rank = document.createElement('span'); rank.className = 'mp-lb-rank'; rank.textContent = '#' + e.rank;
      var name = document.createElement('span'); name.className = 'mp-lb-name';
      name.textContent = e.playerName + (e.isDisconnected ? ' 📡' : '');
      var sc = document.createElement('span'); sc.className = 'mp-lb-score'; sc.textContent = e.score;
      li.appendChild(rank); li.appendChild(name); li.appendChild(sc);
      ul.appendChild(li);
    }

    // ★ Also update waiting overlay leaderboard if visible
    var waitingLb = document.getElementById('mp-waiting-lb');
    if (waitingLb) {
      waitingLb.innerHTML = '';
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var li = document.createElement('li');
        li.className = 'mp-lb-entry';
        if (e.playerId === mp.localPlayerId) li.className += ' mp-lb-entry--you';
        if (e.isDead) li.className += ' mp-lb-entry--dead';
        if (e.isDisconnected) li.className += ' mp-lb-entry--disconnected';
        var rank = document.createElement('span'); rank.className = 'mp-lb-rank'; rank.textContent = '#' + e.rank;
        var name = document.createElement('span'); name.className = 'mp-lb-name';
        name.textContent = e.playerName + (e.isDisconnected ? ' 📡' : '');
        var sc = document.createElement('span'); sc.className = 'mp-lb-score'; sc.textContent = e.score;
        li.appendChild(rank); li.appendChild(name); li.appendChild(sc);
        waitingLb.appendChild(li);
      }
    }
  }

  // ── Countdown ──
  function onCountdown(d) {
    closeModal();
    showCountdownOverlay(d.delay);
  }

  function showCountdownOverlay(delay) {
    if (!countdownOverlay) {
      countdownOverlay = document.createElement('div');
      countdownOverlay.className = 'mp-countdown-overlay';
      countdownOverlay.id = 'mp-countdown-overlay';
      countdownOverlay.innerHTML = '<span class="mp-countdown-number" id="mp-cd-num">3</span>';
      document.body.appendChild(countdownOverlay);
    }
    var numEl = document.getElementById('mp-cd-num');
    countdownOverlay.classList.add('mp-countdown-overlay--visible');
    var count = 3;
    if (numEl) numEl.textContent = count;
    var iv = setInterval(function () {
      count--;
      if (count > 0) { if (numEl) numEl.textContent = count; }
      else if (count === 0) { if (numEl) numEl.textContent = 'GO!'; }
      else {
        clearInterval(iv);
        countdownOverlay.classList.remove('mp-countdown-overlay--visible');
        // Trigger game start
        mp.beginGameplay();
        triggerGameStart();
      }
    }, 1000);
  }

  function triggerGameStart() {
    // Programmatically start the game by simulating keypress
    window.score = 0; window.started = 1;
    var label = document.getElementById('score-label');
    if (label) label.textContent = 'Your Score';
    var display = document.getElementById('high-score');
    if (display) { display.textContent = '0'; display.classList.add('playing'); }
    // Set up key handler for jumping
    document.onkeydown = function (o) {
      o.preventDefault();
      var e = o.keyCode;
      if (e === 38 && window.jump === 0) window.jump = 5;
    };
    window.started = 1;
    window.countingDown = 0;
    window.runGame = setInterval(window.gameLogic, window._gameTickMs || 100);
  }

  // ── Waiting Overlay ──
  function showWaitingOverlay(data) {
    var overlay = document.getElementById('mp-waiting-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mp-waiting-overlay';
      overlay.className = 'mp-waiting-overlay';
      overlay.innerHTML = '<div class="mp-waiting-content"><div class="mp-waiting-skull">💀</div><div class="mp-waiting-text">You\'re out!</div><div class="mp-waiting-score">Final Score: <span id="mp-waiting-score-val">' + data.score + '</span></div><div class="mp-waiting-status"><div class="mp-waiting-spinner"></div><span>Waiting for other players...</span></div><div class="mp-waiting-lb-container"><div class="mp-waiting-lb-title">Live Standings</div><ul class="mp-leaderboard" id="mp-waiting-lb"></ul></div></div>';
      document.body.appendChild(overlay);
    }
    overlay.classList.add('mp-waiting-overlay--visible');
    // Update score
    var scoreEl = document.getElementById('mp-waiting-score-val');
    if (scoreEl) scoreEl.textContent = data.score;
  }

  function hideWaitingOverlay() {
    var overlay = document.getElementById('mp-waiting-overlay');
    if (overlay) {
      overlay.classList.remove('mp-waiting-overlay--visible');
      setTimeout(function () { overlay.remove(); }, 300);
    }
  }

  // ── Game End ──
  function onGameEnd(payload) {
    hideWaitingOverlay();
    restoreCards();
    openModal();
    showScreen('gameover');
    renderPostGame(payload);
  }

  function renderPostGame(payload) {
    var container = document.getElementById('mp-gameover-content');
    if (!container) return;
    container.innerHTML = '';
    var board = payload.finalBoard || [];

    // ★ Check for tie at first place
    var isTie = false;
    if (board.length > 1 && board[0].score === board[1].score) {
      isTie = true;
    }

    // Winner or Tie announcement
    if (board.length > 0) {
      var winner = board[0];
      var wa = document.createElement('div');
      wa.className = 'mp-winner-announce mp-confetti';

      if (isTie) {
        // ★ Show TIE instead of WINNER
        var tiedPlayers = [];
        for (var i = 0; i < board.length; i++) {
          if (board[i].score === winner.score) {
            tiedPlayers.push(board[i].playerName);
          } else {
            break;
          }
        }
        wa.innerHTML = '<span class="mp-winner-crown">🤝</span><div class="mp-winner-name"></div><div class="mp-winner-label">TIE GAME</div>';
        wa.querySelector('.mp-winner-name').textContent = tiedPlayers.join(' & ') + ' — ' + winner.score + ' pts';
      } else {
        // ★ Clear winner
        wa.innerHTML = '<span class="mp-winner-crown">👑</span><div class="mp-winner-name"></div><div class="mp-winner-label">WINNER</div>';
        wa.querySelector('.mp-winner-name').textContent = winner.playerName + ' — ' + winner.score + ' pts';
      }
      container.appendChild(wa);
    }

    // Reason
    var reason = document.createElement('div');
    reason.style.cssText = 'text-align:center;font-size:10px;color:#999;font-family:"Space Mono",monospace;margin:8px 0;';
    var reasons = { all_dead: 'All players eliminated', host_ended: 'Host ended the game', host_disconnect: 'Host disconnected', network_error: 'Network error' };
    reason.textContent = reasons[payload.reason] || payload.reason;
    container.appendChild(reason);

    // Final leaderboard
    var ul = document.createElement('ul'); ul.className = 'mp-leaderboard';
    for (var i = 0; i < board.length; i++) {
      var e = board[i];
      var li = document.createElement('li');
      li.className = 'mp-lb-entry' + (e.playerId === mp.localPlayerId ? ' mp-lb-entry--you' : '');
      li.innerHTML = '<span class="mp-lb-rank">#' + e.rank + '</span><span class="mp-lb-name"></span><span class="mp-lb-score">' + e.score + '</span>';
      li.querySelector('.mp-lb-name').textContent = e.playerName;
      ul.appendChild(li);
    }
    container.appendChild(ul);

    // Buttons
    var row = document.createElement('div'); row.className = 'mp-btn-row'; row.style.marginTop = '16px';
    var again = document.createElement('button'); again.className = 'mp-btn mp-btn--primary'; again.textContent = 'Play Again';
    again.onclick = function () {
      // ★ Use proper playAgain function
      mp.playAgain();
      if (mp.isHost) { showScreen('lobby-host'); morphCardsToLobby(); }
      else { showScreen('lobby-client'); morphCardsToLobby(); }
    };
    var leave = document.createElement('button'); leave.className = 'mp-btn mp-btn--secondary'; leave.textContent = 'Leave';
    leave.onclick = function () { closeModal(); mp.destroy(); };
    row.appendChild(again); row.appendChild(leave);
    container.appendChild(row);
  }

  // ── Settings Sync (client receives from host) ──
  function applySettingsFromHost(s) {
    if (!s) return;
    if (s.difficulty) {
      var btns = document.querySelectorAll('.diff-btn');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('active', btns[i].getAttribute('data-diff') === s.difficulty);
      }
      if (window._diffPreset) {
        var presets = { easy: { enemyMin: 30, enemyMax: 10 }, med: { enemyMin: 26, enemyMax: 6 }, hard: { enemyMin: 14, enemyMax: 3 } };
        window._diffPreset = presets[s.difficulty] || presets.med;
      }
    }
    if (s.speed) {
      var slider = document.getElementById('speed-slider');
      var label = document.getElementById('speed-value');
      if (slider) slider.value = s.speed;
      if (label) label.textContent = (s.speed / 100).toFixed(1) + '×';
      window._gameTickMs = Math.round(100 / (s.speed / 100));
    }
  }

  // ── Deep Link ──
  function handleDeepLink() {
    var params = new URLSearchParams(window.location.search);
    var room = params.get('room');
    if (room) {
      // Strip param
      history.replaceState(null, '', window.location.pathname);
      // ★ room now contains the full peer ID (e.g., "7f3a9c2b-e1f4-...")
      // Store it for use after name entry
      window._deepLinkPeerId = room;

      setTimeout(function () {
        var saved = localStorage.getItem('mp_player_name');
        if (saved) {
          // Direct join with full peer ID
          openModal();
          showScreen('connecting');
          mp.joinRoom(room, saved).catch(function () {
            // On failure, show modal for manual entry
            showScreen('identity');
            window._deepLinkPeerId = room; // Keep it for retry
          });
        } else {
          // Show modal to get name first with auto-join UI
          openModal();
          showScreen('identity');
          showToast('👋 Enter your name to join the room', 'info');

          var btnCreate = document.getElementById('mp-btn-create');
          if (btnCreate) btnCreate.style.display = 'none';
          var btnJoin = document.getElementById('mp-btn-join-nav');
          if (btnJoin) {
            btnJoin.className = 'mp-btn mp-btn--primary';
            btnJoin.textContent = 'Join Game';
          }

          // Set up Enter key handler for name input
          var nameInput = document.getElementById('mp-name-input');
          if (nameInput) {
            nameInput.focus();
            nameInput.onkeydown = function (e) {
              if (e.key === 'Enter') {
                e.preventDefault();
                var name = getNameInput();
                if (name) {
                  localStorage.setItem('mp_player_name', name);
                  showScreen('connecting');
                  mp.joinRoom(room, name).catch(function () {
                    showScreen('identity');
                    window._deepLinkPeerId = room;
                  });
                }
              }
            };
          }
        }
      }, 500);
    }
  }

  // Init on DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
