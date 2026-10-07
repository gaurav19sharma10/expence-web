import React from 'react';

/**
 * Authentic vector illustrations matching the design language of RVS Expences.
 */

export const EmptyLedgerIllustration: React.FC<{ size?: number; className?: string }> = ({
  size = 180,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size * 0.86}
      viewBox="0 0 200 172"
      fill="none"
      className={`select-none ${className}`}
    >
      <defs>
        <linearGradient id="ledgerGrad" x1="60" y1="20" x2="150" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0057FF" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#0057FF" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* The glass card base */}
      <rect x="26" y="14" width="148" height="128" rx="24" fill="url(#ledgerGrad)" stroke="#0057FF" strokeWidth="1.5" strokeOpacity="0.2" />
      
      {/* Note / Card Lines */}
      <rect x="48" y="42" width="60" height="9" rx="4.5" fill="#0057FF" opacity="0.6" />
      <rect x="48" y="62" width="104" height="7" rx="3.5" fill="#94A3B8" opacity="0.4" />
      <rect x="48" y="79" width="86" height="7" rx="3.5" fill="#94A3B8" opacity="0.3" />
      <rect x="48" y="96" width="94" height="7" rx="3.5" fill="#94A3B8" opacity="0.2" />

      {/* Rupee coin badge */}
      <circle cx="140" cy="112" r="22" fill="#0057FF" opacity="0.12" />
      <circle cx="140" cy="112" r="16" fill="#0057FF" />
      <path
        d="M140 103v18M134 107.5h12M134 116.5h12"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const AllSettledIllustration: React.FC<{ size?: number; className?: string }> = ({
  size = 170,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size * 0.9}
      viewBox="0 0 200 180"
      fill="none"
      className={`select-none ${className}`}
    >
      <circle cx="100" cy="90" r="70" fill="#10B981" fillOpacity="0.08" />
      <circle cx="100" cy="90" r="50" fill="#10B981" fillOpacity="0.15" />
      
      {/* Central checkmark badge */}
      <circle cx="100" cy="90" r="32" fill="#10B981" />
      <path
        d="M88 90l8 8 16-16"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Decorative stars */}
      <circle cx="50" cy="50" r="3" fill="#10B981" opacity="0.5" />
      <circle cx="150" cy="55" r="4" fill="#0057FF" opacity="0.4" />
      <circle cx="145" cy="130" r="3" fill="#10B981" opacity="0.6" />
      <circle cx="55" cy="125" r="2.5" fill="#F59E0B" opacity="0.5" />
    </svg>
  );
};

export const FamilyPotIllustration: React.FC<{ size?: number; className?: string }> = ({
  size = 140,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      className={`select-none ${className}`}
    >
      <circle cx="70" cy="70" r="56" fill="#0057FF" fillOpacity="0.07" />
      
      {/* Vault / Piggy body */}
      <rect x="35" y="45" width="70" height="54" rx="16" fill="#0057FF" />
      <rect x="39" y="49" width="62" height="46" rx="12" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.3" />
      
      {/* Vault dial / rupee sign */}
      <circle cx="70" cy="72" r="14" fill="#FFFFFF" fillOpacity="0.2" />
      <circle cx="70" cy="72" r="10" fill="#FFFFFF" />
      <text x="70" y="76" textAnchor="middle" fill="#0057FF" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
        ₹
      </text>
      
      {/* Coin slot */}
      <rect x="58" y="38" width="24" height="4" rx="2" fill="#0057FF" />
    </svg>
  );
};

export const EmptyInsightsIllustration: React.FC<{ size?: number; className?: string }> = ({
  size = 170,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size * 0.84}
      viewBox="0 0 190 160"
      fill="none"
      className={className}
    >
      <rect x="18" y="20" width="154" height="120" rx="24" fill="#0057FF" fillOpacity="0.04" />
      <rect
        x="18.5"
        y="20.5"
        width="153"
        height="119"
        rx="23.5"
        stroke="#E2E8F0"
        strokeWidth="1.5"
      />

      <g opacity="0.6">
        <rect x="42" y="96" width="16" height="28" rx="8" fill="#0057FF" />
        <rect x="66" y="80" width="16" height="44" rx="8" fill="#3B82F6" />
        <rect x="90" y="104" width="16" height="20" rx="8" fill="#10B981" />
        <rect x="114" y="64" width="16" height="60" rx="8" fill="#F59E0B" />
        <rect x="138" y="88" width="16" height="36" rx="8" fill="#8B5CF6" />
      </g>

      <path d="M38 62c10-12 22 6 32-6s20 2 30-8" stroke="#0057FF" strokeWidth="2.6" strokeLinecap="round" opacity="0.6" />
      <circle cx="100" cy="48" r="4" fill="#0057FF" opacity="0.7" />
    </svg>
  );
};
