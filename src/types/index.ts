export type KategoriItem = 'MESIN' | 'CHEMICAL' | 'PERALATAN' | 'SERAGAM';

export type JabatanMember = string;

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
  | 'DIPROSES'
  | 'SELESAI'
  | 'DIBATALKAN';

export type StatusMesin =
  | 'TERSEDIA'
  | 'SEDANG_DIGUNAKAN'
  | 'MAINTENANCE'
  | 'RUSAK'
  | 'TIDAK_AKTIF';

export type UserRole = 'ADMIN' | 'MEMBER';

// Master Data Models
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
  CREATED_AT?: string;
  UPDATED_AT?: string;
}

export interface MasterMember {
  ID_MEMBER: string;
  NAMA_MEMBER: string;
  JABATAN: JabatanMember;
  LANTAI?: string;
  NO_HP?: string;
  STATUS: StatusMember;
  TANGGAL_MULAI?: string;
  CREATED_AT?: string;
  UPDATED_AT?: string;
}

export interface MemberLimit {
  ID_LIMIT: string;
  ID_MEMBER: string;
  ID_ITEM: string;
  MAX_QTY: number;
  SATUAN: string;
  STATUS: 'AKTIF' | 'NONAKTIF';
  CREATED_AT?: string;
  UPDATED_AT?: string;
  NAMA_MEMBER?: string;
  NAMA_ITEM?: string;
}

// Transaction Model
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
  SATUAN?: string;
  KETERANGAN: string;
  CREATED_AT?: string;
}

// Stock Model
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

// Bin Card Models (from GAS action=bincard)
export interface BinCardEntry {
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

export interface BinCardResult {
  item: string;
  saldoAwal: number;
  saldoAkhir: number;
  count: number;
  rows: BinCardEntry[];
}

// Member History Model (from GAS action=memberhistory)
export interface MemberHistoryItem {
  idItem: string;
  namaItem: string;
  totalQty: number;
  satuan?: string;
  lastDate: string;
  count: number;
}

export interface MemberHistorySummary {
  member: MasterMember | { ID_MEMBER: string; NAMA_MEMBER: string; JABATAN?: string };
  totalTransaksi: number;
  totalQty: number;
  items: MemberHistoryItem[];
  transactions: Transaksi[];
  currentMonthQty: number;
}

// Pickup Eligibility (from GAS action=pickupeligibility)
export interface PickupEligibilityResult {
  allowed: boolean;
  early: boolean;
  reason?: string;
  masaPakaiBulan?: number;
  maxQty?: number;
  lastPickupDate?: string;
  dueDate?: string;
}

// Request Models
export interface PengajuanPengambilan {
  ID_PENGAJUAN: string;
  TANGGAL: string;
  ID_MEMBER: string;
  ID_ITEM: string;
  JUMLAH: number;
  TANGGAL_TERAKHIR_AMBIL?: string;
  TANGGAL_SEHARUSNYA?: string;
  ALASAN: string;
  STATUS: StatusPengajuan | string;
  ID_APPROVER?: string;
  CATATAN_APPROVER?: string;
  TIMESTAMP?: string;
}

export interface GasRequestsResponse {
  count: number;
  requests: PengajuanPengambilan[];
}

// Machine Models (Tahap Berikutnya)
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
  CREATED_AT?: string;
  UPDATED_AT?: string;
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
  CREATED_AT?: string;
  UPDATED_AT?: string;
}

// Health Model
export interface SystemHealth {
  status: 'ONLINE' | 'OFFLINE' | 'UNCONFIGURED';
  spreadsheetId?: string;
  sheetsFound?: string[];
  latencyMs?: number;
  version?: string;
  lastChecked?: string;
  error?: string;
}

// --- Frontend Payload Input Models ---

export interface TransactionInput {
  itemId: string;
  type: 'BARANG_MASUK' | 'BARANG_KELUAR' | 'PINJAM' | 'KEMBALI';
  jumlah: number;
  memberId?: string;
  keterangan?: string;
  tanggal?: string;
  noDokumen?: string;
}

export interface PickupRequestInput {
  memberId: string;
  itemId: string;
  jumlah: number;
  alasan: string;
}

export interface ApprovalInput {
  requestId: string;
  approverId?: string;
  note?: string;
}

export interface RejectionInput {
  requestId: string;
  approverId?: string;
  note?: string;
}

export interface TransactionResult {
  message?: string;
  NO_DOKUMEN?: string;
  transaction?: {
    NO_DOKUMEN?: string;
    [key: string]: unknown;
  };
  documentNo?: string;
  [key: string]: unknown;
}

export interface PickupRequestResult {
  message?: string;
  ID_PENGAJUAN?: string;
  request?: {
    ID_PENGAJUAN?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ActionResult {
  message?: string;
  [key: string]: unknown;
}

export interface CreateMemberLimitInput {
  memberId: string;
  itemId: string;
  maxQty: number;
  satuan?: string;
  status?: 'AKTIF' | 'NONAKTIF';
}

export interface UpdateMemberLimitInput {
  limitId: string;
  maxQty: number;
  satuan?: string;
  status?: 'AKTIF' | 'NONAKTIF';
}

export interface MemberLimitResult {
  message?: string;
  ID_LIMIT?: string;
  limit?: MemberLimit;
  [key: string]: unknown;
}

// --- GAS Backend Contract DTOs ---

export interface GasEnvelope<T> {
  success: boolean;
  action: string;
  data: T;
  error?: string | { message?: string; type?: string; [key: string]: unknown };
  message?: string;
}

export interface GasLimitPayload {
  action: 'limit';
  operation: 'create' | 'update' | 'deactivate' | 'activate';
  ID_LIMIT?: string;
  ID_MEMBER?: string;
  ID_ITEM?: string;
  MAX_QTY?: number;
  SATUAN?: string;
  STATUS?: 'AKTIF' | 'NONAKTIF';
}

export interface GasTransactionPayload {
  action: 'transaction';
  ID_ITEM: string;
  JENIS_TRANSAKSI: string;
  JUMLAH: number;
  ID_MEMBER: string;
  KETERANGAN: string;
  TANGGAL: string;
  NO_DOKUMEN: string;
}

export interface GasRequestPayload {
  action: 'request';
  ID_MEMBER: string;
  ID_ITEM: string;
  JUMLAH: number;
  ALASAN: string;
}

export interface GasApprovalPayload {
  action: 'approve_request';
  ID_PENGAJUAN: string;
  ID_APPROVER: string;
  CATATAN_APPROVER: string;
}

export interface GasRejectionPayload {
  action: 'reject_request';
  ID_PENGAJUAN: string;
  ID_APPROVER: string;
  CATATAN_APPROVER: string;
}

// --- GAS Response DTOs ---

export interface GasStockItem {
  ID_ITEM: string;
  NAMA_ITEM: string;
  KATEGORI: KategoriItem;
  SATUAN: string;
  STOK_SAAT_INI: number;
  MIN_STOK: number;
  LOKASI?: string;
  STATUS: StatusItem;
}

export interface GasStockResponse {
  stock: GasStockItem[];
}

export interface GasItemsResponse {
  items: MasterItem[];
}

export interface GasMembersResponse {
  members: MasterMember[];
}

export interface GasLimitsResponse {
  limits: MemberLimit[];
}

export interface GasTransactionsResponse {
  transactions: Transaksi[];
}

export interface GasBinCardRow {
  TANGGAL: string;
  TIMESTAMP?: string;
  NO_DOKUMEN: string;
  JENIS_TRANSAKSI: JenisTransaksi;
  KETERANGAN: string;
  MASUK: number;
  KELUAR: number;
  SALDO: number;
  ID_MEMBER?: string;
  NAMA_MEMBER?: string;
}

export interface GasBinCardResponse {
  item: string | MasterItem;
  saldoAwal: number;
  saldoAkhir: number;
  count: number;
  rows: GasBinCardRow[];
}

export interface GasMemberHistoryResponse {
  member: MasterMember | { ID_MEMBER: string; NAMA_MEMBER: string; JABATAN?: string };
  count: number;
  history: Transaksi[];
}

export interface GasPickupEligibilityResponse {
  allowed: boolean;
  early: boolean;
  reason?: string;
  masaPakaiBulan?: number;
  maxQty?: number;
  lastPickupDate?: string;
  dueDate?: string;
}

export interface GasHealthResponse {
  status?: string;
  spreadsheetId?: string;
  ssId?: string;
  sheets?: string[];
  sheetsFound?: string[];
  version?: string;
}
