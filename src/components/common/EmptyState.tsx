import React from 'react';
import { EmptyShelf } from '../illustrations/EmptyShelf';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Belum ada data.',
  description = 'Tidak ada catatan yang ditemukan untuk filter atau kriteria ini.',
  action,
}) => {
  return (
    <div className="w-full py-12 px-6 text-center flex flex-col items-center justify-center border-2 border-stone-900 dark:border-stone-400 rounded-xl bg-amber-50/40 dark:bg-stone-900/60 shadow-[4px_4px_0px_#18181b] transition-colors">
      <EmptyShelf className="w-40 h-auto mb-2" />
      <h4 className="text-sm font-black text-stone-900 dark:text-stone-100 tracking-tight">{title}</h4>
      <p className="text-xs font-medium text-stone-600 dark:text-stone-400 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-black text-stone-950 bg-amber-400 hover:bg-amber-300 border-2 border-stone-900 rounded-lg shadow-[3px_3px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#18181b] transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
