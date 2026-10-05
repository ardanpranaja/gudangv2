import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { useApp } from '../context/AppContext';
import { api, normalizeGasErrorMessage } from '../services/api';
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
  ShoppingCart,
  Trash2,
  Plus,
} from 'lucide-react';

interface CartItem {
  id: string;
  nama: string;
  satuan: string;
  jumlah: number;
}

interface SubmissionResult {
  success: boolean;
  createdDocs: string[];
  failedItems: string[];
}

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

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitProgress, setSubmitProgress] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  // Eligibility Preview State from Backend
  const [eligibility, setEligibility] = useState<PickupEligibilityResult | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

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
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Gagal memuat data master dari backend.');
      addToast('error', 'Gagal Memuat Data', msg);
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
      setEligibilityError(null);
      return;
    }

    const parsedQty = Number(jumlah);
    if (!parsedQty || parsedQty <= 0) {
      setEligibility(null);
      setEligibilityError('Jumlah barang harus lebih besar dari 0.');
      return;
    }

    let active = true;
    setCheckingEligibility(true);
    setEligibilityError(null);

    api
      .getPickupEligibility(selectedMemberId, selectedItemId, parsedQty)
      .then((res) => {
        if (active) {
          setEligibility(res);
          setEligibilityError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setEligibility(null);
          const errorMsg = normalizeGasErrorMessage(
            err,
            undefined,
            'Gagal memeriksa kelayakan pengambilan dari backend GAS.'
          );
          setEligibilityError(errorMsg);
          console.warn('Backend eligibility check failed:', err);
        }
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

  const canAddToCart =
    !!selectedMemberId &&
    !!selectedItemId &&
    Number(jumlah) > 0 &&
    !checkingEligibility &&
    !eligibilityError &&
    eligibility !== null &&
    eligibility.allowed === true &&
    !isOutOfStock &&
    !isSubmitting &&
    !isLoading;

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddToCart || !selectedItem) return;

    if (!eligibility || !eligibility.allowed) {
      addToast('error', 'Belum Layak', 'Kelayakan pengambilan belum disetujui backend.');
      return;
    }

    const existingIdx = cart.findIndex((c) => c.id === selectedItemId);
    if (existingIdx >= 0) {
      const updated = [...cart];
      updated[existingIdx] = {
        ...updated[existingIdx],
        jumlah: updated[existingIdx].jumlah + Number(jumlah),
      };
      setCart(updated);
      addToast('info', 'Jumlah Digabungkan', `${selectedItem.NAMA_ITEM} kini ${updated[existingIdx].jumlah} ${selectedItem.SATUAN} di keranjang.`);
    } else {
      setCart([
        ...cart,
        {
          id: selectedItemId,
          nama: selectedItem.NAMA_ITEM,
          satuan: selectedItem.SATUAN,
          jumlah: Number(jumlah),
        },
      ]);
      addToast('success', 'Ditambahkan ke Keranjang', `${selectedItem.NAMA_ITEM} (${jumlah} ${selectedItem.SATUAN}) ditambahkan.`);
    }

    setSelectedItemId('');
    setJumlah(1);
    setSubmissionResult(null);
  };

  const handleRemoveFromCart = (index: number) => {
    const removed = cart[index];
    setCart(cart.filter((_, idx) => idx !== index));
    if (removed) {
      addToast('info', 'Item Dihapus', `${removed.nama} dikeluarkan dari keranjang.`);
    }
  };

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!canPerformAction('TRANSACTION')) {
      addToast('error', 'Akses Ditolak', 'Peran Anda tidak memiliki izin untuk mencatat transaksi.');
      return;
    }

    if (!selectedMemberId) {
      addToast('warning', 'Pilih Member', 'Silakan pilih member penerima terlebih dahulu.');
      return;
    }
    if (cart.length === 0) {
      addToast('warning', 'Keranjang Kosong', 'Tambahkan minimal satu barang ke keranjang.');
      return;
    }
    if (!tanggal) {
      addToast('warning', 'Tanggal Kosong', 'Silakan isi tanggal keluar.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);

    const createdDocs: string[] = [];
    const failedItems: string[] = [];
    const remainingCart: CartItem[] = [];
    const total = cart.length;

    try {
      for (let i = 0; i < total; i++) {
        const item = cart[i];
        setSubmitProgress(`Mencatat item ${i + 1} dari ${total}: ${item.nama} (${item.jumlah} ${item.satuan})...`);

        // Re-check stock before submitting each item
        const liveStock = stocks.find((s) => s.idItem === item.id)?.stok ?? 0;
        if (liveStock < item.jumlah) {
          failedItems.push(`${item.nama}: stok tidak cukup (sisa ${liveStock} ${item.satuan}).`);
          remainingCart.push(item);
          continue;
        }

        try {
          const res = await api.submitTransaction({
            type: 'BARANG_KELUAR',
            itemId: item.id,
            jumlah: item.jumlah,
            memberId: selectedMemberId,
            keterangan: keterangan.trim() || 'Pengeluaran barang member',
            tanggal,
          });
          const docNo = res?.NO_DOKUMEN || res?.transaction?.NO_DOKUMEN || res?.documentNo;
          createdDocs.push(docNo ? `${docNo}` : `OK (${item.nama})`);
        } catch (err: unknown) {
          const errDetail = normalizeGasErrorMessage(err, undefined, `Gagal mencatat ${item.nama}`);
          failedItems.push(`${item.nama}: ${errDetail}`);
          remainingCart.push(item);
        }
      }

      if (failedItems.length === 0) {
        setSubmissionResult({ success: true, createdDocs, failedItems: [] });
        setCart([]);
        setKeterangan('');
        addToast('success', 'Semua Tercatat', `Berhasil mencatat ${createdDocs.length} barang keluar ke GAS.`);
      } else {
        setSubmissionResult({ success: false, createdDocs, failedItems });
        setCart(remainingCart);
        addToast(
          'warning',
          'Sebagian Gagal',
          `${createdDocs.length} berhasil, ${failedItems.length} gagal (tetap di keranjang).`
        );
      }
      triggerRefresh();
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(null);
    }
  };

  // Options for SearchableSelect
  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.ID_MEMBER,
        label: m.NAMA_MEMBER,
        badge: m.JABATAN || undefined,
        extra: m.STATUS === 'AKTIF' ? undefined : `Status: ${m.STATUS}`,
      })),
    [members]
  );

  const itemOptions = useMemo(
    () =>
      items.map((i) => ({
        value: i.ID_ITEM,
        label: i.NAMA_ITEM,
        badge: i.KATEGORI,
        extra: `Masa Pakai: ${i.MASA_PAKAI_BULAN} Bln · ${i.SATUAN}`,
      })),
    [items]
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Pengeluaran Barang Keluar"
        description="Transaksi BARANG_KELUAR multi-item untuk distribusi ke Member. Memeriksa kelayakan masa pakai via API GAS."
      />

      {submissionResult && (
        <div
          className={`p-4 border rounded-lg flex items-start gap-3 text-xs animate-fadeIn ${
            submissionResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
          }`}
        >
          {submissionResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-1.5">
            <div className="font-semibold text-sm">
              {submissionResult.success ? 'Semua Barang Keluar Tercatat!' : 'Hasil Pencatatan Barang Keluar'}
            </div>
            {submissionResult.createdDocs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1 font-mono font-bold text-[11px]">
                {submissionResult.createdDocs.map((doc, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200"
                  >
                    {doc}
                  </span>
                ))}
              </div>
            )}
            {submissionResult.failedItems.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-rose-800 dark:text-rose-200">
                {submissionResult.failedItems.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => setSubmissionResult(null)}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Container */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <form onSubmit={handleSubmitAll} className="space-y-5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-200 mb-1">
                Pilih Member Penerima <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                disabled={isLoading || isSubmitting}
                required
                value={selectedMemberId}
                onChange={setSelectedMemberId}
                options={memberOptions}
                placeholder="Cari atau pilih member..."
                searchPlaceholder="Cari ID, nama member, atau jabatan..."
              />
            </div>

            {/* Item picker + Add to cart */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-3">
              <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4" />
                <span>Tambah Barang ke Keranjang</span>
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Pilih Barang <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  disabled={isLoading || isSubmitting}
                  value={selectedItemId}
                  onChange={setSelectedItemId}
                  options={itemOptions}
                  placeholder="Cari atau pilih barang..."
                  searchPlaceholder="Cari ID barang, nama barang, atau kategori..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Jumlah <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      disabled={isSubmitting}
                      value={jumlah}
                      onChange={(e) => setJumlah(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs pr-16 bg-white dark:bg-slate-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-mono text-xs">
                      {selectedItem?.SATUAN || 'UNIT'}
                    </span>
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!canAddToCart}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 rounded hover:bg-emerald-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>
              </div>

              {/* Eligibility banner for current selection */}
              {checkingEligibility ? (
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-400 shrink-0" />
                  <span>Memvalidasi aturan masa pakai via API GAS...</span>
                </div>
              ) : eligibilityError ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded text-rose-900 dark:text-rose-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">{eligibilityError}</span>
                </div>
              ) : eligibility && !eligibility.allowed ? (
                eligibility.early ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded text-amber-900 dark:text-amber-100">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-xs">Memerlukan Pengajuan Approval</div>
                        <div className="text-[11px] mt-0.5 leading-relaxed">
                          {eligibility.reason || 'Pengambilan di luar ketentuan masa pakai.'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        navigateTo('pengajuan', {
                          memberId: selectedMemberId,
                          itemId: selectedItemId,
                          jumlah,
                        })
                      }
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded font-medium hover:bg-amber-700 transition-colors"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Buat Pengajuan</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded text-rose-900 dark:text-rose-100 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                      Alasan: {eligibility.reason || 'Tidak memenuhi syarat pengambilan.'}
                    </div>
                  </div>
                )
              ) : eligibility && eligibility.allowed ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px]">Layak diambil — masa pakai valid.</span>
                </div>
              ) : null}
            </div>

            {/* Cart list */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                Keranjang Barang Keluar ({cart.length} item):
              </div>
              {cart.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-center bg-white dark:bg-slate-900">
                  <ShoppingCart className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-medium text-xs text-slate-600 dark:text-slate-400 mt-1">Keranjang masih kosong</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Pilih barang di atas lalu klik &ldquo;Tambah&rdquo;
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 animate-fadeIn"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.nama}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.jumlah} {item.satuan}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(idx)}
                        disabled={isSubmitting}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors shrink-0"
                        title="Hapus dari keranjang"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Tanggal Keluar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={isSubmitting}
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Keterangan / Keperluan Operasional
                </label>
                <textarea
                  rows={2}
                  disabled={isSubmitting}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Pengambilan rutin bulanan untuk Area Lobby Utama."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                />
              </div>
            </div>

            {isSubmitting && submitProgress && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-100 text-xs flex items-center gap-2 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>{submitProgress}</span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {cart.length > 0
                  ? `${cart.length} item akan dicatat berurutan via POST action=transaction.`
                  : 'Tambahkan barang ke keranjang terlebih dahulu.'}
              </span>
              <button
                type="submit"
                disabled={isSubmitting || isLoading || cart.length === 0 || !selectedMemberId || !tanggal}
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
                    <span>Catat {cart.length > 0 ? `${cart.length} ` : ''}Barang Keluar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info Card */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 text-xs">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Stok & Ketersediaan</span>
            </h4>

            {selectedItem && (
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Stok Saat Ini (GAS)</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      isOutOfStock ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {currentStock} {selectedItem.SATUAN}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Masa Pakai Item</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    {selectedItem.MASA_PAKAI_BULAN} Bulan
                  </span>
                </div>
              </div>
            )}
          </div>

          {selectedMember && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 text-xs">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Info Member</span>
              </h4>
              <div className="space-y-1.5 text-[11px]">
                <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedMember.NAMA_MEMBER}</div>
                <div className="text-slate-500 dark:text-slate-400">
                  Level: <span className="font-medium text-slate-700 dark:text-slate-200">{selectedMember.JABATAN}</span> · ID:{' '}
                  <span className="font-mono">{selectedMember.ID_MEMBER}</span>
                </div>
                <button
                  onClick={() => navigateTo('riwayat-member', { memberId: selectedMember.ID_MEMBER })}
                  className="text-slate-800 dark:text-slate-200 font-medium underline mt-1 block"
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
