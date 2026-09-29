import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterMesin, StatusMesin } from '../types';
import { Plus, Cog, Wrench, Loader2, ArrowRight } from 'lucide-react';

export const MasterMesinPage: React.FC = () => {
  const { navigateTo, canPerformAction, addToast, refreshKey, triggerRefresh } = useApp();

  const [machines, setMachines] = useState<MasterMesin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [namaMesin, setNamaMesin] = useState('');
  const [kategori, setKategori] = useState('MESIN POLESH');
  const [merk, setMerk] = useState('');
  const [model, setModel] = useState('');
  const [noSeri, setNoSeri] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [kondisi, setKondisi] = useState('BAIK');
  const [status, setStatus] = useState<StatusMesin>('TERSEDIA');

  const loadMachines = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await api.getMachines();
      setMachines(data);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Gagal memuat master mesin.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, [refreshKey]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaMesin.trim() || !merk.trim()) {
      addToast('error', 'Validasi Gagal', 'Nama mesin dan merk wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createMachine({
        namaMesin: namaMesin.trim(),
        kategori,
        merk: merk.trim(),
        model: model.trim() || '-',
        noSeri: noSeri.trim() || '-',
        lokasi: lokasi.trim() || 'Gudang Mesin',
        kondisi,
        status,
      });

      addToast('success', 'Mesin Terdaftar', `Unit mesin ${namaMesin} telah dicatat.`);
      setIsCreateModalOpen(false);
      setNamaMesin('');
      setMerk('');
      setModel('');
      setNoSeri('');
      triggerRefresh();
    } catch (err: any) {
      addToast('error', 'Gagal Mendaftarkan Mesin', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<MasterMesin>[] = [
    {
      key: 'ID_MESIN',
      header: 'ID Mesin',
      sortable: true,
      className: 'font-mono text-slate-800 font-semibold',
    },
    {
      key: 'NAMA_MESIN',
      header: 'Nama Unit Mesin',
      sortable: true,
      render: (m) => (
        <div>
          <div className="font-semibold text-slate-900">{m.NAMA_MESIN}</div>
          <div className="text-[11px] text-slate-400">
            {m.MERK} {m.MODEL !== '-' ? `· Model: ${m.MODEL}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'KATEGORI',
      header: 'Kategori',
      sortable: true,
      render: (m) => <span className="font-medium text-slate-700">{m.KATEGORI}</span>,
    },
    {
      key: 'NO_SERI',
      header: 'No. Seri',
      render: (m) => <span className="font-mono text-slate-600">{m.NO_SERI || '-'}</span>,
    },
    {
      key: 'KONDISI',
      header: 'Kondisi',
      align: 'center',
      render: (m) => <StatusBadge status={m.KONDISI} size="sm" />,
    },
    {
      key: 'STATUS',
      header: 'Status',
      align: 'center',
      render: (m) => <StatusBadge status={m.STATUS} size="sm" />,
    },
    {
      key: 'AKSI',
      header: 'Log Pemakaian',
      align: 'center',
      render: (m) => (
        <button
          onClick={() => navigateTo('pemakaian-mesin', { mesinId: m.ID_MESIN })}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Riwayat</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Mesin & Aset Bergerak"
        description="Pemisahan khusus aset mesin operasional dari barang habis pakai. Mengontrol nomor seri, kondisi fisik, dan kesiapan pemakaian."
        actions={
          canPerformAction('MASTER_MUTATION') && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Unit Mesin</span>
            </button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={machines}
        keyField="ID_MESIN"
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadMachines}
        searchPlaceholder="Cari ID mesin, nama unit, merk, no seri..."
        emptyTitle="Belum ada unit mesin."
        emptyDescription="Katalog mesin belum didaftarkan di spreadsheet MASTER_MESIN."
      />

      {/* Tahap Berikutnya Notice */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cog className="w-4 h-4 text-slate-500" />
          <span>
            <strong>Blueprint Section 23:</strong> Mesin diperlakukan khusus dan tidak dicampur dengan
            barang habis pakai.
          </span>
        </div>
        <button
          onClick={() => navigateTo('pemakaian-mesin')}
          className="text-slate-900 font-semibold hover:underline inline-flex items-center gap-1"
        >
          <span>Buka Pemakaian Mesin</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Modal Tambah Mesin */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
            />
            <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle bg-white shadow-xl rounded-lg border border-slate-200 relative z-10">
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Pendaftaran Unit Mesin Baru
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Struktur tersimpan pada lembar MASTER_MESIN.
              </p>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Nama Unit Mesin <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={namaMesin}
                    onChange={(e) => setNamaMesin(e.target.value)}
                    placeholder="Contoh: Single Disc Polisher 17 Inch"
                    className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Kategori</label>
                    <input
                      type="text"
                      value={kategori}
                      onChange={(e) => setKategori(e.target.value)}
                      placeholder="MESIN POLESH / VACUUM"
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Merk <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={merk}
                      onChange={(e) => setMerk(e.target.value)}
                      placeholder="Karcher / Nilfisk / Tennant"
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Model / Tipe</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="BDS 43/180 C"
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Nomor Seri</label>
                    <input
                      type="text"
                      value={noSeri}
                      onChange={(e) => setNoSeri(e.target.value)}
                      placeholder="SN-XXXX-YYYY"
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Kondisi</label>
                    <select
                      value={kondisi}
                      onChange={(e) => setKondisi(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                    >
                      <option value="BAIK">BAIK</option>
                      <option value="PERLU_MAINTENANCE">PERLU MAINTENANCE</option>
                      <option value="RUSAK">RUSAK</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as StatusMesin)}
                      className="w-full px-3 py-2 border border-slate-200 rounded text-slate-800"
                    >
                      <option value="TERSEDIA">TERSEDIA</option>
                      <option value="SEDANG_DIGUNAKAN">SEDANG_DIGUNAKAN</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="RUSAK">RUSAK</option>
                      <option value="TIDAK_AKTIF">TIDAK_AKTIF</option>
                    </select>
                  </div>
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
                    <span>Simpan Mesin</span>
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
