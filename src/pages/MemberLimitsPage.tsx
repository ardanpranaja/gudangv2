import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MemberLimit, MasterMember, MasterItem } from '../types';
import {
  Plus,
  Pencil,
  PowerOff,
  CheckCircle2,
  ArrowRight,
  Info,
  SlidersHorizontal,
  Loader2,
  X,
  ShieldAlert,
} from 'lucide-react';

export const MemberLimitsPage: React.FC = () => {
  const { pageParams, navigateTo, refreshKey, triggerRefresh, addToast, role } = useApp();

  const [limits, setLimits] = useState<MemberLimit[]>([]);
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Role access check
  const canManageLimit = role === 'ADMIN';

  // Filters
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    pageParams.memberId || 'ALL'
  );
  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal State: Create
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formMemberId, setFormMemberId] = useState('');
  const [formItemId, setFormItemId] = useState('');
  const [formMaxQty, setFormMaxQty] = useState<number>(1);
  const [formStatus, setFormStatus] = useState<'AKTIF' | 'NONAKTIF'>('AKTIF');

  // Modal State: Edit
  const [editModalData, setEditModalData] = useState<MemberLimit | null>(null);
  const [editMaxQty, setEditMaxQty] = useState<number>(1);
  const [editStatus, setEditStatus] = useState<'AKTIF' | 'NONAKTIF'>('AKTIF');

  // Confirm Dialog State: Deactivate
  const [deactivateTarget, setDeactivateTarget] = useState<MemberLimit | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Confirm Dialog State: Activate
  const [activateTarget, setActivateTarget] = useState<MemberLimit | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  // Submitting state for modals
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [limitsData, membersData, itemsData] = await Promise.all([
        api.getLimits(),
        api.getMembers(),
        api.getItems(),
      ]);
      setLimits(limitsData);
      setMembers(membersData);
      setItems(itemsData);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err?.message || 'Gagal memuat batas kuota limit member.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  useEffect(() => {
    if (pageParams.memberId) {
      setSelectedMemberId(pageParams.memberId);
    }
  }, [pageParams.memberId]);

  // Selected item info for create form
  const selectedCreateItem = useMemo(
    () => items.find((i) => i.ID_ITEM === formItemId),
    [items, formItemId]
  );

  // Selected item info for edit form
  const selectedEditItem = useMemo(
    () => (editModalData ? items.find((i) => i.ID_ITEM === editModalData.ID_ITEM) : null),
    [items, editModalData]
  );

  const selectedEditMember = useMemo(
    () => (editModalData ? members.find((m) => m.ID_MEMBER === editModalData.ID_MEMBER) : null),
    [members, editModalData]
  );

  // Active member options for SearchableSelect in Create Modal
  const activeMemberOptions = useMemo(
    () =>
      members
        .filter((m) => m.STATUS === 'AKTIF')
        .map((m) => ({
          value: m.ID_MEMBER,
          label: m.NAMA_MEMBER,
          badge: m.JABATAN || undefined,
          extra: m.ID_MEMBER,
        })),
    [members]
  );

  // Active item options for SearchableSelect in Create Modal
  const activeItemOptions = useMemo(
    () =>
      items
        .filter((i) => i.STATUS === 'AKTIF')
        .map((i) => ({
          value: i.ID_ITEM,
          label: i.NAMA_ITEM,
          badge: i.KATEGORI,
          extra: `${i.ID_ITEM} · ${i.SATUAN}`,
        })),
    [items]
  );

  // Filter options for top table filter
  const memberFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Semua Member' },
      ...members.map((m) => ({
        value: m.ID_MEMBER,
        label: m.NAMA_MEMBER,
        badge: m.JABATAN || undefined,
      })),
    ],
    [members]
  );

  const itemFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Semua Barang' },
      ...items.map((i) => ({
        value: i.ID_ITEM,
        label: i.NAMA_ITEM,
        badge: i.KATEGORI,
      })),
    ],
    [items]
  );

  const filteredLimits = limits.filter((limit) => {
    if (selectedMemberId !== 'ALL' && limit.ID_MEMBER !== selectedMemberId) return false;
    if (selectedItemId !== 'ALL' && limit.ID_ITEM !== selectedItemId) return false;
    if (selectedStatus !== 'ALL' && limit.STATUS !== selectedStatus) return false;
    return true;
  });

  // Open Edit Modal
  const handleOpenEdit = (limit: MemberLimit) => {
    setEditModalData(limit);
    setEditMaxQty(Number(limit.MAX_QTY) || 1);
    setEditStatus(limit.STATUS === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF');
  };

  // Submit Create Limit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageLimit) {
      addToast('error', 'Akses Ditolak', 'Peran Anda tidak memiliki izin untuk mengelola limit member.');
      return;
    }

    if (!formMemberId || !formItemId) {
      addToast('error', 'Validasi Gagal', 'Member dan barang wajib dipilih.');
      return;
    }

    const qty = Number(formMaxQty);
    if (isNaN(qty) || qty <= 0) {
      addToast('error', 'Validasi Gagal', 'Batas maksimum harus berupa angka lebih besar dari 0.');
      return;
    }

    // Pre-check duplicate active limit
    const duplicate = limits.find(
      (l) => l.ID_MEMBER === formMemberId && l.ID_ITEM === formItemId && l.STATUS === 'AKTIF'
    );
    if (duplicate) {
      addToast(
        'warning',
        'Limit Aktif Sudah Ada',
        `MEMBER_LIMIT aktif untuk member dan barang ini sudah terdaftar (${duplicate.ID_LIMIT}). Nonaktifkan atau perbarui limit yang ada.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createLimit({
        memberId: formMemberId,
        itemId: formItemId,
        maxQty: qty,
        satuan: selectedCreateItem?.SATUAN,
        status: formStatus,
      });

      addToast(
        'success',
        'Limit Berhasil Dibuat',
        res.message || `Limit ${res.ID_LIMIT || ''} berhasil disimpan ke Spreadsheet.`
      );

      setIsCreateModalOpen(false);
      setFormMemberId('');
      setFormItemId('');
      setFormMaxQty(1);
      setFormStatus('AKTIF');

      await loadData();
      triggerRefresh();
    } catch (err: unknown) {
      addToast('error', 'Gagal Membuat Limit', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Limit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalData) return;

    if (!canManageLimit) {
      addToast('error', 'Akses Ditolak', 'Peran Anda tidak memiliki izin untuk mengelola limit member.');
      return;
    }

    const qty = Number(editMaxQty);
    if (isNaN(qty) || qty <= 0) {
      addToast('error', 'Validasi Gagal', 'Batas maksimum harus berupa angka lebih besar dari 0.');
      return;
    }

    // If changing to AKTIF, check if duplicate active exists
    if (editStatus === 'AKTIF') {
      const duplicate = limits.find(
        (l) =>
          l.ID_LIMIT !== editModalData.ID_LIMIT &&
          l.ID_MEMBER === editModalData.ID_MEMBER &&
          l.ID_ITEM === editModalData.ID_ITEM &&
          l.STATUS === 'AKTIF'
      );
      if (duplicate) {
        addToast(
          'warning',
          'Konflik Limit Aktif',
          `Sudah ada limit aktif lain untuk kombinasi ini (${duplicate.ID_LIMIT}). Nonaktifkan terlebih dahulu limit tersebut.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await api.updateLimit({
        limitId: editModalData.ID_LIMIT,
        maxQty: qty,
        satuan: selectedEditItem?.SATUAN || editModalData.SATUAN,
        status: editStatus,
      });

      addToast(
        'success',
        'Limit Berhasil Diperbarui',
        res.message || `Perubahan untuk ${editModalData.ID_LIMIT} berhasil disimpan ke Spreadsheet.`
      );

      setEditModalData(null);
      await loadData();
      triggerRefresh();
    } catch (err: unknown) {
      addToast('error', 'Gagal Memperbarui Limit', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Deactivate Limit
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;

    setIsDeactivating(true);
    try {
      const res = await api.deactivateLimit(deactivateTarget.ID_LIMIT);
      addToast(
        'success',
        'Limit Dinonaktifkan',
        res.message || `Limit ${deactivateTarget.ID_LIMIT} berhasil dinonaktifkan.`
      );
      setDeactivateTarget(null);
      await loadData();
      triggerRefresh();
    } catch (err: unknown) {
      addToast('error', 'Gagal Menonaktifkan Limit', err);
    } finally {
      setIsDeactivating(false);
    }
  };

  // Confirm Activate Limit
  const handleConfirmActivate = async () => {
    if (!activateTarget) return;

    setIsActivating(true);
    try {
      const res = await api.activateLimit(activateTarget.ID_LIMIT);
      addToast(
        'success',
        'Limit Berhasil Diaktifkan',
        res.message || `Limit ${activateTarget.ID_LIMIT} berhasil diaktifkan kembali.`
      );
      setActivateTarget(null);
      await loadData();
      triggerRefresh();
    } catch (err: unknown) {
      addToast('error', 'Gagal Mengaktifkan Limit', err);
    } finally {
      setIsActivating(false);
    }
  };

  const columns: Column<MemberLimit>[] = [
    {
      key: 'ID_LIMIT',
      header: 'ID Limit',
      sortable: true,
      className: 'font-mono text-slate-800 font-semibold',
    },
    {
      key: 'ID_MEMBER',
      header: 'Member Penerima',
      sortable: true,
      render: (l) => {
        const member = members.find((m) => m.ID_MEMBER === l.ID_MEMBER);
        return (
          <div>
            <div className="font-semibold text-slate-900">
              {l.NAMA_MEMBER || member?.NAMA_MEMBER || l.ID_MEMBER}
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              {l.ID_MEMBER} · {member?.JABATAN || ''}
            </div>
          </div>
        );
      },
    },
    {
      key: 'ID_ITEM',
      header: 'Barang yang Dibatasi',
      sortable: true,
      render: (l) => {
        const item = items.find((i) => i.ID_ITEM === l.ID_ITEM);
        return (
          <div>
            <div className="font-medium text-slate-900">
              {l.NAMA_ITEM || item?.NAMA_ITEM || l.ID_ITEM}
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              {l.ID_ITEM} · {item?.KATEGORI || ''}
            </div>
          </div>
        );
      },
    },
    {
      key: 'MAX_QTY',
      header: 'Batas / Pengambilan',
      sortable: true,
      align: 'right',
      render: (l) => (
        <span className="font-mono font-semibold text-slate-900 tabular-nums">
          {l.MAX_QTY} {l.SATUAN}
        </span>
      ),
    },
    {
      key: 'STATUS',
      header: 'Status',
      align: 'center',
      render: (l) => <StatusBadge status={l.STATUS} size="sm" />,
    },
    {
      key: 'AKSI',
      header: 'Aksi & Riwayat',
      align: 'center',
      render: (l) => {
        const isAktif = l.STATUS === 'AKTIF';
        return (
          <div className="flex items-center justify-center gap-1.5">
            {canManageLimit && (
              <>
                {isAktif ? (
                  <>
                    <button
                      onClick={() => handleOpenEdit(l)}
                      title="Edit Limit"
                      className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded inline-flex items-center gap-1 transition-colors"
                    >
                      <Pencil className="w-3 h-3 text-slate-600" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setDeactivateTarget(l)}
                      title="Nonaktifkan Limit"
                      className="px-2 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded inline-flex items-center gap-1 transition-colors"
                    >
                      <PowerOff className="w-3 h-3 text-rose-600" />
                      <span>Nonaktifkan</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setActivateTarget(l)}
                    title="Aktifkan Kembali Limit"
                    className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded inline-flex items-center gap-1 transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Aktifkan</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => navigateTo('riwayat-member', { memberId: l.ID_MEMBER })}
              title="Lihat Histori Pengambilan Member"
              className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-0.5 font-medium hover:underline px-1.5 py-1"
            >
              <span>Histori</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Limit Member"
          description="Satu-satunya halaman konfigurasi kuota batas maksimum per pengambilan item untuk member di Spreadsheet (MEMBER_LIMIT)."
        />
        {canManageLimit && (
          <button
            onClick={() => {
              setFormMemberId('');
              setFormItemId('');
              setFormMaxQty(1);
              setFormStatus('AKTIF');
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Limit</span>
          </button>
        )}
      </div>

      <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            Data Limit Member bersumber langsung dari Google Spreadsheet (
            <span className="font-mono font-medium">MEMBER_LIMIT</span>). Batas kuota (
            <span className="font-mono font-medium">MAX_QTY</span>) mengatur jumlah maksimum item yang
            boleh diambil dalam <strong>satu transaksi pengambilan</strong>.
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono shrink-0 hidden md:block">
          Total: {limits.length} konfigurasi ({limits.filter((l) => l.STATUS === 'AKTIF').length} aktif)
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredLimits}
        keyField="ID_LIMIT"
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        searchPlaceholder="Cari ID limit, nama member, atau nama barang..."
        emptyTitle="Belum ada batasan limit."
        emptyDescription="Tidak ada data limit yang tercatat di Google Spreadsheet."
        filterControls={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-48">
              <SearchableSelect
                size="sm"
                value={selectedMemberId}
                onChange={setSelectedMemberId}
                options={memberFilterOptions}
                placeholder="Filter Member..."
                searchPlaceholder="Cari member..."
              />
            </div>

            <div className="w-48">
              <SearchableSelect
                size="sm"
                value={selectedItemId}
                onChange={setSelectedItemId}
                options={itemFilterOptions}
                placeholder="Filter Barang..."
                searchPlaceholder="Cari barang..."
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700 h-[32px]"
            >
              <option value="ALL">Semua Status</option>
              <option value="AKTIF">Hanya AKTIF</option>
              <option value="NONAKTIF">Hanya NONAKTIF</option>
            </select>
          </div>
        }
      />

      {/* CREATE LIMIT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
            />
            <div className="inline-block w-full max-w-lg p-6 my-8 text-left align-middle bg-white shadow-xl rounded-lg border border-slate-200 relative z-10 animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <SlidersHorizontal className="w-5 h-5 text-slate-700" />
                  <h3 className="text-base font-semibold">Tambah Limit Member</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-5">
                Konfigurasi batas alokasi pengambilan baru yang disimpan langsung ke Spreadsheet{' '}
                <span className="font-mono">MEMBER_LIMIT</span> via GAS.
              </p>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Pilih Member Penerima <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    disabled={isSubmitting}
                    required
                    value={formMemberId}
                    onChange={setFormMemberId}
                    options={activeMemberOptions}
                    placeholder="Cari ID, nama member, atau jabatan..."
                    searchPlaceholder="Cari member aktif..."
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Pilih Barang yang Dibatasi <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    disabled={isSubmitting}
                    required
                    value={formItemId}
                    onChange={setFormItemId}
                    options={activeItemOptions}
                    placeholder="Cari ID barang, nama barang, atau kategori..."
                    searchPlaceholder="Cari barang aktif..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Batas Maksimum (MAX_QTY) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        required
                        disabled={isSubmitting}
                        value={formMaxQty}
                        onChange={(e) => setFormMaxQty(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 font-mono text-xs pr-14"
                        placeholder="1"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs pointer-events-none">
                        {selectedCreateItem?.SATUAN || 'UNIT'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Jumlah maksimum per 1 kali pengambilan.
                    </span>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Satuan Barang
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={selectedCreateItem?.SATUAN ? `${selectedCreateItem.SATUAN} (Otomatis dari Master)` : 'Pilih barang dahulu'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-600 font-mono text-xs cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Masa Pakai Information Card (from MASTER_ITEM) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Masa Pakai Item:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedCreateItem
                        ? selectedCreateItem.MASA_PAKAI_BULAN
                          ? `${selectedCreateItem.MASA_PAKAI_BULAN} Bulan`
                          : 'Belum diatur'
                        : '-'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Masa pakai item bersumber dari <span className="font-mono">MASTER_ITEM</span>. Nilai ini
                    tidak disimpan di MEMBER_LIMIT, melainkan digunakan bersama oleh backend saat validasi
                    kelayakan pengambilan.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Status Awal
                  </label>
                  <select
                    disabled={isSubmitting}
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'AKTIF' | 'NONAKTIF')}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700 text-xs"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="NONAKTIF">NONAKTIF</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded font-medium hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formMemberId || !formItemId || Number(formMaxQty) <= 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan ke GAS...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Simpan Limit</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT LIMIT MODAL */}
      {editModalData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => !isSubmitting && setEditModalData(null)}
            />
            <div className="inline-block w-full max-w-lg p-6 my-8 text-left align-middle bg-white shadow-xl rounded-lg border border-slate-200 relative z-10 animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <Pencil className="w-5 h-5 text-slate-700" />
                  <h3 className="text-base font-semibold">Edit Limit Member</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalData(null)}
                  disabled={isSubmitting}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-5">
                Perbarui batas kuota atau status untuk ID Limit{' '}
                <span className="font-mono font-bold text-slate-800">{editModalData.ID_LIMIT}</span>. Member
                dan Barang dikunci sebagai identitas konfigurasi.
              </p>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Member (Terkunci)
                    </label>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700">
                      <div className="font-semibold">
                        {editModalData.NAMA_MEMBER || selectedEditMember?.NAMA_MEMBER || editModalData.ID_MEMBER}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {editModalData.ID_MEMBER} · {selectedEditMember?.JABATAN || ''}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Barang (Terkunci)
                    </label>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700">
                      <div className="font-semibold">
                        {editModalData.NAMA_ITEM || selectedEditItem?.NAMA_ITEM || editModalData.ID_ITEM}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {editModalData.ID_ITEM} · {selectedEditItem?.KATEGORI || ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Batas Maksimum (MAX_QTY) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        required
                        disabled={isSubmitting}
                        value={editMaxQty}
                        onChange={(e) => setEditMaxQty(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 font-mono text-xs pr-14"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs pointer-events-none">
                        {selectedEditItem?.SATUAN || editModalData.SATUAN}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Jumlah maksimum per 1 kali pengambilan.
                    </span>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Satuan Barang
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={`${selectedEditItem?.SATUAN || editModalData.SATUAN} (Otomatis)`}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-600 font-mono text-xs cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Masa Pakai Item:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedEditItem
                        ? selectedEditItem.MASA_PAKAI_BULAN
                          ? `${selectedEditItem.MASA_PAKAI_BULAN} Bulan`
                          : 'Belum diatur'
                        : '-'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Masa pakai merujuk pada MASTER_ITEM dan tidak disimpan di baris MEMBER_LIMIT.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Status Limit
                  </label>
                  <select
                    disabled={isSubmitting}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'AKTIF' | 'NONAKTIF')}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700 text-xs"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="NONAKTIF">NONAKTIF</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setEditModalData(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded font-medium hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || Number(editMaxQty) <= 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan ke GAS...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Simpan Perubahan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG DEACTIVATE */}
      <ConfirmDialog
        isOpen={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleConfirmDeactivate}
        isLoading={isDeactivating}
        variant="danger"
        title="Nonaktifkan Limit Member"
        message={
          deactivateTarget
            ? `Nonaktifkan limit ${deactivateTarget.ID_LIMIT} untuk member ${
                deactivateTarget.NAMA_MEMBER ||
                members.find((m) => m.ID_MEMBER === deactivateTarget.ID_MEMBER)?.NAMA_MEMBER ||
                deactivateTarget.ID_MEMBER
              } / barang ${
                deactivateTarget.NAMA_ITEM ||
                items.find((i) => i.ID_ITEM === deactivateTarget.ID_ITEM)?.NAMA_ITEM ||
                deactivateTarget.ID_ITEM
              }? Batas saat ini: ${deactivateTarget.MAX_QTY} ${
                deactivateTarget.SATUAN
              }. Baris konfigurasi tetap ada dan dapat diaktifkan kembali sewaktu-waktu.`
            : ''
        }
        confirmLabel="Nonaktifkan"
        cancelLabel="Batal"
      />

      {/* CONFIRM DIALOG ACTIVATE */}
      <ConfirmDialog
        isOpen={Boolean(activateTarget)}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleConfirmActivate}
        isLoading={isActivating}
        variant="primary"
        title="Aktifkan Kembali Limit Member"
        message={
          activateTarget
            ? `Aktifkan kembali limit ${activateTarget.ID_LIMIT} untuk member ${
                activateTarget.NAMA_MEMBER ||
                members.find((m) => m.ID_MEMBER === activateTarget.ID_MEMBER)?.NAMA_MEMBER ||
                activateTarget.ID_MEMBER
              } / barang ${
                activateTarget.NAMA_ITEM ||
                items.find((i) => i.ID_ITEM === activateTarget.ID_ITEM)?.NAMA_ITEM ||
                activateTarget.ID_ITEM
              } dengan batas maksimum ${activateTarget.MAX_QTY} ${activateTarget.SATUAN}?`
            : ''
        }
        confirmLabel="Aktifkan"
        cancelLabel="Batal"
      />
    </div>
  );
};
