"use strict";
(function () {
  var mp = null;
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

  function bindFAB() {
    var fab = document.getElementById('mp-fab');
    if (!fab) return;
    fab.addEventListener('click', function () {
      if (fab.disabled) return;
      openModal(); showScreen('identity');
    });
  }

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
    overlay = document.getElementById('mp-modal-overlay');
    if (overlay) overlay.addEventListener('click', function (e) {
      if (e.target === overlay) { closeModal(); if (mp && mp.state !== MP_STATES.IN_GAME && mp.state !== MP_STATES.COUNTDOWN) mp.destroy(); }
    });
  }

  function showScreen(name) {
    var all = document.querySelectorAll('.mp-screen');
    for (var i = 0; i < all.length; i++)all[i].classList.remove('mp-screen--active');
    var el = document.getElementById('mp-screen-' + name);
    if (el) el.classList.add('mp-screen--active');
  }

  function bindScreens() {
    var btnCreate = document.getElementById('mp-btn-create');
    if (btnCreate) btnCreate.addEventListener('click', function () {
      var name = getNameInput();
      localStorage.setItem('mp_player_name', name);
      mp.createRoom(name);
    });
    var btnJoinNav = document.getElementById('mp-btn-join-nav');
    if (btnJoinNav) btnJoinNav.addEventListener('click', function () {
      var name = getNameInput();
      localStorage.setItem('mp_player_name', name);
      if (window._deepLinkPeerId) {
        showScreen('connecting');
        mp.joinRoom(window._deepLinkPeerId, name).catch(function () {
          window._deepLinkPeerId = null;
          showScreen('identity');
        });
      } else {
        var joinNameInp = document.getElementById('mp-join-name-input');
        if (joinNameInp) joinNameInp.value = name;
        showScreen('join');
      }
    });

    var btnJoinAction = document.getElementById('mp-btn-join-action');
    var linkInp = document.getElementById('mp-link-input');
    var joinNameInp = document.getElementById('mp-join-name-input');

    function performJoin() {
      var name = (joinNameInp ? joinNameInp.value.trim().slice(0, 16) : '') || 'Player';
      localStorage.setItem('mp_player_name', name);
      var linkOrCode = linkInp ? linkInp.value.trim() : '';
      if (!linkOrCode) return;

      var code = linkOrCode;
      var match = linkOrCode.match(/[?&]room=([a-zA-Z0-9\-]+)/);
      if (match) {
        code = match[1];
      } else if (linkOrCode.includes('/')) {
        var parts = linkOrCode.split('/');
        code = parts[parts.length - 1];
      }

      showScreen('connecting');
      mp.joinRoom(code, name).catch(function () {
        showScreen('join');
        var err = document.createElement('div');
        err.style.cssText = 'color: #dc2626; font-size: 10px; margin-top: 8px; text-align: center;';
        err.textContent = 'Failed to join. Please check the code.';
        var existingErr = document.getElementById('mp-join-err');
        if (existingErr) existingErr.remove();
        err.id = 'mp-join-err';
        document.getElementById('mp-screen-join').appendChild(err);
      });
    }

    if (btnJoinAction) {
      btnJoinAction.addEventListener('click', performJoin);
    }

    if (linkInp) {
      linkInp.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') performJoin();
      });
    }
    if (joinNameInp) {
      joinNameInp.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') performJoin();
      });
    }

    var btnBack = document.getElementById('mp-btn-back');
    if (btnBack) btnBack.addEventListener('click', function () { showScreen('identity'); });
    var saved = localStorage.getItem('mp_player_name') || '';
    var inp = document.getElementById('mp-name-input');
    if (inp && saved) inp.value = saved;
  }

  function getNameInput() {
    var inp = document.getElementById('mp-name-input');
    return inp ? inp.value.trim().slice(0, 16) || 'Player' : 'Player';
  }

  function bindMPEvents() {
    mp.on('stateChange', function (d) { onStateChange(d.from, d.to); });
    mp.on('roomCreated', function (d) { onRoomCreated(d); });
    mp.on('lobbyUpdate', function (players) { renderLobbyRoster(players); });
    mp.on('countdown', function (d) { onCountdown(d); });
    mp.on('leaderboardUpdate', function (entries) { renderLeaderboard(entries); });
    mp.on('gameEnd', function (d) { onGameEnd(d); });
    mp.on('settingsSync', function (s) { applySettingsFromHost(s); });
    mp.on('playerDied', function (d) { showWaitingOverlay(d); });
    mp.on('stateChange', function (d) {
      if (d.to === MP_STATES.LOBBY_CLIENT) {
        showScreen('lobby-client');
        renderLobbyRoster(mp._playerArray());
      }
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
    if (to === MP_STATES.LOBBY_HOST || to === MP_STATES.LOBBY_CLIENT || to === MP_STATES.IN_GAME) {
      if (fab) fab.classList.add('mp-fab--pulse');
      updateFabState();
    } else {
      if (fab) { fab.classList.remove('mp-fab--pulse'); removeFabBadge(); }
      updateFabState();
    }
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

  function spawnConfetti(parentEl) {
    var canvas = document.createElement('canvas');
    parentEl.style.position = 'relative';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    parentEl.insertBefore(canvas, parentEl.firstChild);

    var ctx = canvas.getContext('2d');
    var width = parentEl.clientWidth || 400;
    var height = parentEl.clientHeight || 500;
    canvas.width = width;
    canvas.height = height;

    var particles = [];
    var colors = ['#ff5c00', '#16a34a', '#0ea5e9', '#dc2626', '#fbbf24', '#8b5cf6'];
    for (var i = 0; i < 70; i++) {
      particles.push({
        x: width / 2 + (Math.random() * 40 - 20),
        y: height / 4 + (Math.random() * 20),
        r: Math.random() * 4 + 3,
        dx: Math.random() * 12 - 6,
        dy: Math.random() * -12 - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleInc: (Math.random() * 0.07) + 0.05,
        tiltAngle: 0,
        opacity: 1
      });
    }

    var frame = 0;
    function render() {
      ctx.clearRect(0, 0, width, height);
      var active = false;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.tiltAngle += p.tiltAngleInc;
        p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle) * 2 + p.dx;
        p.dy += 0.3; // gravity
        p.y += p.dy;
        p.dx *= 0.98; // friction

        if (frame > 90) p.opacity -= 0.015;

        if (p.opacity > 0 && p.y < height + 20) active = true;

        if (p.opacity > 0) {
          ctx.beginPath();
          ctx.lineWidth = p.r;
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.moveTo(p.x + p.tilt + p.r, p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      frame++;
      if (active && frame < 200) {
        requestAnimationFrame(render);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(render);
  }

  function renderLobbyRoster(players) {
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

    updateStartBtn();
    updateFabState();
    var readyBtn = document.getElementById('mp-ready-btn');
    if (readyBtn && !mp.isHost) {
      var me = mp.players.get(mp.localPlayerId);
      if (me) {
        readyBtn.innerHTML = me.isReady ? '<span>Waiting for Host to Start</span><span class="mp-ready-icon">○</span>' : '<span>Ready</span><span class="mp-ready-icon">✓</span>';
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

  function updateFabState() {
    var fab = document.getElementById('mp-fab'); if (!fab) return;
    var label = fab.querySelector('.mp-fab__label'); if (!label) return;

    if (mp && mp.state === MP_STATES.IN_GAME) {
      fab.classList.add('mp-fab--live-session');
      var count = mp.players.size;
      label.innerHTML = '<span class="mp-fab-live-dot"></span>LIVE <span style="opacity:0.25; margin:0 4px;">|</span> ' + (mp.roomCode || 'Session') + ' <span style="color:#888;">(' + count + '/6)</span>';
      removeFabBadge();
    } else {
      fab.classList.remove('mp-fab--live-session');
      label.textContent = 'Multiplayer';
      if (mp && mp.state !== MP_STATES.IDLE && mp.players.size > 0) {
        var existing = fab.querySelector('.mp-fab__badge');
        if (!existing) { existing = document.createElement('span'); existing.className = 'mp-fab__badge'; fab.appendChild(existing); }
        existing.textContent = mp.players.size;
      }
    }
  }

  function removeFabBadge() {
    var fab = document.getElementById('mp-fab'); if (!fab) return;
    var b = fab.querySelector('.mp-fab__badge'); if (b) b.remove();
  }

  function morphCardsToLobby() {
    var ca = document.getElementById('card-about');
    if (ca) {
      ca.classList.add('mp-morphed');
      ca.innerHTML = '<span class="card__label">Room: ' + (mp.roomCode || '------') + '</span><ul class="mp-roster" id="mp-card-roster"></ul>';
    }
    if (!mp.isHost) lockSettings('Settings locked by host');
    var cact = document.getElementById('card-actions');
    if (cact) {
      var sndBtn = cact.querySelector('.sound-btn');
      var sndHtml = sndBtn ? sndBtn.outerHTML : '';
      cact.innerHTML = sndHtml;
    }
    renderLobbyRoster(mp._playerArray());
  }

  function morphCardsToGame() {
    var ca = document.getElementById('card-about');
    if (ca) {
      ca.classList.add('mp-morphed', 'mp-leaderboard-mode');
      ca.innerHTML = '<div class="mp-game-header"><span class="mp-live-lb-title"><span style="font-size:14px; margin-top:-2px;">🏆</span> Live Leaderboard</span><div class="mp-live-badge"><span class="mp-live-dot"></span>LIVE</div></div><div class="mp-leaderboard-container"><ul class="mp-leaderboard mp-leaderboard--active" id="mp-live-lb"></ul></div>';
    }
    lockSettings('Locked during game');
    var sl = document.getElementById('score-label');
    if (sl) sl.textContent = 'Your Score';
    var cact = document.getElementById('card-actions');
    if (cact) {
      var sndBtn = cact.querySelector('.sound-btn');
      var sndHtml = sndBtn ? sndBtn.outerHTML : '';
      if (mp.isHost) {
        cact.innerHTML = '<div class="mp-game-actions">' + sndHtml + '<button class="mp-end-game-btn" id="mp-end-btn" type="button"><span class="mp-end-game-icon">⏹</span><span>End Game</span></button></div>';
        var end = document.getElementById('mp-end-btn');
        if (end) end.addEventListener('click', function () {
          showEndGameConfirmModal();
        });
      } else {
        cact.innerHTML = '<div class="mp-game-actions">' + sndHtml + '<button class="mp-end-game-btn" id="mp-leave-btn" type="button"><span class="mp-end-game-icon">⏹</span><span>Leave Room</span></button></div>';
        var leave = document.getElementById('mp-leave-btn');
        if (leave) leave.addEventListener('click', function () {
          closeModal();
          window.started = 0;
          if (window.runGame) {
            clearInterval(window.runGame);
            window.runGame = null;
          }
          mp.destroy();
          history.replaceState(null, '', "#" + "···" + "PRESS-ANY-KEY-TO-PLAY" + "···▸");
          window.score = 0;
          if (typeof startGame === 'function') {
            document.onkeydown = null;
            startGame();
          }
        });
      }
    }
  }

  function showEndGameConfirmModal() {
    var confirmOverlay = document.createElement('div');
    confirmOverlay.className = 'mp-confirm-overlay';
    confirmOverlay.innerHTML = `
      <div class="mp-confirm-modal">
        <div class="mp-confirm-header">
          <span class="mp-confirm-icon">⚠️</span>
          <h3 class="mp-confirm-title">End Game?</h3>
        </div>
        <p class="mp-confirm-message">This will end the game for all players immediately. No scores will be saved.</p>
        <div class="mp-confirm-actions">
          <button class="mp-btn mp-btn--secondary" id="mp-confirm-cancel" type="button">Cancel</button>
          <button class="mp-btn mp-btn--danger" id="mp-confirm-end" type="button">End Game</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmOverlay);

    setTimeout(function () {
      confirmOverlay.classList.add('mp-confirm-overlay--visible');
    }, 10);

    var cancelBtn = document.getElementById('mp-confirm-cancel');
    if (cancelBtn) {
      cancelBtn.onclick = function () {
        confirmOverlay.classList.remove('mp-confirm-overlay--visible');
        setTimeout(function () {
          confirmOverlay.remove();
        }, 300);
      };
    }

    var endBtn = document.getElementById('mp-confirm-end');
    if (endBtn) {
      endBtn.onclick = function () {
        confirmOverlay.classList.remove('mp-confirm-overlay--visible');
        setTimeout(function () {
          confirmOverlay.remove();
        }, 300);
        window.started = 0;
        if (window.runGame) {
          clearInterval(window.runGame);
          window.runGame = null;
        }
        mp.endGame();
      };
    }

    confirmOverlay.onclick = function (e) {
      if (e.target === confirmOverlay) {
        cancelBtn.click();
      }
    };
  }

  function lockSettings(msg) {
    var cs = document.getElementById('card-settings');
    if (!cs || cs.querySelector('.mp-settings-lock')) return;
    var lock = document.createElement('div'); lock.className = 'mp-settings-lock';
    lock.innerHTML = '<div class="mp-settings-lock__glass"><span class="mp-settings-lock__icon">🔒</span><span class="mp-settings-lock__text">' + msg + '</span></div>';
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

    var btn = document.querySelector(".sound-btn");
    if (btn && btn.innerHTML.indexOf("on") !== -1 && typeof window.safePlay === 'function') {
      window.safePlay("countdown");
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
        mp.beginGameplay();
        triggerGameStart();
      }
    }, 1000);
  }

  function triggerGameStart() {
    window.score = 0; window.started = 1;
    var label = document.getElementById('score-label');
    if (label) label.textContent = 'Your Score';
    var display = document.getElementById('high-score');
    if (display) { display.textContent = '0'; display.classList.add('playing'); }
    document.onkeydown = function (o) {
      o.preventDefault();
      var e = o.keyCode;
      if ((e === 38 || e === 32) && window.jump === 0) window.jump = 5;
    };
    window.started = 1;
    window.countingDown = 0;
    window.runGame = setInterval(window.gameLogic, window._gameTickMs || 100);
  }

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

  function onGameEnd(payload) {
    hideWaitingOverlay();
    restoreCards();
    openModal();
    showScreen('gameover');
    renderPostGame(payload);

    var replayHandler = function (e) {
      var target = e.target || e.srcElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      var s = document.getElementById('mp-screen-gameover');
      if (s && s.classList.contains('mp-screen--active') && document.getElementById('mp-modal-overlay').classList.contains('mp-modal-overlay--open')) {
        e.preventDefault();
        var again = s.querySelector('.mp-btn--primary');
        if (again) again.click();
      }
      document.removeEventListener('keydown', replayHandler);
    };

    setTimeout(function () {
      document.addEventListener('keydown', replayHandler);
    }, 1000);
  }

  function renderPostGame(payload) {
    var container = document.getElementById('mp-gameover-content');
    if (!container) return;
    container.innerHTML = '';
    var board = payload.finalBoard || [];

    var isTie = false;
    if (board.length > 1 && board[0].score === board[1].score) {
      isTie = true;
    }

    if (board.length > 0) {
      var winner = board[0];
      var wa = document.createElement('div');
      wa.className = 'mp-winner-announce';

      var iWon = false;
      if (isTie) {
        var tiedPlayers = [];
        for (var i = 0; i < board.length; i++) {
          if (board[i].score === winner.score) {
            tiedPlayers.push(board[i].playerName);
            if (board[i].playerId === mp.localPlayerId) iWon = true;
          } else {
            break;
          }
        }
        wa.innerHTML = '<span class="mp-winner-crown">🤝</span><div class="mp-winner-name"></div><div class="mp-winner-label">TIE GAME</div>';
        wa.querySelector('.mp-winner-name').textContent = tiedPlayers.join(' & ') + ' — ' + winner.score + ' pts';
      } else {
        wa.innerHTML = '<span class="mp-winner-crown">👑</span><div class="mp-winner-name"></div><div class="mp-winner-label">WINNER</div>';
        wa.querySelector('.mp-winner-name').textContent = winner.playerName + ' — ' + winner.score + ' pts';
        if (winner.playerId === mp.localPlayerId) iWon = true;
      }
      container.appendChild(wa);

      if (iWon) spawnConfetti(container);
    }

    var reason = document.createElement('div');
    reason.style.cssText = 'text-align:center;font-size:10px;color:#999;font-family:"Space Mono",monospace;margin:8px 0;';
    var reasons = { all_dead: 'All players eliminated', host_ended: 'Host ended the game', host_disconnect: 'Host disconnected', network_error: 'Network error' };
    reason.textContent = reasons[payload.reason] || payload.reason;
    container.appendChild(reason);

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

    var row = document.createElement('div'); row.className = 'mp-btn-row'; row.style.marginTop = '16px';
    var again = document.createElement('button'); again.className = 'mp-btn mp-btn--primary'; again.textContent = 'Play Again';
    again.onclick = function () {
      mp.playAgain();
      if (mp.isHost) { showScreen('lobby-host'); morphCardsToLobby(); }
      else { showScreen('lobby-client'); morphCardsToLobby(); }
    };
    var leave = document.createElement('button'); leave.className = 'mp-btn mp-btn--secondary'; leave.textContent = 'Leave';
    leave.onclick = function () {
      closeModal();
      mp.destroy();
      history.replaceState(null, '', "#" + "···" + "PRESS-ANY-KEY-TO-PLAY" + "···▸");
      window.started = 0;
      window.score = 0;
      if (typeof startGame === 'function') {
        document.onkeydown = null;
        startGame();
      }
    };
    row.appendChild(again); row.appendChild(leave);
    container.appendChild(row);
  }

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

  function handleDeepLink() {
    var params = new URLSearchParams(window.location.search);
    var room = params.get('room');
    if (room) {
      history.replaceState(null, '', window.location.pathname);
      window._deepLinkPeerId = room;

      setTimeout(function () {
        var saved = localStorage.getItem('mp_player_name');
        if (saved) {
          openModal();
          showScreen('connecting');
          mp.joinRoom(room, saved).catch(function () {
            showScreen('identity');
            window._deepLinkPeerId = room;
          });
        } else {
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
