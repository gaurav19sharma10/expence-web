import React from 'react';

interface RvsLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const RvsLogo: React.FC<RvsLogoProps> = ({ size = 44, className = '', showText = false }) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div
        style={{ width: size, height: size }}
        className="relative rounded-2xl bg-[#0057FF] flex items-center justify-center shadow-md shadow-[#0057FF]/25 overflow-hidden flex-shrink-0 border border-white/20"
      >
        {/* Drawn inline rather than loaded from an image file: the reference
            falls back to this shape when `/logo.png` is missing, which it always
            was here, so the <img> only ever produced a broken-image flash. */}
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className="w-full h-full p-2.5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="RVS Expences"
        >
          {/* Native RVS Chevron Arch Peak */}
          <path d="M50 20 L22 68 A6 6 0 0 0 31 77 L50 44 L69 77 A6 6 0 0 0 78 68 Z" fill="#FFFFFF" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="font-bold tracking-tight text-lg text-gray-900 font-sans">
            RVS <span className="text-[#0057FF]">Expences</span>
          </span>
          <span className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase">
            Realtime Cloud Ledger
          </span>
        </div>
      )}
    </div>
  );
};
