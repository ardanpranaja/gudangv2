import React from 'react';
import { AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ErrorStateProps {
  title?: string;
  error?: string;
  onRetry?: () => void;
  showSettingsLink?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Data gagal dimuat.',
  error,
  onRetry,
  showSettingsLink = true,
}) => {
  const { navigateTo } = useApp();

  return (
    <div className="w-full py-12 px-6 text-center flex flex-col items-center justify-center border border-rose-200 dark:border-rose-900/60 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 shadow-xs transition-colors">
      <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200 tracking-tight">{title}</h4>
      <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mt-1 mb-2 leading-relaxed">
        Periksa koneksi backend Google Apps Script dan coba lagi.
      </p>
      {error && (
        <div className="max-w-md p-2 mb-4 bg-white/80 dark:bg-stone-900/80 border border-rose-200 dark:border-rose-800 rounded-lg text-[11px] font-mono text-rose-800 dark:text-rose-300 break-all text-left">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 rounded-lg shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>
        )}
        {showSettingsLink && (
          <button
            onClick={() => navigateTo('pengaturan')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Konfigurasi GAS</span>
          </button>
        )}
      </div>
    </div>
  );
};
