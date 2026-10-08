import React, { useState, useMemo } from 'react';
import { ItemStock, Transaksi, MasterMember, PengajuanPengambilan } from '../../types';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/StatCard';
import { TrendChart, DailyTrendPoint } from './TrendChart';
import { FastMovingList, FastMovingItem, ActiveMemberStat } from './FastMovingList';
import { CategoryDistribution } from './CategoryDistribution';
import { StockHealthMatrix } from './StockHealthMatrix';
import { AnalyticsInsights } from './AnalyticsInsights';
import {
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Boxes,
  Printer,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

export type AnalyticsTimeRange = '7D' | '30D' | 'THIS_MONTH' | 'ALL';

interface AnalyticsDashboardProps {
  stocks: ItemStock[];
  transactions: Transaksi[];
  members: MasterMember[];
  requests: PengajuanPengambilan[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  stocks,
  transactions,
  members,
  requests,
}) => {
  const { navigateTo, triggerRefresh } = useApp();
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30D');

  // Compute cutoff date for filtering
  const { filteredTransactions, periodLabel, daysCount } = useMemo(() => {
    const now = new Date();

    if (timeRange === '7D') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      return {
        filteredTransactions: transactions.filter((t) => {
          const d = (t.TANGGAL || t.TIMESTAMP || '').slice(0, 10);
          return d >= cutoffStr;
        }),
        periodLabel: '7 Hari Terakhir',
        daysCount: 7,
      };
    }

    if (timeRange === '30D') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      return {
        filteredTransactions: transactions.filter((t) => {
          const d = (t.TANGGAL || t.TIMESTAMP || '').slice(0, 10);
          return d >= cutoffStr;
        }),
        periodLabel: '30 Hari Terakhir',
        daysCount: 30,
      };
    }

    if (timeRange === 'THIS_MONTH') {
      const currentMonthPrefix = now.toISOString().slice(0, 7); // YYYY-MM
      return {
        filteredTransactions: transactions.filter((t) => {
          const d = (t.TANGGAL || t.TIMESTAMP || '').slice(0, 7);
          return d === currentMonthPrefix;
        }),
        periodLabel: `Bulan Ini (${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})`,
        daysCount: now.getDate(),
      };
    }

    // ALL
    return {
      filteredTransactions: transactions,
      periodLabel: 'Semua Waktu',
      daysCount: 60,
    };
  }, [transactions, timeRange]);

  // Aggregate KPI metrics
  const { totalMasuk, totalKeluar, totalPinjam, totalKembali } = useMemo(() => {
    let masuk = 0;
    let keluar = 0;
    let pinjam = 0;
    let kembali = 0;

    filteredTransactions.forEach((tx) => {
      const qty = Number(tx.JUMLAH) || 0;
      if (tx.JENIS_TRANSAKSI === 'BARANG_MASUK') masuk += qty;
      else if (tx.JENIS_TRANSAKSI === 'BARANG_KELUAR') keluar += qty;
      else if (tx.JENIS_TRANSAKSI === 'PINJAM') pinjam += qty;
      else if (tx.JENIS_TRANSAKSI === 'KEMBALI') kembali += qty;
    });

    return { totalMasuk: masuk, totalKeluar: keluar, totalPinjam: pinjam, totalKembali: kembali };
  }, [filteredTransactions]);

  // Outstanding active loans
  const activeLoansCount = useMemo(() => {
    return Math.max(0, totalPinjam - totalKembali);
  }, [totalPinjam, totalKembali]);

  // Generate Daily Trend Points
  const trendData = useMemo(() => {
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const numDays = Math.min(daysCount, 30);
    const map = new Map<string, DailyTrendPoint>();
    const now = new Date();

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayName = dayNames[d.getDay()];
      const label = `${String(d.getDate()).padStart(2, '0')} ${monthNames[d.getMonth()]}`;

      map.set(dateKey, {
        dateKey,
        label,
        dayName,
        masuk: 0,
        keluar: 0,
        pinjam: 0,
        kembali: 0,
      });
    }

    filteredTransactions.forEach((tx) => {
      const dateKey = (tx.TANGGAL || tx.TIMESTAMP || '').slice(0, 10);
      const point = map.get(dateKey);
      if (point) {
        const qty = Number(tx.JUMLAH) || 0;
        if (tx.JENIS_TRANSAKSI === 'BARANG_MASUK') point.masuk += qty;
        else if (tx.JENIS_TRANSAKSI === 'BARANG_KELUAR') point.keluar += qty;
        else if (tx.JENIS_TRANSAKSI === 'PINJAM') point.pinjam += qty;
        else if (tx.JENIS_TRANSAKSI === 'KEMBALI') point.kembali += qty;
      }
    });

    return Array.from(map.values());
  }, [filteredTransactions, daysCount]);

  // Fast Moving Items (Barang Keluar)
  const fastMovingItems = useMemo(() => {
    const stockMap = new Map(stocks.map((s) => [s.idItem, s]));
    const itemMap = new Map<string, { totalKeluar: number; txCount: number; name: string; category: string }>();

    filteredTransactions
      .filter((t) => t.JENIS_TRANSAKSI === 'BARANG_KELUAR')
      .forEach((tx) => {
        const id = tx.ID_ITEM;
        if (!id) return;
        const existing = itemMap.get(id) || {
          totalKeluar: 0,
          txCount: 0,
          name: tx.NAMA_ITEM || id,
          category: '',
        };
        existing.totalKeluar += Number(tx.JUMLAH) || 0;
        existing.txCount += 1;
        if (tx.NAMA_ITEM) existing.name = tx.NAMA_ITEM;
        itemMap.set(id, existing);
      });

    const list: FastMovingItem[] = Array.from(itemMap.entries()).map(([idItem, val]) => {
      const s = stockMap.get(idItem);
      return {
        idItem,
        namaItem: s?.namaItem || val.name,
        kategori: s?.kategori || 'PERALATAN',
        totalKeluar: val.totalKeluar,
        txCount: val.txCount,
        currentStock: s?.stok || 0,
        minStock: s?.minStok || 0,
        satuan: s?.satuan || 'unit',
        isLow: s ? Boolean(s.isLowStock) : false,
      };
    });

    list.sort((a, b) => b.totalKeluar - a.totalKeluar);
    return list.slice(0, 5);
  }, [filteredTransactions, stocks]);

  // Top Active Members
  const activeMembers = useMemo(() => {
    const memberMap = new Map(members.map((m) => [m.ID_MEMBER, m]));
    const countMap = new Map<string, { totalTx: number; totalUnits: number; name: string }>();

    filteredTransactions.forEach((tx) => {
      const id = tx.ID_MEMBER;
      if (!id) return;
      const existing = countMap.get(id) || {
        totalTx: 0,
        totalUnits: 0,
        name: tx.NAMA_MEMBER || id,
      };
      existing.totalTx += 1;
      existing.totalUnits += Number(tx.JUMLAH) || 0;
      if (tx.NAMA_MEMBER) existing.name = tx.NAMA_MEMBER;
      countMap.set(id, existing);
    });

    const list: ActiveMemberStat[] = Array.from(countMap.entries()).map(([idMember, val]) => {
      const m = memberMap.get(idMember);
      return {
        idMember,
        namaMember: m?.NAMA_MEMBER || val.name,
        jabatan: m?.JABATAN || '',
        lantai: m?.LANTAI || '',
        totalTx: val.totalTx,
        totalUnits: val.totalUnits,
      };
    });

    list.sort((a, b) => b.totalTx - a.totalTx);
    return list.slice(0, 5);
  }, [filteredTransactions, members]);

  return (
    <div className="space-y-6">
      {/* Controls Bar: Time Range Selector & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 rounded-xl shadow-[3px_3px_0px_#18181b]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-stone-900 dark:text-stone-100 stroke-[2.5]" />
          <span className="text-xs font-black text-stone-900 dark:text-stone-100">
            Rentang Waktu:
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTimeRange('7D')}
              className={`px-2.5 py-1 text-xs font-black rounded border-2 border-stone-900 transition-all ${
                timeRange === '7D'
                  ? 'bg-amber-300 text-stone-950 shadow-[2px_2px_0px_#18181b]'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-400'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30D')}
              className={`px-2.5 py-1 text-xs font-black rounded border-2 border-stone-900 transition-all ${
                timeRange === '30D'
                  ? 'bg-amber-300 text-stone-950 shadow-[2px_2px_0px_#18181b]'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-400'
              }`}
            >
              30 Hari
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('THIS_MONTH')}
              className={`px-2.5 py-1 text-xs font-black rounded border-2 border-stone-900 transition-all ${
                timeRange === 'THIS_MONTH'
                  ? 'bg-amber-300 text-stone-950 shadow-[2px_2px_0px_#18181b]'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-400'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('ALL')}
              className={`px-2.5 py-1 text-xs font-black rounded border-2 border-stone-900 transition-all ${
                timeRange === 'ALL'
                  ? 'bg-amber-300 text-stone-950 shadow-[2px_2px_0px_#18181b]'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-400'
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={triggerRefresh}
            className="p-1.5 text-stone-950 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 border-2 border-stone-900 dark:border-stone-400 rounded-lg shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            title="Muat ulang data terkini"
          >
            <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-stone-950 bg-stone-100 dark:bg-stone-800 dark:text-stone-100 hover:bg-stone-200 border-2 border-stone-900 dark:border-stone-400 rounded-lg shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Cetak Analitik</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
        <StatCard
          label={`Barang Masuk (${periodLabel})`}
          value={totalMasuk}
          unit="unit"
          subtitle="Total penerimaan pasokan"
          icon={ArrowDownLeft}
          variant="success"
          onClick={() => navigateTo('masuk')}
        />
        <StatCard
          label={`Barang Keluar (${periodLabel})`}
          value={totalKeluar}
          unit="unit"
          subtitle="Pemakaian & distribusi"
          icon={ArrowUpRight}
          variant="warning"
          onClick={() => navigateTo('keluar')}
        />
        <StatCard
          label="Peralatan Sedang Dipinjam"
          value={activeLoansCount}
          unit="unit aktif"
          subtitle={activeLoansCount > 0 ? `${totalKembali} unit sudah kembali` : 'Semua sudah kembali'}
          icon={RotateCcw}
          variant={activeLoansCount > 0 ? 'purple' : 'default'}
          onClick={() => navigateTo('kembali')}
        />
        <StatCard
          label="Total Mutasi Terdata"
          value={filteredTransactions.length}
          unit="transaksi"
          subtitle="Aktivitas logistik terekam"
          icon={TrendingUp}
          variant="cyan"
          onClick={() => navigateTo('laporan')}
        />
      </div>

      {/* Main Trend Chart */}
      <TrendChart
        data={trendData}
        title={`Tren Mutasi Harian (${periodLabel})`}
        subtitle="Analisis dinamika volume barang masuk, keluar, dan peminjaman per hari"
      />

      {/* Secondary Analytics Row: Fast Moving & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FastMovingList
          fastMovingItems={fastMovingItems}
          activeMembers={activeMembers}
        />
        <CategoryDistribution stocks={stocks} />
      </div>

      {/* Third Row: Stock Health Matrix */}
      <StockHealthMatrix stocks={stocks} />

      {/* Smart Intelligence Insights */}
      <AnalyticsInsights
        totalMasuk={totalMasuk}
        totalKeluar={totalKeluar}
        totalPinjam={totalPinjam}
        totalKembali={totalKembali}
        activeLoansCount={activeLoansCount}
        stocks={stocks}
        fastMovingItems={fastMovingItems}
        periodLabel={periodLabel}
      />
    </div>
  );
};
