import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { useApp } from '../../context/AppContext';
import { AdminLoginModal } from '../auth/AdminLoginModal';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, removeToast, role } = useApp();

  const isMemberMode = role === 'MEMBER';

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans antialiased flex flex-col transition-colors">
      {/* Sidebar Navigation (Admin Mode Only) */}
      {!isMemberMode && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${!isMemberMode ? 'lg:pl-64' : ''}`}>
        <TopBar onToggleSidebar={() => setSidebarOpen(true)} />

        <main
          className={`flex-1 p-4 sm:p-6 lg:p-8 w-full mx-auto ${
            isMemberMode ? 'max-w-4xl' : 'max-w-7xl'
          }`}
        >
          {children}
        </main>
      </div>

      {/* Admin Login Modal (Triggerable from TopBar link) */}
      <AdminLoginModal />

      {/* Toast notifications container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let border = 'border-2 border-stone-900 shadow-[4px_4px_0px_#18181b] bg-white dark:bg-stone-900 text-stone-950 dark:text-stone-100';
          let Icon = Info;
          let iconColor = 'text-sky-600';

          if (toast.type === 'success') {
            border = 'border-2 border-stone-900 shadow-[4px_4px_0px_#18181b] bg-emerald-200 dark:bg-emerald-300 text-stone-950';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-950';
          } else if (toast.type === 'error') {
            border = 'border-2 border-stone-900 shadow-[4px_4px_0px_#18181b] bg-rose-200 dark:bg-rose-300 text-stone-950';
            Icon = AlertCircle;
            iconColor = 'text-rose-950';
          } else if (toast.type === 'warning') {
            border = 'border-2 border-stone-900 shadow-[4px_4px_0px_#18181b] bg-amber-200 dark:bg-amber-300 text-stone-950';
            Icon = AlertTriangle;
            iconColor = 'text-amber-950';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-lg border-2 shadow-md flex items-start gap-3 text-xs transition-all ${border}`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 stroke-[2.5] ${iconColor}`} />
              <div className="flex-1">
                <div className="font-black text-xs">{toast.title}</div>
                {toast.message && <div className="mt-0.5 font-medium opacity-95">{toast.message}</div>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded hover:bg-black/10 transition-colors"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
