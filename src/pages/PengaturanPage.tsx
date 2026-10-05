import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { AIConfigPanel } from '../components/ai/AIConfigPanel';
import {
  Settings,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Database,
  Zap,
  Clock,
  XCircle,
} from 'lucide-react';

type SheetInfo = { name: string; exists: boolean };

function normalizeSheets(sheetsFound: unknown): SheetInfo[] {
  if (!Array.isArray(sheetsFound)) return [];
  return sheetsFound.map((s: any): SheetInfo => {
    if (typeof s === 'string') return { name: s, exists: true };
    return { name: s?.name || s?.sheetName || '?', exists: s?.exists !== false };
  });
}

function formatCheckedAt(iso?: string): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const PengaturanPage: React.FC = () => {
  const { role, health, refreshHealth, addToast } = useApp();

  const [gasUrlInput, setGasUrlInput] = useState(api.getGasUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [loadingDebug, setLoadingDebug] = useState(false);

  useEffect(() => {
    setGasUrlInput(api.getGasUrl());
  }, []);

  const handleSaveGasUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    api.setGasUrl(gasUrlInput);
    addToast('info', 'URL Disimpan', 'Menghubungkan ke endpoint Google Apps Script...');
    setIsTesting(true);
    await refreshHealth();
    setIsTesting(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    const fresh = await refreshHealth();
    setIsTesting(false);
    addToast('info', 'Uji Koneksi Selesai', `Status backend GAS: ${fresh?.status ?? health.status}`);
  };

  const handleFetchDebug = async () => {
    setLoadingDebug(true);
    try {
      const txs = await api.getDebugTransactions();
      setDebugLogs(txs.slice(0, 10));
      addToast('success', 'Debug Log Dimuat', `${Math.min(txs.length, 10)} transaksi mentah berhasil diambil.`);
    } catch (err: any) {
      addToast('error', 'Gagal Mengambil Log Debug', err.message);
    } finally {
      setLoadingDebug(false);
    }
  };

  const isOnline = health.status === 'ONLINE';
  const isAdmin = role === 'ADMIN';
  const sheets = normalizeSheets(health.sheetsFound);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Pengaturan & Integrasi Sistem"
        description="Status koneksi backend, konfigurasi AI Uti AI, mode akses pengguna, dan alat diagnostik admin."
      />

      {/* Backend Connection Card */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <Settings className="w-4 h-4 text-stone-700 dark:text-stone-200" />
            <h3 className="text-sm font-semibold">Koneksi Backend (Google Apps Script)</h3>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
            <span className="relative flex w-2.5 h-2.5">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isOnline ? 'bg-emerald-500' : health.status === 'OFFLINE' ? 'bg-rose-500' : 'bg-amber-400'
                }`}
              />
            </span>
            <span className="text-xs font-bold font-mono text-stone-700 dark:text-stone-200">{health.status}</span>
          </div>
        </div>

        <form onSubmit={handleSaveGasUrl} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-stone-700 dark:text-stone-200 mb-1">URL Web App Deployment GAS:</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={gasUrlInput}
                onChange={(e) => setGasUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg focus:ring-1 focus:ring-amber-700 text-stone-800 dark:text-stone-200 font-mono text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 transition-colors"
              >
                Simpan URL
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 rounded-lg font-medium hover:bg-stone-50 transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Uji Koneksi</span>
              </button>
            </div>
          </div>
        </form>

        {/* Online diagnostics */}
        {isOnline && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 font-medium mb-1">
                  <Database className="w-3.5 h-3.5" />
                  <span>Spreadsheet ID</span>
                </div>
                <div className="font-mono text-stone-800 dark:text-stone-200 truncate" title={health.spreadsheetId}>
                  {health.spreadsheetId || 'Connected'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 font-medium mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Latensi</span>
                </div>
                <div className="font-mono text-stone-800 dark:text-stone-200 font-bold">{health.latencyMs || 0} ms</div>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 font-medium mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Terakhir Dicek</span>
                </div>
                <div className="font-mono text-stone-800 dark:text-stone-200">{formatCheckedAt(health.lastChecked)}</div>
              </div>
            </div>

            {sheets.length > 0 && (
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-lg dark:bg-emerald-950/40 dark:border-emerald-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 mb-2 dark:text-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {sheets.length} Sheet Database Ditemukan
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sheets.map((s) => (
                    <span
                      key={s.name}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-mono text-[11px] border ${
                        s.exists
                          ? 'bg-white dark:bg-stone-900 text-emerald-800 border-emerald-200 dark:text-emerald-200 dark:border-emerald-800'
                          : 'bg-white dark:bg-stone-900 text-rose-700 border-rose-200 dark:text-rose-300 dark:border-rose-800'
                      }`}
                      title={s.exists ? 'Sheet tersedia' : 'Sheet tidak ditemukan'}
                    >
                      {s.exists ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <XCircle className="w-3 h-3 text-rose-500" />
                      )}
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {health.status === 'OFFLINE' && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-1 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Gagal Terhubung ke Backend GAS</span>
            </div>
            <div className="text-[11px] text-rose-700 dark:text-rose-300">{health.error}</div>
            <p className="text-[11px] text-rose-600 pt-1">
              Pastikan Web App disetel dengan izin &quot;Who has access: Anyone&quot; agar browser dapat mengaksesnya.
            </p>
          </div>
        )}
      </div>

      {/* AI Assistant Configuration Card */}
      <AIConfigPanel />

      {/* Role Management Info */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <ShieldCheck className="w-4 h-4 text-stone-700 dark:text-stone-200" />
            <h3 className="text-sm font-semibold">Mode Akses &amp; Keamanan Sistem</h3>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isAdmin ? 'bg-amber-700 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            Mode Saat Ini: {role}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div
            className={`p-3.5 rounded-lg border transition-colors ${
              isAdmin ? 'border-stone-900 bg-amber-700 text-white shadow-sm' : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60'
            }`}
          >
            <div className={`font-semibold flex items-center gap-1.5 ${isAdmin ? 'text-white' : 'text-stone-900 dark:text-stone-100'}`}>
              <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-emerald-400' : 'bg-stone-400'}`} />
              <span>Mode ADMIN</span>
              {isAdmin && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  AKTIF
                </span>
              )}
            </div>
            <p className={`text-[11px] mt-1 leading-relaxed ${isAdmin ? 'text-stone-300' : 'text-stone-600 dark:text-stone-400'}`}>
              Akses penuh ke seluruh modul gudang: Ringkasan, Master Barang, Member, Transaksi Masuk/Keluar, Stok,
              Bin Card, Approval Pengajuan, Laporan, dan Pengaturan.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-lg border transition-colors ${
              !isAdmin ? 'border-emerald-600 bg-emerald-50 shadow-sm dark:bg-emerald-950/40' : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60'
            }`}
          >
            <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${!isAdmin ? 'bg-emerald-500' : 'bg-stone-400'}`} />
              <span>Mode MEMBER</span>
              {!isAdmin && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">
                  AKTIF
                </span>
              )}
            </div>
            <p className="text-stone-600 dark:text-stone-400 text-[11px] mt-1 leading-relaxed">
              Mode mandiri personil lapangan tanpa perlu login untuk mengajukan permintaan barang dan memantau riwayat
              permohonan sendiri.
            </p>
          </div>
        </div>
      </div>

      {/* Debug & Health Check Tools */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <Terminal className="w-4 h-4 text-stone-700 dark:text-stone-200" />
            <h3 className="text-sm font-semibold">Diagnostik Admin</h3>
          </div>
          <button
            onClick={handleFetchDebug}
            disabled={loadingDebug}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDebug ? 'animate-spin' : ''}`} />
            <span>Tarik Debug Transaksi</span>
          </button>
        </div>

        {debugLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 font-semibold">
                  <th className="py-1.5 px-2">ID Transaksi</th>
                  <th className="py-1.5 px-2">Tanggal</th>
                  <th className="py-1.5 px-2">Jenis</th>
                  <th className="py-1.5 px-2">Barang</th>
                  <th className="py-1.5 px-2">Jumlah</th>
                  <th className="py-1.5 px-2">No. Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700 font-mono text-[11px] text-stone-700 dark:text-stone-200">
                {debugLogs.map((log, idx) => (
                  <tr key={log.ID_TRANSAKSI || idx}>
                    <td className="py-1.5 px-2 font-bold">{log.ID_TRANSAKSI || '-'}</td>
                    <td className="py-1.5 px-2">{log.TANGGAL || log.TIMESTAMP || '-'}</td>
                    <td className="py-1.5 px-2">{log.JENIS_TRANSAKSI || '-'}</td>
                    <td className="py-1.5 px-2 font-sans font-medium text-stone-800 dark:text-stone-200">
                      {log.NAMA_ITEM || log.ID_ITEM || '-'}
                    </td>
                    <td className="py-1.5 px-2 font-bold">{log.JUMLAH || 0}</td>
                    <td className="py-1.5 px-2">{log.NO_DOKUMEN || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Klik tombol &quot;Tarik Debug Transaksi&quot; untuk menguji respon API debug backend.
          </p>
        )}
      </div>
    </div>
  );
};
