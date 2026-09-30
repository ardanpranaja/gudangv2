import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MemberLimit, MasterMember, MasterItem } from '../types';
import { ArrowRight, Info } from 'lucide-react';

export const MemberLimitsPage: React.FC = () => {
  const { pageParams, navigateTo, refreshKey } = useApp();

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
        description="Satu-satunya halaman utama kuota limit barang per member dari MEMBER_LIMIT Spreadsheet. Menentukan alokasi maksimal pengambilan berkala per periode."
      />

      <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
        <Info className="w-4 h-4 text-slate-500 shrink-0" />
        <span>
          Data Limit Member bersumber langsung dari Google Spreadsheet (<span className="font-mono font-medium">MEMBER_LIMIT</span>).
        </span>
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
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700 max-w-[200px]"
            >
              <option value="ALL">Semua Member</option>
              {members.map((m) => (
                <option key={m.ID_MEMBER} value={m.ID_MEMBER}>
                  {m.NAMA_MEMBER} ({m.JABATAN})
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
    </div>
  );
};
