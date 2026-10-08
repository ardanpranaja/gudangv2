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
    <div className="w-full py-12 px-6 text-center flex flex-col items-center justify-center border-2 border-stone-900 dark:border-stone-400 rounded-xl bg-rose-50 dark:bg-rose-950/40 shadow-[4px_4px_0px_#18181b] transition-colors">
      <div className="w-11 h-11 rounded-md border-2 border-stone-900 bg-rose-300 text-stone-950 shadow-[2px_2px_0px_#18181b] flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6 stroke-[2.5]" />
      </div>
      <h4 className="text-sm font-black text-rose-950 dark:text-rose-100 tracking-tight">{title}</h4>
      <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 max-w-md mt-1 mb-2 leading-relaxed">
        Periksa koneksi backend Google Apps Script dan coba lagi.
      </p>
      {error && (
        <div className="max-w-md p-2.5 mb-4 bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-rose-700 rounded-lg text-[11px] font-mono text-rose-950 dark:text-rose-300 break-all text-left shadow-[2px_2px_0px_#18181b]">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-stone-950 bg-rose-400 hover:bg-rose-300 border-2 border-stone-900 rounded-lg shadow-[3px_3px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#18181b] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Coba Lagi</span>
          </button>
        )}
        {showSettingsLink && (
          <button
            onClick={() => navigateTo('pengaturan')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-500 rounded-lg shadow-[2.5px_2.5px_0px_#18181b] hover:bg-stone-100 dark:hover:bg-stone-700 transition-all"
          >
            <Settings className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Konfigurasi GAS</span>
          </button>
        )}
      </div>
    </div>
  );
};
