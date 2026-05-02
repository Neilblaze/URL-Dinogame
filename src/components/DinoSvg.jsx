export default function DinoSvg({
  width = 52,
  height = 60,
  fill = '#ff5c00',
  eyeFill = '#ffffff',
  className = '',
  ariaHidden = true,
}) {
  return (
    <svg
      viewBox="0 0 14 16"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      fill={fill}
      aria-hidden={ariaHidden}
      className={className}
    >
      <rect x="8"  y="0"  width="6" height="1" />
      <rect x="7"  y="1"  width="7" height="1" />
      <rect x="7"  y="2"  width="1" height="1" />
      <rect x="9"  y="2"  width="5" height="1" />
      <rect x="7"  y="3"  width="7" height="1" />
      <rect x="9"  y="4"  width="3" height="1" />
      <rect x="1"  y="5"  width="1" height="1" />
      <rect x="6"  y="5"  width="7" height="1" />
      <rect x="1"  y="6"  width="2" height="1" />
      <rect x="5"  y="6"  width="7" height="1" />
      <rect x="1"  y="7"  width="12" height="1" />
      <rect x="2"  y="8"  width="10" height="1" />
      <rect x="3"  y="9"  width="9"  height="1" />
      <rect x="4"  y="10" width="7"  height="1" />
      <rect x="5"  y="11" width="5"  height="1" />
      <rect x="5"  y="12" width="4"  height="1" />
      <rect x="5"  y="13" width="2"  height="1" />
      <rect x="8"  y="13" width="2"  height="1" />
      <rect x="5"  y="14" width="1"  height="1" />
      <rect x="9"  y="14" width="1"  height="1" />
      {/* eye */}
      <rect x="8"  y="2"  width="1"  height="1" fill={eyeFill} />
    </svg>
  );
}
