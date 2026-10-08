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
      <div className="mt-3 p-4 bg-emerald-200 border-2 border-stone-900 rounded-xl text-stone-950 space-y-2 shadow-[3px_3px_0px_#18181b]">
        <div className="flex items-center gap-2 font-black text-xs text-stone-950">
          <CheckCircle2 className="w-4 h-4 text-emerald-800 stroke-[2.5]" />
          <span>{confirmation.title} — Sukses Dieksekusi</span>
        </div>
        <p className="text-[11px] font-medium text-stone-900">
          {confirmation.executionResult?.message}
          {confirmation.executionResult?.idTransaksi && (
            <span className="font-mono font-black block mt-1 bg-white/70 p-1 rounded border border-stone-900">
              ID Transaksi: {confirmation.executionResult.idTransaksi}
            </span>
          )}
          {confirmation.executionResult?.idPengajuan && (
            <span className="font-mono font-black block mt-1 bg-white/70 p-1 rounded border border-stone-900">
              ID Pengajuan: {confirmation.executionResult.idPengajuan}
            </span>
          )}
        </p>
      </div>
    );
  }

  if (confirmation.status === 'cancelled') {
    return (
      <div className="mt-3 p-3 bg-stone-100 dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-600 rounded-xl text-stone-700 dark:text-stone-300 text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0px_#18181b]">
        <XCircle className="w-4 h-4 text-stone-600 stroke-[2.5]" />
        <span>Draft transaksi telah dibatalkan oleh operator.</span>
      </div>
    );
  }

  if (confirmation.status === 'failed') {
    return (
      <div className="mt-3 p-4 bg-rose-200 border-2 border-stone-900 rounded-xl text-stone-950 space-y-2 shadow-[3px_3px_0px_#18181b]">
        <div className="flex items-center gap-2 font-black text-xs text-rose-950">
          <AlertTriangle className="w-4 h-4 text-rose-800 stroke-[2.5]" />
          <span>Gagal Mengeksekusi Operasi</span>
        </div>
        <p className="text-[11px] font-bold text-rose-900">{confirmation.executionResult?.message}</p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing}
          className="mt-2 px-3.5 py-1.5 bg-rose-400 hover:bg-rose-300 text-stone-950 border-2 border-stone-900 text-xs font-black rounded-lg inline-flex items-center gap-1.5 shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
        >
          {isProcessing ? <span className="neo-spinner-multicolor-sm" /> : <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />}
          <span>Coba Lagi</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-amber-400 rounded-xl shadow-[4px_4px_0px_#18181b] space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-stone-900 dark:border-stone-700 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 stroke-[2.5]" />
          <h4 className="text-xs font-black text-stone-950 dark:text-stone-100">{confirmation.title}</h4>
        </div>
        <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-amber-300 text-stone-950 border border-stone-900 rounded shadow-[1px_1px_0px_#18181b]">
          Perlu Konfirmasi
        </span>
      </div>

      {/* Description / Warning if any */}
      {confirmation.description && (
        <div className="p-2.5 bg-amber-100 border-2 border-stone-900 rounded-lg text-[11px] text-stone-950 font-bold flex items-start gap-2 shadow-[2px_2px_0px_#18181b]">
          <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5 stroke-[2.5]" />
          <span>{confirmation.description}</span>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {confirmation.details.map((detail, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-lg border-2 border-stone-900 shadow-[1.5px_1.5px_0px_#18181b] ${
              detail.highlight
                ? 'col-span-2 font-black text-stone-950 bg-amber-200'
                : 'text-stone-950 dark:text-stone-100 bg-stone-50 dark:bg-stone-800'
            }`}
          >
            <div className="text-[10px] text-stone-700 dark:text-stone-300 font-bold">{detail.label}</div>
            <div className="text-xs font-mono font-black truncate text-stone-950 dark:text-stone-100">{detail.value}</div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-end gap-2 border-t-2 border-stone-900 dark:border-stone-700">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isProcessing}
          className="px-3.5 py-1.5 text-xs text-stone-950 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 border-2 border-stone-900 rounded-lg font-black shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
        >
          Batalkan
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing}
          className="px-4 py-1.5 text-xs bg-emerald-400 hover:bg-emerald-300 text-stone-950 border-2 border-stone-900 rounded-lg font-black inline-flex items-center gap-1.5 shadow-[2.5px_2.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
        >
          {isProcessing ? (
            <>
              <span className="neo-spinner-multicolor-sm" />
              <span>Memproses ke GAS...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Konfirmasi & Eksekusi</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
