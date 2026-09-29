import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PengajuanPengambilan, MasterMember, MasterItem } from '../types';
import { Plus, CheckCircle2, XCircle, FileCheck2, Loader2, Eye } from 'lucide-react';

export const PengajuanPage: React.FC = () => {
  const { pageParams, canPerformAction, addToast, refreshKey, triggerRefresh } = useApp();

  const [requests, setRequests] = useState<PengajuanPengambilan[]>([]);
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');

  // Detail Drawer
  const [selectedRequest, setSelectedRequest] = useState<PengajuanPengambilan | null>(null);

  // Approval/Rejection State
  const [actionTarget, setActionTarget] = useState<PengajuanPengambilan | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Create Request Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMemberId, setFormMemberId] = useState(pageParams.memberId || '');
  const [formItemId, setFormItemId] = useState(pageParams.itemId || '');
  const [formJumlah, setFormJumlah] = useState<number>(pageParams.jumlah || 1);
  const [formAlasan, setFormAlasan] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [reqData, memData, itmData] = await Promise.all([
        api.getRequests(),
        api.getMembers(),
        api.getItems(),
      ]);
      setRequests(reqData);
      setMembers(memData);
      setItems(itmData);

      if (memData.length > 0 && !formMemberId) {
        setFormMemberId(memData[0].ID_MEMBER);
      }
      if (itmData.length > 0 && !formItemId) {
        setFormItemId(itmData[0].ID_ITEM);
      }
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Gagal memuat daftar pengajuan pengambilan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  // If navigated with prefill params, auto open create modal
  useEffect(() => {
    if (pageParams.memberId && pageParams.itemId) {
      setFormMemberId(pageParams.memberId);
      setFormItemId(pageParams.itemId);
      if (pageParams.jumlah) setFormJumlah(pageParams.jumlah);
      setIsCreateModalOpen(true);
    }
  }, [pageParams]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMemberId || !formItemId || formJumlah <= 0 || !formAlasan.trim()) {
      addToast('error', 'Validasi Gagal', 'Alasan pengajuan wajib diisi secara rinci.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitRequest({
        memberId: formMemberId,
        itemId: formItemId,
        jumlah: Number(formJumlah),
        alasan: formAlasan.trim(),
      });

      addToast(
        'success',
        'Pengajuan Terkirim',
        'Permintaan telah masuk antrean approval Admin dan berstatus MENUNGGU.'
      );

      setIsCreateModalOpen(false);
      setFormAlasan('');
      triggerRefresh();
    } catch (err: any) {
      addToast('error', 'Gagal Mengirim Pengajuan', err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionTarget || !actionType) return;
    setIsProcessingAction(true);

    try {
      if (actionType === 'APPROVE') {
        await api.approveRequest({
          requestId: actionTarget.ID_PENGAJUAN,
          approver: 'Admin Gudang',
          catatan: actionNotes.trim() || 'Disetujui',
        });
        addToast(
          'success',
          'Pengajuan Disetujui',
          `Pengajuan ${actionTarget.ID_PENGAJUAN} telah disetujui dan transaksi BARANG_KELUAR otomatis diterbitkan.`
        );
      } else {
        await api.rejectRequest({
          requestId: actionTarget.ID_PENGAJUAN,
          approver: 'Admin Gudang',
          catatan: actionNotes.trim() || 'Ditolak oleh Admin',
        });
        addToast(
          'info',
          'Pengajuan Ditolak',
          `Pengajuan ${actionTarget.ID_PENGAJUAN} telah ditolak.`
        );
      }

      setActionTarget(null);
      setActionType(null);
      setActionNotes('');
      triggerRefresh();
    } catch (err: any) {
      addToast('error', 'Gagal Memproses Approval', err.message || 'Terjadi kesalahan.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (selectedStatus !== 'ALL' && r.STATUS !== selectedStatus) return false;
    if (selectedMemberId !== 'ALL' && r.ID_MEMBER !== selectedMemberId) return false;
    return true;
  });

  const columns: Column<PengajuanPengambilan>[] = [
    {
      key: 'ID_PENGAJUAN',
      header: 'ID Pengajuan',
      sortable: true,
      className: 'font-mono text-slate-800 font-semibold',
    },
    {
      key: 'NAMA_MEMBER',
      header: 'Member Pemohon',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-semibold text-slate-900">{r.NAMA_MEMBER}</div>
          <div className="text-[11px] font-mono text-slate-400">{r.ID_MEMBER}</div>
        </div>
      ),
    },
    {
      key: 'NAMA_ITEM',
      header: 'Barang yang Diminta',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.NAMA_ITEM}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic">
            &quot;{r.ALASAN}&quot;
          </div>
        </div>
      ),
    },
    {
      key: 'JUMLAH',
      header: 'Jumlah',
      sortable: true,
      align: 'right',
      render: (r) => (
        <span className="font-mono font-semibold text-slate-900 tabular-nums">{r.JUMLAH}</span>
      ),
    },
    {
      key: 'STATUS',
      header: 'Status',
      align: 'center',
      render: (r) => <StatusBadge status={r.STATUS} size="sm" />,
    },
    {
      key: 'CREATED_AT',
      header: 'Tanggal Diajukan',
      sortable: true,
      render: (r) => <span className="font-mono text-slate-500 text-[11px]">{r.CREATED_AT}</span>,
    },
    {
      key: 'AKSI',
      header: 'Aksi / Approval',
      align: 'center',
      render: (r) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setSelectedRequest(r)}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900"
            title="Lihat Detail Pengajuan"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {r.STATUS === 'MENUNGGU' && canPerformAction('APPROVAL') && (
            <>
              <button
                onClick={() => {
                  setActionTarget(r);
                  setActionType('APPROVE');
                  setActionNotes('');
                }}
                className="px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center gap-1"
                title="Setujui dan terbitkan Barang Keluar"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => {
                  setActionTarget(r);
                  setActionType('REJECT');
                  setActionNotes('');
                }}
                className="px-2 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded flex items-center gap-1"
                title="Tolak pengajuan"
              >
                <XCircle className="w-3 h-3 text-rose-600" />
                <span>Tolak</span>
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengajuan Pengambilan Awal"
        description="Owner page approval pengambilan sebelum masa pakai selesai atau melebihi limit. Pengajuan yang disetujui Admin akan otomatis menerbitkan mutasi BARANG_KELUAR."
        actions={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Pengajuan Baru</span>
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={filteredRequests}
        keyField="ID_PENGAJUAN"
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        searchPlaceholder="Cari ID pengajuan, nama member, alasan..."
        emptyTitle="Tidak ada pengajuan pengambilan."
        emptyDescription="Seluruh antrean pengajuan sudah diproses atau belum ada pengajuan baru."
        filterControls={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700"
            >
              <option value="ALL">Semua Status</option>
              <option value="MENUNGGU">MENUNGGU</option>
              <option value="DISETUJUI">DISETUJUI</option>
              <option value="DITOLAK">DITOLAK</option>
              <option value="DIBATALKAN">DIBATALKAN</option>
            </select>

            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700 max-w-[200px]"
            >
              <option value="ALL">Semua Member</option>
              {members.map((m) => (
                <option key={m.ID_MEMBER} value={m.ID_MEMBER}>
                  {m.NAMA_MEMBER}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Detail Drawer */}
      <DetailDrawer
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Detail Pengajuan Pengambilan"
        subtitle={`ID: ${selectedRequest?.ID_PENGAJUAN || '-'}`}
      >
        {selectedRequest && (
          <div className="space-y-5 text-xs">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Status Pengajuan</span>
                <StatusBadge status={selectedRequest.STATUS} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Member Pemohon</span>
                <span className="font-semibold text-slate-900">{selectedRequest.NAMA_MEMBER}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Barang Diminta</span>
                <span className="font-semibold text-slate-900">{selectedRequest.NAMA_ITEM}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Jumlah Diminta</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {selectedRequest.JUMLAH} Unit
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-semibold text-slate-900">Alasan Permintaan Pengambilan Awal:</h4>
              <div className="p-3 bg-white border border-slate-200 rounded text-slate-700 leading-relaxed italic">
                &quot;{selectedRequest.ALASAN}&quot;
              </div>
            </div>

            {selectedRequest.STATUS !== 'MENUNGGU' && (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
                <div className="font-semibold text-slate-800">Catatan Verifikasi Admin:</div>
                <div className="text-slate-600">Approver: {selectedRequest.APPROVER || '-'}</div>
                <div className="text-slate-600">Catatan: {selectedRequest.CATATAN || '-'}</div>
                <div className="text-slate-400 text-[11px]">Waktu Update: {selectedRequest.UPDATED_AT}</div>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>

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
                Alasan wajib diisi secara transparan untuk pertimbangan persetujuan Admin.
              </p>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Member Pemohon <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formMemberId}
                    onChange={(e) => setFormMemberId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                  >
                    {members
                      .filter((m) => m.STATUS === 'AKTIF')
                      .map((m) => (
                        <option key={m.ID_MEMBER} value={m.ID_MEMBER}>
                          {m.NAMA_MEMBER} ({m.JENIS_MEMBER})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Barang yang Diajukan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formItemId}
                    onChange={(e) => setFormItemId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                  >
                    {items
                      .filter((i) => i.STATUS === 'AKTIF')
                      .map((i) => (
                        <option key={i.ID_ITEM} value={i.ID_ITEM}>
                          {i.NAMA_ITEM} ({i.KATEGORI} - Masa Pakai: {i.MASA_PAKAI_BULAN} Bln)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Jumlah Diminta <span className="text-rose-500">*</span>
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
                    Alasan Pengambilan Awal <span className="text-rose-500">* (Wajib Diisi)</span>
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
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Kirim Pengajuan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog with Note */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => !isProcessingAction && setActionTarget(null)}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle bg-white shadow-xl rounded-lg border border-slate-200 relative z-10">
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                {actionType === 'APPROVE' ? 'Setujui Pengajuan Pengambilan' : 'Tolak Pengajuan'}
              </h3>
              <p className="text-xs text-slate-600 mb-4">
                {actionType === 'APPROVE'
                  ? `Pengajuan untuk ${actionTarget.NAMA_MEMBER} sebanyak ${actionTarget.JUMLAH} unit ${actionTarget.NAMA_ITEM} akan disetujui dan mutasi BARANG_KELUAR otomatis dicatat ke Google Spreadsheet.`
                  : `Pengajuan untuk ${actionTarget.NAMA_MEMBER} akan ditolak.`}
              </p>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Catatan Admin {actionType === 'REJECT' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows={2}
                  required={actionType === 'REJECT'}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={
                    actionType === 'APPROVE'
                      ? 'Catatan persetujuan (opsional)'
                      : 'Alasan penolakan pengajuan...'
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => setActionTarget(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isProcessingAction || (actionType === 'REJECT' && !actionNotes.trim())}
                  onClick={handleConfirmAction}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white rounded transition-colors disabled:opacity-50 ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isProcessingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{actionType === 'APPROVE' ? 'Setujui (Approve)' : 'Tolak Pengajuan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
