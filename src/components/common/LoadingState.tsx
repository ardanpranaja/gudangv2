import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Memuat data dari Google Spreadsheet...',
  rows = 4,
}) => {
  return (
    <div className="w-full py-12 px-6 flex flex-col items-center justify-center space-y-4">
      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-slate-700 dark:text-slate-300" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <div className="w-full max-w-2xl space-y-3 pt-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="h-9 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-full border border-slate-200/60 dark:border-slate-700/60"
            style={{ opacity: 1 - idx * 0.18 }}
          />
        ))}
      </div>
    </div>
  );
};
