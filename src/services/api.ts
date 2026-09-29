import {
  MasterItem,
  MasterMember,
  MemberLimit,
  Transaksi,
  PengajuanPengambilan,
  MasterMesin,
  PemakaianMesin,
  ItemStock,
  BinCardEntry,
  MemberHistorySummary,
  PickupEligibilityResult,
  SystemHealth,
} from '../types';

const STORAGE_KEYS = {
  GAS_URL: 'gudangpresisi_gas_url',
  OFFLINE_MODE: 'gudangpresisi_offline_mode',
  LOCAL_ITEMS: 'gudangpresisi_db_items',
  LOCAL_MEMBERS: 'gudangpresisi_db_members',
  LOCAL_LIMITS: 'gudangpresisi_db_limits',
  LOCAL_TRANSACTIONS: 'gudangpresisi_db_transactions',
  LOCAL_REQUESTS: 'gudangpresisi_db_requests',
  LOCAL_MACHINES: 'gudangpresisi_db_machines',
  LOCAL_USAGES: 'gudangpresisi_db_usages',
};

// Initial state for fallback/local database seed if empty
const INITIAL_ITEMS: MasterItem[] = [
  {
    ID_ITEM: 'ITM-0001',
    NAMA_ITEM: 'Floor Polisher 17 Inch Single Disc',
    KATEGORI: 'MESIN',
    SATUAN: 'UNIT',
    MASA_PAKAI_BULAN: 36,
    STOK_AWAL: 4,
    MIN_STOK: 2,
    LOKASI: 'Gudang Mesin A-01',
    STATUS: 'AKTIF',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
  {
    ID_ITEM: 'ITM-0002',
    NAMA_ITEM: 'Wet & Dry Vacuum Cleaner 30L',
    KATEGORI: 'MESIN',
    SATUAN: 'UNIT',
    MASA_PAKAI_BULAN: 24,
    STOK_AWAL: 6,
    MIN_STOK: 2,
    LOKASI: 'Gudang Mesin A-02',
    STATUS: 'AKTIF',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
  {
    ID_ITEM: 'ITM-0003',
    NAMA_ITEM: 'Floor Cleaner Neutral Gallon',
    KATEGORI: 'CHEMICAL',
    SATUAN: 'JERIGEN',
    MASA_PAKAI_BULAN: 1,
    STOK_AWAL: 50,
    MIN_STOK: 15,
    LOKASI: 'Rak Chemical B-01',
    STATUS: 'AKTIF',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
  {
    ID_ITEM: 'ITM-0004',
    NAMA_ITEM: 'Glass Cleaner Concentrate',
    KATEGORI: 'CHEMICAL',
    SATUAN: 'JERIGEN',
    MASA_PAKAI_BULAN: 1,
    STOK_AWAL: 30,
    MIN_STOK: 10,
    LOKASI: 'Rak Chemical B-02',
    STATUS: 'AKTIF',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
  {
    ID_ITEM: 'ITM-0005',
    NAMA_ITEM: 'Microfiber Cloth Biru (General)',
    KATEGORI: 'PERALATAN',
    SATUAN: 'PCS',
    MASA_PAKAI_BULAN: 3,
    STOK_AWAL: 120,
    MIN_STOK: 30,
    LOKASI: 'Rak Alat C-03',
    STATUS: 'AKTIF',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
  {
    ID_ITEM: 'ITM-0006',
    NAMA_ITEM: 'Mop Set Microfiber Alumunium',
    KATEGORI: 'PERALATAN',
    SATUAN: 'SET',
    MASA_PAKAI_BULAN: 6,
    STOK_AWAL: 25,
    MIN_STOK: 8,
    LOKASI: 'Rak Alat C-04',
    STATUS: 'AKTIF',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
  {
    ID_ITEM: 'ITM-0007',
    NAMA_ITEM: 'Seragam Crew Lapangan Ukuran L',
    KATEGORI: 'SERAGAM',
    SATUAN: 'STEL',
    MASA_PAKAI_BULAN: 6,
    STOK_AWAL: 40,
    MIN_STOK: 12,
    LOKASI: 'Lemari Seragam D-01',
    STATUS: 'AKTIF',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
  {
    ID_ITEM: 'ITM-0008',
    NAMA_ITEM: 'Safety Shoes Standar Gudang (Size 42)',
    KATEGORI: 'SERAGAM',
    SATUAN: 'PASANG',
    MASA_PAKAI_BULAN: 12,
    STOK_AWAL: 15,
    MIN_STOK: 5,
    LOKASI: 'Lemari APD D-03',
    STATUS: 'AKTIF',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
];

const INITIAL_MEMBERS: MasterMember[] = [
  {
    ID_MEMBER: 'MBR000001',
    NAMA_MEMBER: 'Ahmad Fauzi',
    JENIS_MEMBER: 'SM',
    NO_HP: '081234567890',
    STATUS: 'AKTIF',
    TANGGAL_MULAI: '2025-01-01',
    CREATED_AT: '2025-01-01 08:00:00',
    UPDATED_AT: '2025-01-01 08:00:00',
  },
  {
    ID_MEMBER: 'MBR000002',
    NAMA_MEMBER: 'Budi Santoso',
    JENIS_MEMBER: 'SPV',
    NO_HP: '081298765432',
    STATUS: 'AKTIF',
    TANGGAL_MULAI: '2025-03-01',
    CREATED_AT: '2025-03-01 08:00:00',
    UPDATED_AT: '2025-03-01 08:00:00',
  },
  {
    ID_MEMBER: 'MBR000003',
    NAMA_MEMBER: 'Citra Dewi',
    JENIS_MEMBER: 'TL',
    NO_HP: '085712345678',
    STATUS: 'AKTIF',
    TANGGAL_MULAI: '2025-06-15',
    CREATED_AT: '2025-06-15 08:00:00',
    UPDATED_AT: '2025-06-15 08:00:00',
  },
  {
    ID_MEMBER: 'MBR000004',
    NAMA_MEMBER: 'Dedi Kurniawan',
    JENIS_MEMBER: 'CREW',
    NO_HP: '087812349999',
    STATUS: 'AKTIF',
    TANGGAL_MULAI: '2025-09-01',
    CREATED_AT: '2025-09-01 08:00:00',
    UPDATED_AT: '2025-09-01 08:00:00',
  },
  {
    ID_MEMBER: 'MBR000005',
    NAMA_MEMBER: 'Eko Prasetyo',
    JENIS_MEMBER: 'CREW',
    NO_HP: '089612345678',
    STATUS: 'AKTIF',
    TANGGAL_MULAI: '2026-01-10',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
  {
    ID_MEMBER: 'MBR000006',
    NAMA_MEMBER: 'PT Bersih Berkah Sejahtera',
    JENIS_MEMBER: 'VENDOR',
    NO_HP: '0218889999',
    STATUS: 'AKTIF',
    TANGGAL_MULAI: '2025-01-15',
    CREATED_AT: '2025-01-15 08:00:00',
    UPDATED_AT: '2025-01-15 08:00:00',
  },
];

const INITIAL_LIMITS: MemberLimit[] = [
  {
    ID_LIMIT: 'LMT-0001',
    ID_MEMBER: 'MBR000004',
    ID_ITEM: 'ITM-0003',
    MAX_QTY: 4,
    SATUAN: 'JERIGEN',
    STATUS: 'AKTIF',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
  {
    ID_LIMIT: 'LMT-0002',
    ID_MEMBER: 'MBR000004',
    ID_ITEM: 'ITM-0005',
    MAX_QTY: 5,
    SATUAN: 'PCS',
    STATUS: 'AKTIF',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
  {
    ID_LIMIT: 'LMT-0003',
    ID_MEMBER: 'MBR000005',
    ID_ITEM: 'ITM-0003',
    MAX_QTY: 3,
    SATUAN: 'JERIGEN',
    STATUS: 'AKTIF',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
  {
    ID_LIMIT: 'LMT-0004',
    ID_MEMBER: 'MBR000005',
    ID_ITEM: 'ITM-0007',
    MAX_QTY: 2,
    SATUAN: 'STEL',
    STATUS: 'AKTIF',
    CREATED_AT: '2026-01-10 08:00:00',
    UPDATED_AT: '2026-01-10 08:00:00',
  },
];

const INITIAL_TRANSACTIONS: Transaksi[] = [
  {
    ID_TRANSAKSI: 'TRX-202601-0001',
    TIMESTAMP: '2026-01-01 08:00:00',
    TANGGAL: '2026-01-01',
    ID_ITEM: 'ITM-0001',
    JENIS_TRANSAKSI: 'SALDO_AWAL',
    NO_DOKUMEN: 'SA-202601-0001',
    JUMLAH: 4,
    KETERANGAN: 'Saldo Awal Tahun 2026',
    CREATED_AT: '2026-01-01 08:00:00',
  },
  {
    ID_TRANSAKSI: 'TRX-202601-0002',
    TIMESTAMP: '2026-01-01 08:00:00',
    TANGGAL: '2026-01-01',
    ID_ITEM: 'ITM-0003',
    JENIS_TRANSAKSI: 'SALDO_AWAL',
    NO_DOKUMEN: 'SA-202601-0002',
    JUMLAH: 50,
    KETERANGAN: 'Saldo Awal Tahun 2026',
    CREATED_AT: '2026-01-01 08:00:00',
  },
  {
    ID_TRANSAKSI: 'TRX-202601-0003',
    TIMESTAMP: '2026-01-01 08:00:00',
    TANGGAL: '2026-01-01',
    ID_ITEM: 'ITM-0005',
    JENIS_TRANSAKSI: 'SALDO_AWAL',
    NO_DOKUMEN: 'SA-202601-0003',
    JUMLAH: 120,
    KETERANGAN: 'Saldo Awal Tahun 2026',
    CREATED_AT: '2026-01-01 08:00:00',
  },
  {
    ID_TRANSAKSI: 'TRX-202602-0004',
    TIMESTAMP: '2026-02-05 10:15:00',
    TANGGAL: '2026-02-05',
    ID_ITEM: 'ITM-0003',
    JENIS_TRANSAKSI: 'BARANG_MASUK',
    NO_DOKUMEN: 'BM-202602-0001',
    JUMLAH: 20,
    KETERANGAN: 'Pengiriman PO-4482 dari PT Chemika Jaya',
    CREATED_AT: '2026-02-05 10:15:00',
  },
  {
    ID_TRANSAKSI: 'TRX-202602-0005',
    TIMESTAMP: '2026-02-10 14:30:00',
    TANGGAL: '2026-02-10',
    ID_ITEM: 'ITM-0003',
    JENIS_TRANSAKSI: 'BARANG_KELUAR',
    NO_DOKUMEN: 'BK-202602-0001',
    JUMLAH: 2,
    ID_MEMBER: 'MBR000004',
    NAMA_MEMBER: 'Dedi Kurniawan',
    KETERANGAN: 'Pengambilan rutin bulanan Area Lobby & Koridor',
    CREATED_AT: '2026-02-10 14:30:00',
  },
  {
    ID_TRANSAKSI: 'TRX-202602-0006',
    TIMESTAMP: '2026-02-15 09:00:00',
    TANGGAL: '2026-02-15',
    ID_ITEM: 'ITM-0001',
    JENIS_TRANSAKSI: 'PINJAM',
    NO_DOKUMEN: 'PM-202602-0001',
    JUMLAH: 1,
    ID_MEMBER: 'MBR000003',
    NAMA_MEMBER: 'Citra Dewi',
    KETERANGAN: 'Peminjaman untuk deep cleaning lantai ballroom',
    CREATED_AT: '2026-02-15 09:00:00',
  },
  {
    ID_TRANSAKSI: 'TRX-202602-0007',
    TIMESTAMP: '2026-02-16 16:45:00',
    TANGGAL: '2026-02-16',
    ID_ITEM: 'ITM-0001',
    JENIS_TRANSAKSI: 'KEMBALI',
    NO_DOKUMEN: 'KB-202602-0001',
    JUMLAH: 1,
    ID_MEMBER: 'MBR000003',
    NAMA_MEMBER: 'Citra Dewi',
    KETERANGAN: 'Pengembalian polisher kondisi bersih dan berfungsi baik',
    CREATED_AT: '2026-02-16 16:45:00',
  },
];

const INITIAL_REQUESTS: PengajuanPengambilan[] = [
  {
    ID_PENGAJUAN: 'REQ-202602-0001',
    ID_MEMBER: 'MBR000005',
    NAMA_MEMBER: 'Eko Prasetyo',
    ID_ITEM: 'ITM-0007',
    NAMA_ITEM: 'Seragam Crew Lapangan Ukuran L',
    JUMLAH: 1,
    ALASAN: 'Seragam sebelumnya terkena tumpahan zat asam saat cleaning toilet kimia',
    STATUS: 'MENUNGGU',
    CREATED_AT: '2026-02-18 11:20:00',
    UPDATED_AT: '2026-02-18 11:20:00',
  },
];

const INITIAL_MACHINES: MasterMesin[] = [
  {
    ID_MESIN: 'MSN-001',
    NAMA_MESIN: 'Single Disc Scrubber H-17',
    KATEGORI: 'MESIN POLESH',
    MERK: 'Karcher',
    MODEL: 'BDS 43/180 C',
    NO_SERI: 'KRC-2024-8891',
    LOKASI: 'Gudang Mesin A-01',
    KONDISI: 'BAIK',
    STATUS: 'TERSEDIA',
    TANGGAL_MASUK: '2024-05-10',
    CREATED_AT: '2024-05-10 09:00:00',
    UPDATED_AT: '2026-01-01 00:00:00',
  },
  {
    ID_MESIN: 'MSN-002',
    NAMA_MESIN: 'Ride-on Sweeper Industrial',
    KATEGORI: 'MESIN SAPU',
    MERK: 'Tennant',
    MODEL: 'S20',
    NO_SERI: 'TNN-2023-1120',
    LOKASI: 'Gudang Parkir B-02',
    KONDISI: 'BAIK',
    STATUS: 'TERSEDIA',
    TANGGAL_MASUK: '2023-11-15',
    CREATED_AT: '2023-11-15 09:00:00',
    UPDATED_AT: '2026-01-01 00:00:00',
  },
];

const INITIAL_USAGES: PemakaianMesin[] = [
  {
    ID_PEMAKAIAN: 'PMK-202602-0001',
    ID_MESIN: 'MSN-001',
    ID_MEMBER: 'MBR000004',
    NAMA_MESIN: 'Single Disc Scrubber H-17',
    NAMA_MEMBER: 'Dedi Kurniawan',
    TANGGAL: '2026-02-15',
    JAM_MULAI: '09:00',
    JAM_SELESAI: '12:30',
    DURASI: '3.5 Jam',
    TUJUAN_PEMAKAIAN: 'Pembersihan Lantai Lobby Barat',
    LOKASI_PEMAKAIAN: 'Gedung Utama Lt 1',
    KONDISI_SEBELUM: 'Baik, kabel utuh, pad terpasang',
    KONDISI_SESUDAH: 'Baik, dibersihkan dan kabel digulung rapi',
    KETERANGAN: 'Selesai tanpa kendala teknis',
    STATUS: 'SELESAI',
    CREATED_AT: '2026-02-15 13:00:00',
    UPDATED_AT: '2026-02-15 13:00:00',
  },
];

class ApiService {
  private gasUrl: string = '';

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    const savedUrl = localStorage.getItem(STORAGE_KEYS.GAS_URL);
    if (savedUrl) {
      this.gasUrl = savedUrl;
    } else {
      // Check environment
      const envUrl = (import.meta as any).env?.VITE_GAS_API_URL;
      if (envUrl) {
        this.gasUrl = envUrl;
      }
    }

    // Seed local bridge if empty
    if (!localStorage.getItem(STORAGE_KEYS.LOCAL_ITEMS)) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_ITEMS, JSON.stringify(INITIAL_ITEMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOCAL_MEMBERS)) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_MEMBERS, JSON.stringify(INITIAL_MEMBERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOCAL_LIMITS)) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_LIMITS, JSON.stringify(INITIAL_LIMITS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOCAL_TRANSACTIONS)) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOCAL_REQUESTS)) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_REQUESTS, JSON.stringify(INITIAL_REQUESTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOCAL_MACHINES)) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_MACHINES, JSON.stringify(INITIAL_MACHINES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOCAL_USAGES)) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_USAGES, JSON.stringify(INITIAL_USAGES));
    }
  }

  public getGasUrl(): string {
    return this.gasUrl;
  }

  public setGasUrl(url: string) {
    this.gasUrl = url.trim();
    if (this.gasUrl) {
      localStorage.setItem(STORAGE_KEYS.GAS_URL, this.gasUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.GAS_URL);
    }
  }

  // Health check
  public async checkHealth(): Promise<SystemHealth> {
    if (!this.gasUrl) {
      return {
        status: 'UNCONFIGURED',
        version: '1.0-locked',
        lastChecked: new Date().toISOString(),
        error: 'URL Google Apps Script belum dikonfigurasi di Pengaturan.',
      };
    }

    const startTime = performance.now();
    try {
      const url = `${this.gasUrl}${this.gasUrl.includes('?') ? '&' : '?'}action=health`;
      const res = await fetch(url, { method: 'GET', redirect: 'follow' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const latency = Math.round(performance.now() - startTime);
      return {
        status: 'ONLINE',
        spreadsheetId: data.spreadsheetId || 'Connected',
        sheetsFound: data.sheetsFound || [],
        latencyMs: latency,
        version: data.version || '1.0',
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

  // Generic fetch helper with fallback to Local Bridge if GAS unconfigured or offline
  private async getFromGas<T>(action: string, params: Record<string, string> = {}): Promise<T> {
    if (this.gasUrl) {
      try {
        const query = new URLSearchParams({ action, ...params }).toString();
        const url = `${this.gasUrl}${this.gasUrl.includes('?') ? '&' : '?'}${query}`;
        const res = await fetch(url, { method: 'GET', redirect: 'follow' });
        if (!res.ok) {
          throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
        }
        const json = await res.json();
        if (json.success === false) {
          throw new Error(json.error || 'Server error');
        }
        return json.data !== undefined ? json.data : json;
      } catch (err) {
        console.warn(`GAS fetch for ${action} failed:`, err);
        // If configured GAS is down, rethrow to respect Section 34 ("API failure != []")
        throw err;
      }
    }
    // If not configured, handle via local authoritative bridge
    return this.handleLocalGet<T>(action, params);
  }

  private async postToGas<T>(action: string, payload: any): Promise<T> {
    if (this.gasUrl) {
      try {
        // Send JSON as text/plain to avoid preflight CORS redirects with GAS
        const res = await fetch(this.gasUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ action, ...payload }),
          redirect: 'follow',
        });
        if (!res.ok) {
          throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
        }
        const json = await res.json();
        if (json.success === false) {
          throw new Error(json.error || 'Operasi gagal di backend GAS');
        }
        return json.data !== undefined ? json.data : json;
      } catch (err) {
        console.error(`GAS post for ${action} failed:`, err);
        throw err;
      }
    }
    // Local bridge handler
    return this.handleLocalPost<T>(action, payload);
  }

  // --- LOCAL AUTHORITATIVE BRIDGE HANDLER ---
  private async handleLocalGet<T>(action: string, params: Record<string, string>): Promise<T> {
    // Artificial latency for realistic async behavior
    await new Promise((r) => setTimeout(r, 60));

    switch (action) {
      case 'items': {
        const items = this.getLocal<MasterItem[]>(STORAGE_KEYS.LOCAL_ITEMS, []);
        return items as unknown as T;
      }
      case 'members': {
        const members = this.getLocal<MasterMember[]>(STORAGE_KEYS.LOCAL_MEMBERS, []);
        return members as unknown as T;
      }
      case 'limits': {
        const limits = this.getLocal<MemberLimit[]>(STORAGE_KEYS.LOCAL_LIMITS, []);
        const members = this.getLocal<MasterMember[]>(STORAGE_KEYS.LOCAL_MEMBERS, []);
        const items = this.getLocal<MasterItem[]>(STORAGE_KEYS.LOCAL_ITEMS, []);
        
        // Enrich limits
        const enriched = limits.map((l) => ({
          ...l,
          NAMA_MEMBER: members.find((m) => m.ID_MEMBER === l.ID_MEMBER)?.NAMA_MEMBER || l.ID_MEMBER,
          NAMA_ITEM: items.find((i) => i.ID_ITEM === l.ID_ITEM)?.NAMA_ITEM || l.ID_ITEM,
        }));
        return enriched as unknown as T;
      }
      case 'transactions': {
        const txs = this.getLocal<Transaksi[]>(STORAGE_KEYS.LOCAL_TRANSACTIONS, []);
        const items = this.getLocal<MasterItem[]>(STORAGE_KEYS.LOCAL_ITEMS, []);
        const enriched = txs.map((t) => ({
          ...t,
          NAMA_ITEM: items.find((i) => i.ID_ITEM === t.ID_ITEM)?.NAMA_ITEM || t.ID_ITEM,
        }));
        // Sort descending by timestamp/tanggal
        enriched.sort((a, b) => b.TIMESTAMP.localeCompare(a.TIMESTAMP));
        return enriched as unknown as T;
      }
      case 'stock': {
        return this.calculateStock() as unknown as T;
      }
      case 'bincard': {
        const itemId = params.itemId;
        return this.deriveBinCard(itemId) as unknown as T;
      }
      case 'memberhistory': {
        const memberId = params.memberId;
        return this.deriveMemberHistory(memberId) as unknown as T;
      }
      case 'pickupeligibility': {
        const memberId = params.memberId;
        const itemId = params.itemId;
        const qty = Number(params.qty || 1);
        return this.checkEligibility(memberId, itemId, qty) as unknown as T;
      }
      case 'requests': {
        const reqs = this.getLocal<PengajuanPengambilan[]>(STORAGE_KEYS.LOCAL_REQUESTS, []);
        reqs.sort((a, b) => b.CREATED_AT.localeCompare(a.CREATED_AT));
        return reqs as unknown as T;
      }
      case 'machines': {
        const machines = this.getLocal<MasterMesin[]>(STORAGE_KEYS.LOCAL_MACHINES, []);
        return machines as unknown as T;
      }
      case 'machine_usages': {
        const usages = this.getLocal<PemakaianMesin[]>(STORAGE_KEYS.LOCAL_USAGES, []);
        usages.sort((a, b) => b.CREATED_AT.localeCompare(a.CREATED_AT));
        return usages as unknown as T;
      }
      default:
        throw new Error(`Aksi GET tidak dikenali: ${action}`);
    }
  }

  private async handleLocalPost<T>(action: string, payload: any): Promise<T> {
    await new Promise((r) => setTimeout(r, 120));

    switch (action) {
      case 'transaction': {
        const { type, itemId, jumlah, memberId, keterangan, tanggal, noDokumen } = payload;
        if (!itemId || !jumlah || jumlah <= 0) {
          throw new Error('Data transaksi tidak lengkap atau jumlah tidak valid.');
        }

        const items = this.getLocal<MasterItem[]>(STORAGE_KEYS.LOCAL_ITEMS, []);
        const item = items.find((i) => i.ID_ITEM === itemId);
        if (!item) {
          throw new Error(`Barang dengan ID ${itemId} tidak ditemukan.`);
        }

        const members = this.getLocal<MasterMember[]>(STORAGE_KEYS.LOCAL_MEMBERS, []);
        let memberName = '';
        if (memberId) {
          const member = members.find((m) => m.ID_MEMBER === memberId);
          if (member) memberName = member.NAMA_MEMBER;
        }

        // Validate stock if reducing
        if (type === 'BARANG_KELUAR' || type === 'PINJAM') {
          const stocks = this.calculateStock();
          const currentStock = stocks.find((s) => s.idItem === itemId)?.stok || 0;
          if (currentStock < jumlah) {
            throw new Error(`Stok tidak mencukupi! Sisa stok: ${currentStock} ${item.SATUAN}, diminta: ${jumlah} ${item.SATUAN}`);
          }
        }

        const txs = this.getLocal<Transaksi[]>(STORAGE_KEYS.LOCAL_TRANSACTIONS, []);
        const now = new Date();
        const dateStr = tanggal || now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 8);
        const timestamp = `${dateStr} ${timeStr}`;

        // Generate Document number and ID
        const prefixMap: Record<string, string> = {
          BARANG_MASUK: 'BM',
          BARANG_KELUAR: 'BK',
          PINJAM: 'PM',
          KEMBALI: 'KB',
          SALDO_AWAL: 'SA',
          PENYESUAIAN: 'PN',
          OPNAME: 'OP',
        };
        const pfx = prefixMap[type] || 'TR';
        const ym = dateStr.replace(/-/g, '').slice(0, 6);
        const seq = String(txs.length + 1).padStart(4, '0');
        const generatedDoc = noDokumen?.trim() || `${pfx}-${ym}-${seq}`;
        const newId = `TRX-${ym}-${seq}`;

        const newTx: Transaksi = {
          ID_TRANSAKSI: newId,
          TIMESTAMP: timestamp,
          TANGGAL: dateStr,
          ID_ITEM: itemId,
          JENIS_TRANSAKSI: type,
          NO_DOKUMEN: generatedDoc,
          JUMLAH: Number(jumlah),
          ID_MEMBER: memberId || undefined,
          NAMA_MEMBER: memberName || undefined,
          KETERANGAN: keterangan || '-',
          CREATED_AT: timestamp,
        };

        txs.push(newTx);
        this.saveLocal(STORAGE_KEYS.LOCAL_TRANSACTIONS, txs);
        return { success: true, transaction: newTx } as unknown as T;
      }

      case 'request': {
        const { memberId, itemId, jumlah, alasan } = payload;
        if (!memberId || !itemId || !jumlah || !alasan?.trim()) {
          throw new Error('Alasan wajib diisi untuk pengajuan pengambilan lebih awal.');
        }

        const members = this.getLocal<MasterMember[]>(STORAGE_KEYS.LOCAL_MEMBERS, []);
        const member = members.find((m) => m.ID_MEMBER === memberId);
        if (!member) throw new Error('Member tidak ditemukan.');

        const items = this.getLocal<MasterItem[]>(STORAGE_KEYS.LOCAL_ITEMS, []);
        const item = items.find((i) => i.ID_ITEM === itemId);
        if (!item) throw new Error('Barang tidak ditemukan.');

        const reqs = this.getLocal<PengajuanPengambilan[]>(STORAGE_KEYS.LOCAL_REQUESTS, []);
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 8);
        const timestamp = `${dateStr} ${timeStr}`;
        const ym = dateStr.replace(/-/g, '').slice(0, 6);
        const seq = String(reqs.length + 1).padStart(4, '0');

        const newReq: PengajuanPengambilan = {
          ID_PENGAJUAN: `REQ-${ym}-${seq}`,
          ID_MEMBER: memberId,
          NAMA_MEMBER: member.NAMA_MEMBER,
          ID_ITEM: itemId,
          NAMA_ITEM: item.NAMA_ITEM,
          JUMLAH: Number(jumlah),
          ALASAN: alasan.trim(),
          STATUS: 'MENUNGGU',
          CREATED_AT: timestamp,
          UPDATED_AT: timestamp,
        };

        reqs.push(newReq);
        this.saveLocal(STORAGE_KEYS.LOCAL_REQUESTS, reqs);
        return { success: true, request: newReq } as unknown as T;
      }

      case 'approve_request': {
        const { requestId, approver, catatan } = payload;
        const reqs = this.getLocal<PengajuanPengambilan[]>(STORAGE_KEYS.LOCAL_REQUESTS, []);
        const req = reqs.find((r) => r.ID_PENGAJUAN === requestId);
        if (!req) throw new Error('Pengajuan tidak ditemukan.');
        if (req.STATUS !== 'MENUNGGU') {
          throw new Error(`Pengajuan ini sudah berstatus ${req.STATUS}.`);
        }

        const now = new Date();
        const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;

        // Per Blueprint Section 15: "Jika approve: BARANG_KELUAR -> DISETUJUI"
        // Generate BARANG_KELUAR transaction
        await this.handleLocalPost('transaction', {
          type: 'BARANG_KELUAR',
          itemId: req.ID_ITEM,
          jumlah: req.JUMLAH,
          memberId: req.ID_MEMBER,
          keterangan: `Disetujui dari pengajuan ${req.ID_PENGAJUAN}: ${req.ALASAN}`,
          tanggal: now.toISOString().slice(0, 10),
        });

        req.STATUS = 'DISETUJUI';
        req.APPROVER = approver || 'Admin Gudang';
        req.CATATAN = catatan || 'Pengajuan disetujui';
        req.UPDATED_AT = timestamp;

        this.saveLocal(STORAGE_KEYS.LOCAL_REQUESTS, reqs);
        return { success: true, request: req } as unknown as T;
      }

      case 'reject_request': {
        const { requestId, approver, catatan } = payload;
        const reqs = this.getLocal<PengajuanPengambilan[]>(STORAGE_KEYS.LOCAL_REQUESTS, []);
        const req = reqs.find((r) => r.ID_PENGAJUAN === requestId);
        if (!req) throw new Error('Pengajuan tidak ditemukan.');
        if (req.STATUS !== 'MENUNGGU') {
          throw new Error(`Pengajuan ini sudah berstatus ${req.STATUS}.`);
        }

        const now = new Date();
        const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;
        req.STATUS = 'DITOLAK';
        req.APPROVER = approver || 'Admin Gudang';
        req.CATATAN = catatan || 'Ditolak oleh Admin';
        req.UPDATED_AT = timestamp;

        this.saveLocal(STORAGE_KEYS.LOCAL_REQUESTS, reqs);
        return { success: true, request: req } as unknown as T;
      }

      case 'create_item': {
        const items = this.getLocal<MasterItem[]>(STORAGE_KEYS.LOCAL_ITEMS, []);
        const nextId = `ITM-${String(items.length + 1).padStart(4, '0')}`;
        const now = new Date();
        const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;
        
        const newItem: MasterItem = {
          ID_ITEM: nextId,
          NAMA_ITEM: payload.namaItem,
          KATEGORI: payload.kategori,
          SATUAN: payload.satuan,
          MASA_PAKAI_BULAN: Number(payload.masaPakaiBulan || 1),
          STOK_AWAL: Number(payload.stokAwal || 0),
          MIN_STOK: Number(payload.minStok || 0),
          LOKASI: payload.lokasi || '-',
          STATUS: payload.status || 'AKTIF',
          CREATED_AT: timestamp,
          UPDATED_AT: timestamp,
        };

        items.push(newItem);
        this.saveLocal(STORAGE_KEYS.LOCAL_ITEMS, items);

        // If stokAwal > 0, create SALDO_AWAL transaction
        if (newItem.STOK_AWAL > 0) {
          await this.handleLocalPost('transaction', {
            type: 'SALDO_AWAL',
            itemId: newItem.ID_ITEM,
            jumlah: newItem.STOK_AWAL,
            keterangan: 'Saldo Awal Pembentukan Item Baru',
            tanggal: now.toISOString().slice(0, 10),
          });
        }

        return { success: true, item: newItem } as unknown as T;
      }

      case 'update_item': {
        const items = this.getLocal<MasterItem[]>(STORAGE_KEYS.LOCAL_ITEMS, []);
        const idx = items.findIndex((i) => i.ID_ITEM === payload.idItem);
        if (idx === -1) throw new Error('Item tidak ditemukan');

        const now = new Date();
        items[idx] = {
          ...items[idx],
          NAMA_ITEM: payload.namaItem ?? items[idx].NAMA_ITEM,
          KATEGORI: payload.kategori ?? items[idx].KATEGORI,
          SATUAN: payload.satuan ?? items[idx].SATUAN,
          MASA_PAKAI_BULAN: Number(payload.masaPakaiBulan ?? items[idx].MASA_PAKAI_BULAN),
          MIN_STOK: Number(payload.minStok ?? items[idx].MIN_STOK),
          LOKASI: payload.lokasi ?? items[idx].LOKASI,
          STATUS: payload.status ?? items[idx].STATUS,
          UPDATED_AT: `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`,
        };
        this.saveLocal(STORAGE_KEYS.LOCAL_ITEMS, items);
        return { success: true, item: items[idx] } as unknown as T;
      }

      case 'create_member': {
        const members = this.getLocal<MasterMember[]>(STORAGE_KEYS.LOCAL_MEMBERS, []);
        const nextId = `MBR${String(members.length + 1).padStart(6, '0')}`;
        const now = new Date();
        const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;

        const newMember: MasterMember = {
          ID_MEMBER: nextId,
          NAMA_MEMBER: payload.namaMember,
          JENIS_MEMBER: payload.jenisMember,
          NO_HP: payload.noHp || '-',
          STATUS: payload.status || 'AKTIF',
          TANGGAL_MULAI: payload.tanggalMulai || now.toISOString().slice(0, 10),
          CREATED_AT: timestamp,
          UPDATED_AT: timestamp,
        };

        members.push(newMember);
        this.saveLocal(STORAGE_KEYS.LOCAL_MEMBERS, members);
        return { success: true, member: newMember } as unknown as T;
      }

      case 'update_member': {
        const members = this.getLocal<MasterMember[]>(STORAGE_KEYS.LOCAL_MEMBERS, []);
        const idx = members.findIndex((m) => m.ID_MEMBER === payload.idMember);
        if (idx === -1) throw new Error('Member tidak ditemukan');

        const now = new Date();
        members[idx] = {
          ...members[idx],
          NAMA_MEMBER: payload.namaMember ?? members[idx].NAMA_MEMBER,
          JENIS_MEMBER: payload.jenisMember ?? members[idx].JENIS_MEMBER,
          NO_HP: payload.noHp ?? members[idx].NO_HP,
          STATUS: payload.status ?? members[idx].STATUS,
          TANGGAL_MULAI: payload.tanggalMulai ?? members[idx].TANGGAL_MULAI,
          UPDATED_AT: `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`,
        };
        this.saveLocal(STORAGE_KEYS.LOCAL_MEMBERS, members);
        return { success: true, member: members[idx] } as unknown as T;
      }

      case 'create_limit': {
        const limits = this.getLocal<MemberLimit[]>(STORAGE_KEYS.LOCAL_LIMITS, []);
        const nextId = `LMT-${String(limits.length + 1).padStart(4, '0')}`;
        const now = new Date();
        const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;

        const newLimit: MemberLimit = {
          ID_LIMIT: nextId,
          ID_MEMBER: payload.idMember,
          ID_ITEM: payload.idItem,
          MAX_QTY: Number(payload.maxQty),
          SATUAN: payload.satuan || 'PCS',
          STATUS: payload.status || 'AKTIF',
          CREATED_AT: timestamp,
          UPDATED_AT: timestamp,
        };

        limits.push(newLimit);
        this.saveLocal(STORAGE_KEYS.LOCAL_LIMITS, limits);
        return { success: true, limit: newLimit } as unknown as T;
      }

      case 'create_machine': {
        const machines = this.getLocal<MasterMesin[]>(STORAGE_KEYS.LOCAL_MACHINES, []);
        const nextId = `MSN-${String(machines.length + 1).padStart(3, '0')}`;
        const now = new Date();
        const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;

        const newMachine: MasterMesin = {
          ID_MESIN: nextId,
          NAMA_MESIN: payload.namaMesin,
          KATEGORI: payload.kategori,
          MERK: payload.merk,
          MODEL: payload.model,
          NO_SERI: payload.noSeri,
          LOKASI: payload.lokasi || '-',
          KONDISI: payload.kondisi || 'BAIK',
          STATUS: payload.status || 'TERSEDIA',
          TANGGAL_MASUK: payload.tanggalMasuk || now.toISOString().slice(0, 10),
          CREATED_AT: timestamp,
          UPDATED_AT: timestamp,
        };

        machines.push(newMachine);
        this.saveLocal(STORAGE_KEYS.LOCAL_MACHINES, machines);
        return { success: true, machine: newMachine } as unknown as T;
      }

      case 'create_machine_usage': {
        const usages = this.getLocal<PemakaianMesin[]>(STORAGE_KEYS.LOCAL_USAGES, []);
        const machines = this.getLocal<MasterMesin[]>(STORAGE_KEYS.LOCAL_MACHINES, []);
        const members = this.getLocal<MasterMember[]>(STORAGE_KEYS.LOCAL_MEMBERS, []);
        const nextId = `PMK-${String(usages.length + 1).padStart(4, '0')}`;
        const now = new Date();
        const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;

        const machine = machines.find((m) => m.ID_MESIN === payload.idMesin);
        const member = members.find((m) => m.ID_MEMBER === payload.idMember);

        const newUsage: PemakaianMesin = {
          ID_PEMAKAIAN: nextId,
          ID_MESIN: payload.idMesin,
          ID_MEMBER: payload.idMember,
          NAMA_MESIN: machine?.NAMA_MESIN || payload.idMesin,
          NAMA_MEMBER: member?.NAMA_MEMBER || payload.idMember,
          TANGGAL: payload.tanggal || now.toISOString().slice(0, 10),
          JAM_MULAI: payload.jamMulai || '08:00',
          JAM_SELESAI: payload.jamSelesai || '12:00',
          DURASI: payload.durasi || '4 Jam',
          TUJUAN_PEMAKAIAN: payload.tujuanPemakaian || '-',
          LOKASI_PEMAKAIAN: payload.lokasiPemakaian || '-',
          KONDISI_SEBELUM: payload.kondisiSebelum || 'Baik',
          KONDISI_SESUDAH: payload.kondisiSesudah || 'Baik',
          KETERANGAN: payload.keterangan || '-',
          STATUS: 'SELESAI',
          CREATED_AT: timestamp,
          UPDATED_AT: timestamp,
        };

        usages.push(newUsage);
        this.saveLocal(STORAGE_KEYS.LOCAL_USAGES, usages);
        return { success: true, usage: newUsage } as unknown as T;
      }

      default:
        throw new Error(`Aksi POST tidak dikenali: ${action}`);
    }
  }

  // --- CALCULATION LOGIC ACCORDING TO BLUEPRINT ---

  /**
   * Section 10: ATURAN STOK
   * SALDO_AWAL    -> +
   * BARANG_MASUK  -> +
   * BARANG_KELUAR -> -
   * PINJAM        -> -
   * KEMBALI       -> +
   * PENYESUAIAN   -> + / -
   * OPNAME        -> mengikuti backend
   */
  public calculateStock(): ItemStock[] {
    const items = this.getLocal<MasterItem[]>(STORAGE_KEYS.LOCAL_ITEMS, []);
    const txs = this.getLocal<Transaksi[]>(STORAGE_KEYS.LOCAL_TRANSACTIONS, []);

    return items.map((item) => {
      const itemTxs = txs.filter((t) => t.ID_ITEM === item.ID_ITEM);
      let balance = 0;

      for (const tx of itemTxs) {
        const qty = Number(tx.JUMLAH) || 0;
        switch (tx.JENIS_TRANSAKSI) {
          case 'SALDO_AWAL':
          case 'BARANG_MASUK':
          case 'KEMBALI':
            balance += qty;
            break;
          case 'BARANG_KELUAR':
          case 'PINJAM':
            balance -= qty;
            break;
          case 'PENYESUAIAN':
            balance += qty; // Penyesuaian can be signed
            break;
          case 'OPNAME':
            balance = qty;
            break;
        }
      }

      return {
        idItem: item.ID_ITEM,
        namaItem: item.NAMA_ITEM,
        kategori: item.KATEGORI,
        satuan: item.SATUAN,
        stok: balance,
        minStok: item.MIN_STOK,
        lokasi: item.LOKASI,
        status: item.STATUS,
        isLowStock: balance <= item.MIN_STOK,
      };
    });
  }

  /**
   * Section 18: BIN CARD / KARTU STOK
   * Derived view: Filter ID_ITEM -> Sort tanggal + timestamp -> Running balance
   */
  public deriveBinCard(itemId?: string): BinCardEntry[] {
    if (!itemId) return [];
    const txs = this.getLocal<Transaksi[]>(STORAGE_KEYS.LOCAL_TRANSACTIONS, []);
    const itemTxs = txs.filter((t) => t.ID_ITEM === itemId);

    // Sort ascending by TIMESTAMP to compute running balance
    itemTxs.sort((a, b) => a.TIMESTAMP.localeCompare(b.TIMESTAMP));

    let running = 0;
    const entries: BinCardEntry[] = [];

    for (const t of itemTxs) {
      let masuk = 0;
      let keluar = 0;
      const qty = Number(t.JUMLAH) || 0;

      switch (t.JENIS_TRANSAKSI) {
        case 'SALDO_AWAL':
        case 'BARANG_MASUK':
        case 'KEMBALI':
          masuk = qty;
          running += qty;
          break;
        case 'BARANG_KELUAR':
        case 'PINJAM':
          keluar = qty;
          running -= qty;
          break;
        case 'PENYESUAIAN':
          if (qty >= 0) {
            masuk = qty;
            running += qty;
          } else {
            keluar = Math.abs(qty);
            running -= Math.abs(qty);
          }
          break;
        case 'OPNAME':
          running = qty;
          break;
      }

      entries.push({
        idTransaksi: t.ID_TRANSAKSI,
        tanggal: t.TANGGAL,
        timestamp: t.TIMESTAMP,
        noDokumen: t.NO_DOKUMEN,
        jenisTransaksi: t.JENIS_TRANSAKSI,
        keterangan: t.KETERANGAN,
        masuk,
        keluar,
        saldo: running,
        memberId: t.ID_MEMBER,
        namaMember: t.NAMA_MEMBER,
      });
    }

    // Return in reverse order (newest first) for UI presentation
    return entries.reverse();
  }

  /**
   * Section 19: RIWAYAT MEMBER
   */
  public deriveMemberHistory(memberId?: string): MemberHistorySummary | null {
    if (!memberId) return null;
    const members = this.getLocal<MasterMember[]>(STORAGE_KEYS.LOCAL_MEMBERS, []);
    const member = members.find((m) => m.ID_MEMBER === memberId);
    if (!member) return null;

    const txs = this.getLocal<Transaksi[]>(STORAGE_KEYS.LOCAL_TRANSACTIONS, []);
    const items = this.getLocal<MasterItem[]>(STORAGE_KEYS.LOCAL_ITEMS, []);
    const memberTxs = txs.filter((t) => t.ID_MEMBER === memberId);

    // Filter only transactions that represent member consumption/borrowing
    memberTxs.sort((a, b) => b.TIMESTAMP.localeCompare(a.TIMESTAMP));

    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-09"
    let totalQty = 0;
    let currentMonthQty = 0;

    const itemMap = new Map<string, { qty: number; count: number; lastDate: string }>();

    for (const t of memberTxs) {
      const q = Number(t.JUMLAH) || 0;
      totalQty += q;
      if (t.TANGGAL.startsWith(currentMonthPrefix)) {
        currentMonthQty += q;
      }

      const existing = itemMap.get(t.ID_ITEM) || { qty: 0, count: 0, lastDate: t.TANGGAL };
      existing.qty += q;
      existing.count += 1;
      if (t.TANGGAL > existing.lastDate) {
        existing.lastDate = t.TANGGAL;
      }
      itemMap.set(t.ID_ITEM, existing);
    }

    const itemsSummary: MemberHistorySummary['items'] = [];
    itemMap.forEach((val, idItem) => {
      const item = items.find((i) => i.ID_ITEM === idItem);
      itemsSummary.push({
        idItem,
        namaItem: item?.NAMA_ITEM || idItem,
        satuan: item?.SATUAN || 'UNIT',
        totalQty: val.qty,
        count: val.count,
        lastDate: val.lastDate,
      });
    });

    return {
      member,
      totalTransaksi: memberTxs.length,
      totalQty,
      currentMonthQty,
      items: itemsSummary,
      transactions: memberTxs,
    };
  }

  /**
   * Section 8 & 16: PICKUP ELIGIBILITY
   * - MASA_PAKAI_BULAN = 1: fokus pada MAX_QTY / member limit. Tidak menghitung due date.
   * - MASA_PAKAI_BULAN >= 3: Tanggal Berikutnya = Tanggal Pengambilan Terakhir + MASA_PAKAI_BULAN bulan.
   *   Early Request -> alasan wajib -> pengajuan approval Admin.
   */
  public checkEligibility(memberId: string, itemId: string, requestedQty: number = 1): PickupEligibilityResult {
    const members = this.getLocal<MasterMember[]>(STORAGE_KEYS.LOCAL_MEMBERS, []);
    const member = members.find((m) => m.ID_MEMBER === memberId);
    if (!member) {
      return { eligible: false, requiresEarlyApproval: false, reason: 'Member tidak ditemukan.' };
    }
    if (member.STATUS !== 'AKTIF') {
      return { eligible: false, requiresEarlyApproval: false, reason: `Member ${member.NAMA_MEMBER} berstatus NONAKTIF.` };
    }

    const items = this.getLocal<MasterItem[]>(STORAGE_KEYS.LOCAL_ITEMS, []);
    const item = items.find((i) => i.ID_ITEM === itemId);
    if (!item) {
      return { eligible: false, requiresEarlyApproval: false, reason: 'Barang tidak ditemukan.' };
    }
    if (item.STATUS !== 'AKTIF') {
      return { eligible: false, requiresEarlyApproval: false, reason: `Barang ${item.NAMA_ITEM} berstatus NONAKTIF.` };
    }

    // Check Limit Rule
    const limits = this.getLocal<MemberLimit[]>(STORAGE_KEYS.LOCAL_LIMITS, []);
    const limit = limits.find((l) => l.ID_MEMBER === memberId && l.ID_ITEM === itemId && l.STATUS === 'AKTIF');

    const txs = this.getLocal<Transaksi[]>(STORAGE_KEYS.LOCAL_TRANSACTIONS, []);
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);

    const thisMonthTaken = txs
      .filter((t) => t.ID_MEMBER === memberId && t.ID_ITEM === itemId && t.JENIS_TRANSAKSI === 'BARANG_KELUAR' && t.TANGGAL.startsWith(currentMonthPrefix))
      .reduce((sum, t) => sum + (Number(t.JUMLAH) || 0), 0);

    let limitRule: PickupEligibilityResult['limitRule'] = undefined;
    if (limit) {
      const remaining = Math.max(0, limit.MAX_QTY - thisMonthTaken);
      limitRule = {
        maxQty: limit.MAX_QTY,
        usedThisMonth: thisMonthTaken,
        remaining,
      };

      if (thisMonthTaken + requestedQty > limit.MAX_QTY) {
        return {
          eligible: false,
          requiresEarlyApproval: true,
          reason: `Melebihi limit bulanan member (${thisMonthTaken}/${limit.MAX_QTY} ${limit.SATUAN} sudah terpakai). Sisa kuota: ${remaining} ${limit.SATUAN}.`,
          limitRule,
        };
      }
    }

    // Check Masa Pakai Rule
    const masaPakai = item.MASA_PAKAI_BULAN;

    if (masaPakai >= 3) {
      // Find latest pickup
      const pastPickups = txs
        .filter((t) => t.ID_MEMBER === memberId && t.ID_ITEM === itemId && t.JENIS_TRANSAKSI === 'BARANG_KELUAR')
        .sort((a, b) => b.TANGGAL.localeCompare(a.TANGGAL));

      if (pastPickups.length > 0) {
        const lastDate = pastPickups[0].TANGGAL;
        // Calculate next eligible date: add masaPakai months
        const [year, month, day] = lastDate.split('-').map(Number);
        const d = new Date(year, month - 1 + masaPakai, day);
        const nextEligibleStr = d.toISOString().slice(0, 10);
        const todayStr = new Date().toISOString().slice(0, 10);

        const isEarly = todayStr < nextEligibleStr;
        const daysRemaining = isEarly ? Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

        const usageRule = {
          masaPakaiBulan: masaPakai,
          lastPickupDate: lastDate,
          nextEligibleDate: nextEligibleStr,
          daysRemaining,
          isEarly,
        };

        if (isEarly) {
          return {
            eligible: false,
            requiresEarlyApproval: true,
            reason: `Barang masih dalam masa pakai (${masaPakai} bulan). Pengambilan terakhir: ${lastDate}. Jadwal berikutnya: ${nextEligibleStr} (${daysRemaining} hari lagi). Diperlukan pengajuan pengambilan awal dengan alasan wajib.`,
            limitRule,
            usageRule,
          };
        }

        return {
          eligible: true,
          requiresEarlyApproval: false,
          limitRule,
          usageRule,
        };
      }
    }

    return {
      eligible: true,
      requiresEarlyApproval: false,
      limitRule,
    };
  }

  // --- Public CRUD methods ---

  public async getItems(): Promise<MasterItem[]> {
    return this.getFromGas<MasterItem[]>('items');
  }

  public async getMembers(): Promise<MasterMember[]> {
    return this.getFromGas<MasterMember[]>('members');
  }

  public async getLimits(): Promise<MemberLimit[]> {
    return this.getFromGas<MemberLimit[]>('limits');
  }

  public async getTransactions(): Promise<Transaksi[]> {
    return this.getFromGas<Transaksi[]>('transactions');
  }

  public async getStock(): Promise<ItemStock[]> {
    return this.getFromGas<ItemStock[]>('stock');
  }

  public async getBinCard(itemId: string): Promise<BinCardEntry[]> {
    return this.getFromGas<BinCardEntry[]>('bincard', { itemId });
  }

  public async getMemberHistory(memberId: string): Promise<MemberHistorySummary> {
    return this.getFromGas<MemberHistorySummary>('memberhistory', { memberId });
  }

  public async getPickupEligibility(memberId: string, itemId: string, qty: number): Promise<PickupEligibilityResult> {
    return this.getFromGas<PickupEligibilityResult>('pickupeligibility', { memberId, itemId, qty: String(qty) });
  }

  public async getRequests(): Promise<PengajuanPengambilan[]> {
    return this.getFromGas<PengajuanPengambilan[]>('requests');
  }

  public async getMachines(): Promise<MasterMesin[]> {
    return this.getFromGas<MasterMesin[]>('machines');
  }

  public async getMachineUsages(): Promise<PemakaianMesin[]> {
    return this.getFromGas<PemakaianMesin[]>('machine_usages');
  }

  // Mutations
  public async submitTransaction(payload: {
    type: string;
    itemId: string;
    jumlah: number;
    memberId?: string;
    keterangan?: string;
    tanggal?: string;
    noDokumen?: string;
  }): Promise<{ success: boolean; transaction: Transaksi }> {
    return this.postToGas('transaction', payload);
  }

  public async submitRequest(payload: {
    memberId: string;
    itemId: string;
    jumlah: number;
    alasan: string;
  }): Promise<{ success: boolean; request: PengajuanPengambilan }> {
    return this.postToGas('request', payload);
  }

  public async approveRequest(payload: {
    requestId: string;
    approver?: string;
    catatan?: string;
  }): Promise<{ success: boolean; request: PengajuanPengambilan }> {
    return this.postToGas('approve_request', payload);
  }

  public async rejectRequest(payload: {
    requestId: string;
    approver?: string;
    catatan?: string;
  }): Promise<{ success: boolean; request: PengajuanPengambilan }> {
    return this.postToGas('reject_request', payload);
  }

  public async createItem(payload: {
    namaItem: string;
    kategori: string;
    satuan: string;
    masaPakaiBulan?: number;
    stokAwal?: number;
    minStok?: number;
    lokasi?: string;
    status?: string;
  }): Promise<any> {
    return this.postToGas('create_item', payload);
  }

  public async updateItem(payload: { idItem: string } & Partial<MasterItem>): Promise<any> {
    return this.postToGas('update_item', payload);
  }

  public async createMember(payload: { namaMember: string; jenisMember: string; noHp?: string; status?: string }): Promise<any> {
    return this.postToGas('create_member', payload);
  }

  public async updateMember(payload: { idMember: string } & Partial<MasterMember>): Promise<any> {
    return this.postToGas('update_member', payload);
  }

  public async createLimit(payload: { idMember: string; idItem: string; maxQty: number; satuan: string }): Promise<any> {
    return this.postToGas('create_limit', payload);
  }

  public async createMachine(payload: {
    namaMesin: string;
    kategori?: string;
    merk: string;
    model?: string;
    noSeri?: string;
    lokasi?: string;
    kondisi?: string;
    status?: string;
    tanggalMasuk?: string;
  }): Promise<any> {
    return this.postToGas('create_machine', payload);
  }

  public async createMachineUsage(payload: {
    idMesin: string;
    idMember: string;
    tanggal?: string;
    jamMulai?: string;
    jamSelesai?: string;
    durasi?: string;
    tujuanPemakaian?: string;
    lokasiPemakaian?: string;
    kondisiSebelum?: string;
    kondisiSesudah?: string;
    keterangan?: string;
  }): Promise<any> {
    return this.postToGas('create_machine_usage', payload);
  }

  // Debug methods
  public async getDebugTransactions(): Promise<Transaksi[]> {
    return this.getFromGas<Transaksi[]>('debug_transactions');
  }

  // Helpers
  private getLocal<T>(key: string, defaultVal: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private saveLocal(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Storage write error:', e);
    }
  }
}

export const api = new ApiService();
