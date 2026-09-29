import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterItem } from '../types';
import { Eye, ScrollText, Boxes, Info } from 'lucide-react';

export const ItemsPage: React.FC = () => {
  const { navigateTo, refreshKey } = useApp();

  const [items, setItems] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Drawer State
  const [selectedItem, setSelectedItem] = useState<MasterItem | null>(null);

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
    </div>
  );
};
