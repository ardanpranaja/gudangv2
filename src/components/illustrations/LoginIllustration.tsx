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
      aria-label="Ilustrasi bangunan gudang logistik dan papan checklist verifikasi admin"
      className={className}
    >
      <defs>
        <linearGradient id="li-bg" x1="0" y1="0" x2="0" y2="520" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>
      </defs>

      {/* Background Frame Rounded rx="24" Gradien Krem */}
      <rect width="420" height="520" rx="24" fill="url(#li-bg)" />

      {/* Matahari & Awan Kecil */}
      <circle cx="90" cy="70" r="32" fill="#f59e0b" fillOpacity="0.85" />
      <circle cx="90" cy="70" r="42" fill="#fbbf24" fillOpacity="0.25" />
      <path d="M140,75 Q150,62 165,65 Q180,58 195,70 Q205,70 210,78 Q210,85 200,85 L145,85 Z" fill="#ffffff" fillOpacity="0.85" />

      {/* Lantai Stone */}
      <rect y="440" width="420" height="80" fill="#d6d3d1" />
      <line x1="0" y1="440" x2="420" y2="440" stroke="#a8a29e" strokeWidth="2" />

      {/* BANGUNAN GUDANG (Dinding #f59e0b, Atap Segitiga #b45309, Pintu #92400e, Jendela Krem) */}
      <g transform="translate(30, 160)">
        <path d="M0,80 L130,10 L260,80 Z" fill="#b45309" />
        <path d="M-6,82 L130,8 L266,82" stroke="#92400e" strokeWidth="4" />

        <rect x="15" y="80" width="230" height="200" fill="#f59e0b" rx="2" />
        <line x1="60" y1="80" x2="60" y2="280" stroke="#d97706" strokeWidth="1.5" strokeDasharray="6 4" />
        <line x1="105" y1="80" x2="105" y2="280" stroke="#d97706" strokeWidth="1.5" strokeDasharray="6 4" />
        <line x1="155" y1="80" x2="155" y2="280" stroke="#d97706" strokeWidth="1.5" strokeDasharray="6 4" />
        <line x1="200" y1="80" x2="200" y2="280" stroke="#d97706" strokeWidth="1.5" strokeDasharray="6 4" />

        {/* Jendela Krem */}
        <rect x="40" y="105" width="45" height="35" rx="3" fill="#fffbeb" />
        <line x1="62" y1="105" x2="62" y2="140" stroke="#d97706" strokeWidth="2" />
        <line x1="40" y1="122" x2="85" y2="122" stroke="#d97706" strokeWidth="2" />
        <rect x="175" y="105" width="45" height="35" rx="3" fill="#fffbeb" />
        <line x1="197" y1="105" x2="197" y2="140" stroke="#d97706" strokeWidth="2" />
        <line x1="175" y1="122" x2="220" y2="122" stroke="#d97706" strokeWidth="2" />

        {/* Pintu Gudang #92400e */}
        <rect x="95" y="165" width="70" height="115" rx="3" fill="#92400e" />
        <rect x="100" y="170" width="60" height="110" fill="#78350f" />
        <line x1="100" y1="195" x2="160" y2="195" stroke="#92400e" strokeWidth="2" />
        <line x1="100" y1="220" x2="160" y2="220" stroke="#92400e" strokeWidth="2" />
        <line x1="100" y1="245" x2="160" y2="245" stroke="#92400e" strokeWidth="2" />
        <circle cx="150" cy="225" r="3" fill="#f59e0b" />
      </g>

      {/* BOX-BOX DI DEPAN BANGUNAN */}
      <g transform="translate(45, 410)">
        <rect x="0" y="10" width="40" height="30" fill="#d97706" rx="2" />
        <rect x="6" y="16" width="10" height="5" fill="#fffbeb" rx="1" />
        <rect x="35" y="0" width="45" height="40" fill="#f59e0b" rx="2" />
        <rect x="42" y="8" width="12" height="6" fill="#fffbeb" rx="1" />
        <rect x="12" y="-18" width="30" height="22" fill="#b45309" rx="2" />
      </g>
      <g transform="translate(250, 418)">
        <rect x="0" y="6" width="44" height="34" fill="#f59e0b" rx="2" />
        <rect x="8" y="14" width="12" height="5" fill="#fffbeb" rx="1" />
        <rect x="38" y="12" width="36" height="28" fill="#d97706" rx="2" />
      </g>

      {/* CLIPBOARD CHECKLIST (3 baris, lingkaran amber + centang hijau #059669) */}
      <g transform="translate(245, 95) rotate(10)">
        <rect x="-4" y="-4" width="148" height="198" rx="12" fill="#78716c" fillOpacity="0.2" />
        <rect x="0" y="0" width="140" height="190" rx="10" fill="#b45309" />
        <rect x="42" y="-10" width="56" height="18" rx="4" fill="#78716c" />
        <circle cx="70" cy="-1" r="3" fill="#ffffff" />

        <rect x="8" y="16" width="124" height="166" rx="6" fill="#ffffff" />
        <rect x="20" y="28" width="55" height="6" rx="2" fill="#b45309" />
        <rect x="20" y="38" width="35" height="4" rx="1" fill="#f59e0b" />

        {/* Baris 1 */}
        <circle cx="30" cy="62" r="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <path d="M26,62 L29,65 L34,58" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="44" y="59" width="65" height="6" rx="2" fill="#78716c" />

        {/* Baris 2 */}
        <circle cx="30" cy="94" r="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <path d="M26,94 L29,97 L34,90" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="44" y="91" width="55" height="6" rx="2" fill="#78716c" />

        {/* Baris 3 */}
        <circle cx="30" cy="126" r="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <path d="M26,126 L29,129 L34,122" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="44" y="123" width="70" height="6" rx="2" fill="#78716c" />
      </g>
    </svg>
  );
};
