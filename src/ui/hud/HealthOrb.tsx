import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useGameStore } from '../store/gameStore';
import { DISPLAY_TEXT } from '../../text/DisplayText';

const SIZE = 124;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const HEALTH_ORB_CLASS = 'health-orb';
const HEALTH_ORB_WARNING_CLASS = 'health-orb--warning';
const HEALTH_ORB_CRITICAL_CLASS = 'health-orb--critical';
const HEALTH_ORB_HEAL_BURST_CLASS = 'health-orb__heal-burst';
const HEALTH_ORB_HEAL_RING_CLASS = 'health-orb__heal-ring';
const HEALTH_ORB_HEAL_SPARK_CLASS = 'health-orb__heal-spark';
const HEALTH_ORB_DAMAGE_BURST_CLASS = 'health-orb__damage-burst';
const HEALTH_ORB_DAMAGE_RING_CLASS = 'health-orb__damage-ring';
const HEAL_SPARK_PARTICLES = [
  { x: 16, y: 98, driftX: -14, rise: 84, delay: 0, scale: 0.32, duration: 1480 },
  { x: 23, y: 88, driftX: -8, rise: 96, delay: 70, scale: 0.28, duration: 1520 },
  { x: 27, y: 104, driftX: -11, rise: 90, delay: 160, scale: 0.22, duration: 1640 },
  { x: 34, y: 84, driftX: -5, rise: 108, delay: 20, scale: 0.3, duration: 1560 },
  { x: 39, y: 97, driftX: -7, rise: 92, delay: 220, scale: 0.2, duration: 1700 },
  { x: 46, y: 80, driftX: -3, rise: 116, delay: 110, scale: 0.26, duration: 1620 },
  { x: 50, y: 102, driftX: -1, rise: 98, delay: 280, scale: 0.18, duration: 1760 },
  { x: 57, y: 90, driftX: -4, rise: 110, delay: 40, scale: 0.24, duration: 1680 },
  { x: 62, y: 108, driftX: 1, rise: 102, delay: 190, scale: 0.16, duration: 1800 },
  { x: 66, y: 82, driftX: 0, rise: 118, delay: 0, scale: 0.34, duration: 1580 },
  { x: 72, y: 98, driftX: 4, rise: 94, delay: 250, scale: 0.2, duration: 1720 },
  { x: 78, y: 86, driftX: 6, rise: 112, delay: 90, scale: 0.28, duration: 1660 },
  { x: 83, y: 103, driftX: 8, rise: 100, delay: 310, scale: 0.18, duration: 1780 },
  { x: 88, y: 78, driftX: 10, rise: 122, delay: 50, scale: 0.3, duration: 1600 },
  { x: 94, y: 94, driftX: 7, rise: 96, delay: 210, scale: 0.22, duration: 1740 },
  { x: 101, y: 84, driftX: 12, rise: 110, delay: 130, scale: 0.26, duration: 1680 },
  { x: 106, y: 101, driftX: 9, rise: 90, delay: 340, scale: 0.18, duration: 1820 },
  { x: 111, y: 90, driftX: 15, rise: 104, delay: 170, scale: 0.24, duration: 1700 }
] as const;

const HEALTH_COLOR_STOPS = [
  { percentage: 0, color: [230, 57, 70] },
  { percentage: 25, color: [255, 159, 28] },
  { percentage: 50, color: [255, 214, 10] },
  { percentage: 100, color: [51, 209, 122] }
] as const;
const CRITICAL_HEALTH_THRESHOLD = 25;

function mixChannel(start: number, end: number, t: number): number {
  return Math.round(start + (end - start) * t);
}

function toHexColor(color: readonly [number, number, number]): string {
  return `#${color.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function getHealthColorRgb(percentage: number): [number, number, number] {
  const clampedPercentage = Math.max(0, Math.min(percentage, 100));
  if (clampedPercentage <= CRITICAL_HEALTH_THRESHOLD) {
    return [...HEALTH_COLOR_STOPS[0].color];
  }

  for (let index = 1; index < HEALTH_COLOR_STOPS.length; index += 1) {
    const previousStop = HEALTH_COLOR_STOPS[index - 1];
    const nextStop = HEALTH_COLOR_STOPS[index];

    if (clampedPercentage > nextStop.percentage) {
      continue;
    }

    const range = nextStop.percentage - previousStop.percentage;
    const t = range <= 0 ? 0 : (clampedPercentage - previousStop.percentage) / range;
    return [
      mixChannel(previousStop.color[0], nextStop.color[0], t),
      mixChannel(previousStop.color[1], nextStop.color[1], t),
      mixChannel(previousStop.color[2], nextStop.color[2], t)
    ];
  }

  return [...HEALTH_COLOR_STOPS[HEALTH_COLOR_STOPS.length - 1].color];
}

function getHealthColor(percentage: number): string {
  return toHexColor(getHealthColorRgb(percentage));
}

function polarToCartesian(center: number, radius: number, angleInDegrees: number): { x: number; y: number } {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(angleInRadians),
    y: center + radius * Math.sin(angleInRadians)
  };
}

function describeArcPath(center: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(center, radius, startAngle);
  const end = polarToCartesian(center, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
  ].join(' ');
}

export function HealthOrb(): JSX.Element {
  const health = useGameStore((state) => state.health);
  const maxHealth = useGameStore((state) => state.maxHealth);
  const previousHealthRef = useRef(health);
  const healSegmentKeyRef = useRef(0);
  const healBurstKeyRef = useRef(0);
  const damageBurstKeyRef = useRef(0);
  const [recentHealSegment, setRecentHealSegment] = useState<{
    startHealth: number;
    gainedHealth: number;
    key: number;
  } | null>(null);
  const [recentHealBurstKey, setRecentHealBurstKey] = useState(0);
  const [recentDamageBurstKey, setRecentDamageBurstKey] = useState(0);
  const safeMaxHealth = Math.max(1, maxHealth);
  const clampedHealth = Math.max(0, Math.min(health, safeMaxHealth));
  const percentage = (clampedHealth / safeMaxHealth) * 100;
  const dashOffset = CIRCUMFERENCE * (1 - percentage / 100);
  const colorRgb = getHealthColorRgb(percentage);
  const color = getHealthColor(percentage);
  const orbStyle = {
    '--health-rgb': colorRgb.join(', '),
    '--health-flash-rgb': colorRgb.join(', ')
  } as CSSProperties;
  let orbClassName = HEALTH_ORB_CLASS;
  if (percentage < 25) {
    orbClassName = `${HEALTH_ORB_CLASS} ${HEALTH_ORB_CRITICAL_CLASS}`;
  } else if (percentage < 50) {
    orbClassName = `${HEALTH_ORB_CLASS} ${HEALTH_ORB_WARNING_CLASS}`;
  }

  useEffect(() => {
    const previousClampedHealth = Math.max(0, Math.min(previousHealthRef.current, safeMaxHealth));
    const healthDelta = clampedHealth - previousClampedHealth;
    const gainedHealth = Math.max(healthDelta, 0);
    if (gainedHealth > 0) {
      healSegmentKeyRef.current += 1;
      healBurstKeyRef.current += 1;
      setRecentHealSegment({
        startHealth: previousClampedHealth,
        gainedHealth,
        key: healSegmentKeyRef.current
      });
      setRecentHealBurstKey(healBurstKeyRef.current);
    }

    if (healthDelta < 0) {
      damageBurstKeyRef.current += 1;
      setRecentDamageBurstKey(damageBurstKeyRef.current);
    }

    previousHealthRef.current = health;
  }, [clampedHealth, health, safeMaxHealth]);

  const healStartPercentage = recentHealSegment
    ? (recentHealSegment.startHealth / safeMaxHealth) * 100
    : 0;
  const healEndPercentage = recentHealSegment
    ? ((recentHealSegment.startHealth + recentHealSegment.gainedHealth) / safeMaxHealth) * 100
    : 0;
  const healSegmentLength = CIRCUMFERENCE * Math.max((healEndPercentage - healStartPercentage) / 100, 0);
  const healStartAngle = (healStartPercentage / 100) * 360;
  const healEndAngle = (healEndPercentage / 100) * 360;
  const healSegmentPath = recentHealSegment && healSegmentLength > 0
    ? describeArcPath(SIZE / 2, RADIUS, healStartAngle, healEndAngle)
    : null;

  return (
    <div
      className={orbClassName}
      style={orbStyle}
      aria-label={DISPLAY_TEXT.ui.hud.healthAria(clampedHealth, safeMaxHealth)}
    >
      {recentHealBurstKey > 0 ? (
        <div className={HEALTH_ORB_HEAL_BURST_CLASS} key={`heal-${recentHealBurstKey}`} aria-hidden={true}>
          <span className={HEALTH_ORB_HEAL_RING_CLASS} />
          {HEAL_SPARK_PARTICLES.map((particle, index) => (
            <span
              className={HEALTH_ORB_HEAL_SPARK_CLASS}
              key={`heal-spark-${recentHealBurstKey}-${index}`}
              style={{
                '--spark-x': `${particle.x}px`,
                '--spark-y': `${particle.y}px`,
                '--spark-drift-x': `${particle.driftX}px`,
                '--spark-rise': `${particle.rise}px`,
                '--spark-delay': `${particle.delay}ms`,
                '--spark-scale': `${particle.scale}`,
                '--spark-duration': `${particle.duration}ms`
              } as CSSProperties}
            />
          ))}
        </div>
      ) : null}
      {recentDamageBurstKey > 0 ? (
        <div className={HEALTH_ORB_DAMAGE_BURST_CLASS} key={`damage-${recentDamageBurstKey}`} aria-hidden={true}>
          <span className={HEALTH_ORB_DAMAGE_RING_CLASS} />
        </div>
      ) : null}
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
        {healSegmentPath && recentHealSegment ? (
          <path
            key={recentHealSegment.key}
            className="health-orb__heal-gain"
            d={healSegmentPath}
            strokeWidth={STROKE}
          />
        ) : null}
      </svg>
      <div className="health-orb__center">
        <span className="health-orb__value">{Math.round(clampedHealth)}</span>
        <span className="health-orb__label">{DISPLAY_TEXT.ui.hud.healthShort}</span>
      </div>
    </div>
  );
}
