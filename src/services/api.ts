import {
  MasterItem,
  MasterMember,
  MemberLimit,
  Transaksi,
  ItemStock,
  BinCardResult,
  BinCardEntry,
  MemberHistorySummary,
  PickupEligibilityResult,
  SystemHealth,
  TransactionInput,
  PickupRequestInput,
  ApprovalInput,
  RejectionInput,
  TransactionResult,
  PickupRequestResult,
  ActionResult,
  GasEnvelope,
  GasTransactionPayload,
  GasRequestPayload,
  GasApprovalPayload,
  GasRejectionPayload,
  GasStockResponse,
  GasItemsResponse,
  GasMembersResponse,
  GasLimitsResponse,
  GasTransactionsResponse,
  GasBinCardResponse,
  GasMemberHistoryResponse,
  GasPickupEligibilityResponse,
  GasHealthResponse,
  PengajuanPengambilan,
  GasRequestsResponse,
  CreateMemberLimitInput,
  UpdateMemberLimitInput,
  UpdateMemberInput,
  UpdateItemInput,
  MemberLimitResult,
  GasLimitPayload,
} from '../types';

/**
 * Normalizes error responses from Google Apps Script.
 * Priority:
 * 1. error.message if error is an object
 * 2. error if error is a string
 * 3. message if available
 * 4. clear fallback message
 */
export function normalizeGasErrorMessage(
  rawError: unknown,
  rawMessage?: unknown,
  fallbackMessage: string = 'Operasi GAS gagal.'
): string {
  // 1. If error is an object with message property
  if (typeof rawError === 'object' && rawError !== null) {
    const errObj = rawError as Record<string, unknown>;
    if (typeof errObj.message === 'string' && errObj.message.trim() && errObj.message !== '[object Object]') {
      return errObj.message.trim();
    }
    // Nested error object: { error: { message: ... } }
    if (typeof errObj.error === 'string' && errObj.error.trim() && errObj.error !== '[object Object]') {
      return errObj.error.trim();
    }
    if (typeof errObj.error === 'object' && errObj.error !== null) {
      const nested = errObj.error as Record<string, unknown>;
      if (typeof nested.message === 'string' && nested.message.trim() && nested.message !== '[object Object]') {
        return nested.message.trim();
      }
    }
  }

  // 2. If error is a string
  if (typeof rawError === 'string' && rawError.trim() && rawError !== '[object Object]') {
    return rawError.trim();
  }

  // 3. If rawMessage is available
  if (typeof rawMessage === 'string' && rawMessage.trim() && rawMessage !== '[object Object]') {
    return rawMessage.trim();
  }
  if (typeof rawMessage === 'object' && rawMessage !== null) {
    const msgObj = rawMessage as Record<string, unknown>;
    if (typeof msgObj.message === 'string' && msgObj.message.trim() && msgObj.message !== '[object Object]') {
      return msgObj.message.trim();
    }
  }

  // 4. Fallback message
  return fallbackMessage;
}

export class GasApiError extends Error {
  public code?: string;
  public details?: unknown;

  constructor(message: string | unknown, code?: string, details?: unknown) {
    const normalizedMessage =
      typeof message === 'string' && message !== '[object Object]'
        ? message
        : normalizeGasErrorMessage(message, undefined, 'Operasi GAS gagal.');
    super(normalizedMessage);
    this.name = 'GasApiError';
    this.code = code;
    this.details = details;
  }
}

const STORAGE_KEY_GAS_URL = 'gudangpresisi_gas_url';
const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbyswhx3m7G4jWEGwHTKpqxlt162W2xRe6Nm2iGo6yDt5QSz7iXYdEq07qf5ygWc5Cf9/exec';

class ApiService {
  private gasUrl: string = '';

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    const saved =
      typeof window !== 'undefined' && typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY_GAS_URL)
        : null;
    if (saved) {
      this.gasUrl = saved.trim();
    } else {
      const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GAS_API_URL;
      if (envUrl && envUrl.trim()) {
        this.gasUrl = envUrl.trim();
      } else {
        this.gasUrl = DEFAULT_GAS_URL;
      }
    }
  }

  public getGasUrl(): string {
    return this.gasUrl;
  }

  public setGasUrl(url: string) {
    this.gasUrl = url.trim();
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (this.gasUrl) {
        localStorage.setItem(STORAGE_KEY_GAS_URL, this.gasUrl);
      } else {
        localStorage.removeItem(STORAGE_KEY_GAS_URL);
      }
    }
  }

  /**
   * Authoritative GET requester
   */
  private async get<T>(action: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.gasUrl) {
      throw new GasApiError(
        'URL Google Apps Script belum dikonfigurasi. Silakan atur URL Web App di menu Pengaturan.',
        'UNCONFIGURED'
      );
    }

    try {
      console.log(`[GAS API] GET -> action: "${action}" | endpoint: "${this.gasUrl}"`);
      const queryParams = new URLSearchParams({ action, ...params }).toString();
      const separator = this.gasUrl.includes('?') ? '&' : '?';
      const endpoint = `${this.gasUrl}${separator}${queryParams}`;

      const res = await fetch(endpoint, {
        method: 'GET',
        redirect: 'follow',
      });

      if (!res.ok) {
        throw new GasApiError(`HTTP ${res.status}: ${res.statusText}`, 'HTTP_ERROR');
      }

      const json: GasEnvelope<T> = await res.json();

      if (json.success === false) {
        const errorMsg = normalizeGasErrorMessage(json.error, json.message, 'Operasi GAS gagal.');
        throw new GasApiError(errorMsg, 'GAS_ERROR', json.error ?? json);
      }

      return json.data;
    } catch (err: unknown) {
      if (err instanceof GasApiError) {
        throw err;
      }
      const msg = normalizeGasErrorMessage(err, undefined, 'Gagal terhubung ke backend Google Apps Script.');
      throw new GasApiError(msg, 'NETWORK_ERROR', err);
    }
  }

  /**
   * Authoritative POST requester
   */
  private async post<T>(bodyPayload: unknown): Promise<T> {
    if (!this.gasUrl) {
      throw new GasApiError(
        'URL Google Apps Script belum dikonfigurasi. Silakan atur URL Web App di menu Pengaturan.',
        'UNCONFIGURED'
      );
    }

    try {
      const actionName = (bodyPayload as any)?.action || 'unknown';
      const opName = (bodyPayload as any)?.operation ? ` (operation: ${(bodyPayload as any).operation})` : '';
      console.log(`[GAS API] POST -> action: "${actionName}"${opName} | endpoint: "${this.gasUrl}"`);

      // Send as text/plain to avoid preflight CORS redirection failures on GAS Web App
      const res = await fetch(this.gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(bodyPayload),
        redirect: 'follow',
      });

      if (!res.ok) {
        throw new GasApiError(`HTTP ${res.status}: ${res.statusText}`, 'HTTP_ERROR');
      }

      const json: GasEnvelope<T> = await res.json();

      if (json.success === false) {
        const errorMsg = normalizeGasErrorMessage(
          json.error,
          json.message,
          'Operasi POST gagal di backend GAS.'
        );
        throw new GasApiError(errorMsg, 'GAS_POST_ERROR', json.error ?? json);
      }

      return json.data;
    } catch (err: unknown) {
      if (err instanceof GasApiError) {
        throw err;
      }
      const msg = normalizeGasErrorMessage(err, undefined, 'Gagal mengirim transaksi ke Google Apps Script.');
      throw new GasApiError(msg, 'NETWORK_POST_ERROR', err);
    }
  }

  // --- GET METHODS WITH RESPONSE NORMALIZATION ---

  /**
   * Health Check
   * GAS response: data.sheets, data.spreadsheetId, data.version, etc.
   */
  public async checkHealth(): Promise<SystemHealth> {
    if (!this.gasUrl) {
      return {
        status: 'UNCONFIGURED',
        version: '1.2.4',
        lastChecked: new Date().toISOString(),
        error: 'URL Google Apps Script belum dikonfigurasi di Pengaturan.',
      };
    }

    const start = performance.now();
    try {
      const data = await this.get<GasHealthResponse>('health');
      const latencyMs = Math.round(performance.now() - start);

      return {
        status: 'ONLINE',
        spreadsheetId: data?.spreadsheetId || data?.ssId || 'Connected',
        sheetsFound: Array.isArray(data?.sheets) ? data.sheets : Array.isArray(data?.sheetsFound) ? data.sheetsFound : [],
        latencyMs,
        version: data?.version || '1.2.4',
        lastChecked: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungi backend GAS';
      return {
        status: 'OFFLINE',
        version: '1.2.4',
        lastChecked: new Date().toISOString(),
        error: msg,
      };
    }
  }

  /**
   * Items: GET action=items -> normalized data.items
   */
  public async getItems(): Promise<MasterItem[]> {
    const data = await this.get<GasItemsResponse>('items');
    if (!data || !Array.isArray(data.items)) {
      throw new GasApiError('Format response items dari GAS tidak valid.', 'MALFORMED_RESPONSE');
    }
    // Kategori MESIN dikelola terpisah (Master Mesin) — sembunyikan dari seluruh list barang.
    return data.items.filter((it: any) => String(it.KATEGORI || '').toUpperCase() !== 'MESIN');
  }

  /**
   * Members: GET action=members -> normalized data.members
   */
  public async getMembers(): Promise<MasterMember[]> {
    const data = await this.get<GasMembersResponse>('members');
    if (!data || !Array.isArray(data.members)) {
      throw new GasApiError('Format response members dari GAS tidak valid.', 'MALFORMED_RESPONSE');
    }
    return data.members.map((m: any) => ({
      ...m,
      JABATAN: m.JABATAN || '',
      LANTAI: m.LANTAI ? String(m.LANTAI).trim() : '',
    }));
  }

  /**
   * Limits: GET action=limits -> normalized data.limits
   */
  public async getLimits(): Promise<MemberLimit[]> {
    const data = await this.get<GasLimitsResponse>('limits');
    if (!data || !Array.isArray(data.limits)) {
      throw new GasApiError('Format response limits dari GAS tidak valid.', 'MALFORMED_RESPONSE');
    }
    return data.limits;
  }

  /**
   * Transactions: GET action=transactions -> normalized data.transactions
   * Query params: limit, id_item, id_member
   */
  public async getTransactions(params?: { limit?: string; itemId?: string; memberId?: string }): Promise<Transaksi[]> {
    const queryParams: Record<string, string> = {};
    if (params?.limit) {
      queryParams.limit = params.limit;
    }
    if (params?.itemId) {
      queryParams.id_item = params.itemId;
    }
    if (params?.memberId) {
      queryParams.id_member = params.memberId;
    }

    const data = await this.get<GasTransactionsResponse>('transactions', queryParams);
    if (!data || !Array.isArray(data.transactions)) {
      throw new GasApiError('Format response transactions dari GAS tidak valid.', 'MALFORMED_RESPONSE');
    }
    return data.transactions;
  }

  /**
   * Stock: GET action=stock -> normalized data.stock
   * Authoritative source of stock is STOK_SAAT_INI
   */
  public async getStock(): Promise<ItemStock[]> {
    const data = await this.get<GasStockResponse>('stock');
    if (!data || !Array.isArray(data.stock)) {
      throw new GasApiError('Format response stock dari GAS tidak valid.', 'MALFORMED_RESPONSE');
    }

    return data.stock.map((item) => {
      const stok = Number(item.STOK_SAAT_INI ?? 0);
      const minStok = Number(item.MIN_STOK ?? 0);

      return {
        idItem: item.ID_ITEM,
        namaItem: item.NAMA_ITEM,
        kategori: item.KATEGORI,
        satuan: item.SATUAN,
        stok,
        minStok,
        lokasi: item.LOKASI || '-',
        status: item.STATUS,
        isLowStock: stok <= minStok,
      };
    });
  }

  /**
   * Bin Card: GET action=bincard&id_item=...
   * GAS response: data.item, data.saldoAwal, data.saldoAkhir, data.count, data.rows
   */
  public async getBinCard(itemId: string): Promise<BinCardResult> {
    if (!itemId) {
      throw new GasApiError('ID barang wajib disertakan untuk memuat Bin Card.', 'INVALID_PARAM');
    }

    const data = await this.get<GasBinCardResponse>('bincard', { id_item: itemId });
    if (!data || !Array.isArray(data.rows)) {
      throw new GasApiError('Format response bincard dari GAS tidak valid.', 'MALFORMED_RESPONSE');
    }

    const normalizedRows: BinCardEntry[] = data.rows.map((r) => ({
      tanggal: r.TANGGAL || '',
      timestamp: r.TIMESTAMP || r.TANGGAL || '',
      noDokumen: r.NO_DOKUMEN || '-',
      jenisTransaksi: r.JENIS_TRANSAKSI || 'BARANG_KELUAR',
      keterangan: r.KETERANGAN || '-',
      masuk: Number(r.MASUK ?? 0),
      keluar: Number(r.KELUAR ?? 0),
      saldo: Number(r.SALDO ?? 0),
      memberId: r.ID_MEMBER || '',
      namaMember: r.NAMA_MEMBER || '',
    }));

    const itemName = typeof data.item === 'string' ? data.item : data.item?.NAMA_ITEM || itemId;

    return {
      item: itemName,
      saldoAwal: Number(data.saldoAwal ?? 0),
      saldoAkhir: Number(data.saldoAkhir ?? 0),
      count: Number(data.count ?? normalizedRows.length),
      rows: normalizedRows,
    };
  }

  /**
   * Member History: GET action=memberhistory&id_member=...
   * GAS response: data.member, data.count, data.history
   */
  public async getMemberHistory(memberId: string): Promise<MemberHistorySummary> {
    if (!memberId) {
      throw new GasApiError('ID member wajib disertakan untuk memuat riwayat.', 'INVALID_PARAM');
    }

    const data = await this.get<GasMemberHistoryResponse>('memberhistory', { id_member: memberId });
    if (!data || !Array.isArray(data.history)) {
      throw new GasApiError('Format response memberhistory dari GAS tidak valid.', 'MALFORMED_RESPONSE');
    }

    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    let totalQty = 0;
    let currentMonthQty = 0;
    const itemMap = new Map<string, { namaItem: string; qty: number; count: number; lastDate: string; satuan?: string }>();

    const transactions: Transaksi[] = data.history.map((t) => {
      const idTrx = t.ID_TRANSAKSI || '';
      const tanggal = t.TANGGAL || '';
      const timestamp = t.TIMESTAMP || tanggal;
      const idItem = t.ID_ITEM || '';
      const namaItem = t.NAMA_ITEM || idItem;
      const jenis = t.JENIS_TRANSAKSI || 'BARANG_KELUAR';
      const noDok = t.NO_DOKUMEN || '-';
      const jumlah = Number(t.JUMLAH ?? 0);
      const ket = t.KETERANGAN || '-';
      const satuan = t.SATUAN || undefined;

      totalQty += jumlah;
      if (tanggal.startsWith(currentMonthPrefix)) {
        currentMonthQty += jumlah;
      }

      const prev = itemMap.get(idItem) || { namaItem, qty: 0, count: 0, lastDate: tanggal, satuan };
      prev.qty += jumlah;
      prev.count += 1;
      if (t.SATUAN && !prev.satuan) {
        prev.satuan = t.SATUAN;
      }
      if (tanggal > prev.lastDate) {
        prev.lastDate = tanggal;
      }
      itemMap.set(idItem, prev);

      return {
        ID_TRANSAKSI: idTrx,
        TIMESTAMP: timestamp,
        TANGGAL: tanggal,
        ID_ITEM: idItem,
        NAMA_ITEM: namaItem,
        JENIS_TRANSAKSI: jenis,
        NO_DOKUMEN: noDok,
        JUMLAH: jumlah,
        ID_MEMBER: memberId,
        NAMA_MEMBER: typeof data.member === 'object' ? data.member.NAMA_MEMBER : data.member || memberId,
        SATUAN: satuan,
        KETERANGAN: ket,
        CREATED_AT: timestamp,
      };
    });

    const itemsSummary = Array.from(itemMap.entries()).map(([idItem, val]) => ({
      idItem,
      namaItem: val.namaItem,
      totalQty: val.qty,
      satuan: val.satuan,
      lastDate: val.lastDate,
      count: val.count,
    }));

    return {
      member: data.member,
      totalTransaksi: Number(data.count ?? transactions.length),
      totalQty,
      currentMonthQty,
      items: itemsSummary,
      transactions,
    };
  }

  /**
   * Pickup Eligibility: GET action=pickupeligibility&id_member=...&id_item=...&jumlah=...
   * GAS response: data.allowed, data.early, data.reason, data.masaPakaiBulan, data.maxQty, data.lastPickupDate, data.dueDate
   */
  public async getPickupEligibility(memberId: string, itemId: string, qty: number): Promise<PickupEligibilityResult> {
    if (!memberId || !itemId) {
      throw new GasApiError('Member dan barang harus dipilih untuk validasi kelayakan.', 'INVALID_PARAM');
    }

    const data = await this.get<GasPickupEligibilityResponse>('pickupeligibility', {
      id_member: memberId,
      id_item: itemId,
      jumlah: String(qty || 1),
    });

    if (!data || typeof data.allowed !== 'boolean') {
      throw new GasApiError('Format response pickupeligibility dari GAS tidak valid.', 'MALFORMED_RESPONSE');
    }

    return {
      allowed: data.allowed,
      early: Boolean(data.early),
      reason: data.reason || '',
      masaPakaiBulan: data.masaPakaiBulan !== undefined ? Number(data.masaPakaiBulan) : undefined,
      maxQty: data.maxQty !== undefined ? Number(data.maxQty) : undefined,
      lastPickupDate: data.lastPickupDate || '',
      dueDate: data.dueDate || '',
    };
  }

  /**
   * Requests: GET action=requests -> normalized data.requests
   */
  public async getRequests(params?: { memberId?: string; status?: string }): Promise<PengajuanPengambilan[]> {
    const queryParams: Record<string, string> = {};
    if (params?.memberId) {
      queryParams.id_member = params.memberId;
    }
    if (params?.status && params.status !== 'ALL') {
      queryParams.status = params.status;
    }

    const data = await this.get<GasRequestsResponse>('requests', queryParams);
    if (!data || !Array.isArray(data.requests)) {
      throw new GasApiError('Format response requests dari GAS tidak valid.', 'MALFORMED_RESPONSE');
    }
    return data.requests.map((r: any) => ({
      ID_PENGAJUAN: String(r.ID_PENGAJUAN || '').trim(),
      TANGGAL: String(r.TANGGAL || '').trim(),
      ID_MEMBER: String(r.ID_MEMBER || '').trim(),
      ID_ITEM: String(r.ID_ITEM || '').trim(),
      NAMA_MEMBER: r.NAMA_MEMBER ? String(r.NAMA_MEMBER).trim() : undefined,
      NAMA_ITEM: r.NAMA_ITEM ? String(r.NAMA_ITEM).trim() : undefined,
      JUMLAH: Number(r.JUMLAH || 0),
      TANGGAL_TERAKHIR_AMBIL: r.TANGGAL_TERAKHIR_AMBIL ? String(r.TANGGAL_TERAKHIR_AMBIL).trim() : '',
      TANGGAL_SEHARUSNYA: r.TANGGAL_SEHARUSNYA ? String(r.TANGGAL_SEHARUSNYA).trim() : '',
      ALASAN: String(r.ALASAN || '').trim(),
      STATUS: String(r.STATUS || 'MENUNGGU').trim(),
      ID_APPROVER: r.ID_APPROVER ? String(r.ID_APPROVER).trim() : '',
      CATATAN_APPROVER: r.CATATAN_APPROVER ? String(r.CATATAN_APPROVER).trim() : '',
      TIMESTAMP: r.TIMESTAMP ? String(r.TIMESTAMP).trim() : (r.TANGGAL ? String(r.TANGGAL).trim() : ''),
    }));
  }

  /**
   * Debug transactions: GET action=debug_transactions
   */
  public async getDebugTransactions(): Promise<Transaksi[]> {
    const data = await this.get<GasTransactionsResponse>('debug_transactions');
    if (!data || !Array.isArray(data.transactions)) {
      throw new GasApiError('Format response debug_transactions dari GAS tidak valid.', 'MALFORMED_RESPONSE');
    }
    return data.transactions;
  }

  // --- POST METHODS WITH CONTRACT MAPPING ---

  /**
   * Transaction: POST action=transaction
   * Payload mapping:
   * { itemId, type, jumlah, memberId, keterangan, tanggal, noDokumen }
   * -> { ID_ITEM, JENIS_TRANSAKSI, JUMLAH, ID_MEMBER, KETERANGAN, TANGGAL, NO_DOKUMEN }
   */
  public async submitTransaction(input: TransactionInput): Promise<TransactionResult> {
    const payload: GasTransactionPayload = {
      action: 'transaction',
      ID_ITEM: input.itemId,
      JENIS_TRANSAKSI: input.type,
      JUMLAH: Number(input.jumlah),
      ID_MEMBER: input.memberId || '',
      KETERANGAN: input.keterangan || '',
      TANGGAL: input.tanggal || '',
      NO_DOKUMEN: input.noDokumen || '',
    };

    return this.post<TransactionResult>(payload);
  }

  /**
   * Request: POST action=request
   * Payload mapping:
   * { memberId, itemId, jumlah, alasan }
   * -> { ID_MEMBER, ID_ITEM, JUMLAH, ALASAN }
   */
  public async submitRequest(input: PickupRequestInput): Promise<PickupRequestResult> {
    const payload: GasRequestPayload = {
      action: 'request',
      ID_MEMBER: input.memberId,
      ID_ITEM: input.itemId,
      JUMLAH: Number(input.jumlah),
      ALASAN: input.alasan,
    };

    return this.post<PickupRequestResult>(payload);
  }

  /**
   * Approval: POST action=approve_request
   * Payload mapping:
   * { requestId, approverId, note }
   * -> { ID_PENGAJUAN, ID_APPROVER, CATATAN_APPROVER }
   */
  public async approveRequest(input: ApprovalInput): Promise<ActionResult> {
    const payload: GasApprovalPayload = {
      action: 'approve_request',
      ID_PENGAJUAN: input.requestId,
      ID_APPROVER: input.approverId || 'ADMIN',
      CATATAN_APPROVER: input.note || '',
    };

    return this.post<ActionResult>(payload);
  }

  /**
   * Rejection: POST action=reject_request
   * Payload mapping:
   * { requestId, approverId, note }
   * -> { ID_PENGAJUAN, ID_APPROVER, CATATAN_APPROVER }
   */
  public async rejectRequest(input: RejectionInput): Promise<ActionResult> {
    const payload: GasRejectionPayload = {
      action: 'reject_request',
      ID_PENGAJUAN: input.requestId,
      ID_APPROVER: input.approverId || 'ADMIN',
      CATATAN_APPROVER: input.note || '',
    };

    return this.post<ActionResult>(payload);
  }

  /**
   * Update Request Status: POST action=update_request_status
   * Valid workflow transitions: DISETUJUI -> DIPROSES -> SELESAI
   * Payload: { action: 'update_request_status', ID_PENGAJUAN, STATUS }
   */
  public async updateRequestStatus(requestId: string, status: 'DIPROSES' | 'SELESAI'): Promise<ActionResult> {
    const payload = {
      action: 'update_request_status',
      ID_PENGAJUAN: requestId,
      STATUS: status,
    };

    return this.post<ActionResult>(payload);
  }

  /**
   * Update Member: POST action=update_member
   * Payload: { action: 'update_member', ID_MEMBER, NAMA_MEMBER?, JABATAN?, NO_HP?, LANTAI?, STATUS? }
   */
  public async updateMember(input: UpdateMemberInput): Promise<{ message?: string; member?: MasterMember; [key: string]: unknown }> {
    const payload: Record<string, unknown> = {
      action: 'update_member',
      ID_MEMBER: input.idMember,
    };
    if (input.namaMember !== undefined) payload.NAMA_MEMBER = input.namaMember;
    if (input.jabatan !== undefined) payload.JABATAN = input.jabatan;
    if (input.noHp !== undefined) payload.NO_HP = input.noHp;
    if (input.lantai !== undefined) payload.LANTAI = input.lantai;
    if (input.status !== undefined) payload.STATUS = input.status;

    return this.post(payload);
  }

  /**
   * Update Item: POST action=update_item
   * Payload: { action: 'update_item', ID_ITEM, NAMA_ITEM?, KATEGORI?, SATUAN?, MASA_PAKAI_BULAN?, MIN_STOK?, LOKASI?, STATUS? }
   */
  public async updateItem(input: UpdateItemInput): Promise<{ message?: string; item?: MasterItem; [key: string]: unknown }> {
    const payload: Record<string, unknown> = {
      action: 'update_item',
      ID_ITEM: input.idItem,
    };
    if (input.namaItem !== undefined) payload.NAMA_ITEM = input.namaItem;
    if (input.kategori !== undefined) payload.KATEGORI = input.kategori;
    if (input.satuan !== undefined) payload.SATUAN = input.satuan;
    if (input.masaPakaiBulan !== undefined) payload.MASA_PAKAI_BULAN = Number(input.masaPakaiBulan);
    if (input.minStok !== undefined) payload.MIN_STOK = Number(input.minStok);
    if (input.lokasi !== undefined) payload.LOKASI = input.lokasi;
    if (input.status !== undefined) payload.STATUS = input.status;

    return this.post(payload);
  }

  /**
   * Verify Admin PIN: POST action=verify_admin_pin, PIN=...
   */
  public async verifyAdminPin(pin: string): Promise<{ ok: boolean }> {
    return this.post<{ ok: boolean }>({ action: 'verify_admin_pin', PIN: pin });
  }

  /**
   * Create Member Limit: POST action=limit, operation=create
   */
  public async createLimit(input: CreateMemberLimitInput): Promise<MemberLimitResult> {
    const payload: GasLimitPayload = {
      action: 'limit',
      operation: 'create',
      ID_MEMBER: input.memberId,
      ID_ITEM: input.itemId,
      MAX_QTY: Number(input.maxQty),
      STATUS: input.status || 'AKTIF',
    };
    if (input.satuan) {
      payload.SATUAN = input.satuan;
    }

    return this.post<MemberLimitResult>(payload);
  }

  /**
   * Update Member Limit: POST action=limit, operation=update
   */
  public async updateLimit(input: UpdateMemberLimitInput): Promise<MemberLimitResult> {
    const payload: GasLimitPayload = {
      action: 'limit',
      operation: 'update',
      ID_LIMIT: input.limitId,
      MAX_QTY: Number(input.maxQty),
      SATUAN: input.satuan || '',
      STATUS: input.status || 'AKTIF',
    };

    return this.post<MemberLimitResult>(payload);
  }

  /**
   * Deactivate Member Limit: POST action=limit, operation=deactivate
   */
  public async deactivateLimit(limitId: string): Promise<MemberLimitResult> {
    const payload: GasLimitPayload = {
      action: 'limit',
      operation: 'deactivate',
      ID_LIMIT: limitId,
    };

    return this.post<MemberLimitResult>(payload);
  }

  /**
   * Reactivate Member Limit: POST action=limit, operation=activate
   */
  public async activateLimit(limitId: string): Promise<MemberLimitResult> {
    const payload: GasLimitPayload = {
      action: 'limit',
      operation: 'activate',
      ID_LIMIT: limitId,
    };

    return this.post<MemberLimitResult>(payload);
  }
}

export const api = new ApiService();
