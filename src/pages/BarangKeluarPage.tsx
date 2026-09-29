import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterItem, MasterMember, ItemStock, PickupEligibilityResult } from '../types';
import {
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ScrollText,
  FileCheck2,
  Clock,
  Boxes,
} from 'lucide-react';

export const BarangKeluarPage: React.FC = () => {
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

  // Eligibility Preview State from Backend
  const [eligibility, setEligibility] = useState<PickupEligibilityResult | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

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

  // Check eligibility from GAS whenever member, item, or quantity changes
  useEffect(() => {
    if (!selectedMemberId || !selectedItemId) {
      setEligibility(null);
      return;
    }

    let active = true;
    setCheckingEligibility(true);
    api
      .getPickupEligibility(selectedMemberId, selectedItemId, Number(jumlah) || 1)
      .then((res) => {
        if (active) setEligibility(res);
      })
      .catch((err) => {
        console.warn('Backend eligibility check failed:', err);
      })
      .finally(() => {
        if (active) setCheckingEligibility(false);
      });

    return () => {
      active = false;
    };
  }, [selectedMemberId, selectedItemId, jumlah]);

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
      addToast('error', 'Validasi Gagal', 'Lengkapi member, barang, dan jumlah valid.');
      return;
    }

    if (isOutOfStock) {
      addToast('error', 'Stok Tidak Cukup', `Sisa stok di backend: ${currentStock} ${selectedItem?.SATUAN || 'UNIT'}.`);
      return;
    }

    if (eligibility && !eligibility.allowed && eligibility.early) {
      addToast(
        'warning',
        'Memerlukan Pengajuan Approval',
        'Pengambilan sebelum masa pakai selesai atau melebihi limit harus melalui Pengajuan Pengambilan.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitTransaction({
        type: 'BARANG_KELUAR',
        itemId: selectedItemId,
        jumlah: Number(jumlah),
        memberId: selectedMemberId,
        keterangan: keterangan.trim() || 'Pengeluaran barang member',
        tanggal,
      });

      const docNo = res?.NO_DOKUMEN || res?.transaction?.NO_DOKUMEN || res?.documentNo || 'Berhasil';

      addToast(
        'success',
        'Barang Keluar Berhasil Dicatat',
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
      addToast('error', 'Gagal Mencatat Barang Keluar', err.message || 'Terjadi kesalahan pada backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Pengeluaran Barang Keluar"
        description="Owner page transaksi BARANG_KELUAR untuk distribusi item kepada Member. Memeriksa kelayakan batas kuota dan masa pakai via API GAS."
      />

      {lastSubmittedTx && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start justify-between text-xs text-emerald-900 animate-fadeIn">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm text-emerald-950">
                Barang Keluar Berhasil Disimpan di GAS
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
                Pilih Member Penerima <span className="text-rose-500">*</span>
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
                    [{m.ID_MEMBER}] {m.NAMA_MEMBER} ({m.JENIS_MEMBER})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Pilih Barang Keluar <span className="text-rose-500">*</span>
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
                    [{i.ID_ITEM}] {i.NAMA_ITEM} ({i.KATEGORI} - Masa Pakai: {i.MASA_PAKAI_BULAN} Bln)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Jumlah Keluar <span className="text-rose-500">*</span>
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
                  Tanggal Keluar <span className="text-rose-500">*</span>
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
                Keterangan / Keperluan Operasional
              </label>
              <textarea
                rows={3}
                disabled={isSubmitting}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Pengambilan rutin bulanan untuk Area Lobby Utama."
                className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 text-xs"
              />
            </div>

            {/* Backend Eligibility Preview Banner */}
            {checkingEligibility ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                <span>Memvalidasi aturan limit member & masa pakai via API GAS...</span>
              </div>
            ) : eligibility && !eligibility.allowed ? (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg space-y-2.5">
                <div className="flex items-start gap-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-xs">
                      Hasil Evaluasi Backend: Memerlukan Pengajuan Approval
                    </div>
                    <div className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      {eligibility.reason || 'Pengambilan di luar batas kuota / masa pakai belum selesai.'}
                    </div>
                    {eligibility.dueDate && (
                      <div className="text-[11px] font-mono text-amber-900 mt-1">
                        Jadwal Pengambilan Berikutnya: {eligibility.dueDate}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
                  <span className="text-[11px] text-amber-800">
                    Sesuai Blueprint: Pengambilan awal harus diajukan melalui form pengajuan.
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      navigateTo('pengajuan', {
                        memberId: selectedMemberId,
                        itemId: selectedItemId,
                        jumlah,
                      })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded font-medium hover:bg-amber-700 transition-colors shrink-0 ml-3"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Buat Pengajuan</span>
                  </button>
                </div>
              </div>
            ) : eligibility && eligibility.allowed ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px]">
                  Member memenuhi syarat pengambilan dari backend GAS. Kuota dan masa pakai valid.
                </span>
              </div>
            ) : null}

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Pencatatan dikirim langsung via POST action=transaction.
              </span>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  isLoading ||
                  isOutOfStock ||
                  (eligibility !== null && !eligibility.allowed)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan ke GAS...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Catat Barang Keluar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info Card */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 text-xs">
            <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-slate-600" />
              <span>Stok & Ketersediaan</span>
            </h4>

            {selectedItem && (
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Stok Saat Ini (GAS)</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      isOutOfStock ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {currentStock} {selectedItem.SATUAN}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Masa Pakai Item</span>
                  <span className="font-mono text-slate-700">
                    {selectedItem.MASA_PAKAI_BULAN} Bulan
                  </span>
                </div>
              </div>
            )}
          </div>

          {selectedMember && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 text-xs">
              <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>Info Member</span>
              </h4>
              <div className="space-y-1.5 text-[11px]">
                <div className="font-semibold text-slate-900">{selectedMember.NAMA_MEMBER}</div>
                <div className="text-slate-500">
                  Level: <span className="font-medium text-slate-700">{selectedMember.JENIS_MEMBER}</span> · ID:{' '}
                  <span className="font-mono">{selectedMember.ID_MEMBER}</span>
                </div>
                <button
                  onClick={() => navigateTo('riwayat-member', { memberId: selectedMember.ID_MEMBER })}
                  className="text-slate-800 font-medium underline mt-1 block"
                >
                  Buka Riwayat Pengambilan Member
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
