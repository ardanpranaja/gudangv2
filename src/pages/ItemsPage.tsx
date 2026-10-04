import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { useApp } from '../context/AppContext';
import { api, normalizeGasErrorMessage } from '../services/api';
import { MasterItem, UpdateItemInput } from '../types';
import { Eye, ScrollText, Boxes, Info, Pencil, X, Check, Loader2 } from 'lucide-react';

export const ItemsPage: React.FC = () => {
  const { navigateTo, refreshKey, addToast } = useApp();

  const [items, setItems] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Drawer State
  const [selectedItem, setSelectedItem] = useState<MasterItem | null>(null);

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [editForm, setEditForm] = useState({
    namaItem: '',
    kategori: '',
    satuan: '',
    masaPakaiBulan: 1,
    minStok: 0,
    lokasi: '',
    status: 'AKTIF' as 'AKTIF' | 'NONAKTIF',
  });
  const [isSaving, setIsSaving] = useState(false);

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

  // Open Edit Modal
  const handleOpenEdit = (item: MasterItem) => {
    setEditingItem(item);
    setEditForm({
      namaItem: item.NAMA_ITEM || '',
      kategori: item.KATEGORI || '',
      satuan: item.SATUAN || '',
      masaPakaiBulan: Number(item.MASA_PAKAI_BULAN ?? 1),
      minStok: Number(item.MIN_STOK ?? 0),
      lokasi: item.LOKASI || '',
      status: item.STATUS === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
    });
  };

  // Save Edit Item
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editForm.namaItem.trim()) {
      addToast('warning', 'Validasi Gagal', 'Nama Barang wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      const input: UpdateItemInput = {
        idItem: editingItem.ID_ITEM,
      };

      if (editForm.namaItem.trim() !== (editingItem.NAMA_ITEM || '')) {
        input.namaItem = editForm.namaItem.trim();
      }
      if (editForm.kategori.trim() !== (editingItem.KATEGORI || '')) {
        input.kategori = editForm.kategori.trim();
      }
      if (editForm.satuan.trim() !== (editingItem.SATUAN || '')) {
        input.satuan = editForm.satuan.trim();
      }
      if (Number(editForm.masaPakaiBulan) !== Number(editingItem.MASA_PAKAI_BULAN)) {
        input.masaPakaiBulan = Math.max(0, Number(editForm.masaPakaiBulan));
      }
      if (Number(editForm.minStok) !== Number(editingItem.MIN_STOK)) {
        input.minStok = Math.max(0, Number(editForm.minStok));
      }
      if (editForm.lokasi.trim() !== (editingItem.LOKASI || '')) {
        input.lokasi = editForm.lokasi.trim();
      }
      if (editForm.status !== editingItem.STATUS) {
        input.status = editForm.status;
      }

      const changedKeys = Object.keys(input).filter((k) => k !== 'idItem');
      if (changedKeys.length === 0) {
        addToast('info', 'Tidak Ada Perubahan', 'Tidak ada data barang yang diubah.');
        setEditingItem(null);
        return;
      }

      const res = await api.updateItem(input);
      addToast(
        'success',
        'Barang Diperbarui',
        res.message || `Data barang ${editingItem.ID_ITEM} berhasil diperbarui.`
      );
      setEditingItem(null);
      await loadItems();
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Gagal memperbarui data barang.');
      addToast('error', 'Gagal Simpan', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedKategori !== 'ALL' && item.KATEGORI !== selectedKategori) return false;
    if (selectedStatus !== 'ALL' && item.STATUS !== selectedStatus) return false;
    return true;
  });

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
            onClick={() => handleOpenEdit(item)}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            title="Ubah Info Barang"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
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
        description="Katalog item gudang, spesifikasi kategori, satuan, dan aturan masa pakai dari lembar MASTER_ITEM Spreadsheet."
      />

      <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
        <Info className="w-4 h-4 text-slate-500 shrink-0" />
        <span>
          Data Master Barang disinkronkan secara langsung dari Google Spreadsheet (<span className="font-mono font-medium">MASTER_ITEM</span>).
        </span>
      </div>

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
        emptyDescription="Katalog barang masih kosong di Google Spreadsheet."
        filterControls={
          <div className="flex items-center gap-2">
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700"
            >
              <option value="ALL">Semua Kategori</option>
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
              <div>ID Item Permanen: <span className="font-mono font-semibold text-slate-700">{selectedItem.ID_ITEM}</span></div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ubah Info Barang</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-slate-500">ID Barang:</span>
                    <span className="font-mono text-[11px] font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                      {editingItem.ID_ITEM}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Tutup Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">
                  Nama Barang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.namaItem}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, namaItem: e.target.value }))}
                  placeholder="Nama barang..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 text-slate-900 bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Kategori:</label>
                  <select
                    value={editForm.kategori}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, kategori: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 text-slate-900 bg-white"
                  >
                    <option value="CHEMICAL">CHEMICAL</option>
                    <option value="PERALATAN">PERALATAN</option>
                    <option value="SERAGAM">SERAGAM</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Satuan:</label>
                  <input
                    type="text"
                    value={editForm.satuan}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, satuan: e.target.value }))}
                    placeholder="Contoh: UNIT, ROLL, PACK, LITER..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 text-slate-900 bg-white uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Masa Pakai (Bulan):</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.masaPakaiBulan}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        masaPakaiBulan: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 text-slate-900 font-mono bg-white"
                  />
                  <p className="text-[10px] text-slate-400">1 = Habis Pakai bulanan, &gt;=3 = Siklus periode</p>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Batas Minimum Stok:</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.minStok}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        minStok: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 text-slate-900 font-mono bg-white"
                  />
                  <p className="text-[10px] text-slate-400">Peringatan saat saldo di bawah angka ini</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Lokasi Gudang / Rak:</label>
                  <input
                    type="text"
                    value={editForm.lokasi}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, lokasi: e.target.value }))}
                    placeholder="Contoh: Rak A1, Lemari B, dsb..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 text-slate-900 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Status Barang:</label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        status: e.target.value as 'AKTIF' | 'NONAKTIF',
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 text-slate-900 bg-white font-medium"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="NONAKTIF">NONAKTIF</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !editForm.namaItem.trim()}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-all inline-flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
