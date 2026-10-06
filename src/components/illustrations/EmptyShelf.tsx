import React from 'react';

interface EmptyShelfProps {
  className?: string;
}

export const EmptyShelf: React.FC<EmptyShelfProps> = ({ className = 'w-full h-auto' }) => {
  return (
    <svg
      viewBox="0 0 320 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ilustrasi rak gudang kosong bertingkat dengan kaca pembesar"
      className={className}
    >
      {/* Bayangan Elips di Bawah Lantai */}
      <ellipse cx="160" cy="215" rx="105" ry="9" fill="#d6d3d1" />

      {/* Partikel Debu Amber Melayang */}
      <circle cx="55" cy="70" r="3" fill="#f59e0b" fillOpacity="0.75" />
      <circle cx="265" cy="80" r="2.5" fill="#d97706" fillOpacity="0.65" />
      <circle cx="275" cy="150" r="3" fill="#fbbf24" fillOpacity="0.7" />
      <circle cx="48" cy="155" r="2" fill="#b45309" fillOpacity="0.5" />
      <circle cx="85" cy="40" r="2.5" fill="#f59e0b" fillOpacity="0.6" />
      <circle cx="235" cy="38" r="3" fill="#fbbf24" fillOpacity="0.65" />

      {/* RAK KOSONG (Tiang #92400e, 3 Papan #b45309) */}
      {/* Tiang Kiri dan Kanan */}
      <rect x="65" y="35" width="8" height="175" rx="2" fill="#92400e" />
      <rect x="247" y="35" width="8" height="175" rx="2" fill="#92400e" />

      {/* Palang Silang Stabilisator */}
      <line x1="73" y1="40" x2="247" y2="95" stroke="#b45309" strokeWidth="1.5" strokeOpacity="0.3" />
      <line x1="73" y1="95" x2="247" y2="40" stroke="#b45309" strokeWidth="1.5" strokeOpacity="0.3" />
      <line x1="73" y1="100" x2="247" y2="150" stroke="#b45309" strokeWidth="1.5" strokeOpacity="0.3" />
      <line x1="73" y1="150" x2="247" y2="100" stroke="#b45309" strokeWidth="1.5" strokeOpacity="0.3" />

      {/* 3 Papan Rak #b45309 */}
      {/* Papan Atas */}
      <rect x="60" y="85" width="200" height="7" rx="1.5" fill="#b45309" />
      {/* Papan Tengah */}
      <rect x="60" y="145" width="200" height="7" rx="1.5" fill="#b45309" />
      {/* Papan Bawah */}
      <rect x="60" y="200" width="200" height="7" rx="1.5" fill="#b45309" />

      {/* Satu Box Kecil Tertinggal di Papan Atas (#f59e0b / #d97706) */}
      <g transform="translate(90, 57)">
        <rect x="0" y="0" width="32" height="28" rx="2" fill="#f59e0b" />
        <path d="M0,0 L16,8 L32,0" fill="#d97706" />
        <rect x="9" y="11" width="14" height="6" rx="1" fill="#fffbeb" />
        <line x1="12" y1="14" x2="20" y2="14" stroke="#a8a29e" strokeWidth="1" />
      </g>

      {/* KACA PEMBESAR BERSANDAR DI RAK (Bingkai #b45309, Kaca Biru Muda Transparan #bae6fd) */}
      <g transform="translate(185, 115) rotate(-18)">
        {/* Lensa Kaca Biru Muda Transparan */}
        <circle cx="36" cy="36" r="28" fill="#bae6fd" fillOpacity="0.4" stroke="#b45309" strokeWidth="5" />
        <path d="M22,24 Q36,18 48,26" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85" />

        {/* Gagang Kaca Pembesar */}
        <rect x="56" y="52" width="34" height="8" rx="4" transform="rotate(45 56 52)" fill="#92400e" />
        <rect x="58" y="54" width="12" height="4" rx="2" transform="rotate(45 58 54)" fill="#b45309" />
      </g>
    </svg>
  );
};
