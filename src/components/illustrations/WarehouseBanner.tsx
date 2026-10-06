import React from 'react';

interface WarehouseBannerProps {
  className?: string;
}

export const WarehouseBanner: React.FC<WarehouseBannerProps> = ({ className = 'w-full h-auto' }) => {
  return (
    <svg
      viewBox="0 0 800 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ilustrasi suasana gudang penyimpanan dengan rak bertingkat, kotak inventaris, dan forklift"
      className={className}
    >
      <defs>
        <linearGradient id="wb-sky-grad" x1="0" y1="0" x2="0" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>
      </defs>

      {/* Background Frame / Langit Krem Vertikal */}
      <rect width="800" height="280" rx="16" fill="url(#wb-sky-grad)" />

      {/* Matahari Amber */}
      <circle cx="400" cy="85" r="40" fill="#f59e0b" fillOpacity="0.85" />
      <circle cx="400" cy="85" r="52" fill="#fbbf24" fillOpacity="0.25" />

      {/* Awan Putih Datar Geometris */}
      <path d="M220,70 Q235,55 255,60 Q275,50 295,65 Q310,65 315,75 Q315,85 305,85 L225,85 Z" fill="#ffffff" fillOpacity="0.8" />
      <path d="M490,60 Q502,48 518,52 Q534,44 550,56 Q562,56 566,64 Q566,72 558,72 L494,72 Z" fill="#ffffff" fillOpacity="0.75" />

      {/* Lantai Stone Netral */}
      <rect y="210" width="800" height="70" fill="#d6d3d1" />
      <line x1="0" y1="210" x2="800" y2="210" stroke="#a8a29e" strokeWidth="2" />
      <line x1="180" y1="210" x2="110" y2="280" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="8 6" />
      <line x1="620" y1="210" x2="690" y2="280" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="8 6" />

      {/* RAK GUDANG KIRI (Tiang #92400e, Papan #b45309) */}
      <g>
        <rect x="50" y="45" width="10" height="165" fill="#92400e" rx="1" />
        <rect x="180" y="45" width="10" height="165" fill="#92400e" rx="1" />
        <rect x="44" y="95" width="152" height="7" fill="#b45309" rx="1" />
        <rect x="44" y="150" width="152" height="7" fill="#b45309" rx="1" />
        <rect x="44" y="203" width="152" height="7" fill="#b45309" rx="1" />
        {/* Box-box */}
        <rect x="68" y="65" width="34" height="30" fill="#d97706" rx="2" />
        <rect x="73" y="72" width="12" height="5" fill="#fffbeb" rx="1" />
        <rect x="110" y="58" width="42" height="37" fill="#f59e0b" rx="2" />
        <rect x="116" y="66" width="14" height="6" fill="#fffbeb" rx="1" />
        <rect x="65" y="118" width="46" height="32" fill="#f59e0b" rx="2" />
        <rect x="71" y="125" width="14" height="5" fill="#fffbeb" rx="1" />
        <rect x="118" y="112" width="40" height="38" fill="#d97706" rx="2" />
        <rect x="124" y="120" width="12" height="6" fill="#fffbeb" rx="1" />
        <rect x="66" y="168" width="52" height="35" fill="#d97706" rx="2" />
        <rect x="72" y="176" width="16" height="6" fill="#fffbeb" rx="1" />
        <rect x="125" y="162" width="45" height="41" fill="#f59e0b" rx="2" />
        <rect x="131" y="170" width="15" height="6" fill="#fffbeb" rx="1" />
      </g>

      {/* RAK GUDANG KANAN (Tiang #92400e, Papan #b45309) */}
      <g>
        <rect x="610" y="45" width="10" height="165" fill="#92400e" rx="1" />
        <rect x="740" y="45" width="10" height="165" fill="#92400e" rx="1" />
        <rect x="604" y="95" width="152" height="7" fill="#b45309" rx="1" />
        <rect x="604" y="150" width="152" height="7" fill="#b45309" rx="1" />
        <rect x="604" y="203" width="152" height="7" fill="#b45309" rx="1" />
        {/* Box-box */}
        <rect x="626" y="60" width="44" height="35" fill="#f59e0b" rx="2" />
        <rect x="632" y="68" width="14" height="5" fill="#fffbeb" rx="1" />
        <rect x="678" y="66" width="36" height="29" fill="#d97706" rx="2" />
        <rect x="684" y="73" width="12" height="5" fill="#fffbeb" rx="1" />
        <rect x="624" y="115" width="40" height="35" fill="#d97706" rx="2" />
        <rect x="630" y="122" width="12" height="5" fill="#fffbeb" rx="1" />
        <rect x="672" y="110" width="48" height="40" fill="#f59e0b" rx="2" />
        <rect x="678" y="118" width="15" height="6" fill="#fffbeb" rx="1" />
        <rect x="628" y="165" width="46" height="38" fill="#f59e0b" rx="2" />
        <rect x="634" y="173" width="15" height="6" fill="#fffbeb" rx="1" />
        <rect x="682" y="168" width="42" height="35" fill="#d97706" rx="2" />
        <rect x="688" y="176" width="13" height="5" fill="#fffbeb" rx="1" />
      </g>

      {/* FORKLIFT SEDERHANA DI TENGAH */}
      <g transform="translate(305, 160)">
        <rect x="92" y="-22" width="6" height="68" fill="#44403c" rx="1" />
        <rect x="94" y="40" width="28" height="4" fill="#44403c" rx="1" />
        <rect x="100" y="16" width="25" height="24" fill="#f59e0b" rx="2" />
        <rect x="105" y="23" width="10" height="5" fill="#fffbeb" rx="1" />
        <line x1="112" y1="16" x2="112" y2="40" stroke="#d97706" strokeWidth="1" />
        <path d="M42,-14 L72,-14 L76,16 L38,16 Z" fill="#92400e" rx="2" />
        <path d="M46,-10 L68,-10 L71,12 L43,12 Z" fill="#bae6fd" />
        <rect x="22" y="16" width="68" height="28" fill="#b45309" rx="4" />
        <rect x="16" y="20" width="12" height="20" fill="#92400e" rx="2" />
        <circle cx="38" cy="45" r="10" fill="#44403c" />
        <circle cx="38" cy="45" r="4" fill="#a8a29e" />
        <circle cx="80" cy="45" r="10" fill="#44403c" />
        <circle cx="80" cy="45" r="4" fill="#a8a29e" />
      </g>

      {/* SATU BOX TERGELETAK DI DEPAN */}
      <g transform="translate(475, 218)">
        <ellipse cx="24" cy="24" rx="28" ry="6" fill="#a8a29e" fillOpacity="0.4" />
        <rect x="4" y="0" width="40" height="24" fill="#d97706" rx="2" />
        <line x1="24" y1="0" x2="24" y2="24" stroke="#b45309" strokeWidth="1" />
        <rect x="12" y="7" width="12" height="6" fill="#fffbeb" rx="1" />
      </g>
    </svg>
  );
};
