export type KategoriItem = 'MESIN' | 'CHEMICAL' | 'PERALATAN' | 'SERAGAM';

export type JenisMember = 'SM' | 'SPV' | 'TL' | 'CREW' | 'VENDOR';

export type StatusMember = 'AKTIF' | 'NONAKTIF';

export type StatusItem = 'AKTIF' | 'NONAKTIF';

export type JenisTransaksi =
  | 'SALDO_AWAL'
  | 'BARANG_MASUK'
  | 'BARANG_KELUAR'
  | 'PINJAM'
  | 'KEMBALI'
  | 'PENYESUAIAN'
  | 'OPNAME';

export type StatusPengajuan =
  | 'MENUNGGU'
  | 'DISETUJUI'
  | 'DITOLAK'
  | 'DIBATALKAN';

export type StatusMesin =
  | 'TERSEDIA'
  | 'SEDANG_DIGUNAKAN'
  | 'MAINTENANCE'
  | 'RUSAK'
  | 'TIDAK_AKTIF';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface MasterItem {
  ID_ITEM: string;
  NAMA_ITEM: string;
  KATEGORI: KategoriItem;
  SATUAN: string;
  MASA_PAKAI_BULAN: number;
  STOK_AWAL: number;
  MIN_STOK: number;
  LOKASI: string;
  STATUS: StatusItem;
  CREATED_AT: string;
  UPDATED_AT: string;
}

export interface MasterMember {
  ID_MEMBER: string;
  NAMA_MEMBER: string;
  JENIS_MEMBER: JenisMember;
  NO_HP: string;
  STATUS: StatusMember;
  TANGGAL_MULAI: string;
  CREATED_AT: string;
  UPDATED_AT: string;
}

export interface MemberLimit {
  ID_LIMIT: string;
  ID_MEMBER: string;
  ID_ITEM: string;
  MAX_QTY: number;
  SATUAN: string;
  STATUS: 'AKTIF' | 'NONAKTIF';
  CREATED_AT: string;
  UPDATED_AT: string;
  // Optional enriched display properties
  NAMA_MEMBER?: string;
  NAMA_ITEM?: string;
}

export interface Transaksi {
  ID_TRANSAKSI: string;
  TIMESTAMP: string;
  TANGGAL: string;
  ID_ITEM: string;
  NAMA_ITEM?: string;
  JENIS_TRANSAKSI: JenisTransaksi;
  NO_DOKUMEN: string;
  JUMLAH: number;
  ID_MEMBER?: string;
  NAMA_MEMBER?: string;
  KETERANGAN: string;
  CREATED_AT: string;
}

export interface PengajuanPengambilan {
  ID_PENGAJUAN: string;
  ID_MEMBER: string;
  NAMA_MEMBER: string;
  ID_ITEM: string;
  NAMA_ITEM: string;
  JUMLAH: number;
  ALASAN: string;
  STATUS: StatusPengajuan;
  APPROVER?: string;
  CATATAN?: string;
  CREATED_AT: string;
  UPDATED_AT: string;
}

export interface MasterMesin {
  ID_MESIN: string;
  NAMA_MESIN: string;
  KATEGORI: string;
  MERK: string;
  MODEL: string;
  NO_SERI: string;
  LOKASI: string;
  KONDISI: string;
  STATUS: StatusMesin;
  TANGGAL_MASUK: string;
  CREATED_AT: string;
  UPDATED_AT: string;
}

export interface PemakaianMesin {
  ID_PEMAKAIAN: string;
  ID_MESIN: string;
  ID_MEMBER: string;
  NAMA_MESIN?: string;
  NAMA_MEMBER?: string;
  TANGGAL: string;
  JAM_MULAI: string;
  JAM_SELESAI: string;
  DURASI: string;
  TUJUAN_PEMAKAIAN: string;
  LOKASI_PEMAKAIAN: string;
  KONDISI_SEBELUM: string;
  KONDISI_SESUDAH: string;
  KETERANGAN: string;
  STATUS: string;
  CREATED_AT: string;
  UPDATED_AT: string;
}

export interface ItemStock {
  idItem: string;
  namaItem: string;
  kategori: KategoriItem;
  satuan: string;
  stok: number;
  minStok: number;
  lokasi: string;
  status: StatusItem;
  isLowStock: boolean;
}

export interface BinCardEntry {
  idTransaksi: string;
  tanggal: string;
  timestamp: string;
  noDokumen: string;
  jenisTransaksi: JenisTransaksi;
  keterangan: string;
  masuk: number;
  keluar: number;
  saldo: number;
  memberId?: string;
  namaMember?: string;
}

export interface MemberHistoryItem {
  idItem: string;
  namaItem: string;
  totalQty: number;
  satuan: string;
  lastDate: string;
  count: number;
}

export interface MemberHistorySummary {
  member: MasterMember;
  totalTransaksi: number;
  totalQty: number;
  items: MemberHistoryItem[];
  transactions: Transaksi[];
  currentMonthQty: number;
}

export interface PickupEligibilityResult {
  eligible: boolean;
  requiresEarlyApproval: boolean;
  reason?: string;
  limitRule?: {
    maxQty: number;
    usedThisMonth: number;
    remaining: number;
  };
  usageRule?: {
    masaPakaiBulan: number;
    lastPickupDate?: string;
    nextEligibleDate?: string;
    daysRemaining?: number;
    isEarly: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface SystemHealth {
  status: 'ONLINE' | 'OFFLINE' | 'UNCONFIGURED';
  spreadsheetId?: string;
  sheetsFound?: string[];
  latencyMs?: number;
  version?: string;
  lastChecked?: string;
  error?: string;
}
