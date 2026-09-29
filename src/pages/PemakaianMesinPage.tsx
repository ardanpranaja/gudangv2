import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PemakaianMesin, MasterMesin, MasterMember } from '../types';
import { Plus, Wrench, Clock, Loader2 } from 'lucide-react';

export const PemakaianMesinPage: React.FC = () => {
  const { pageParams, canPerformAction, addToast, refreshKey, triggerRefresh } = useApp();

  const [usages, setUsages] = useState<PemakaianMesin[]>([]);
  const [machines, setMachines] = useState<MasterMesin[]>([]);
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filter
  const [selectedMachineFilter, setSelectedMachineFilter] = useState(pageParams.mesinId || 'ALL');

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMesinId, setFormMesinId] = useState('');
  const [formMemberId, setFormMemberId] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [jamMulai, setJamMulai] = useState('08:00');
  const [jamSelesai, setJamSelesai] = useState('12:00');
  const [durasi, setDurasi] = useState('4 Jam');
  const [tujuan, setTujuan] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [kondisiSebelum, setKondisiSebelum] = useState('Baik');
  const [kondisiSesudah, setKondisiSesudah] = useState('Baik');
  const [keterangan, setKeterangan] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [usageData, machineData, memberData] = await Promise.all([
        api.getMachineUsages(),
        api.getMachines(),
        api.getMembers(),
      ]);
      setUsages(usageData);
      setMachines(machineData);
      setMembers(memberData);

      if (machineData.length > 0 && !formMesinId) {
        setFormMesinId(machineData[0].ID_MESIN);
      }
      if (memberData.length > 0 && !formMemberId) {
        setFormMemberId(memberData[0].ID_MEMBER);
      }
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Gagal memuat log pemakaian mesin.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMesinId || !formMemberId || !tujuan.trim()) {
      addToast('error', 'Validasi Gagal', 'Lengkapi mesin, operator/member, dan tujuan pemakaian.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createMachineUsage({
        idMesin: formMesinId,
        idMember: formMemberId,
        tanggal,
        jamMulai,
        jamSelesai,
        durasi,
        tujuanPemakaian: tujuan.trim(),
        lokasiPemakaian: lokasi.trim() || 'Area Proyek',
        kondisiSebelum,
        kondisiSesudah,
        keterangan: keterangan.trim(),
      });

      addToast('success', 'Pemakaian Tercatat', 'Log operasional mesin berhasil disimpan.');
      setIsCreateModalOpen(false);
      setTujuan('');
      setLokasi('');
      setKeterangan('');
      triggerRefresh();
    } catch (err: any) {
      addToast('error', 'Gagal Mencatat Pemakaian', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsages = usages.filter((u) => {
    if (selectedMachineFilter !== 'ALL' && u.ID_MESIN !== selectedMachineFilter) return false;
    return true;
  });

  const columns: Column<PemakaianMesin>[] = [
    {
      key: 'ID_PEMAKAIAN',
      header: 'ID Log',
      sortable: true,
      className: 'font-mono text-slate-800 font-semibold',
    },
    {
      key: 'TANGGAL',
      header: 'Waktu Operasi',
      sortable: true,
      render: (u) => (
        <div>
          <div className="font-mono text-slate-800 font-semibold">{u.TANGGAL}</div>
          <div className="text-[11px] text-slate-400 font-mono">
            {u.JAM_MULAI} - {u.JAM_SELESAI} ({u.DURASI})
          </div>
        </div>
      ),
    },
    {
      key: 'ID_MESIN',
      header: 'Unit Mesin',
      sortable: true,
      render: (u) => {
        const m = machines.find((mac) => mac.ID_MESIN === u.ID_MESIN);
        return (
          <div>
            <div className="font-semibold text-slate-900">{u.NAMA_MESIN || m?.NAMA_MESIN || u.ID_MESIN}</div>
            <div className="text-[11px] font-mono text-slate-400">{u.ID_MESIN}</div>
          </div>
        );
      },
    },
    {
      key: 'ID_MEMBER',
      header: 'Operator / Member',
      sortable: true,
      render: (u) => {
        const mem = members.find((m) => m.ID_MEMBER === u.ID_MEMBER);
        return (
          <div>
            <div className="font-medium text-slate-900">{u.NAMA_MEMBER || mem?.NAMA_MEMBER || u.ID_MEMBER}</div>
            <div className="text-[11px] text-slate-400">Lokasi: {u.LOKASI_PEMAKAIAN || '-'}</div>
          </div>
        );
      },
    },
    {
      key: 'TUJUAN_PEMAKAIAN',
      header: 'Tujuan & Kondisi',
      render: (u) => (
        <div>
          <div className="text-slate-800">{u.TUJUAN_PEMAKAIAN}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Kondisi: {u.KONDISI_SEBELUM} &rarr; {u.KONDISI_SESUDAH}
          </div>
        </div>
      ),
    },
    {
      key: 'STATUS',
      header: 'Status',
      align: 'center',
      render: (u) => <StatusBadge status={u.STATUS} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log Pemakaian Mesin"
        description="Pencatatan jam terbang dan riwayat penugasan mesin oleh member. Terpisah dari transaksi mutasi barang habis pakai."
        actions={
          canPerformAction('TRANSACTION') && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Pemakaian Mesin</span>
            </button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={filteredUsages}
        keyField="ID_PEMAKAIAN"
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        searchPlaceholder="Cari ID log, nama mesin, operator, lokasi..."
        emptyTitle="Belum ada riwayat pemakaian."
        emptyDescription="Catatan pemakaian mesin operasional masih kosong."
        filterControls={
          <select
            value={selectedMachineFilter}
            onChange={(e) => setSelectedMachineFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700 max-w-[200px]"
          >
            <option value="ALL">Semua Unit Mesin</option>
            {machines.map((m) => (
              <option key={m.ID_MESIN} value={m.ID_MESIN}>
                {m.NAMA_MESIN} ({m.ID_MESIN})
              </option>
            ))}
          </select>
        }
      />

      {/* Modal Catat Pemakaian Mesin */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
            />
            <div className="inline-block w-full max-w-lg p-6 my-8 text-left align-middle bg-white shadow-xl rounded-lg border border-slate-200 relative z-10">
              <div className="flex items-center gap-2 mb-1 text-slate-900">
                <Wrench className="w-4 h-4 text-slate-700" />
                <h3 className="text-base font-semibold">Catat Log Pemakaian Mesin</h3>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Mencatat jam operasional dan kondisi mesin sebelum serta sesudah pemakaian.
              </p>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Pilih Mesin <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formMesinId}
                      onChange={(e) => setFormMesinId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                    >
                      {machines.map((m) => (
                        <option key={m.ID_MESIN} value={m.ID_MESIN}>
                          {m.NAMA_MESIN} ({m.ID_MESIN})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Pilih Operator (Member) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formMemberId}
                      onChange={(e) => setFormMemberId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                    >
                      {members.map((m) => (
                        <option key={m.ID_MEMBER} value={m.ID_MEMBER}>
                          {m.NAMA_MEMBER} ({m.JENIS_MEMBER})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Tanggal</label>
                    <input
                      type="date"
                      required
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Jam Mulai</label>
                    <input
                      type="time"
                      value={jamMulai}
                      onChange={(e) => setJamMulai(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Jam Selesai</label>
                    <input
                      type="time"
                      value={jamSelesai}
                      onChange={(e) => setJamSelesai(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Durasi</label>
                    <input
                      type="text"
                      value={durasi}
                      onChange={(e) => setDurasi(e.target.value)}
                      placeholder="Contoh: 3.5 Jam"
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Lokasi Pemakaian</label>
                    <input
                      type="text"
                      value={lokasi}
                      onChange={(e) => setLokasi(e.target.value)}
                      placeholder="Lantai 1 Lobby Barat"
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Tujuan Pemakaian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={tujuan}
                    onChange={(e) => setTujuan(e.target.value)}
                    placeholder="Contoh: Deep cleaning kristalisasi marmer"
                    className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Kondisi Sebelum</label>
                    <input
                      type="text"
                      value={kondisiSebelum}
                      onChange={(e) => setKondisiSebelum(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Kondisi Sesudah</label>
                    <input
                      type="text"
                      value={kondisiSesudah}
                      onChange={(e) => setKondisiSesudah(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Catatan Tambahan</label>
                  <textarea
                    rows={2}
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Catatan kendala teknis atau kebutuhan pergantian sparepart pad..."
                    className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Simpan Log</span>
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
