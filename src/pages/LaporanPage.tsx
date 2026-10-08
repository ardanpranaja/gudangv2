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
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 rounded-lg shadow-[2px_2px_0px_#18181b] text-xs">
              <Calendar className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100 stroke-[2.5]" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs text-stone-950 dark:text-stone-100 bg-transparent font-black focus:outline-hidden"
              />
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-stone-950 bg-amber-300 hover:bg-amber-400 border-2 border-stone-900 rounded-lg shadow-[2.5px_2.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
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
          variant="success"
          onClick={() => navigateTo('masuk')}
        />
        <StatCard
          label={`Barang Keluar (${selectedMonth})`}
          value={totalKeluar}
          unit="Unit"
          subtitle="Distribusi terpakai oleh member"
          icon={ArrowUpRight}
          variant="warning"
          onClick={() => navigateTo('keluar')}
        />
        <StatCard
          label={`Peminjaman (${selectedMonth})`}
          value={totalPinjam}
          unit="Unit"
          subtitle="Alat & mesin dipinjam"
          icon={RotateCcw}
          variant="purple"
          onClick={() => navigateTo('pinjam')}
        />
        <StatCard
          label={`Pengembalian (${selectedMonth})`}
          value={totalKembali}
          unit="Unit"
          subtitle="Alat & mesin dikembalikan"
          icon={Undo2}
          variant="cyan"
          onClick={() => navigateTo('kembali')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Category Composition */}
        <div className="bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 p-5 space-y-4 shadow-[4.5px_4.5px_0px_#18181b]">
          <h3 className="text-xs font-black text-stone-950 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5 border-b-2 border-stone-900 dark:border-stone-700 pb-2">
            <Boxes className="w-4 h-4 text-stone-950 dark:text-stone-200 stroke-[2.5]" />
            <span>Komposisi SKU per Kategori (GAS)</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            {Object.entries(categoryCounts).map(([cat, count], idx) => {
              const pct = Math.round((count / (stocks.length || 1)) * 100);
              const barColors = ['bg-amber-400', 'bg-cyan-400', 'bg-emerald-400', 'bg-rose-400'];
              const chosenColor = barColors[idx % barColors.length];
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span className="text-stone-950 dark:text-stone-200">{cat}</span>
                    <span className="font-mono text-stone-950 dark:text-stone-100 font-black tabular-nums">
                      {count} SKU ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-stone-100 dark:bg-stone-800 rounded border-2 border-stone-900 overflow-hidden shadow-[1px_1px_0px_#000]">
                    <div className={`h-full ${chosenColor} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t-2 border-stone-900 dark:border-stone-700">
            <button
              onClick={() => navigateTo('items')}
              className="text-xs font-black text-amber-700 dark:text-amber-400 hover:underline"
            >
              Buka Katalog Master Barang &rarr;
            </button>
          </div>
        </div>

        {/* Right: Period Summary Table */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 p-5 space-y-4 shadow-[4.5px_4.5px_0px_#18181b]">
          <div className="flex items-center justify-between border-b-2 border-stone-900 dark:border-stone-700 pb-2">
            <h3 className="text-xs font-black text-stone-950 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-stone-950 dark:text-stone-200 stroke-[2.5]" />
              <span>Daftar Transaksi Periode {selectedMonth} ({filteredTxs.length} Catatan)</span>
            </h3>
            <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400">Google Spreadsheet</span>
          </div>

          {filteredTxs.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-600 dark:text-stone-400 border-2 border-dashed border-stone-400 dark:border-stone-600 rounded-lg font-bold">
              Tidak ada catatan mutasi pada periode {selectedMonth} di database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-950 dark:text-stone-100 font-black">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">No. Dokumen</th>
                    <th className="py-2.5 px-3">Jenis</th>
                    <th className="py-2.5 px-3">Barang</th>
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-stone-100 dark:divide-stone-800 text-stone-900 dark:text-stone-200">
                  {filteredTxs.slice(0, 10).map((t, idx) => (
                    <tr key={`${t.ID_TRANSAKSI || t.NO_DOKUMEN || idx}-${idx}`} className="hover:bg-amber-50/50 dark:hover:bg-stone-800/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-stone-700 dark:text-stone-400">{t.TANGGAL}</td>
                      <td className="py-2.5 px-3 font-mono font-black text-stone-950 dark:text-stone-100">{t.NO_DOKUMEN}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={t.JENIS_TRANSAKSI} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 font-bold text-stone-950 dark:text-stone-200">
                        {t.NAMA_ITEM || t.ID_ITEM}
                      </td>
                      <td className="py-2.5 px-3 text-stone-700 dark:text-stone-300 font-medium">{t.NAMA_MEMBER || '-'}</td>
                      <td className="py-2.5 px-3 font-mono font-black text-stone-950 dark:text-stone-100 text-right tabular-nums">
                        <div>{t.JUMLAH}</div>
                        {getAdminConsumableBadge(t.ID_ITEM, Number(t.JUMLAH || 0)) && (
                          <div className="text-[10px] font-sans font-bold text-amber-700 dark:text-amber-300">
                            {getAdminConsumableBadge(t.ID_ITEM, Number(t.JUMLAH || 0))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTxs.length > 10 && (
                <div className="pt-3 text-[11px] text-stone-600 dark:text-stone-400 font-bold text-center">
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
