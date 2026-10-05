import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { SearchableSelect, SearchableSelectOption } from '../components/common/SearchableSelect';
import { AIAssistantBubble } from '../components/ai/AIAssistantBubble';
import { ConsumableForm } from './ConsumablePage';
import { getAdminConsumableBadge } from '../utils/consumableConfig';
import { useApp } from '../context/AppContext';
import { api, normalizeGasErrorMessage } from '../services/api';
import {
  MasterMember,
  MasterItem,
  PengajuanPengambilan,
  PickupEligibilityResult,
  ItemStock,
} from '../types';
import {
  Plus,
  FileCheck2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ArrowRight,
  Boxes,
  User,
  Package,
  Sparkles,
  TrendingUp,
  Check,
  X,
  Building2,
  Send,
  Layers,
  HelpCircle,
  ShoppingCart,
  Trash2,
} from 'lucide-react';

interface RequestCartItem {
  id: string;
  nama: string;
  satuan: string;
  jumlah: number;
}

export const PengajuanPage: React.FC = () => {
  const { pageParams, addToast, refreshKey, canPerformAction, role } = useApp();

  // Active Tab: default 'admin' if ADMIN, 'crew' if MEMBER
  const [activeTab, setActiveTab] = useState<'crew' | 'admin'>(role === 'ADMIN' ? 'admin' : 'crew');

  useEffect(() => {
    setActiveTab(role === 'ADMIN' ? 'admin' : 'crew');
  }, [role]);

  // Master & Operational Data
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [stocks, setStocks] = useState<ItemStock[]>([]);
  const [requests, setRequests] = useState<PengajuanPengambilan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestsLoading, setIsRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState('');

  // ---------------------------------------------------------------------------
  // CREW FORM STATE
  // ---------------------------------------------------------------------------
  // Tab switcher in Crew View: 'general' (Barang Standar) vs 'consumable' (Tisu & Plastik)
  // Default: 'consumable' — tab Tisu & Plastik tampil pertama saat aplikasi dibuka.
  const [crewFormType, setCrewFormType] = useState<'general' | 'consumable'>('consumable');
  const [lastConsumableItem, setLastConsumableItem] = useState<MasterItem | null>(null);
  const [lastConsumableReady, setLastConsumableReady] = useState<boolean | null>(null);

  const handleConsumableLastItemChange = useCallback((itm: MasterItem | null, ready: boolean) => {
    setLastConsumableItem(itm);
    setLastConsumableReady(ready);
  }, []);

  const [selectedMemberId, setSelectedMemberId] = useState(pageParams.memberId || '');
  const [selectedItemId, setSelectedItemId] = useState(pageParams.itemId || '');
  const [formJumlah, setFormJumlah] = useState<number | ''>(pageParams.jumlah || '');
  const [formAlasan, setFormAlasan] = useState('');
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<PickupEligibilityResult | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [requestCart, setRequestCart] = useState<RequestCartItem[]>([]);
  const [cartSubmitProgress, setCartSubmitProgress] = useState<string | null>(null);
  const [cartResult, setCartResult] = useState<{ success: boolean; createdIds: string[]; failedItems: string[] } | null>(null);

  // ---------------------------------------------------------------------------
  // ADMIN & PICKING LIST STATE
  // ---------------------------------------------------------------------------
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [processingStatusId, setProcessingStatusId] = useState<string | null>(null);

  // Stock availability map: item ID -> boolean (is STOK_SAAT_INI > 0)
  // CRITICAL: Numbers are strictly kept internal to derive binary READY / KOSONG status.
  const stockAvailabilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    stocks.forEach((s) => {
      map.set(s.idItem, s.stok > 0);
    });
    return map;
  }, [stocks]);

  // Fast lookups
  const memberMap = useMemo(() => {
    const map = new Map<string, MasterMember>();
    members.forEach((m) => map.set(m.ID_MEMBER, m));
    return map;
  }, [members]);

  const itemMap = useMemo(() => {
    const map = new Map<string, MasterItem>();
    items.forEach((i) => map.set(i.ID_ITEM, i));
    return map;
  }, [items]);

  const stockMap = useMemo(() => {
    const map = new Map<string, ItemStock>();
    stocks.forEach((s) => map.set(s.idItem, s));
    return map;
  }, [stocks]);

  // Searchable select options for members (Name, Jabatan, Lantai badge)
  const memberOptions: SearchableSelectOption[] = useMemo(() => {
    return members.map((m) => ({
      value: m.ID_MEMBER,
      label: m.NAMA_MEMBER,
      sublabel: m.JABATAN || undefined,
      badge: m.LANTAI ? `Lantai ${m.LANTAI}` : 'Lantai -',
      badgeColor: 'blue',
    }));
  }, [members]);

  // Searchable select options for items (Binary status READY / KOSONG only - NO stock numbers!)
  const itemOptions: SearchableSelectOption[] = useMemo(() => {
    return items.map((item) => {
      const isReady = stockAvailabilityMap.get(item.ID_ITEM) ?? false;
      return {
        value: item.ID_ITEM,
        label: item.NAMA_ITEM,
        sublabel: `${item.KATEGORI} • Satuan: ${item.SATUAN}`,
        badge: isReady ? 'READY' : 'KOSONG',
        badgeColor: isReady ? 'emerald' : 'rose',
      };
    });
  }, [items, stockAvailabilityMap]);

  // Load Requests
  const loadRequests = async () => {
    setIsRequestsLoading(true);
    setRequestsError('');
    try {
      const data = await api.getRequests();
      setRequests(data);
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Gagal memuat data pengajuan.');
      setRequestsError(msg);
    } finally {
      setIsRequestsLoading(false);
    }
  };

  // Load All Master & Stock Data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [memData, itmData, stockData, reqData] = await Promise.all([
        api.getMembers(),
        api.getItems(),
        api.getStock().catch(() => [] as ItemStock[]),
        api.getRequests().catch(() => [] as PengajuanPengambilan[]),
      ]);

      const activeMembers = memData.filter((m) => m.STATUS === 'AKTIF');
      const activeItems = itmData.filter((i) => i.STATUS === 'AKTIF');
      setMembers(activeMembers);
      setItems(activeItems);
      setStocks(stockData);
      setRequests(reqData);
      // Pilihan member & barang TIDAK diisi otomatis — user harus memilih sendiri
      // lewat kolom pencarian, agar status/centang langkah hanya muncul setelah dipilih.
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Gagal memuat master data.');
      addToast('warning', 'Peringatan Koneksi', msg);
    } finally {
      setIsLoading(false);
      setIsRequestsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [refreshKey]);

  // Handle URL navigation params
  useEffect(() => {
    if (pageParams.memberId) setSelectedMemberId(pageParams.memberId);
    if (pageParams.itemId) setSelectedItemId(pageParams.itemId);
    if (pageParams.jumlah) setFormJumlah(pageParams.jumlah);
  }, [pageParams]);

  // Selected Item details & binary status
  const selectedItemObj = itemMap.get(selectedItemId);
  const isSelectedItemReady = stockAvailabilityMap.get(selectedItemId) ?? false;

  // Selected Member details
  const selectedMemberObj = memberMap.get(selectedMemberId);

  // ---------------------------------------------------------------------------
  // HANDLERS: CREW REQUEST
  // ---------------------------------------------------------------------------
  const handleCheckEligibility = async () => {
    if (!selectedMemberId || !selectedItemId) {
      addToast('warning', 'Pilih Data', 'Pilih nama member dan barang yang diajukan.');
      return;
    }
    if (formJumlah === '' || !isFinite(Number(formJumlah)) || Number(formJumlah) <= 0) {
      addToast('warning', 'Jumlah Belum Diisi', 'Isi jumlah barang yang diminta (minimal 1) terlebih dahulu.');
      return;
    }

    setIsCheckingEligibility(true);
    setEligibilityResult(null);
    try {
      const res = await api.getPickupEligibility(selectedMemberId, selectedItemId, Number(formJumlah));
      setEligibilityResult(res);
      if (res.allowed && !res.early) {
        addToast('success', 'Kelayakan Terpenuhi', 'Pengambilan memenuhi jadwal masa pakai.');
      } else if (res.early) {
        addToast('info', 'Pengambilan Awal Terdeteksi', 'Alasan pengajuan wajib diisi untuk persetujuan admin.');
      } else {
        addToast('warning', 'Perhatian', res.reason || 'Tidak memenuhi syarat pengambilan.');
      }
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Gagal memeriksa kelayakan.');
      addToast('error', 'Gagal Cek Kelayakan', msg);
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !selectedItemId) {
      addToast('warning', 'Pilih Data', 'Pilih nama member dan barang yang diajukan.');
      return;
    }
    if (!isSelectedItemReady) {
      addToast('error', 'Stok Kosong', 'Stok barang saat ini kosong — tidak dapat diajukan.');
      return;
    }
    if (formJumlah === '' || !isFinite(Number(formJumlah)) || Number(formJumlah) <= 0) {
      addToast('error', 'Validasi Gagal', 'Jumlah barang yang diminta wajib diisi dan harus lebih dari 0.');
      return;
    }
    const itemObj = itemMap.get(selectedItemId);
    const existingIdx = requestCart.findIndex((c) => c.id === selectedItemId);
    if (existingIdx >= 0) {
      const updated = [...requestCart];
      updated[existingIdx] = { ...updated[existingIdx], jumlah: updated[existingIdx].jumlah + Number(formJumlah) };
      setRequestCart(updated);
      addToast('info', 'Jumlah Digabungkan', `${itemObj?.NAMA_ITEM} kini ${updated[existingIdx].jumlah} ${itemObj?.SATUAN} di keranjang.`);
    } else {
      setRequestCart([
        ...requestCart,
        { id: selectedItemId, nama: itemObj?.NAMA_ITEM || selectedItemId, satuan: itemObj?.SATUAN || 'UNIT', jumlah: Number(formJumlah) },
      ]);
      addToast('success', 'Ditambahkan ke Keranjang', `${itemObj?.NAMA_ITEM} (${formJumlah} ${itemObj?.SATUAN}) ditambahkan.`);
    }
    setSelectedItemId('');
    setFormJumlah('');
    setEligibilityResult(null);
    setSubmittedRequestId(null);
    setCartResult(null);
  };

  const handleRemoveFromCart = (index: number) => {
    const removed = requestCart[index];
    setRequestCart(requestCart.filter((_, idx) => idx !== index));
    if (removed) addToast('info', 'Item Dihapus', `${removed.nama} dikeluarkan dari keranjang.`);
  };

  const handleCrewSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction('REQUEST')) {
      addToast('error', 'Akses Ditolak', 'Peran Anda tidak memiliki izin untuk mengajukan permintaan.');
      return;
    }

    if (!selectedMemberId) {
      addToast('error', 'Validasi Gagal', 'Nama pemohon wajib dipilih.');
      return;
    }

    if (requestCart.length === 0) {
      addToast('error', 'Validasi Gagal', 'Tambahkan minimal satu barang ke keranjang.');
      return;
    }

    if (!formAlasan.trim()) {
      addToast('error', 'Validasi Gagal', 'Alasan permohonan wajib diisi.');
      return;
    }

    setIsSubmittingRequest(true);
    setSubmittedRequestId(null);
    setCartResult(null);

    const createdIds: string[] = [];
    const failedItems: string[] = [];
    const remainingCart: RequestCartItem[] = [];
    const total = requestCart.length;

    try {
      for (let i = 0; i < total; i++) {
        const item = requestCart[i];
        setCartSubmitProgress(`Mengirim item ${i + 1} dari ${total}: ${item.nama} (${item.jumlah} ${item.satuan})...`);
        try {
          const res = await api.submitRequest({
            memberId: selectedMemberId,
            itemId: item.id,
            jumlah: item.jumlah,
            alasan: formAlasan.trim(),
          });
          const newId = res.ID_PENGAJUAN || (res.request as any)?.ID_PENGAJUAN || 'REQ-BARU';
          createdIds.push(newId);
        } catch (err: unknown) {
          const msg = normalizeGasErrorMessage(err, undefined, `Gagal mengajukan ${item.nama}`);
          failedItems.push(`${item.nama}: ${msg}`);
          remainingCart.push(item);
        }
      }

      if (failedItems.length === 0) {
        setCartResult({ success: true, createdIds, failedItems: [] });
        setRequestCart([]);
        setFormAlasan('');
        setEligibilityResult(null);
        addToast('success', 'Semua Terkirim', `Berhasil mengajukan ${createdIds.length} permintaan ke gudang.`);
      } else {
        setCartResult({ success: false, createdIds, failedItems });
        setRequestCart(remainingCart);
        addToast('warning', 'Sebagian Gagal', `${createdIds.length} berhasil, ${failedItems.length} gagal (tetap di keranjang).`);
      }

      await loadRequests();
    } finally {
      setIsSubmittingRequest(false);
      setCartSubmitProgress(null);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: ADMIN APPROVAL & PICKING STATUS UPDATES
  // ---------------------------------------------------------------------------
  const handleApproval = async (type: 'APPROVE' | 'REJECT', requestId: string) => {
    if (!canPerformAction('APPROVAL')) {
      addToast('error', 'Akses Ditolak', 'Hanya Admin yang memiliki hak akses persetujuan/penolakan pengajuan.');
      return;
    }

    if (!requestId || !requestId.trim()) {
      addToast('error', 'Validasi Gagal', 'ID Pengajuan tidak valid.');
      return;
    }

    setProcessingStatusId(requestId);
    try {
      if (type === 'APPROVE') {
        const res = await api.approveRequest({
          requestId: requestId.trim(),
          approverId: 'ADMIN',
          note: 'Disetujui untuk disiapkan',
        });
        addToast('success', 'Pengajuan Disetujui', res?.message || 'Pengajuan disetujui & masuk antrean penyiapan.');
      } else {
        const res = await api.rejectRequest({
          requestId: requestId.trim(),
          approverId: 'ADMIN',
          note: 'Ditolak',
        });
        addToast('info', 'Pengajuan Ditolak', res?.message || 'Pengajuan telah ditolak.');
      }
      await loadRequests();
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Gagal memproses approval.');
      addToast('error', 'Gagal Memproses Permintaan', msg);
    } finally {
      setProcessingStatusId(null);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: 'DIPROSES' | 'SELESAI') => {
    if (!canPerformAction('APPROVAL') && role !== 'ADMIN') {
      addToast('error', 'Akses Ditolak', 'Hanya staf admin/gudang yang dapat memperbarui status penyiapan.');
      return;
    }

    setProcessingStatusId(requestId);
    try {
      const res = await api.updateRequestStatus(requestId, newStatus);
      addToast(
        'success',
        newStatus === 'DIPROSES' ? 'Mulai Disiapkan' : 'Barang Diserahkan (Selesai)',
        res?.message || `Status pengajuan ${requestId} berhasil diperbarui ke ${newStatus}.`
      );
      await loadRequests();
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Transisi status tidak valid.');
      addToast('error', 'Gagal Memperbarui Status', msg);
    } finally {
      setProcessingStatusId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // FILTERED DATA FOR CREW & ADMIN
  // ---------------------------------------------------------------------------
  // Riwayat Pengajuan Milik Member Terpilih (Crew View)
  // Privasi: bila belum ada member dipilih, kembalikan list kosong (jangan tampilkan milik orang lain).
  const myRequests = useMemo(() => {
    if (!selectedMemberId) return [];
    return requests.filter((r) => r.ID_MEMBER === selectedMemberId);
  }, [requests, selectedMemberId]);

  // Picking List (Status DISETUJUI & DIPROSES)
  const pickingList = useMemo(() => {
    return requests.filter((r) => {
      const s = (r.STATUS || '').toUpperCase();
      return s === 'DISETUJUI' || s === 'DIPROSES';
    });
  }, [requests]);

  // Admin All Requests Filtered
  const filteredAllRequests = useMemo(() => {
    if (statusFilter === 'ALL') return requests;
    return requests.filter((r) => (r.STATUS || '').toUpperCase() === statusFilter);
  }, [requests, statusFilter]);

  // ---------------------------------------------------------------------------
  // REKAP & SUMMARY ADMIN
  // ---------------------------------------------------------------------------
  const adminSummary = useMemo(() => {
    let menungguCount = 0;
    let disetujuiCount = 0;
    let diprosesCount = 0;
    let selesaiCount = 0;
    let ditolakCount = 0;

    const requesterMap = new Map<string, { member: MasterMember; count: number }>();
    const itemReqMap = new Map<string, { item: MasterItem; totalQty: number; count: number }>();

    requests.forEach((r) => {
      const st = (r.STATUS || '').toUpperCase();
      if (st === 'MENUNGGU') menungguCount++;
      else if (st === 'DISETUJUI') disetujuiCount++;
      else if (st === 'DIPROSES') diprosesCount++;
      else if (st === 'SELESAI') selesaiCount++;
      else if (st === 'DITOLAK' || st === 'DIBATALKAN') ditolakCount++;

      // Top requester
      if (r.ID_MEMBER) {
        const mem = memberMap.get(r.ID_MEMBER) || {
          ID_MEMBER: r.ID_MEMBER,
          NAMA_MEMBER: r.NAMA_MEMBER || r.ID_MEMBER,
          JABATAN: '',
          LANTAI: '',
          STATUS: 'AKTIF' as const,
        };
        const prev = requesterMap.get(r.ID_MEMBER) || { member: mem, count: 0 };
        prev.count++;
        requesterMap.set(r.ID_MEMBER, prev);
      }

      // Top requested items
      if (r.ID_ITEM) {
        const itm = itemMap.get(r.ID_ITEM) || {
          ID_ITEM: r.ID_ITEM,
          NAMA_ITEM: r.NAMA_ITEM || r.ID_ITEM,
          KATEGORI: 'PERALATAN' as const,
          SATUAN: 'UNIT',
          MASA_PAKAI_BULAN: 1,
          STOK_AWAL: 0,
          MIN_STOK: 0,
          LOKASI: '-',
          STATUS: 'AKTIF' as const,
        };
        const prev = itemReqMap.get(r.ID_ITEM) || { item: itm, totalQty: 0, count: 0 };
        prev.totalQty += Number(r.JUMLAH || 1);
        prev.count++;
        itemReqMap.set(r.ID_ITEM, prev);
      }
    });

    const topRequesters = Array.from(requesterMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topItems = Array.from(itemReqMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);

    return {
      menungguCount,
      disetujuiCount,
      diprosesCount,
      selesaiCount,
      ditolakCount,
      topRequesters,
      topItems,
    };
  }, [requests, memberMap, itemMap]);

  // ---------------------------------------------------------------------------
  // TABLE COLUMNS: CREW VIEW (NO STOCK NUMBERS ANYWHERE)
  // ---------------------------------------------------------------------------
  const crewColumns: Column<PengajuanPengambilan>[] = [
    {
      key: 'ID_PENGAJUAN',
      header: 'ID Pengajuan',
      sortable: true,
      render: (r) => (
        <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">{r.ID_PENGAJUAN}</div>
      ),
    },
    {
      key: 'TANGGAL',
      header: 'Tanggal',
      sortable: true,
      render: (r) => <div className="text-slate-700 dark:text-slate-200">{r.TANGGAL || '-'}</div>,
    },
    {
      key: 'ID_ITEM',
      header: 'Barang Diminta',
      sortable: true,
      render: (r) => {
        const item = itemMap.get(r.ID_ITEM);
        return (
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{r.NAMA_ITEM || item?.NAMA_ITEM || r.ID_ITEM}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{r.ID_ITEM}</div>
          </div>
        );
      },
    },
    {
      key: 'JUMLAH',
      header: 'Jumlah Permintaan',
      align: 'right',
      render: (r) => {
        const item = itemMap.get(r.ID_ITEM);
        const badge = getAdminConsumableBadge(r.ID_ITEM, Number(r.JUMLAH || 0));
        return (
          <div className="text-right">
            <div className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {r.JUMLAH} <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">{item?.SATUAN || 'UNIT'}</span>
            </div>
            {badge && (
              <div className="text-[10px] text-teal-700 font-medium">
                {badge}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'LANTAI',
      header: 'Lantai Kerja',
      render: (r) => {
        const mem = memberMap.get(r.ID_MEMBER);
        return (
          <span className="text-slate-600 dark:text-slate-400 font-medium text-xs">
            {mem?.LANTAI ? `Lantai ${mem.LANTAI}` : '-'}
          </span>
        );
      },
    },
    {
      key: 'ALASAN',
      header: 'Alasan Pengajuan',
      render: (r) => (
        <div className="max-w-xs text-slate-700 dark:text-slate-200 text-xs truncate" title={r.ALASAN}>
          {r.ALASAN || '-'}
        </div>
      ),
    },
    {
      key: 'STATUS',
      header: 'Status Pengajuan',
      sortable: true,
      align: 'center',
      render: (r) => <StatusBadge status={r.STATUS} size="sm" />,
    },
  ];

  // ---------------------------------------------------------------------------
  // TABLE COLUMNS: ADMIN PICKING LIST
  // ---------------------------------------------------------------------------
  const pickingColumns: Column<PengajuanPengambilan>[] = [
    {
      key: 'ID_PENGAJUAN',
      header: 'ID Pengajuan',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{r.ID_PENGAJUAN}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{r.TANGGAL}</div>
        </div>
      ),
    },
    {
      key: 'ID_ITEM',
      header: 'Nama Barang & Jumlah',
      sortable: true,
      render: (r) => {
        const itm = itemMap.get(r.ID_ITEM);
        const badge = getAdminConsumableBadge(r.ID_ITEM, Number(r.JUMLAH || 0));
        return (
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">{r.NAMA_ITEM || itm?.NAMA_ITEM || r.ID_ITEM}</div>
            <div className="text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Siapkan: {r.JUMLAH} {itm?.SATUAN || 'UNIT'}</span>
              {badge && (
                <span className="text-[11px] font-normal text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                  {badge}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'ID_MEMBER',
      header: 'Pemohon (+ Lantai)',
      sortable: true,
      render: (r) => {
        const mem = memberMap.get(r.ID_MEMBER);
        return (
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{r.NAMA_MEMBER || mem?.NAMA_MEMBER || r.ID_MEMBER}</span>
              {mem?.LANTAI && (
                <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-[10px]">
                  Lt. {mem.LANTAI}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{mem?.JABATAN || r.ID_MEMBER}</div>
          </div>
        );
      },
    },
    {
      key: 'ALASAN',
      header: 'Alasan Permintaan',
      render: (r) => (
        <div className="max-w-xs text-xs text-slate-600 dark:text-slate-400 line-clamp-2" title={r.ALASAN}>
          {r.ALASAN || '-'}
        </div>
      ),
    },
    {
      key: 'STATUS',
      header: 'Status Tahap',
      align: 'center',
      render: (r) => <StatusBadge status={r.STATUS} size="sm" />,
    },
    {
      key: 'AKSI',
      header: 'Aksi Gudang',
      align: 'right',
      render: (r) => {
        const st = (r.STATUS || '').toUpperCase();
        const isBusy = processingStatusId === r.ID_PENGAJUAN;

        if (st === 'DISETUJUI') {
          return (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleUpdateStatus(r.ID_PENGAJUAN, 'DIPROSES')}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
            >
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
              <span>Mulai Siapkan</span>
            </button>
          );
        }

        if (st === 'DIPROSES') {
          return (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleUpdateStatus(r.ID_PENGAJUAN, 'SELESAI')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors inline-flex items-center gap-1 shadow-2xs"
            >
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Selesai / Serahkan</span>
            </button>
          );
        }

        return <span className="text-slate-400 dark:text-slate-500 text-xs italic">Selesai</span>;
      },
    },
  ];

  // ---------------------------------------------------------------------------
  // TABLE COLUMNS: ALL REQUESTS (ADMIN VIEW)
  // ---------------------------------------------------------------------------
  const allRequestsColumns: Column<PengajuanPengambilan>[] = [
    {
      key: 'ID_PENGAJUAN',
      header: 'ID Pengajuan',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{r.ID_PENGAJUAN}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">{r.TANGGAL || '-'}</div>
        </div>
      ),
    },
    {
      key: 'ID_MEMBER',
      header: 'Member Pemohon',
      sortable: true,
      render: (r) => {
        const mem = memberMap.get(r.ID_MEMBER);
        return (
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {r.NAMA_MEMBER || mem?.NAMA_MEMBER || r.ID_MEMBER}
              {mem?.LANTAI && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-semibold">
                  Lt. {mem.LANTAI}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{mem?.JABATAN || r.ID_MEMBER}</div>
          </div>
        );
      },
    },
    {
      key: 'ID_ITEM',
      header: 'Barang & Qty',
      sortable: true,
      render: (r) => {
        const itm = itemMap.get(r.ID_ITEM);
        const badge = getAdminConsumableBadge(r.ID_ITEM, Number(r.JUMLAH || 0));
        return (
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{r.NAMA_ITEM || itm?.NAMA_ITEM || r.ID_ITEM}</div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono font-semibold flex items-center gap-1.5 flex-wrap">
              <span>{r.JUMLAH} {itm?.SATUAN || 'UNIT'}</span>
              {badge && (
                <span className="text-[10px] font-sans text-teal-700 font-medium bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                  {badge}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'ALASAN',
      header: 'Alasan Permintaan',
      render: (r) => (
        <div className="max-w-xs text-xs text-slate-700 dark:text-slate-200 line-clamp-2" title={r.ALASAN}>
          {r.ALASAN || '-'}
        </div>
      ),
    },
    {
      key: 'STATUS',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (r) => <StatusBadge status={r.STATUS} size="sm" />,
    },
    {
      key: 'ID_APPROVER',
      header: 'Approver / Catatan',
      render: (r) => {
        if (!r.ID_APPROVER && !r.CATATAN_APPROVER) return <span className="text-slate-400 dark:text-slate-500 text-xs italic">-</span>;
        return (
          <div className="text-xs">
            <div className="font-medium text-slate-800 dark:text-slate-200">{r.ID_APPROVER}</div>
            {r.CATATAN_APPROVER && <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">"{r.CATATAN_APPROVER}"</div>}
          </div>
        );
      },
    },
    {
      key: 'AKSI',
      header: 'Aksi Status',
      align: 'center',
      render: (r) => {
        const st = (r.STATUS || '').toUpperCase();
        const isBusy = processingStatusId === r.ID_PENGAJUAN;

        if (st === 'MENUNGGU') {
          if (!canPerformAction('APPROVAL')) {
            return <span className="text-slate-400 dark:text-slate-500 text-xs italic">-</span>;
          }
          return (
            <div className="flex flex-wrap items-center justify-center gap-1.5 min-w-[150px]">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleApproval('APPROVE', r.ID_PENGAJUAN)}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors inline-flex items-center gap-1 shadow-2xs disabled:opacity-50"
                title="Setujui pengajuan & kurangi stok"
              >
                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Setujui</span>
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  const confirmed = window.confirm(`Tolak pengajuan ${r.ID_PENGAJUAN}? Tindakan ini tidak dapat dibatalkan.`);
                  if (confirmed) {
                    handleApproval('REJECT', r.ID_PENGAJUAN);
                  }
                }}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-300 rounded-md transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                title="Tolak pengajuan permohonan"
              >
                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                <span>Tolak</span>
              </button>
            </div>
          );
        }

        if (st === 'DISETUJUI') {
          return (
            <div className="flex items-center justify-center min-w-[130px]">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleUpdateStatus(r.ID_PENGAJUAN, 'DIPROSES')}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors inline-flex items-center gap-1 shadow-2xs disabled:opacity-50 whitespace-nowrap"
                title="Mulai proses penyiapan fisik barang"
              >
                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                <span>Mulai Siapkan →</span>
              </button>
            </div>
          );
        }

        if (st === 'DIPROSES') {
          return (
            <div className="flex items-center justify-center min-w-[110px]">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleUpdateStatus(r.ID_PENGAJUAN, 'SELESAI')}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors inline-flex items-center gap-1 shadow-2xs disabled:opacity-50 whitespace-nowrap"
                title="Barang telah diserahkan ke personil (Selesai)"
              >
                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Selesai ✓</span>
              </button>
            </div>
          );
        }

        return <span className="text-slate-400 dark:text-slate-500 text-xs italic">-</span>;
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header & Tabs */}
      <PageHeader
        title={role === 'MEMBER' ? 'Form Permintaan Barang' : 'Kelola Permintaan Barang'}
        description={
          role === 'MEMBER'
            ? 'Layanan permohonan pengambilan barang untuk personil lapangan.'
            : 'Layanan terpadu kelola permohonan pengambilan, alur penyiapan barang gudang, dan persetujuan.'
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadRequests}
              disabled={isRequestsLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Perbarui riwayat permohonan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRequestsLoading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          </div>
        }
      />

      {/* Navigation Mode Tabs (Admin Mode Only) */}
      {role === 'ADMIN' && (
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'admin'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Penyiapan &amp; Kelola</span>
            {pickingList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                {pickingList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('crew')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'crew'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Form Permintaan (Crew)</span>
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW A: CREW REQUEST FORM & RIWAYAT SAYA */}
      {/* ===================================================================== */}
      {activeTab === 'crew' && (
        <div className="space-y-6">
          {/* Sub-tab Switcher: Permintaan Barang vs Tisu & Plastik */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
            <button
              type="button"
              onClick={() => setCrewFormType('general')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                crewFormType === 'general'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Permintaan Barang</span>
            </button>

            <button
              type="button"
              onClick={() => setCrewFormType('consumable')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                crewFormType === 'consumable'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Tisu &amp; Plastik (Consumable)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">
                Multi-Item
              </span>
            </button>
          </div>

          {crewFormType === 'consumable' ? (
            <ConsumableForm
              members={members}
              items={items}
              stocks={stocks}
              memberMap={memberMap}
              itemMap={itemMap}
              stockMap={stockMap}
              selectedMemberId={selectedMemberId}
              setSelectedMemberId={setSelectedMemberId}
              onSuccess={loadRequests}
              onLastItemChange={handleConsumableLastItemChange}
            />
          ) : (
            /* Form Permintaan & Panduan Singkat Grid */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* LEFT / MAIN COLUMN: FORM CARD */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              {/* Header Gradient */}
              <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-950 text-white p-5 sm:p-6 border-b border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                      <Send className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold tracking-tight truncate">
                        Buat Permintaan Barang Baru
                      </h3>
                      <p className="text-xs text-emerald-300/90 font-medium truncate mt-0.5">
                        {selectedMemberObj
                          ? `Halo, ${selectedMemberObj.NAMA_MEMBER}`
                          : 'Layanan mandiri permintaan barang operasional gudang'}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold tracking-wide shrink-0">
                    Mode Crew
                  </span>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-5 sm:p-6 space-y-6">
                {/* Result Banner */}
                {cartResult && (
                  <div className={`p-4 border rounded-xl flex items-start gap-3 text-xs animate-fadeIn ${
                    cartResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                  }`}>
                    {cartResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-sm">
                        {cartResult.success ? 'Semua Permintaan Terkirim!' : 'Hasil Pengiriman Permintaan'}
                      </div>
                      {cartResult.createdIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 font-mono font-bold text-[11px]">
                          {cartResult.createdIds.map((id, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200">
                              {id}
                            </span>
                          ))}
                        </div>
                      )}
                      {cartResult.failedItems.length > 0 && (
                        <ul className="list-disc list-inside mt-2 space-y-0.5 text-rose-800 dark:text-rose-200">
                          {cartResult.failedItems.map((msg, idx) => (
                            <li key={idx}>{msg}</li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 opacity-80 leading-relaxed">
                        Pantau progresnya pada tabel Riwayat di bawah.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCrewSubmitRequest} className="space-y-6 text-xs">
                  {/* STEP 1: PILIH NAMA */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60/50 space-y-3 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          selectedMemberId
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-200 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {selectedMemberId ? <Check className="w-4 h-4 text-white" /> : '1'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          Pilih Nama Anda <span className="text-rose-500">*</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Cari nama pemohon sesuai penempatan lantai tugas
                        </p>
                      </div>
                    </div>

                    <SearchableSelect
                      value={selectedMemberId}
                      onChange={(val) => {
                        setSelectedMemberId(val);
                        setEligibilityResult(null);
                      }}
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
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                              <span className="truncate">{selectedMemberObj.NAMA_MEMBER}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                              {selectedMemberObj.JABATAN || 'Personil Lapangan'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-emerald-300 text-emerald-900 font-bold text-[11px] shadow-2xs">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{selectedMemberObj.LANTAI ? `Lantai ${selectedMemberObj.LANTAI}` : 'Lantai -'}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* STEP 2: PILIH BARANG */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60/50 space-y-3 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          selectedItemId
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-200 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {selectedItemId ? <Check className="w-4 h-4 text-white" /> : '2'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          Pilih Barang <span className="text-rose-500">*</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Cari barang yang ingin diajukan dan perhatikan status ketersediaan
                        </p>
                      </div>
                    </div>

                    <SearchableSelect
                      value={selectedItemId}
                      onChange={(val) => {
                        setSelectedItemId(val);
                        setEligibilityResult(null);
                      }}
                      options={itemOptions}
                      placeholder="Cari barang..."
                      searchPlaceholder="Cari nama barang atau kategori..."
                      minimalTrigger
                      required
                    />

                    {/* Binary Status Indicator Pill (No stock numbers!) */}
                    {selectedItemObj && (
                      <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex items-center justify-between text-xs animate-fadeIn shadow-2xs">
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{selectedItemObj.NAMA_ITEM}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Kategori: {selectedItemObj.KATEGORI} • Satuan: {selectedItemObj.SATUAN}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isSelectedItemReady ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                              <Check className="w-3.5 h-3.5" />
                              <span>STATUS: READY</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-200">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>STATUS: KOSONG (Habis)</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* STEP 3: JUMLAH & CEK KELAYAKAN */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60/50 space-y-3 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          Number(formJumlah) >= 1
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-200 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {Number(formJumlah) >= 1 ? <Check className="w-4 h-4 text-white" /> : '3'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          Jumlah &amp; Cek Kelayakan <span className="text-rose-500">*</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Tentukan kuantitas dan cek kesesuaian jadwal masa pakai
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-200">Jumlah Diminta:</label>
                        <input
                          type="number"
                          min={1}
                          value={formJumlah}
                          placeholder="Isi jumlah…"
                          onChange={(e) => {
                            const v = e.target.value;
                            setFormJumlah(v === '' ? '' : Math.max(1, Number(v)));
                            setEligibilityResult(null);
                          }}
                          required
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-slate-900 font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-end">
                        <button
                          type="button"
                          onClick={handleCheckEligibility}
                          disabled={isCheckingEligibility || !selectedMemberId || !selectedItemId}
                          className="w-full py-2 px-3.5 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                        >
                          {isCheckingEligibility ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span>Cek Kelayakan Pengambilan</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={!selectedMemberId || !selectedItemId || !isSelectedItemReady || formJumlah === '' || Number(formJumlah) <= 0 || isSubmittingRequest}
                      className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah ke Keranjang</span>
                    </button>

                    {/* Eligibility Result Box (Human Friendly) */}
                    {eligibilityResult && (
                      <div
                        className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                          eligibilityResult.allowed && !eligibilityResult.early
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : eligibilityResult.early
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-rose-50 border-rose-200 text-rose-900'
                        }`}
                      >
                        {eligibilityResult.allowed && !eligibilityResult.early ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : eligibilityResult.early ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-0.5">
                          <div className="font-semibold">
                            {eligibilityResult.allowed && !eligibilityResult.early
                              ? 'Pengambilan Sesuai Jadwal & Kuota'
                              : eligibilityResult.early
                              ? 'Pengambilan Awal (Early Pickup)'
                              : 'Permintaan Melebihi Batas / Belum Memenuhi Syarat'}
                          </div>
                          <p className="opacity-90 leading-relaxed">
                            {eligibilityResult.reason ||
                              (eligibilityResult.early
                                ? `Jatuh tempo pengambilan berikutnya adalah ${eligibilityResult.dueDate || 'belum tiba'}. Anda dapat mengajukan pengambilan lebih awal dengan menyertakan alasan yang jelas.`
                                : 'Kuota pengambilan tersedia.')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* KERANJANG PERMINTAAN */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-3">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Keranjang Permintaan ({requestCart.length} item):</span>
                    </div>
                    {requestCart.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-center bg-white dark:bg-slate-900">
                        <p className="font-medium text-xs text-slate-600 dark:text-slate-400">Keranjang masih kosong</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Pilih barang &amp; jumlah di atas lalu klik &ldquo;Tambah ke Keranjang&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {requestCart.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 animate-fadeIn"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs">{item.nama}</div>
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
                              disabled={isSubmittingRequest}
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

                  {/* STEP 4: ALASAN PERMINTAAN */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60/50 space-y-3 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            formAlasan.trim().length > 0
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-200 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {formAlasan.trim().length > 0 ? <Check className="w-4 h-4 text-white" /> : '4'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                            Alasan Permintaan <span className="text-rose-500">*</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Wajib diisi untuk pertimbangan admin
                          </p>
                        </div>
                      </div>

                    </div>

                    <textarea
                      rows={3}
                      value={formAlasan}
                      onChange={(e) => setFormAlasan(e.target.value)}
                      placeholder="Contoh: Barang sebelumnya rusak saat operasional / kebutuhan mendesak pembersihan lantai 3..."
                      required
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-slate-900 text-slate-900 dark:text-slate-100 text-xs bg-white dark:bg-slate-900"
                    />
                  </div>

                  {/* STEP 5: KIRIM PERMINTAAN */}
                  <div className="pt-2 space-y-3 border-t border-slate-100 dark:border-slate-800">
                    {isSubmittingRequest && cartSubmitProgress && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-100 text-xs flex items-center gap-2 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>{cartSubmitProgress}</span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {requestCart.length > 0
                          ? `${requestCart.length} item di keranjang akan diajukan berurutan.`
                          : 'Tambahkan barang ke keranjang terlebih dahulu.'}
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingRequest || requestCart.length === 0 || !selectedMemberId || !formAlasan.trim() || !canPerformAction('REQUEST')}
                        className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:shadow"
                      >
                        {isSubmittingRequest ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>Ajukan {requestCart.length > 0 ? `${requestCart.length} ` : ''}Permintaan</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* RIGHT COLUMN: PANDUAN SINGKAT PANEL */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4 text-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Panduan Singkat Pengambilan</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Informasi status barang &amp; alur gudang</p>
                  </div>
                </div>

                {/* Status Biner Explanation */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Arti Status Barang:</div>
                  <div className="space-y-1.5">
                    <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[9px] shrink-0 mt-0.5">
                        READY
                      </span>
                      <span className="text-[11px] text-emerald-950 leading-relaxed">
                        Barang tersedia fisik di rak gudang dan siap untuk diajukan.
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-200 flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[9px] shrink-0 mt-0.5">
                        KOSONG
                      </span>
                      <span className="text-[11px] text-rose-950 leading-relaxed">
                        Stok di gudang habis. Pengajuan dinonaktifkan hingga restok tiba.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workflow Status Steps (One Line with Arrows) */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Alur Status Permintaan:</div>
                  <div className="flex items-center justify-between text-[10px] font-bold bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
                    <span className="text-amber-700">MENUNGGU</span>
                    <span className="text-slate-400 dark:text-slate-500">&rarr;</span>
                    <span className="text-blue-700">DISETUJUI</span>
                    <span className="text-slate-400 dark:text-slate-500">&rarr;</span>
                    <span className="text-orange-700">DIPROSES</span>
                    <span className="text-slate-400 dark:text-slate-500">&rarr;</span>
                    <span className="text-emerald-700">SELESAI</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                    <li className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      <span><strong>MENUNGGU</strong>: Masuk ke antrean review verifikasi admin gudang.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <span><strong>DISETUJUI</strong>: Telah divalidasi dan disetujui admin gudang.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                      <span><strong>DIPROSES</strong>: Tim logistik menyiapkan fisik barang (picking list).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <span><strong>SELESAI</strong>: Fisik barang diserahkan ke personil lapangan.</span>
                    </li>
                  </ul>
                </div>

                {/* Important Notes */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Tips Pengisian:</div>
                  <p className="leading-relaxed">
                    Pastikan nama pemohon sesuai dengan lantai tugas Anda. Alasan yang jelas membantu admin memverifikasi urgensi pengambilan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* Riwayat Permintaan Saya (Crew History) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Riwayat Permintaan Saya{selectedMemberObj ? ` (${selectedMemberObj.NAMA_MEMBER})` : ''}
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full border border-slate-200 dark:border-slate-700">
                  {myRequests.length} data
                </span>
              </div>
            </div>

            <DataTable
              columns={crewColumns}
              data={myRequests}
              keyField={(r) => r.ID_PENGAJUAN}
              isLoading={isRequestsLoading}
              isError={Boolean(requestsError)}
              errorMessage={requestsError}
              onRetry={loadRequests}
              searchPlaceholder="Cari ID pengajuan, barang, atau alasan..."
              emptyTitle={selectedMemberId ? "Belum ada riwayat permintaan" : "Pilih nama Anda terlebih dahulu"}
              emptyDescription={selectedMemberId ? "Permintaan pengambilan barang yang Anda ajukan akan muncul di sini." : "Pilih nama Anda pada form di atas untuk melihat riwayat permintaan Anda."}
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW B: ADMIN PICKING LIST, RINGKASAN & KELOLA PENGAJUAN */}
      {/* ===================================================================== */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          {/* Ringkasan Admin: 3 Widget Rekap */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Widget 1: Rekap Status (5 Status) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  <Layers className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  <span>Rekap Status Pengajuan</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">{requests.length} Total</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <span className="text-amber-800 font-medium">Menunggu</span>
                  <span className="font-bold text-amber-900 font-mono">{adminSummary.menungguCount}</span>
                </div>
                <div className="p-2 rounded bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <span className="text-blue-800 font-medium">Disetujui</span>
                  <span className="font-bold text-blue-900 font-mono">{adminSummary.disetujuiCount}</span>
                </div>
                <div className="p-2 rounded bg-orange-50 border border-orange-200 flex items-center justify-between">
                  <span className="text-orange-800 font-medium">Diproses</span>
                  <span className="font-bold text-orange-900 font-mono">{adminSummary.diprosesCount}</span>
                </div>
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <span className="text-emerald-800 font-medium">Selesai</span>
                  <span className="font-bold text-emerald-900 font-mono">{adminSummary.selesaiCount}</span>
                </div>
                <div className="p-2 rounded bg-rose-50 border border-rose-200 flex items-center justify-between col-span-2">
                  <span className="text-rose-800 font-medium">Ditolak / Batal</span>
                  <span className="font-bold text-rose-900 font-mono">{adminSummary.ditolakCount}</span>
                </div>
              </div>
            </div>

            {/* Widget 2: Top Requester per Member (+ Lantai) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  <User className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  <span>Top Pemohon (Member)</span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Lantai</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {adminSummary.topRequesters.length === 0 ? (
                  <div className="text-slate-400 dark:text-slate-500 py-3 text-center text-xs">Belum ada data</div>
                ) : (
                  adminSummary.topRequesters.map((req, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50">
                      <div className="min-w-0 flex-1 truncate">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{req.member.NAMA_MEMBER}</span>
                        {req.member.LANTAI && (
                          <span className="ml-1.5 px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold">
                            Lt. {req.member.LANTAI}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 ml-2">{req.count} req</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Widget 3: Top 5 Barang Sering Diminta */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  <span>Top 5 Barang Diminta</span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Qty Total</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {adminSummary.topItems.length === 0 ? (
                  <div className="text-slate-400 dark:text-slate-500 py-3 text-center text-xs">Belum ada data</div>
                ) : (
                  adminSummary.topItems.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50">
                      <div className="min-w-0 flex-1 truncate">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{it.item.NAMA_ITEM}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">({it.count}x)</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 ml-2">
                        {it.totalQty} {it.item.SATUAN}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* DAFTAR SIAP DISIAPKAN (PICKING LIST) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Boxes className="w-4 h-4 text-orange-600" />
                <div>
                  <h3 className="text-sm font-semibold">Daftar Siap Disiapkan (Picking List Gudang)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Daftar permohonan berstatus DISETUJUI &amp; DIPROSES untuk diambil dan diserahkan ke personil.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-full font-bold font-mono text-xs">
                {pickingList.length} Antrean
              </span>
            </div>

            <DataTable
              columns={pickingColumns}
              data={pickingList}
              keyField={(r) => r.ID_PENGAJUAN}
              isLoading={isRequestsLoading}
              emptyTitle="Tidak ada antrean penyiapan"
              emptyDescription="Semua permohonan yang disetujui telah selesai diserahkan ke pemohon."
            />
          </div>

          {/* TABEL SELURUH RIWAYAT PENGAJUAN — KELOLA STATUS */}
          <div className="space-y-3">
            {/* Header & Legend Panel */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      Daftar Pengajuan — Kelola Status
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Pembaruan status langsung per baris untuk operasional gudang yang cepat
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700">
                    {filteredAllRequests.length} data
                  </span>
                  <button
                    type="button"
                    onClick={loadRequests}
                    disabled={isRequestsLoading}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 text-xs font-medium"
                    title="Muat Ulang Data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRequestsLoading ? 'animate-spin text-emerald-600' : ''}`} />
                    <span className="hidden sm:inline">Muat Ulang</span>
                  </button>
                </div>
              </div>

              {/* Legend Alur Status & Penjelasan Efek Tombol */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60/90 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs space-y-2 dark:bg-slate-800/60 dark:border-slate-700">
                <div className="flex items-center gap-2 flex-wrap text-slate-700 dark:text-slate-200 font-medium">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Alur Status:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-[11px]">
                    MENUNGGU
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 font-semibold text-[11px]">
                    DISETUJUI
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="px-2 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-800 font-semibold text-[11px]">
                    DIPROSES
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                    SELESAI
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    <strong className="text-emerald-700">Setujui</strong> = stok berkurang &amp; masuk picking list
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>
                    <strong className="text-orange-700">Mulai Siapkan</strong> = masuk antrean penyiapan
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>
                    <strong className="text-emerald-700">Selesai</strong> = barang diserahkan
                  </span>
                </div>
              </div>
            </div>

            <DataTable
              columns={allRequestsColumns}
              data={filteredAllRequests}
              keyField={(r) => r.ID_PENGAJUAN}
              isLoading={isRequestsLoading}
              isError={Boolean(requestsError)}
              errorMessage={requestsError}
              onRetry={loadRequests}
              searchPlaceholder="Cari ID pengajuan, member, barang, atau alasan..."
              emptyTitle="Belum ada riwayat pengajuan"
              emptyDescription="Semua pengajuan pengambilan dari personil akan tercatat di sini."
              filterControls={
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="MENUNGGU">Menunggu</option>
                  <option value="DISETUJUI">Disetujui</option>
                  <option value="DIPROSES">Diproses</option>
                  <option value="SELESAI">Selesai</option>
                  <option value="DITOLAK">Ditolak</option>
                </select>
              }
            />
          </div>
        </div>
      )}

      {/* Floating AI Assistant Bubble (Member Mode or Crew Form Tab) */}
      {(role === 'MEMBER' || activeTab === 'crew') && (
        <AIAssistantBubble
          selectedMember={selectedMemberObj}
          selectedItem={crewFormType === 'consumable' ? (lastConsumableItem || selectedItemObj) : selectedItemObj}
          isItemReady={crewFormType === 'consumable' ? (lastConsumableReady ?? isSelectedItemReady) : isSelectedItemReady}
        />
      )}
    </div>
  );
};
