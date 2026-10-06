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
      aria-label="Ilustrasi suasana gudang logistik presisi dengan rak bertingkat, forklift, dan tumpukan kotak inventaris"
      className={className}
    >
      <defs>
        <linearGradient id="wb-sky" x1="0" y1="0" x2="0" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="wb-floor" x1="0" y1="210" x2="0" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d6d3d1" />
          <stop offset="100%" stopColor="#a8a29e" />
        </linearGradient>
      </defs>

      {/* Background Frame / Sky */}
      <rect width="800" height="280" rx="16" fill="url(#wb-sky)" />

      {/* Sun / Amber Glow */}
      <circle cx="400" cy="90" r="50" fill="#fbbf24" fillOpacity="0.35" />
      <circle cx="400" cy="90" r="32" fill="#f59e0b" fillOpacity="0.7" />

      {/* Warehouse Floor */}
      <rect y="210" width="800" height="70" rx="0" fill="url(#wb-floor)" />
      <line x1="0" y1="210" x2="800" y2="210" stroke="#78716c" strokeWidth="2" />
      {/* Floor Guide Lines */}
      <line x1="160" y1="210" x2="100" y2="280" stroke="#f59e0b" strokeWidth="3" strokeDasharray="8 6" />
      <line x1="640" y1="210" x2="700" y2="280" stroke="#f59e0b" strokeWidth="3" strokeDasharray="8 6" />
      <line x1="400" y1="210" x2="400" y2="280" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6 4" />

      {/* Left Storage Racks */}
      {/* Vertical pillars (#92400e) */}
      <rect x="50" y="40" width="10" height="170" fill="#92400e" rx="2" />
      <rect x="190" y="40" width="10" height="170" fill="#92400e" rx="2" />
      {/* Cross Bracing */}
      <line x1="60" y1="45" x2="190" y2="100" stroke="#b45309" strokeWidth="2" strokeOpacity="0.4" />
      <line x1="60" y1="100" x2="190" y2="45" stroke="#b45309" strokeWidth="2" strokeOpacity="0.4" />
      <line x1="60" y1="105" x2="190" y2="160" stroke="#b45309" strokeWidth="2" strokeOpacity="0.4" />
      <line x1="60" y1="160" x2="190" y2="105" stroke="#b45309" strokeWidth="2" strokeOpacity="0.4" />
      {/* Shelves (#b45309) */}
      <rect x="44" y="95" width="162" height="8" rx="2" fill="#b45309" />
      <rect x="44" y="150" width="162" height="8" rx="2" fill="#b45309" />
      <rect x="44" y="202" width="162" height="8" rx="2" fill="#b45309" />
      {/* Boxes on Left Rack */}
      {/* Top shelf */}
      <rect x="68" y="60" width="38" height="35" rx="3" fill="#d97706" />
      <rect x="74" y="66" width="14" height="6" rx="1" fill="#fde68a" />
      <rect x="114" y="52" width="46" height="43" rx="3" fill="#f59e0b" />
      <line x1="137" y1="52" x2="137" y2="95" stroke="#b45309" strokeWidth="1.5" />
      {/* Middle shelf */}
      <rect x="65" y="115" width="50" height="35" rx="3" fill="#f59e0b" />
      <rect x="122" y="110" width="40" height="40" rx="3" fill="#d97706" />
      <rect x="168" y="122" width="22" height="28" rx="2" fill="#b45309" />
      {/* Bottom shelf */}
      <rect x="66" y="165" width="56" height="37" rx="3" fill="#d97706" />
      <rect x="130" y="160" width="48" height="42" rx="3" fill="#f59e0b" />

      {/* Right Storage Racks */}
      <rect x="600" y="40" width="10" height="170" fill="#92400e" rx="2" />
      <rect x="740" y="40" width="10" height="170" fill="#92400e" rx="2" />
      {/* Bracing */}
      <line x1="610" y1="45" x2="740" y2="100" stroke="#b45309" strokeWidth="2" strokeOpacity="0.4" />
      <line x1="610" y1="100" x2="740" y2="45" stroke="#b45309" strokeWidth="2" strokeOpacity="0.4" />
      <line x1="610" y1="105" x2="740" y2="160" stroke="#b45309" strokeWidth="2" strokeOpacity="0.4" />
      <line x1="610" y1="160" x2="740" y2="105" stroke="#b45309" strokeWidth="2" strokeOpacity="0.4" />
      {/* Shelves */}
      <rect x="594" y="95" width="162" height="8" rx="2" fill="#b45309" />
      <rect x="594" y="150" width="162" height="8" rx="2" fill="#b45309" />
      <rect x="594" y="202" width="162" height="8" rx="2" fill="#b45309" />
      {/* Boxes on Right Rack */}
      <rect x="620" y="55" width="48" height="40" rx="3" fill="#f59e0b" />
      <rect x="676" y="65" width="36" height="30" rx="3" fill="#d97706" />
      <rect x="618" y="112" width="42" height="38" rx="3" fill="#d97706" />
      <rect x="668" y="108" width="52" height="42" rx="3" fill="#f59e0b" />
      <rect x="622" y="162" width="50" height="40" rx="3" fill="#f59e0b" />
      <rect x="680" y="166" width="44" height="36" rx="3" fill="#d97706" />

      {/* Forklift in Center-Left */}
      <g transform="translate(290, 155)">
        {/* Mast */}
        <rect x="95" y="-30" width="5" height="75" fill="#44403c" rx="1" />
        <rect x="103" y="-30" width="5" height="75" fill="#44403c" rx="1" />
        {/* Forks */}
        <rect x="98" y="38" width="28" height="4" fill="#1c1917" rx="1" />
        {/* Box on Fork */}
        <rect x="106" y="12" width="24" height="26" fill="#d97706" rx="2" />
        <line x1="118" y1="12" x2="118" y2="38" stroke="#b45309" strokeWidth="1" />
        {/* Overhead Guard / Cabin */}
        <path d="M45, -20 L75, -20 L80, 15 L40, 15 Z" fill="#b45309" fillOpacity="0.15" stroke="#92400e" strokeWidth="2.5" />
        {/* Seat & Steering */}
        <rect x="48" y="0" width="12" height="15" rx="2" fill="#292524" />
        <line x1="68" y1="2" x2="63" y2="15" stroke="#1c1917" strokeWidth="2" />
        {/* Body */}
        <rect x="25" y="15" width="65" height="28" rx="5" fill="#f59e0b" />
        <rect x="25" y="28" width="65" height="15" rx="2" fill="#d97706" />
        {/* Rear Weight */}
        <rect x="20" y="18" width="14" height="22" rx="3" fill="#92400e" />
        {/* Wheels */}
        <circle cx="42" cy="45" r="11" fill="#1c1917" />
        <circle cx="42" cy="45" r="5" fill="#78716c" />
        <circle cx="82" cy="45" r="11" fill="#1c1917" />
        <circle cx="82" cy="45" r="5" fill="#78716c" />
      </g>

      {/* Front Focal Box with Wooden Pallet */}
      <g transform="translate(460, 190)">
        {/* Wooden Pallet */}
        <rect x="0" y="44" width="68" height="6" rx="1" fill="#92400e" />
        <rect x="4" y="50" width="10" height="6" fill="#78350f" />
        <rect x="29" y="50" width="10" height="6" fill="#78350f" />
        <rect x="54" y="50" width="10" height="6" fill="#78350f" />
        {/* Main Box */}
        <rect x="6" y="8" width="56" height="36" rx="3" fill="#f59e0b" />
        <path d="M6,8 L34,22 L62,8" fill="#d97706" />
        <rect x="18" y="22" width="16" height="10" rx="1" fill="#ffffff" fillOpacity="0.8" />
        <line x1="22" y1="25" x2="30" y2="25" stroke="#78716c" strokeWidth="1" />
        <line x1="22" y1="28" x2="28" y2="28" stroke="#78716c" strokeWidth="1" />
      </g>
    </svg>
  );
};
