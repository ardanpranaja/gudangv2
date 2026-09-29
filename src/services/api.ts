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
  GasEnvelope,
  GasTransactionPayload,
  GasRequestPayload,
  GasApprovalPayload,
  GasRejectionPayload,
} from '../types';

export class GasApiError extends Error {
  public code?: string;
  public details?: any;

  constructor(message: string, code?: string, details?: any) {
    super(message);
    this.name = 'GasApiError';
    this.code = code;
    this.details = details;
  }
}

const STORAGE_KEY_GAS_URL = 'gudangpresisi_gas_url';

class ApiService {
  private gasUrl: string = '';

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    const saved = localStorage.getItem(STORAGE_KEY_GAS_URL);
    if (saved) {
      this.gasUrl = saved.trim();
    } else {
      const envUrl = (import.meta as any).env?.VITE_GAS_API_URL;
      if (envUrl) {
        this.gasUrl = envUrl.trim();
      }
    }
  }

  public getGasUrl(): string {
    return this.gasUrl;
  }

  public setGasUrl(url: string) {
    this.gasUrl = url.trim();
    if (this.gasUrl) {
      localStorage.setItem(STORAGE_KEY_GAS_URL, this.gasUrl);
    } else {
      localStorage.removeItem(STORAGE_KEY_GAS_URL);
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
        throw new GasApiError(json.error || json.message || 'Operasi GAS gagal.', 'GAS_ERROR');
      }

      return json.data;
    } catch (err: any) {
      if (err instanceof GasApiError) {
        throw err;
      }
      throw new GasApiError(
        err.message || 'Gagal terhubung ke backend Google Apps Script.',
        'NETWORK_ERROR',
        err
      );
    }
  }

  /**
   * Authoritative POST requester
   */
  private async post<T>(bodyPayload: Record<string, any>): Promise<T> {
    if (!this.gasUrl) {
      throw new GasApiError(
        'URL Google Apps Script belum dikonfigurasi. Silakan atur URL Web App di menu Pengaturan.',
        'UNCONFIGURED'
      );
    }

    try {
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
        throw new GasApiError(
          json.error || json.message || 'Operasi POST gagal di backend GAS.',
          'GAS_POST_ERROR'
        );
      }

      return json.data;
    } catch (err: any) {
      if (err instanceof GasApiError) {
        throw err;
      }
      throw new GasApiError(
        err.message || 'Gagal mengirim transaksi ke Google Apps Script.',
        'NETWORK_POST_ERROR',
        err
      );
    }
  }

  // --- GET METHODS WITH RESPONSE NORMALIZATION ---

  /**
   * Health Check
   * GAS response: data.sheets, data.spreadsheetId, etc.
   */
  public async checkHealth(): Promise<SystemHealth> {
    if (!this.gasUrl) {
      return {
        status: 'UNCONFIGURED',
        version: '1.2.2',
        lastChecked: new Date().toISOString(),
        error: 'URL Google Apps Script belum dikonfigurasi di Pengaturan.',
      };
    }

    const start = performance.now();
    try {
      const data: any = await this.get('health');
      const latencyMs = Math.round(performance.now() - start);

      return {
        status: 'ONLINE',
        spreadsheetId: data?.spreadsheetId || data?.ssId || 'Connected',
        sheetsFound: Array.isArray(data?.sheets) ? data.sheets : Array.isArray(data?.sheetsFound) ? data.sheetsFound : [],
        latencyMs,
        version: data?.version || '1.2.2',
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'OFFLINE',
        lastChecked: new Date().toISOString(),
        error: err.message || 'Gagal menghubungi backend GAS',
      };
    }
  }

  /**
   * Items: GET action=items -> normalized data.items
   */
  public async getItems(): Promise<MasterItem[]> {
    const data: any = await this.get('items');
    if (!data) return [];
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data)) return data;
    return [];
  }

  /**
   * Members: GET action=members -> normalized data.members
   */
  public async getMembers(): Promise<MasterMember[]> {
    const data: any = await this.get('members');
    if (!data) return [];
    if (Array.isArray(data.members)) return data.members;
    if (Array.isArray(data)) return data;
    return [];
  }

  /**
   * Limits: GET action=limits -> normalized data.limits
   */
  public async getLimits(): Promise<MemberLimit[]> {
    const data: any = await this.get('limits');
    if (!data) return [];
    if (Array.isArray(data.limits)) return data.limits;
    if (Array.isArray(data)) return data;
    return [];
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

    const data: any = await this.get('transactions', queryParams);
    if (!data) return [];
    if (Array.isArray(data.transactions)) return data.transactions;
    if (Array.isArray(data)) return data;
    return [];
  }

  /**
   * Stock: GET action=stock -> normalized data.stock
   */
  public async getStock(): Promise<ItemStock[]> {
    const data: any = await this.get('stock');
    const rawList: any[] = Array.isArray(data?.stock) ? data.stock : Array.isArray(data) ? data : [];

    return rawList.map((item: any) => {
      const idItem = item.ID_ITEM || item.idItem || item.id || '';
      const namaItem = item.NAMA_ITEM || item.namaItem || item.name || '';
      const kategori = item.KATEGORI || item.kategori || 'PERALATAN';
      const satuan = item.SATUAN || item.satuan || 'UNIT';
      const stok = Number(item.STOK ?? item.stok ?? item.SALDO ?? item.saldo ?? 0);
      const minStok = Number(item.MIN_STOK ?? item.minStok ?? 0);
      const lokasi = item.LOKASI || item.lokasi || '-';
      const status = item.STATUS || item.status || 'AKTIF';

      return {
        idItem,
        namaItem,
        kategori,
        satuan,
        stok,
        minStok,
        lokasi,
        status,
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

    const data: any = await this.get('bincard', { id_item: itemId });
    if (!data) {
      return {
        item: itemId,
        saldoAwal: 0,
        saldoAkhir: 0,
        count: 0,
        rows: [],
      };
    }

    const rawRows: any[] = Array.isArray(data.rows) ? data.rows : Array.isArray(data) ? data : [];

    const normalizedRows: BinCardEntry[] = rawRows.map((r: any) => ({
      tanggal: r.TANGGAL || r.tanggal || '',
      timestamp: r.TIMESTAMP || r.timestamp || r.TANGGAL || '',
      noDokumen: r.NO_DOKUMEN || r.noDokumen || '-',
      jenisTransaksi: r.JENIS_TRANSAKSI || r.jenisTransaksi || 'BARANG_KELUAR',
      keterangan: r.KETERANGAN || r.keterangan || '-',
      masuk: Number(r.MASUK ?? r.masuk ?? 0),
      keluar: Number(r.KELUAR ?? r.keluar ?? 0),
      saldo: Number(r.SALDO ?? r.saldo ?? 0),
      memberId: r.ID_MEMBER || r.memberId || '',
      namaMember: r.NAMA_MEMBER || r.namaMember || '',
    }));

    return {
      item: typeof data.item === 'string' ? data.item : data.item?.NAMA_ITEM || itemId,
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

    const data: any = await this.get('memberhistory', { id_member: memberId });
    if (!data) {
      return {
        member: { ID_MEMBER: memberId, NAMA_MEMBER: memberId, JENIS_MEMBER: 'CREW' },
        totalTransaksi: 0,
        totalQty: 0,
        currentMonthQty: 0,
        items: [],
        transactions: [],
      };
    }

    const rawHistory: any[] = Array.isArray(data.history)
      ? data.history
      : Array.isArray(data.transactions)
      ? data.transactions
      : Array.isArray(data)
      ? data
      : [];

    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    let totalQty = 0;
    let currentMonthQty = 0;
    const itemMap = new Map<string, { namaItem: string; qty: number; count: number; lastDate: string; satuan: string }>();

    const transactions: Transaksi[] = rawHistory.map((t: any) => {
      const idTrx = t.ID_TRANSAKSI || t.idTransaksi || '';
      const tanggal = t.TANGGAL || t.tanggal || '';
      const timestamp = t.TIMESTAMP || t.timestamp || tanggal;
      const idItem = t.ID_ITEM || t.idItem || '';
      const namaItem = t.NAMA_ITEM || t.namaItem || idItem;
      const jenis = t.JENIS_TRANSAKSI || t.jenisTransaksi || 'BARANG_KELUAR';
      const noDok = t.NO_DOKUMEN || t.noDokumen || '-';
      const jumlah = Number(t.JUMLAH ?? t.jumlah ?? 0);
      const ket = t.KETERANGAN || t.keterangan || '-';
      const satuan = t.SATUAN || t.satuan || 'UNIT';

      totalQty += jumlah;
      if (tanggal.startsWith(currentMonthPrefix)) {
        currentMonthQty += jumlah;
      }

      const prev = itemMap.get(idItem) || { namaItem, qty: 0, count: 0, lastDate: tanggal, satuan };
      prev.qty += jumlah;
      prev.count += 1;
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
      member: typeof data.member === 'object' ? data.member : { ID_MEMBER: memberId, NAMA_MEMBER: data.member || memberId, JENIS_MEMBER: 'CREW' },
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

    const data: any = await this.get('pickupeligibility', {
      id_member: memberId,
      id_item: itemId,
      jumlah: String(qty || 1),
    });

    if (!data) {
      return {
        allowed: false,
        early: false,
        reason: 'Tidak ada respon validasi dari backend.',
      };
    }

    return {
      allowed: Boolean(data.allowed),
      early: Boolean(data.early),
      reason: data.reason || '',
      masaPakaiBulan: data.masaPakaiBulan !== undefined ? Number(data.masaPakaiBulan) : undefined,
      maxQty: data.maxQty !== undefined ? Number(data.maxQty) : undefined,
      lastPickupDate: data.lastPickupDate || '',
      dueDate: data.dueDate || '',
    };
  }

  /**
   * Debug transactions: GET action=debug_transactions
   */
  public async getDebugTransactions(): Promise<Transaksi[]> {
    const data: any = await this.get('debug_transactions');
    if (!data) return [];
    if (Array.isArray(data.transactions)) return data.transactions;
    if (Array.isArray(data)) return data;
    return [];
  }

  // --- POST METHODS WITH CONTRACT MAPPING ---

  /**
   * Transaction: POST action=transaction
   * Payload mapping per Step 4:
   * { itemId, type, jumlah, memberId, keterangan, tanggal, noDokumen }
   * -> { ID_ITEM, JENIS_TRANSAKSI, JUMLAH, ID_MEMBER, KETERANGAN, TANGGAL, NO_DOKUMEN }
   */
  public async submitTransaction(input: TransactionInput): Promise<any> {
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

    return this.post(payload);
  }

  /**
   * Request: POST action=request
   * Payload mapping per Step 4:
   * { memberId, itemId, jumlah, alasan }
   * -> { ID_MEMBER, ID_ITEM, JUMLAH, ALASAN }
   */
  public async submitRequest(input: PickupRequestInput): Promise<any> {
    const payload: GasRequestPayload = {
      action: 'request',
      ID_MEMBER: input.memberId,
      ID_ITEM: input.itemId,
      JUMLAH: Number(input.jumlah),
      ALASAN: input.alasan,
    };

    return this.post(payload);
  }

  /**
   * Approval: POST action=approve_request
   * Payload mapping per Step 4:
   * { requestId, approverId, note }
   * -> { ID_PENGAJUAN, ID_APPROVER, CATATAN_APPROVER }
   */
  public async approveRequest(input: ApprovalInput): Promise<any> {
    const payload: GasApprovalPayload = {
      action: 'approve_request',
      ID_PENGAJUAN: input.requestId,
      ID_APPROVER: input.approverId || 'ADMIN',
      CATATAN_APPROVER: input.note || '',
    };

    return this.post(payload);
  }

  /**
   * Rejection: POST action=reject_request
   * Payload mapping per Step 4:
   * { requestId, approverId, note }
   * -> { ID_PENGAJUAN, ID_APPROVER, CATATAN_APPROVER }
   */
  public async rejectRequest(input: RejectionInput): Promise<any> {
    const payload: GasRejectionPayload = {
      action: 'reject_request',
      ID_PENGAJUAN: input.requestId,
      ID_APPROVER: input.approverId || 'ADMIN',
      CATATAN_APPROVER: input.note || '',
    };

    return this.post(payload);
  }
}

export const api = new ApiService();
