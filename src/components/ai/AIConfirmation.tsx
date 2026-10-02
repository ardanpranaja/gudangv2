import React, { useState } from 'react';
import { AIConfirmationData } from '../../types/ai';
import { api, normalizeGasErrorMessage } from '../../services/api';
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
      if (confirmation.type === 'REQUEST') {
        const res = await api.submitRequest({
          memberId: String(confirmation.rawInput.memberId),
          itemId: String(confirmation.rawInput.itemId),
          jumlah: Number(confirmation.rawInput.jumlah),
          alasan: String(confirmation.rawInput.alasan),
        });

        const idPengajuan = (res as any)?.ID_PENGAJUAN || (res as any)?.id || 'Terkirim';
        addToast('success', 'Pengajuan Berhasil', `Pengajuan ${idPengajuan} berhasil dicatat.`);
        triggerRefresh();

        onUpdate({
          ...confirmation,
          status: 'executed',
          executionResult: {
            success: true,
            message: 'Pengajuan early pickup berhasil dikirim ke antrean approval.',
            idPengajuan,
          },
        });
      } else {
        // Transaction: BARANG_MASUK, BARANG_KELUAR, PINJAM, KEMBALI
        const res = await api.submitTransaction({
          itemId: String(confirmation.rawInput.itemId),
          type: confirmation.type,
          jumlah: Number(confirmation.rawInput.jumlah),
          memberId: confirmation.rawInput.memberId ? String(confirmation.rawInput.memberId) : undefined,
          keterangan: confirmation.rawInput.keterangan ? String(confirmation.rawInput.keterangan) : undefined,
          tanggal: confirmation.rawInput.tanggal ? String(confirmation.rawInput.tanggal) : undefined,
          noDokumen: confirmation.rawInput.noDokumen ? String(confirmation.rawInput.noDokumen) : undefined,
        });

        const idTransaksi = (res as any)?.ID_TRANSAKSI || (res as any)?.idTransaksi || 'Tercatat';
        addToast('success', 'Transaksi Berhasil', `Transaksi ${confirmation.type} (${idTransaksi}) berhasil disimpan ke Spreadsheet.`);
        triggerRefresh();

        onUpdate({
          ...confirmation,
          status: 'executed',
          executionResult: {
            success: true,
            message: `Transaksi berhasil dicatat di backend GAS.`,
            idTransaksi,
          },
        });
      }
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
      <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{confirmation.title} — Sukses Dieksekusi</span>
        </div>
        <p className="text-[11px] text-emerald-700">
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
      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs flex items-center gap-2">
        <XCircle className="w-4 h-4 text-slate-400" />
        <span>Draft transaksi telah dibatalkan oleh operator.</span>
      </div>
    );
  }

  if (confirmation.status === 'failed') {
    return (
      <div className="mt-3 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-950 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Gagal Mengeksekusi Operasi</span>
        </div>
        <p className="text-[11px] text-rose-700">{confirmation.executionResult?.message}</p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing}
          className="mt-2 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium rounded inline-flex items-center gap-1.5 transition-colors"
        >
          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          <span>Coba Lagi</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 bg-white border-2 border-slate-900 rounded-lg shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-900" />
          <h4 className="text-xs font-bold text-slate-900">{confirmation.title}</h4>
        </div>
        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
          Perlu Konfirmasi
        </span>
      </div>

      {/* Description / Warning if any */}
      {confirmation.description && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{confirmation.description}</span>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {confirmation.details.map((detail, idx) => (
          <div
            key={idx}
            className={`p-2 rounded bg-slate-50 border border-slate-100 ${
              detail.highlight ? 'col-span-2 font-semibold text-slate-900 bg-slate-100/70' : 'text-slate-700'
            }`}
          >
            <div className="text-[10px] text-slate-500 font-medium">{detail.label}</div>
            <div className="text-xs font-mono truncate">{detail.value}</div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isProcessing}
          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded font-medium transition-colors"
        >
          Batalkan
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing}
          className="px-4 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Memproses ke GAS...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Konfirmasi & Eksekusi</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
