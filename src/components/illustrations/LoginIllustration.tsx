import React from 'react';

interface LoginIllustrationProps {
  className?: string;
}

export const LoginIllustration: React.FC<LoginIllustrationProps> = ({ className = 'w-full h-auto' }) => {
  return (
    <svg
      viewBox="0 0 420 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ilustrasi bangunan gudang logistik dengan papan verifikasi checklist inventaris"
      className={className}
    >
      <defs>
        <linearGradient id="li-bg" x1="0" y1="0" x2="420" y2="520" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Decorative Warm Circular Glow */}
      <circle cx="210" cy="220" r="160" fill="url(#li-bg)" />
      <circle cx="210" cy="180" r="80" fill="#fde68a" fillOpacity="0.4" />

      {/* Warehouse Building in Background */}
      <g transform="translate(60, 160)">
        {/* Roof (#b45309) */}
        <path d="M0,70 L150,0 L300,70 L280,75 L150,15 L20,75 Z" fill="#b45309" />
        {/* Warehouse Main Body (#f59e0b) */}
        <rect x="20" y="70" width="260" height="190" rx="4" fill="#f59e0b" fillOpacity="0.95" />
        {/* Wall Panels Stripes */}
        <line x1="60" y1="70" x2="60" y2="260" stroke="#d97706" strokeWidth="2" strokeDasharray="6 4" />
        <line x1="100" y1="70" x2="100" y2="260" stroke="#d97706" strokeWidth="2" strokeDasharray="6 4" />
        <line x1="200" y1="70" x2="200" y2="260" stroke="#d97706" strokeWidth="2" strokeDasharray="6 4" />
        <line x1="240" y1="70" x2="240" y2="260" stroke="#d97706" strokeWidth="2" strokeDasharray="6 4" />
        {/* Warehouse Roll-up Shutter Door */}
        <rect x="110" y="140" width="80" height="120" rx="3" fill="#78716c" />
        <rect x="115" y="145" width="70" height="115" fill="#a8a29e" />
        <line x1="115" y1="165" x2="185" y2="165" stroke="#57534e" strokeWidth="2" />
        <line x1="115" y1="185" x2="185" y2="185" stroke="#57534e" strokeWidth="2" />
        <line x1="115" y1="205" x2="185" y2="205" stroke="#57534e" strokeWidth="2" />
        <line x1="115" y1="225" x2="185" y2="225" stroke="#57534e" strokeWidth="2" />
        <line x1="115" y1="245" x2="185" y2="245" stroke="#57534e" strokeWidth="2" />
      </g>

      {/* Ground & Boxes on Floor */}
      <rect x="30" y="420" width="360" height="6" rx="3" fill="#a8a29e" />
      {/* Box Stack Left */}
      <g transform="translate(60, 360)">
        <rect x="0" y="25" width="45" height="35" rx="3" fill="#d97706" />
        <rect x="10" y="32" width="12" height="6" rx="1" fill="#fef3c7" />
        <rect x="40" y="15" width="40" height="45" rx="3" fill="#f59e0b" />
        <line x1="60" y1="15" x2="60" y2="60" stroke="#d97706" strokeWidth="1.5" />
        <rect x="15" y="0" width="32" height="25" rx="2" fill="#b45309" />
      </g>
      {/* Box Stack Right */}
      <g transform="translate(300, 365)">
        <rect x="0" y="15" width="50" height="40" rx="3" fill="#f59e0b" />
        <rect x="10" y="0" width="35" height="20" rx="2" fill="#d97706" />
      </g>

      {/* Floating Clipboard Checklist (Angled) */}
      <g transform="translate(230, 160) rotate(8)">
        {/* Shadow */}
        <rect x="-8" y="-8" width="166" height="226" rx="14" fill="#000000" fillOpacity="0.08" />
        {/* Board */}
        <rect x="0" y="0" width="160" height="220" rx="12" fill="#92400e" />
        {/* Metal Clip */}
        <rect x="52" y="-14" width="56" height="22" rx="4" fill="#78716c" />
        <rect x="62" y="-8" width="36" height="10" rx="2" fill="#d6d3d1" />
        <circle cx="80" cy="-3" r="3" fill="#44403c" />
        {/* Paper */}
        <rect x="12" y="18" width="136" height="190" rx="6" fill="#ffffff" />
        {/* Header Line */}
        <rect x="24" y="32" width="70" height="8" rx="2" fill="#b45309" />
        <rect x="24" y="44" width="40" height="4" rx="1" fill="#d97706" />
        {/* Checklist Item 1 */}
        <rect x="24" y="65" width="14" height="14" rx="3" fill="#10b981" />
        <path d="M27,72 L30,75 L35,68" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        <rect x="44" y="69" width="75" height="6" rx="1.5" fill="#78716c" />
        {/* Checklist Item 2 */}
        <rect x="24" y="95" width="14" height="14" rx="3" fill="#10b981" />
        <path d="M27,102 L30,105 L35,98" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        <rect x="44" y="99" width="60" height="6" rx="1.5" fill="#78716c" />
        {/* Checklist Item 3 */}
        <rect x="24" y="125" width="14" height="14" rx="3" fill="#f59e0b" />
        <path d="M27,132 L35,132" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        <rect x="44" y="129" width="85" height="6" rx="1.5" fill="#78716c" />
        {/* Checklist Item 4 */}
        <rect x="24" y="155" width="14" height="14" rx="3" fill="#e7e5e4" />
        <rect x="44" y="159" width="50" height="6" rx="1.5" fill="#a8a29e" />
        {/* Verification Stamp / Seal */}
        <circle cx="120" cy="180" r="16" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="2" strokeDasharray="3 2" />
        <path d="M115,180 L118,183 L126,176" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
};
