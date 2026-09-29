import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterMember, JenisMember, StatusMember, MemberLimit, MemberHistorySummary } from '../types';
import { Plus, Eye, History, Sliders, Loader2, ArrowRight } from 'lucide-react';

export const MembersPage: React.FC = () => {
  const { navigateTo, role, canPerformAction, addToast, refreshKey, triggerRefresh } = useApp();

  const [members, setMembers] = useState<MasterMember[]>([]);
  const [limits, setLimits] = useState<MemberLimit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters
  const [selectedJenis, setSelectedJenis] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Detail Drawer State
  const [selectedMember, setSelectedMember] = useState<MasterMember | null>(null);
  const [memberHistorySummary, setMemberHistorySummary] = useState<MemberHistorySummary | null>(null);
  const [isLoadingDrawerSummary, setIsLoadingDrawerSummary] = useState(false);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formNama, setFormNama] = useState('');
  const [formJenis, setFormJenis] = useState<JenisMember>('CREW');
  const [formNoHp, setFormNoHp] = useState('');
  const [formStatus, setFormStatus] = useState<StatusMember>('AKTIF');
  const [formTanggalMulai, setFormTanggalMulai] = useState(new Date().toISOString().slice(0, 10));

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [membersData, limitsData] = await Promise.all([
        api.getMembers(),
        api.getLimits(),
      ]);
      setMembers(membersData);
      setLimits(limitsData);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Gagal memuat master member.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  // Load summary for drawer when member selected
  const handleOpenDetail = async (member: MasterMember) => {
    setSelectedMember(member);
    setIsLoadingDrawerSummary(true);
    try {
      const history = await api.getMemberHistory(member.ID_MEMBER);
      setMemberHistorySummary(history);
    } catch {
      setMemberHistorySummary(null);
    } finally {
      setIsLoadingDrawerSummary(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    if (selectedJenis !== 'ALL' && m.JENIS_MEMBER !== selectedJenis) return false;
    if (selectedStatus !== 'ALL' && m.STATUS !== selectedStatus) return false;
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      addToast('error', 'Validasi Gagal', 'Nama member wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createMember({
        namaMember: formNama.trim(),
        jenisMember: formJenis,
        noHp: formNoHp.trim() || '-',
        status: formStatus,
      });

      addToast('success', 'Member Berhasil Didaftarkan', `Member ${formNama} telah tersimpan.`);
      setIsCreateModalOpen(false);
      setFormNama('');
      setFormNoHp('');
      triggerRefresh();
    } catch (err: any) {
      addToast('error', 'Gagal Mendaftarkan Member', err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<MasterMember>[] = [
    {
      key: 'ID_MEMBER',
      header: 'ID Member',
      sortable: true,
      className: 'font-mono text-slate-800 font-semibold',
    },
    {
      key: 'NAMA_MEMBER',
      header: 'Nama Member',
      sortable: true,
      render: (m) => (
        <div>
          <div className="font-semibold text-slate-900">{m.NAMA_MEMBER}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Mulai: {m.TANGGAL_MULAI || '-'}</div>
        </div>
      ),
    },
    {
      key: 'JENIS_MEMBER',
      header: 'Jenis / Jabatan',
      sortable: true,
      align: 'center',
      render: (m) => <StatusBadge status={m.JENIS_MEMBER} size="sm" />,
    },
    {
      key: 'NO_HP',
      header: 'No. Handphone',
      render: (m) => <span className="font-mono text-slate-600">{m.NO_HP || '-'}</span>,
    },
    {
      key: 'STATUS',
      header: 'Status',
      align: 'center',
      render: (m) => <StatusBadge status={m.STATUS} size="sm" />,
    },
    {
      key: 'AKSI',
      header: 'Aksi',
      align: 'center',
      render: (m) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => handleOpenDetail(m)}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            title="Lihat Detail Member"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigateTo('riwayat-member', { memberId: m.ID_MEMBER })}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            title="Buka Riwayat Pengambilan Member"
          >
            <History className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Get member limits for drawer
  const memberLimits = selectedMember
    ? limits.filter((l) => l.ID_MEMBER === selectedMember.ID_MEMBER)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Member"
        description="Owner page wajib untuk pengelolaan data personil lapangan, level jabatan (SM, SPV, TL, CREW, VENDOR), dan status kepesertaan."
        actions={
          canPerformAction('MASTER_MUTATION') ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Member</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded">
              Peran {role}: Hanya Lihat
            </div>
          )
        }
      />

      {/* Member Table */}
      <DataTable
        columns={columns}
        data={filteredMembers}
        keyField="ID_MEMBER"
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        searchPlaceholder="Cari ID, nama member, atau no HP..."
        emptyTitle="Belum ada member terdaftar."
        emptyDescription="Data member belum tersedia di spreadsheet."
        filterControls={
          <div className="flex items-center gap-2">
            <select
              value={selectedJenis}
              onChange={(e) => setSelectedJenis(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="SM">SM (Site Manager)</option>
              <option value="SPV">SPV (Supervisor)</option>
              <option value="TL">TL (Team Leader)</option>
              <option value="CREW">CREW</option>
              <option value="VENDOR">VENDOR</option>
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

      {/* Member Detail Drawer (Per Blueprint Section 6) */}
      <DetailDrawer
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title={selectedMember?.NAMA_MEMBER || 'Detail Member'}
        subtitle={`ID Member: ${selectedMember?.ID_MEMBER || '-'}`}
      >
        {selectedMember && (
          <div className="space-y-6 text-xs">
            {/* Section Informasi */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Status Member</span>
                <StatusBadge status={selectedMember.STATUS} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Jenis / Jabatan</span>
                <StatusBadge status={selectedMember.JENIS_MEMBER} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">No. Handphone</span>
                <span className="font-mono text-slate-800">{selectedMember.NO_HP || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Tanggal Mulai Bergabung</span>
                <span className="font-mono text-slate-800">{selectedMember.TANGGAL_MULAI || '-'}</span>
              </div>
            </div>

            {/* Section Ringkasan Limit (Ringkasan Saja, Link ke Limit Member) */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">Ringkasan Kuota Limit</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {memberLimits.length} batas alokasi item terkonfigurasi
                  </p>
                </div>
                <button
                  onClick={() => {
                    const id = selectedMember.ID_MEMBER;
                    setSelectedMember(null);
                    navigateTo('limits', { memberId: id });
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 hover:text-slate-950 underline"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Lihat Semua Limit</span>
                </button>
              </div>

              {memberLimits.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic">
                  Belum ada limit khusus untuk member ini (menggunakan aturan standar).
                </div>
              ) : (
                <div className="space-y-1.5">
                  {memberLimits.slice(0, 3).map((l) => (
                    <div
                      key={l.ID_LIMIT}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100 text-[11px]"
                    >
                      <span className="font-medium text-slate-800">
                        {l.NAMA_ITEM || l.ID_ITEM}
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        Maks {l.MAX_QTY} {l.SATUAN}
                      </span>
                    </div>
                  ))}
                  {memberLimits.length > 3 && (
                    <div className="text-[11px] text-slate-400 text-center pt-1">
                      +{memberLimits.length - 3} limit lainnya
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section Ringkasan Aktivitas (Ringkasan Saja, Link ke Riwayat Member) */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">Ringkasan Aktivitas Pengambilan</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Total pengambilan barang tercatat
                  </p>
                </div>
                <button
                  onClick={() => {
                    const id = selectedMember.ID_MEMBER;
                    setSelectedMember(null);
                    navigateTo('riwayat-member', { memberId: id });
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 hover:text-slate-950 underline"
                >
                  <History className="w-3 h-3" />
                  <span>Lihat Riwayat Lengkap</span>
                </button>
              </div>

              {isLoadingDrawerSummary ? (
                <div className="flex items-center gap-2 text-slate-500 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menghitung ringkasan aktivitas...</span>
                </div>
              ) : memberHistorySummary ? (
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Total Transaksi
                    </div>
                    <div className="font-mono text-base font-semibold text-slate-900 mt-0.5 tabular-nums">
                      {memberHistorySummary.totalTransaksi}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Total Unit Diambil
                    </div>
                    <div className="font-mono text-base font-semibold text-slate-900 mt-0.5 tabular-nums">
                      {memberHistorySummary.totalQty}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  Belum ada aktivitas transaksi untuk member ini.
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div>Didaftarkan: {selectedMember.CREATED_AT}</div>
              <div>Terakhir Diperbarui: {selectedMember.UPDATED_AT}</div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Modal Tambah Member */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle bg-white shadow-xl rounded-lg border border-slate-200 relative z-10">
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Pendaftaran Master Member Baru
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                ID Member permanen (contoh: MBR000001) dibuat oleh backend GAS.
              </p>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Nama Member <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    placeholder="Nama Lengkap Petugas / Nama Vendor"
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Jenis / Level <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formJenis}
                      onChange={(e) => setFormJenis(e.target.value as JenisMember)}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                    >
                      <option value="SM">SM (Site Manager)</option>
                      <option value="SPV">SPV (Supervisor)</option>
                      <option value="TL">TL (Team Leader)</option>
                      <option value="CREW">CREW</option>
                      <option value="VENDOR">VENDOR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as StatusMember)}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                    >
                      <option value="AKTIF">AKTIF</option>
                      <option value="NONAKTIF">NONAKTIF</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">No. Handphone</label>
                    <input
                      type="text"
                      value={formNoHp}
                      onChange={(e) => setFormNoHp(e.target.value)}
                      placeholder="0812xxxxxxxx"
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Tanggal Mulai</label>
                    <input
                      type="date"
                      value={formTanggalMulai}
                      onChange={(e) => setFormTanggalMulai(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                    />
                  </div>
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
                    <span>Simpan Member</span>
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
