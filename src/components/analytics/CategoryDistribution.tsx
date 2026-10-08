import React from 'react';
import { ItemStock } from '../../types';
import { useApp } from '../../context/AppContext';
import { PieChart, ArrowRight, Package } from 'lucide-react';

interface CategoryDistributionProps {
  stocks: ItemStock[];
}

export const CategoryDistribution: React.FC<CategoryDistributionProps> = ({ stocks }) => {
  const { navigateTo } = useApp();

  // Aggregate by category
  const categoryStats = React.useMemo(() => {
    const map = new Map<string, { count: number; totalQty: number }>();
    let totalItems = 0;
    let totalStockUnits = 0;

    stocks.forEach((item) => {
      const cat = item.kategori || 'LAINNYA';
      const qty = Number(item.stok) || 0;
      const existing = map.get(cat) || { count: 0, totalQty: 0 };
      existing.count += 1;
      existing.totalQty += qty;
      map.set(cat, existing);
      totalItems += 1;
      totalStockUnits += qty;
    });

    const categories = Array.from(map.entries()).map(([kategori, stat]) => ({
      kategori,
      skuCount: stat.count,
      totalUnits: stat.totalQty,
      percentage: totalItems > 0 ? Math.round((stat.count / totalItems) * 100) : 0,
      unitPercentage: totalStockUnits > 0 ? Math.round((stat.totalQty / totalStockUnits) * 100) : 0,
    }));

    // Sort by SKU count descending
    categories.sort((a, b) => b.skuCount - a.skuCount);

    return {
      categories,
      totalItems,
      totalStockUnits,
    };
  }, [stocks]);

  const categoryColorPalette: Record<string, { bg: string; border: string; text: string; fill: string }> = {
    PERALATAN: {
      bg: 'bg-emerald-100 dark:bg-emerald-950/60',
      border: 'border-emerald-600',
      text: 'text-emerald-950 dark:text-emerald-200',
      fill: 'bg-emerald-400',
    },
    CHEMICAL: {
      bg: 'bg-cyan-100 dark:bg-cyan-950/60',
      border: 'border-cyan-600',
      text: 'text-cyan-950 dark:text-cyan-200',
      fill: 'bg-cyan-400',
    },
    SERAGAM: {
      bg: 'bg-purple-100 dark:bg-purple-950/60',
      border: 'border-purple-600',
      text: 'text-purple-950 dark:text-purple-200',
      fill: 'bg-purple-400',
    },
    MESIN: {
      bg: 'bg-amber-100 dark:bg-amber-950/60',
      border: 'border-amber-600',
      text: 'text-amber-950 dark:text-amber-200',
      fill: 'bg-amber-400',
    },
  };

  const defaultPalette = {
    bg: 'bg-stone-100 dark:bg-stone-800',
    border: 'border-stone-500',
    text: 'text-stone-900 dark:text-stone-200',
    fill: 'bg-stone-400',
  };

  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 rounded-xl shadow-[4.5px_4.5px_0px_#18181b] p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-sm font-black text-stone-950 dark:text-stone-100 tracking-tight flex items-center gap-2">
              <PieChart className="w-4 h-4 stroke-[2.5]" />
              <span>Komposisi Kategori Inventaris</span>
            </h3>
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mt-0.5">
              Penyebaran SKU dan volume fisik barang di seluruh gudang
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono font-black text-xs px-2 py-1 bg-stone-100 dark:bg-stone-800 border-2 border-stone-900 rounded shadow-[1.5px_1.5px_0px_#18181b]">
              {categoryStats.totalStockUnits} Total Unit
            </span>
          </div>
        </div>

        {/* Stacked Composition Bar */}
        <div className="my-4">
          <div className="h-4 w-full bg-stone-100 dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-400 rounded-lg overflow-hidden flex shadow-[2px_2px_0px_#18181b]">
            {categoryStats.categories.map((cat, idx) => {
              const palette = categoryColorPalette[cat.kategori] || defaultPalette;
              return (
                <div
                  key={cat.kategori}
                  style={{ width: `${cat.percentage}%` }}
                  title={`${cat.kategori}: ${cat.skuCount} SKU (${cat.percentage}%)`}
                  className={`${palette.fill} h-full ${
                    idx < categoryStats.categories.length - 1 ? 'border-r border-stone-900' : ''
                  } transition-all duration-300`}
                />
              );
            })}
          </div>
        </div>

        {/* Detailed Category Rows */}
        <div className="space-y-2.5 my-2">
          {categoryStats.categories.map((cat) => {
            const palette = categoryColorPalette[cat.kategori] || defaultPalette;

            return (
              <div
                key={cat.kategori}
                className="p-2.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-300 dark:border-stone-700 rounded-lg flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-xs ${palette.fill} border border-stone-900 shrink-0`} />
                    <span className="font-black text-stone-950 dark:text-stone-100">{cat.kategori}</span>
                  </div>

                  <div className="flex items-center gap-3 font-mono">
                    <span className="font-bold text-stone-600 dark:text-stone-300">
                      {cat.skuCount} <span className="text-[10px] font-sans font-semibold">SKU ({cat.percentage}%)</span>
                    </span>
                    <span className="font-black text-stone-950 dark:text-stone-100 bg-white dark:bg-stone-900 px-1.5 py-0.5 rounded border border-stone-400 text-[11px]">
                      {cat.totalUnits} unit
                    </span>
                  </div>
                </div>

                {/* Progress ratio */}
                <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${cat.percentage}%` }}
                    className={`${palette.fill} h-full rounded-full`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t-2 border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
        <span className="font-semibold text-stone-500">
          Total {categoryStats.totalItems} master SKU barang
        </span>
        <button
          type="button"
          onClick={() => navigateTo('items')}
          className="font-black text-stone-950 dark:text-stone-100 hover:underline inline-flex items-center gap-1"
        >
          <span>Kelola Master Barang</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
