import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { ItemStock, Transaksi, PengajuanPengambilan, MasterMember } from '../types';
import {
  Package,
  Users,
  AlertTriangle,
  FileCheck2,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Undo2,
  ArrowRight,
  Boxes,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { navigateTo, refreshKey } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [stocks, setStocks] = useState<ItemStock[]>([]);
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [transactions, setTransactions] = useState<Transaksi[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PengajuanPengambilan[]>([]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [stockData, memberData, txData, reqData] = await Promise.all([
        api.getStock(),
        api.getMembers(),
        api.getTransactions(),
        api.getRequests(),
      ]);
      setStocks(stockData);
      setMembers(memberData);
      setTransactions(txData);
      setPendingRequests(reqData.filter((r) => r.STATUS === 'MENUNGGU'));
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
    return <LoadingState message="Memuat ringkasan operasional gudang..." />;
  }

  if (isError) {
    return <ErrorState error={errorMessage} onRetry={loadDashboardData} />;
  }

  const lowStockItems = stocks.filter((s) => s.isLowStock);
  const activeMembersCount = members.filter((m) => m.STATUS === 'AKTIF').length;
  const recentTransactions = transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Ringkasan Operasional Gudang"
        description="Ringkasan posisi stok, transaksi terkini, dan pengajuan pengambilan yang memerlukan perhatian."
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
          subtitle="Katalog item terdaftar"
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
          label="Barang Stok Menipis"
          value={lowStockItems.length}
          unit="SKU"
          subtitle={lowStockItems.length > 0 ? 'Perlu pengadaan segera' : 'Semua item di atas batas min'}
          icon={AlertTriangle}
          variant={lowStockItems.length > 0 ? 'warning' : 'default'}
          onClick={() => navigateTo('stok')}
        />
        <StatCard
          label="Pengajuan Menunggu"
          value={pendingRequests.length}
          unit="Antrean"
          subtitle={pendingRequests.length > 0 ? 'Menunggu verifikasi Admin' : 'Tidak ada antrean tertunda'}
          icon={FileCheck2}
          variant={pendingRequests.length > 0 ? 'danger' : 'default'}
          onClick={() => navigateTo('pengajuan')}
        />
      </div>

      {/* Quick Action Navigation Strip */}
      <div className="p-4 bg-white rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Boxes className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-800">Aksi Cepat Transaksi:</span>
          <span className="text-slate-500">Pilih modul operasional utama yang ingin diproses:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigateTo('masuk')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Masuk</span>
          </button>
          <button
            onClick={() => navigateTo('keluar')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Keluar</span>
          </button>
          <button
            onClick={() => navigateTo('pinjam')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Pinjam</span>
          </button>
          <button
            onClick={() => navigateTo('kembali')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Kembali</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Pending Approval Alert & Low Stock & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Pengajuan & Low Stock Alerts */}
        <div className="space-y-6">
          {/* Pending Requests Alert */}
          {pendingRequests.length > 0 && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                    Pengajuan Pengambilan Awal ({pendingRequests.length})
                  </h3>
                </div>
                <button
                  onClick={() => navigateTo('pengajuan')}
                  className="text-xs font-medium text-amber-800 hover:text-amber-950 inline-flex items-center gap-1"
                >
                  <span>Buka Halaman Approval</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {pendingRequests.slice(0, 3).map((req) => (
                  <div
                    key={req.ID_PENGAJUAN}
                    className="p-3 bg-white border border-amber-200/80 rounded flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{req.NAMA_MEMBER}</div>
                      <div className="text-slate-500 mt-0.5 line-clamp-1">
                        Meminta {req.JUMLAH} unit · {req.NAMA_ITEM}
                      </div>
                      <div className="text-[11px] text-amber-800 mt-1 italic">
                        &quot;{req.ALASAN}&quot;
                      </div>
                    </div>
                    <button
                      onClick={() => navigateTo('pengajuan')}
                      className="px-2.5 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 shrink-0 ml-3"
                    >
                      Tinjau
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Stock Warning Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Perhatian Minimum Stok</h3>
                <p className="text-xs text-slate-500 mt-0.5">Barang dengan stok kurang dari batas minimum</p>
              </div>
              <button
                onClick={() => navigateTo('stok')}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
              >
                <span>Lihat Stok</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="text-xs text-slate-500 p-4 border border-dashed border-slate-200 rounded text-center">
                Semua stok barang berada dalam batas aman.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.idItem} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{item.namaItem}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Kategori {item.kategori} · Lokasi: {item.lokasi}
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
        </div>

        {/* Right Column: Recent Transactions Summary */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Aktivitas Transaksi Terkini</h3>
                <p className="text-xs text-slate-500 mt-0.5">Pencatatan mutasi barang terakhir di gudang</p>
              </div>
              <button
                onClick={() => navigateTo('bincard')}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
              >
                <span>Buka Kartu Stok</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="text-xs text-slate-500 p-6 border border-dashed border-slate-200 rounded text-center">
                Belum ada transaksi tercatat.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentTransactions.map((tx) => (
                  <div key={tx.ID_TRANSAKSI} className="py-3 flex items-start justify-between gap-3">
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
                        {tx.TIMESTAMP} · &quot;{tx.KETERANGAN}&quot;
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
            <span>Menampilkan 6 transaksi terbaru</span>
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
