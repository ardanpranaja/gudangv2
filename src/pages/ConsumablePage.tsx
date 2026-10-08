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
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 overflow-hidden shadow-[5px_5px_0px_#18181b]">
          {/* Header Neo Brutalism */}
          <div className="bg-emerald-300 dark:bg-stone-800 text-stone-950 dark:text-stone-100 p-5 sm:p-6 border-b-2 border-stone-900 dark:border-stone-700">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-stone-950 text-emerald-300 border-2 border-stone-950 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#fff]">
                  <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black truncate">
                    Form Permintaan Consumable (Tisu &amp; Plastik)
                  </h3>
                  <p className="text-xs text-stone-800 dark:text-stone-300 font-semibold truncate">
                    Pesan multi-item tisu &amp; plastik sampah dalam satu pengajuan keranjang
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-stone-900 border-2 border-stone-900 text-stone-950 dark:text-stone-100 text-xs font-black shadow-[2px_2px_0px_#18181b]">
                <Boxes className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Multi-Item Keranjang</span>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-5 sm:p-6 space-y-6 text-xs">
            {/* Success / Partial Banner */}
            {submissionResult && (
              <div
                className={`p-4 rounded-xl border-2 border-stone-900 animate-fadeIn shadow-[4px_4px_0px_#18181b] ${
                  submissionResult.success
                    ? 'bg-emerald-100 text-stone-950'
                    : 'bg-amber-100 text-stone-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {submissionResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5 stroke-[2.5]" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5 stroke-[2.5]" />
                  )}
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-black text-sm">
                      {submissionResult.success
                        ? 'Pengajuan Consumable Berhasil Dikirimkan!'
                        : 'Hasil Pengiriman Pesanan Consumable'}
                    </h4>
                    {submissionResult.createdIds.length > 0 && (
                      <div className="text-xs font-bold">
                        <span>
                          {submissionResult.createdIds.length} Pengajuan Berhasil Terbentuk:
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1 font-mono font-black text-[11px]">
                          {submissionResult.createdIds.map((id, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-white border-2 border-stone-900 text-stone-950 shadow-[1.5px_1.5px_0px_#18181b]"
                            >
                              {id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {submissionResult.failedItems.length > 0 && (
                      <div className="text-xs text-rose-900 mt-2 space-y-1 font-bold">
                        <span>
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
            <div className="p-4 rounded-xl border-2 border-stone-900 dark:border-stone-500 bg-stone-50 dark:bg-stone-800/80 space-y-3 shadow-[3px_3px_0px_#18181b]">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded border-2 border-stone-900 flex items-center justify-center font-black text-xs shrink-0 transition-colors shadow-[1.5px_1.5px_0px_#000] ${
                    selectedMemberId ? 'bg-amber-400 text-stone-950' : 'bg-white text-stone-700 dark:text-stone-200 dark:bg-stone-700'
                  }`}
                >
                  {selectedMemberId ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
                </div>
                <div>
                  <h4 className="font-black text-stone-950 dark:text-stone-100">
                    Pilih Nama Anda <span className="text-rose-600">*</span>
                  </h4>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
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
                <div className="p-3 rounded-xl bg-emerald-100 border-2 border-stone-900 flex items-center justify-between text-xs animate-fadeIn shadow-[2px_2px_0px_#18181b]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-stone-950 text-emerald-300 border border-stone-900 flex items-center justify-center font-black text-xs shrink-0">
                      {selectedMemberObj.NAMA_MEMBER.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-stone-950 truncate">
                        {selectedMemberObj.NAMA_MEMBER}
                      </div>
                      <div className="text-[11px] text-stone-700 truncate font-semibold">
                        {selectedMemberObj.JABATAN || 'Personil Lapangan'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border-2 border-stone-900 text-stone-950 font-black text-[11px] shadow-[1.5px_1.5px_0px_#18181b]">
                      <Building2 className="w-3.5 h-3.5 text-emerald-800 stroke-[2.5]" />
                      <span>{selectedMemberObj.LANTAI ? `Lantai ${selectedMemberObj.LANTAI}` : 'Lantai -'}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* =============================================================== */}
            {/* STEP 2: KERANJANG TISU & PLASTIK */}
            {/* =============================================================== */}
            <div className="p-4 rounded-xl border-2 border-stone-900 dark:border-stone-500 bg-stone-50 dark:bg-stone-800/80 space-y-4 shadow-[3px_3px_0px_#18181b]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded border-2 border-stone-900 flex items-center justify-center font-black text-xs shrink-0 transition-colors shadow-[1.5px_1.5px_0px_#000] ${
                      cart.length > 0 ? 'bg-amber-400 text-stone-950' : 'bg-white text-stone-700 dark:text-stone-200 dark:bg-stone-700'
                    }`}
                  >
                    {cart.length > 0 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
                  </div>
                  <div>
                    <h4 className="font-black text-stone-950 dark:text-stone-100">
                      Keranjang Tisu &amp; Plastik <span className="text-rose-600">*</span>
                    </h4>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
                      Pilih barang, tentukan satuan dan jumlah, lalu tambahkan ke daftar pesanan
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded bg-yellow-300 border-2 border-stone-900 font-black text-stone-950 text-[11px] shadow-[1.5px_1.5px_0px_#18181b]">
                  {cart.length} item di keranjang
                </span>
              </div>

              {/* Sub-form: Tambah Item */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-500 space-y-3.5 shadow-[2.5px_2.5px_0px_#18181b]">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-stone-900 dark:text-stone-100">
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
                  <div className="space-y-3 pt-1 border-t-2 border-stone-900 dark:border-stone-700 animate-fadeIn">
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-600 shadow-[2px_2px_0px_#18181b]">
                      <div className="min-w-0">
                        <div className="font-black text-stone-950 dark:text-stone-100 truncate">
                          {currentItemObj?.NAMA_ITEM || currentConfig.name}
                        </div>
                        <div className="text-[11px] text-stone-600 dark:text-stone-400 font-semibold">
                          {currentConfig.category === 'TISU'
                            ? `Kategori Tisu (${currentConfig.subCategory}) • 1 box = ${currentConfig.unitsPerBox} ${currentConfig.masterUnit}`
                            : `Plastik Sampah ${currentConfig.subCategory} • 1 pack = ${currentConfig.unitsPerPack} lembar`}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {currentItemReady ? (
                          <span className="px-2.5 py-0.5 rounded bg-emerald-300 border-2 border-stone-900 text-stone-950 font-black text-[10px] shadow-[1px_1px_0px_#000]">
                            READY
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded bg-rose-300 border-2 border-stone-900 text-stone-950 font-black text-[10px] shadow-[1px_1px_0px_#000]">
                            KOSONG
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unit Selection & Quantity Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      {/* Unit Choice */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-900 dark:text-stone-100">Satuan Pesan:</label>
                        {currentConfig.category === 'PLASTIK' ? (
                          <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg border-2 border-stone-900 dark:border-stone-600 shadow-[1.5px_1.5px_0px_#18181b]">
                            <button
                              type="button"
                              onClick={() => setSelectedUnit('lembar')}
                              className={`flex-1 py-1 rounded text-center font-black text-xs transition-colors ${
                                selectedUnit === 'lembar'
                                  ? 'bg-amber-300 text-stone-950 border border-stone-900 shadow-[1px_1px_0px_#000]'
                                  : 'text-stone-700 dark:text-stone-300 hover:text-stone-950'
                              }`}
                            >
                              Lembar
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedUnit('pack')}
                              className={`flex-1 py-1 rounded text-center font-black text-xs transition-colors ${
                                selectedUnit === 'pack'
                                  ? 'bg-amber-300 text-stone-950 border border-stone-900 shadow-[1px_1px_0px_#000]'
                                  : 'text-stone-700 dark:text-stone-300 hover:text-stone-950'
                              }`}
                            >
                              Pack
                            </button>
                          </div>
                        ) : (
                          <div className="px-3 py-2 bg-stone-50 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-600 rounded-lg text-stone-950 dark:text-stone-100 font-black uppercase text-xs shadow-[1.5px_1.5px_0px_#18181b]">
                            {currentConfig.masterUnit}
                          </div>
                        )}
                      </div>

                      {/* Quantity Input */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-900 dark:text-stone-100">Jumlah:</label>
                        <input
                          type="number"
                          min={1}
                          value={inputQty}
                          onChange={(e) => setInputQty(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3 py-2 border-2 border-stone-900 dark:border-stone-400 rounded-lg font-mono font-bold text-stone-950 dark:text-stone-100 bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b]"
                        />
                      </div>

                      {/* Add Button */}
                      <div>
                        <button
                          type="button"
                          onClick={handleAddToCart}
                          disabled={!currentItemReady || inputQty <= 0}
                          className="w-full py-2 px-3 bg-emerald-300 hover:bg-emerald-400 text-stone-950 border-2 border-stone-900 rounded-lg font-black transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-[3px_3px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#18181b]"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>Tambah ke Daftar</span>
                        </button>
                      </div>
                    </div>

                    {/* Live Conversion Banner */}
                    {liveConversion && (
                      <div className="p-2.5 rounded-lg bg-cyan-100 border-2 border-stone-900 text-stone-950 flex items-center justify-between text-xs shadow-[2px_2px_0px_#18181b]">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Info className="w-4 h-4 text-stone-950 shrink-0 stroke-[2.5]" />
                          <span>
                            <strong>Perhitungan Konversi:</strong> {liveConversion.conversionText}
                          </span>
                        </div>
                        {currentConfig.category === 'PLASTIK' && selectedUnit === 'lembar' && (
                          <span className="text-[10px] text-stone-800 font-black shrink-0">
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
                <div className="text-xs font-black text-stone-950 dark:text-stone-100">
                  Daftar Pesanan Siap Dikirim ({cart.length} item):
                </div>

                {cart.length === 0 ? (
                  <div className="p-4 rounded-xl border-2 border-dashed border-stone-400 dark:border-stone-600 text-center text-stone-500 space-y-1 bg-white dark:bg-stone-900">
                    <ShoppingCart className="w-6 h-6 mx-auto text-stone-400" />
                    <p className="font-bold text-xs text-stone-800 dark:text-stone-300">Keranjang masih kosong</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                      Pilih tisu atau plastik di atas lalu klik &ldquo;Tambah ke Daftar&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 flex items-center justify-between gap-3 shadow-[2.5px_2.5px_0px_#18181b] animate-fadeIn"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded bg-amber-400 text-stone-950 border-2 border-stone-900 flex items-center justify-center font-black text-[10px] shrink-0 shadow-[1px_1px_0px_#000]">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-stone-950 dark:text-stone-100 truncate">{item.name}</div>
                            <div className="text-[11px] text-stone-600 dark:text-stone-400 flex items-center gap-2 flex-wrap font-semibold">
                              <span className="font-bold text-stone-950 dark:text-stone-100">
                                Pesan: {item.orderQty} {item.orderUnit}
                              </span>
                              <span>•</span>
                              <span className="text-stone-950 font-bold bg-cyan-200 px-1.5 py-0.5 rounded border border-stone-900">
                                {item.conversionText}
                              </span>
                              <span className="text-stone-600 dark:text-stone-400 text-[10px] font-mono">
                                (Backend: {item.sendQty} {item.config.masterUnit})
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="p-1.5 text-stone-700 dark:text-stone-300 hover:text-rose-600 hover:bg-rose-100 rounded border border-transparent hover:border-stone-900 transition-colors shrink-0"
                          title="Hapus item dari keranjang"
                        >
                          <Trash2 className="w-4 h-4 stroke-[2.5]" />
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
              <div className="p-4 rounded-xl border-2 border-stone-900 dark:border-stone-500 bg-stone-50 dark:bg-stone-800/80 space-y-3 shadow-[3px_3px_0px_#18181b]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded border-2 border-stone-900 flex items-center justify-center font-black text-xs shrink-0 transition-colors shadow-[1.5px_1.5px_0px_#000] ${
                        formAlasan.trim().length > 0
                          ? 'bg-amber-400 text-stone-950'
                          : 'bg-white text-stone-700 dark:text-stone-200 dark:bg-stone-700'
                      }`}
                    >
                      {formAlasan.trim().length > 0 ? <Check className="w-4 h-4 stroke-[3]" /> : '3'}
                    </div>
                    <div>
                      <h4 className="font-black text-stone-950 dark:text-stone-100">
                        Alasan Permintaan Consumable <span className="text-rose-600">*</span>
                      </h4>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
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
                  className="w-full px-3 py-2 border-2 border-stone-900 dark:border-stone-400 rounded-lg focus:ring-2 focus:ring-amber-400 text-stone-950 dark:text-stone-100 text-xs font-medium bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b]"
                />
              </div>

              {/* Submit Action Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t-2 border-stone-900 dark:border-stone-700">
                <div className="text-[11px] text-stone-600 dark:text-stone-400 font-bold">
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
                  className="w-full sm:w-auto px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 border-2 border-stone-900 rounded-xl font-black transition-all inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[3px_3px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#18181b]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 neo-spinner-multicolor shrink-0" />
                      <span>{submitProgress || 'Mengirim Pesanan...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 stroke-[2.5]" />
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
          <div className="bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 p-5 shadow-[4.5px_4.5px_0px_#18181b] space-y-4 text-xs">
            <div className="flex items-center gap-2 border-b-2 border-stone-900 dark:border-stone-700 pb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-300 border-2 border-stone-900 text-stone-950 flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#000]">
                <HelpCircle className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-black text-stone-950 dark:text-stone-100 text-xs">Panduan Satuan &amp; Konversi</h3>
                <p className="text-[10px] text-stone-600 dark:text-stone-400 font-semibold">Standar isi box tisu &amp; pack plastik</p>
              </div>
            </div>

            {/* Konversi Tisu */}
            <div className="space-y-2">
              <div className="text-[11px] font-black text-stone-950 dark:text-stone-100 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-stone-950 dark:text-stone-200 stroke-[2.5]" />
                <span>Standar Konversi Tisu:</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-stone-700 dark:text-stone-300">
                <li className="p-2 rounded bg-stone-50 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-600 flex justify-between items-center shadow-[1.5px_1.5px_0px_#18181b]">
                  <span className="font-bold text-stone-950 dark:text-stone-100">Tissue Roll</span>
                  <span className="font-mono text-stone-950 dark:text-amber-300 font-black">1 box = 100 roll</span>
                </li>
                <li className="p-2 rounded bg-stone-50 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-600 flex justify-between items-center shadow-[1.5px_1.5px_0px_#18181b]">
                  <span className="font-bold text-stone-950 dark:text-stone-100">Tissue Roll Jumbo</span>
                  <span className="font-mono text-stone-950 dark:text-amber-300 font-black">1 box = 16 roll</span>
                </li>
                <li className="p-2 rounded bg-stone-50 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-600 flex justify-between items-center shadow-[1.5px_1.5px_0px_#18181b]">
                  <span className="font-bold text-stone-950 dark:text-stone-100">Tissue Hand Towel</span>
                  <span className="font-mono text-stone-950 dark:text-amber-300 font-black">1 box = 24 pack</span>
                </li>
                <li className="p-2 rounded bg-stone-50 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-600 flex justify-between items-center shadow-[1.5px_1.5px_0px_#18181b]">
                  <span className="font-bold text-stone-950 dark:text-stone-100">Tissue Kotak</span>
                  <span className="font-mono text-stone-950 dark:text-amber-300 font-black">1 box = 40 pack</span>
                </li>
              </ul>
            </div>

            {/* Konversi Plastik Sampah */}
            <div className="space-y-2 pt-2 border-t-2 border-stone-900 dark:border-stone-700">
              <div className="text-[11px] font-black text-stone-950 dark:text-stone-100 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-stone-950 dark:text-stone-200 stroke-[2.5]" />
                <span>Standar Plastik Sampah:</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-stone-700 dark:text-stone-300">
                <li className="p-2 rounded bg-stone-50 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-600 flex justify-between items-center shadow-[1.5px_1.5px_0px_#18181b]">
                  <span className="font-bold text-stone-950 dark:text-stone-100">Ukuran 50x75</span>
                  <span className="font-mono text-stone-950 dark:text-emerald-400 font-black">1 pack = 24 lembar</span>
                </li>
                <li className="p-2 rounded bg-stone-50 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-600 flex justify-between items-center shadow-[1.5px_1.5px_0px_#18181b]">
                  <span className="font-bold text-stone-950 dark:text-stone-100">Ukuran 60x100</span>
                  <span className="font-mono text-stone-950 dark:text-emerald-400 font-black">1 pack = 12 lembar</span>
                </li>
                <li className="p-2 rounded bg-stone-50 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-600 flex justify-between items-center shadow-[1.5px_1.5px_0px_#18181b]">
                  <span className="font-bold text-stone-950 dark:text-stone-100">Ukuran 90x120</span>
                  <span className="font-mono text-stone-950 dark:text-emerald-400 font-black">1 pack = 6 lembar</span>
                </li>
              </ul>
            </div>

            {/* Aturan Kirim Plastik Note */}
            <div className="p-3.5 rounded-xl bg-yellow-100 border-2 border-stone-900 text-stone-950 text-[11px] space-y-1 shadow-[2.5px_2.5px_0px_#18181b]">
              <div className="font-black flex items-center gap-1 text-stone-950">
                <Info className="w-3.5 h-3.5 text-stone-950 stroke-[2.5]" />
                <span>Aturan Kirim Plastik:</span>
              </div>
              <p className="leading-relaxed font-semibold">
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
