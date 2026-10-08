import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { useApp } from '../context/AppContext';
import { api, normalizeGasErrorMessage } from '../services/api';
import { MasterItem, MasterMember, ItemStock } from '../types';
import {
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ScrollText,
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

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitProgress, setSubmitProgress] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

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

  const selectedMember = members.find((m) => m.ID_MEMBER === selectedMemberId);
  const selectedItem = items.find((i) => i.ID_ITEM === selectedItemId);
  const currentStock = stocks.find((s) => s.idItem === selectedItemId)?.stok || 0;
  const isOutOfStock = currentStock < (Number(jumlah) || 1);

  const canAddToCart =
    !!selectedMemberId &&
    !!selectedItemId &&
    Number(jumlah) > 0 &&
    !isOutOfStock &&
    !isSubmitting &&
    !isLoading;

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddToCart || !selectedItem) return;

    if (isOutOfStock) {
      addToast('error', 'Stok Tidak Cukup', `Sisa stok di GAS: ${currentStock} ${selectedItem.SATUAN}.`);
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
      addToast('warning', 'Pilih Member', 'Silakan pilih member peminjam terlebih dahulu.');
      return;
    }
    if (cart.length === 0) {
      addToast('warning', 'Keranjang Kosong', 'Tambahkan minimal satu barang ke keranjang.');
      return;
    }
    if (!keterangan.trim()) {
      addToast('warning', 'Keterangan Diperlukan', 'Mohon isi tujuan peminjaman atau area pekerjaan.');
      return;
    }
    if (!tanggal) {
      addToast('warning', 'Tanggal Kosong', 'Silakan isi tanggal pinjam.');
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

        const liveStock = stocks.find((s) => s.idItem === item.id)?.stok ?? 0;
        if (liveStock < item.jumlah) {
          failedItems.push(`${item.nama}: stok tidak cukup (sisa ${liveStock} ${item.satuan}).`);
          remainingCart.push(item);
          continue;
        }

        try {
          const res = await api.submitTransaction({
            type: 'PINJAM',
            itemId: item.id,
            jumlah: item.jumlah,
            memberId: selectedMemberId,
            keterangan: keterangan.trim(),
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
        addToast('success', 'Semua Tercatat', `Berhasil mencatat ${createdDocs.length} peminjaman ke GAS.`);
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
        extra: `Satuan: ${i.SATUAN}`,
      })),
    [items]
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Peminjaman Barang & Peralatan"
        description="Transaksi PINJAM multi-item. Mencatat peminjaman alat kerja oleh personil lapangan via POST action=transaction ke GAS."
      />

      {submissionResult && (
        <div
          className={`p-4 border-2 border-stone-900 rounded-xl flex items-start gap-3 text-xs animate-fadeIn shadow-[4px_4px_0px_#18181b] ${
            submissionResult.success
              ? 'bg-emerald-100 text-stone-950'
              : 'bg-amber-100 text-stone-950'
          }`}
        >
          {submissionResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5 stroke-[2.5]" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5 stroke-[2.5]" />
          )}
          <div className="flex-1 space-y-1.5">
            <div className="font-black text-sm">
              {submissionResult.success ? 'Semua Peminjaman Tercatat!' : 'Hasil Pencatatan Peminjaman'}
            </div>
            {submissionResult.createdDocs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1 font-mono font-black text-[11px]">
                {submissionResult.createdDocs.map((doc, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-white border-2 border-stone-900 text-stone-950 shadow-[1.5px_1.5px_0px_#18181b]"
                  >
                    {doc}
                  </span>
                ))}
              </div>
            )}
            {submissionResult.failedItems.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-rose-900 font-bold">
                {submissionResult.failedItems.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => setSubmissionResult(null)}
            className="px-2.5 py-1 text-xs font-black bg-stone-100 hover:bg-stone-200 border-2 border-stone-900 rounded shadow-[1.5px_1.5px_0px_#18181b] text-stone-950 shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Container */}
        <div className="md:col-span-2 bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 p-6 shadow-[5px_5px_0px_#18181b]">
          <form onSubmit={handleSubmitAll} className="space-y-5 text-xs">
            <div>
              <label className="block font-bold text-stone-900 dark:text-stone-100 mb-1">
                Pilih Member Peminjam <span className="text-rose-600">*</span>
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
            <div className="p-4 rounded-xl border-2 border-stone-900 dark:border-stone-600 bg-sky-50 dark:bg-stone-800/80 space-y-3 shadow-[3px_3px_0px_#18181b]">
              <div className="font-black text-stone-950 dark:text-stone-100 flex items-center gap-1.5 text-sm">
                <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                <span>Tambah Barang ke Keranjang</span>
              </div>
              <div>
                <label className="block font-bold text-stone-900 dark:text-stone-100 mb-1">
                  Pilih Barang / Alat <span className="text-rose-600">*</span>
                </label>
                <SearchableSelect
                  disabled={isLoading || isSubmitting}
                  value={selectedItemId}
                  onChange={setSelectedItemId}
                  options={itemOptions}
                  placeholder="Cari atau pilih alat / barang..."
                  searchPlaceholder="Cari ID barang, nama barang, atau kategori..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-900 dark:text-stone-100 mb-1">
                    Jumlah <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      disabled={isSubmitting}
                      value={jumlah}
                      onChange={(e) => setJumlah(Number(e.target.value))}
                      className="w-full px-3 py-2 border-2 border-stone-900 dark:border-stone-400 rounded-lg focus:ring-2 focus:ring-amber-400 text-stone-950 dark:text-stone-100 font-mono font-bold text-xs pr-16 bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 dark:text-stone-300 font-mono font-bold text-xs">
                      {selectedItem?.SATUAN || 'UNIT'}
                    </span>
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!canAddToCart}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-black text-stone-950 bg-emerald-300 hover:bg-emerald-400 border-2 border-stone-900 rounded-lg shadow-[3px_3px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#18181b] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Tambah</span>
                  </button>
                </div>
              </div>
              {selectedItem && (
                <div className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                  Stok tersedia:{' '}
                  <span className={`font-mono font-black ${isOutOfStock ? 'text-rose-600 dark:text-rose-400' : 'text-stone-950 dark:text-stone-100'}`}>
                    {currentStock} {selectedItem.SATUAN}
                  </span>
                </div>
              )}
            </div>

            {/* Cart list */}
            <div className="space-y-2">
              <div className="text-xs font-black text-stone-950 dark:text-stone-100">
                Keranjang Peminjaman ({cart.length} item):
              </div>
              {cart.length === 0 ? (
                <div className="p-4 rounded-xl border-2 border-dashed border-stone-400 dark:border-stone-600 text-center bg-white dark:bg-stone-900">
                  <ShoppingCart className="w-6 h-6 mx-auto text-stone-400 dark:text-stone-500" />
                  <p className="font-bold text-xs text-stone-800 dark:text-stone-300 mt-1">Keranjang masih kosong</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                    Pilih barang di atas lalu klik &ldquo;Tambah&rdquo;
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 shadow-[2.5px_2.5px_0px_#18181b] flex items-center justify-between gap-3 animate-fadeIn"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded bg-amber-400 text-stone-950 border-2 border-stone-900 flex items-center justify-center font-black text-xs shrink-0 shadow-[1px_1px_0px_#000]">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-stone-950 dark:text-stone-100 truncate">{item.nama}</div>
                          <div className="text-[11px] text-stone-600 dark:text-stone-400 font-semibold">
                            <span className="font-mono font-black text-stone-950 dark:text-stone-100">
                              {item.jumlah} {item.satuan}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(idx)}
                        disabled={isSubmitting}
                        className="p-1.5 text-stone-700 dark:text-stone-300 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded border border-transparent hover:border-stone-900 transition-colors shrink-0"
                        title="Hapus dari keranjang"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-stone-900 dark:text-stone-100 mb-1">
                  Tanggal Pinjam <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={isSubmitting}
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-stone-900 dark:border-stone-400 rounded-lg focus:ring-2 focus:ring-amber-400 text-stone-950 dark:text-stone-100 text-xs font-bold bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b]"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-bold text-stone-900 dark:text-stone-100 mb-1">
                  Tujuan Peminjaman & Lokasi Kerja <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  disabled={isSubmitting}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Peminjaman untuk pembersihan karpet ruang serbaguna lantai 2."
                  className="w-full px-3 py-2 border-2 border-stone-900 dark:border-stone-400 rounded-lg focus:ring-2 focus:ring-amber-400 text-stone-950 dark:text-stone-100 text-xs font-medium bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b]"
                />
              </div>
            </div>

            {isSubmitting && submitProgress && (
              <div className="p-3 bg-amber-200 border-2 border-stone-900 rounded-lg text-stone-950 text-xs font-bold flex items-center gap-2 shadow-[2.5px_2.5px_0px_#18181b]">
                <div className="w-4 h-4 neo-spinner-multicolor shrink-0" />
                <span>{submitProgress}</span>
              </div>
            )}

            <div className="pt-4 border-t-2 border-stone-900 dark:border-stone-700 flex items-center justify-between">
              <span className="text-[11px] text-stone-600 dark:text-stone-400 font-bold">
                {cart.length > 0
                  ? `${cart.length} item akan dicatat berurutan via POST action=transaction.`
                  : 'Tambahkan barang ke keranjang terlebih dahulu.'}
              </span>
              <button
                type="submit"
                disabled={isSubmitting || isLoading || cart.length === 0 || !selectedMemberId || !tanggal || !keterangan.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-stone-950 bg-amber-400 hover:bg-amber-300 border-2 border-stone-900 rounded-lg shadow-[3px_3px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#18181b] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 neo-spinner-multicolor shrink-0" />
                    <span>Menyimpan ke GAS...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Catat {cart.length > 0 ? `${cart.length} ` : ''}Peminjaman</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 p-4 space-y-3 text-xs shadow-[4px_4px_0px_#18181b]">
            <h4 className="font-black text-stone-950 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-700 pb-2 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 stroke-[2.5]" />
              <span>Ketersediaan Stok</span>
            </h4>

            {selectedItem && (
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b-2 border-stone-100 dark:border-stone-800">
                  <span className="text-stone-600 dark:text-stone-400 font-semibold">Stok di Gudang (GAS)</span>
                  <span
                    className={`font-mono font-black tabular-nums ${
                      isOutOfStock ? 'text-rose-600 dark:text-rose-400' : 'text-stone-950 dark:text-stone-100'
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
