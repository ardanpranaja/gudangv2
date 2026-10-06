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
      aria-label="Ilustrasi rak gudang kosong bertingkat dengan kaca pembesar pencarian data"
      className={className}
    >
      <defs>
        <linearGradient id="es-glow" x1="160" y1="20" x2="160" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Warm Background Soft Aura */}
      <circle cx="160" cy="120" r="95" fill="url(#es-glow)" />

      {/* Floating Amber Particles */}
      <circle cx="50" cy="65" r="3" fill="#f59e0b" fillOpacity="0.7" />
      <circle cx="270" cy="75" r="2.5" fill="#d97706" fillOpacity="0.6" />
      <circle cx="280" cy="150" r="3.5" fill="#fbbf24" fillOpacity="0.7" />
      <circle cx="45" cy="160" r="2" fill="#b45309" fillOpacity="0.5" />
      <circle cx="85" cy="40" r="2" fill="#f59e0b" fillOpacity="0.5" />
      <circle cx="230" cy="35" r="3" fill="#fbbf24" fillOpacity="0.6" />

      {/* 3-Tier Warehouse Storage Shelf */}
      {/* Left & Right Vertical Posts (#92400e) */}
      <rect x="65" y="35" width="8" height="175" rx="2" fill="#92400e" />
      <rect x="247" y="35" width="8" height="175" rx="2" fill="#92400e" />

      {/* Shelf Cross Bracing */}
      <line x1="73" y1="40" x2="247" y2="95" stroke="#b45309" strokeWidth="1.5" strokeOpacity="0.3" />
      <line x1="73" y1="95" x2="247" y2="40" stroke="#b45309" strokeWidth="1.5" strokeOpacity="0.3" />
      <line x1="73" y1="100" x2="247" y2="150" stroke="#b45309" strokeWidth="1.5" strokeOpacity="0.3" />
      <line x1="73" y1="150" x2="247" y2="100" stroke="#b45309" strokeWidth="1.5" strokeOpacity="0.3" />

      {/* 3 Shelf Beams (#b45309) */}
      {/* Top Beam */}
      <rect x="60" y="90" width="200" height="7" rx="2" fill="#b45309" />
      {/* Middle Beam */}
      <rect x="60" y="145" width="200" height="7" rx="2" fill="#b45309" />
      {/* Bottom Beam */}
      <rect x="60" y="200" width="200" height="7" rx="2" fill="#b45309" />

      {/* Feet / Floor Line */}
      <line x1="45" y1="210" x2="275" y2="210" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" />

      {/* One Lone Small Box on Middle Shelf */}
      <g transform="translate(90, 116)">
        <rect x="0" y="0" width="34" height="29" rx="2" fill="#f59e0b" />
        <path d="M0,0 L17,8 L34,0" fill="#d97706" />
        <rect x="10" y="11" width="14" height="7" rx="1" fill="#ffffff" fillOpacity="0.8" />
        <line x1="12" y1="13" x2="20" y2="13" stroke="#78716c" strokeWidth="1" />
      </g>

      {/* Floating Magnifying Glass (#b45309 rim) */}
      <g transform="translate(180, 80) rotate(-15)">
        {/* Glass Lens (Reflective Glow) */}
        <circle cx="36" cy="36" r="28" fill="#ffffff" fillOpacity="0.4" stroke="#b45309" strokeWidth="5" />
        <circle cx="36" cy="36" r="25" fill="#fde68a" fillOpacity="0.25" />
        <path d="M22,24 Q36,18 48,26" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Handle */}
        <rect x="56" y="52" width="36" height="8" rx="4" transform="rotate(45 56 52)" fill="#92400e" />
        <rect x="58" y="54" width="12" height="4" rx="2" transform="rotate(45 58 54)" fill="#d97706" />
      </g>
    </svg>
  );
};
