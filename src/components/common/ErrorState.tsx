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
    <div className="w-full py-12 px-6 text-center flex flex-col items-center justify-center border border-rose-200 rounded-lg bg-rose-50/40">
      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-rose-900 tracking-tight">{title}</h4>
      <p className="text-xs text-rose-700 max-w-md mt-1 mb-2 leading-relaxed">
        Periksa koneksi backend Google Apps Script dan coba lagi.
      </p>
      {error && (
        <div className="max-w-md p-2 mb-4 bg-white/80 border border-rose-200 rounded text-[11px] font-mono text-rose-800 break-all text-left">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>
        )}
        {showSettingsLink && (
          <button
            onClick={() => navigateTo('pengaturan')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Konfigurasi GAS</span>
          </button>
        )}
      </div>
    </div>
  );
};
