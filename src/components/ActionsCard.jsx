export default function ActionsCard() {
  return (
    <div className="card card--actions" id="card-actions">
      <button
        className="sound-btn"
        // eslint-disable-next-line react/no-unknown-property
        onClick={() => window.toggleSound && window.toggleSound()}
        type="button"
      >
        🔊 Sound: on
      </button>

      <span className="credit">
        Made by{' '}
        <a href="https://github.com/Neilblaze" target="_blank" rel="noopener noreferrer">
          Pratyay Banerjee
        </a>
      </span>
    </div>
  );
}
