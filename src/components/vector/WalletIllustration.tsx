import React from 'react';

/**
 * A wallet, for the allowance summary.
 *
 * Drawn rather than imported because the reference's illustration set has a
 * family-pot glyph and no wallet, and a pot is exactly the concept this replaces.
 */
export const WalletIllustration: React.FC<{ size?: number; className?: string }> = ({
  size = 56,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <rect x="4" y="14" width="56" height="38" rx="9" fill="#EBF2FF" />
    <rect x="4" y="14" width="56" height="38" rx="9" stroke="#0057FF" strokeWidth="2.5" />
    <path d="M4 26h34a6 6 0 0 1 6 6v2a6 6 0 0 1-6 6H4" fill="#0057FF" opacity="0.14" />
    <circle cx="46" cy="33" r="4.5" fill="#0057FF" />
    <path d="M14 14l4-5h14l4 5" stroke="#0057FF" strokeWidth="2.5" strokeLinejoin="round" />
  </svg>
);
