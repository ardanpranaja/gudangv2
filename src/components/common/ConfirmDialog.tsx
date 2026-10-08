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

  let btnColor = 'bg-amber-400 hover:bg-amber-300 text-stone-950 border-2 border-stone-900 shadow-[3px_3px_0px_#18181b]';
  let iconBoxColor = 'bg-amber-300 text-stone-950';

  if (variant === 'danger') {
    btnColor = 'bg-rose-400 hover:bg-rose-300 text-stone-950 border-2 border-stone-900 shadow-[3px_3px_0px_#18181b]';
    iconBoxColor = 'bg-rose-300 text-stone-950';
  } else if (variant === 'warning') {
    btnColor = 'bg-amber-400 hover:bg-amber-300 text-stone-950 border-2 border-stone-900 shadow-[3px_3px_0px_#18181b]';
    iconBoxColor = 'bg-amber-300 text-stone-950';
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 text-center flex items-center justify-center">
        <div className="fixed inset-0 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-xs transition-opacity" onClick={onClose} />

        <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 shadow-[6px_6px_0px_#18181b] relative z-10">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 text-stone-900 dark:text-stone-100">
              <div className={`p-2 rounded-md border-2 border-stone-900 shadow-[2px_2px_0px_#18181b] ${iconBoxColor}`}>
                <AlertCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-black tracking-tight">{title}</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 rounded border-2 border-stone-900 text-stone-900 dark:text-stone-100 hover:bg-rose-200 dark:hover:bg-rose-900/60 shadow-[1.5px_1.5px_0px_#18181b] transition-all"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <p className="text-xs font-medium text-stone-700 dark:text-stone-300 leading-relaxed mb-6 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-lg border-2 border-stone-900/40 dark:border-stone-700">
            {message}
          </p>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-stone-900 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-500 rounded-lg shadow-[2.5px_2.5px_0px_#18181b] hover:bg-stone-200 dark:hover:bg-stone-700 transition-all disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all disabled:opacity-50 inline-flex items-center gap-2 ${btnColor}`}
            >
              {isLoading && <span className="neo-spinner-multicolor-sm" />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
