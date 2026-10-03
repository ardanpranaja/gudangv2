import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { GAS_CODE_TEMPLATE } from '../services/gasCodeTemplate';
import { AIConfigPanel } from '../components/ai/AIConfigPanel';
import {
  Settings,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Code2,
} from 'lucide-react';

export const PengaturanPage: React.FC = () => {
  const { role, setRole, health, refreshHealth, addToast } = useApp();

  const [gasUrlInput, setGasUrlInput] = useState(api.getGasUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
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
    await refreshHealth();
    setIsTesting(false);
    addToast('info', 'Uji Koneksi Selesai', `Status backend GAS: ${health.status}`);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GAS_CODE_TEMPLATE);
    setCopiedCode(true);
    addToast('success', 'Kode Disalin ke Clipboard', 'Tempelkan kode ini di Extensions > Apps Script.');
    setTimeout(() => setCopiedCode(false), 3000);
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

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Pengaturan & Integrasi Sistem"
        description="Konfigurasi URL Google Apps Script Web App, verifikasi status koneksi Google Spreadsheet, dan pemantauan peran pengguna."
      />

      {/* Backend Connection Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Settings className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold">Koneksi Google Apps Script (GAS) Web App</h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                health.status === 'ONLINE'
                  ? 'bg-emerald-500'
                  : health.status === 'OFFLINE'
                  ? 'bg-rose-500'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-semibold font-mono text-slate-700">
              {health.status}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveGasUrl} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              URL Web App Deployment GAS:
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={gasUrlInput}
                onChange={(e) => setGasUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 font-mono text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors"
              >
                Simpan URL
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Uji Koneksi</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Dapatkan URL ini setelah menerapkan (Deploy) script di Google Spreadsheet melalui:{' '}
              <span className="font-semibold text-slate-600">Deploy &gt; New deployment &gt; Select type: Web app</span>{' '}
              (Execute as: <em>Me</em>, Who has access: <em>Anyone</em>).
            </p>
          </div>
        </form>

        {/* Diagnostic Results */}
        {health.status === 'ONLINE' && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Terhubung dengan Sukses ke Spreadsheet</span>
            </div>
            <div className="text-[11px] text-emerald-800">
              ID Spreadsheet:{' '}
              <span className="font-mono">{health.spreadsheetId || 'Connected'}</span> · Latensi:{' '}
              <span className="font-mono">{health.latencyMs || 0}ms</span>
            </div>
            {health.sheetsFound && health.sheetsFound.length > 0 && (
              <div className="text-[11px] text-emerald-700 pt-1">
                Sheet Ditemukan:{' '}
                <span className="font-mono">{health.sheetsFound.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {health.status === 'OFFLINE' && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Gagal Terhubung ke Backend GAS</span>
            </div>
            <div className="text-[11px] text-rose-700">{health.error}</div>
            <p className="text-[11px] text-rose-600 pt-1">
              Pastikan Web App disetel dengan izin &quot;Who has access: Anyone&quot; agar browser dapat
              mengaksesnya.
            </p>
          </div>
        )}
      </div>

      {/* AI Assistant Configuration Card */}
      <AIConfigPanel />

      {/* Role Management Info */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold">Mode Akses &amp; Keamanan Sistem</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-900 text-white rounded-full">
            Mode Saat Ini: {role}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60">
            <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Mode ADMIN (Aktif)</span>
            </div>
            <p className="text-emerald-800 text-[11px] mt-1 leading-relaxed">
              Akses penuh ke seluruh modul gudang: Ringkasan, Master Barang, Member, Limit, Transaksi Masuk/Keluar,
              Stok, Bin Card, Approval Pengajuan, Laporan, dan Pengaturan.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Mode MEMBER (Standar)</span>
            </div>
            <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
              Mode mandiri personil lapangan tanpa perlu login untuk mengajukan permintaan barang dan memantau riwayat
              permohonan sendiri.
            </p>
          </div>
        </div>
      </div>

      {/* GAS Code Deployment Guide */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Code2 className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold">Referensi Kontrak Google Apps Script (GAS v1.2.4)</h3>
          </div>
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedCode ? 'Tersalin!' : 'Salin Kode Referensi Kontrak'}</span>
          </button>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
          <p className="font-semibold mb-0.5">Catatan Backend Source of Truth:</p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Backend production GudangV2 aktif menggunakan Google Apps Script Version 1.2.4 (debug_source: 1.2.4-DIAGNOSTIC). Kode template di bawah disediakan sebagai referensi struktur skema sheet dan kontrak API v1.2.4.
          </p>
        </div>

        <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 leading-relaxed">
          <li>
            Buka Google Spreadsheet backend Anda di Google Drive.
          </li>
          <li>
            Klik menu <span className="font-semibold text-slate-800">Extensions &gt; Apps Script</span>.
          </li>
          <li>
            Pastikan skema header sheet dan endpoint sesuai dengan kontrak v1.2.4.
          </li>
          <li>
            Jika menginisialisasi spreadsheet baru, fungsi <span className="font-mono text-slate-800">initSheets()</span> dapat dijalankan untuk membuat sheet database otomatis.
          </li>
          <li>
            Deploy script melalui <span className="font-semibold text-slate-800">Deploy &gt; New deployment &gt; Web app</span> (Execute as: <em>Me</em>, Access: <em>Anyone</em>).
          </li>
          <li>
            Salin <strong>Web App URL</strong> yang dihasilkan dan simpan di kolom konfigurasi URL di atas.
          </li>
        </ol>

        <div className="relative">
          <pre className="p-3 bg-slate-900 text-slate-300 rounded font-mono text-[11px] overflow-x-auto max-h-48">
            {GAS_CODE_TEMPLATE.slice(0, 800)}
            {'\n... (klik tombol Salin untuk mengambil seluruh kode referensi kontrak GAS v1.2.4)'}
          </pre>
        </div>
      </div>

      {/* Debug & Health Check Tools */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Terminal className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold">Diagnostik Admin (debug_transactions)</h3>
          </div>
          <button
            onClick={handleFetchDebug}
            disabled={loadingDebug}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDebug ? 'animate-spin' : ''}`} />
            <span>Tarik Debug Transaksi</span>
          </button>
        </div>

        {debugLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-1.5 px-2">ID Transaksi</th>
                  <th className="py-1.5 px-2">Tanggal</th>
                  <th className="py-1.5 px-2">Jenis</th>
                  <th className="py-1.5 px-2">ID Item</th>
                  <th className="py-1.5 px-2">Jumlah</th>
                  <th className="py-1.5 px-2">No. Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                {debugLogs.map((log, idx) => (
                  <tr key={log.ID_TRANSAKSI || idx}>
                    <td className="py-1.5 px-2 font-bold">{log.ID_TRANSAKSI || '-'}</td>
                    <td className="py-1.5 px-2">{log.TANGGAL || log.TIMESTAMP || '-'}</td>
                    <td className="py-1.5 px-2">{log.JENIS_TRANSAKSI || '-'}</td>
                    <td className="py-1.5 px-2">{log.ID_ITEM || '-'}</td>
                    <td className="py-1.5 px-2 font-bold">{log.JUMLAH || 0}</td>
                    <td className="py-1.5 px-2">{log.NO_DOKUMEN || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Klik tombol &quot;Tarik Debug Transaksi&quot; untuk menguji respon API debug backend.
          </p>
        )}
      </div>
    </div>
  );
};
