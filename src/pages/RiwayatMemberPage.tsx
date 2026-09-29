import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatCard } from '../components/common/StatCard';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterMember, MemberHistorySummary, Transaksi } from '../types';
import { History, PackageCheck, Layers, Calendar, Sliders } from 'lucide-react';

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

  // Load history summary for selected member
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
        setErrorMessage(err.message || 'Gagal memuat riwayat member dari transaksi.');
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
          <div className="font-mono text-slate-800 font-semibold">{t.TANGGAL}</div>
          <div className="text-[11px] font-mono text-slate-400">{t.TIMESTAMP.slice(11)}</div>
        </div>
      ),
    },
    {
      key: 'NO_DOKUMEN',
      header: 'No. Dokumen',
      sortable: true,
      render: (t) => (
        <div>
          <div className="font-mono text-slate-900 font-semibold">{t.NO_DOKUMEN}</div>
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
          <div className="font-medium text-slate-900">{t.NAMA_ITEM || t.ID_ITEM}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 italic">&quot;{t.KETERANGAN}&quot;</div>
        </div>
      ),
    },
    {
      key: 'JUMLAH',
      header: 'Jumlah',
      sortable: true,
      align: 'right',
      render: (t) => (
        <span className="font-mono font-bold text-slate-900 tabular-nums">{t.JUMLAH}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Pengambilan Member"
        description="Owner page rekam jejak distribusi barang kepada setiap member. Menghitung akumulasi kuota bulanan, jenis item yang pernah diambil, dan audit transaksi."
        actions={
          selectedMember && (
            <button
              onClick={() => navigateTo('limits', { memberId: selectedMember.ID_MEMBER })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Lihat Batas Limit Member</span>
            </button>
          )
        }
      />

      {/* Member Selector Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Member:
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 text-xs font-medium"
            >
              {members.map((m) => (
                <option key={m.ID_MEMBER} value={m.ID_MEMBER}>
                  [{m.ID_MEMBER}] {m.NAMA_MEMBER} — {m.JENIS_MEMBER} ({m.STATUS})
                </option>
              ))}
            </select>
          </div>

          {selectedMember && (
            <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div>
                <div className="text-[11px] text-slate-500">Jabatan / Role</div>
                <div className="font-semibold text-slate-900">{selectedMember.JENIS_MEMBER}</div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <div className="text-[11px] text-slate-500">Kontak</div>
                <div className="font-mono text-xs font-medium text-slate-800">
                  {selectedMember.NO_HP || '-'}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <div className="text-[11px] text-slate-500">Status</div>
                <StatusBadge status={selectedMember.STATUS} size="sm" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Transaksi Member"
            value={summary.totalTransaksi}
            unit="Kali"
            subtitle="Akumulasi pengambilan & pinjaman"
            icon={History}
          />
          <StatCard
            label="Total Unit Barang Diambil"
            value={summary.totalQty}
            unit="Unit"
            subtitle="Keseluruhan barang yang pernah didistribusikan"
            icon={PackageCheck}
          />
          <StatCard
            label="Pengambilan Bulan Ini"
            value={summary.currentMonthQty}
            unit="Unit"
            subtitle="Periode bulan berjalan"
            icon={Calendar}
          />
        </div>
      )}

      {/* Breakdown Barang yang Pernah Diambil */}
      {summary && summary.items.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-600" />
              <span>Daftar Barang yang Pernah Diambil ({summary.items.length} SKU)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.items.map((item) => (
              <div
                key={item.idItem}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-900 text-xs">{item.namaItem}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Terakhir: {item.lastDate} · {item.count}x transaksi
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                    {item.totalQty}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">{item.satuan}</div>
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
        keyField="ID_TRANSAKSI"
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        searchPlaceholder="Cari nomor dokumen, nama barang, atau keterangan..."
        emptyTitle="Belum ada riwayat transaksi."
        emptyDescription="Member ini belum pernah melakukan pengambilan atau peminjaman barang."
      />
    </div>
  );
};
