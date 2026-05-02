export default function Header() {
  return (
    <header className="header">
      <div className="logo">
        URL-<span>Dinogame</span>
      </div>

      <button className="mp-fab" id="mp-fab" type="button" aria-label="Open Multiplayer">
        <img
          src="https://res.cloudinary.com/dmlwye965/image/upload/v1777545974/33308_uwaruj.png"
          className="mp-fab__icon"
          style={{ filter: 'invert(1)' }}
          alt="🎮"
        />
        <span className="mp-fab__label">Multiplayer</span>
      </button>
    </header>
  );
}
