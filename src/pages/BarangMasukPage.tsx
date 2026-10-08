import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterItem, ItemStock } from '../types';
import { ArrowDownLeft, Loader2, CheckCircle2, ScrollText, Boxes } from 'lucide-react';

export const BarangMasukPage: React.FC = () => {
  const { navigateTo, canPerformAction, addToast, refreshKey, triggerRefresh } = useApp();

  const [items, setItems] = useState<MasterItem[]>([]);
  const [stocks, setStocks] = useState<ItemStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedItemId, setSelectedItemId] = useState('');
  const [jumlah, setJumlah] = useState<number>(1);
  const [noDokumen, setNoDokumen] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState('');

  // Success summary state
  const [lastSubmittedTx, setLastSubmittedTx] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [itemsData, stockData] = await Promise.all([
        api.getItems(),
        api.getStock(),
      ]);
      const activeItems = itemsData.filter((i) => i.STATUS === 'AKTIF');
      setItems(activeItems);
      setStocks(stockData);
      if (activeItems.length > 0 && !selectedItemId) {
        setSelectedItemId(activeItems[0].ID_ITEM);
      }
    } catch (err: any) {
      addToast('error', 'Gagal Memuat Data Barang', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const selectedItem = items.find((i) => i.ID_ITEM === selectedItemId);
  const currentItemStock = stocks.find((s) => s.idItem === selectedItemId)?.stok || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction('TRANSACTION')) {
      addToast('error', 'Akses Ditolak', 'Peran Anda tidak memiliki izin untuk mencatat transaksi.');
      return;
    }

    if (!selectedItemId || jumlah <= 0) {
      addToast('error', 'Validasi Gagal', 'Pilih barang dan isi jumlah masuk yang valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitTransaction({
        type: 'BARANG_MASUK',
        itemId: selectedItemId,
        jumlah: Number(jumlah),
        noDokumen: noDokumen.trim() || undefined,
        keterangan: keterangan.trim() || 'Penerimaan barang masuk',
        tanggal,
      });

      const docNo = res?.NO_DOKUMEN || res?.transaction?.NO_DOKUMEN || res?.documentNo || 'Berhasil';

      addToast(
        'success',
        'Barang Masuk Berhasil Dicatat',
        `No Dokumen: ${docNo} (${jumlah} ${selectedItem?.SATUAN || 'UNIT'})`
      );

      setLastSubmittedTx({
        NO_DOKUMEN: docNo,
        JUMLAH: jumlah,
        ID_ITEM: selectedItemId,
      });

      // Reset form fields
      setJumlah(1);
      setKeterangan('');
      setNoDokumen('');
      triggerRefresh();
    } catch (err: any) {
      addToast('error', 'Gagal Mencatat Barang Masuk', err.message || 'Terjadi kesalahan pada backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Options for SearchableSelect
  const itemOptions = useMemo(
    () =>
      items.map((i) => ({
        value: i.ID_ITEM,
        label: i.NAMA_ITEM,
        badge: i.KATEGORI,
        extra: `Satuan: ${i.SATUAN} · Stok Min: ${i.MIN_STOK}`,
      })),
    [items]
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Penerimaan Barang Masuk"
        description="Owner page transaksi BARANG_MASUK. Mencatat penerimaan stok baru, pengiriman vendor/supplier, atau restock internal ke Google Spreadsheet."
      />

      {lastSubmittedTx && (
        <div className="p-4 bg-emerald-100 border-2 border-stone-900 rounded-xl flex items-start justify-between text-xs text-stone-950 animate-fadeIn shadow-[4px_4px_0px_#18181b]">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5 stroke-[2.5]" />
            <div>
              <div className="font-black text-sm text-stone-950">
                Penerimaan Berhasil Disimpan di GAS
              </div>
              <p className="mt-1 text-stone-800 font-medium">
                Dokumen <span className="font-mono font-black bg-white px-1.5 py-0.5 rounded border border-stone-900">{lastSubmittedTx.NO_DOKUMEN}</span> telah
                tercatat ke Google Spreadsheet.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigateTo('bincard', { itemId: lastSubmittedTx.ID_ITEM })}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-300 border-2 border-stone-900 text-stone-950 rounded-lg font-black hover:bg-emerald-200 transition-all shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <ScrollText className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Lihat Bin Card</span>
            </button>
            <button
              onClick={() => setLastSubmittedTx(null)}
              className="text-stone-700 hover:text-stone-950 px-2 py-1 font-bold underline"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="md:col-span-2 bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 p-6 shadow-[5px_5px_0px_#18181b]">
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            <div>
              <label className="block font-black text-stone-950 dark:text-stone-200 mb-1">
                Pilih Barang Masuk <span className="text-rose-600">*</span>
              </label>
              <SearchableSelect
                disabled={isLoading || isSubmitting}
                required
                value={selectedItemId}
                onChange={setSelectedItemId}
                options={itemOptions}
                placeholder="Cari atau pilih barang..."
                searchPlaceholder="Cari ID barang, nama barang, atau kategori..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-black text-stone-950 dark:text-stone-200 mb-1">
                  Jumlah Masuk <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    required
                    disabled={isSubmitting}
                    value={jumlah}
                    onChange={(e) => setJumlah(Number(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-stone-900 dark:border-stone-500 rounded-lg focus:ring-2 focus:ring-amber-400 text-stone-950 dark:text-stone-100 font-mono font-bold text-xs pr-16 shadow-[1.5px_1.5px_0px_#18181b]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 dark:text-stone-300 font-mono font-bold text-xs">
                    {selectedItem?.SATUAN || 'UNIT'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-black text-stone-950 dark:text-stone-200 mb-1">
                  Tanggal Masuk <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={isSubmitting}
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-stone-900 dark:border-stone-500 rounded-lg focus:ring-2 focus:ring-amber-400 text-stone-950 dark:text-stone-100 text-xs font-bold shadow-[1.5px_1.5px_0px_#18181b]"
                />
              </div>
            </div>

            <div>
              <label className="block font-black text-stone-950 dark:text-stone-200 mb-1">
                No. Surat Jalan / No. Referensi Pengiriman
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={noDokumen}
                onChange={(e) => setNoDokumen(e.target.value)}
                placeholder="Kosongkan jika ingin dibuat otomatis oleh backend GAS"
                className="w-full px-3 py-2 border-2 border-stone-900 dark:border-stone-500 rounded-lg focus:ring-2 focus:ring-amber-400 text-stone-950 dark:text-stone-100 font-mono font-bold text-xs shadow-[1.5px_1.5px_0px_#18181b]"
              />
            </div>

            <div>
              <label className="block font-black text-stone-950 dark:text-stone-200 mb-1">
                Keterangan / Nama Supplier / Catatan Pengiriman
              </label>
              <textarea
                rows={3}
                disabled={isSubmitting}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Pengiriman PO-8812 dari PT Chemika Jaya, kondisi kemasan segel aman."
                className="w-full px-3 py-2 border-2 border-stone-900 dark:border-stone-500 rounded-lg focus:ring-2 focus:ring-amber-400 text-stone-950 dark:text-stone-100 text-xs font-bold shadow-[1.5px_1.5px_0px_#18181b]"
              />
            </div>

            <div className="pt-4 border-t-2 border-stone-900 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
                Pencatatan dikirim langsung via POST action=transaction ke GAS.
              </span>
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-stone-950 bg-emerald-400 hover:bg-emerald-300 border-2 border-stone-900 rounded-lg shadow-[3px_3px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="neo-spinner-multicolor-sm" />
                    <span>Menyimpan ke GAS...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>Catat Barang Masuk</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info Card */}
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-500 p-4 space-y-3 text-xs shadow-[4px_4px_0px_#18181b]">
            <h4 className="font-black text-stone-950 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-700 pb-2 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-stone-900 dark:text-stone-300 stroke-[2.5]" />
              <span>Info Stok Barang Ini</span>
            </h4>

            {selectedItem ? (
              <div className="space-y-2.5 font-bold">
                <div>
                  <div className="text-stone-600 dark:text-stone-400 text-[11px] font-semibold">Nama Barang</div>
                  <div className="font-black text-stone-950 dark:text-stone-100 text-sm">{selectedItem.NAMA_ITEM}</div>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-300 dark:border-stone-800">
                  <span className="text-stone-700 dark:text-stone-300">Stok Saat Ini (Backend)</span>
                  <span className="font-mono font-black text-stone-950 dark:text-stone-100 tabular-nums bg-white dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-900">
                    {currentItemStock} {selectedItem.SATUAN}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-300 dark:border-stone-800">
                  <span className="text-stone-700 dark:text-stone-300">Batas Min. Stok</span>
                  <span className="font-mono text-stone-900 dark:text-stone-200 tabular-nums">
                    {selectedItem.MIN_STOK} {selectedItem.SATUAN}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-300 dark:border-stone-800">
                  <span className="text-stone-700 dark:text-stone-300">Lokasi Rak</span>
                  <span className="text-stone-950 dark:text-stone-200 font-black">{selectedItem.LOKASI || '-'}</span>
                </div>
              </div>
            ) : (
              <div className="text-stone-500 dark:text-stone-400 text-[11px] italic font-medium">Pilih barang untuk melihat info stok.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
