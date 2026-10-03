import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
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
} from 'lucide-react';

export const PengajuanPage: React.FC = () => {
  const { pageParams, addToast, refreshKey, canPerformAction, role } = useApp();

  // Active Tab: 'crew' (Form Permintaan Crew) | 'admin' (Penyiapan & Kelola Admin)
  const [activeTab, setActiveTab] = useState<'crew' | 'admin'>('crew');

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
        title="Permintaan & Penyiapan Barang"
        description="Layanan terpadu permohonan pengambilan barang untuk personil lapangan dan alur penyiapan barang gudang."
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

      {/* Navigation Mode Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
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
          <span>Penyiapan &amp; Kelola (Admin/Gudang)</span>
          {pickingList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-bold">
              {pickingList.length}
            </span>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* VIEW A: CREW REQUEST FORM & RIWAYAT SAYA */}
      {/* ===================================================================== */}
      {activeTab === 'crew' && (
        <div className="space-y-6">
          {/* Crew Request Form Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Send className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold">Buat Permintaan Barang Baru</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Mode Personil Lapangan / Crew</span>
            </div>

            {submittedRequestId && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3 text-emerald-900 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-950">
                    Permintaan Berhasil Tercatat: ID {submittedRequestId}
                  </div>
                  <p className="mt-0.5 text-emerald-800">
                    Permintaan Anda telah masuk ke antrean gudang dan menunggu persetujuan admin.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleCrewSubmitRequest} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Pilih Nama Sendiri (dengan label Lantai) */}
                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">
                    Pilih Nama Anda: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => {
                      setSelectedMemberId(e.target.value);
                      setEligibilityResult(null);
                    }}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 text-slate-900 font-medium bg-white"
                  >
                    <option value="">-- Pilih Nama Pemohon --</option>
                    {members.map((m) => {
                      const floorText = m.LANTAI ? ` — Lantai ${m.LANTAI}` : '';
                      return (
                        <option key={m.ID_MEMBER} value={m.ID_MEMBER}>
                          {m.NAMA_MEMBER}{floorText} ({m.JABATAN || m.ID_MEMBER})
                        </option>
                      );
                    })}
                  </select>
                  {selectedMemberObj && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span>
                        Lokasi Tugas: <strong>{selectedMemberObj.LANTAI ? `Lantai ${selectedMemberObj.LANTAI}` : 'Belum ditentukan'}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Pilih Barang (Badge Status Biner READY / KOSONG - TANPA ANGKA STOK) */}
                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">
                    Pilih Barang: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value);
                      setEligibilityResult(null);
                    }}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 text-slate-900 font-medium bg-white"
                  >
                    <option value="">-- Pilih Barang --</option>
                    {items.map((item) => {
                      const isReady = stockAvailabilityMap.get(item.ID_ITEM) ?? false;
                      const statusTag = isReady ? '[READY]' : '[KOSONG]';
                      return (
                        <option key={item.ID_ITEM} value={item.ID_ITEM}>
                          {statusTag} {item.NAMA_ITEM} ({item.KATEGORI})
                        </option>
                      );
                    })}
                  </select>

                  {/* Binary Status Indicator Pill (No stock numbers!) */}
                  {selectedItemObj && (
                    <div className="flex items-center gap-2 text-[11px] pt-0.5">
                      {isSelectedItemReady ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                          <Check className="w-3 h-3" />
                          STATUS: READY
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold text-[10px]">
                          <AlertCircle className="w-3 h-3" />
                          STATUS: KOSONG (Tidak dapat diajukan)
                        </span>
                      )}
                      <span className="text-slate-500 font-mono text-[10px]">
                        Satuan: {selectedItemObj.SATUAN}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Jumlah & Tombol Cek Kelayakan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">
                    Jumlah Diminta: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formJumlah}
                    onChange={(e) => {
                      setFormJumlah(Math.max(1, Number(e.target.value)));
                      setEligibilityResult(null);
                    }}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 font-mono text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={handleCheckEligibility}
                    disabled={isCheckingEligibility || !selectedMemberId || !selectedItemId}
                    className="w-full py-2 px-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                    <p className="opacity-90">
                      {eligibilityResult.reason ||
                        (eligibilityResult.early
                          ? `Jatuh tempo pengambilan berikutnya adalah ${eligibilityResult.dueDate || 'belum tiba'}. Anda dapat mengajukan pengambilan lebih awal dengan menyertakan alasan yang jelas.`
                          : 'Kuota pengambilan tersedia.')}
                    </p>
                  </div>
                </div>
              )}

              {/* 4. Alasan Wajib (Min 10 karakter) */}
              <div className="space-y-1">
                <label className="block font-medium text-slate-700">
                  Alasan Permintaan: <span className="text-rose-500">* (Min. 10 karakter)</span>
                </label>
                <textarea
                  rows={3}
                  value={formAlasan}
                  onChange={(e) => setFormAlasan(e.target.value)}
                  placeholder="Contoh: Barang sebelumnya rusak saat operasional / kebutuhan mendesak pembersihan lantai..."
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 text-slate-900 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <div>
                  {!isSelectedItemReady && selectedItemObj && (
                    <span className="text-rose-600 font-semibold text-xs flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Stok kosong — tidak bisa diajukan
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingRequest || !isSelectedItemReady || !canPerformAction('REQUEST')}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  {isSubmittingRequest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Ajukan Permintaan</span>
                </button>
              </div>
            </form>
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
    </div>
  );
};
