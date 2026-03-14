import { useGameStore } from '../store/gameStore';
import { DISPLAY_TEXT } from '../../text/DisplayText';

const SIZE = 124;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const HEALTH_ORB_CLASS = 'health-orb';
const HEALTH_ORB_WARNING_CLASS = 'health-orb--warning';
const HEALTH_ORB_CRITICAL_CLASS = 'health-orb--critical';

function getHealthColor(percentage: number): string {
  if (percentage >= 75) return '#33d17a';
  if (percentage >= 50) return '#ff9f1c';
  if (percentage >= 25) return '#ffd60a';
  return '#e63946';
}

export function HealthOrb(): JSX.Element {
  const health = useGameStore((state) => state.health);
  const maxHealth = useGameStore((state) => state.maxHealth);
  const safeMaxHealth = Math.max(1, maxHealth);
  const clampedHealth = Math.max(0, Math.min(health, safeMaxHealth));
  const percentage = (clampedHealth / safeMaxHealth) * 100;
  const dashOffset = CIRCUMFERENCE * (1 - percentage / 100);
  const color = getHealthColor(percentage);
  let orbClassName = HEALTH_ORB_CLASS;
  if (percentage < 25) {
    orbClassName = `${HEALTH_ORB_CLASS} ${HEALTH_ORB_CRITICAL_CLASS}`;
  } else if (percentage < 50) {
    orbClassName = `${HEALTH_ORB_CLASS} ${HEALTH_ORB_WARNING_CLASS}`;
  }

  return (
    <div className={orbClassName} aria-label={DISPLAY_TEXT.ui.hud.healthAria(clampedHealth, safeMaxHealth)}>
      <svg className="health-orb__svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img">
        <circle
          className="health-orb__track"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
        />
        <circle
          className="health-orb__progress"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="health-orb__center">
        <span className="health-orb__value">{Math.round(clampedHealth)}</span>
        <span className="health-orb__label">{DISPLAY_TEXT.ui.hud.healthShort}</span>
      </div>
    </div>
  );
}
