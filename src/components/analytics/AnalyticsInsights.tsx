import React from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, ShieldCheck } from 'lucide-react';
import { FastMovingItem } from './FastMovingList';
import { ItemStock } from '../../types';

interface AnalyticsInsightsProps {
  totalMasuk: number;
  totalKeluar: number;
  totalPinjam: number;
  totalKembali: number;
  activeLoansCount: number;
  stocks: ItemStock[];
  fastMovingItems: FastMovingItem[];
  periodLabel: string;
}

export const AnalyticsInsights: React.FC<AnalyticsInsightsProps> = ({
  totalMasuk,
  totalKeluar,
  totalPinjam,
  totalKembali,
  activeLoansCount,
  stocks,
  fastMovingItems,
  periodLabel,
}) => {
  const netInventoryChange = totalMasuk - totalKeluar;
  const isPositiveNet = netInventoryChange >= 0;

  // Check if any fast moving items have low stock
  const criticalFastMovers = fastMovingItems.filter((i) => i.isLow);

  // Return completion rate
  const returnRate =
    totalPinjam > 0
      ? Math.min(100, Math.round((totalKembali / totalPinjam) * 100))
      : 100;

  // Zero stock count
  const zeroStockCount = stocks.filter((s) => Number(s.stok) <= 0).length;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-stone-900 dark:border-stone-400 rounded-xl shadow-[4.5px_4.5px_0px_#18181b] p-4 sm:p-5">
      <div className="flex items-center justify-between pb-3 border-b-2 border-amber-200 dark:border-amber-900/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-400 text-stone-950 rounded-md border-2 border-stone-900 shadow-[1.5px_1.5px_0px_#18181b]">
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-950 dark:text-stone-100 tracking-tight">
              Ringkasan Intelijen & Insight Operasional
            </h3>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
              Evaluasi otomatis sistem untuk periode: <span className="underline font-bold">{periodLabel}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5">
        {/* Insight 1: Net Flow */}
        <div className="p-3 bg-white dark:bg-stone-900 rounded-lg border-2 border-stone-900 dark:border-stone-600 shadow-[2px_2px_0px_#18181b] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-stone-500">Net Arus Barang</span>
              {isPositiveNet ? (
                <TrendingUp className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-600 stroke-[2.5]" />
              )}
            </div>
            <div className="text-lg font-mono font-black text-stone-950 dark:text-stone-100 mt-1">
              {isPositiveNet ? `+${netInventoryChange}` : netInventoryChange}{' '}
              <span className="text-xs font-sans font-bold text-stone-500">unit net</span>
            </div>
          </div>
          <p className="text-[11px] font-medium text-stone-600 dark:text-stone-400 mt-2">
            {isPositiveNet
              ? 'Arus masuk melebihi pengeluaran, pasokan gudang bertambah aman.'
              : 'Konsumsi barang lebih tinggi daripada pasokan masuk dalam periode ini.'}
          </p>
        </div>

        {/* Insight 2: Fast Movers Warning */}
        <div className="p-3 bg-white dark:bg-stone-900 rounded-lg border-2 border-stone-900 dark:border-stone-600 shadow-[2px_2px_0px_#18181b] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-stone-500">Peringatan Fast-Moving</span>
              {criticalFastMovers.length > 0 ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 stroke-[2.5]" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              )}
            </div>
            <div className="text-lg font-mono font-black text-stone-950 dark:text-stone-100 mt-1">
              {criticalFastMovers.length}{' '}
              <span className="text-xs font-sans font-bold text-stone-500">SKU Kritis</span>
            </div>
          </div>
          <p className="text-[11px] font-medium text-stone-600 dark:text-stone-400 mt-2">
            {criticalFastMovers.length > 0
              ? `${criticalFastMovers.map((m) => m.namaItem).slice(0, 2).join(', ')} menipis padahal sering digunakan!`
              : 'Semua barang terlaris/sering dipakai berada dalam stok aman.'}
          </p>
        </div>

        {/* Insight 3: Loan Return Health */}
        <div className="p-3 bg-white dark:bg-stone-900 rounded-lg border-2 border-stone-900 dark:border-stone-600 shadow-[2px_2px_0px_#18181b] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-stone-500">Sirkulasi Pinjaman</span>
              <Clock className="w-4 h-4 text-sky-600 stroke-[2.5]" />
            </div>
            <div className="text-lg font-mono font-black text-stone-950 dark:text-stone-100 mt-1">
              {returnRate}%{' '}
              <span className="text-xs font-sans font-bold text-stone-500">
                kembali ({activeLoansCount} aktif)
              </span>
            </div>
          </div>
          <p className="text-[11px] font-medium text-stone-600 dark:text-stone-400 mt-2">
            {activeLoansCount > 0
              ? `Terdapat ${activeLoansCount} item peralatan yang saat ini masih dipinjam member.`
              : 'Semua alat pinjaman telah dikembalikan lengkap ke inventaris.'}
          </p>
        </div>
      </div>
    </div>
  );
};
