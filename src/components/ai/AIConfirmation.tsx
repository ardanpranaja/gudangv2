import React, { useState } from 'react';
import { AIConfirmationData } from '../../types/ai';
import { normalizeGasErrorMessage } from '../../services/api';
import { executeConfirmationBackend } from '../../services/aiConfirmationHandler';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Loader2, ShieldCheck, Clock } from 'lucide-react';

interface AIConfirmationProps {
  confirmation: AIConfirmationData;
  onUpdate: (updated: AIConfirmationData) => void;
}

export const AIConfirmation: React.FC<AIConfirmationProps> = ({ confirmation, onUpdate }) => {
  const { addToast, triggerRefresh } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const res = await executeConfirmationBackend(confirmation);

      if (confirmation.type === 'REQUEST') {
        addToast('success', 'Pengajuan Berhasil', `Pengajuan ${res.idPengajuan || ''} berhasil dicatat.`);
      } else if (confirmation.type === 'APPROVE_REQUESTS') {
        addToast('success', 'Pengajuan Disetujui', res.message);
      } else if (confirmation.type === 'REJECT_REQUESTS') {
        addToast('success', 'Pengajuan Ditolak', res.message);
      } else {
        addToast(
          'success',
          'Transaksi Berhasil',
          `Transaksi ${confirmation.type} (${res.idTransaksi || ''}) berhasil disimpan ke Spreadsheet.`
        );
      }
      triggerRefresh();

      onUpdate({
        ...confirmation,
        status: 'executed',
        executionResult: {
          success: true,
          message: res.message,
          idTransaksi: res.idTransaksi,
          idPengajuan: res.idPengajuan,
        },
      });
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'Gagal mengeksekusi operasi.');
      addToast('error', 'Eksekusi Gagal', msg);
      onUpdate({
        ...confirmation,
        status: 'failed',
        executionResult: {
          success: false,
          message: msg,
        },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    onUpdate({
      ...confirmation,
      status: 'cancelled',
    });
    addToast('info', 'Dibatalkan', 'Draft operasi telah dibatalkan.');
  };

  if (confirmation.status === 'executed') {
    return (
      <div className="mt-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-950 dark:text-emerald-100 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{confirmation.title} — Sukses Dieksekusi</span>
        </div>
        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
          {confirmation.executionResult?.message}
          {confirmation.executionResult?.idTransaksi && (
            <span className="font-mono font-bold block mt-1">
              ID Transaksi: {confirmation.executionResult.idTransaksi}
            </span>
          )}
          {confirmation.executionResult?.idPengajuan && (
            <span className="font-mono font-bold block mt-1">
              ID Pengajuan: {confirmation.executionResult.idPengajuan}
            </span>
          )}
        </p>
      </div>
    );
  }

  if (confirmation.status === 'cancelled') {
    return (
      <div className="mt-3 p-3 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-500 dark:text-stone-400 text-xs flex items-center gap-2">
        <XCircle className="w-4 h-4 text-stone-400 dark:text-stone-500" />
        <span>Draft transaksi telah dibatalkan oleh operator.</span>
      </div>
    );
  }

  if (confirmation.status === 'failed') {
    return (
      <div className="mt-3 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-950 dark:text-rose-100 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-xs text-rose-800 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Gagal Mengeksekusi Operasi</span>
        </div>
        <p className="text-[11px] text-rose-700 dark:text-rose-400">{confirmation.executionResult?.message}</p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing}
          className="mt-2 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors"
        >
          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          <span>Coba Lagi</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 bg-white dark:bg-stone-900 border-2 border-amber-700 dark:border-amber-600 rounded-xl shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">{confirmation.title}</h4>
        </div>
        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded">
          Perlu Konfirmasi
        </span>
      </div>

      {/* Description / Warning if any */}
      {confirmation.description && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{confirmation.description}</span>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {confirmation.details.map((detail, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 ${
              detail.highlight ? 'col-span-2 font-semibold text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800' : 'text-stone-700 dark:text-stone-300'
            }`}
          >
            <div className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">{detail.label}</div>
            <div className="text-xs font-mono truncate text-stone-800 dark:text-stone-200">{detail.value}</div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isProcessing}
          className="px-3.5 py-2 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg font-medium transition-colors"
        >
          Batalkan
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing}
          className="px-4 py-2 text-xs bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-lg font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Memproses ke GAS...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Konfirmasi & Eksekusi</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
