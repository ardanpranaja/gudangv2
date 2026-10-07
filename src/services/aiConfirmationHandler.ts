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
  if (confirmation.type === 'APPROVE_REQUESTS' || confirmation.type === 'REJECT_REQUESTS') {
    const isApprove = confirmation.type === 'APPROVE_REQUESTS';
    const ids = Array.isArray(confirmation.rawInput.requestIds)
      ? (confirmation.rawInput.requestIds as unknown[]).map((id) => String(id))
      : [];
    const note = confirmation.rawInput.note ? String(confirmation.rawInput.note) : undefined;
    if (ids.length === 0) throw new Error('Tidak ada ID pengajuan pada draf konfirmasi.');

    const succeeded: string[] = [];
    const failed: string[] = [];
    for (const id of ids) {
      try {
        if (isApprove) {
          await api.approveRequest({ requestId: id, note });
        } else {
          await api.rejectRequest({ requestId: id, note });
        }
        succeeded.push(id);
      } catch (err: unknown) {
        failed.push(`${id} (${normalizeGasErrorMessage(err, undefined, 'gagal')})`);
      }
    }

    const verb = isApprove ? 'disetujui' : 'ditolak';
    if (failed.length === 0) {
      return {
        success: true,
        message:
          succeeded.length > 1
            ? `${succeeded.length} pengajuan berhasil ${verb}.` +
              (isApprove ? ' Transaksi BARANG_KELUAR telah dicatat.' : '')
            : `Pengajuan ${succeeded[0]} berhasil ${verb}.` +
              (isApprove ? ' Transaksi BARANG_KELUAR telah dicatat.' : ''),
      };
    }
    if (succeeded.length === 0) {
      throw new Error(`Semua pengajuan gagal: ${failed.join('; ')}`);
    }
    return {
      success: true,
      message: `${succeeded.length} berhasil ${verb}, ${failed.length} gagal: ${failed.join('; ')}`,
    };
  }

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
    // Dukung multi-item: satu member, banyak barang — loop per item seperti keranjang.
    const rawItems = confirmation.items && confirmation.items.length > 0
      ? confirmation.items.map((it) => ({ itemId: it.itemId, jumlah: it.jumlah }))
      : Array.isArray(confirmation.rawInput.items) && (confirmation.rawInput.items as unknown[]).length > 0
        ? (confirmation.rawInput.items as Array<Record<string, unknown>>).map((it) => ({
            itemId: String(it.itemId),
            jumlah: Number(it.jumlah),
          }))
        : [{ itemId: String(confirmation.rawInput.itemId), jumlah: Number(confirmation.rawInput.jumlah) }];

    const memberId = confirmation.rawInput.memberId ? String(confirmation.rawInput.memberId) : undefined;
    const keterangan = confirmation.rawInput.keterangan ? String(confirmation.rawInput.keterangan) : undefined;
    const tanggal = confirmation.rawInput.tanggal ? String(confirmation.rawInput.tanggal) : undefined;
    const noDokumen = confirmation.rawInput.noDokumen ? String(confirmation.rawInput.noDokumen) : undefined;

    const succeeded: string[] = [];
    const failed: string[] = [];
    for (const it of rawItems) {
      try {
        const res = await api.submitTransaction({
          itemId: it.itemId,
          type: confirmation.type,
          jumlah: it.jumlah,
          memberId,
          keterangan,
          tanggal,
          noDokumen,
        });
        succeeded.push(String((res as any)?.ID_TRANSAKSI || (res as any)?.idTransaksi || it.itemId));
      } catch (err: unknown) {
        failed.push(`${it.itemId} (${normalizeGasErrorMessage(err, undefined, 'gagal')})`);
      }
    }

    if (failed.length === 0) {
      return {
        success: true,
        message: succeeded.length > 1
          ? `${succeeded.length} transaksi berhasil dicatat di backend GAS.`
          : 'Transaksi berhasil dicatat di backend GAS.',
        idTransaksi: succeeded[0],
      };
    }
    if (succeeded.length === 0) {
      throw new Error(`Semua item gagal: ${failed.join('; ')}`);
    }
    return {
      success: true,
      message: `${succeeded.length} berhasil, ${failed.length} gagal: ${failed.join('; ')}`,
      idTransaksi: succeeded[0],
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
