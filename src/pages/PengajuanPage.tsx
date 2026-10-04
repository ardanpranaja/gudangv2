import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { SearchableSelect, SearchableSelectOption } from '../components/common/SearchableSelect';
import { AIAssistantBubble } from '../components/ai/AIAssistantBubble';
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
  Building2,
  Send,
  Layers,
  HelpCircle,
} from 'lucide-react';

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
  const [selectedMemberId, setSelectedMemberId] = useState(pageParams.memberId || '');
  const [selectedItemId, setSelectedItemId] = useState(pageParams.itemId || '');
  const [formJumlah, setFormJumlah] = useState<number>(pageParams.jumlah || 1);
  const [formAlasan, setFormAlasan] = useState('');
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<PickupEligibilityResult | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // ADMIN & PICKING LIST STATE
  // ---------------------------------------------------------------------------
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [quickRequestId, setQuickRequestId] = useState('');
  const [quickApproverId, setQuickApproverId] = useState('ADMIN');
  const [quickNote, setQuickNote] = useState('');
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);
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

      if (activeMembers.length > 0 && !selectedMemberId) {
        setSelectedMemberId(activeMembers[0].ID_MEMBER);
      }
      if (activeItems.length > 0 && !selectedItemId) {
        setSelectedItemId(activeItems[0].ID_ITEM);
      }
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

    setIsCheckingEligibility(true);
    setEligibilityResult(null);
    try {
      const res = await api.getPickupEligibility(selectedMemberId, selectedItemId, formJumlah);
      setEligibilityResult(res);
      if (res.allowed && !res.early) {
        addToast('success', 'Kelayakan Terpenuhi', 'Pengambilan memenuhi jadwal dan kuota limit.');
      } else if (res.early) {
        addToast('info', 'Pengambilan Awal Terdeteksi', 'Alasan pengajuan wajib diisi untuk persetujuan admin.');
      } else {
        addToast('warning', 'Perhatian Limit', res.reason || 'Tidak memenuhi syarat kuota limit.');
      }
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Gagal memeriksa kelayakan.');
      addToast('error', 'Gagal Cek Kelayakan', msg);
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const handleCrewSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction('REQUEST')) {
      addToast('error', 'Akses Ditolak', 'Peran Anda tidak memiliki izin untuk mengajukan permintaan.');
      return;
    }

    if (!selectedMemberId || !selectedItemId) {
      addToast('error', 'Validasi Gagal', 'Nama pemohon dan barang wajib dipilih.');
      return;
    }

    if (!isSelectedItemReady) {
      addToast('error', 'Stok Kosong', 'Stok barang saat ini kosong — tidak dapat diajukan.');
      return;
    }

    if (formJumlah <= 0) {
      addToast('error', 'Validasi Gagal', 'Jumlah barang yang diminta harus lebih dari 0.');
      return;
    }

    if (!formAlasan.trim() || formAlasan.trim().length < 10) {
      addToast('error', 'Alasan Terlalu Singkat', 'Alasan permohonan wajib diisi minimal 10 karakter.');
      return;
    }

    setIsSubmittingRequest(true);
    setSubmittedRequestId(null);
    try {
      const res = await api.submitRequest({
        memberId: selectedMemberId,
        itemId: selectedItemId,
        jumlah: Number(formJumlah),
        alasan: formAlasan.trim(),
      });

      const newId = res.ID_PENGAJUAN || (res.request as any)?.ID_PENGAJUAN || 'REQ-BARU';
      setSubmittedRequestId(newId);
      addToast('success', 'Permintaan Berhasil Dikirim', `Pengajuan ${newId} telah tercatat di sistem.`);

      // Reset reason & eligibility
      setFormAlasan('');
      setEligibilityResult(null);

      // Refresh requests list
      await loadRequests();
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Terjadi kesalahan saat mengirim pengajuan.');
      addToast('error', 'Gagal Mengajukan Permintaan', msg);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: ADMIN APPROVAL & PICKING STATUS UPDATES
  // ---------------------------------------------------------------------------
  const handleProcessApproval = async (type: 'APPROVE' | 'REJECT') => {
    if (!canPerformAction('APPROVAL')) {
      addToast('error', 'Akses Ditolak', 'Hanya Admin yang memiliki hak akses persetujuan/penolakan pengajuan.');
      return;
    }

    if (!quickRequestId.trim()) {
      addToast('error', 'Validasi Gagal', 'Pilih atau masukkan ID Pengajuan terlebih dahulu.');
      return;
    }

    setIsProcessingApproval(true);
    try {
      if (type === 'APPROVE') {
        const res = await api.approveRequest({
          requestId: quickRequestId.trim(),
          approverId: quickApproverId.trim() || 'ADMIN',
          note: quickNote.trim() || 'Disetujui untuk disiapkan',
        });
        addToast('success', 'Pengajuan Disetujui', res?.message || 'Pengajuan disetujui & masuk antrean penyiapan.');
      } else {
        const res = await api.rejectRequest({
          requestId: quickRequestId.trim(),
          approverId: quickApproverId.trim() || 'ADMIN',
          note: quickNote.trim() || 'Ditolak',
        });
        addToast('info', 'Pengajuan Ditolak', res?.message || 'Pengajuan telah ditolak.');
      }
      setQuickRequestId('');
      setQuickNote('');
      await loadRequests();
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Gagal memproses approval.');
      addToast('error', 'Gagal Memproses Permintaan', msg);
    } finally {
      setIsProcessingApproval(false);
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
  const myRequests = useMemo(() => {
    if (!selectedMemberId) return requests;
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
          NAMA_MEMBER: r.ID_MEMBER,
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
          NAMA_ITEM: r.ID_ITEM,
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
        <div className="font-mono font-semibold text-slate-900">{r.ID_PENGAJUAN}</div>
      ),
    },
    {
      key: 'TANGGAL',
      header: 'Tanggal',
      sortable: true,
      render: (r) => <div className="text-slate-700">{r.TANGGAL || '-'}</div>,
    },
    {
      key: 'ID_ITEM',
      header: 'Barang Diminta',
      sortable: true,
      render: (r) => {
        const item = itemMap.get(r.ID_ITEM);
        return (
          <div>
            <div className="font-medium text-slate-900">{item?.NAMA_ITEM || r.ID_ITEM}</div>
            <div className="text-[11px] text-slate-500 font-mono">{r.ID_ITEM}</div>
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
        return (
          <div className="font-bold text-slate-900 tabular-nums">
            {r.JUMLAH} <span className="text-[11px] font-normal text-slate-500">{item?.SATUAN || 'UNIT'}</span>
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
          <span className="text-slate-600 font-medium text-xs">
            {mem?.LANTAI ? `Lantai ${mem.LANTAI}` : '-'}
          </span>
        );
      },
    },
    {
      key: 'ALASAN',
      header: 'Alasan Pengajuan',
      render: (r) => (
        <div className="max-w-xs text-slate-700 text-xs truncate" title={r.ALASAN}>
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
          <div className="font-mono font-bold text-slate-900">{r.ID_PENGAJUAN}</div>
          <div className="text-[10px] text-slate-400 font-mono">{r.TANGGAL}</div>
        </div>
      ),
    },
    {
      key: 'ID_ITEM',
      header: 'Nama Barang & Jumlah',
      sortable: true,
      render: (r) => {
        const itm = itemMap.get(r.ID_ITEM);
        return (
          <div>
            <div className="font-semibold text-slate-900">{itm?.NAMA_ITEM || r.ID_ITEM}</div>
            <div className="text-xs font-bold text-emerald-700 mt-0.5">
              Siapkan: {r.JUMLAH} {itm?.SATUAN || 'UNIT'}
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
            <div className="font-medium text-slate-900 flex items-center gap-1.5">
              <span>{mem?.NAMA_MEMBER || r.ID_MEMBER}</span>
              {mem?.LANTAI && (
                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                  Lt. {mem.LANTAI}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">{mem?.JABATAN || r.ID_MEMBER}</div>
          </div>
        );
      },
    },
    {
      key: 'ALASAN',
      header: 'Alasan Permintaan',
      render: (r) => (
        <div className="max-w-xs text-xs text-slate-600 line-clamp-2" title={r.ALASAN}>
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

        return <span className="text-slate-400 text-xs italic">Selesai</span>;
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
          <div className="font-mono font-bold text-slate-900">{r.ID_PENGAJUAN}</div>
          <div className="text-[10px] text-slate-400">{r.TANGGAL || '-'}</div>
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
            <div className="font-medium text-slate-900">
              {mem?.NAMA_MEMBER || r.ID_MEMBER}
              {mem?.LANTAI && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                  Lt. {mem.LANTAI}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">{mem?.JABATAN || r.ID_MEMBER}</div>
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
        return (
          <div>
            <div className="font-medium text-slate-900">{itm?.NAMA_ITEM || r.ID_ITEM}</div>
            <div className="text-[11px] text-slate-600 font-mono font-semibold">
              {r.JUMLAH} {itm?.SATUAN || 'UNIT'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'ALASAN',
      header: 'Alasan Permintaan',
      render: (r) => (
        <div className="max-w-xs text-xs text-slate-700 line-clamp-2" title={r.ALASAN}>
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
        if (!r.ID_APPROVER && !r.CATATAN_APPROVER) return <span className="text-slate-400 text-xs italic">-</span>;
        return (
          <div className="text-xs">
            <div className="font-medium text-slate-800">{r.ID_APPROVER}</div>
            {r.CATATAN_APPROVER && <div className="text-[11px] text-slate-500 italic">"{r.CATATAN_APPROVER}"</div>}
          </div>
        );
      },
    },
    {
      key: 'AKSI',
      header: 'Aksi',
      align: 'center',
      render: (r) => {
        if (r.STATUS.toUpperCase() === 'MENUNGGU' && canPerformAction('APPROVAL')) {
          return (
            <button
              type="button"
              onClick={() => {
                setQuickRequestId(r.ID_PENGAJUAN);
                setQuickNote(`Proses permohonan ${r.ID_MEMBER}`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded inline-flex items-center gap-1 transition-colors"
            >
              <span>Review</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          );
        }
        return null;
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
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
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'admin'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
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
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
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
          {/* Form Permintaan & Panduan Singkat Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* LEFT / MAIN COLUMN: FORM CARD */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
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
                {/* Success Banner */}
                {submittedRequestId && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900 text-xs animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-950 text-sm">
                        Permintaan Berhasil Tercatat: ID {submittedRequestId}
                      </div>
                      <p className="mt-1 text-emerald-800 leading-relaxed">
                        Permintaan Anda telah masuk ke antrean gudang dan menunggu persetujuan admin. Anda dapat memantau progresnya pada tabel Riwayat di bawah.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCrewSubmitRequest} className="space-y-6 text-xs">
                  {/* STEP 1: PILIH NAMA */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          selectedMemberId
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {selectedMemberId ? <Check className="w-4 h-4 text-white" /> : '1'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          Pilih Nama Anda <span className="text-rose-500">*</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
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
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                              <span className="truncate">{selectedMemberObj.NAMA_MEMBER}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 truncate">
                              {selectedMemberObj.JABATAN || 'Personil Lapangan'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-900 font-bold text-[11px] shadow-2xs">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{selectedMemberObj.LANTAI ? `Lantai ${selectedMemberObj.LANTAI}` : 'Lantai -'}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* STEP 2: PILIH BARANG */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          selectedItemId
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {selectedItemId ? <Check className="w-4 h-4 text-white" /> : '2'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          Pilih Barang <span className="text-rose-500">*</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
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
                      <div className="p-3 rounded-lg border bg-white flex items-center justify-between text-xs animate-fadeIn shadow-2xs">
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-slate-900 truncate">{selectedItemObj.NAMA_ITEM}</div>
                          <div className="text-[11px] text-slate-500 truncate">
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
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          formJumlah >= 1
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {formJumlah >= 1 ? <Check className="w-4 h-4 text-white" /> : '3'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          Jumlah &amp; Cek Kelayakan <span className="text-rose-500">*</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Tentukan kuantitas dan cek kesesuaian jadwal serta kuota limit
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-700">Jumlah Diminta:</label>
                        <input
                          type="number"
                          min={1}
                          value={formJumlah}
                          onChange={(e) => {
                            setFormJumlah(Math.max(1, Number(e.target.value)));
                            setEligibilityResult(null);
                          }}
                          required
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 font-mono text-slate-900 bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-end">
                        <button
                          type="button"
                          onClick={handleCheckEligibility}
                          disabled={isCheckingEligibility || !selectedMemberId || !selectedItemId}
                          className="w-full py-2 px-3.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
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

                  {/* STEP 4: ALASAN PERMINTAAN */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            formAlasan.trim().length >= 10
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {formAlasan.trim().length >= 10 ? <Check className="w-4 h-4 text-white" /> : '4'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            Alasan Permintaan <span className="text-rose-500">*</span>
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Wajib diisi minimal 10 karakter untuk pertimbangan admin
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-mono shrink-0 ${
                          formAlasan.trim().length >= 10 ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {formAlasan.trim().length} / 10 karakter
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={formAlasan}
                      onChange={(e) => setFormAlasan(e.target.value)}
                      placeholder="Contoh: Barang sebelumnya rusak saat operasional / kebutuhan mendesak pembersihan lantai 3..."
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 text-slate-900 text-xs bg-white"
                    />
                  </div>

                  {/* STEP 5: KIRIM PERMINTAAN */}
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100">
                    <div>
                      {!isSelectedItemReady && selectedItemObj && (
                        <span className="text-rose-600 font-semibold text-xs flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Stok kosong di gudang — form tidak dapat diajukan saat ini</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingRequest || !isSelectedItemReady || !canPerformAction('REQUEST')}
                      className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:shadow"
                    >
                      {isSubmittingRequest ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>Ajukan Permintaan Sekarang</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* RIGHT COLUMN: PANDUAN SINGKAT PANEL */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">Panduan Singkat Pengambilan</h3>
                    <p className="text-[10px] text-slate-500">Informasi status barang &amp; alur gudang</p>
                  </div>
                </div>

                {/* Status Biner Explanation */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-700">Arti Status Barang:</div>
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
                  <div className="text-[11px] font-semibold text-slate-700">Alur Status Permintaan:</div>
                  <div className="flex items-center justify-between text-[10px] font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-200 overflow-x-auto">
                    <span className="text-amber-700">MENUNGGU</span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="text-blue-700">DISETUJUI</span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="text-orange-700">DIPROSES</span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="text-emerald-700">SELESAI</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed pt-1">
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
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800">Tips Pengisian:</div>
                  <p className="leading-relaxed">
                    Pastikan nama pemohon sesuai dengan lantai tugas Anda. Alasan minimal 10 karakter membantu admin memverifikasi urgensi pengambilan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Riwayat Permintaan Saya (Crew History) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Riwayat Permintaan Saya ({selectedMemberObj?.NAMA_MEMBER || 'Semua'})
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 text-slate-700 rounded-full border border-slate-200">
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
              emptyTitle="Belum ada riwayat permintaan"
              emptyDescription="Permintaan pengambilan barang yang Anda ajukan akan muncul di sini."
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
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                  <Layers className="w-3.5 h-3.5 text-slate-600" />
                  <span>Rekap Status Pengajuan</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-500">{requests.length} Total</span>
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
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span>Top Pemohon (Member)</span>
                </div>
                <span className="text-[11px] text-slate-400">Lantai</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {adminSummary.topRequesters.length === 0 ? (
                  <div className="text-slate-400 py-3 text-center text-xs">Belum ada data</div>
                ) : (
                  adminSummary.topRequesters.map((req, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50">
                      <div className="min-w-0 flex-1 truncate">
                        <span className="font-medium text-slate-800">{req.member.NAMA_MEMBER}</span>
                        {req.member.LANTAI && (
                          <span className="ml-1.5 px-1 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            Lt. {req.member.LANTAI}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-900 ml-2">{req.count} req</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Widget 3: Top 5 Barang Sering Diminta */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
                  <span>Top 5 Barang Diminta</span>
                </div>
                <span className="text-[11px] text-slate-400">Qty Total</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {adminSummary.topItems.length === 0 ? (
                  <div className="text-slate-400 py-3 text-center text-xs">Belum ada data</div>
                ) : (
                  adminSummary.topItems.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50">
                      <div className="min-w-0 flex-1 truncate">
                        <span className="font-medium text-slate-800">{it.item.NAMA_ITEM}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({it.count}x)</span>
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
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Boxes className="w-4 h-4 text-orange-600" />
                <div>
                  <h3 className="text-sm font-semibold">Daftar Siap Disiapkan (Picking List Gudang)</h3>
                  <p className="text-[11px] text-slate-500">
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

          {/* FORM APPROVAL / REJECTION ADMIN */}
          {canPerformAction('APPROVAL') && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <FileCheck2 className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-semibold">Persetujuan / Penolakan Pengajuan (Approval)</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">POST approve_request / reject_request</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    ID Pengajuan (ID_PENGAJUAN) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={quickRequestId}
                    onChange={(e) => setQuickRequestId(e.target.value)}
                    placeholder="Contoh: REQ-202610-0001"
                    className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-slate-900 text-slate-800 uppercase"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    ID Approver (ID_APPROVER)
                  </label>
                  <input
                    type="text"
                    value={quickApproverId}
                    onChange={(e) => setQuickApproverId(e.target.value)}
                    placeholder="ADMIN"
                    className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-slate-900 text-slate-800"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-medium text-slate-700 mb-1">
                  Catatan Approver:
                </label>
                <textarea
                  rows={2}
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Catatan persetujuan / alasan penolakan..."
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900 text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isProcessingApproval || !quickRequestId.trim()}
                  onClick={() => handleProcessApproval('REJECT')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isProcessingApproval ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>Tolak (Reject)</span>
                </button>
                <button
                  type="button"
                  disabled={isProcessingApproval || !quickRequestId.trim()}
                  onClick={() => handleProcessApproval('APPROVE')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isProcessingApproval ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Setujui (Approve)</span>
                </button>
              </div>
            </div>
          )}

          {/* TABEL SELURUH RIWAYAT PENGAJUAN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900">Semua Riwayat Pengajuan</h3>
                <span className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                  {filteredAllRequests.length} data
                </span>
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
                  className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
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
          selectedItem={selectedItemObj}
          isItemReady={isSelectedItemReady}
        />
      )}
    </div>
  );
};
