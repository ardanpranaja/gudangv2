import React from 'react';
import { Menu, ShieldCheck, LogOut, Boxes, Sun, Moon } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { currentPage, navigateTo, role, logoutAdmin, setIsAdminLoginOpen, health, theme, toggleTheme } = useApp();

  // ---------------------------------------------------------------------------
  // MEMBER MODE TOPBAR (Ramping & Sederhana)
  // ---------------------------------------------------------------------------
  if (role === 'MEMBER') {
    return (
      <header className="sticky top-0 z-30 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shadow-2xs transition-colors">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-xs">
            <Boxes className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Kegudangaja
          </span>
        </div>

        {/* Right Actions: Theme Toggle + Admin Login Link */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            title={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <button
            type="button"
            onClick={() => setIsAdminLoginOpen(true)}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium transition-colors hover:underline inline-flex items-center gap-1.5"
            title="Masuk ke panel administrasi penuh gudang"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Masuk sebagai Admin</span>
          </button>
        </div>
      </header>
    );
  }

  // ---------------------------------------------------------------------------
  // ADMIN MODE TOPBAR (Full Navigation & Admin Controls)
  // ---------------------------------------------------------------------------
  return (
    <header className="sticky top-0 z-30 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shadow-2xs transition-colors">
      {/* Zone 1: Mobile Hamburger & Brand Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={() => navigateTo('dashboard')}
          className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-2"
        >
          <Boxes className="w-5 h-5 text-emerald-600 dark:text-emerald-400 hidden sm:block" />
          <span>Kegudangaja</span>
        </button>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
        <button
          onClick={() => navigateTo('dashboard')}
          className={`transition-colors hover:text-slate-900 dark:hover:text-slate-100 ${
            currentPage === 'dashboard' ? 'text-slate-900 dark:text-slate-100 font-semibold' : ''
          }`}
        >
          Ringkasan
        </button>
        <button
          onClick={() => navigateTo('stok')}
          className={`transition-colors hover:text-slate-900 dark:hover:text-slate-100 ${
            currentPage === 'stok' ? 'text-slate-900 dark:text-slate-100 font-semibold' : ''
          }`}
        >
          Stok
        </button>
        <button
          onClick={() => navigateTo('masuk')}
          className={`transition-colors hover:text-slate-900 dark:hover:text-slate-100 ${
            currentPage === 'masuk' ? 'text-slate-900 dark:text-slate-100 font-semibold' : ''
          }`}
        >
          Masuk
        </button>
        <button
          onClick={() => navigateTo('keluar')}
          className={`transition-colors hover:text-slate-900 dark:hover:text-slate-100 ${
            currentPage === 'keluar' ? 'text-slate-900 dark:text-slate-100 font-semibold' : ''
          }`}
        >
          Keluar
        </button>
        <button
          onClick={() => navigateTo('bincard')}
          className={`transition-colors hover:text-slate-900 dark:hover:text-slate-100 ${
            currentPage === 'bincard' ? 'text-slate-900 dark:text-slate-100 font-semibold' : ''
          }`}
        >
          Bin Card
        </button>
      </nav>

      {/* Zone 3: Connection & Admin Status / Logout & Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend status indicator */}
        <button
          onClick={() => navigateTo('pengaturan')}
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          title={`Backend GAS: ${health.status}`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              health.status === 'ONLINE'
                ? 'bg-emerald-500'
                : health.status === 'OFFLINE'
                ? 'bg-rose-500'
                : 'bg-amber-400'
            }`}
          />
          <span className="font-mono text-slate-600 dark:text-slate-300">GAS {health.status}</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
          title={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Admin Badge */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-bold tracking-wide shadow-2xs border border-transparent dark:border-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>ADMIN</span>
        </span>

        {/* Logout Admin Button */}
        <button
          type="button"
          onClick={logoutAdmin}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 transition-colors"
          title="Keluar dari mode Admin dan kembali ke mode Member"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
};
