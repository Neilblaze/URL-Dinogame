export default function MultiplayerModal() {
  return (
    <div className="mp-modal-overlay" id="mp-modal-overlay">
      <div className="mp-modal" role="dialog" aria-labelledby="mp-modal-title" aria-modal="true">

        {/* ── Header ── */}
        <div className="mp-modal__header">
          <h2 className="mp-modal__title" id="mp-modal-title">
            <img
              src="https://res.cloudinary.com/dmlwye965/image/upload/v1777545974/33308_uwaruj.png"
              className="mp-modal__icon"
              alt="🎮"
            />
            {' '}MULTIPLAYER
          </h2>
          <button className="mp-modal__close" id="mp-modal-close" type="button" aria-label="Close">
            ×
          </button>
        </div>

        {/* ── Body (screens) ── */}
        <div className="mp-modal__body">

          {/* Screen 1: identity (default active) */}
          <div className="mp-screen mp-screen--active" id="mp-screen-identity">
            <label className="mp-input-label" htmlFor="mp-name-input">Your Name:</label>
            <input
              type="text"
              id="mp-name-input"
              className="mp-name-input"
              maxLength={16}
              placeholder="Enter your name"
              autoComplete="off"
            />
            <div className="mp-btn-row">
              <button className="mp-btn mp-btn--primary"   id="mp-btn-create"   type="button">Create Room</button>
              <button className="mp-btn mp-btn--secondary" id="mp-btn-join-nav" type="button">Join Room</button>
            </div>
          </div>

          {/* Screen 2: join */}
          <div className="mp-screen" id="mp-screen-join">
            <label className="mp-input-label" htmlFor="mp-link-input">Invite Link / Room Code:</label>
            <input
              type="text"
              id="mp-link-input"
              className="mp-name-input"
              placeholder="Paste link or code here..."
              autoComplete="off"
            />
            <label className="mp-input-label" htmlFor="mp-join-name-input" style={{ marginTop: 12 }}>
              Your Name:
            </label>
            <input
              type="text"
              id="mp-join-name-input"
              className="mp-name-input"
              maxLength={16}
              placeholder="Enter your name"
              autoComplete="off"
            />
            <div className="mp-btn-row" style={{ marginTop: 20 }}>
              <button className="mp-btn mp-btn--secondary" id="mp-btn-back" type="button">
                <span className="mp-btn-icon" style={{ fontSize: 16, marginTop: -3, marginRight: 4 }}>←</span>
                <span>Back</span>
              </button>
              <button className="mp-btn mp-btn--primary" id="mp-btn-join-action" type="button">Join</button>
            </div>
          </div>

          {/* Screen 3: connecting */}
          <div className="mp-screen" id="mp-screen-connecting">
            <div className="mp-connecting">
              <div className="mp-progress-bar">
                <div className="mp-progress-fill" />
              </div>
              <p className="mp-connecting__text">Finding host...</p>
            </div>
          </div>

          {/* Screen 4: lobby host */}
          <div className="mp-screen" id="mp-screen-lobby-host">
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <span style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 9,
                color: '#999',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                Room Name
              </span>
            </div>
            <div className="mp-room-code-display">
              <span className="mp-room-code-text" id="mp-room-code" style={{ fontSize: 16 }}>------</span>
              <button className="mp-copy-btn" id="mp-copy-btn" type="button">Copy 🔗</button>
            </div>
            <p className="mp-invite-hint">Copy and share the link with friends to invite them to your room</p>
            <div className="mp-divider" />
            <span className="mp-player-count" id="mp-player-count">Players (0/6)</span>
            <ul className="mp-roster" id="mp-roster" />
            <button
              className="mp-btn mp-btn--primary"
              id="mp-btn-start"
              type="button"
              style={{ marginTop: 16, width: '100%' }}
            >
              <span>Start Game</span>
              <span className="mp-btn-icon">▶</span>
            </button>
          </div>

          {/* Screen 5: lobby client */}
          <div className="mp-screen" id="mp-screen-lobby-client">
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 9,
                color: '#999',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>
                Room Name
              </span>
            </div>
            <div className="mp-room-code-display">
              <span className="mp-room-code-text" id="mp-room-code-client" style={{ fontSize: 16 }}>------</span>
            </div>
            <div className="mp-divider" />
            <span className="mp-player-count" id="mp-player-count-client">Players (0/6)</span>
            <ul className="mp-roster" id="mp-roster-client" />
            <button className="mp-ready-btn mp-ready-btn--unready" id="mp-ready-btn" type="button">
              Ready ✓
            </button>
          </div>

          {/* Screen 6: post-game */}
          <div className="mp-screen" id="mp-screen-gameover">
            <div id="mp-gameover-content" />
          </div>

        </div>{/* /mp-modal__body */}
      </div>{/* /mp-modal */}
    </div>
  );
}
