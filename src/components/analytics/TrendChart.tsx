import React, { useState, useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight, RotateCcw } from 'lucide-react';

export interface DailyTrendPoint {
  dateKey: string;      // YYYY-MM-DD
  label: string;        // e.g. "02 Okt"
  dayName: string;      // e.g. "Sen"
  masuk: number;
  keluar: number;
  pinjam: number;
  kembali: number;
}

interface TrendChartProps {
  data: DailyTrendPoint[];
  title?: string;
  subtitle?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title = 'Tren Mutasi Fisik Harian',
  subtitle = 'Perbandingan volume barang masuk, barang keluar, dan peminjaman',
}) => {
  const [showMasuk, setShowMasuk] = useState(true);
  const [showKeluar, setShowKeluar] = useState(true);
  const [showPinjam, setShowPinjam] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate maximum value for chart scaling
  const maxValue = useMemo(() => {
    let max = 0;
    data.forEach((d) => {
      if (showMasuk) max = Math.max(max, d.masuk);
      if (showKeluar) max = Math.max(max, d.keluar);
      if (showPinjam) max = Math.max(max, d.pinjam);
    });
    // Add headroom and nice round number
    if (max === 0) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const rounded = Math.ceil((max * 1.15) / magnitude) * magnitude;
    return Math.max(rounded, 10);
  }, [data, showMasuk, showKeluar, showPinjam]);

  const chartHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Generate 4-5 Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks = [0];
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      ticks.push(Math.round((maxValue / steps) * i));
    }
    return ticks;
  }, [maxValue]);

  const activeHoverData = hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : null;

  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 rounded-xl shadow-[4.5px_4.5px_0px_#18181b] p-4 sm:p-5 flex flex-col justify-between">
      {/* Header & Metric Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-stone-100 dark:border-stone-800">
        <div>
          <h3 className="text-sm font-black text-stone-950 dark:text-stone-100 tracking-tight flex items-center gap-2">
            <span>{title}</span>
          </h3>
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Filter Chips / Legend */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMasuk(!showMasuk)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black rounded border-2 border-stone-900 transition-all ${
              showMasuk
                ? 'bg-emerald-300 text-stone-950 shadow-[2px_2px_0px_#18181b]'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border-stone-300 dark:border-stone-700 opacity-60'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Masuk</span>
          </button>

          <button
            type="button"
            onClick={() => setShowKeluar(!showKeluar)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black rounded border-2 border-stone-900 transition-all ${
              showKeluar
                ? 'bg-amber-300 text-stone-950 shadow-[2px_2px_0px_#18181b]'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border-stone-300 dark:border-stone-700 opacity-60'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Keluar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPinjam(!showPinjam)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black rounded border-2 border-stone-900 transition-all ${
              showPinjam
                ? 'bg-sky-300 text-stone-950 shadow-[2px_2px_0px_#18181b]'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border-stone-300 dark:border-stone-700 opacity-60'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Pinjam</span>
          </button>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative pt-4 overflow-x-auto select-none">
        {data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs font-bold text-stone-500 dark:text-stone-400 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg">
            Tidak ada transaksi dalam rentang waktu yang dipilih
          </div>
        ) : (
          <div className="min-w-[500px]">
            <svg
              viewBox={`0 0 ${Math.max(560, data.length * 48 + paddingLeft + paddingRight)} ${chartHeight}`}
              className="w-full h-auto overflow-visible"
              style={{ maxHeight: '260px' }}
            >
              {/* Grid Lines & Y Axis Labels */}
              {yTicks.map((tick, i) => {
                const y = paddingTop + graphHeight - (tick / maxValue) * graphHeight;
                return (
                  <g key={`ytick-${i}`}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2="100%"
                      y2={y}
                      stroke="currentColor"
                      strokeDasharray="3 3"
                      className="text-stone-200 dark:text-stone-800"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[10px] font-mono font-bold fill-stone-400 dark:fill-stone-500"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Baseline */}
              <line
                x1={paddingLeft}
                y1={paddingTop + graphHeight}
                x2="100%"
                y2={paddingTop + graphHeight}
                stroke="currentColor"
                strokeWidth="2"
                className="text-stone-900 dark:text-stone-400"
              />

              {/* Data Bars / Columns */}
              {data.map((d, idx) => {
                const totalPoints = data.length;
                const availableWidth = 560 - paddingLeft - paddingRight;
                const columnWidth = Math.max(availableWidth / totalPoints, 44);
                const xCenter = paddingLeft + idx * columnWidth + columnWidth / 2;

                // Active bar counts
                const activeMetrics = [showMasuk, showKeluar, showPinjam].filter(Boolean).length;
                const barWidth = Math.max(6, Math.min(14, (columnWidth - 12) / (activeMetrics || 1)));

                let barOffset = -((activeMetrics * barWidth) / 2) + barWidth / 2;

                const isHovered = hoveredIndex === idx;

                return (
                  <g
                    key={`point-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Hover column background highlight */}
                    <rect
                      x={xCenter - columnWidth / 2 + 2}
                      y={paddingTop}
                      width={columnWidth - 4}
                      height={graphHeight + paddingBottom - 10}
                      fill={isHovered ? 'currentColor' : 'transparent'}
                      className="text-amber-100/40 dark:text-amber-950/20 rounded transition-colors"
                      rx="4"
                    />

                    {/* Masuk Bar */}
                    {showMasuk && (
                      <rect
                        x={xCenter + barOffset - barWidth / 2}
                        y={paddingTop + graphHeight - (d.masuk / maxValue) * graphHeight}
                        width={barWidth}
                        height={Math.max(2, (d.masuk / maxValue) * graphHeight)}
                        fill="#6ee7b7" /* emerald-300 */
                        stroke="#18181b"
                        strokeWidth="1.5"
                        rx="1"
                        className="transition-all"
                      />
                    )}

                    {/* Keluar Bar */}
                    {showKeluar && (
                      <rect
                        x={
                          xCenter +
                          (showMasuk ? (barOffset += barWidth) : barOffset) -
                          barWidth / 2
                        }
                        y={paddingTop + graphHeight - (d.keluar / maxValue) * graphHeight}
                        width={barWidth}
                        height={Math.max(2, (d.keluar / maxValue) * graphHeight)}
                        fill="#fcd34d" /* amber-300 */
                        stroke="#18181b"
                        strokeWidth="1.5"
                        rx="1"
                        className="transition-all"
                      />
                    )}

                    {/* Pinjam Bar */}
                    {showPinjam && (
                      <rect
                        x={
                          xCenter +
                          (showKeluar ? (barOffset += barWidth) : barOffset) -
                          barWidth / 2
                        }
                        y={paddingTop + graphHeight - (d.pinjam / maxValue) * graphHeight}
                        width={barWidth}
                        height={Math.max(2, (d.pinjam / maxValue) * graphHeight)}
                        fill="#7dd3fc" /* sky-300 */
                        stroke="#18181b"
                        strokeWidth="1.5"
                        rx="1"
                        className="transition-all"
                      />
                    )}

                    {/* X-axis date labels */}
                    <text
                      x={xCenter}
                      y={chartHeight - 18}
                      textAnchor="middle"
                      className={`text-[10px] font-mono font-bold ${
                        isHovered
                          ? 'fill-stone-950 dark:fill-stone-100 font-black'
                          : 'fill-stone-600 dark:fill-stone-400'
                      }`}
                    >
                      {d.label}
                    </text>
                    <text
                      x={xCenter}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-stone-400 dark:fill-stone-500 uppercase"
                    >
                      {d.dayName}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Hover Details Floating Banner */}
        {activeHoverData && (
          <div className="mt-3 p-3 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-950 rounded-lg border-2 border-stone-900 dark:border-stone-400 shadow-[3px_3px_0px_#18181b] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="font-bold flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-400 text-stone-950 rounded font-black text-[11px]">
                {activeHoverData.dayName}, {activeHoverData.dateKey}
              </span>
              <span>Ringkasan Harian:</span>
            </div>
            <div className="flex items-center gap-4 font-mono font-bold text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 dark:text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-300 border border-stone-950 inline-block" />
                Masuk: <strong>{activeHoverData.masuk} unit</strong>
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 dark:text-amber-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-300 border border-stone-950 inline-block" />
                Keluar: <strong>{activeHoverData.keluar} unit</strong>
              </span>
              <span className="flex items-center gap-1.5 text-sky-400 dark:text-sky-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-300 border border-stone-950 inline-block" />
                Pinjam: <strong>{activeHoverData.pinjam} unit</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
