export default function SettingsCard() {
  return (
    <section className="card card--settings" id="card-settings">

      {/* Difficulty */}
      <div className="settings-group">
        <span className="card__label">Difficulty</span>
        <div className="difficulty-toggle" id="difficulty-toggle">
          <button className="diff-btn"        data-diff="easy" type="button">Easy</button>
          <button className="diff-btn active" data-diff="med"  type="button">Med</button>
          <button className="diff-btn"        data-diff="hard" type="button">Hard</button>
        </div>
      </div>

      {/* Speed */}
      <div className="settings-group">
        <div className="settings-header">
          <span className="card__label">Game Speed</span>
          <span id="speed-value">1.0×</span>
        </div>
        <div className="speed-dial">
          <div className="speed-track-wrap">
            <input
              type="range"
              id="speed-slider"
              min="50"
              max="200"
              defaultValue="100"
              step="5"
              className="speed-range"
            />
            <div className="speed-ticks">
              <span /><span /><span /><span /><span />
            </div>
          </div>
          <div className="speed-labels">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>
      </div>

    </section>
  );
}
