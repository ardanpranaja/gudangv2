import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MemberLimit, MasterMember, MasterItem } from '../types';
import { Plus, Sliders, Loader2, ArrowRight } from 'lucide-react';

export const MemberLimitsPage: React.FC = () => {
  const { pageParams, navigateTo, canPerformAction, addToast, refreshKey, triggerRefresh } = useApp();

  const [limits, setLimits] = useState<MemberLimit[]>([]);
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    pageParams.memberId || 'ALL'
  );
  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMemberId, setFormMemberId] = useState('');
  const [formItemId, setFormItemId] = useState('');
  const [formMaxQty, setFormMaxQty] = useState<number>(1);
  const [formSatuan, setFormSatuan] = useState('');

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

      if (membersData.length > 0 && !formMemberId) {
        setFormMemberId(membersData[0].ID_MEMBER);
      }
      if (itemsData.length > 0 && !formItemId) {
        setFormItemId(itemsData[0].ID_ITEM);
        setFormSatuan(itemsData[0].SATUAN);
      }
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Gagal memuat batas kuota limit member.');
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

  // When formItemId changes, auto set satuan
  const handleItemSelectChange = (itemId: string) => {
    setFormItemId(itemId);
    const item = items.find((i) => i.ID_ITEM === itemId);
    if (item) {
      setFormSatuan(item.SATUAN);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMemberId || !formItemId || formMaxQty <= 0) {
      addToast('error', 'Validasi Gagal', 'Lengkapi member, item, dan kuota maksimum.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createLimit({
        idMember: formMemberId,
        idItem: formItemId,
        maxQty: Number(formMaxQty),
        satuan: formSatuan || 'PCS',
      });

      addToast('success', 'Limit Berhasil Disimpan', 'Alokasi limit kuota baru telah tercatat.');
      setIsCreateModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      addToast('error', 'Gagal Menyimpan Limit', err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLimits = limits.filter((limit) => {
    if (selectedMemberId !== 'ALL' && limit.ID_MEMBER !== selectedMemberId) return false;
    if (selectedItemId !== 'ALL' && limit.ID_ITEM !== selectedItemId) return false;
    if (selectedStatus !== 'ALL' && limit.STATUS !== selectedStatus) return false;
    return true;
  });

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
              {l.ID_MEMBER} · {member?.JENIS_MEMBER || ''}
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
      header: 'Batas Maksimum (Bulan)',
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
      header: 'Riwayat',
      align: 'center',
      render: (l) => (
        <button
          onClick={() => navigateTo('riwayat-member', { memberId: l.ID_MEMBER })}
          className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 font-medium hover:underline"
        >
          <span>Histori</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Limit Member"
        description="Satu-satunya halaman utama pengelolaan kuota limit barang per member. Menentukan alokasi maksimal pengambilan berkala per periode."
        actions={
          canPerformAction('MASTER_MUTATION') && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Atur Limit Baru</span>
            </button>
          )
        }
      />

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
        emptyDescription="Seluruh member saat ini menggunakan kuota standar."
        filterControls={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700 max-w-[200px]"
            >
              <option value="ALL">Semua Member</option>
              {members.map((m) => (
                <option key={m.ID_MEMBER} value={m.ID_MEMBER}>
                  {m.NAMA_MEMBER} ({m.JENIS_MEMBER})
                </option>
              ))}
            </select>

            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700 max-w-[200px]"
            >
              <option value="ALL">Semua Barang</option>
              {items.map((i) => (
                <option key={i.ID_ITEM} value={i.ID_ITEM}>
                  {i.NAMA_ITEM}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700"
            >
              <option value="ALL">Semua Status</option>
              <option value="AKTIF">AKTIF</option>
              <option value="NONAKTIF">NONAKTIF</option>
            </select>
          </div>
        }
      />

      {/* Modal Atur Limit Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle bg-white shadow-xl rounded-lg border border-slate-200 relative z-10">
              <div className="flex items-center gap-2 mb-1 text-slate-900">
                <Sliders className="w-4 h-4 text-slate-700" />
                <h3 className="text-base font-semibold">Konfigurasi Kuota Limit Member</h3>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Membatasi jumlah pengambilan per bulan untuk member tertentu.
              </p>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Pilih Member <span className="text-rose-500">*</span>
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
                          {m.NAMA_MEMBER} ({m.JENIS_MEMBER} - {m.ID_MEMBER})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Pilih Barang <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formItemId}
                    onChange={(e) => handleItemSelectChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                  >
                    {items
                      .filter((i) => i.STATUS === 'AKTIF')
                      .map((i) => (
                        <option key={i.ID_ITEM} value={i.ID_ITEM}>
                          {i.NAMA_ITEM} ({i.SATUAN})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Batas Maksimal Kuota <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formMaxQty}
                      onChange={(e) => setFormMaxQty(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Satuan</label>
                    <input
                      type="text"
                      readOnly
                      value={formSatuan}
                      className="w-full px-3 py-2 border border-slate-200 rounded bg-slate-50 text-slate-600 font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Catatan Validasi:</span> Jika member
                  mengambil melebihi kuota ini dalam 1 bulan kalender, sistem akan meminta pengajuan awal
                  disetujui Admin.
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
                    <span>Simpan Limit</span>
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
