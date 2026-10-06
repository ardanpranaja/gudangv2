import React from 'react';

interface AIAvatarIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isThinking?: boolean;
  status?: 'online' | 'offline' | 'busy';
  showStatusDot?: boolean;
}

export const AIAvatarIcon: React.FC<AIAvatarIconProps> = ({
  size = 'md',
  className = '',
  isThinking = false,
  status = 'online',
  showStatusDot = false,
}) => {
  // Dimensions map
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-16 h-16',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${currentSizeClass} ${className}`}>
      {/* Outer Glow Halo (Only for larger sizes or when thinking) */}
      {(size === 'lg' || size === 'xl' || isThinking) && (
        <span
          className={`absolute -inset-1 rounded-full bg-emerald-500/25 blur-xs pointer-events-none transition-opacity ${
            isThinking ? 'animate-pulse opacity-80' : 'opacity-60'
          }`}
        />
      )}

      {/* High-Fidelity Vector Robot Mascot */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm select-none"
      >
        <defs>
          {/* Main Helmet Gradient */}
          <linearGradient id="robotHelmetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#022c22" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>

          {/* Visor Screen Gradient */}
          <linearGradient id="robotVisorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06121e" />
            <stop offset="100%" stopColor="#022019" />
          </linearGradient>

          {/* Glowing Eyes Gradient */}
          <linearGradient id="robotEyeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Metallic Ear Cap Gradient */}
          <linearGradient id="robotEarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Inner Light Glow Filter */}
          <filter id="eyeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* --- 1. Antenna Base & Glowing Beacon --- */}
        <rect x="30" y="5" width="4" height="9" rx="2" fill="#334155" />
        <circle
          cx="32"
          cy="5"
          r="4"
          fill="#10b981"
          className={isThinking ? 'animate-ping' : ''}
          filter="url(#eyeGlow)"
        />
        <circle cx="32" cy="5" r="2.5" fill="#a7f3d0" />

        {/* --- 2. Side Ear Cups / Headsets --- */}
        <rect x="5" y="24" width="7" height="18" rx="3.5" fill="url(#robotEarGrad)" stroke="#10b981" strokeWidth="1" />
        <rect x="52" y="24" width="7" height="18" rx="3.5" fill="url(#robotEarGrad)" stroke="#10b981" strokeWidth="1" />
        {/* Ear glowing ring accents */}
        <circle cx="8.5" cy="33" r="2" fill="#10b981" />
        <circle cx="55.5" cy="33" r="2" fill="#10b981" />

        {/* --- 3. Main Head Shell --- */}
        <rect
          x="10"
          y="12"
          width="44"
          height="42"
          rx="21"
          fill="url(#robotHelmetGrad)"
          stroke="#10b981"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />

        {/* --- 4. Visor Display Frame --- */}
        <rect
          x="15"
          y="20"
          width="34"
          height="23"
          rx="11.5"
          fill="url(#robotVisorGrad)"
          stroke="#34d399"
          strokeWidth="1"
          strokeOpacity="0.4"
        />

        {/* Visor Subtle Glare / Reflection */}
        <path
          d="M 18 25 C 22 22, 42 22, 46 25"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* --- 5. Expressive Robot Eyes --- */}
        {isThinking ? (
          // Thinking animation eyes (horizontal scan bars)
          <g filter="url(#eyeGlow)">
            <rect x="20" y="29" width="9" height="4" rx="2" fill="url(#robotEyeGrad)" className="animate-pulse" />
            <rect x="35" y="29" width="9" height="4" rx="2" fill="url(#robotEyeGrad)" className="animate-pulse" />
          </g>
        ) : (
          // Friendly open glowing digital eyes
          <g filter="url(#eyeGlow)">
            {/* Left Eye */}
            <rect x="21" y="26" width="7" height="10" rx="3.5" fill="url(#robotEyeGrad)" />
            <circle cx="23.5" cy="28.5" r="1.5" fill="#ffffff" />

            {/* Right Eye */}
            <rect x="36" y="26" width="7" height="10" rx="3.5" fill="url(#robotEyeGrad)" />
            <circle cx="38.5" cy="28.5" r="1.5" fill="#ffffff" />
          </g>
        )}

        {/* --- 6. Cheerful Visor Smile Line / Voice Wave --- */}
        <path
          d="M 28 38 Q 32 41 36 38"
          stroke="#34d399"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
          filter="url(#eyeGlow)"
        />

        {/* --- 7. Chest / Neck Collar Joint --- */}
        <path
          d="M 24 53 L 40 53 L 36 58 L 28 58 Z"
          fill="#1e293b"
          stroke="#0f172a"
          strokeWidth="1"
        />
        <circle cx="32" cy="55.5" r="1" fill="#34d399" />
      </svg>

      {/* --- 8. Status Indicator Dot (Optional) --- */}
      {showStatusDot && (
        <span className="absolute bottom-0 right-0 flex items-center justify-center">
          {status === 'online' && (
            <>
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-stone-900" />
            </>
          )}
          {status === 'busy' && (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 ring-2 ring-stone-900" />
          )}
          {status === 'offline' && (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-stone-400 ring-2 ring-stone-900" />
          )}
        </span>
      )}
    </div>
  );
};
