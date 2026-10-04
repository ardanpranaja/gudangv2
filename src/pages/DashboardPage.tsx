import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo('masuk')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Barang Masuk</span>
            </button>
            <button
              onClick={() => navigateTo('keluar')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Barang Keluar</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Master Barang"
          value={stocks.length}
          unit="SKU"
          subtitle="Katalog item terdaftar di backend"
          icon={Package}
          onClick={() => navigateTo('items')}
        />
        <StatCard
          label="Member Aktif"
          value={activeMembersCount}
          unit={`/ ${members.length}`}
          subtitle="Petugas & vendor operasional"
          icon={Users}
          onClick={() => navigateTo('members')}
        />
        <StatCard
          label="Menunggu Persetujuan"
          value={pendingRequests}
          unit="pengajuan"
          subtitle={pendingRequests > 0 ? 'Perlu direview admin' : 'Antrean kosong'}
          icon={Hourglass}
          variant={pendingRequests > 0 ? 'warning' : 'success'}
          onClick={() => navigateTo('pengajuan')}
        />
        <StatCard
          label="Barang Stok Menipis"
          value={lowStockItems.length}
          unit="SKU"
          subtitle={lowStockItems.length > 0 ? 'Perlu pengadaan segera' : 'Semua item di atas batas min'}
          icon={AlertTriangle}
          variant={lowStockItems.length > 0 ? 'warning' : 'default'}
          onClick={() => navigateTo('stok')}
        />
      </div>

      {/* Main Grid: Low Stock & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Low Stock Warnings */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Perhatian Minimum Stok</h3>
                <p className="text-xs text-slate-500 mt-0.5">Barang dengan stok sama atau di bawah batas minimum</p>
              </div>
              <button
                onClick={() => navigateTo('stok')}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
              >
                <span>Lihat Semua Stok</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="text-xs text-slate-500 p-6 border border-dashed border-slate-200 rounded text-center">
                Semua stok barang berada dalam batas aman.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {lowStockItems.slice(0, 5).map((item, idx) => (
                  <div key={`${item.idItem}-${idx}`} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{item.namaItem}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Kategori: {item.kategori} · Lokasi: {item.lokasi}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold text-rose-600 tabular-nums">
                        {item.stok} / {item.minStok} {item.satuan}
                      </div>
                      <button
                        onClick={() => navigateTo('bincard', { itemId: item.idItem })}
                        className="text-[11px] text-slate-500 hover:text-slate-800 underline mt-0.5"
                      >
                        Lihat Bin Card
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan {Math.min(lowStockItems.length, 5)} barang menipis</span>
            <button
              onClick={() => navigateTo('stok')}
              className="text-slate-800 font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>Halaman Stok</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right Column: Recent Transactions Summary */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Aktivitas Transaksi Terkini</h3>
              <p className="text-xs text-slate-500 mt-0.5">Pencatatan mutasi barang terakhir di Google Spreadsheet</p>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="text-xs text-slate-500 p-6 border border-dashed border-slate-200 rounded text-center">
                Belum ada transaksi tercatat di database.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentTransactions.map((tx, idx) => (
                  <div key={`${tx.ID_TRANSAKSI || tx.NO_DOKUMEN || idx}-${idx}`} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800">{tx.NO_DOKUMEN}</span>
                        <StatusBadge status={tx.JENIS_TRANSAKSI} size="sm" />
                      </div>
                      <div className="text-slate-600 mt-1 truncate">
                        {tx.NAMA_ITEM || tx.ID_ITEM}
                        {tx.NAMA_MEMBER ? ` · Member: ${tx.NAMA_MEMBER}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDateTime(tx.TIMESTAMP || tx.TANGGAL)} · &quot;{tx.KETERANGAN || '-'}&quot;
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {tx.JUMLAH}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan {recentTransactions.length} transaksi terbaru</span>
            <button
              onClick={() => navigateTo('laporan')}
              className="text-slate-800 font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>Laporan Lengkap</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
