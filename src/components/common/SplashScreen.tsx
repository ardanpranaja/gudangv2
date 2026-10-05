import React, { useState, useEffect } from 'react';
import { Boxes, Package, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

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

      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-sm px-6">
        {/* Animated Warehouse & Packages Icon Box */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 border border-stone-700/80 shadow-2xl flex items-center justify-center">
            <Boxes className="w-10 h-10 text-emerald-400 animate-pulse" />
          </div>

          {/* Floating animated mini-packages */}
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-emerald-500 text-stone-950 flex items-center justify-center shadow-lg animate-bounce">
            <Package className="w-4 h-4" />
          </div>
          <div className="absolute -bottom-1 -left-2 w-6 h-6 rounded-md bg-teal-400 text-stone-950 flex items-center justify-center shadow-md animate-bounce [animation-delay:300ms]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

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
