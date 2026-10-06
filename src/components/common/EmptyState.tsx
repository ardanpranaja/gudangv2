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
    <div className="w-full py-12 px-6 text-center flex flex-col items-center justify-center border border-dashed border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50/60 dark:bg-stone-900/40 shadow-xs transition-colors">
      <EmptyShelf className="w-40 h-auto mb-2" />
      <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">{title}</h4>
      <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 rounded-lg shadow-xs transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
