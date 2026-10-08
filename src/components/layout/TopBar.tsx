import React from 'react';
import { Menu, ShieldCheck, LogOut, Boxes, Sun, Moon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NotificationBell } from '../notifications/NotificationBell';

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
      <header className="sticky top-0 z-30 h-14 bg-white dark:bg-stone-900 border-b-2 border-stone-900 dark:border-stone-500 px-4 sm:px-6 flex items-center justify-between shadow-[0px_2px_0px_#18181b] transition-colors">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-stone-950 border-2 border-stone-900 flex items-center justify-center shadow-[2px_2px_0px_#18181b]">
            <Boxes className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-base font-black tracking-tight text-stone-950 dark:text-stone-100">
            Kegudangaja
          </span>
        </div>

        {/* Right Actions: Notification Bell + Theme Toggle + Admin Login Link */}
        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />

          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border-2 border-stone-900 bg-amber-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-[2px_2px_0px_#18181b] hover:bg-amber-200 dark:hover:bg-stone-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            title={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500 stroke-[2.5]" /> : <Moon className="w-4 h-4 text-stone-900 stroke-[2.5]" />}
          </button>

          <button
            type="button"
            onClick={() => setIsAdminLoginOpen(true)}
            className="text-xs font-black text-stone-950 bg-amber-300 hover:bg-amber-400 border-2 border-stone-900 rounded-lg px-3 py-1.5 shadow-[2.5px_2.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all inline-flex items-center gap-1.5"
            title="Masuk ke panel administrasi penuh gudang"
          >
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
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
    <header className="sticky top-0 z-30 h-14 bg-white dark:bg-stone-900 border-b-2 border-stone-900 dark:border-stone-500 px-4 sm:px-6 flex items-center justify-between shadow-[0px_2px_0px_#18181b] transition-colors">
      {/* Zone 1: Mobile Hamburger & Brand Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md border-2 border-stone-900 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all lg:hidden"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button
          onClick={() => navigateTo('dashboard')}
          className="text-base font-black tracking-tight text-stone-950 dark:text-stone-100 hover:text-amber-600 flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-stone-950 border-2 border-stone-900 flex items-center justify-center shadow-[2px_2px_0px_#18181b] hidden sm:flex">
            <Boxes className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span>Kegudangaja</span>
        </button>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
        <button
          onClick={() => navigateTo('dashboard')}
          className={`px-3 py-1 rounded transition-all ${
            currentPage === 'dashboard'
              ? 'bg-amber-300 text-stone-950 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b] font-black'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
          }`}
        >
          Ringkasan
        </button>
        <button
          onClick={() => navigateTo('stok')}
          className={`px-3 py-1 rounded transition-all ${
            currentPage === 'stok'
              ? 'bg-cyan-300 text-stone-950 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b] font-black'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
          }`}
        >
          Stok
        </button>
        <button
          onClick={() => navigateTo('masuk')}
          className={`px-3 py-1 rounded transition-all ${
            currentPage === 'masuk'
              ? 'bg-emerald-300 text-stone-950 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b] font-black'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
          }`}
        >
          Masuk
        </button>
        <button
          onClick={() => navigateTo('keluar')}
          className={`px-3 py-1 rounded transition-all ${
            currentPage === 'keluar'
              ? 'bg-rose-300 text-stone-950 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b] font-black'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
          }`}
        >
          Keluar
        </button>
        <button
          onClick={() => navigateTo('bincard')}
          className={`px-3 py-1 rounded transition-all ${
            currentPage === 'bincard'
              ? 'bg-purple-300 text-stone-950 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b] font-black'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
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
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border-2 border-stone-900 shadow-[2px_2px_0px_#18181b] text-[11px] font-black text-stone-950 transition-all ${
            health.status === 'ONLINE'
              ? 'bg-emerald-300'
              : health.status === 'OFFLINE'
              ? 'bg-rose-300'
              : 'bg-amber-300'
          }`}
          title={`Backend GAS: ${health.status}`}
        >
          <span className="w-2 h-2 rounded-full bg-stone-950 shrink-0" />
          <span className="font-mono">GAS {health.status}</span>
        </button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-lg border-2 border-stone-900 bg-amber-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-[2px_2px_0px_#18181b] hover:bg-amber-200 dark:hover:bg-stone-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
          title={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500 stroke-[2.5]" /> : <Moon className="w-4 h-4 text-stone-900 stroke-[2.5]" />}
        </button>

        {/* Admin Badge */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-400 text-stone-950 text-[11px] font-black tracking-wide border-2 border-stone-900 shadow-[2px_2px_0px_#18181b]">
          <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>ADMIN</span>
        </span>

        {/* Logout Admin Button */}
        <button
          type="button"
          onClick={logoutAdmin}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-stone-950 bg-rose-300 hover:bg-rose-400 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          title="Keluar dari mode Admin dan kembali ke mode Member"
        >
          <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
};
