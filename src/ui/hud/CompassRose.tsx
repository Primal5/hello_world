import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

const SIZE = 124;
const CENTER = SIZE / 2;
const CARDINALS = [
  { label: 'N', x: CENTER, y: 18, accent: true },
  { label: 'E', x: SIZE - 18, y: CENTER + 5 },
  { label: 'S', x: CENTER, y: SIZE - 12 },
  { label: 'O', x: 18, y: CENTER + 5 }
];
const INTERCARDINALS = [
  { label: 'NE', x: SIZE - 30, y: 31 },
  { label: 'SE', x: SIZE - 30, y: SIZE - 24 },
  { label: 'SO', x: 30, y: SIZE - 24 },
  { label: 'NO', x: 30, y: 31 }
];

function renderTicks(): JSX.Element[] {
  return Array.from({ length: 24 }, (_, index) => {
    const angle = (index / 24) * Math.PI * 2;
    const outer = 8;
    const inner = index % 2 === 0 ? 18 : 13;
    const x1 = CENTER + Math.sin(angle) * (CENTER - inner);
    const y1 = CENTER - Math.cos(angle) * (CENTER - inner);
    const x2 = CENTER + Math.sin(angle) * (CENTER - outer);
    const y2 = CENTER - Math.cos(angle) * (CENTER - outer);

    return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} className="compass-rose__tick" />;
  });
}

export function CompassRose(): JSX.Element {
  const compassHeading = useGameStore((state) => state.compassHeading);
  const [displayHeading, setDisplayHeading] = useState(compassHeading);
  const previousHeadingRef = useRef(compassHeading);

  useEffect(() => {
    let delta = compassHeading - previousHeadingRef.current;
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }

    previousHeadingRef.current += delta;
    setDisplayHeading(previousHeadingRef.current);
  }, [compassHeading]);

  return (
    <div className="compass-rose" aria-label="Boussole">
      <div className="compass-rose__frame">
        <div className="compass-rose__north-marker" />
        <svg
          className="compass-rose__svg"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ transform: `rotate(${-displayHeading}deg)` }}
          role="img"
        >
          <circle className="compass-rose__ring" cx={CENTER} cy={CENTER} r={CENTER - 8} />
          {renderTicks()}
          {CARDINALS.map((point) => (
            <text
              key={point.label}
              className={point.accent ? 'compass-rose__cardinal compass-rose__cardinal--north' : 'compass-rose__cardinal'}
              x={point.x}
              y={point.y}
            >
              {point.label}
            </text>
          ))}
          {INTERCARDINALS.map((point) => (
            <text key={point.label} className="compass-rose__ordinal" x={point.x} y={point.y}>
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
