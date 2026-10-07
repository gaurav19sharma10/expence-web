import React from 'react';

/**
 * Authentic hand-authored 24x24 vector icon set ported directly
 * from RVS Expences native Android app (src/components/vector/icons.tsx).
 *
 * Every glyph uses hand-crafted SVG paths on a 24x24 grid with optical balance.
 */

type IconDef = {
  paths?: readonly string[];
  circles?: readonly (readonly [number, number, number])[];
};

export const ICONS: Record<string, IconDef> = {
  // ------------------------------------------------------------ Categories
  basket: {
    paths: [
      'M4.5 9h15l-1.4 9.6a2.5 2.5 0 0 1-2.5 2.2H8.4a2.5 2.5 0 0 1-2.5-2.2z',
      'M8.5 9 12 2.5 15.5 9',
      'M9.8 13v4.4M14.2 13v4.4',
    ],
  },
  utensils: {
    paths: [
      'M7 2v6.5a2.5 2.5 0 0 1-5 0V2',
      'M4.5 11.5V22',
      'M17 2c-1.6 1.1-2.4 3-2.4 5.3 0 2.2.9 3.7 2.4 4.4V22',
    ],
  },
  car: {
    paths: [
      'M19 17h2a1 1 0 0 0 1-1v-3.2a2 2 0 0 0-1.5-1.9C18.6 10.4 16 10 12 10s-6.6.4-7.5.9A2 2 0 0 0 3 12.8V16a1 1 0 0 0 1 1h2',
      'M9 10.2V6h6v4.2',
      'M4 17h16',
    ],
    circles: [
      [7, 17.5, 2.2],
      [17, 17.5, 2.2],
    ],
  },
  fuel: {
    paths: [
      'M3 22V12a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10',
      'M2 22h12',
      'M6 6.5V4.5A2.5 2.5 0 0 1 8.5 2h3A2.5 2.5 0 0 1 14 4.5v2',
      'M13 12h2.5a2 2 0 0 0 2-2V9.2L14.6 6',
      'M17.5 11v4',
    ],
  },
  home: {
    paths: [
      'M3 9.6 12 3l9 6.6V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      'M9.5 22v-8.5h5V22',
    ],
  },
  bolt: {
    paths: ['M13.2 2 4 13.4h6.6L9.8 22 19 10.6h-6.6z'],
  },
  heart: {
    paths: [
      'M20.8 5.1a5.4 5.4 0 0 0-7.6 0L12 6.3l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.1L12 21l7.6-7.2 1.2-1.1a5.4 5.4 0 0 0 0-7.6z',
    ],
  },
  book: {
    paths: [
      'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
      'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
    ],
  },
  bag: {
    paths: [
      'M6 2 3 6.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.2L18 2z',
      'M3 6.2h18',
      'M16 10.5a4 4 0 0 1-8 0',
    ],
  },
  film: {
    paths: [
      'M4 2.5h16a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 20V4A1.5 1.5 0 0 1 4 2.5z',
      'M7 2.5v19',
      'M17 2.5v19',
      'M2.5 12h19',
      'M2.5 7.2H7',
      'M2.5 16.8H7',
      'M17 7.2h4.5',
      'M17 16.8h4.5',
    ],
  },
  repeat: {
    paths: [
      'M17 1.5 21 5.5 17 9.5',
      'M3 11.5V9.5a4 4 0 0 1 4-4h14',
      'M7 22.5 3 18.5 7 14.5',
      'M21 12.5v2a4 4 0 0 1-4 4H3',
    ],
  },
  users: {
    paths: [
      'M16.5 21v-2a4 4 0 0 0-4-4h-6a4 4 0 0 0-4 4v2',
      'M9.5 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
      'M22 21v-2a4 4 0 0 0-3-3.9',
      'M15.5 3.7a4 4 0 0 1 0 7.7',
    ],
  },
  plane: {
    paths: [
      'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.8c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
    ],
  },
  gift: {
    paths: [
      'M3.5 8.5h17v3.5h-17z',
      'M12 8.5V22',
      'M19.5 12v7.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V12',
      'M7.8 8.5a2.6 2.6 0 0 1 0-5.2C11 3.3 12 8.5 12 8.5s1-5.2 4.2-5.2a2.6 2.6 0 0 1 0 5.2',
    ],
  },
  paw: {
    paths: [
      'M9.8 2.5h1.4a2 2 0 0 1 2 2v1.6a2 2 0 0 1-2 2h-1.4a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2z',
      'M12 12.2a6 6 0 0 1 6 6c0 2-1.5 3-3 3-1 0-1.6-.5-3-.5s-2 .5-3 .5c-1.5 0-3-1-3-3a6 6 0 0 1 6-6z',
    ],
    circles: [
      [4.6, 7.4, 2.1],
      [19.4, 7.4, 2.1],
    ],
  },
  shield: {
    paths: ['M12 21.5s7.5-3.6 7.5-9.3V5.2L12 2.5 4.5 5.2v7c0 5.7 7.5 9.3 7.5 9.3z'],
  },
  dots: {
    circles: [
      [12, 12, 1.6],
      [12, 5.5, 1.6],
      [12, 18.5, 1.6],
      [5.5, 12, 1.6],
      [18.5, 12, 1.6],
    ],
  },
  wallet: {
    paths: [
      'M20 8.5V7a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H18a2 2 0 0 0 2-2v-1.5',
      'M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v1.5',
      'M22 11.5h-4a2 2 0 0 0 0 4h4z',
    ],
  },

  // ------------------------------------------------------------ Interface & Actions
  plus: { paths: ['M12 5v14', 'M5 12h14'] },
  minus: { paths: ['M5 12h14'] },
  check: { paths: ['M20 6.5 9.5 17 4 11.5'] },
  close: { paths: ['M18 6 6 18', 'M6 6l12 12'] },
  chevronLeft: { paths: ['M15 18.5 8.5 12 15 5.5'] },
  chevronRight: { paths: ['M9 5.5 15.5 12 9 18.5'] },
  chevronDown: { paths: ['M5.5 9 12 15.5 18.5 9'] },
  chevronUp: { paths: ['M18.5 15 12 8.5 5.5 15'] },
  search: { paths: ['M20.5 20.5 16.6 16.6'], circles: [[11, 11, 6.8]] },
  filter: { paths: ['M3.5 5.5h17', 'M6.5 12h11', 'M10 18.5h4'] },
  sliders: {
    paths: ['M4 7.5h6', 'M14 7.5h6', 'M4 16.5h8', 'M16 16.5h4'],
    circles: [
      [12, 7.5, 2.2],
      [14, 16.5, 2.2],
    ],
  },
  bell: {
    paths: ['M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5', 'M13.7 20.5a2 2 0 0 1-3.4 0'],
  },
  camera: {
    paths: ['M21 19.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h3.2L10 3.5h4L14.8 6.5H18a2 2 0 0 1 2 2z'],
    circles: [[12, 13, 3.8]],
  },
  image: {
    paths: [
      'M4.5 3.5h15a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z',
      'M20.5 15 16 10.5 6.5 20.5',
    ],
    circles: [[8.5, 8.5, 1.6]],
  },
  share: {
    paths: ['M8.4 13.6l6.8 4', 'M15.6 6.4l-6.8 4'],
    circles: [
      [18, 5, 2.8],
      [6, 12, 2.8],
      [18, 19, 2.8],
    ],
  },
  download: {
    paths: ['M20.5 15.5V19a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-3.5', 'M7.5 10.5 12 15l4.5-4.5', 'M12 15V3'],
  },
  trash: {
    paths: [
      'M3.5 6h17',
      'M8.5 6V4.2a1.2 1.2 0 0 1 1.2-1.2h4.6a1.2 1.2 0 0 1 1.2 1.2V6',
      'M18.5 6l-.9 13.1a2 2 0 0 1-2 1.9H8.4a2 2 0 0 1-2-1.9L5.5 6',
      'M10 10.5v6',
      'M14 10.5v6',
    ],
  },
  edit: { paths: ['M17 3.2a2.85 2.85 0 0 1 4 4L7.7 20.5 2.5 22l1.5-5.2z'] },
  undo: { paths: ['M9 14.5 4 9.5l5-5', 'M4 9.5h11.5a4.5 4.5 0 0 1 0 9H13'] },
  lock: {
    paths: [
      'M4.5 11.5h15a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20v-7a1.5 1.5 0 0 1 1.5-1.5z',
      'M7 11.5V7a5 5 0 0 1 10 0v4.5',
    ],
  },
  refresh: {
    paths: [
      'M22.5 4.5v6h-6',
      'M1.5 19.5v-6h6',
      'M3.7 9.2a8.5 8.5 0 0 1 2-3.2L1.5 4.5',
      'M20.3 14.8a8.5 8.5 0 0 1-2 3.2l4.2 1.5',
    ],
  },
  cloud: {
    paths: ['M18 10.5h-1.3a7.5 7.5 0 0 0-14.6-1.6A6 6 0 0 0 6 20.5h12a5 5 0 0 0 0-10z'],
  },
  cloudOff: {
    paths: [
      'M21.5 15.9A5 5 0 0 0 18 10.5h-1.3a7.5 7.5 0 0 0-7-5.6',
      'M5.2 6.4a7.5 7.5 0 0 0-1.1 2.5A6 6 0 0 0 6 20.5h11.8',
      'M1.5 1.5l21 21',
    ],
  },
  calendar: {
    paths: [
      'M4.5 4.5h15a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19V6a1.5 1.5 0 0 1 1.5-1.5z',
      'M16 2.5v4',
      'M8 2.5v4',
      'M3 10h18',
    ],
  },
  chart: { paths: ['M3.5 3.5v17h17', 'M7.5 15l3.5-4.5 3 2.5 5-6.5'] },
  sparkles: {
    paths: [
      'M11.5 2.5 13.4 7.6 18.5 9.5 13.4 11.4 11.5 16.5 9.6 11.4 4.5 9.5 9.6 7.6z',
      'M18.5 15.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z',
    ],
  },
  arrowUp: { paths: ['M12 20V5', 'M5.5 11.5 12 5l6.5 6.5'] },
  arrowDown: { paths: ['M12 4v15', 'M18.5 12.5 12 19l-6.5-6.5'] },
  arrowRight: { paths: ['M4.5 12h15', 'M12.5 5l7 7-7 7'] },
  arrowLeftRight: {
    paths: ['M7.5 3 3 7.5 7.5 12', 'M3 7.5h17', 'M16.5 21 21 16.5 16.5 12', 'M21 16.5H4'],
  },
  copy: {
    paths: [
      'M9.5 8.5h9a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 8 19v-9a1.5 1.5 0 0 1 1.5-1.5z',
      'M5 15.5H4.5A1.5 1.5 0 0 1 3 14V4.5A1.5 1.5 0 0 1 4.5 3H14a1.5 1.5 0 0 1 1.5 1.5V5',
    ],
  },
  userPlus: {
    paths: ['M15.5 21v-2a4 4 0 0 0-4-4h-6a4 4 0 0 0-4 4v2', 'M20.5 8v6', 'M23.5 11h-6'],
    circles: [[8.5, 7, 4]],
  },
  logout: {
    paths: ['M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 16.5 20.5 12 16 7.5', 'M20.5 12H9.5'],
  },
  receipt: {
    paths: [
      'M4.5 2.5v19l2.5-1.6 2.5 1.6 2.5-1.6 2.5 1.6 2.5-1.6V2.5L19.5 4 17 2.5 14.5 4 12 2.5 9.5 4 7 2.5z',
      'M8.5 8.5h7',
      'M8.5 12.5h7',
      'M8.5 16.5h4',
    ],
  },
  alert: {
    paths: ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4.5', 'M12 17.2h.01'],
  },
  info: {
    paths: ['M12 16.5v-4.5', 'M12 7.8h.01'],
    circles: [[12, 12, 9.5]],
  },
  scale: {
    paths: ['M12 3v18', 'M7 21h10', 'M5 7.5h14', 'M5 7.5 2 14h6z', 'M19 7.5 16 14h6z', 'M9 3h6'],
  },
  trending: {
    paths: ['M22 6.5 13.5 15 9.5 11l-7.5 7.5', 'M16 6.5h6v6'],
  },
  clock: {
    paths: ['M12 7v5.2l3.2 2'],
    circles: [[12, 12, 9.5]],
  },
  target: {
    paths: [
      'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19z',
      'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z',
      'M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    ],
  },
  moreHorizontal: {
    circles: [
      [5, 12, 1.6],
      [12, 12, 1.6],
      [19, 12, 1.6],
    ],
  },
  pin: {
    paths: [
      'M16 3l5 5-2.5 2.5-1-1-4 4 1 5-2 2-4-5-5-1 2-2 5 1 4-4-1-1L16 3z',
      'M8 16l-5 5',
    ],
  },
  palette: {
    paths: [
      'M12 2C6.5 2 2 6.5 2 12c0 3 1.8 5.6 4.4 6.7.7.3 1.6-.2 1.6-1v-1.2c0-.8.7-1.5 1.5-1.5h1.5c4.4 0 8-3.6 8-8 0-4.4-3.1-7-7-7z',
    ],
    circles: [
      [7.5, 8.5, 1.3],
      [11.5, 6, 1.3],
      [15.5, 8.5, 1.3],
      [16.5, 12.5, 1.3],
    ],
  },
};

/**
 * Intelligent mapper from category name or icon key to canonical native icon key.
 */
export function resolveIconKey(name: string): string {
  const raw = (name || '').trim();
  const norm = raw.toLowerCase();

  // Exact key first, then the lower-cased form.
  //
  // Several keys in this set are camelCase -- chevronRight, chevronUp,
  // moreHorizontal, arrowLeftRight. Lower-casing the input *before* the direct
  // lookup made every one of them unreachable, because 'chevronright' is not a
  // key, so each of them fell all the way through to the generic dots glyph. It
  // never threw and never logged anything: a row of identical dots is what a
  // mistyped icon name looks like.
  if (ICONS[raw]) return raw;
  if (ICONS[norm]) return norm;

  // Category name / keyword aliases
  if (norm.includes('grocer') || norm.includes('cart') || norm === 'basket') return 'basket';
  if (norm.includes('food') || norm.includes('din') || norm.includes('restaurant') || norm === 'utensils') return 'utensils';
  if (norm.includes('transport') || norm.includes('vehicle') || norm.includes('car') || norm.includes('taxi') || norm.includes('ride')) return 'car';
  if (norm.includes('fuel') || norm.includes('gas') || norm.includes('petrol') || norm.includes('diesel')) return 'fuel';
  if (norm.includes('rent') || norm.includes('home') || norm.includes('house') || norm.includes('flat') || norm.includes('room')) return 'home';
  if (norm.includes('utilit') || norm.includes('bill') || norm.includes('electr') || norm.includes('power') || norm === 'bolt') return 'bolt';
  if (norm.includes('health') || norm.includes('medic') || norm.includes('doctor') || norm.includes('hospital') || norm === 'heart') return 'heart';
  if (norm.includes('educat') || norm.includes('study') || norm.includes('school') || norm.includes('course') || norm === 'book') return 'book';
  if (norm.includes('shop') || norm.includes('cloth') || norm.includes('dress') || norm === 'bag') return 'bag';
  if (norm.includes('entertain') || norm.includes('movie') || norm.includes('cinema') || norm === 'film') return 'film';
  if (norm.includes('sub') || norm.includes('recur') || norm.includes('netflix') || norm === 'repeat') return 'repeat';
  if (norm.includes('fam') || norm.includes('kid') || norm.includes('child') || norm === 'users') return 'users';
  if (norm.includes('travel') || norm.includes('flight') || norm.includes('vacation') || norm.includes('trip') || norm === 'plane') return 'plane';
  if (norm.includes('gift') || norm.includes('present') || norm.includes('birthday')) return 'gift';
  if (norm.includes('pet') || norm.includes('dog') || norm.includes('cat') || norm === 'paw') return 'paw';
  if (norm.includes('insur') || norm.includes('policy') || norm === 'shield') return 'shield';
  if (norm.includes('save') || norm.includes('saving') || norm.includes('pot') || norm.includes('cash') || norm.includes('wallet')) return 'wallet';
  if (norm.includes('phone') || norm.includes('mobile') || norm.includes('wifi') || norm.includes('internet') || norm.includes('telecom')) return 'bolt';
  if (norm.includes('pin')) return 'pin';
  if (norm.includes('palette') || norm.includes('color')) return 'palette';
  if (norm.includes('trash') || norm.includes('delete')) return 'trash';
  if (norm.includes('edit')) return 'edit';
  if (norm.includes('check') || norm.includes('done')) return 'check';
  if (norm.includes('close') || norm.includes('cancel')) return 'close';
  if (norm.includes('search')) return 'search';
  if (norm.includes('copy')) return 'copy';
  if (norm.includes('refresh') || norm.includes('sync')) return 'refresh';
  if (norm.includes('scale') || norm.includes('split') || norm.includes('balance')) return 'scale';
  if (norm.includes('chart') || norm.includes('insight')) return 'chart';

  // Fallback to dots (the native app's default for General/Other)
  return 'dots';
}

export interface VectorIconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const VectorIcon: React.FC<VectorIconProps> = ({
  name,
  size = 20,
  color = 'currentColor',
  className = '',
  strokeWidth = 1.75,
}) => {
  const iconKey = resolveIconKey(name);
  const def = ICONS[iconKey] || ICONS.dots;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      {def.paths?.map((d, index) => (
        <path
          key={`p-${index}`}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {def.circles?.map(([cx, cy, r], index) => (
        <circle
          key={`c-${index}`}
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      ))}
    </svg>
  );
};
