import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterMember, MemberLimit, MemberHistorySummary } from '../types';
import { Eye, History, Sliders, Loader2, Info } from 'lucide-react';

export const MembersPage: React.FC = () => {
  const { navigateTo, refreshKey } = useApp();

  const [members, setMembers] = useState<MasterMember[]>([]);
  const [limits, setLimits] = useState<MemberLimit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters
  const [selectedJabatan, setSelectedJabatan] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Detail Drawer State
  const [selectedMember, setSelectedMember] = useState<MasterMember | null>(null);
  const [memberHistorySummary, setMemberHistorySummary] = useState<MemberHistorySummary | null>(null);
  const [isLoadingDrawerSummary, setIsLoadingDrawerSummary] = useState(false);

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
    if (selectedJabatan !== 'ALL' && m.JABATAN !== selectedJabatan) return false;
    if (selectedStatus !== 'ALL' && m.STATUS !== selectedStatus) return false;
    return true;
  });

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
      key: 'JABATAN',
      header: 'Jabatan',
      sortable: true,
      align: 'center',
      render: (m) => <StatusBadge status={m.JABATAN} size="sm" />,
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
        description="Data personil lapangan, jabatan sesuai MASTER_MEMBER, dan status kepesertaan dari MASTER_MEMBER Spreadsheet."
      />

      <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
        <Info className="w-4 h-4 text-slate-500 shrink-0" />
        <span>
          Data Master Member disinkronkan langsung dari Google Spreadsheet (<span className="font-mono font-medium">MASTER_MEMBER</span>).
        </span>
      </div>

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
        emptyDescription="Data member belum tersedia di Google Spreadsheet."
        filterControls={
          <div className="flex items-center gap-2">
            <select
              value={selectedJabatan}
              onChange={(e) => setSelectedJabatan(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700"
            >
              <option value="ALL">Semua Jabatan</option>
              {Array.from(new Set(members.map((m) => m.JABATAN).filter(Boolean))).sort().map((jabatan, idx) => (
                <option key={`${jabatan}-${idx}`} value={jabatan}>{jabatan}</option>
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

      {/* Member Detail Drawer */}
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
                <span className="text-slate-500 font-medium">Jabatan</span>
                <StatusBadge status={selectedMember.JABATAN} size="sm" />
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

            {/* Section Ringkasan Limit */}
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
                  Belum ada limit khusus untuk member ini di lembar MEMBER_LIMIT.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {memberLimits.slice(0, 3).map((l, idx) => (
                    <div
                      key={`${l.ID_LIMIT}-${idx}`}
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

            {/* Section Ringkasan Aktivitas */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">Ringkasan Aktivitas Pengambilan</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Data diambil dari API memberhistory backend
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
                  <span>Memuat ringkasan aktivitas dari GAS...</span>
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
                  Belum ada aktivitas transaksi untuk member ini di backend.
                </div>
              )}
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};
