import DinoSvg from './DinoSvg.jsx';

export default function MobileMsg() {
  return (
    <div className="mobile-msg">
      <DinoSvg
        className="mobile-dino"
        width={64}
        height={74}
        fill="#ff5c00"
        eyeFill="#f0ebe3"
      />

      <div className="mobile-badge">URL BAR GAME</div>

      <h2>Desktop only!</h2>

      <p className="mobile-why">
        URL-Dinogame plays entirely inside your browser&rsquo;s{' '}
        <strong>URL&nbsp;bar</strong> &mdash; it needs a full keyboard and a
        visible address bar to work.
      </p>

      <p className="mobile-hint">
        Bookmark this page and come back on a{' '}
        <strong>laptop&nbsp;or&nbsp;PC</strong> for the best experience!
      </p>

      <span className="mobile-credit">
        Made by{' '}
        <a href="https://github.com/Neilblaze" target="_blank" rel="noopener noreferrer">
          Pratyay Banerjee
        </a>
      </span>
    </div>
  );
}
