import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterItem, MasterMember, ItemStock } from '../types';
import { RotateCcw, Loader2, CheckCircle2, ScrollText, Boxes } from 'lucide-react';

export const PinjamPage: React.FC = () => {
  const { navigateTo, canPerformAction, addToast, refreshKey, triggerRefresh } = useApp();

  const [members, setMembers] = useState<MasterMember[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [stocks, setStocks] = useState<ItemStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [jumlah, setJumlah] = useState<number>(1);
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState('');

  // Result state
  const [lastSubmittedTx, setLastSubmittedTx] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [membersData, itemsData, stockData] = await Promise.all([
        api.getMembers(),
        api.getItems(),
        api.getStock(),
      ]);
      const activeMembers = membersData.filter((m) => m.STATUS === 'AKTIF');
      const activeItems = itemsData.filter((i) => i.STATUS === 'AKTIF');
      setMembers(activeMembers);
      setItems(activeItems);
      setStocks(stockData);

      if (activeMembers.length > 0 && !selectedMemberId) {
        setSelectedMemberId(activeMembers[0].ID_MEMBER);
      }
      if (activeItems.length > 0 && !selectedItemId) {
        setSelectedItemId(activeItems[0].ID_ITEM);
      }
    } catch (err: any) {
      addToast('error', 'Gagal Memuat Data', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const selectedMember = members.find((m) => m.ID_MEMBER === selectedMemberId);
  const selectedItem = items.find((i) => i.ID_ITEM === selectedItemId);
  const currentStock = stocks.find((s) => s.idItem === selectedItemId)?.stok || 0;
  const isOutOfStock = currentStock < (Number(jumlah) || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction('TRANSACTION')) {
      addToast('error', 'Akses Ditolak', 'Peran Anda tidak memiliki izin untuk mencatat transaksi.');
      return;
    }

    if (!selectedMemberId || !selectedItemId || jumlah <= 0) {
      addToast('error', 'Validasi Gagal', 'Lengkapi member, barang, dan jumlah pinjam.');
      return;
    }

    if (isOutOfStock) {
      addToast('error', 'Stok Tidak Mencukupi', `Sisa stok di GAS: ${currentStock} ${selectedItem?.SATUAN || 'UNIT'}.`);
      return;
    }

    if (!keterangan.trim()) {
      addToast('warning', 'Keterangan Diperlukan', 'Mohon isi tujuan peminjaman atau area pekerjaan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitTransaction({
        type: 'PINJAM',
        itemId: selectedItemId,
        jumlah: Number(jumlah),
        memberId: selectedMemberId,
        keterangan: keterangan.trim(),
        tanggal,
      });

      const docNo = res?.NO_DOKUMEN || res?.transaction?.NO_DOKUMEN || res?.documentNo || 'Berhasil';

      addToast(
        'success',
        'Peminjaman Berhasil Dicatat',
        `No Dokumen: ${docNo} (${jumlah} ${selectedItem?.SATUAN || 'UNIT'})`
      );

      setLastSubmittedTx({
        NO_DOKUMEN: docNo,
        NAMA_MEMBER: selectedMember?.NAMA_MEMBER || selectedMemberId,
        ID_ITEM: selectedItemId,
      });

      setJumlah(1);
      setKeterangan('');
      triggerRefresh();
    } catch (err: any) {
      addToast('error', 'Gagal Mencatat Peminjaman', err.message || 'Terjadi kesalahan pada backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Peminjaman Barang & Peralatan"
        description="Owner page transaksi PINJAM. Mencatat peminjaman alat kerja atau mesin oleh personil lapangan via POST action=transaction ke GAS."
      />

      {lastSubmittedTx && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start justify-between text-xs text-emerald-900 animate-fadeIn">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm text-emerald-950">
                Peminjaman Berhasil Disimpan di GAS
              </div>
              <p className="mt-1 text-emerald-800">
                Dokumen <span className="font-mono font-bold">{lastSubmittedTx.NO_DOKUMEN}</span> telah
                diterbitkan untuk member <span className="font-semibold">{lastSubmittedTx.NAMA_MEMBER}</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigateTo('bincard', { itemId: lastSubmittedTx.ID_ITEM })}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-900 rounded font-medium hover:bg-emerald-100 transition-colors"
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Lihat Bin Card</span>
            </button>
            <button
              onClick={() => setLastSubmittedTx(null)}
              className="text-emerald-700 hover:text-emerald-900 px-2 py-1"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Container */}
        <div className="md:col-span-2 bg-white rounded-lg border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Pilih Member Peminjam <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isLoading || isSubmitting}
                required
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 text-xs"
              >
                {members.map((m) => (
                  <option key={m.ID_MEMBER} value={m.ID_MEMBER}>
                    [{m.ID_MEMBER}] {m.NAMA_MEMBER} ({m.JABATAN})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Pilih Barang / Alat yang Dipinjam <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isLoading || isSubmitting}
                required
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 text-xs"
              >
                {items.map((i) => (
                  <option key={i.ID_ITEM} value={i.ID_ITEM}>
                    [{i.ID_ITEM}] {i.NAMA_ITEM} ({i.KATEGORI} - {i.SATUAN})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Jumlah Dipinjam <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    required
                    disabled={isSubmitting}
                    value={jumlah}
                    onChange={(e) => setJumlah(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 font-mono text-xs pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                    {selectedItem?.SATUAN || 'UNIT'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Tanggal Pinjam <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={isSubmitting}
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Tujuan Peminjaman & Lokasi Kerja <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                disabled={isSubmitting}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Peminjaman untuk pembersihan karpet ruang serbaguna lantai 2, rencana selesai sore ini."
                className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 text-xs"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Pencatatan dikirim langsung via POST action=transaction ke GAS.
              </span>
              <button
                type="submit"
                disabled={isSubmitting || isLoading || isOutOfStock}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan ke GAS...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Catat Peminjaman</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 text-xs">
            <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-slate-600" />
              <span>Ketersediaan Stok</span>
            </h4>

            {selectedItem && (
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Stok di Gudang (GAS)</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      isOutOfStock ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {currentStock} {selectedItem.SATUAN}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
