import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-stone-900 border-l-2 border-stone-900 dark:border-stone-400 shadow-[-6px_0px_0px_#18181b] flex flex-col transition-colors">
          {/* Header */}
          <div className="px-6 py-4 border-b-2 border-stone-900 dark:border-stone-500 flex items-center justify-between bg-amber-100 dark:bg-stone-800">
            <div>
              <h2 className="text-base font-black text-stone-900 dark:text-stone-100 tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs font-semibold text-stone-600 dark:text-stone-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md border-2 border-stone-900 text-stone-900 dark:text-stone-100 hover:bg-rose-200 dark:hover:bg-rose-900/60 shadow-[1.5px_1.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-stone-900 dark:text-stone-200 font-medium">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="p-4 border-t-2 border-stone-900 dark:border-stone-500 bg-stone-100 dark:bg-stone-800/80 flex items-center justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
