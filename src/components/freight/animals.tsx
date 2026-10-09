import type { CSSProperties, ReactNode } from 'react';
import styles from './animals.module.css';

// The shop's three delivery animals, ported from the design kit. Plain components with no
// hooks, so they render on the server; pages that only show them ship no JavaScript.

const INK = '#1F1A14';
const PAPER = '#F3E9D2';
const RED = '#8E2F23';
const WOOD = '#7A4E2A';
const DONKEY = '#5A5144';
const CRATE = '#C9A66B';
const BARREL = '#9B6B3A';

export type Repeat = number | 'infinite';

interface Motion {
  running?: boolean;
  legDuration?: number;
  legRepeat?: Repeat;
}

function motionStyle(vars: Record<string, string | number | undefined>): CSSProperties {
  return Object.fromEntries(
    Object.entries(vars)
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => [
        name,
        typeof value === 'number' && name.endsWith('duration') ? `${value}s` : String(value),
      ]),
  ) as CSSProperties;
}

function Legs({
  xs,
  y,
  length,
  width,
}: {
  xs: number[];
  y: number;
  length: number;
  width: number;
}) {
  return xs.map((x, i) => (
    <rect
      key={x}
      className={i % 2 ? styles.legB : styles.legA}
      x={x}
      y={y}
      width={width}
      height={length}
      rx={2}
      fill="currentColor"
    />
  ));
}

export function HorseFigure({ running, legDuration, legRepeat }: Motion) {
  return (
    <g
      className={`${styles.horse} ${running ? styles.running : ''}`}
      style={motionStyle({ '--leg-duration': legDuration, '--leg-repeat': legRepeat })}
    >
      <path
        d="M28 34 Q12 38 15 58"
        stroke={INK}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
      <Legs xs={[33, 42, 68, 77]} y={44} length={28} width={6} />
      <ellipse cx={55} cy={39} rx={30} ry={13} fill={INK} />
      <path d="M72 34 L88 10 L99 13 L88 44 Z" fill={INK} />
      <path d="M86 8 Q97 2 106 10 L113 21 Q111 27 104 25 L93 20 Z" fill={INK} />
      <path d="M90 8 L92 0 L96 7 Z" fill={INK} />
      <path d="M87 9 Q79 20 74 33" stroke={RED} strokeWidth={4} fill="none" strokeLinecap="round" />
      <circle cx={100} cy={12} r={1.4} fill={PAPER} />
      <path
        d="M36 34 Q55 29 74 35 M40 40 Q56 36 70 40"
        stroke={PAPER}
        strokeWidth={1}
        fill="none"
        opacity={0.45}
      />
    </g>
  );
}

export function DonkeyFigure({
  running,
  grazing,
  legDuration,
  legRepeat,
}: Motion & { grazing?: boolean }) {
  return (
    <g
      className={`${styles.donkey} ${running ? styles.running : ''}`}
      style={motionStyle({ '--leg-duration': legDuration, '--leg-repeat': legRepeat })}
    >
      <path
        d="M26 36 Q18 44 20 56"
        stroke={DONKEY}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <Legs xs={[30, 38, 60, 68]} y={46} length={20} width={5} />
      <ellipse cx={50} cy={40} rx={26} ry={12} fill={DONKEY} />
      <rect x={36} y={22} width={26} height={15} rx={3} fill={RED} stroke={INK} strokeWidth={1.5} />
      <path d="M40 27 H58 M40 32 H58" stroke={PAPER} strokeWidth={1} opacity={0.6} />
      <g className={grazing ? styles.grazingHead : undefined}>
        <path d="M66 34 L80 20 L88 24 L76 46 Z" fill={DONKEY} />
        <path d="M78 18 Q88 14 96 22 L100 32 Q98 36 92 34 L82 28 Z" fill={DONKEY} />
        <path d="M80 19 L75 2 L84 17 Z" fill={DONKEY} />
        <path d="M85 18 L88 1 L90 19 Z" fill={DONKEY} />
        <circle cx={96} cy={30} r={3} fill={PAPER} opacity={0.35} />
        <circle cx={88} cy={22} r={1.3} fill={PAPER} />
      </g>
    </g>
  );
}

const SPOKE_ANGLES = [0, 30, 60, 90, 120, 150];

function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g className={styles.wheel}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth={4} />
      {SPOKE_ANGLES.map((angle) => {
        const dx = Math.cos((angle * Math.PI) / 180) * r;
        const dy = Math.sin((angle * Math.PI) / 180) * r;
        return (
          <line
            key={angle}
            x1={cx - dx}
            y1={cy - dy}
            x2={cx + dx}
            y2={cy + dy}
            stroke={INK}
            strokeWidth={1.8}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={4} fill={INK} />
    </g>
  );
}

interface CartMotion {
  running?: boolean;
  spinDuration?: number;
  spinRepeat?: Repeat;
  bounceRepeat?: Repeat;
}

function CartFigure({ running, spinDuration, spinRepeat, bounceRepeat }: CartMotion) {
  return (
    <g
      className={running ? styles.running : undefined}
      style={motionStyle({
        '--spin-duration': spinDuration,
        '--spin-repeat': spinRepeat,
        '--bounce-repeat': bounceRepeat,
      })}
    >
      <line x1={98} y1={40} x2={126} y2={46} stroke={WOOD} strokeWidth={4} strokeLinecap="round" />
      <g className={styles.cartBed}>
        <rect x={16} y={6} width={26} height={18} fill={CRATE} stroke={INK} strokeWidth={1.5} />
        <path d="M16 6 L42 24 M42 6 L16 24" stroke={INK} strokeWidth={1} opacity={0.5} />
        <rect x={46} y={12} width={22} height={12} fill={CRATE} stroke={INK} strokeWidth={1.5} />
        <rect
          x={72}
          y={2}
          width={20}
          height={22}
          rx={6}
          fill={BARREL}
          stroke={INK}
          strokeWidth={1.5}
        />
        <path d="M72 9 H92 M72 17 H92" stroke={INK} strokeWidth={1.5} />
        <rect x={8} y={24} width={92} height={22} fill={WOOD} stroke={INK} strokeWidth={2} />
        <path d="M8 31 H100 M8 38 H100" stroke={INK} strokeWidth={1} opacity={0.6} />
      </g>
      <Wheel cx={50} cy={56} r={18} />
    </g>
  );
}

/** An SVG sized by width, keeping the viewBox's aspect ratio. */
export function AnimalSvg({
  viewBox,
  width,
  children,
}: {
  viewBox: string;
  width: number;
  children: ReactNode;
}) {
  const [, , w = 1, h = 1] = viewBox.split(' ').map(Number);
  return (
    <svg
      className={styles.svg}
      viewBox={viewBox}
      width={width}
      height={Math.round((width * h) / w)}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function Horse({ width, ...motion }: Motion & { width: number }) {
  return (
    <AnimalSvg viewBox="0 0 116 76" width={width}>
      <HorseFigure {...motion} />
    </AnimalSvg>
  );
}

export function Donkey({ width, ...motion }: Motion & { width: number; grazing?: boolean }) {
  return (
    <AnimalSvg viewBox="0 0 104 70" width={width}>
      <DonkeyFigure {...motion} />
    </AnimalSvg>
  );
}

/** Horse and cart: the charrete. */
export function Charrete({
  width,
  running,
  legDuration,
  legRepeat,
  spinDuration,
  spinRepeat,
  bounceRepeat,
}: Motion & CartMotion & { width: number }) {
  return (
    <AnimalSvg viewBox="0 0 240 80" width={width}>
      <CartFigure
        running={running}
        spinDuration={spinDuration}
        spinRepeat={spinRepeat}
        bounceRepeat={bounceRepeat}
      />
      <g transform="translate(122 2) scale(.92)">
        <HorseFigure running={running} legDuration={legDuration} legRepeat={legRepeat} />
      </g>
    </AnimalSvg>
  );
}
