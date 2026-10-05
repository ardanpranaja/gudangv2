import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { SearchableSelect, SearchableSelectOption } from '../components/common/SearchableSelect';
import { useApp } from '../context/AppContext';
import { api, normalizeGasErrorMessage } from '../services/api';
import { ItemStock } from '../types';
import {
  ScrollText,
  AlertTriangle,
  ArrowRight,
  Info,
  SlidersHorizontal,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const StokPage: React.FC = () => {
  const { navigateTo, refreshKey, role, addToast } = useApp();
  const isAdmin = role === 'ADMIN';

  const [stocks, setStocks] = useState<ItemStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'ALL' | 'LOW' | 'AVAILABLE'>('ALL');

  // Penyesuaian Stok State (Khusus Admin)
  const [adjustItemId, setAdjustItemId] = useState<string>('');
  const [adjustDelta, setAdjustDelta] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState<boolean>(false);

  const loadStock = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await api.getStock();
      setStocks(data);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Gagal memuat saldo stok dari backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [refreshKey]);

  const selectedAdjustStock = useMemo(() => {
    return stocks.find((s) => s.idItem === adjustItemId) || null;
  }, [stocks, adjustItemId]);

  const stockOptions: SearchableSelectOption[] = useMemo(() => {
    return stocks.map((s) => ({
      value: s.idItem,
      label: s.namaItem,
      sublabel: `Stok: ${s.stok} ${s.satuan}`,
      badge: s.kategori,
      badgeColor: s.stok <= 0 ? 'rose' : s.isLowStock ? 'amber' : 'emerald',
      extra: `${s.namaItem} ${s.idItem} ${s.kategori} ${s.lokasi || ''}`,
    }));
  }, [stocks]);

  // Parse delta
  const parsedDelta = parseFloat(adjustDelta.replace(',', '.'));
  const isValidDelta = !isNaN(parsedDelta) && parsedDelta !== 0;
  const afterStock = selectedAdjustStock && isValidDelta ? selectedAdjustStock.stok + parsedDelta : null;

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjustStock) {
      addToast('warning', 'Pilih Barang', 'Silakan pilih barang yang akan disesuaikan.');
      return;
    }
    if (!isValidDelta) {
      addToast('warning', 'Selisih Tidak Valid', 'Selisih stok harus berupa angka bukan nol (contoh: +5 atau -3).');
      return;
    }
    if (!adjustReason.trim()) {
      addToast('warning', 'Alasan Kosong', 'Alasan penyesuaian stok wajib diisi.');
      return;
    }

    if (afterStock !== null && afterStock < 0) {
      const confirmed = window.confirm(
        `PERINGATAN: Hasil stok sesudah penyesuaian akan bernilai minus (${afterStock} ${selectedAdjustStock.satuan}). Yakin ingin tetap mencatat penyesuaian ini?`
      );
      if (!confirmed) return;
    }

    setIsSubmittingAdjust(true);
    try {
      const res = await api.submitTransaction({
        itemId: selectedAdjustStock.idItem,
        type: 'PENYESUAIAN',
        jumlah: parsedDelta,
        keterangan: adjustReason.trim(),
      });

      addToast(
        'success',
        'Penyesuaian Berhasil Dicatat',
        res?.message ||
          `Penyesuaian ${selectedAdjustStock.namaItem} sebesar ${parsedDelta > 0 ? `+${parsedDelta}` : parsedDelta} ${selectedAdjustStock.satuan} berhasil beraudit.`
      );

      setAdjustItemId('');
      setAdjustDelta('');
      setAdjustReason('');
      await loadStock();
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Gagal mencatat transaksi penyesuaian.');
      addToast('error', 'Gagal Penyesuaian', msg);
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const filteredStocks = stocks.filter((item) => {
    if (selectedKategori !== 'ALL' && item.kategori !== selectedKategori) return false;
    if (selectedStockFilter === 'LOW' && !item.isLowStock) return false;
    if (selectedStockFilter === 'AVAILABLE' && item.stok <= 0) return false;
    return true;
  });

  const lowStockCount = stocks.filter((s) => s.isLowStock).length;

  const columns: Column<ItemStock>[] = [
    {
      key: 'idItem',
      header: 'ID Barang',
      sortable: true,
      className: 'font-mono text-stone-800 dark:text-stone-200 font-semibold',
    },
    {
      key: 'namaItem',
      header: 'Nama Barang',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-stone-900 dark:text-stone-100">{item.namaItem}</div>
          <div className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">Lokasi: {item.lokasi || '-'}</div>
        </div>
      ),
    },
    {
      key: 'kategori',
      header: 'Kategori',
      sortable: true,
      render: (item) => <span className="font-medium text-stone-700 dark:text-stone-200">{item.kategori}</span>,
    },
    {
      key: 'stok',
      header: 'Saldo Stok Tersedia',
      sortable: true,
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5 font-mono">
          {item.isLowStock && (
            <span title="Stok di bawah minimum">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            </span>
          )}
          <span
            className={`font-bold tabular-nums text-sm ${
              item.stok <= 0
                ? 'text-rose-600'
                : item.isLowStock
                ? 'text-amber-700'
                : 'text-stone-900 dark:text-stone-100'
            }`}
          >
            {item.stok}
          </span>
          <span className="text-[11px] text-stone-500 dark:text-stone-400 font-normal">{item.satuan}</span>
        </div>
      ),
    },
    {
      key: 'minStok',
      header: 'Min. Stok',
      sortable: true,
      align: 'right',
      render: (item) => (
        <span className="font-mono text-stone-600 dark:text-stone-400 tabular-nums">
          {item.minStok} {item.satuan}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <StatusBadge status={item.status} size="sm" />
          {item.isLowStock && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 rounded">
              Menipis
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'AKSI',
      header: 'Kartu Stok',
      align: 'center',
      render: (item) => (
        <button
          onClick={() => navigateTo('bincard', { itemId: item.idItem })}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded hover:bg-stone-50 hover:text-stone-900 transition-colors"
          title="Buka Bin Card untuk meninjau riwayat mutasi barang ini"
        >
          <ScrollText className="w-3.5 h-3.5" />
          <span>Bin Card</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring Stok Fisik Gudang"
        description="Satu-satunya halaman utama posisi saldo stok. Nilai stok diperoleh langsung dari GET action=stock backend Google Apps Script."
        actions={
          lowStockCount > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{lowStockCount} barang</strong> berada di bawah batas minimum stok.
              </span>
            </div>
          ) : null
        }
      />

      <div className="p-3.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-600 dark:text-stone-400 flex items-center gap-2">
        <Info className="w-4 h-4 text-stone-500 dark:text-stone-400 shrink-0" />
        <span>
          Nilai saldo stok dihitung dan divalidasi oleh backend GAS dari seluruh transaksi sah di Spreadsheet.
        </span>
      </div>

      {/* SECTION PENYESUAIAN STOK (KHUSUS ADMIN) */}
      {isAdmin && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-700 text-white flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Penyesuaian Stok (Koreksi Opname &amp; Fisik)
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Koreksi saldo stok beraudit ke lembar transaksi dengan jenis PENYESUAIAN (Backend v16)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-[11px] font-semibold">
                Khusus Admin
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                Dokumen PN-
              </span>
            </div>
          </div>

          <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block font-semibold text-stone-700 dark:text-stone-200">
                Pilih Barang yang Akan Disesuaikan <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={adjustItemId}
                onChange={(val) => {
                  setAdjustItemId(val);
                  setAdjustDelta('');
                }}
                options={stockOptions}
                placeholder="Pilih atau cari barang..."
                searchPlaceholder="Ketik nama, ID, kategori, atau lokasi barang..."
              />
            </div>

            {selectedAdjustStock && (
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  {/* Stok Saat Ini */}
                  <div className="p-3 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700">
                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Stok Saat Ini:</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100 tabular-nums">
                        {selectedAdjustStock.stok}
                      </span>
                      <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                        {selectedAdjustStock.satuan}
                      </span>
                    </div>
                  </div>

                  {/* Input Selisih */}
                  <div className="space-y-1">
                    <label className="block font-semibold text-stone-700 dark:text-stone-200">
                      Selisih (+ / -) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={adjustDelta}
                      onChange={(e) => setAdjustDelta(e.target.value)}
                      placeholder="Contoh: +5 atau -3"
                      className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg focus:ring-1 focus:ring-amber-700 text-stone-900 dark:text-stone-100 font-mono text-sm bg-white dark:bg-stone-900 font-semibold"
                      required
                    />
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 block">
                      Tanda minus (-) mengurangi stok, tanda plus (+) menambah.
                    </span>
                  </div>

                  {/* Preview Live Stok Sesudah */}
                  <div
                    className={`p-3 rounded-lg border transition-colors ${
                      afterStock === null
                        ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700'
                        : afterStock >= 0
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}
                  >
                    <span className="text-[11px] font-medium block opacity-75">
                      Preview Stok Sesudah:
                    </span>
                    {afterStock !== null ? (
                      <div>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-2xl font-bold font-mono tabular-nums">
                            {afterStock}
                          </span>
                          <span className="text-xs font-semibold">
                            {selectedAdjustStock.satuan}
                          </span>
                        </div>
                        {afterStock < 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-rose-700 font-semibold mt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Peringatan: Stok akhir negatif</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-stone-400 dark:text-stone-500 italic mt-1.5">
                        Masukkan selisih di samping
                      </div>
                    )}
                  </div>
                </div>

                {/* Input Alasan */}
                <div className="space-y-1">
                  <label className="block font-semibold text-stone-700 dark:text-stone-200">
                    Alasan Penyesuaian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Contoh: Koreksi selisih hitung opname fisik / barang rusak saat bongkar muat..."
                    className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg focus:ring-1 focus:ring-amber-700 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingAdjust || !isValidDelta || !adjustReason.trim()}
                    className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-semibold transition-all inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    {isSubmittingAdjust ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Mencatat Penyesuaian...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Catat Penyesuaian Stok</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredStocks}
        keyField="idItem"
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadStock}
        searchPlaceholder="Cari ID barang, nama item, atau lokasi..."
        emptyTitle="Tidak ada data stok."
        emptyDescription="Katalog barang atau transaksi belum tercatat di Google Spreadsheet."
        filterControls={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded focus:ring-1 focus:ring-amber-700 text-stone-700 dark:text-stone-200"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="CHEMICAL">CHEMICAL</option>
              <option value="PERALATAN">PERALATAN</option>
              <option value="SERAGAM">SERAGAM</option>
            </select>

            <select
              value={selectedStockFilter}
              onChange={(e) => setSelectedStockFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded focus:ring-1 focus:ring-amber-700 text-stone-700 dark:text-stone-200"
            >
              <option value="ALL">Semua Kondisi Stok</option>
              <option value="LOW">Stok Menipis (Di Bawah Min)</option>
              <option value="AVAILABLE">Stok Tersedia (&gt; 0)</option>
            </select>
          </div>
        }
      />

      <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-600 dark:text-stone-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-semibold text-stone-800 dark:text-stone-200">Prinsip Integritas Stok:</span> Saldo stok fisik
          berasal dari backend GAS tanpa manipulasi lokal di frontend.
        </div>
        <button
          onClick={() => navigateTo('masuk')}
          className="text-stone-900 dark:text-stone-100 font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>Penerimaan Masuk</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
