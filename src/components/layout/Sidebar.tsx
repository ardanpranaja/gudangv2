import React from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
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
        { id: 'ai-assistant', label: 'Uti AI', icon: Bot, badge: 'AI' },
      ],
    },
    {
      groupName: 'Master Data',
      items: [
        { id: 'items', label: 'Barang', icon: Package },
        { id: 'members', label: 'Member', icon: Users },
        // Disembunyikan sementara: backend member limit nonaktif (v13) sampai ada keputusan workaround.
        // { id: 'limits', label: 'Limit Member', icon: Sliders },
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
          className="fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-stone-900 text-stone-300 flex flex-col border-r border-stone-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-14 px-5 border-b-2 border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-amber-400 text-stone-950 font-black text-xs rounded border-2 border-stone-950 shadow-[2px_2px_0px_#000] flex items-center justify-center font-mono">
              KG
            </div>
            <span className="font-black text-sm tracking-tight text-white">Kegudangaja</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded border border-stone-700 text-stone-400 hover:text-white hover:bg-stone-800 lg:hidden"
            aria-label="Tutup navigasi"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
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
                  <div className="px-3 pb-1 text-[11px] font-black text-amber-400/90 uppercase tracking-wider">
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
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-bold transition-all text-left ${
                        isActive
                          ? 'bg-amber-400 text-stone-950 font-black border-2 border-stone-950 shadow-[3px_3px_0px_#000]'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 stroke-[2.5] ${
                          isActive ? 'text-stone-950' : 'text-stone-400'
                        }`}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 text-[10px] font-mono font-black rounded border ${
                          isActive
                            ? 'bg-stone-950 text-amber-300 border-stone-950'
                            : 'bg-pink-400 text-stone-950 border-stone-950 shadow-[1px_1px_0px_#000]'
                        }`}>
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
        <div className="p-3.5 border-t border-stone-800 bg-stone-950/40 text-[11px] text-stone-400 dark:text-stone-500 flex items-center justify-between">
          <div className="truncate">
            <div className="text-stone-300 font-medium truncate">1 Gudang Utama</div>
            <div className="text-stone-400 dark:text-stone-500 font-mono text-[10px]">Spreadsheet + GAS</div>
          </div>
          <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500">v1.0</span>
        </div>
      </aside>
    </>
  );
};
