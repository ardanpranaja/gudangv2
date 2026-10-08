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
        {/* Splash Illustration Card */}
        <div className="p-4 bg-stone-900 border-2 border-stone-100 rounded-2xl shadow-[6px_6px_0px_#facc15]">
          <SplashIllustration className="w-56 h-auto" />
        </div>

        {/* Brand Title */}
        <div className="space-y-1.5">
          <div className="inline-block px-3 py-1 bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded border-2 border-stone-900 shadow-[2px_2px_0px_#18181b]">
            Kegudangaja
          </div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center justify-center gap-2 pt-1">
            <span>Sistem Gudang &amp; Logistik</span>
          </h1>
          <p className="text-xs text-stone-400 font-bold tracking-wide">
            Spreadsheet Driven · Fast · High Contrast
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-56 space-y-2.5 pt-1">
          <div className="h-3 w-full bg-stone-800 rounded-lg overflow-hidden relative border-2 border-stone-100 shadow-[2px_2px_0px_#facc15]">
            <div className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400 animate-[progress_1.6s_ease-in-out_infinite] w-full" />
          </div>
          <div className="text-[11px] text-amber-300 font-mono font-bold">
            {statusText}
          </div>
        </div>
      </div>
    </div>
  );
};
