import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'primary',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  let btnColor = 'bg-amber-700 hover:bg-amber-800 text-white dark:bg-amber-600 dark:hover:bg-amber-500';
  if (variant === 'danger') {
    btnColor = 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-500';
  } else if (variant === 'warning') {
    btnColor = 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-500';
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 text-center flex items-center justify-center">
        <div className="fixed inset-0 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-xs transition-opacity" onClick={onClose} />

        <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-stone-900 shadow-xl rounded-xl border border-stone-200 dark:border-stone-700 relative z-10">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 text-stone-900 dark:text-stone-100">
              <AlertCircle className={`w-5 h-5 ${variant === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`} />
              <h3 className="text-base font-semibold">{title}</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-6">{message}</p>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 ${btnColor}`}
            >
              {isLoading && <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
