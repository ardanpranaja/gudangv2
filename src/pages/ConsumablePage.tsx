import React, { useState, useMemo } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Building2,
  Package,
  Layers,
  HelpCircle,
  Info,
  ShoppingCart,
  Boxes,
} from 'lucide-react';
import { SearchableSelect, SearchableSelectOption } from '../components/common/SearchableSelect';
import { MasterMember, MasterItem, ItemStock } from '../types';
import {
  CONSUMABLE_ITEMS_CONFIG,
  CONSUMABLE_ITEM_IDS,
  calculateConsumableConversion,
  ConsumableItemConfig,
} from '../utils/consumableConfig';
import { api, normalizeGasErrorMessage } from '../services/api';
import { useApp } from '../context/AppContext';

export interface CartItem {
  id: string;
  name: string;
  category: 'TISU' | 'PLASTIK';
  subCategory?: string;
  orderUnit: 'roll' | 'pack' | 'lembar';
  orderQty: number;
  sendQty: number; // Quantity in master stock unit (roll/pack) to be sent to backend
  conversionText: string;
  config: ConsumableItemConfig;
}

interface ConsumableFormProps {
  members: MasterMember[];
  items: MasterItem[];
  stocks: ItemStock[];
  memberMap: Map<string, MasterMember>;
  itemMap: Map<string, MasterItem>;
  stockMap: Map<string, ItemStock>;
  selectedMemberId: string;
  setSelectedMemberId: (id: string) => void;
  onSuccess: () => Promise<void>;
  onLastItemChange?: (item: MasterItem | null, isReady: boolean) => void;
}

export const ConsumableForm: React.FC<ConsumableFormProps> = ({
  members,
  items,
  stocks,
  memberMap,
  itemMap,
  stockMap,
  selectedMemberId,
  setSelectedMemberId,
  onSuccess,
  onLastItemChange,
}) => {
  const { addToast } = useApp();

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Item Selector & Add Form state
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<'roll' | 'pack' | 'lembar'>('lembar');
  const [inputQty, setInputQty] = useState<number>(1);

  // Submission state
  const [formAlasan, setFormAlasan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    createdIds: string[];
    failedItems: string[];
  } | null>(null);

  // Selected Member Object
  const selectedMemberObj = useMemo(() => {
    return memberMap.get(selectedMemberId) || null;
  }, [selectedMemberId, memberMap]);

  // Member Search Options (Name, Jabatan, Lantai badge)
  const memberOptions: SearchableSelectOption[] = useMemo(() => {
    return members
      .filter((m) => m.STATUS === 'AKTIF')
      .map((m) => ({
        value: m.ID_MEMBER,
        label: m.NAMA_MEMBER,
        sublabel: m.JABATAN || 'Personil Lapangan',
        badge: m.LANTAI ? `Lantai ${m.LANTAI}` : undefined,
        extra: `${m.NAMA_MEMBER} ${m.JABATAN || ''} Lantai ${m.LANTAI || ''}`,
      }));
  }, [members]);

  // Consumable Items List (Only the 14 explicit IDs)
  const consumableOptions: SearchableSelectOption[] = useMemo(() => {
    // Collect the 14 consumable items
    return CONSUMABLE_ITEM_IDS.map((id) => {
      const cfg = CONSUMABLE_ITEMS_CONFIG[id];
      const master = itemMap.get(id);
      const stock = stockMap.get(id);
      const isReady = stock ? stock.stok > 0 : false;

      const displayName = master?.NAMA_ITEM || cfg.name;
      const sublabel = cfg.category === 'TISU'
        ? `Tisu (${cfg.subCategory}) • Satuan: ${cfg.masterUnit} (1 box = ${cfg.unitsPerBox} ${cfg.masterUnit})`
        : `Plastik (${cfg.subCategory}) • 1 pack = ${cfg.unitsPerPack} lembar`;

      return {
        value: id,
        label: displayName,
        sublabel,
        badge: isReady ? 'READY' : 'KOSONG',
        badgeColor: isReady ? 'green' : 'rose',
        disabled: !isReady,
        extra: `${displayName} ${cfg.category} ${cfg.subCategory || ''} ${id}`,
      };
    });
  }, [itemMap, stockMap]);

  // Currently Selected Consumable Config & Stock
  const currentConfig = useMemo(() => {
    return CONSUMABLE_ITEMS_CONFIG[selectedItemId] || null;
  }, [selectedItemId]);

  const currentItemObj = useMemo(() => {
    return itemMap.get(selectedItemId) || null;
  }, [selectedItemId, itemMap]);

  const currentItemReady = useMemo(() => {
    if (!selectedItemId) return false;
    const stock = stockMap.get(selectedItemId);
    return stock ? stock.stok > 0 : false;
  }, [selectedItemId, stockMap]);

  // Update default unit when selectedItemId changes
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    const cfg = CONSUMABLE_ITEMS_CONFIG[itemId];
    if (cfg) {
      if (cfg.category === 'TISU') {
        setSelectedUnit(cfg.masterUnit);
      } else {
        // Default to 'lembar' for plastic as crew commonly requests sheets
        setSelectedUnit('lembar');
      }
    }
    if (onLastItemChange) {
      const itm = itemMap.get(itemId) || null;
      const stock = stockMap.get(itemId);
      const isReady = stock ? stock.stok > 0 : false;
      onLastItemChange(itm, isReady);
    }
  };

  // Live conversion calculation for the current input
  const liveConversion = useMemo(() => {
    if (!selectedItemId || inputQty <= 0) return null;
    return calculateConsumableConversion(selectedItemId, inputQty, selectedUnit);
  }, [selectedItemId, inputQty, selectedUnit]);

  // Add Item to Cart
  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !currentConfig || inputQty <= 0) return;
    if (!currentItemReady) {
      addToast('warning', 'Stok Kosong', 'Barang ini sedang habis di gudang dan tidak dapat diajukan.');
      return;
    }

    const conversion = calculateConsumableConversion(selectedItemId, inputQty, selectedUnit);
    const existingIdx = cart.findIndex((c) => c.id === selectedItemId);

    if (existingIdx >= 0) {
      const existing = cart[existingIdx];
      // Combine quantity
      let combinedOrderQty = existing.orderQty;
      let effectiveUnit = existing.orderUnit;

      if (existing.orderUnit === selectedUnit) {
        combinedOrderQty += inputQty;
      } else {
        // If different units for plastic (e.g. one in pack, one in lembar), convert to pack
        const perPack = currentConfig.unitsPerPack || 1;
        const existingInPack = existing.orderUnit === 'pack' ? existing.orderQty : existing.orderQty / perPack;
        const newInPack = selectedUnit === 'pack' ? inputQty : inputQty / perPack;
        combinedOrderQty = Math.ceil(existingInPack + newInPack);
        effectiveUnit = 'pack';
      }

      const newConversion = calculateConsumableConversion(selectedItemId, combinedOrderQty, effectiveUnit);

      const updated = [...cart];
      updated[existingIdx] = {
        ...existing,
        orderUnit: effectiveUnit,
        orderQty: combinedOrderQty,
        sendQty: newConversion.sendQty,
        conversionText: newConversion.conversionText,
      };

      setCart(updated);
      addToast(
        'info',
        'Item Digabungkan',
        `Jumlah ${currentConfig.name} diperbarui menjadi ${newConversion.conversionText}.`
      );
    } else {
      // New item in cart
      const newItem: CartItem = {
        id: selectedItemId,
        name: currentItemObj?.NAMA_ITEM || currentConfig.name,
        category: currentConfig.category,
        subCategory: currentConfig.subCategory,
        orderUnit: selectedUnit,
        orderQty: inputQty,
        sendQty: conversion.sendQty,
        conversionText: conversion.conversionText,
        config: currentConfig,
      };

      setCart([...cart, newItem]);
      addToast('success', 'Ditambahkan ke Keranjang', `${newItem.name} (${conversion.conversionText}) ditambahkan.`);
    }

    // Safely notify parent about the last selected/added item for AI bubble context
    if (onLastItemChange && currentItemObj) {
      onLastItemChange(currentItemObj, true);
    }

    // Reset item selector input
    setSelectedItemId('');
    setInputQty(1);
    setSubmissionResult(null);
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (index: number) => {
    const removed = cart[index];
    const updated = cart.filter((_, idx) => idx !== index);
    setCart(updated);
    if (removed) {
      addToast('info', 'Item Dihapus', `${removed.name} telah dikeluarkan dari keranjang.`);
    }
  };

  // Submit All Orders in Cart
  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      addToast('warning', 'Pilih Nama', 'Silakan pilih nama pemohon terlebih dahulu.');
      return;
    }
    if (cart.length === 0) {
      addToast('warning', 'Keranjang Kosong', 'Tambahkan minimal satu item consumable ke keranjang.');
      return;
    }
    if (!formAlasan.trim()) {
      addToast('warning', 'Alasan Kosong', 'Alasan permohonan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);

    const createdIds: string[] = [];
    const failedItems: string[] = [];
    const remainingCart: CartItem[] = [];

    const total = cart.length;

    try {
      for (let i = 0; i < total; i++) {
        const item = cart[i];
        setSubmitProgress(`Mengirim item ${i + 1} dari ${total}: ${item.name} (${item.sendQty} ${item.config.masterUnit})...`);

        try {
          const res = await api.submitRequest({
            memberId: selectedMemberId,
            itemId: item.id,
            jumlah: item.sendQty, // Always in master stock unit (roll/pack)
            alasan: formAlasan.trim(),
          });

          if (res && res.ID_PENGAJUAN) {
            createdIds.push(res.ID_PENGAJUAN);
          } else {
            createdIds.push(`BERHASIL (${item.id})`);
          }
        } catch (err: unknown) {
          const errDetail = normalizeGasErrorMessage(err, undefined, `Gagal memproses item ${item.name}`);
          failedItems.push(`${item.name}: ${errDetail}`);
          remainingCart.push(item); // Keep failed item in cart so user can retry!
        }
      }

      // Result handling
      if (failedItems.length === 0) {
        // Complete Success
        setSubmissionResult({
          success: true,
          createdIds,
          failedItems: [],
        });
        setCart([]);
        setFormAlasan('');
        addToast(
          'success',
          'Semua Pesanan Terkirim',
          `Berhasil mengajukan ${createdIds.length} item consumable ke gudang.`
        );
      } else {
        // Partial or Complete Failure
        setSubmissionResult({
          success: false,
          createdIds,
          failedItems,
        });
        setCart(remainingCart);
        addToast(
          'warning',
          'Sebagian Permintaan Gagal',
          `${createdIds.length} item berhasil, ${failedItems.length} item gagal terkirim. Item yang gagal tetap berada di keranjang.`
        );
      }

      // Refresh backend requests
      await onSuccess();
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Terjadi kendala saat mengirim pengajuan consumable.');
      addToast('error', 'Gagal Mengirim', msg);
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Permintaan & Panduan Singkat Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT / MAIN COLUMN: FORM CARD */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-xs">
          {/* Header Gradient */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-stone-950 text-white p-5 sm:p-6 border-b border-stone-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold truncate">
                    Form Permintaan Consumable (Tisu &amp; Plastik)
                  </h3>
                  <p className="text-xs text-stone-300 truncate">
                    Pesan multi-item tisu &amp; plastik sampah dalam satu pengajuan keranjang
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                <Boxes className="w-3.5 h-3.5" />
                <span>Multi-Item Keranjang</span>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-5 sm:p-6 space-y-6 text-xs">
            {/* Success / Partial Banner */}
            {submissionResult && (
              <div
                className={`p-4 rounded-xl border animate-fadeIn ${
                  submissionResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {submissionResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-bold text-sm">
                      {submissionResult.success
                        ? 'Pengajuan Consumable Berhasil Dikirimkan!'
                        : 'Hasil Pengiriman Pesanan Consumable'}
                    </h4>
                    {submissionResult.createdIds.length > 0 && (
                      <div className="text-xs">
                        <span className="font-medium">
                          {submissionResult.createdIds.length} Pengajuan Berhasil Terbentuk:
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1 font-mono font-bold text-[11px]">
                          {submissionResult.createdIds.map((id, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-white dark:bg-stone-900 border border-emerald-300 text-emerald-800 shadow-2xs"
                            >
                              {id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {submissionResult.failedItems.length > 0 && (
                      <div className="text-xs text-rose-800 mt-2 space-y-1">
                        <span className="font-semibold text-rose-900">
                          {submissionResult.failedItems.length} Item Gagal Terkirim (Tersimpan di Keranjang):
                        </span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {submissionResult.failedItems.map((failMsg, idx) => (
                            <li key={idx}>{failMsg}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* STEP 1: PILIH NAMA */}
            {/* =============================================================== */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60/50 space-y-3 dark:bg-stone-800/60">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                    selectedMemberId ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-stone-200 text-stone-700 dark:text-stone-200'
                  }`}
                >
                  {selectedMemberId ? <Check className="w-4 h-4 text-white" /> : '1'}
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-stone-100">
                    Pilih Nama Anda <span className="text-rose-500">*</span>
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Cari nama pemohon sesuai penempatan lantai tugas
                  </p>
                </div>
              </div>

              <SearchableSelect
                value={selectedMemberId}
                onChange={(val) => setSelectedMemberId(val)}
                options={memberOptions}
                placeholder="Cari nama Anda..."
                searchPlaceholder="Cari nama atau jabatan pemohon..."
                minimalTrigger
                required
              />

              {/* Kartu Identitas Ringkas Member */}
              {selectedMemberObj && (
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs animate-fadeIn">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {selectedMemberObj.NAMA_MEMBER.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {selectedMemberObj.NAMA_MEMBER}
                      </div>
                      <div className="text-[11px] text-stone-600 dark:text-stone-400 truncate">
                        {selectedMemberObj.JABATAN || 'Personil Lapangan'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-stone-900 border border-emerald-300 text-emerald-900 font-bold text-[11px] shadow-2xs">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{selectedMemberObj.LANTAI ? `Lantai ${selectedMemberObj.LANTAI}` : 'Lantai -'}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* =============================================================== */}
            {/* STEP 2: KERANJANG TISU & PLASTIK */}
            {/* =============================================================== */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60/50 space-y-4 dark:bg-stone-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      cart.length > 0 ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-stone-200 text-stone-700 dark:text-stone-200'
                    }`}
                  >
                    {cart.length > 0 ? <Check className="w-4 h-4 text-white" /> : '2'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-900 dark:text-stone-100">
                      Keranjang Tisu &amp; Plastik <span className="text-rose-500">*</span>
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Pilih barang, tentukan satuan dan jumlah, lalu tambahkan ke daftar pesanan
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-stone-200 font-bold text-stone-700 dark:text-stone-200 text-[11px]">
                  {cart.length} item di keranjang
                </span>
              </div>

              {/* Sub-form: Tambah Item */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-3.5 shadow-2xs">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-200">
                    Pilih Item Consumable (14 Item Khusus):
                  </label>
                  <SearchableSelect
                    value={selectedItemId}
                    onChange={handleItemSelect}
                    options={consumableOptions}
                    placeholder="Cari tisu atau plastik..."
                    searchPlaceholder="Ketik nama tisu atau ukuran plastik sampah..."
                    minimalTrigger
                  />
                </div>

                {/* Info Card when item selected */}
                {selectedItemId && currentConfig && (
                  <div className="space-y-3 pt-1 border-t border-stone-100 animate-fadeIn">
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                      <div className="min-w-0">
                        <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {currentItemObj?.NAMA_ITEM || currentConfig.name}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400">
                          {currentConfig.category === 'TISU'
                            ? `Kategori Tisu (${currentConfig.subCategory}) • 1 box = ${currentConfig.unitsPerBox} ${currentConfig.masterUnit}`
                            : `Plastik Sampah ${currentConfig.subCategory} • 1 pack = ${currentConfig.unitsPerPack} lembar`}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {currentItemReady ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                            READY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                            KOSONG
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unit Selection & Quantity Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      {/* Unit Choice */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-200">Satuan Pesan:</label>
                        {currentConfig.category === 'PLASTIK' ? (
                          <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                            <button
                              type="button"
                              onClick={() => setSelectedUnit('lembar')}
                              className={`flex-1 py-1 rounded text-center font-semibold text-xs transition-colors ${
                                selectedUnit === 'lembar'
                                  ? 'bg-white dark:bg-stone-900 text-emerald-800 shadow-2xs'
                                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                              }`}
                            >
                              Lembar
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedUnit('pack')}
                              className={`flex-1 py-1 rounded text-center font-semibold text-xs transition-colors ${
                                selectedUnit === 'pack'
                                  ? 'bg-white dark:bg-stone-900 text-emerald-800 shadow-2xs'
                                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                              }`}
                            >
                              Pack
                            </button>
                          </div>
                        ) : (
                          <div className="px-3 py-2 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-200 font-semibold uppercase text-xs">
                            {currentConfig.masterUnit}
                          </div>
                        )}
                      </div>

                      {/* Quantity Input */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-200">Jumlah:</label>
                        <input
                          type="number"
                          min={1}
                          value={inputQty}
                          onChange={(e) => setInputQty(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg focus:ring-1 focus:ring-amber-700 font-mono text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900"
                        />
                      </div>

                      {/* Add Button */}
                      <div>
                        <button
                          type="button"
                          onClick={handleAddToCart}
                          disabled={!currentItemReady || inputQty <= 0}
                          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah ke Daftar</span>
                        </button>
                      </div>
                    </div>

                    {/* Live Conversion Banner */}
                    {liveConversion && (
                      <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-950 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-teal-700 shrink-0" />
                          <span>
                            <strong>Perhitungan Konversi:</strong> {liveConversion.conversionText}
                          </span>
                        </div>
                        {currentConfig.category === 'PLASTIK' && selectedUnit === 'lembar' && (
                          <span className="text-[10px] text-teal-800 font-medium shrink-0">
                            (Pembulatan ke atas: {liveConversion.sendQty} pack)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold text-stone-700 dark:text-stone-200">
                  Daftar Pesanan Siap Dikirim ({cart.length} item):
                </div>

                {cart.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-600 text-center text-stone-400 dark:text-stone-500 space-y-1 bg-white dark:bg-stone-900">
                    <ShoppingCart className="w-6 h-6 mx-auto text-stone-300" />
                    <p className="font-medium text-xs text-stone-600 dark:text-stone-400">Keranjang masih kosong</p>
                    <p className="text-[11px] text-stone-400 dark:text-stone-500">
                      Pilih tisu atau plastik di atas lalu klik &ldquo;Tambah ke Daftar&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3 shadow-2xs hover:border-stone-300 transition-colors animate-fadeIn"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">{item.name}</div>
                            <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-stone-800 dark:text-stone-200">
                                Pesan: {item.orderQty} {item.orderUnit}
                              </span>
                              <span className="text-stone-300">•</span>
                              <span className="text-teal-700 font-medium bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                {item.conversionText}
                              </span>
                              <span className="text-stone-400 dark:text-stone-500 text-[10px] font-mono">
                                (Backend: {item.sendQty} {item.config.masterUnit})
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="p-1.5 text-stone-400 dark:text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                          title="Hapus item dari keranjang"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* =============================================================== */}
            {/* STEP 3: ALASAN & KIRIM SEMUA */}
            {/* =============================================================== */}
            <form onSubmit={handleSubmitAll} className="space-y-4">
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60/50 space-y-3 dark:bg-stone-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        formAlasan.trim().length > 0
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-stone-200 text-stone-700 dark:text-stone-200'
                      }`}
                    >
                      {formAlasan.trim().length > 0 ? <Check className="w-4 h-4 text-white" /> : '3'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-stone-900 dark:text-stone-100">
                        Alasan Permintaan Consumable <span className="text-rose-500">*</span>
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        Satu alasan berlaku untuk seluruh item di dalam keranjang
                      </p>
                    </div>
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={formAlasan}
                  onChange={(e) => setFormAlasan(e.target.value)}
                  placeholder="Contoh: Kebutuhan operasional tisu toilet dan plastik sampah pembersihan area lantai 2..."
                  required
                  className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg focus:ring-1 focus:ring-amber-700 text-stone-900 dark:text-stone-100 text-xs bg-white dark:bg-stone-900"
                />
              </div>

              {/* Submit Action Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-stone-100">
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  {cart.length > 0 ? (
                    <span>
                      Total <strong>{cart.length} jenis item</strong> akan dikirimkan berurutan ke backend GAS.
                    </span>
                  ) : (
                    <span>Tambahkan item ke keranjang sebelum mengirimkan.</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || cart.length === 0 || !selectedMemberId || !formAlasan.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:shadow"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>{submitProgress || 'Mengirim Pesanan...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Semua Pesanan ({cart.length} Item)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: PANDUAN KONVERSI PANEL */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-xs">Panduan Satuan &amp; Konversi</h3>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">Standar isi box tisu &amp; pack plastik</p>
              </div>
            </div>

            {/* Konversi Tisu */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>Standar Konversi Tisu:</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-stone-600 dark:text-stone-400">
                <li className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex justify-between items-center">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">Tissue Roll</span>
                  <span className="font-mono text-emerald-700 font-bold">1 box = 100 roll</span>
                </li>
                <li className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex justify-between items-center">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">Tissue Roll Jumbo</span>
                  <span className="font-mono text-emerald-700 font-bold">1 box = 16 roll</span>
                </li>
                <li className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex justify-between items-center">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">Tissue Hand Towel</span>
                  <span className="font-mono text-emerald-700 font-bold">1 box = 24 pack</span>
                </li>
                <li className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex justify-between items-center">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">Tissue Kotak</span>
                  <span className="font-mono text-emerald-700 font-bold">1 box = 40 pack</span>
                </li>
              </ul>
            </div>

            {/* Konversi Plastik Sampah */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="text-[11px] font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                <span>Standar Plastik Sampah:</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-stone-600 dark:text-stone-400">
                <li className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex justify-between items-center">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">Ukuran 50x75</span>
                  <span className="font-mono text-emerald-700 font-bold">1 pack = 24 lembar</span>
                </li>
                <li className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex justify-between items-center">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">Ukuran 60x100</span>
                  <span className="font-mono text-emerald-700 font-bold">1 pack = 12 lembar</span>
                </li>
                <li className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex justify-between items-center">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">Ukuran 90x120</span>
                  <span className="font-mono text-emerald-700 font-bold">1 pack = 6 lembar</span>
                </li>
              </ul>
            </div>

            {/* Aturan Kirim Plastik Note */}
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-950 text-[11px] space-y-1">
              <div className="font-bold flex items-center gap-1 text-amber-900">
                <Info className="w-3.5 h-3.5 text-amber-700" />
                <span>Aturan Kirim Plastik:</span>
              </div>
              <p className="leading-relaxed">
                Stok master gudang tercatat dalam satuan <strong>pack</strong>. Jika Anda memesan dalam satuan <strong>lembar</strong>, sistem otomatis membulatkan ke atas ke pack terdekat agar fisik gudang dapat disiapkan secara utuh.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Also export as default or full page wrapper if needed
export const ConsumablePage: React.FC = () => {
  const { role } = useApp();
  return null; // Rendered primarily inside PengajuanPage tab
};
