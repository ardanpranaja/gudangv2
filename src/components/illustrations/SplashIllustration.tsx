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
      aria-label="Ilustrasi kotak inventaris terbuka dengan tanda cinta hangat merah muda melayang (identitas Uti)"
      className={className}
    >
      <defs>
        <linearGradient id="si-bg" x1="160" y1="20" x2="160" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id="si-heart-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Warm Ambient Circle */}
      <circle cx="160" cy="150" r="115" fill="url(#si-bg)" />

      {/* Floating Sparkles & Little Hearts */}
      <circle cx="90" cy="65" r="3" fill="#f59e0b" />
      <circle cx="235" cy="80" r="2.5" fill="#f59e0b" />
      <circle cx="75" cy="140" r="2" fill="#fbbf24" />
      <circle cx="245" cy="150" r="3" fill="#fbbf24" />

      {/* Small Floating Mini Heart Pink Left */}
      <path
        d="M100,95 C100,90 106,86 111,91 C116,86 122,90 122,95 C122,103 111,109 111,109 C111,109 100,103 100,95 Z"
        fill="#f472b6"
        fillOpacity="0.85"
      />
      {/* Small Floating Mini Heart Pink Right */}
      <path
        d="M205,80 C205,76 210,73 214,77 C218,73 223,76 223,80 C223,87 214,92 214,92 C214,92 205,87 205,80 Z"
        fill="#f472b6"
        fillOpacity="0.75"
      />

      {/* Open Cardboard Box Isometric */}
      <g transform="translate(160, 205)">
        {/* Soft Shadow under Box */}
        <ellipse cx="0" cy="48" rx="80" ry="16" fill="#000000" fillOpacity="0.08" />

        {/* Box Left Panel */}
        <path d="M0,35 L-65,2 L-65,-45 L0,-12 Z" fill="#d97706" />
        {/* Box Right Panel */}
        <path d="M0,35 L65,2 L65,-45 L0,-12 Z" fill="#b45309" />
        {/* Box Interior (Dark Warm Kraft) */}
        <path d="M0,-12 L-65,-45 L0,-78 L65,-45 Z" fill="#78350f" />

        {/* Open Flaps */}
        {/* Front-Left Flap hanging down */}
        <path d="M-65,-45 L0,-12 L-20,10 L-75,-25 Z" fill="#f59e0b" />
        {/* Front-Right Flap hanging down */}
        <path d="M0,-12 L65,-45 L75,-25 L20,10 Z" fill="#d97706" />
        {/* Back-Left Flap flared up */}
        <path d="M-65,-45 L0,-78 L-15,-98 L-78,-65 Z" fill="#f59e0b" />
        {/* Back-Right Flap flared up */}
        <path d="M0,-78 L65,-45 L78,-65 L15,-98 Z" fill="#d97706" />

        {/* Box Label Front */}
        <g transform="translate(-45, -20) skewY(15)">
          <rect x="0" y="0" width="28" height="18" rx="2" fill="#ffffff" fillOpacity="0.9" />
          <line x1="4" y1="5" x2="24" y2="5" stroke="#78716c" strokeWidth="1.5" />
          <line x1="4" y1="9" x2="18" y2="9" stroke="#78716c" strokeWidth="1.5" />
          <rect x="4" y="12" width="10" height="3" fill="#10b981" />
        </g>
      </g>

      {/* Main Big Floating Pink Heart (#f472b6 - Identitas Uti 💗) */}
      <g transform="translate(160, 115)">
        {/* Pink Glow Behind Main Heart */}
        <circle cx="0" cy="0" r="50" fill="url(#si-heart-glow)" />

        {/* Floating Heart Path */}
        <path
          d="M0,32 C-38,-4 -52,-28 -34,-44 C-18,-56 0,-34 0,-18 C0,-34 18,-56 34,-44 C52,-28 38,-4 0,32 Z"
          fill="#f472b6"
        />
        {/* Heart Highlight / Gloss */}
        <path
          d="M-22,-36 C-30,-26 -22,-14 -12,-8"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
      </g>
    </svg>
  );
};
