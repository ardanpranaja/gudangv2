import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { ItemStock } from '../types';
import { ScrollText, AlertTriangle, ArrowRight } from 'lucide-react';

export const StokPage: React.FC = () => {
  const { navigateTo, refreshKey } = useApp();

  const [stocks, setStocks] = useState<ItemStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filters
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'ALL' | 'LOW' | 'AVAILABLE'>('ALL');

  const loadStock = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await api.getStock();
      setStocks(data);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Gagal memuat saldo stok dari backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [refreshKey]);

  const filteredStocks = stocks.filter((item) => {
    if (selectedKategori !== 'ALL' && item.kategori !== selectedKategori) return false;
    if (selectedStockFilter === 'LOW' && !item.isLowStock) return false;
    if (selectedStockFilter === 'AVAILABLE' && item.stok <= 0) return false;
    return true;
  });

  const lowStockCount = stocks.filter((s) => s.isLowStock).length;

  const columns: Column<ItemStock>[] = [
    {
      key: 'idItem',
      header: 'ID Barang',
      sortable: true,
      className: 'font-mono text-slate-800 font-semibold',
    },
    {
      key: 'namaItem',
      header: 'Nama Barang',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-900">{item.namaItem}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Lokasi: {item.lokasi || '-'}</div>
        </div>
      ),
    },
    {
      key: 'kategori',
      header: 'Kategori',
      sortable: true,
      render: (item) => <span className="font-medium text-slate-700">{item.kategori}</span>,
    },
    {
      key: 'stok',
      header: 'Saldo Stok Tersedia',
      sortable: true,
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5 font-mono">
          {item.isLowStock && (
            <span title="Stok di bawah minimum">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            </span>
          )}
          <span
            className={`font-bold tabular-nums text-sm ${
              item.stok <= 0
                ? 'text-rose-600'
                : item.isLowStock
                ? 'text-amber-700'
                : 'text-slate-900'
            }`}
          >
            {item.stok}
          </span>
          <span className="text-[11px] text-slate-500 font-normal">{item.satuan}</span>
        </div>
      ),
    },
    {
      key: 'minStok',
      header: 'Min. Stok',
      sortable: true,
      align: 'right',
      render: (item) => (
        <span className="font-mono text-slate-600 tabular-nums">
          {item.minStok} {item.satuan}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <StatusBadge status={item.status} size="sm" />
          {item.isLowStock && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 rounded">
              Menipis
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'AKSI',
      header: 'Kartu Stok',
      align: 'center',
      render: (item) => (
        <button
          onClick={() => navigateTo('bincard', { itemId: item.idItem })}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="Buka Bin Card untuk meninjau riwayat mutasi barang ini"
        >
          <ScrollText className="w-3.5 h-3.5" />
          <span>Bin Card</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring Stok Fisik Gudang"
        description="Satu-satunya halaman utama posisi saldo stok. Nilai stok diturunkan secara sah dari histori transaksi masuk, keluar, pinjam, dan kembali di Spreadsheet."
        actions={
          lowStockCount > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{lowStockCount} barang</strong> berada di bawah batas minimum stok.
              </span>
            </div>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={filteredStocks}
        keyField="idItem"
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadStock}
        searchPlaceholder="Cari ID barang, nama item, atau lokasi..."
        emptyTitle="Tidak ada data stok."
        emptyDescription="Katalog barang atau transaksi belum tercatat di backend."
        filterControls={
          <div className="flex flex-wrap items-center gap-2">
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
              value={selectedStockFilter}
              onChange={(e) => setSelectedStockFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-700"
            >
              <option value="ALL">Semua Kondisi Stok</option>
              <option value="LOW">Stok Menipis (Di Bawah Min)</option>
              <option value="AVAILABLE">Stok Tersedia (&gt; 0)</option>
            </select>
          </div>
        }
      />

      {/* Principles card */}
      <div className="p-4 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-semibold text-slate-800">Prinsip Integritas Stok:</span> Stok tidak
          diinput secara manual melainkan dihitung otomatis dari mutasi transaksi: SALDO_AWAL (+),
          BARANG_MASUK (+), BARANG_KELUAR (-), PINJAM (-), KEMBALI (+).
        </div>
        <button
          onClick={() => navigateTo('masuk')}
          className="text-slate-900 font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <span>Penerimaan Masuk</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
