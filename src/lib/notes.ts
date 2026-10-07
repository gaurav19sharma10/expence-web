/**
 * The note palette.
 *
 * Ported from the reference. These are the colours a note can be given, and they
 * are user-chosen data rather than part of the interface, so they do not change
 * with the theme — a note that turned white in dark mode would read as an empty
 * card rather than as the colour its author picked.
 */
export const NOTE_COLORS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Peach', hex: '#FFE0B2' },
  { name: 'Mint', hex: '#C8E6C9' },
  { name: 'Sky', hex: '#BBDEFB' },
  { name: 'Lemon', hex: '#FFF9C4' },
  { name: 'Lavender', hex: '#E1BEE7' },
  { name: 'Coral', hex: '#FFCDD2' },
  { name: 'Sage', hex: '#DCEDC8' },
];

export const DEFAULT_NOTE_COLOR = NOTE_COLORS[0].hex;

/**
 * A note colour needs a dark enough foreground to be readable on it.
 *
 * The pastel palette is all light, so the default body colour works on every
 * one of them — but the *dark* theme's body colour is near-white, which would be
 * unreadable on a pastel. Rather than let the theme decide text colour per card,
 * notes always get a dark ink, which is also what the reference does.
 */
export const NOTE_INK = '#1F2937';