import React from 'react';
import { Inbox } from 'lucide-react';

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
    <div className="w-full py-14 px-6 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/40 transition-colors">
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
        <Inbox className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 rounded hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
