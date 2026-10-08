import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { WarehouseBanner } from '../components/illustrations/WarehouseBanner';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { ItemStock, Transaksi, MasterMember, PengajuanPengambilan } from '../types';
import {
  Package,
  Users,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Hourglass,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { navigateTo, refreshKey } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [stocks, setStocks] = useState<ItemStock[]>([]);
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [transactions, setTransactions] = useState<Transaksi[]>([]);
  const [requests, setRequests] = useState<PengajuanPengambilan[]>([]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [stockData, memberData, txData, reqData] = await Promise.all([
        api.getStock(),
        api.getMembers(),
        api.getTransactions({ limit: '20' }),
        api.getRequests(),
      ]);
      setStocks(stockData);
      setMembers(memberData);
      setTransactions(txData);
      setRequests(reqData);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Gagal memuat ringkasan dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [refreshKey]);

  if (isLoading) {
    return <LoadingState message="Memuat ringkasan operasional dari Google Spreadsheet..." />;
  }

  if (isError) {
    return <ErrorState error={errorMessage} onRetry={loadDashboardData} />;
  }

  const lowStockItems = stocks.filter((s) => s.isLowStock);
  const activeMembersCount = members.filter((m) => m.STATUS === 'AKTIF').length;
  const recentTransactions = transactions.slice(-6).reverse();
  const pendingRequests = requests.filter((r) => (r.STATUS || '').toUpperCase() === 'MENUNGGU').length;

  const formatDateTime = (iso?: string): string => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Ringkasan Operasional Gudang"
        description="Ringkasan posisi stok fisik dan aktivitas mutasi terkini yang bersumber langsung dari Google Spreadsheet."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigateTo('masuk')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-stone-950 bg-emerald-300 hover:bg-emerald-400 border-2 border-stone-900 rounded-lg shadow-[3px_3px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#18181b] transition-all"
            >
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Barang Masuk</span>
            </button>
            <button
              onClick={() => navigateTo('keluar')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-stone-950 bg-amber-300 hover:bg-amber-400 border-2 border-stone-900 rounded-lg shadow-[3px_3px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#18181b] transition-all"
            >
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              <span>Barang Keluar</span>
            </button>
          </div>
        }
      />

      {/* Warehouse Vector Art Banner in Neo-Brutalist Frame */}
      <div className="rounded-2xl border-2 border-stone-900 dark:border-stone-400 shadow-[4.5px_4.5px_0px_#18181b] overflow-hidden bg-white dark:bg-stone-900">
        <WarehouseBanner className="w-full h-auto" />
      </div>

      {/* KPI Cards with rich colors */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
        <StatCard
          label="Total Master Barang"
          value={stocks.length}
          unit="SKU"
          subtitle="Katalog item terdaftar di backend"
          icon={Package}
          variant="cyan"
          onClick={() => navigateTo('items')}
        />
        <StatCard
          label="Member Aktif"
          value={activeMembersCount}
          unit={`/ ${members.length}`}
          subtitle="Petugas & vendor operasional"
          icon={Users}
          variant="success"
          onClick={() => navigateTo('members')}
        />
        <StatCard
          label="Menunggu Persetujuan"
          value={pendingRequests}
          unit="pengajuan"
          subtitle={pendingRequests > 0 ? 'Perlu direview admin' : 'Antrean kosong'}
          icon={Hourglass}
          variant={pendingRequests > 0 ? 'warning' : 'purple'}
          onClick={() => navigateTo('pengajuan')}
        />
        <StatCard
          label="Barang Stok Menipis"
          value={lowStockItems.length}
          unit="SKU"
          subtitle={lowStockItems.length > 0 ? 'Perlu pengadaan segera' : 'Semua item di atas batas min'}
          icon={AlertTriangle}
          variant={lowStockItems.length > 0 ? 'danger' : 'success'}
          onClick={() => navigateTo('stok')}
        />
      </div>

      {/* Main Grid: Low Stock & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Low Stock Warnings Panel */}
        <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 rounded-xl shadow-[4.5px_4.5px_0px_#18181b] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b-2 border-stone-900 dark:border-stone-600 bg-rose-100/70 dark:bg-rose-950/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-stone-950 dark:text-stone-100 tracking-tight">Perhatian Minimum Stok</h3>
                <p className="text-xs font-semibold text-rose-900 dark:text-rose-300 mt-0.5">Barang dengan stok sama atau di bawah batas minimum</p>
              </div>
              <button
                onClick={() => navigateTo('stok')}
                className="px-2.5 py-1 text-xs font-black text-stone-950 bg-amber-300 hover:bg-amber-400 border-2 border-stone-900 rounded shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all inline-flex items-center gap-1 shrink-0"
              >
                <span>Lihat Stok</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-4">
              {lowStockItems.length === 0 ? (
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 p-6 border-2 border-dashed border-emerald-500 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 text-center">
                  ✨ Semua stok barang berada dalam batas aman.
                </div>
              ) : (
                <div className="divide-y-2 divide-stone-100 dark:divide-stone-800 text-xs">
                  {lowStockItems.slice(0, 5).map((item, idx) => (
                    <div key={`${item.idItem}-${idx}`} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-stone-950 dark:text-stone-100">{item.namaItem}</div>
                        <div className="text-stone-500 dark:text-stone-400 text-[11px] mt-0.5">
                          Kategori: <span className="font-semibold">{item.kategori}</span> · Lokasi: <span className="font-semibold">{item.lokasi}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="inline-block px-2 py-0.5 bg-rose-200 dark:bg-rose-900/60 text-rose-950 dark:text-rose-200 border-2 border-stone-900 rounded font-mono font-black text-xs tabular-nums shadow-[1.5px_1.5px_0px_#18181b]">
                          {item.stok} / {item.minStok} {item.satuan}
                        </div>
                        <div className="mt-1">
                          <button
                            onClick={() => navigateTo('bincard', { itemId: item.idItem })}
                            className="text-[11px] font-bold text-stone-700 dark:text-stone-300 hover:text-stone-950 underline"
                          >
                            Bin Card &rarr;
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 border-t-2 border-stone-900 dark:border-stone-600 bg-stone-100 dark:bg-stone-800/80 flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
            <span>Menampilkan {Math.min(lowStockItems.length, 5)} barang menipis</span>
            <button
              onClick={() => navigateTo('stok')}
              className="text-stone-950 dark:text-stone-100 font-black hover:underline inline-flex items-center gap-1"
            >
              <span>Halaman Stok</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Right Column: Recent Transactions Summary Panel */}
        <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 rounded-xl shadow-[4.5px_4.5px_0px_#18181b] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b-2 border-stone-900 dark:border-stone-600 bg-sky-100/70 dark:bg-sky-950/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-stone-950 dark:text-stone-100 tracking-tight">Aktivitas Transaksi Terkini</h3>
                <p className="text-xs font-semibold text-sky-900 dark:text-sky-300 mt-0.5">Pencatatan mutasi barang terakhir di Google Spreadsheet</p>
              </div>
              <button
                onClick={() => navigateTo('laporan')}
                className="px-2.5 py-1 text-xs font-black text-stone-950 bg-sky-300 hover:bg-sky-400 border-2 border-stone-900 rounded shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all inline-flex items-center gap-1 shrink-0"
              >
                <span>Semua</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-4">
              {recentTransactions.length === 0 ? (
                <div className="text-xs font-bold text-stone-600 dark:text-stone-400 p-6 border-2 border-dashed border-stone-400 rounded-lg text-center">
                  Belum ada transaksi tercatat di database.
                </div>
              ) : (
                <div className="divide-y-2 divide-stone-100 dark:divide-stone-800 text-xs">
                  {recentTransactions.map((tx, idx) => (
                    <div key={`${tx.ID_TRANSAKSI || tx.NO_DOKUMEN || idx}-${idx}`} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-stone-950 dark:text-stone-100">{tx.NO_DOKUMEN}</span>
                          <StatusBadge status={tx.JENIS_TRANSAKSI} size="sm" />
                        </div>
                        <div className="text-stone-700 dark:text-stone-300 font-medium mt-1 truncate">
                          {tx.NAMA_ITEM || tx.ID_ITEM}
                          {tx.NAMA_MEMBER ? ` · Member: ${tx.NAMA_MEMBER}` : ''}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                          {formatDateTime(tx.TIMESTAMP || tx.TANGGAL)} · &quot;{tx.KETERANGAN || '-'}&quot;
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block px-2.5 py-0.5 bg-yellow-200 dark:bg-yellow-300 text-stone-950 border-2 border-stone-900 rounded font-mono font-black tabular-nums shadow-[1.5px_1.5px_0px_#18181b]">
                          {tx.JUMLAH}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 border-t-2 border-stone-900 dark:border-stone-600 bg-stone-100 dark:bg-stone-800/80 flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
            <span>Menampilkan {recentTransactions.length} transaksi terbaru</span>
            <button
              onClick={() => navigateTo('laporan')}
              className="text-stone-950 dark:text-stone-100 font-black hover:underline inline-flex items-center gap-1"
            >
              <span>Laporan Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
