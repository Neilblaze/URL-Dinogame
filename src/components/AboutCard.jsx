import DinoSvg from './DinoSvg.jsx';

export default function AboutCard() {
  return (
    <section className="card card--about" id="card-about">
      <span className="card__label">About</span>

      <div className="about-body">
        <DinoSvg
          className="about-dino"
          width={80}
          height={92}
          fill="#1a1a1a"
          eyeFill="#f0ebe3"
        />
        <p className="about-text">
          A tiny re-imagining of <strong>Chrome&rsquo;s dinosaur game</strong> &mdash;
          played entirely inside the browser URL bar.
          Help <code>C</code> eat food and dodge enemies!
          <br /><br />
          Works best on all OS &amp; not limited to{' '}
          <strong>Mac, Windows &amp; Linux</strong>. Press any key to begin.
        </p>
      </div>

      <p className="bookmark-hint">
        Press <kbd>Ctrl</kbd>+<kbd>D</kbd> (Windows) or{' '}
        <kbd>Cmd</kbd>+<kbd>D</kbd> (Mac) to bookmark
      </p>
    </section>
  );
}
