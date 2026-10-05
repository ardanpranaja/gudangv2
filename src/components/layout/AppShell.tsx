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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col transition-colors">
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
          let border = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100';
          let Icon = Info;
          let iconColor = 'text-blue-500 dark:text-blue-400';

          if (toast.type === 'success') {
            border = 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/90 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-600 dark:text-emerald-400';
          } else if (toast.type === 'error') {
            border = 'border-rose-200 dark:border-rose-800/80 bg-rose-50/90 dark:bg-rose-950/90 text-rose-900 dark:text-rose-100';
            Icon = AlertCircle;
            iconColor = 'text-rose-600 dark:text-rose-400';
          } else if (toast.type === 'warning') {
            border = 'border-amber-200 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/90 text-amber-900 dark:text-amber-100';
            Icon = AlertTriangle;
            iconColor = 'text-amber-600 dark:text-amber-400';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-lg border shadow-lg flex items-start gap-3 text-xs transition-all ${border}`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
              <div className="flex-1">
                <div className="font-semibold">{toast.title}</div>
                {toast.message && <div className="mt-0.5 opacity-90">{toast.message}</div>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded opacity-60 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
