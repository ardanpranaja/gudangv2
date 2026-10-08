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
      <div className="bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 p-6 space-y-4 shadow-[5px_5px_0px_#18181b]">
        <div className="flex items-center justify-between border-b-2 border-stone-900 dark:border-stone-700 pb-3">
          <div className="flex items-center gap-2 text-stone-950 dark:text-stone-100 font-black">
            <Settings className="w-5 h-5 text-stone-950 dark:text-stone-200 stroke-[2.5]" />
            <h3 className="text-sm font-black">Koneksi Backend (Google Apps Script)</h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-200 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b]">
            <span className="relative flex w-2.5 h-2.5">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isOnline ? 'bg-emerald-600' : health.status === 'OFFLINE' ? 'bg-rose-600' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-xs font-black font-mono text-stone-950">{health.status}</span>
          </div>
        </div>

        <form onSubmit={handleSaveGasUrl} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-stone-900 dark:text-stone-100 mb-1">URL Web App Deployment GAS:</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={gasUrlInput}
                onChange={(e) => setGasUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 px-3 py-2 border-2 border-stone-900 dark:border-stone-400 rounded-lg text-stone-950 dark:text-stone-100 font-mono font-bold text-xs bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-300 hover:bg-amber-400 text-stone-950 border-2 border-stone-900 rounded-lg font-black shadow-[2.5px_2.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              >
                Simpan URL
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-2 bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 text-stone-950 dark:text-stone-100 rounded-lg font-black hover:bg-stone-100 transition-all inline-flex items-center gap-1.5 shadow-[2.5px_2.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isTesting ? 'animate-spin' : ''}`} />
                <span>Uji Koneksi</span>
              </button>
            </div>
          </div>
        </form>

        {/* Online diagnostics */}
        {isOnline && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-cyan-100 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-500 shadow-[2px_2px_0px_#18181b]">
                <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-400 font-bold mb-1">
                  <Database className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Spreadsheet ID</span>
                </div>
                <div className="font-mono font-black text-stone-950 dark:text-stone-100 truncate" title={health.spreadsheetId}>
                  {health.spreadsheetId || 'Connected'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-500 shadow-[2px_2px_0px_#18181b]">
                <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-400 font-bold mb-1">
                  <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Latensi</span>
                </div>
                <div className="font-mono text-stone-950 dark:text-stone-100 font-black">{health.latencyMs || 0} ms</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-500 shadow-[2px_2px_0px_#18181b]">
                <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-400 font-bold mb-1">
                  <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Terakhir Dicek</span>
                </div>
                <div className="font-mono text-stone-950 dark:text-stone-100 font-black">{formatCheckedAt(health.lastChecked)}</div>
              </div>
            </div>

            {sheets.length > 0 && (
              <div className="p-3.5 bg-emerald-100 border-2 border-stone-900 rounded-xl shadow-[3px_3px_0px_#18181b]">
                <div className="flex items-center gap-1.5 text-xs font-black text-stone-950 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-800 stroke-[2.5]" />
                  <span>
                    {sheets.length} Sheet Database Ditemukan
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sheets.map((s) => (
                    <span
                      key={s.name}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded font-mono font-bold text-[11px] border-2 border-stone-900 shadow-[1.5px_1.5px_0px_#18181b] ${
                        s.exists
                          ? 'bg-white text-stone-950'
                          : 'bg-rose-200 text-rose-950'
                      }`}
                      title={s.exists ? 'Sheet tersedia' : 'Sheet tidak ditemukan'}
                    >
                      {s.exists ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-700 stroke-[2.5]" />
                      ) : (
                        <XCircle className="w-3 h-3 text-rose-700 stroke-[2.5]" />
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
          <div className="p-3.5 bg-rose-100 border-2 border-stone-900 rounded-xl text-xs text-stone-950 space-y-1 shadow-[3px_3px_0px_#18181b]">
            <div className="flex items-center gap-1.5 font-black text-rose-950">
              <AlertCircle className="w-4 h-4 text-rose-700 stroke-[2.5]" />
              <span>Gagal Terhubung ke Backend GAS</span>
            </div>
            <div className="text-[11px] text-rose-900 font-bold">{health.error}</div>
            <p className="text-[11px] text-stone-800 pt-1 font-medium">
              Pastikan Web App disetel dengan izin &quot;Who has access: Anyone&quot; agar browser dapat mengaksesnya.
            </p>
          </div>
        )}
      </div>

      {/* AI Assistant Configuration Card */}
      <AIConfigPanel />

      {/* Role Management Info */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 p-6 space-y-3 shadow-[5px_5px_0px_#18181b]">
        <div className="flex items-center justify-between border-b-2 border-stone-900 dark:border-stone-700 pb-3">
          <div className="flex items-center gap-2 text-stone-950 dark:text-stone-100 font-black">
            <ShieldCheck className="w-5 h-5 text-stone-950 dark:text-stone-200 stroke-[2.5]" />
            <h3 className="text-sm font-black">Mode Akses &amp; Keamanan Sistem</h3>
          </div>
          <span
            className={`text-xs font-black px-3 py-1 rounded-lg border-2 border-stone-900 shadow-[2px_2px_0px_#18181b] ${
              isAdmin ? 'bg-amber-300 text-stone-950' : 'bg-emerald-300 text-stone-950'
            }`}
          >
            Mode Saat Ini: {role}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div
            className={`p-3.5 rounded-xl border-2 border-stone-900 transition-all ${
              isAdmin ? 'bg-amber-200 text-stone-950 shadow-[3px_3px_0px_#18181b]' : 'bg-stone-50 dark:bg-stone-800/60'
            }`}
          >
            <div className="font-black flex items-center gap-1.5 text-stone-950 dark:text-stone-100">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-950 border border-stone-900" />
              <span>Mode ADMIN</span>
              {isAdmin && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-white text-stone-950 border border-stone-900 font-black">
                  AKTIF
                </span>
              )}
            </div>
            <p className="text-[11px] mt-1.5 leading-relaxed text-stone-800 dark:text-stone-300 font-medium">
              Akses penuh ke seluruh modul gudang: Ringkasan, Master Barang, Member, Transaksi Masuk/Keluar, Stok,
              Bin Card, Approval Pengajuan, Laporan, dan Pengaturan.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border-2 border-stone-900 transition-all ${
              !isAdmin ? 'bg-emerald-200 text-stone-950 shadow-[3px_3px_0px_#18181b]' : 'bg-stone-50 dark:bg-stone-800/60'
            }`}
          >
            <div className="font-black text-stone-950 dark:text-stone-100 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 border border-stone-900" />
              <span>Mode MEMBER</span>
              {!isAdmin && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-white text-stone-950 border border-stone-900 font-black">
                  AKTIF
                </span>
              )}
            </div>
            <p className="text-stone-800 dark:text-stone-300 text-[11px] mt-1.5 leading-relaxed font-medium">
              Mode mandiri personil lapangan tanpa perlu login untuk mengajukan permintaan barang dan memantau riwayat
              permohonan sendiri.
            </p>
          </div>
        </div>
      </div>

      {/* Debug & Health Check Tools */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 p-6 space-y-4 shadow-[5px_5px_0px_#18181b]">
        <div className="flex items-center justify-between border-b-2 border-stone-900 dark:border-stone-700 pb-3">
          <div className="flex items-center gap-2 text-stone-950 dark:text-stone-100 font-black">
            <Terminal className="w-5 h-5 text-stone-950 dark:text-stone-200 stroke-[2.5]" />
            <h3 className="text-sm font-black">Diagnostik Admin</h3>
          </div>
          <button
            onClick={handleFetchDebug}
            disabled={loadingDebug}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-stone-950 bg-cyan-300 hover:bg-cyan-400 border-2 border-stone-900 rounded-lg shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${loadingDebug ? 'animate-spin' : ''}`} />
            <span>Tarik Debug Transaksi</span>
          </button>
        </div>

        {debugLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-950 dark:text-stone-100 font-black">
                  <th className="py-2 px-2.5">ID Transaksi</th>
                  <th className="py-2 px-2.5">Tanggal</th>
                  <th className="py-2 px-2.5">Jenis</th>
                  <th className="py-2 px-2.5">Barang</th>
                  <th className="py-2 px-2.5">Jumlah</th>
                  <th className="py-2 px-2.5">No. Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-stone-100 dark:divide-stone-800 font-mono text-[11px] text-stone-900 dark:text-stone-200">
                {debugLogs.map((log, idx) => (
                  <tr key={log.ID_TRANSAKSI || idx} className="hover:bg-amber-50/50">
                    <td className="py-2 px-2.5 font-black text-stone-950 dark:text-stone-100">{log.ID_TRANSAKSI || '-'}</td>
                    <td className="py-2 px-2.5">{log.TANGGAL || log.TIMESTAMP || '-'}</td>
                    <td className="py-2 px-2.5">{log.JENIS_TRANSAKSI || '-'}</td>
                    <td className="py-2 px-2.5 font-sans font-bold text-stone-950 dark:text-stone-200">
                      {log.NAMA_ITEM || log.ID_ITEM || '-'}
                    </td>
                    <td className="py-2 px-2.5 font-black text-stone-950 dark:text-amber-400">{log.JUMLAH || 0}</td>
                    <td className="py-2 px-2.5 font-bold">{log.NO_DOKUMEN || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
            Klik tombol &quot;Tarik Debug Transaksi&quot; untuk menguji respon API debug backend.
          </p>
        )}
      </div>
    </div>
  );
};
