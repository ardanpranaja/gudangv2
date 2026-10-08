import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Flame, Users, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface FastMovingItem {
  idItem: string;
  namaItem: string;
  kategori: string;
  totalKeluar: number;
  txCount: number;
  currentStock: number;
  minStock: number;
  satuan: string;
  isLow: boolean;
}

export interface ActiveMemberStat {
  idMember: string;
  namaMember: string;
  jabatan: string;
  lantai: string;
  totalTx: number;
  totalUnits: number;
}

interface FastMovingListProps {
  fastMovingItems: FastMovingItem[];
  activeMembers: ActiveMemberStat[];
}

export const FastMovingList: React.FC<FastMovingListProps> = ({
  fastMovingItems,
  activeMembers,
}) => {
  const { navigateTo } = useApp();
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'MEMBERS'>('ITEMS');

  const maxItemQty = fastMovingItems.length > 0 ? fastMovingItems[0].totalKeluar : 1;
  const maxMemberTx = activeMembers.length > 0 ? activeMembers[0].totalTx : 1;

  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 rounded-xl shadow-[4.5px_4.5px_0px_#18181b] p-4 sm:p-5 flex flex-col justify-between">
      <div>
        {/* Header with Switcher Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-sm font-black text-stone-950 dark:text-stone-100 tracking-tight flex items-center gap-2">
              {activeTab === 'ITEMS' ? (
                <>
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-400 stroke-[2.5]" />
                  <span>Top Barang Fast-Moving</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 text-sky-500 stroke-[2.5]" />
                  <span>Member Paling Aktif</span>
                </>
              )}
            </h3>
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mt-0.5">
              {activeTab === 'ITEMS'
                ? 'Item dengan frekuensi mutasi keluar & pemakaian tertinggi'
                : 'Personil dengan aktivitas transaksi gudang terbanyak'}
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-400 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('ITEMS')}
              className={`px-2.5 py-1 text-xs font-black rounded transition-all ${
                activeTab === 'ITEMS'
                  ? 'bg-amber-300 text-stone-950 shadow-[1.5px_1.5px_0px_#18181b]'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-950'
              }`}
            >
              Barang
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MEMBERS')}
              className={`px-2.5 py-1 text-xs font-black rounded transition-all ${
                activeTab === 'MEMBERS'
                  ? 'bg-sky-300 text-stone-950 shadow-[1.5px_1.5px_0px_#18181b]'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-950'
              }`}
            >
              Member
            </button>
          </div>
        </div>

        {/* Tab 1: Fast Moving Items */}
        {activeTab === 'ITEMS' && (
          <div className="mt-4 space-y-3">
            {fastMovingItems.length === 0 ? (
              <div className="text-xs font-bold text-stone-500 dark:text-stone-400 py-8 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-lg">
                Belum ada transaksi mutasi keluar pada periode ini
              </div>
            ) : (
              fastMovingItems.map((item, index) => {
                const rankBadgeColors = [
                  'bg-amber-400 text-stone-950', // #1
                  'bg-stone-300 text-stone-950', // #2
                  'bg-amber-600 text-white',     // #3
                  'bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
                  'bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
                ];
                const badgeClass = rankBadgeColors[index] || rankBadgeColors[3];
                const pct = Math.round((item.totalKeluar / maxItemQty) * 100);

                return (
                  <div
                    key={item.idItem}
                    className="p-3 bg-stone-50 dark:bg-stone-800/60 border-2 border-stone-900 dark:border-stone-600 rounded-lg shadow-[2px_2px_0px_#18181b] flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-md border-2 border-stone-900 flex items-center justify-center font-black text-xs font-mono shrink-0 shadow-[1px_1px_0px_#18181b] ${badgeClass}`}
                        >
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => navigateTo('bincard', { itemId: item.idItem })}
                            className="font-black text-xs text-stone-950 dark:text-stone-100 hover:underline truncate text-left block"
                          >
                            {item.namaItem}
                          </button>
                          <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 mt-0.5">
                            {item.kategori} · {item.txCount} kali mutasi
                          </div>
                        </div>
                      </div>

                      {/* Right Quantity & Low Stock Alert */}
                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-sm text-stone-950 dark:text-stone-100">
                          {item.totalKeluar}{' '}
                          <span className="text-[10px] font-bold text-stone-500">
                            {item.satuan}
                          </span>
                        </div>
                        <div className="mt-0.5">
                          {item.isLow ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-400">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Stok Kritis ({item.currentStock})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Sisa {item.currentStock}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar of Relative Volume */}
                    <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden border border-stone-400 dark:border-stone-600">
                      <div
                        style={{ width: `${pct}%` }}
                        className="bg-amber-400 h-full rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Active Members */}
        {activeTab === 'MEMBERS' && (
          <div className="mt-4 space-y-3">
            {activeMembers.length === 0 ? (
              <div className="text-xs font-bold text-stone-500 dark:text-stone-400 py-8 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-lg">
                Belum ada transaksi member pada periode ini
              </div>
            ) : (
              activeMembers.map((member, index) => {
                const rankBadgeColors = [
                  'bg-sky-400 text-stone-950',   // #1
                  'bg-stone-300 text-stone-950', // #2
                  'bg-sky-600 text-white',      // #3
                  'bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
                  'bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-200',
                ];
                const badgeClass = rankBadgeColors[index] || rankBadgeColors[3];
                const pct = Math.round((member.totalTx / maxMemberTx) * 100);

                return (
                  <div
                    key={member.idMember}
                    className="p-3 bg-stone-50 dark:bg-stone-800/60 border-2 border-stone-900 dark:border-stone-600 rounded-lg shadow-[2px_2px_0px_#18181b] flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-md border-2 border-stone-900 flex items-center justify-center font-black text-xs font-mono shrink-0 shadow-[1px_1px_0px_#18181b] ${badgeClass}`}
                        >
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => navigateTo('riwayat-member', { memberId: member.idMember })}
                            className="font-black text-xs text-stone-950 dark:text-stone-100 hover:underline truncate text-left block"
                          >
                            {member.namaMember}
                          </button>
                          <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 mt-0.5">
                            {member.jabatan || 'Anggota'} {member.lantai ? `· Lt. ${member.lantai}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-sm text-stone-950 dark:text-stone-100">
                          {member.totalTx}{' '}
                          <span className="text-[10px] font-bold text-stone-500">transaksi</span>
                        </div>
                        <div className="text-[10px] font-bold text-stone-600 dark:text-stone-400">
                          {member.totalUnits} unit diambil
                        </div>
                      </div>
                    </div>

                    {/* Relative Activity Bar */}
                    <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden border border-stone-400 dark:border-stone-600">
                      <div
                        style={{ width: `${pct}%` }}
                        className="bg-sky-400 h-full rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t-2 border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
        <span className="font-semibold text-stone-500">
          {activeTab === 'ITEMS' ? 'Menampilkan top 5 barang terpakai' : 'Menampilkan top 5 personil aktif'}
        </span>
        <button
          type="button"
          onClick={() => navigateTo(activeTab === 'ITEMS' ? 'laporan' : 'riwayat-member')}
          className="font-black text-stone-950 dark:text-stone-100 hover:underline inline-flex items-center gap-1"
        >
          <span>{activeTab === 'ITEMS' ? 'Buka Laporan' : 'Riwayat Member'}</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
