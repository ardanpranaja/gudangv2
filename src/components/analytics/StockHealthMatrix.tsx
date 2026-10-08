import React, { useState } from 'react';
import { ItemStock } from '../../types';
import { useApp } from '../../context/AppContext';
import { AlertCircle, AlertTriangle, CheckCircle2, Layers, ArrowRight, X } from 'lucide-react';

interface StockHealthMatrixProps {
  stocks: ItemStock[];
}

export const StockHealthMatrix: React.FC<StockHealthMatrixProps> = ({ stocks }) => {
  const { navigateTo } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ZERO' | 'LOW' | 'OPTIMAL' | 'SURPLUS'>('LOW');

  const zeroStockItems = stocks.filter((s) => Number(s.stok) <= 0);
  const lowStockItems = stocks.filter((s) => Number(s.stok) > 0 && Number(s.stok) <= Number(s.minStok));
  const optimalItems = stocks.filter(
    (s) => Number(s.stok) > Number(s.minStok) && Number(s.stok) <= Number(s.minStok) * 3
  );
  const surplusItems = stocks.filter((s) => Number(s.stok) > Number(s.minStok) * 3);

  const total = stocks.length || 1;
  const zeroPct = Math.round((zeroStockItems.length / total) * 100);
  const lowPct = Math.round((lowStockItems.length / total) * 100);
  const optimalPct = Math.round((optimalItems.length / total) * 100);
  const surplusPct = Math.max(0, 100 - zeroPct - lowPct - optimalPct);

  // Active list based on selection
  let activeList: ItemStock[] = [];
  let filterTitle = '';
  let badgeColor = '';

  if (selectedFilter === 'ZERO') {
    activeList = zeroStockItems;
    filterTitle = 'Barang Habis (0 Unit)';
    badgeColor = 'bg-rose-500 text-white';
  } else if (selectedFilter === 'LOW') {
    activeList = lowStockItems;
    filterTitle = 'Barang Kritis / Menipis';
    badgeColor = 'bg-amber-400 text-stone-950';
  } else if (selectedFilter === 'OPTIMAL') {
    activeList = optimalItems;
    filterTitle = 'Barang Stok Optimal';
    badgeColor = 'bg-emerald-400 text-stone-950';
  } else if (selectedFilter === 'SURPLUS') {
    activeList = surplusItems;
    filterTitle = 'Barang Stok Berlebih';
    badgeColor = 'bg-sky-400 text-stone-950';
  } else {
    activeList = stocks;
    filterTitle = 'Semua Master Barang';
    badgeColor = 'bg-stone-800 text-white';
  }

  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 rounded-xl shadow-[4.5px_4.5px_0px_#18181b] p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-sm font-black text-stone-950 dark:text-stone-100 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 stroke-[2.5]" />
              <span>Matriks Kesehatan Inventaris</span>
            </h3>
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mt-0.5">
              Klasifikasi kesiapan stok fisik berdasarkan ambang batas minimum
            </p>
          </div>
          <button
            onClick={() => navigateTo('stok')}
            className="px-2.5 py-1 text-xs font-black text-stone-950 bg-amber-300 hover:bg-amber-400 border-2 border-stone-900 rounded shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all inline-flex items-center gap-1 shrink-0"
          >
            <span>Semua Stok</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Visual Stacked Progress Bar */}
        <div className="my-4">
          <div className="h-4 w-full bg-stone-100 dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-400 rounded-lg overflow-hidden flex shadow-[2px_2px_0px_#18181b]">
            <div
              style={{ width: `${zeroPct}%` }}
              title={`Habis: ${zeroStockItems.length} SKU (${zeroPct}%)`}
              className="bg-rose-500 h-full border-r border-stone-900 transition-all duration-300"
            />
            <div
              style={{ width: `${lowPct}%` }}
              title={`Menipis: ${lowStockItems.length} SKU (${lowPct}%)`}
              className="bg-amber-400 h-full border-r border-stone-900 transition-all duration-300"
            />
            <div
              style={{ width: `${optimalPct}%` }}
              title={`Optimal: ${optimalItems.length} SKU (${optimalPct}%)`}
              className="bg-emerald-400 h-full border-r border-stone-900 transition-all duration-300"
            />
            <div
              style={{ width: `${surplusPct}%` }}
              title={`Berlebih: ${surplusItems.length} SKU (${surplusPct}%)`}
              className="bg-sky-400 h-full transition-all duration-300"
            />
          </div>
        </div>

        {/* 4 Interactive Category Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
          {/* 1. Habis */}
          <button
            type="button"
            onClick={() => setSelectedFilter('ZERO')}
            className={`p-2.5 rounded-lg border-2 text-left transition-all ${
              selectedFilter === 'ZERO'
                ? 'border-stone-900 bg-rose-200 dark:bg-rose-900/60 shadow-[3px_3px_0px_#18181b]'
                : 'border-stone-300 dark:border-stone-700 bg-rose-50/50 dark:bg-rose-950/20 hover:border-stone-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-rose-900 dark:text-rose-300">Habis (0)</span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
            </div>
            <div className="text-lg font-black font-mono text-rose-950 dark:text-rose-100 mt-1">
              {zeroStockItems.length}{' '}
              <span className="text-[10px] font-bold text-stone-600 dark:text-stone-400">SKU</span>
            </div>
            <div className="text-[10px] font-bold text-rose-800 dark:text-rose-400 font-mono mt-0.5">
              {zeroPct}% total
            </div>
          </button>

          {/* 2. Menipis */}
          <button
            type="button"
            onClick={() => setSelectedFilter('LOW')}
            className={`p-2.5 rounded-lg border-2 text-left transition-all ${
              selectedFilter === 'LOW'
                ? 'border-stone-900 bg-amber-200 dark:bg-amber-900/60 shadow-[3px_3px_0px_#18181b]'
                : 'border-stone-300 dark:border-stone-700 bg-amber-50/50 dark:bg-amber-950/20 hover:border-stone-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-300">Menipis</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
            </div>
            <div className="text-lg font-black font-mono text-amber-950 dark:text-amber-100 mt-1">
              {lowStockItems.length}{' '}
              <span className="text-[10px] font-bold text-stone-600 dark:text-stone-400">SKU</span>
            </div>
            <div className="text-[10px] font-bold text-amber-800 dark:text-amber-400 font-mono mt-0.5">
              {lowPct}% total
            </div>
          </button>

          {/* 3. Optimal */}
          <button
            type="button"
            onClick={() => setSelectedFilter('OPTIMAL')}
            className={`p-2.5 rounded-lg border-2 text-left transition-all ${
              selectedFilter === 'OPTIMAL'
                ? 'border-stone-900 bg-emerald-200 dark:bg-emerald-900/60 shadow-[3px_3px_0px_#18181b]'
                : 'border-stone-300 dark:border-stone-700 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-stone-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-emerald-900 dark:text-emerald-300">Optimal</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            </div>
            <div className="text-lg font-black font-mono text-emerald-950 dark:text-emerald-100 mt-1">
              {optimalItems.length}{' '}
              <span className="text-[10px] font-bold text-stone-600 dark:text-stone-400">SKU</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 font-mono mt-0.5">
              {optimalPct}% total
            </div>
          </button>

          {/* 4. Berlebih */}
          <button
            type="button"
            onClick={() => setSelectedFilter('SURPLUS')}
            className={`p-2.5 rounded-lg border-2 text-left transition-all ${
              selectedFilter === 'SURPLUS'
                ? 'border-stone-900 bg-sky-200 dark:bg-sky-900/60 shadow-[3px_3px_0px_#18181b]'
                : 'border-stone-300 dark:border-stone-700 bg-sky-50/50 dark:bg-sky-950/20 hover:border-stone-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-sky-900 dark:text-sky-300">Berlebih</span>
              <Layers className="w-3.5 h-3.5 text-sky-600 stroke-[2.5]" />
            </div>
            <div className="text-lg font-black font-mono text-sky-950 dark:text-sky-100 mt-1">
              {surplusItems.length}{' '}
              <span className="text-[10px] font-bold text-stone-600 dark:text-stone-400">SKU</span>
            </div>
            <div className="text-[10px] font-bold text-sky-800 dark:text-sky-400 font-mono mt-0.5">
              {surplusPct}% total
            </div>
          </button>
        </div>

        {/* Selected List Breakdown */}
        <div className="mt-3 pt-3 border-t-2 border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-stone-950 dark:text-stone-100 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${badgeColor.split(' ')[0]}`} />
              <span>Daftar {filterTitle}</span>
              <span className="text-[10px] font-mono text-stone-500 font-bold">({activeList.length})</span>
            </span>
            {selectedFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedFilter('ALL')}
                className="text-[11px] font-bold text-stone-500 hover:text-stone-950 dark:hover:text-stone-200 underline inline-flex items-center gap-1"
              >
                Tampilkan Semua
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {activeList.length === 0 ? (
              <div className="text-xs font-bold text-stone-500 dark:text-stone-400 py-4 text-center border border-dashed border-stone-300 dark:border-stone-700 rounded">
                Tidak ada barang dalam kategori ini.
              </div>
            ) : (
              activeList.slice(0, 6).map((item) => (
                <div
                  key={item.idItem}
                  className="p-2 bg-stone-50 dark:bg-stone-800/60 border border-stone-300 dark:border-stone-700 rounded-lg flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-black text-stone-950 dark:text-stone-100 truncate">
                      {item.namaItem}
                    </div>
                    <div className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                      {item.kategori} · Lokasi: {item.lokasi || '-'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-black px-2 py-0.5 rounded border border-stone-900 dark:border-stone-500 bg-white dark:bg-stone-900 text-stone-950 dark:text-stone-100 text-[11px]">
                      {item.stok} / {item.minStok} {item.satuan}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigateTo('bincard', { itemId: item.idItem })}
                      className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300"
                      title="Lihat Bin Card"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
