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

  let btnColor = 'bg-slate-900 hover:bg-slate-800 text-white';
  if (variant === 'danger') {
    btnColor = 'bg-rose-600 hover:bg-rose-700 text-white';
  } else if (variant === 'warning') {
    btnColor = 'bg-amber-600 hover:bg-amber-700 text-white';
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 text-center flex items-center justify-center">
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

        <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg border border-slate-200 relative z-10">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 text-slate-900">
              <AlertCircle className={`w-5 h-5 ${variant === 'danger' ? 'text-rose-600' : 'text-amber-600'}`} />
              <h3 className="text-base font-semibold">{title}</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed mb-6">{message}</p>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 ${btnColor}`}
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
