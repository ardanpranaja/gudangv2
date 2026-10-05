import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { ItemStock, Transaksi } from '../types';
import { getAdminConsumableBadge } from '../utils/consumableConfig';
import {
  FileSpreadsheet,
  Printer,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Undo2,
  Calendar,
} from 'lucide-react';

export const LaporanPage: React.FC = () => {
  const { navigateTo, refreshKey } = useApp();

  const [stocks, setStocks] = useState<ItemStock[]>([]);
  const [transactions, setTransactions] = useState<Transaksi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Period filter
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const loadAll = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [stockData, txData] = await Promise.all([
        api.getStock(),
        api.getTransactions(),
      ]);
      setStocks(stockData);
      setTransactions(txData);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Gagal memuat data laporan dari backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [refreshKey]);

  if (isLoading) {
    return <LoadingState message="Memuat rekapitulasi laporan dari Google Spreadsheet..." />;
  }

  if (isError) {
    return <ErrorState error={errorMessage} onRetry={loadAll} />;
  }

  // Calculations for selected period
  const filteredTxs = transactions.filter((t) => t.TANGGAL && t.TANGGAL.startsWith(selectedMonth));

  const totalMasuk = filteredTxs
    .filter((t) => t.JENIS_TRANSAKSI === 'BARANG_MASUK')
    .reduce((sum, t) => sum + (Number(t.JUMLAH) || 0), 0);

  const totalKeluar = filteredTxs
    .filter((t) => t.JENIS_TRANSAKSI === 'BARANG_KELUAR')
    .reduce((sum, t) => sum + (Number(t.JUMLAH) || 0), 0);

  const totalPinjam = filteredTxs
    .filter((t) => t.JENIS_TRANSAKSI === 'PINJAM')
    .reduce((sum, t) => sum + (Number(t.JUMLAH) || 0), 0);

  const totalKembali = filteredTxs
    .filter((t) => t.JENIS_TRANSAKSI === 'KEMBALI')
    .reduce((sum, t) => sum + (Number(t.JUMLAH) || 0), 0);

  // Category breakdown
  const categoryCounts = stocks.reduce((acc, curr) => {
    acc[curr.kategori] = (acc[curr.kategori] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Rekapitulasi Operasional"
        description="Analisis periodik mutasi stok dan intensitas transaksi barang yang bersumber dari database Google Spreadsheet."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded text-xs">
              <Calendar className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs text-stone-800 dark:text-stone-200 bg-transparent font-medium focus:outline-hidden"
              />
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded hover:bg-stone-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={`Barang Masuk (${selectedMonth})`}
          value={totalMasuk}
          unit="Unit"
          subtitle="Penerimaan stok dari supplier"
          icon={ArrowDownLeft}
          onClick={() => navigateTo('masuk')}
        />
        <StatCard
          label={`Barang Keluar (${selectedMonth})`}
          value={totalKeluar}
          unit="Unit"
          subtitle="Distribusi terpakai oleh member"
          icon={ArrowUpRight}
          onClick={() => navigateTo('keluar')}
        />
        <StatCard
          label={`Peminjaman (${selectedMonth})`}
          value={totalPinjam}
          unit="Unit"
          subtitle="Alat & mesin dipinjam"
          icon={RotateCcw}
          onClick={() => navigateTo('pinjam')}
        />
        <StatCard
          label={`Pengembalian (${selectedMonth})`}
          value={totalKembali}
          unit="Unit"
          subtitle="Alat & mesin dikembalikan"
          icon={Undo2}
          onClick={() => navigateTo('kembali')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Category Composition */}
        <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-100 pb-2">
            <Boxes className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            <span>Komposisi SKU per Kategori (GAS)</span>
          </h3>

          <div className="space-y-3 text-xs">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = Math.round((count / (stocks.length || 1)) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-stone-700 dark:text-stone-200">{cat}</span>
                    <span className="font-mono text-stone-900 dark:text-stone-100 tabular-nums">
                      {count} SKU ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-stone-800 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-stone-100">
            <button
              onClick={() => navigateTo('items')}
              className="text-xs font-medium text-stone-700 dark:text-stone-200 hover:text-stone-950 underline"
            >
              Buka Katalog Master Barang
            </button>
          </div>
        </div>

        {/* Right: Period Summary Table */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              <span>Daftar Transaksi Periode {selectedMonth} ({filteredTxs.length} Catatan)</span>
            </h3>
            <span className="text-[11px] text-stone-400 dark:text-stone-500">Google Spreadsheet</span>
          </div>

          {filteredTxs.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 dark:text-stone-500 border border-dashed border-stone-200 dark:border-stone-700 rounded">
              Tidak ada catatan mutasi pada periode {selectedMonth} di database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 font-semibold">
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">No. Dokumen</th>
                    <th className="py-2 px-3">Jenis</th>
                    <th className="py-2 px-3">Barang</th>
                    <th className="py-2 px-3">Member</th>
                    <th className="py-2 px-3 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700 text-stone-700 dark:text-stone-200">
                  {filteredTxs.slice(0, 10).map((t, idx) => (
                    <tr key={`${t.ID_TRANSAKSI || t.NO_DOKUMEN || idx}-${idx}`} className="hover:bg-stone-50">
                      <td className="py-2 px-3 font-mono text-stone-600 dark:text-stone-400">{t.TANGGAL}</td>
                      <td className="py-2 px-3 font-mono font-medium text-stone-900 dark:text-stone-100">{t.NO_DOKUMEN}</td>
                      <td className="py-2 px-3">
                        <StatusBadge status={t.JENIS_TRANSAKSI} size="sm" />
                      </td>
                      <td className="py-2 px-3 font-medium text-stone-800 dark:text-stone-200">
                        {t.NAMA_ITEM || t.ID_ITEM}
                      </td>
                      <td className="py-2 px-3 text-stone-600 dark:text-stone-400">{t.NAMA_MEMBER || '-'}</td>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900 dark:text-stone-100 text-right tabular-nums">
                        <div>{t.JUMLAH}</div>
                        {getAdminConsumableBadge(t.ID_ITEM, Number(t.JUMLAH || 0)) && (
                          <div className="text-[10px] font-sans font-medium text-teal-700">
                            {getAdminConsumableBadge(t.ID_ITEM, Number(t.JUMLAH || 0))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTxs.length > 10 && (
                <div className="pt-3 text-[11px] text-stone-400 dark:text-stone-500 text-center">
                  Menampilkan 10 dari {filteredTxs.length} transaksi di bulan ini.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
