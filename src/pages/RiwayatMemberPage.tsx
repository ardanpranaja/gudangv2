import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatCard } from '../components/common/StatCard';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterMember, MemberHistorySummary, Transaksi } from '../types';
import { History, PackageCheck, Layers, Calendar, Sliders, Info } from 'lucide-react';

export const RiwayatMemberPage: React.FC = () => {
  const { pageParams, navigateTo, refreshKey } = useApp();

  const [members, setMembers] = useState<MasterMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(pageParams.memberId || '');
  const [summary, setSummary] = useState<MemberHistorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load members list
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const memData = await api.getMembers();
        setMembers(memData);

        if (!selectedMemberId && memData.length > 0) {
          const initial = pageParams.memberId || memData[0].ID_MEMBER;
          setSelectedMemberId(initial);
        }
      } catch (err: any) {
        setIsError(true);
        setErrorMessage(err.message || 'Gagal memuat master member.');
      }
    };
    loadMembers();
  }, [refreshKey, pageParams.memberId]);

  // Load history summary from GAS for selected member
  useEffect(() => {
    if (!selectedMemberId) return;
    setIsLoading(true);
    setIsError(false);

    api
      .getMemberHistory(selectedMemberId)
      .then((data) => {
        setSummary(data);
      })
      .catch((err) => {
        setIsError(true);
        setErrorMessage(err.message || 'Gagal memuat riwayat member dari GAS.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedMemberId, refreshKey]);

  const selectedMember = members.find((m) => m.ID_MEMBER === selectedMemberId);

  const txColumns: Column<Transaksi>[] = [
    {
      key: 'TANGGAL',
      header: 'Tanggal & Waktu',
      sortable: true,
      render: (t) => (
        <div>
          <div className="font-mono text-stone-800 dark:text-stone-200 font-semibold">{t.TANGGAL}</div>
          <div className="text-[11px] font-mono text-stone-400 dark:text-stone-500">
            {t.TIMESTAMP && t.TIMESTAMP.length > 10 ? t.TIMESTAMP.slice(11) : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'NO_DOKUMEN',
      header: 'No. Dokumen',
      sortable: true,
      render: (t) => (
        <div>
          <div className="font-mono text-stone-900 dark:text-stone-100 font-semibold">{t.NO_DOKUMEN}</div>
          <div className="mt-0.5">
            <StatusBadge status={t.JENIS_TRANSAKSI} size="sm" />
          </div>
        </div>
      ),
    },
    {
      key: 'ID_ITEM',
      header: 'Barang yang Diambil / Dipinjam',
      sortable: true,
      render: (t) => (
        <div>
          <div className="font-medium text-stone-900 dark:text-stone-100">{t.NAMA_ITEM || t.ID_ITEM}</div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 italic">&quot;{t.KETERANGAN || '-'}&quot;</div>
        </div>
      ),
    },
    {
      key: 'JUMLAH',
      header: 'Jumlah',
      sortable: true,
      align: 'right',
      render: (t) => (
        <span className="font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums">{t.JUMLAH}</span>
      ),
    },
  ];

  // Member options for SearchableSelect
  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.ID_MEMBER,
        label: m.NAMA_MEMBER,
        badge: m.JABATAN || undefined,
        extra: `Status: ${m.STATUS}${m.NO_HP ? ` · HP: ${m.NO_HP}` : ''}`,
      })),
    [members]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Pengambilan Member"
        description="Rekam jejak distribusi barang kepada setiap member dari GET action=memberhistory backend Google Apps Script."
        actions={
          selectedMember && (
            <button
              onClick={() => navigateTo('limits', { memberId: selectedMember.ID_MEMBER })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded hover:bg-stone-50 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Lihat Batas Limit Member</span>
            </button>
          )
        }
      />

      {/* Member Selector Bar */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 p-5 space-y-4 shadow-[4.5px_4.5px_0px_#18181b]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <label className="block text-xs font-black text-stone-950 dark:text-stone-100 uppercase tracking-wider mb-1.5">
              Pilih Member:
            </label>
            <SearchableSelect
              value={selectedMemberId}
              onChange={setSelectedMemberId}
              options={memberOptions}
              placeholder="Cari dan pilih member..."
              searchPlaceholder="Cari ID member, nama member, atau jabatan..."
            />
          </div>

          {selectedMember && (
            <div className="flex items-center gap-4 bg-amber-100 dark:bg-stone-800/80 p-3.5 rounded-xl border-2 border-stone-900 dark:border-stone-500 shadow-[3px_3px_0px_#18181b]">
              <div>
                <div className="text-[11px] text-stone-700 dark:text-stone-400 font-bold">Jabatan / Role</div>
                <div className="font-black text-stone-950 dark:text-stone-100">{selectedMember.JABATAN || '-'}</div>
              </div>
              <div className="h-8 w-0.5 bg-stone-900 dark:bg-stone-600" />
              <div>
                <div className="text-[11px] text-stone-700 dark:text-stone-400 font-bold">Kontak</div>
                <div className="font-mono text-xs font-black text-stone-950 dark:text-stone-200">
                  {selectedMember.NO_HP || '-'}
                </div>
              </div>
              <div className="h-8 w-0.5 bg-stone-900 dark:bg-stone-600" />
              <div>
                <div className="text-[11px] text-stone-700 dark:text-stone-400 font-bold">Status</div>
                <StatusBadge status={selectedMember.STATUS} size="sm" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-3.5 bg-yellow-100 dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-500 rounded-xl text-xs text-stone-950 dark:text-stone-100 font-bold flex items-center gap-2 shadow-[2.5px_2.5px_0px_#18181b]">
        <Info className="w-4 h-4 text-stone-900 dark:text-stone-100 shrink-0 stroke-[2.5]" />
        <span>
          Data riwayat pengambilan member bersumber langsung dari backend GAS (<span className="font-mono font-black text-amber-900 dark:text-amber-300">action=memberhistory</span>).
        </span>
      </div>

      {/* KPI Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Transaksi Member"
            value={summary.totalTransaksi}
            unit="Kali"
            subtitle="Akumulasi pengambilan & pinjaman di GAS"
            icon={History}
            variant="cyan"
          />
          <StatCard
            label="Total Unit Barang Diambil"
            value={summary.totalQty}
            unit="Unit"
            subtitle="Keseluruhan barang yang pernah didistribusikan"
            icon={PackageCheck}
            variant="warning"
          />
          <StatCard
            label="Pengambilan Bulan Ini"
            value={summary.currentMonthQty}
            unit="Unit"
            subtitle="Periode bulan berjalan"
            icon={Calendar}
            variant="purple"
          />
        </div>
      )}

      {/* Breakdown Barang yang Pernah Diambil */}
      {summary && summary.items.length > 0 && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 p-5 space-y-3 shadow-[4.5px_4.5px_0px_#18181b]">
          <div className="flex items-center justify-between border-b-2 border-stone-900 dark:border-stone-700 pb-2">
            <h3 className="text-xs font-black text-stone-950 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-stone-950 dark:text-stone-200 stroke-[2.5]" />
              <span>Daftar Barang yang Pernah Diambil ({summary.items.length} SKU)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.items.map((item, idx) => (
              <div
                key={`${item.idItem}-${idx}`}
                className="p-3 bg-stone-50 dark:bg-stone-800/80 rounded-lg border-2 border-stone-900 dark:border-stone-500 flex items-center justify-between shadow-[2px_2px_0px_#18181b]"
              >
                <div>
                  <div className="font-black text-stone-950 dark:text-stone-100 text-xs">{item.namaItem}</div>
                  <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono mt-0.5 font-semibold">
                    Terakhir: {item.lastDate} · {item.count}x transaksi
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="font-mono font-black text-stone-950 dark:text-amber-400 text-sm tabular-nums">
                    {item.totalQty}
                  </div>
                  <div className="text-[10px] text-stone-600 dark:text-stone-400 uppercase font-bold">{item.satuan}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histori Transaksi Lengkap */}
      <DataTable
        columns={txColumns}
        data={summary?.transactions || []}
        keyField={(t) => `${t.ID_TRANSAKSI || t.NO_DOKUMEN}-${t.TIMESTAMP}`}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        searchPlaceholder="Cari nomor dokumen, nama barang, atau keterangan..."
        emptyTitle="Belum ada riwayat transaksi."
        emptyDescription="Member ini belum memiliki catatan transaksi di backend."
      />
    </div>
  );
};
