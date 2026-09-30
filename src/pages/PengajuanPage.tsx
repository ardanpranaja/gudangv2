import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterMember, MasterItem } from '../types';
import { Plus, FileCheck2, Loader2, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export const PengajuanPage: React.FC = () => {
  const { pageParams, addToast, refreshKey, canPerformAction } = useApp();

  const [members, setMembers] = useState<MasterMember[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [memData, itmData] = await Promise.all([
        api.getMembers(),
        api.getItems(),
      ]);
      const activeMembers = memData.filter((m) => m.STATUS === 'AKTIF');
      const activeItems = itmData.filter((i) => i.STATUS === 'AKTIF');
      setMembers(activeMembers);
      setItems(activeItems);

      if (activeMembers.length > 0 && !formMemberId) {
        setFormMemberId(activeMembers[0].ID_MEMBER);
      }
      if (activeItems.length > 0 && !formItemId) {
        setFormItemId(activeItems[0].ID_ITEM);
      }
    } catch (err: any) {
      console.warn('Gagal memuat master data untuk form pengajuan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
        'Pengajuan Terkirim ke GAS',
        res?.message || 'Permintaan telah dikirim via POST action=request ke backend.'
      );

      setIsCreateModalOpen(false);
      setFormAlasan('');
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
        addToast('success', 'Persetujuan Diproses di GAS', res?.message || 'Pengajuan disetujui.');
      } else {
        const res = await api.rejectRequest({
          requestId: quickRequestId.trim(),
          approverId: quickApproverId.trim() || 'ADMIN',
          note: quickNote.trim() || 'Ditolak',
        });
        addToast('info', 'Penolakan Diproses di GAS', res?.message || 'Pengajuan ditolak.');
      }
      setQuickRequestId('');
      setQuickNote('');
    } catch (err: any) {
      addToast('error', 'Gagal Memproses Permintaan', err.message);
    } finally {
      setIsProcessingQuick(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Pengajuan Pengambilan Awal"
        description="Layanan permohonan pengambilan barang sebelum masa pakai selesai atau melebihi limit. Terhubung langsung via POST action=request ke GAS."
        actions={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!canPerformAction('TRANSACTION')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!canPerformAction('TRANSACTION') ? 'Akses ditolak: Memerlukan izin transaksi' : undefined}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Pengajuan Baru</span>
          </button>
        }
      />

      {/* Backend API Status Banner per Step 11 */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Status Endpoint API GAS (v1.2.4)</span>
        </div>
        <p className="text-amber-800 leading-relaxed">
          Sesuai spesifikasi GAS v1.2.4, endpoint daftar pengajuan (<code>GET action=requests</code>) belum
          disediakan oleh backend. Namun, pengiriman pengajuan baru (<code>POST action=request</code>) serta
          persetujuan/penolakan (<code>POST action=approve_request</code> & <code>POST action=reject_request</code>)
          sepenuhnya aktif dan terhubung.
        </p>
      </div>

      {/* Approval / Rejection Processor Form */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900">
          <FileCheck2 className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-semibold">Proses Approval / Rejection Pengajuan (GAS Contract)</h3>
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
                Payload dikirim langsung ke backend GAS via <code>POST action=request</code>.
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
