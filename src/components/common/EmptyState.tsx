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
    <div className="w-full py-14 px-6 text-center flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        <Inbox className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
