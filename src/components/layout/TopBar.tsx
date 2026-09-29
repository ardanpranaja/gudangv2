import React, { useState } from 'react';
import { Menu, ShieldCheck, ChevronDown, Check } from 'lucide-react';
import { useApp, PageId } from '../../context/AppContext';
import { UserRole } from '../../types';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { currentPage, navigateTo, role, setRole, health } = useApp();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const roles: { id: UserRole; label: string; desc: string }[] = [
    { id: 'ADMIN', label: 'Admin', desc: 'Akses penuh ke semua modul & approval' },
    { id: 'OPERATOR', label: 'Operator', desc: 'Operasional gudang & transaksi' },
    { id: 'VIEWER', label: 'Viewer', desc: 'Hanya melihat stok & laporan' },
  ];

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
      {/* Zone 1: Mobile Hamburger & Brand Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={() => navigateTo('dashboard')}
          className="text-base font-bold tracking-tight text-slate-900 hover:text-slate-800 flex items-center gap-2"
        >
          <span>GudangPresisi</span>
        </button>
      </div>

      {/* Zone 2: Navigation Links (Clean text links with active indicator) */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
        <button
          onClick={() => navigateTo('dashboard')}
          className={`transition-colors hover:text-slate-900 ${
            currentPage === 'dashboard' ? 'text-slate-900 font-semibold' : ''
          }`}
        >
          Ringkasan
        </button>
        <button
          onClick={() => navigateTo('stok')}
          className={`transition-colors hover:text-slate-900 ${
            currentPage === 'stok' ? 'text-slate-900 font-semibold' : ''
          }`}
        >
          Stok
        </button>
        <button
          onClick={() => navigateTo('masuk')}
          className={`transition-colors hover:text-slate-900 ${
            currentPage === 'masuk' ? 'text-slate-900 font-semibold' : ''
          }`}
        >
          Masuk
        </button>
        <button
          onClick={() => navigateTo('keluar')}
          className={`transition-colors hover:text-slate-900 ${
            currentPage === 'keluar' ? 'text-slate-900 font-semibold' : ''
          }`}
        >
          Keluar
        </button>
        <button
          onClick={() => navigateTo('bincard')}
          className={`transition-colors hover:text-slate-900 ${
            currentPage === 'bincard' ? 'text-slate-900 font-semibold' : ''
          }`}
        >
          Bin Card
        </button>
      </nav>

      {/* Zone 3: Connection & Role Switcher */}
      <div className="flex items-center gap-2.5">
        {/* Backend status indicator */}
        <button
          onClick={() => navigateTo('pengaturan')}
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-slate-500 hover:bg-slate-50 transition-colors"
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
          <span className="font-mono text-slate-600">GAS {health.status}</span>
        </button>

        {/* Role Selector */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Peran: {role}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setRoleDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1.5 text-xs text-left">
                <div className="px-3 py-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Ganti Peran Pengguna
                </div>
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRole(r.id);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 flex items-start justify-between text-left hover:bg-slate-50 transition-colors ${
                      role === r.id ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-600'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{r.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{r.desc}</div>
                    </div>
                    {role === r.id && <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
