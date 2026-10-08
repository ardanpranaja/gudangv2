import React from 'react';

interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Memuat data dari Google Spreadsheet...',
  rows = 4,
}) => {
  return (
    <div className="w-full py-12 px-6 flex flex-col items-center justify-center space-y-5">
      {/* Neo-Brutalist Multi-Color Spinner & Pill */}
      <div className="inline-flex items-center gap-3 px-4 py-2 bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 rounded-lg shadow-[3.5px_3.5px_0px_#18181b]">
        {/* Colorful 4-quadrant spinner */}
        <div className="w-6 h-6 neo-spinner-multicolor shrink-0" />
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 tracking-tight">
          {message}
        </span>
      </div>

      {/* Decorative colorful neo pulse blocks */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-amber-400 border border-stone-900 rounded-xs animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2.5 h-2.5 bg-rose-400 border border-stone-900 rounded-xs animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2.5 h-2.5 bg-cyan-400 border border-stone-900 rounded-xs animate-bounce" style={{ animationDelay: '300ms' }} />
        <span className="w-2.5 h-2.5 bg-emerald-400 border border-stone-900 rounded-xs animate-bounce" style={{ animationDelay: '450ms' }} />
      </div>

      {/* Skeletons with Neo borders and shadow */}
      <div className="w-full max-w-2xl space-y-2.5 pt-1">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="h-9 bg-stone-100 dark:bg-stone-800/80 rounded-md animate-pulse w-full border-2 border-stone-900/60 dark:border-stone-600 shadow-[2px_2px_0px_#18181b]"
            style={{ opacity: 1 - idx * 0.16 }}
          />
        ))}
      </div>
    </div>
  );
};
