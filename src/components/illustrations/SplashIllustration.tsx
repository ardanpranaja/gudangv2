import React from 'react';

interface SplashIllustrationProps {
  className?: string;
}

export const SplashIllustration: React.FC<SplashIllustrationProps> = ({ className = 'w-full h-auto' }) => {
  return (
    <svg
      viewBox="0 0 320 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ilustrasi kotak inventaris terbuka dengan hati pink asisten Uti melayang"
      className={className}
    >
      <defs>
        <linearGradient id="si-bg" x1="0" y1="0" x2="320" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>
      </defs>

      {/* Background Frame Rounded rx="24" Gradien Krem */}
      <rect width="320" height="300" rx="24" fill="url(#si-bg)" />

      {/* Sparkle dan Partikel Amber di Sekitar */}
      <circle cx="65" cy="70" r="3" fill="#f59e0b" fillOpacity="0.8" />
      <circle cx="255" cy="75" r="3.5" fill="#f59e0b" fillOpacity="0.8" />
      <circle cx="50" cy="140" r="2.5" fill="#fbbf24" />
      <circle cx="270" cy="145" r="2.5" fill="#fbbf24" />
      <circle cx="95" cy="45" r="2" fill="#d97706" />
      <circle cx="225" cy="45" r="2" fill="#d97706" />

      {/* Sparkle Geometris Bintang Amber */}
      <path d="M75,95 L77,102 L84,104 L77,106 L75,113 L73,106 L66,104 L73,102 Z" fill="#f59e0b" />
      <path d="M245,105 L247,112 L254,114 L247,116 L245,123 L243,116 L236,114 L243,112 Z" fill="#f59e0b" />

      {/* Bayangan Elips di Bawah Box */}
      <ellipse cx="160" cy="252" rx="75" ry="12" fill="#d6d3d1" fillOpacity="0.85" />

      {/* BOX KARDUS TERBUKA (Tutup menganga ke kiri-kanan, #d97706 / #f59e0b) */}
      <g transform="translate(160, 205)">
        {/* Badan Box Kiri (#d97706) */}
        <path d="M0,36 L-62,6 L-62,-36 L0,-8 Z" fill="#d97706" />
        {/* Badan Box Kanan (#b45309) */}
        <path d="M0,36 L62,6 L62,-36 L0,-8 Z" fill="#b45309" />
        {/* Bagian Dalam Box (#78350f) */}
        <path d="M0,-8 L-62,-36 L0,-66 L62,-36 Z" fill="#78350f" />

        {/* Tutup Menganga Kiri-Kanan (#f59e0b / #d97706) */}
        {/* Tutup Kiri Depan */}
        <path d="M-62,-36 L0,-8 L-18,12 L-72,-18 Z" fill="#f59e0b" />
        {/* Tutup Kanan Depan */}
        <path d="M0,-8 L62,-36 L72,-18 L18,12 Z" fill="#d97706" />
        {/* Tutup Kiri Belakang */}
        <path d="M-62,-36 L0,-66 L-15,-84 L-72,-54 Z" fill="#f59e0b" />
        {/* Tutup Kanan Belakang */}
        <path d="M0,-66 L62,-36 L72,-54 L15,-84 Z" fill="#d97706" />

        {/* Label Kotak Krem */}
        <g transform="translate(-44, -15) skewY(15)">
          <rect x="0" y="0" width="24" height="15" rx="2" fill="#fffbeb" />
          <line x1="4" y1="4" x2="20" y2="4" stroke="#a8a29e" strokeWidth="1.5" />
          <line x1="4" y1="8" x2="16" y2="8" stroke="#a8a29e" strokeWidth="1.5" />
        </g>
      </g>

      {/* HATI PINK (#f472b6) MELAYANG DI ATAS BOX — IDENTITAS ASISTEN UTI 💗 */}
      <g transform="translate(160, 100)">
        {/* Glow Lembut Pink */}
        <circle cx="0" cy="0" r="44" fill="#f472b6" fillOpacity="0.2" />

        {/* Bentuk Hati Pink (#f472b6) */}
        <path
          d="M0,32 C-34,-2 -48,-24 -32,-38 C-16,-50 0,-30 0,-16 C0,-30 16,-50 32,-38 C48,-24 34,-2 0,32 Z"
          fill="#f472b6"
        />

        {/* Kilau Putih Geometris pada Hati */}
        <path
          d="M-20,-32 C-26,-24 -20,-14 -12,-8"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
      </g>
    </svg>
  );
};
