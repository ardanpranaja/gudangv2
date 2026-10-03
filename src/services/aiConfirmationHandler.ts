import { api, normalizeGasErrorMessage } from './api';
import { AIConfirmationData } from '../types/ai';

export interface ExecuteConfirmationResult {
  success: boolean;
  message: string;
  idTransaksi?: string;
  idPengajuan?: string;
  error?: string;
}

/**
 * Authoritative frontend confirmation executor.
 * Dispatches directly to api.ts (backend GAS), enforcing that user approval
 * flows through Frontend confirmation handler -> api.ts -> GAS.
 */
export async function executeConfirmationBackend(
  confirmation: AIConfirmationData
): Promise<ExecuteConfirmationResult> {
  if (confirmation.type === 'REQUEST') {
    const res = await api.submitRequest({
      memberId: String(confirmation.rawInput.memberId),
      itemId: String(confirmation.rawInput.itemId),
      jumlah: Number(confirmation.rawInput.jumlah),
      alasan: String(confirmation.rawInput.alasan),
    });

    const idPengajuan = (res as any)?.ID_PENGAJUAN || (res as any)?.id || 'Terkirim';
    return {
      success: true,
      message: 'Pengajuan early pickup berhasil dikirim ke antrean approval.',
      idPengajuan,
    };
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
    return {
      success: true,
      message: `Transaksi berhasil dicatat di backend GAS.`,
      idTransaksi,
    };
  }
}

/**
 * Checks if a user's natural language input expresses affirmative approval
 * to execute a pending transaction confirmation card.
 */
export function isUserConfirmationApproval(input: string): boolean {
  const clean = input
    .toLowerCase()
    .replace(/[!.,?]/g, '')
    .trim();

  const exactMatches = [
    'setuju',
    'ya',
    'iya',
    'y',
    'yes',
    'oke',
    'ok',
    'siap',
    'deal',
    'baik',
    'acc',
    'lanjutkan',
    'lanjut',
    'gas',
    'gass',
    'eksekusi',
    'eksekusikan',
    'proses',
    'proseskan',
    'silakan',
    'silahkan',
    'jalankan',
    'konfirmasi',
    'konfirmasi dan eksekusi',
    'konfirmasi & eksekusi',
    'approve',
  ];

  if (exactMatches.includes(clean)) return true;

  const phraseMatches = [
    'ya silakan',
    'ya silahkan',
    'ya proses',
    'ya eksekusi',
    'ya lanjutkan',
    'oke silakan',
    'oke silahkan',
    'oke proses',
    'oke eksekusi',
    'oke lanjutkan',
    'ok silakan',
    'ok silahkan',
    'ok proses',
    'ok eksekusi',
    'ok lanjut',
    'silakan proses',
    'silahkan proses',
    'silakan eksekusi',
    'silahkan eksekusi',
    'silakan lanjutkan',
    'silahkan lanjutkan',
    'saya setuju',
    'saya setujui',
    'kami setuju',
    'setuju lanjutkan',
    'setuju proses',
    'setuju eksekusi',
    'mohon dieksekusi',
    'mohon diproses',
    'tolong proses',
    'tolong eksekusi',
    'lanjutkan transaksi',
    'eksekusi transaksi',
  ];

  if (phraseMatches.includes(clean)) return true;

  // Regex check for phrases starting with affirmative keywords followed by action verbs
  if (/^(ya|oke|ok|setuju|silakan|silahkan)\s+(silakan|silahkan|proses|eksekusi|lanjutkan|lanjut|catat)/.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Checks if a user's input expresses cancellation of a pending transaction confirmation.
 */
export function isUserCancellation(input: string): boolean {
  const clean = input
    .toLowerCase()
    .replace(/[!.,?]/g, '')
    .trim();

  const cancelMatches = [
    'batal',
    'batalkan',
    'cancel',
    'tidak',
    'jangan',
    'batal saja',
    'batalkan saja',
    'tidak jadi',
    'jangan diproses',
  ];

  return cancelMatches.includes(clean);
}
