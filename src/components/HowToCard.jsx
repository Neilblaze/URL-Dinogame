export default function HowToCard() {
  return (
    <section className="card card--howto" id="card-howto">
      <span className="card__label">How to Play</span>

      <div className="controls-row">
        <div className="controls-hint">
          <span className="key-badge">UP</span>
          Jump over enemies
        </div>
        <div className="controls-hint">
          <span className="key-badge">ANY</span>
          Start / Restart
        </div>
      </div>

      <p className="howto-note">
        Look at the URL bar above &mdash; the game plays there.
      </p>
    </section>
  );
}
