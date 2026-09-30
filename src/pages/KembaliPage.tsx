import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterItem, MasterMember, ItemStock } from '../types';
import { Undo2, Loader2, CheckCircle2, ScrollText, Boxes } from 'lucide-react';

export const KembaliPage: React.FC = () => {
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
      setMembers(membersData);
      setItems(itemsData);
      setStocks(stockData);

      if (membersData.length > 0 && !selectedMemberId) {
        setSelectedMemberId(membersData[0].ID_MEMBER);
      }
      if (itemsData.length > 0 && !selectedItemId) {
        setSelectedItemId(itemsData[0].ID_ITEM);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction('TRANSACTION')) {
      addToast('error', 'Akses Ditolak', 'Peran Anda tidak memiliki izin untuk mencatat transaksi.');
      return;
    }

    if (!selectedMemberId || !selectedItemId || jumlah <= 0) {
      addToast('error', 'Validasi Gagal', 'Lengkapi member, barang, dan jumlah pengembalian.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitTransaction({
        type: 'KEMBALI',
        itemId: selectedItemId,
        jumlah: Number(jumlah),
        memberId: selectedMemberId,
        keterangan: keterangan.trim() || 'Pengembalian barang pinjaman',
        tanggal,
      });

      const docNo = res?.NO_DOKUMEN || res?.transaction?.NO_DOKUMEN || res?.documentNo || 'Berhasil';

      addToast(
        'success',
        'Pengembalian Berhasil Dicatat',
        `No Dokumen: ${docNo} (+${jumlah} ${selectedItem?.SATUAN || 'UNIT'})`
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
      addToast('error', 'Gagal Mencatat Pengembalian', err.message || 'Terjadi kesalahan pada backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Pengembalian Pinjaman (Kembali)"
        description="Owner page transaksi KEMBALI. Mencatat pengembalian alat atau barang pinjaman oleh Member dan menambahkan saldo stok di Google Spreadsheet."
      />

      {lastSubmittedTx && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start justify-between text-xs text-emerald-900 animate-fadeIn">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm text-emerald-950">
                Pengembalian Berhasil Disimpan di GAS
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
                Pilih Member yang Mengembalikan <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isLoading || isSubmitting}
                required
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 text-xs"
              >
                {members.map((m, idx) => (
                  <option key={`${m.ID_MEMBER}-${idx}`} value={m.ID_MEMBER}>
                    [{m.ID_MEMBER}] {m.NAMA_MEMBER} ({m.JABATAN || ''})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Pilih Barang / Alat yang Dikembalikan <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isLoading || isSubmitting}
                required
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 text-xs"
              >
                {items.map((i, idx) => (
                  <option key={`${i.ID_ITEM}-${idx}`} value={i.ID_ITEM}>
                    [{i.ID_ITEM}] {i.NAMA_ITEM} ({i.KATEGORI} - {i.SATUAN})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Jumlah Dikembalikan <span className="text-rose-500">*</span>
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
                  Tanggal Pengembalian <span className="text-rose-500">*</span>
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
                Kondisi Barang Saat Kembali & Keterangan
              </label>
              <textarea
                rows={3}
                disabled={isSubmitting}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Dikembalikan dalam keadaan bersih, kabel rapi, aksesoris lengkap dan berfungsi normal."
                className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 text-xs"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Pencatatan dikirim langsung via POST action=transaction ke GAS.
              </span>
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan ke GAS...</span>
                  </>
                ) : (
                  <>
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Catat Pengembalian</span>
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
              <span>Efek ke Saldo Stok</span>
            </h4>

            {selectedItem && (
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Stok Saat Ini (GAS)</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
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
