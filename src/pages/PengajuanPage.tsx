import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterMember, MasterItem, PengajuanPengambilan } from '../types';
import {
  Plus,
  FileCheck2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

export const PengajuanPage: React.FC = () => {
  const { pageParams, addToast, refreshKey, canPerformAction } = useApp();

  const [members, setMembers] = useState<MasterMember[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [requests, setRequests] = useState<PengajuanPengambilan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestsLoading, setIsRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState('');

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create Request Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMemberId, setFormMemberId] = useState(pageParams.memberId || '');
  const [formItemId, setFormItemId] = useState(pageParams.itemId || '');
  const [formJumlah, setFormJumlah] = useState<number>(pageParams.jumlah || 1);
  const [formAlasan, setFormAlasan] = useState('');

  // Quick Action State for Approval/Rejection if user inputs ID
  const [quickRequestId, setQuickRequestId] = useState('');
  const [quickApproverId, setQuickApproverId] = useState('ADMIN');
  const [quickNote, setQuickNote] = useState('');
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);

  // Fast lookups for Member & Item names
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

  const loadRequests = async () => {
    setIsRequestsLoading(true);
    setRequestsError('');
    try {
      const data = await api.getRequests();
      setRequests(data);
    } catch (err: any) {
      console.warn('Gagal memuat riwayat pengajuan dari GAS:', err);
      setRequestsError(err.message || 'Gagal memuat data pengajuan dari Google Spreadsheet.');
    } finally {
      setIsRequestsLoading(false);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [memData, itmData, reqData] = await Promise.all([
        api.getMembers(),
        api.getItems(),
        api.getRequests().catch((err) => {
          console.warn('Gagal memuat riwayat pengajuan pada startup:', err);
          return [] as PengajuanPengambilan[];
        }),
      ]);

      const activeMembers = memData.filter((m) => m.STATUS === 'AKTIF');
      const activeItems = itmData.filter((i) => i.STATUS === 'AKTIF');
      setMembers(activeMembers);
      setItems(activeItems);
      setRequests(reqData);

      if (activeMembers.length > 0 && !formMemberId) {
        setFormMemberId(activeMembers[0].ID_MEMBER);
      }
      if (activeItems.length > 0 && !formItemId) {
        setFormItemId(activeItems[0].ID_ITEM);
      }
    } catch (err: any) {
      console.warn('Gagal memuat master data untuk form pengajuan:', err);
      addToast('warning', 'Peringatan Koneksi', 'Gagal memuat sebagian data dari Google Spreadsheet.');
    } finally {
      setIsLoading(false);
      setIsRequestsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [refreshKey]);

  // If navigated with prefill params, auto open create modal if permitted
  useEffect(() => {
    if (pageParams.memberId && pageParams.itemId) {
      setFormMemberId(pageParams.memberId);
      setFormItemId(pageParams.itemId);
      if (pageParams.jumlah) setFormJumlah(pageParams.jumlah);
      if (canPerformAction('TRANSACTION')) {
        setIsCreateModalOpen(true);
      }
    }
  }, [pageParams]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction('TRANSACTION')) {
      addToast('error', 'Akses Ditolak', 'Peran Anda tidak memiliki izin untuk membuat pengajuan.');
      return;
    }

    if (!formMemberId || !formItemId || formJumlah <= 0 || !formAlasan.trim()) {
      addToast('error', 'Validasi Gagal', 'Alasan pengajuan wajib diisi secara rinci.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitRequest({
        memberId: formMemberId,
        itemId: formItemId,
        jumlah: Number(formJumlah),
        alasan: formAlasan.trim(),
      });

      addToast(
        'success',
        'Pengajuan Berhasil Dibuat',
        res?.message || 'Permintaan pengajuan pengambilan telah tersimpan di spreadsheet.'
      );

      setIsCreateModalOpen(false);
      setFormAlasan('');
      // Reload requests to immediately display the new request in table
      await loadRequests();
    } catch (err: any) {
      addToast('error', 'Gagal Mengirim Pengajuan', err.message || 'Terjadi kesalahan pada backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessApproval = async (type: 'APPROVE' | 'REJECT') => {
    if (!canPerformAction('APPROVAL')) {
      addToast('error', 'Akses Ditolak', 'Hanya Admin yang memiliki hak akses persetujuan/penolakan pengajuan.');
      return;
    }

    if (!quickRequestId.trim()) {
      addToast('error', 'Validasi Gagal', 'Masukkan ID Pengajuan (misal: REQ-202609-0001).');
      return;
    }

    setIsProcessingQuick(true);
    try {
      if (type === 'APPROVE') {
        const res = await api.approveRequest({
          requestId: quickRequestId.trim(),
          approverId: quickApproverId.trim() || 'ADMIN',
          note: quickNote.trim() || 'Disetujui',
        });
        addToast('success', 'Pengajuan Disetujui', res?.message || 'Pengajuan telah disetujui di spreadsheet.');
      } else {
        const res = await api.rejectRequest({
          requestId: quickRequestId.trim(),
          approverId: quickApproverId.trim() || 'ADMIN',
          note: quickNote.trim() || 'Ditolak',
        });
        addToast('info', 'Pengajuan Ditolak', res?.message || 'Pengajuan telah ditolak di spreadsheet.');
      }
      setQuickRequestId('');
      setQuickNote('');
      // Reload requests to update status in the table without browser refresh
      await loadRequests();
    } catch (err: any) {
      addToast('error', 'Gagal Memproses Permintaan', err.message);
    } finally {
      setIsProcessingQuick(false);
    }
  };

  const handleSelectForApproval = (req: PengajuanPengambilan) => {
    setQuickRequestId(req.ID_PENGAJUAN);
    if (!quickNote) {
      setQuickNote(`Proses untuk ${req.ID_MEMBER}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter requests
  const filteredRequests = useMemo(() => {
    if (statusFilter === 'ALL') return requests;
    return requests.filter((r) => r.STATUS.toUpperCase() === statusFilter);
  }, [requests, statusFilter]);

  // Table Columns
  const columns: Column<PengajuanPengambilan>[] = [
    {
      key: 'ID_PENGAJUAN',
      header: 'ID Pengajuan',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-mono font-semibold text-slate-900">{r.ID_PENGAJUAN}</div>
          {r.TIMESTAMP && (
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              {r.TIMESTAMP.length > 10 ? r.TIMESTAMP.slice(0, 19).replace('T', ' ') : r.TIMESTAMP}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'TANGGAL',
      header: 'Tanggal',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-mono text-slate-800 font-medium">{r.TANGGAL || '-'}</div>
          {r.TANGGAL_SEHARUSNYA && (
            <div className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded mt-0.5 inline-block border border-amber-200">
              Jatuh Tempo: {r.TANGGAL_SEHARUSNYA}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'ID_MEMBER',
      header: 'Member',
      sortable: true,
      searchValue: (r) => {
        const member = memberMap.get(r.ID_MEMBER);
        return `${r.ID_MEMBER} ${member?.NAMA_MEMBER || ''} ${member?.JABATAN || ''}`;
      },
      render: (r) => {
        const member = memberMap.get(r.ID_MEMBER);
        return (
          <div>
            <div className="font-medium text-slate-900">{member?.NAMA_MEMBER || r.ID_MEMBER}</div>
            <div className="text-[11px] font-mono text-slate-500">
              {r.ID_MEMBER} {member?.JABATAN ? `· ${member.JABATAN}` : ''}
            </div>
          </div>
        );
      },
    },
    {
      key: 'ID_ITEM',
      header: 'Barang',
      sortable: true,
      searchValue: (r) => {
        const item = itemMap.get(r.ID_ITEM);
        return `${r.ID_ITEM} ${item?.NAMA_ITEM || ''} ${item?.KATEGORI || ''}`;
      },
      render: (r) => {
        const item = itemMap.get(r.ID_ITEM);
        return (
          <div>
            <div className="font-medium text-slate-900">{item?.NAMA_ITEM || r.ID_ITEM}</div>
            <div className="text-[11px] text-slate-500">
              <span className="font-mono">{r.ID_ITEM}</span> {item?.KATEGORI ? `· ${item.KATEGORI}` : ''}
            </div>
          </div>
        );
      },
    },
    {
      key: 'JUMLAH',
      header: 'Jumlah',
      sortable: true,
      align: 'right',
      render: (r) => {
        const item = itemMap.get(r.ID_ITEM);
        return (
          <div className="text-right">
            <span className="font-mono font-bold text-slate-900 tabular-nums">{r.JUMLAH}</span>
            <span className="text-[11px] text-slate-500 ml-1">{item?.SATUAN || 'UNIT'}</span>
          </div>
        );
      },
    },
    {
      key: 'ALASAN',
      header: 'Alasan',
      render: (r) => (
        <div className="max-w-xs text-slate-700 text-xs leading-relaxed" title={r.ALASAN}>
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
      header: 'Approver',
      render: (r) => {
        if (!r.ID_APPROVER && !r.CATATAN_APPROVER) {
          return <span className="text-slate-400 text-[11px] italic">-</span>;
        }
        return (
          <div className="text-xs">
            <div className="font-mono font-medium text-slate-800">{r.ID_APPROVER || '-'}</div>
            {r.CATATAN_APPROVER && (
              <div className="text-[11px] text-slate-500 mt-0.5 italic">
                "{r.CATATAN_APPROVER}"
              </div>
            )}
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
              onClick={() => handleSelectForApproval(r)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors"
              title="Pilih ID ini untuk diproses di Form Approval"
            >
              <span>Pilih ID</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Pengajuan Pengambilan Awal"
        description="Layanan permohonan pengambilan barang sebelum masa pakai selesai atau melebihi limit. Data tersimpan dan terbaca langsung dari Google Spreadsheet."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadRequests}
              disabled={isRequestsLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Perbarui data riwayat pengajuan dari spreadsheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRequestsLoading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              disabled={!canPerformAction('TRANSACTION')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canPerformAction('TRANSACTION') ? 'Akses ditolak: Memerlukan izin transaksi' : undefined}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Pengajuan Baru</span>
            </button>
          </div>
        }
      />

      {/* Approval / Rejection Processor Form */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-slate-900">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold">Proses Approval / Rejection Pengajuan</h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">POST action=approve_request / reject_request</span>
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
              placeholder="Contoh: REQ-202609-0001"
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
              placeholder="ADMIN / MBR000001"
              className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-slate-900 text-slate-800"
            />
          </div>
        </div>

        <div className="text-xs">
          <label className="block font-medium text-slate-700 mb-1">
            Catatan Approver (CATATAN_APPROVER)
          </label>
          <textarea
            rows={2}
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder="Catatan persetujuan atau alasan penolakan..."
            className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900 text-slate-800"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isProcessingQuick || !quickRequestId.trim() || !canPerformAction('APPROVAL')}
            onClick={() => handleProcessApproval('REJECT')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!canPerformAction('APPROVAL') ? 'Akses ditolak: Memerlukan izin approval' : undefined}
          >
            {isProcessingQuick ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>Tolak (POST reject_request)</span>
          </button>
          <button
            type="button"
            disabled={isProcessingQuick || !quickRequestId.trim() || !canPerformAction('APPROVAL')}
            onClick={() => handleProcessApproval('APPROVE')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!canPerformAction('APPROVAL') ? 'Akses ditolak: Memerlukan izin approval' : undefined}
          >
            {isProcessingQuick ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>Setujui (POST approve_request)</span>
          </button>
        </div>
      </div>

      {/* Riwayat Pengajuan Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-900">Riwayat Pengajuan</h3>
            <span className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {filteredRequests.length} data
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredRequests}
          keyField={(r) => `${r.ID_PENGAJUAN}-${r.TIMESTAMP || r.TANGGAL}`}
          isLoading={isRequestsLoading || isLoading}
          isError={Boolean(requestsError)}
          errorMessage={requestsError}
          onRetry={loadRequests}
          searchPlaceholder="Cari ID pengajuan, member, barang, atau alasan..."
          emptyTitle="Belum ada riwayat pengajuan"
          emptyDescription="Pengajuan pengambilan awal dari personil lapangan akan tercatat di sini setelah dibuat."
          filterControls={
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="ALL">Semua Status</option>
              <option value="MENUNGGU">Menunggu</option>
              <option value="DISETUJUI">Disetujui</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
          }
        />
      </div>

      {/* Create Request Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle bg-white shadow-xl rounded-lg border border-slate-200 relative z-10">
              <div className="flex items-center gap-2 mb-1 text-slate-900">
                <FileCheck2 className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-semibold">Form Pengajuan Pengambilan Awal</h3>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Payload dikirim langsung ke backend GAS via <code>POST action=request</code> dan disimpan di Spreadsheet.
              </p>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Member Pemohon (ID_MEMBER) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formMemberId}
                    onChange={(e) => setFormMemberId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
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
                    Barang yang Diajukan (ID_ITEM) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formItemId}
                    onChange={(e) => setFormItemId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                  >
                    {items.map((i, idx) => (
                      <option key={`${i.ID_ITEM}-${idx}`} value={i.ID_ITEM}>
                        [{i.ID_ITEM}] {i.NAMA_ITEM} ({i.KATEGORI} - Masa Pakai: {i.MASA_PAKAI_BULAN} Bln)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Jumlah Diminta (JUMLAH) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formJumlah}
                    onChange={(e) => setFormJumlah(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Alasan Pengambilan Awal (ALASAN) <span className="text-rose-500">* (Wajib Diisi)</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formAlasan}
                    onChange={(e) => setFormAlasan(e.target.value)}
                    placeholder="Jelaskan alasan kerusakan, robek, hilang, tumpahan kimia, atau lonjakan intensitas pekerjaan..."
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !canPerformAction('TRANSACTION')}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canPerformAction('TRANSACTION') ? 'Akses ditolak: Memerlukan izin transaksi' : undefined}
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Kirim ke GAS (action=request)</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
