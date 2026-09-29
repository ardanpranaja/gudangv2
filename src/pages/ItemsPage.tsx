import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterItem, KategoriItem, StatusItem } from '../types';
import { Plus, Eye, ScrollText, Boxes, Loader2 } from 'lucide-react';

export const ItemsPage: React.FC = () => {
  const { navigateTo, role, canPerformAction, addToast, refreshKey, triggerRefresh } = useApp();

  const [items, setItems] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Drawer & Modal State
  const [selectedItem, setSelectedItem] = useState<MasterItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formNama, setFormNama] = useState('');
  const [formKategori, setFormKategori] = useState<KategoriItem>('PERALATAN');
  const [formSatuan, setFormSatuan] = useState('PCS');
  const [formMasaPakai, setFormMasaPakai] = useState<number>(1);
  const [formStokAwal, setFormStokAwal] = useState<number>(0);
  const [formMinStok, setFormMinStok] = useState<number>(5);
  const [formLokasi, setFormLokasi] = useState('');
  const [formStatus, setFormStatus] = useState<StatusItem>('AKTIF');

  const loadItems = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await api.getItems();
      setItems(data);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Gagal memuat daftar master barang.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [refreshKey]);

  const filteredItems = items.filter((item) => {
    if (selectedKategori !== 'ALL' && item.KATEGORI !== selectedKategori) return false;
    if (selectedStatus !== 'ALL' && item.STATUS !== selectedStatus) return false;
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formSatuan.trim()) {
      addToast('error', 'Validasi Gagal', 'Nama item dan satuan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createItem({
        namaItem: formNama.trim(),
        kategori: formKategori,
        satuan: formSatuan.trim().toUpperCase(),
        masaPakaiBulan: Number(formMasaPakai) || 1,
        stokAwal: Number(formStokAwal) || 0,
        minStok: Number(formMinStok) || 0,
        lokasi: formLokasi.trim() || '-',
        status: formStatus,
      });

      addToast('success', 'Barang Berhasil Didaftarkan', `Item ${formNama} telah tersimpan.`);
      setIsCreateModalOpen(false);
      // Reset form
      setFormNama('');
      setFormSatuan('PCS');
      setFormMasaPakai(1);
      setFormStokAwal(0);
      setFormMinStok(5);
      setFormLokasi('');
      triggerRefresh();
    } catch (err: any) {
      addToast('error', 'Gagal Menyimpan Barang', err.message || 'Terjadi kesalahan pada backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<MasterItem>[] = [
    {
      key: 'ID_ITEM',
      header: 'ID Barang',
      sortable: true,
      className: 'font-mono text-slate-800 font-semibold',
    },
    {
      key: 'NAMA_ITEM',
      header: 'Nama Barang',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-900">{item.NAMA_ITEM}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Lokasi: {item.LOKASI || '-'}</div>
        </div>
      ),
    },
    {
      key: 'KATEGORI',
      header: 'Kategori',
      sortable: true,
      render: (item) => (
        <span className="font-medium text-slate-700">{item.KATEGORI}</span>
      ),
    },
    {
      key: 'SATUAN',
      header: 'Satuan',
      align: 'center',
      render: (item) => <span className="font-mono text-slate-600">{item.SATUAN}</span>,
    },
    {
      key: 'MASA_PAKAI_BULAN',
      header: 'Masa Pakai',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="font-mono tabular-nums text-slate-700">
          {item.MASA_PAKAI_BULAN} Bulan
        </span>
      ),
    },
    {
      key: 'MIN_STOK',
      header: 'Min. Stok',
      sortable: true,
      align: 'right',
      render: (item) => (
        <span className="font-mono tabular-nums text-slate-700 font-medium">
          {item.MIN_STOK}
        </span>
      ),
    },
    {
      key: 'STATUS',
      header: 'Status',
      align: 'center',
      render: (item) => <StatusBadge status={item.STATUS} size="sm" />,
    },
    {
      key: 'AKSI',
      header: 'Aksi',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setSelectedItem(item)}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            title="Lihat Detail Barang"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigateTo('bincard', { itemId: item.ID_ITEM })}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            title="Buka Kartu Stok / Bin Card"
          >
            <ScrollText className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Barang"
        description="Owner page untuk pengelolaan katalog item gudang, spesifikasi kategori, satuan, dan batas masa pakai."
        actions={
          canPerformAction('MASTER_MUTATION') ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Barang</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded">
              Peran {role}: Hanya Lihat
            </div>
          )
        }
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredItems}
        keyField="ID_ITEM"
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadItems}
        searchPlaceholder="Cari ID, nama item, atau lokasi..."
        emptyTitle="Belum ada master barang."
        emptyDescription="Katalog barang masih kosong di spreadsheet."
        filterControls={
          <div className="flex items-center gap-2">
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="MESIN">MESIN</option>
              <option value="CHEMICAL">CHEMICAL</option>
              <option value="PERALATAN">PERALATAN</option>
              <option value="SERAGAM">SERAGAM</option>
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

      {/* Item Detail Drawer */}
      <DetailDrawer
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.NAMA_ITEM || 'Detail Barang'}
        subtitle={`ID: ${selectedItem?.ID_ITEM || '-'}`}
        footer={
          selectedItem && (
            <div className="flex items-center gap-2 w-full justify-between">
              <button
                onClick={() => {
                  const id = selectedItem.ID_ITEM;
                  setSelectedItem(null);
                  navigateTo('stok');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Lihat di Stok</span>
              </button>
              <button
                onClick={() => {
                  const id = selectedItem.ID_ITEM;
                  setSelectedItem(null);
                  navigateTo('bincard', { itemId: id });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span>Buka Bin Card</span>
              </button>
            </div>
          )
        }
      >
        {selectedItem && (
          <div className="space-y-6 text-xs">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Status Item</span>
                <StatusBadge status={selectedItem.STATUS} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Kategori</span>
                <span className="font-semibold text-slate-800">{selectedItem.KATEGORI}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Satuan Ukuran</span>
                <span className="font-mono text-slate-800">{selectedItem.SATUAN}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Lokasi Gudang</span>
                <span className="text-slate-800">{selectedItem.LOKASI || '-'}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 border-b border-slate-200 pb-1.5">
                Aturan & Batasan Operasional
              </h4>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Masa Pakai (Bulan)</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedItem.MASA_PAKAI_BULAN} Bulan
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Batas Minimum Stok</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedItem.MIN_STOK} {selectedItem.SATUAN}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Stok Awal Terdaftar</span>
                <span className="font-mono text-slate-700">
                  {selectedItem.STOK_AWAL} {selectedItem.SATUAN}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div>Didaftarkan: {selectedItem.CREATED_AT}</div>
              <div>Terakhir Diperbarui: {selectedItem.UPDATED_AT}</div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Modal Tambah Barang (Admin only) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
            />
            <div className="inline-block w-full max-w-lg p-6 my-8 text-left align-middle bg-white shadow-xl rounded-lg border border-slate-200 relative z-10">
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Pendaftaran Master Barang Baru
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                ID barang permanen akan dibuat secara otomatis oleh backend GAS.
              </p>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Nama Barang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    placeholder="Contoh: Microfiber Cloth Kuning (Restroom)"
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Kategori <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formKategori}
                      onChange={(e) => setFormKategori(e.target.value as KategoriItem)}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                    >
                      <option value="MESIN">MESIN</option>
                      <option value="CHEMICAL">CHEMICAL</option>
                      <option value="PERALATAN">PERALATAN</option>
                      <option value="SERAGAM">SERAGAM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Satuan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formSatuan}
                      onChange={(e) => setFormSatuan(e.target.value)}
                      placeholder="PCS / UNIT / JERIGEN / STEL"
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Masa Pakai (Bln)</label>
                    <input
                      type="number"
                      min={1}
                      value={formMasaPakai}
                      onChange={(e) => setFormMasaPakai(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Stok Awal</label>
                    <input
                      type="number"
                      min={0}
                      value={formStokAwal}
                      onChange={(e) => setFormStokAwal(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Min. Stok</label>
                    <input
                      type="number"
                      min={0}
                      value={formMinStok}
                      onChange={(e) => setFormMinStok(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Lokasi Penyimpanan</label>
                    <input
                      type="text"
                      value={formLokasi}
                      onChange={(e) => setFormLokasi(e.target.value)}
                      placeholder="Rak B-02 / Gudang Utama"
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as StatusItem)}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800"
                    >
                      <option value="AKTIF">AKTIF</option>
                      <option value="NONAKTIF">NONAKTIF</option>
                    </select>
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
                    <span>Simpan ke GAS</span>
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
