import React from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  Sliders,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Undo2,
  FileCheck2,
  Boxes,
  ScrollText,
  History,
  FileSpreadsheet,
  Settings,
  Cog,
  Wrench,
  Bot,
  X,
} from 'lucide-react';
import { useApp, PageId } from '../../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  groupName?: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentPage, navigateTo, canAccessPage } = useApp();

  const navGroups: NavGroup[] = [
    {
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'ai-assistant', label: 'AI Assistant', icon: Bot, badge: 'AI' },
      ],
    },
    {
      groupName: 'Master Data',
      items: [
        { id: 'items', label: 'Barang', icon: Package },
        { id: 'members', label: 'Member', icon: Users },
        { id: 'limits', label: 'Limit Member', icon: Sliders },
      ],
    },
    {
      groupName: 'Transaksi',
      items: [
        { id: 'masuk', label: 'Barang Masuk', icon: ArrowDownLeft },
        { id: 'keluar', label: 'Barang Keluar', icon: ArrowUpRight },
        { id: 'pinjam', label: 'Pinjam', icon: RotateCcw },
        { id: 'kembali', label: 'Kembali', icon: Undo2 },
      ],
    },
    {
      groupName: 'Pengajuan',
      items: [{ id: 'pengajuan', label: 'Pengajuan Pengambilan', icon: FileCheck2 }],
    },
    {
      groupName: 'Monitoring',
      items: [
        { id: 'stok', label: 'Stok', icon: Boxes },
        { id: 'bincard', label: 'Kartu Stok / Bin Card', icon: ScrollText },
        { id: 'riwayat-member', label: 'Riwayat Member', icon: History },
      ],
    },
    {
      groupName: 'Analisis & Sistem',
      items: [
        { id: 'laporan', label: 'Laporan', icon: FileSpreadsheet },
        { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
      ],
    },
    {
      groupName: 'Mesin (Tahap Berikutnya)',
      items: [
        { id: 'mesin', label: 'Master Mesin', icon: Cog },
        { id: 'pemakaian-mesin', label: 'Pemakaian Mesin', icon: Wrench },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white text-slate-900 font-bold text-xs rounded flex items-center justify-center font-mono">
              GV2
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">GudangV2</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white lg:hidden"
            aria-label="Tutup navigasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 text-xs">
          {navGroups.map((group, gIdx) => {
            const accessibleItems = group.items.filter((item) => canAccessPage(item.id));
            if (accessibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                {group.groupName && (
                  <div className="px-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {group.groupName}
                  </div>
                )}
                {accessibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigateTo(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-medium transition-colors text-left ${
                        isActive
                          ? 'bg-slate-800 text-white font-semibold shadow-xs'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="truncate">
            <div className="text-slate-300 font-medium truncate">1 Gudang Utama</div>
            <div className="text-slate-400 font-mono text-[10px]">Spreadsheet + GAS</div>
          </div>
          <span className="font-mono text-[10px] text-slate-400">v1.0</span>
        </div>
      </aside>
    </>
  );
};
