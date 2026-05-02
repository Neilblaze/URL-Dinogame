import DinoSvg from './DinoSvg.jsx';

export default function ScoreCard() {
  return (
    <section className="card card--status" id="card-status">
      <DinoSvg className="dino-mascot" width={52} height={60} fill="#ff5c00" eyeFill="#ffffff" />

      <div className="score-block">
        <span className="card__label" id="score-label">High Score</span>
        <div className="highscore-display">
          <span id="high-score">--</span>
          <small>points</small>
        </div>
      </div>
    </section>
  );
}
