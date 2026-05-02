const LEGEND = [
  { char: 'C',    cls: 'legend-char--player', name: 'You',    desc: 'The player'     },
  { char: '•',    cls: 'legend-char--food',   name: 'Food',   desc: '+1 pt'          },
  { char: '@',    cls: 'legend-char--fruit',  name: 'Fruit',  desc: '+5 pts'         },
  { char: 'X',    cls: 'legend-char--enemy',  name: 'Enemy',  desc: '-1 pt'          },
  { char: '*',    cls: 'legend-char--shield', name: 'Shield', desc: '5s invincible'  },
];

export default function LegendCard() {
  return (
    <section className="card card--legend" id="card-legend">
      <span className="card__label">Legend</span>

      <div className="legend-list">
        {LEGEND.map(({ char, cls, name, desc }) => (
          <div className="legend-item" key={name}>
            <span className={`legend-char ${cls}`}>{char}</span>
            <div className="legend-meta">
              <span className="legend-name">{name}</span>
              <span className="legend-desc">{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
