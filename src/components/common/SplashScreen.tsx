import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SplashIllustration } from '../illustrations/SplashIllustration';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { health, addToast } = useApp();
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [statusText, setStatusText] = useState('Menghubungkan ke backend...');

  useEffect(() => {
    const startTime = Date.now();
    const MIN_DURATION = 1500; // 1.5 seconds minimum
    const MAX_DURATION = 3200; // 3.2 seconds maximum

    const finishTimer = setTimeout(() => {
      // Check backend status when finishing
      if (health.status === 'OFFLINE') {
        addToast(
          'warning',
          'Koneksi Backend Terbatas',
          'Backend tidak terjangkau — sebagian fitur mungkin tidak aktif.'
        );
      }

      setStatusText('Memulai aplikasi...');
      setIsFadingOut(true);

      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 400); // 400ms fade-out

      return () => clearTimeout(hideTimer);
    }, Math.max(MIN_DURATION, Math.min(MAX_DURATION, Date.now() - startTime + 800)));

    return () => clearTimeout(finishTimer);
  }, [health.status, addToast, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-950 text-white transition-opacity duration-400 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center space-y-5 max-w-sm px-6">
        {/* Splash Illustration */}
        <SplashIllustration className="w-56 h-auto" />

        {/* Brand Title with subtle shimmer */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Kegudangaja</span>
          </h1>
          <p className="text-xs text-stone-400 dark:text-stone-500 font-medium tracking-wide uppercase">
            Sistem Inventaris &amp; Logistik Terintegrasi
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-48 space-y-2 pt-2">
          <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-[progress_1.6s_ease-in-out_infinite] w-full" />
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium font-mono">
            {statusText}
          </div>
        </div>
      </div>
    </div>
  );
};
