import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MasterItem, BinCardEntry, BinCardResult } from '../types';
import { ScrollText, Printer, Info } from 'lucide-react';

export const BinCardPage: React.FC = () => {
  const { pageParams, refreshKey } = useApp();

  const [items, setItems] = useState<MasterItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>(pageParams.itemId || '');
  const [binCardData, setBinCardData] = useState<BinCardResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // UI filters on the returned rows
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTxType, setSelectedTxType] = useState('ALL');

  // Load items list
  useEffect(() => {
    const loadItems = async () => {
      try {
        const itemsData = await api.getItems();
        setItems(itemsData);

        if (!selectedItemId && itemsData.length > 0) {
          const initial = pageParams.itemId || itemsData[0].ID_ITEM;
          setSelectedItemId(initial);
        }
      } catch (err: any) {
        setIsError(true);
        setErrorMessage(err.message || 'Gagal memuat katalog barang.');
      }
    };
    loadItems();
  }, [refreshKey, pageParams.itemId]);

  // Load Bin Card from GAS for selected item
  useEffect(() => {
    if (!selectedItemId) return;
    setIsLoading(true);
    setIsError(false);

    api
      .getBinCard(selectedItemId)
      .then((data) => {
        setBinCardData(data);
      })
      .catch((err) => {
        setIsError(true);
        setErrorMessage(err.message || 'Gagal mengambil data Kartu Stok dari GAS.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedItemId, refreshKey]);

  const selectedItem = items.find((i) => i.ID_ITEM === selectedItemId);

  // Apply UI Filters on rows returned by GAS
  const rawRows = binCardData?.rows || [];
  const filteredEntries = rawRows.filter((e) => {
    if (startDate && e.tanggal < startDate) return false;
    if (endDate && e.tanggal > endDate) return false;
    if (selectedTxType !== 'ALL' && e.jenisTransaksi !== selectedTxType) return false;
    return true;
  });

  const columns: Column<BinCardEntry>[] = [
    {
      key: 'tanggal',
      header: 'Tanggal & Waktu',
      sortable: true,
      render: (e) => (
        <div>
          <div className="font-mono text-slate-800 font-semibold">{e.tanggal}</div>
          <div className="text-[11px] font-mono text-slate-400">
            {e.timestamp && e.timestamp.length > 10 ? e.timestamp.slice(11) : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'noDokumen',
      header: 'No. Dokumen',
      sortable: true,
      render: (e) => (
        <div>
          <div className="font-mono text-slate-900 font-semibold">{e.noDokumen}</div>
          <div className="mt-0.5">
            <StatusBadge status={e.jenisTransaksi} size="sm" />
          </div>
        </div>
      ),
    },
    {
      key: 'keterangan',
      header: 'Keterangan Mutasi',
      render: (e) => (
        <div>
          <div className="text-slate-800">{e.keterangan || '-'}</div>
          {e.namaMember && (
            <div className="text-[11px] text-slate-500 mt-0.5">
              Member: <span className="font-semibold text-slate-700">{e.namaMember}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'masuk',
      header: 'Masuk (+)',
      sortable: true,
      align: 'right',
      render: (e) =>
        e.masuk > 0 ? (
          <span className="font-mono font-semibold text-emerald-700 tabular-nums">+{e.masuk}</span>
        ) : (
          <span className="text-slate-300 font-mono">-</span>
        ),
    },
    {
      key: 'keluar',
      header: 'Keluar (-)',
      sortable: true,
      align: 'right',
      render: (e) =>
        e.keluar > 0 ? (
          <span className="font-mono font-semibold text-rose-600 tabular-nums">-{e.keluar}</span>
        ) : (
          <span className="text-slate-300 font-mono">-</span>
        ),
    },
    {
      key: 'saldo',
      header: 'Saldo Berjalan',
      sortable: true,
      align: 'right',
      render: (e) => (
        <span className="font-mono font-bold text-slate-900 tabular-nums text-sm">
          {e.saldo}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kartu Stok / Bin Card"
        description="Rekapitulasi kronologis saldo berjalan pergerakan fisik barang yang dihitung langsung oleh GET action=bincard backend GAS."
        actions={
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Kartu Stok</span>
          </button>
        }
      />

      {/* Item Selector & Summary Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Item Barang untuk Kartu Stok:
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 text-xs font-medium"
            >
              {items.map((i) => (
                <option key={i.ID_ITEM} value={i.ID_ITEM}>
                  [{i.ID_ITEM}] {i.NAMA_ITEM} — ({i.KATEGORI})
                </option>
              ))}
            </select>
          </div>

          {binCardData && (
            <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div>
                <div className="text-[11px] text-slate-500">Saldo Awal (GAS)</div>
                <div className="font-mono text-base font-semibold text-slate-700 tabular-nums">
                  {binCardData.saldoAwal}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <div className="text-[11px] text-slate-500">Saldo Akhir (GAS)</div>
                <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                  {binCardData.saldoAkhir}{' '}
                  <span className="text-xs font-normal text-slate-500">{selectedItem?.SATUAN || 'UNIT'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
        <Info className="w-4 h-4 text-slate-500 shrink-0" />
        <span>
          Data Kartu Stok dan saldo berjalan dihitung langsung oleh backend Google Apps Script.
        </span>
      </div>

      {/* Bin Card Table */}
      <DataTable
        columns={columns}
        data={filteredEntries}
        keyField={(e) => `${e.noDokumen}-${e.timestamp}-${e.saldo}`}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        searchPlaceholder="Cari nomor dokumen, keterangan, atau nama member..."
        emptyTitle="Belum ada riwayat mutasi."
        emptyDescription="Barang ini belum memiliki catatan transaksi di backend."
        filterControls={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 text-xs bg-white border border-slate-200 rounded text-slate-700"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 text-xs bg-white border border-slate-200 rounded text-slate-700"
              />
            </div>
            <select
              value={selectedTxType}
              onChange={(e) => setSelectedTxType(e.target.value)}
              className="px-2 py-1 text-xs bg-white border border-slate-200 rounded text-slate-700"
            >
              <option value="ALL">Semua Jenis Transaksi</option>
              <option value="SALDO_AWAL">SALDO_AWAL</option>
              <option value="BARANG_MASUK">BARANG_MASUK</option>
              <option value="BARANG_KELUAR">BARANG_KELUAR</option>
              <option value="PINJAM">PINJAM</option>
              <option value="KEMBALI">KEMBALI</option>
            </select>
          </div>
        }
      />
    </div>
  );
};
