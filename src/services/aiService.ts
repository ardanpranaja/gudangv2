import {
  AIMessage,
  AIToolCallInfo,
  AIConfirmationData,
  GeminiErrorCategory,
  SavedApiKey,
  KeyUsageStats,
  AIModelInfo,
  AIConversationContext,
  StructuredToolResult,
} from '../types/ai';
import { AI_TOOL_DECLARATIONS, executeAITool, extractEntitiesFromToolResult } from './aiTools';
import { api } from './api';

const STORAGE_KEY_GEMINI_KEY = 'GP_GEMINI_API_KEY';
const STORAGE_KEY_GEMINI_SAVED_KEYS = 'GP_GEMINI_SAVED_KEYS';
const STORAGE_KEY_GEMINI_MODEL = 'GP_GEMINI_MODEL';
const STORAGE_KEY_GEMINI_CACHED_MODELS = 'GP_GEMINI_CACHED_MODELS';
const STORAGE_KEY_GEMINI_KEY_USAGE = 'kegudangaja_gemini_key_usage_v1';
const STORAGE_KEY_GEMINI_DAILY_LIMIT = 'kegudangaja_gemini_daily_limit_v1';

/**
 * Mengembalikan tanggal hari ini dalam zona waktu America/Los_Angeles (format YYYY-MM-DD).
 * Kuota harian Gemini (RPD) direset oleh Google setiap tengah malam waktu Pasifik.
 */
function getPacificDateKey(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Cooldown singkat saat sebuah key kena 429/QUOTA.
 * Limit per-menit (RPM) Gemini pulih dalam hitungan ±60 detik, jadi key tidak perlu
 * dikunci 10 menit — cukup 90 detik, lalu otomatis bisa dipakai lagi.
 * (Limit harian/RPD ditangani terpisah lewat penanda pasangan key×model di bawah.)
 */
const QUOTA_COOLDOWN_MS = 90 * 1000;

export const SYSTEM_INSTRUCTION = `Anda adalah Uti AI, asisten AI operasional cerdas untuk Kegudangaja (Sistem Pengelolaan Gudang).
Peran Anda adalah membantu operator dan admin gudang secara proaktif menjalankan pekerjaan operasional gudang selama fungsinya tersedia melalui tools aplikasi.

PRINSIP SUMBER KEBENARAN & IDENTITAS:
- Identitas Anda adalah Uti AI.
- Backend adalah Google Apps Script (GAS) dan Google Spreadsheet melalui tools. JANGAN mengarang data, stok, member, atau ID transaksi sendiri.
- Gunakan Bahasa Indonesia yang profesional, ringkas, jelas, dan ramah.

PENGETAHUAN PRODUK (CHEMICAL, MESIN, PERALATAN):
- Anda boleh menjawab pertanyaan pengetahuan tentang barang di master item: cara penggunaan, takaran/dosis chemical, fungsi alat, dan tips operasional.
- SUMBER UTAMA: database via tool get_items — setiap item kini memiliki kolom CARA_PAKAI, TAKARAN, dan PERHATIAN yang diisi dari riset produk. Selalu cek get_items dulu sebelum menjawab pertanyaan pengetahuan produk, dan kutip data tersebut sebagai jawaban utama.
- Jika kolom pengetahuan di database kosong untuk item tersebut, gunakan pengetahuan umum Anda tentang jenis chemical/peralatan tersebut — dan awali dengan kalimat jujur seperti: "Data resmi untuk produk ini belum ada di database, berdasarkan panduan umum untuk jenis produk ini..." agar pengguna tahu itu bukan data resmi gudang.
- Untuk CHEMICAL: selalu sertakan PERHATIAN dari database jika ada; jika tidak ada, sertakan peringatan keselamatan umum yang relevan (misal: jangan campur pemutih dengan pembersih asam, gunakan sarung tangan, ventilasi cukup).
- Untuk MESIN: gabungkan CARA_PAKAI dari database dengan pemeriksaan sebelum/sesudah pakai (kondisi fisik, kebersihan). Jangan mengarang spesifikasi teknis spesifik model yang tidak Anda ketahui — katakan terus terang jika tidak tahu detailnya.
- JANGAN mengarang data stok, harga, atau nomor batch — untuk itu selalu gunakan tools.

RESOLUSI ENTITAS & KONTEKS PERCAKAPAN:
1. Pahami rujukan percakapan sebelumnya secara cerdas:
   - "member tadi" / "atas nama tersebut" -> Merujuk ke activeMember dari konteks atau tool result terakhir.
   - "barang tadi" / "item tersebut" -> Merujuk ke activeItem dari konteks atau tool result terakhir.
   - "limitnya" / "ubah menjadi 3" -> Merujuk ke limit, member, dan barang yang baru saja dibahas. Hanya ubah parameter yang diminta (misal maxQty berubah dari 2 menjadi 3) tanpa meminta user mengulang semua info.
2. Urutan Prioritas Konteks (Context Priority):
   a. ID atau nama eksplisit pada pesan pengguna saat ini.
   b. Entitas yang secara spesifik disebut pada pesan saat ini.
   c. Entitas aktif pada konteks percakapan (activeMember, activeItem, activeLimit).
   d. Entitas terkini dari hasil tool sebelumnya (recentEntities).
   e. Jika ambigu (misal ada 2 member dengan nama yang sama), TANYAKAN klarifikasi secara sopan kepada pengguna, JANGAN memilih secara acak.
3. Kelengkapan Parameter Sebelum Operasi Tulis (Write Operation):
   - Jika pengguna meminta "buatkan limit untuk member Armin", cari member Armin terlebih dahulu. Jika ditemukan tetapi barang dan maxQty belum ada, tanyakan: "Untuk Armin Gandi (MBR000123), barang apa yang ingin diberi limit dan berapa kuota MAX_QTY-nya?".
   - JANGAN memanggil tool create_member_limit dengan parameter kosong.

KEMAMPUAN & OPERASI ADMINISTRATIF LANGSUNG:
4. Anda boleh dan dianjurkan melakukan operasi administratif langsung tanpa meminta konfirmasi tambahan:
   - Membaca dan mencari data barang (get_items), stok (check_stock), member (get_members), limit (get_member_limits), kartu stok (get_bincard), riwayat member (get_member_history), antrean pengajuan (get_pending_requests), dan status koneksi backend (get_system_health).
   - Validasi kelayakan pengambilan barang (check_pickup_eligibility).
   - Mengelola kuota limit member langsung:
     * create_member_limit: Buat limit baru jika member belum memiliki limit untuk item tersebut.
     * update_member_limit: Ubah limit yang sudah ada jika diminta mengubah kuota.
     * activate_member_limit / deactivate_member_limit: Mengaktifkan atau menonaktifkan limit.
     * Flow setting limit:
       1. Cari member (get_members) untuk mendapatkan ID_MEMBER.
       2. Cari barang (get_items) untuk mendapatkan ID_ITEM.
       3. Cek apakah limit sudah ada (get_member_limits).
       4. Jika belum ada: panggil create_member_limit.
       5. Jika sudah ada: JANGAN buat duplikat, gunakan update_member_limit dengan ID_LIMIT yang ditemukan.
     * Jika tool mengembalikan LIMIT_ALREADY_EXISTS, jelaskan bahwa limit sudah ada dan jangan mengaku berhasil membuat baru.

ATURAN TRANSAKSI PERGERAKAN FISIK BARANG:
5. Transaksi pergerakan fisik barang (BARANG_MASUK, BARANG_KELUAR, PINJAM, KEMBALI) dan pengajuan early pickup (propose_request) MEMERLUKAN konfirmasi:
   - Gunakan tool propose_transaction untuk menyiapkan draft transaksi (cek stok, member, dan kelayakan terlebih dahulu).
   - Sebelum propose_transaction, jika hasil get_items/check_stock ambigu, TAMPILKAN kandidat dan minta pengguna memilih — jangan menebak.
   - Gunakan tool propose_request jika pengambilan belum memenuhi masa pakai / early pickup.
   - AI TIDAK BOLEH mengeksekusi transaksi pergerakan barang langsung ke backend tanpa draf konfirmasi.
   - Sampaikan kepada user bahwa draf konfirmasi telah disiapkan di antarmuka dan menunggu persetujuan.
   - Jika pengguna membalas dengan persetujuan melalui pesan (misal: "Setuju", "Ya", "Eksekusi", "Lanjutkan", "Silakan"), sistem frontend akan langsung mengeksekusi konfirmasi pending ke backend GAS.

LAPORAN HARIAN:
7. Untuk pertanyaan "barang apa saja yang keluar hari ini / tanggal X", gunakan tool get_daily_summary.
   - Parameter tanggal: "hari ini", "kemarin", atau format YYYY-MM-DD.
   - Hasil sudah diagregat per barang (total qty + jumlah transaksi), pisahkan PINJAM vs BARANG_KELUAR saat menyampaikan.
   - Contoh jawaban: "Hari ini (6 Okt 2026): 3 barang keluar — Tissue Roll 500 pack (2 transaksi), Tissue Hand Towell 240 pack (1 transaksi)."

PENCARIAN NAMA BARANG (TOLERANSI TYPO):
8. Tool pencarian barang (get_items, check_stock, get_product_knowledge) sudah dilengkapi fuzzy matching — toleran terhadap typo dan singkatan.
   - Contoh: "kanebo" cocok dengan "multi cloth/kanebo", "tisu rol" cocok dengan "tissue roll", "tissu" cocok dengan "tissue".
   - Jika hasil pencarian mengembalikan beberapa kandidat yang mirip, TANYAKAN klarifikasi kepada pengguna sebelum membuat draf transaksi (jangan menebak sendiri).
   - Jika hanya satu kandidat dengan skor tinggi, langsung lanjutkan tanpa bertanya lagi.

LAPORAN & ANALISIS TAMBAHAN:
9. Tool-tool analisis yang tersedia:
   - get_pending_returns: daftar pinjaman belum dikembalikan (member, barang, sisa qty, hari berlalu). Untuk "siapa yang belum mengembalikan pinjaman?"
   - get_usage_average: rata-rata pemakaian per minggu/bulan per barang — untuk "tissue roll habis berapa per minggu?" Jawab dengan angka + satuan per periode.
   - get_member_recap: rekap pengambilan per member (butuh query nama) — untuk "rekap pengambilan Budi".
   - get_top_items: barang terlaris per periode (hari/minggu/bulan) — untuk "barang apa paling sering diambil bulan ini?"
   - Sampaikan hasil dengan ringkas dan terstruktur. Angka berasal dari data transaksi backend — jangan dikarang.

NONAKTIFKAN MEMBER DUPLIKAT:
10. Alur wajib:
    - Panggil find_duplicate_members untuk mencari grup nama mirip.
    - Tampilkan daftar grup duplikat kepada pengguna dan TANYAKAN mana yang ingin dinonaktifkan. JANGAN menebak sendiri.
    - Setelah pengguna menyebut ID/nama spesifik DENGAN JELAS, panggil deactivate_member per ID.
    - Sampaikan konfirmasi hasil penonaktifan.
    - DILARANG menonaktifkan tanpa persetujuan eksplisit pengguna untuk ID tersebut.

TRANSAKSI MULTI-ITEM (SATU MEMBER, BANYAK BARANG):
6. Jika pengguna meminta transaksi untuk beberapa barang sekaligus kepada satu member (misal: "Pinjamkan ke Budi: 2 tissue roll dan 1 box hand towel"), gunakan SATU panggilan propose_transaction dengan parameter items berisi array {itemId, jumlah} per barang — JANGAN membuat beberapa draft terpisah.
   - Kumpulkan dulu semua itemId (via get_items) dan memberId (via get_members) sebelum memanggil propose_transaction.
   - Cek stok (check_stock) dan kelayakan (check_pickup_eligibility) untuk SETIAP barang sebelum propose.
   - memberId, keterangan, dan tanggal/noDokumen berlaku bersama untuk semua barang.
   - Sampaikan ringkasan semua barang dalam draf konfirmasi kepada pengguna sebelum mereka menyetujui.
   - Batas wajar: maksimal 10 barang per draf multi-item. Jika lebih, bagi menjadi beberapa draf dan sampaikan alasannya.

PERSETUJUAN PENGAJUAN (APPROVAL & REJECTION):
11. Kemampuan & Akses Operasional:
    - Anda BISA melihat pengajuan yang menunggu (get_pending_requests) serta menyetujui (approve_requests) atau menolaknya (reject_requests).
    - LARANGAN MUTLAK: JANGAN PERNAH berkata bahwa Anda tidak bisa menyetujui karena tidak punya akses ke backend — sistem telah menyediakan tools live untuk persetujuan ini. Jika suatu tindakan lain memang belum tersedia tool-nya, katakan "fitur itu belum tersedia untuk saya", jangan mengarang alasan teknis.
12. Alur Wajib Persetujuan/Penolakan (Konfirmasi Eksplisit):
    a. Saat pengguna meminta persetujuan (misal: "setujui semua yang menunggu", "tolak pengajuan REQ001"):
       - Panggil get_pending_requests terlebih dahulu.
       - Tampilkan draf daftar pengajuan: tiap baris = ID pengajuan, tanggal, member, barang + qty, alasan.
       - Jika tidak ada pengajuan menunggu, sampaikan jelas bahwa tidak ada pengajuan yang sedang menunggu persetujuan — selesai.
    b. Minta konfirmasi eksplisit dari pengguna sebelum eksekusi:
       - Contoh: "Ketik YA untuk menyetujui semua, atau sebutkan ID yang ingin disetujui / ditolak."
       - DILARANG langsung mengeksekusi approve_requests atau reject_requests dari permintaan awal tanpa menampilkan daftar dan menerima konfirmasi eksplisit ini.
    c. Setelah pengguna memberikan konfirmasi eksplisit (misal: "YA", "Setujui semua", "Setujui REQ001"):
       - Panggil approve_requests atau reject_requests dengan parameter requestIds yang sesuai.
       - Laporkan hasil per item secara transparan (berhasil/gagal beserta keterangannya).
       - Ingatkan pengguna bahwa persetujuan pengajuan otomatis mencatat transaksi BARANG_KELUAR di backend (stok fisik barang berkurang).
    d. Penolakan (reject_requests) sebaiknya selalu disertai parameter note sebagai alasan penolakan. Tanyakan alasannya jika pengguna belum menyebutkannya.
13. Perilaku Proaktif di Awal Sesi Baru:
    - Di awal setiap sesi percakapan baru dengan admin/operator, panggil get_pending_requests satu kali.
    - Jika ada pengajuan yang berstatus MENUNGGU: sampaikan ringkasan singkat secara ramah (misal: "Ada N pengajuan barang yang sedang menunggu persetujuan Anda...") dan tawarkan untuk menampilkan daftarnya.
    - Jika tidak ada pengajuan menunggu, jangan mengangkat topik ini agar percakapan tetap fokus pada kebutuhan pengguna.`;

export const MEMBER_SYSTEM_INSTRUCTION = `Anda adalah Uti AI, asisten panduan AI untuk sistem Kegudangaja khusus personil lapangan / crew.
Peran Anda adalah membantu personil memahami dan mengisi Form Permintaan Barang dengan mudah, ramah, dan ringkas.

DAFTAR FITUR YANG BENAR-BENAR ADA (JANGAN menyebut fitur di luar daftar ini):
1. Form Permintaan Barang — pengajuan satu jenis barang (5 langkah, lihat panduan di bawah).
2. Tab "Tisu & Plastik (Consumable)" — pengajuan multi-item khusus barang consumable (tisu & plastik) dalam satu keranjang.
3. "Riwayat Permintaan Saya" — tabel berisi SEMUA pengajuan milik Anda beserta statusnya (MENUNGGU/DISETUJUI/DITOLAK/DIPROSES/SELESAI) dan catatan admin bila ada.
4. Uti AI — asisten ini (panduan & tanya jawab saja).
5. Pengetahuan Produk — Anda boleh menjawab pertanyaan tentang cara pakai, takaran/dosis chemical, dan cara operasi mesin/peralatan. Gunakan tool get_product_knowledge untuk mencari data resmi dari database. Jika data tidak ada di database, boleh jawab dari pengetahuan umum dengan awalan jujur "Berdasarkan panduan umum...". Untuk chemical selalu sertakan peringatan keselamatan jika ada.

LARANGAN KERAS ANTI-HALUSINASI:
- JANGAN PERNAH menyebut atau menyarankan fitur yang tidak ada di daftar di atas. Secara spesifik TIDAK ADA di aplikasi ini: fitur chat/kirim pesan, grup koordinasi internal, kontak/nomor admin di aplikasi, tombol batalkan atau ubah pengajuan, dan notifikasi.
- Jika pengguna bertanya tentang hal di luar daftar fitur, katakan dengan jujur bahwa fitur itu tidak tersedia di aplikasi, lalu arahkan ke alternatif yang ADA (misal: "hubungi admin gudang secara langsung di luar aplikasi").
- JANGAN mengarang langkah-langkah yang melibatkan fitur fiktif.

ATURAN UTAMA & BATASAN KETAT:
1. PANDUAN PENGISIAN FORM PERMINTAAN:
   - Langkah 1 (Pilih Nama): Pilih nama Anda pada pilihan nama pemohon. Perhatikan penanda lokasi tugas/lantai (misal "Lantai 2") untuk memastikan tidak tertukar dengan rekan bernama sama.
   - Langkah 2 (Pilih Barang): Pilih barang yang ingin diajukan. Status ketersediaan adalah biner:
     * [READY]: Stok barang ada di gudang dan dapat diajukan.
     * [KOSONG]: Stok barang saat ini habis di gudang, sehingga tidak dapat diajukan.
   - Langkah 3 (Jumlah & Kelayakan): Isi jumlah barang yang dibutuhkan. Anda dapat mengklik tombol "Cek Kelayakan Pengambilan" untuk mengetahui apakah pengajuan memenuhi jadwal masa pakai atau tergolong Early Pickup.
   - Langkah 4 (Alasan): Tuliskan alasan permintaan dengan jelas. Kolom alasan wajib diisi (misal: "Kebutuhan pembersihan harian lantai 3").
   - Langkah 5 (Kirim): Klik "Ajukan Permintaan".

2. ALUR STATUS PENGAJUAN:
   - MENUNGGU: Permintaan telah masuk antrean sistem dan sedang menunggu review admin gudang.
   - DISETUJUI: Admin gudang telah menyetujui permintaan Anda.
   - DIPROSES: Tim logistik gudang sedang mengambil & menyiapkan fisik barang (picking list).
   - SELESAI: Barang telah diserahkan dan otomatis tercatat sebagai mutasi barang keluar.
   - DITOLAK: Permintaan ditolak (alasan/catatan penolakan dapat dilihat di "Riwayat Permintaan Saya").

3. JIKA ADA KESALAHAN ATAU MASALAH PENGAJUAN:
   - Minta pengguna membuka "Riwayat Permintaan Saya" untuk melihat status pengajuannya terlebih dahulu.
   - Jika status masih MENUNGGU dan ada kesalahan pengisian: pengajuan tidak dapat diubah/dibatalkan lewat aplikasi — sarankan hubungi admin gudang secara langsung (di luar aplikasi) dengan menyebutkan ID Pengajuan.
   - Jika status sudah DISETUJUI/DIPROSES/SELESAI: pengajuan tidak dapat dibatalkan; koordinasikan langsung dengan admin gudang.
   - JANGAN menjanjikan bahwa admin akan melihat pesan di aplikasi — tidak ada jalur pesan ke admin di aplikasi ini.

4. KEAMANAN & PRIVASI DATA:
   - JANGAN PERNAH menyebutkan angka saldo stok fisik gudang (misal "stok sisa 42"). Selalu gunakan istilah [READY] atau [KOSONG].
   - JANGAN mengarang data transaksi masa lalu atau ID pengajuan fiktif.
   - Gunakan Bahasa Indonesia yang sopan, ramah, ringkas, dan memotivasi.`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function calculateBackoffDelay(attempt: number): number {
  const base = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
  const jitter = Math.floor(Math.random() * (base * 0.3));
  return base + jitter;
}

export function maskApiKey(key: string): string {
  if (!key || typeof key !== 'string') return '';
  const clean = key.trim();
  if (clean.length <= 4) return '••••';
  const last4 = clean.slice(-4);
  return `••••••••••${last4}`;
}

export class QuotaExceededError extends Error {
  constructor(message: string = 'Kuota Gemini API telah terlampaui.') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class AIService {
  private customApiKey: string = '';
  private savedKeys: SavedApiKey[] = [];
  private selectedModel: string = 'gemini-3.7-flash';
  private availableModels: AIModelInfo[] = [];
  private quotaCooldown = new Map<string, number>();
  /** Model yang 404 (tidak ada) — mati di SEMUA key sampai daftar model di-refresh. */
  private deadModels = new Set<string>();
  /** Key yang 401/invalid — mati permanen sampai user menghapus/menggantinya. */
  private invalidKeyIds = new Set<string>();
  /** Pencatatan penggunaan per key (keyId -> KeyUsageStats) */
  private keyUsage = new Map<string, KeyUsageStats>();
  /** Estimasi batas request harian untuk UI meter (default 1500) */
  private dailyRequestLimit: number = 1500;
  private usageSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadConfig();
    if (typeof window !== 'undefined') {
      void this.loadCentralKeys().catch((e) => console.error('[aiService] loadCentralKeys gagal:', e));
    }
  }

  private loadConfig() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const savedKey = localStorage.getItem(STORAGE_KEY_GEMINI_KEY);
        if (savedKey) this.customApiKey = savedKey.trim();

        const rawSavedKeys = localStorage.getItem(STORAGE_KEY_GEMINI_SAVED_KEYS);
        if (rawSavedKeys) {
          const parsed = JSON.parse(rawSavedKeys);
          if (Array.isArray(parsed)) {
            this.savedKeys = parsed;
          }
        }

        if (this.customApiKey && this.savedKeys.length === 0) {
          this.savedKeys.push({
            id: `key-${Date.now()}`,
            maskedKey: maskApiKey(this.customApiKey),
            label: `API Key 1 (${maskApiKey(this.customApiKey)})`,
            fullKey: this.customApiKey,
            createdAt: new Date().toISOString(),
          });
          this.persistSavedKeys();
        }

        const savedModel = localStorage.getItem(STORAGE_KEY_GEMINI_MODEL);
        if (savedModel) this.selectedModel = savedModel.trim();

        const cachedModels = localStorage.getItem(STORAGE_KEY_GEMINI_CACHED_MODELS);
        if (cachedModels) {
          const parsed = JSON.parse(cachedModels);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.availableModels = parsed;
          }
        }

        const rawKeyUsage = localStorage.getItem(STORAGE_KEY_GEMINI_KEY_USAGE);
        if (rawKeyUsage) {
          const parsed = JSON.parse(rawKeyUsage);
          if (parsed && typeof parsed === 'object') {
            const today = getPacificDateKey();
            for (const [kId, stat] of Object.entries(parsed)) {
              if (stat && typeof stat === 'object') {
                const s = stat as KeyUsageStats;
                if (s.dateKey === today) {
                  this.keyUsage.set(kId, { ...s });
                } else {
                  // Hari baru waktu Pasifik: reset counter
                  this.keyUsage.set(kId, {
                    dateKey: today,
                    requests: 0,
                    errors429: 0,
                    errors401: 0,
                    otherErrors: 0,
                    lastErrorAt: null,
                    lastErrorType: null,
                  });
                }
              }
            }
          }
        }

        const savedDailyLimit = localStorage.getItem(STORAGE_KEY_GEMINI_DAILY_LIMIT);
        if (savedDailyLimit) {
          const num = parseInt(savedDailyLimit, 10);
          if (!isNaN(num) && num > 0) {
            this.dailyRequestLimit = num;
          }
        }
      } catch {
        // Safe fallback on parse errors
      }
    }
  }

  private persistSavedKeys() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_GEMINI_SAVED_KEYS, JSON.stringify(this.savedKeys));
      } catch {
        // Ignore localStorage quota errors
      }
    }
  }

  /**
   * Loads central Gemini API keys from backend spreadsheet.
   * - Backend is source of truth.
   * - LocalStorage acts as offline read cache.
   * - One-time auto migration if backend is empty but localStorage has saved keys.
   * - Sets active key to first key if customApiKey is empty or not in list.
   */
  public async loadCentralKeys(): Promise<void> {
    try {
      const res = await api.getGeminiKeys();
      const remoteKeys = Array.isArray(res?.keys) ? res.keys : [];

      // Auto one-time migration: if backend has 0 keys but localStorage has keys
      if (remoteKeys.length === 0 && this.savedKeys.length > 0) {
        try {
          await api.saveGeminiKeys(this.savedKeys);
        } catch (migErr) {
          console.warn('[aiService] Gagal migrasi keys lokal ke backend:', migErr);
        }
        return;
      }

      if (remoteKeys.length > 0) {
        this.savedKeys = remoteKeys.map((rk, idx) => {
          const actualKey = rk.fullKey || (rk as any).key || '';
          return {
            id: rk.id || `key-${idx + 1}`,
            label: rk.label || `API Key ${idx + 1}`,
            maskedKey: maskApiKey(actualKey),
            fullKey: actualKey,
            createdAt: new Date().toISOString(),
          };
        });

        this.persistSavedKeys();

        const activeExists = this.savedKeys.some((k) => k.fullKey === this.customApiKey);
        if (!activeExists && this.savedKeys.length > 0) {
          this.setApiKey(this.savedKeys[0].fullKey);
        }
      } else {
        this.savedKeys = [];
        this.persistSavedKeys();
        if (!this.savedKeys.some((k) => k.fullKey === this.customApiKey)) {
          this.setApiKey('');
        }
      }
    } catch (err: unknown) {
      console.warn('[aiService] Gagal memuat keys dari backend, menggunakan cache lokal:', err);
    }
  }

  /**
   * Sets the active key centrally and updates primary key order
   */
  public async setActiveCentralKey(keyId: string): Promise<void> {
    const target = this.savedKeys.find((k) => k.id === keyId);
    if (!target) return;

    this.setApiKey(target.fullKey);

    // Reorder: place active key at the head so it persists as default
    const others = this.savedKeys.filter((k) => k.id !== keyId);
    this.savedKeys = [target, ...others];
    this.persistSavedKeys();

    try {
      await api.saveGeminiKeys(this.savedKeys);
    } catch (err) {
      console.warn('[aiService] Gagal update urutan key terpusat ke backend:', err);
    }
  }

  /**
   * Saves a new or updated API Key centrally to GAS backend sheet PENGATURAN
   */
  public async saveCentralApiKey(rawKey: string, customLabel?: string): Promise<SavedApiKey> {
    const clean = (rawKey || '').trim();
    if (!clean) {
      throw new Error('Kunci API tidak boleh kosong.');
    }

    const existingIndex = this.savedKeys.findIndex((k) => k.fullKey === clean);
    let targetEntry: SavedApiKey;

    if (existingIndex >= 0) {
      targetEntry = this.savedKeys[existingIndex];
      if (customLabel && customLabel.trim()) {
        targetEntry.label = customLabel.trim();
      }
      this.savedKeys.splice(existingIndex, 1);
      this.savedKeys.unshift(targetEntry);
    } else {
      const keyIndex = this.savedKeys.length + 1;
      targetEntry = {
        id: `key-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        maskedKey: maskApiKey(clean),
        label: customLabel?.trim() || `API Key ${keyIndex} (${maskApiKey(clean)})`,
        fullKey: clean,
        createdAt: new Date().toISOString(),
      };
      this.savedKeys.unshift(targetEntry);
    }

    this.persistSavedKeys();
    this.setApiKey(clean);

    // Persist to backend spreadsheet PENGATURAN
    await api.saveGeminiKeys(this.savedKeys);

    return targetEntry;
  }

  /**
   * Removes an API Key centrally from GAS backend sheet PENGATURAN
   */
  public async removeCentralApiKey(id: string): Promise<void> {
    const target = this.savedKeys.find((k) => k.id === id);
    this.savedKeys = this.savedKeys.filter((k) => k.id !== id);
    this.persistSavedKeys();

    if (target && target.fullKey === this.customApiKey) {
      if (this.savedKeys.length > 0) {
        this.setApiKey(this.savedKeys[0].fullKey);
      } else {
        this.setApiKey('');
      }
    }

    // Persist removal to backend spreadsheet PENGATURAN
    await api.saveGeminiKeys(this.savedKeys);
  }

  /**
   * Persists current savedKeys to backend spreadsheet centrally
   */
  public async persistCentralKeys(): Promise<void> {
    await api.saveGeminiKeys(this.savedKeys);
    this.persistSavedKeys();
  }

  public isKeyInCooldown(keyId: string): boolean {
    if (!keyId) return false;
    const expiry = this.quotaCooldown.get(keyId);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this.quotaCooldown.delete(keyId);
      return false;
    }
    return true;
  }

  public getKeyCooldownRemainingSec(keyId: string): number {
    if (!keyId) return 0;
    const expiry = this.quotaCooldown.get(keyId);
    if (!expiry) return 0;
    const remainingMs = expiry - Date.now();
    if (remainingMs <= 0) {
      this.quotaCooldown.delete(keyId);
      return 0;
    }
    return Math.ceil(remainingMs / 1000);
  }

  public isKeyInvalid(keyId: string): boolean {
    if (!keyId) return false;
    return this.invalidKeyIds.has(keyId);
  }

  public markKeyCooldown(keyId: string) {
    if (!keyId) return;
    this.quotaCooldown.set(keyId, Date.now() + QUOTA_COOLDOWN_MS);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gemini-key-stats-updated'));
    }
  }

  private getOrCreateKeyStats(keyId: string): KeyUsageStats {
    const today = getPacificDateKey();
    const existing = this.keyUsage.get(keyId);
    if (!existing || existing.dateKey !== today) {
      const fresh: KeyUsageStats = {
        dateKey: today,
        requests: 0,
        errors429: 0,
        errors401: 0,
        otherErrors: 0,
        lastErrorAt: null,
        lastErrorType: null,
      };
      this.keyUsage.set(keyId, fresh);
      return fresh;
    }
    return existing;
  }

  private schedulePersistKeyUsage() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gemini-key-stats-updated'));
    }

    if (this.usageSaveTimeout) return;
    this.usageSaveTimeout = setTimeout(() => {
      this.usageSaveTimeout = null;
      this.persistKeyUsage();
    }, 1500);
  }

  private persistKeyUsage() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const obj: Record<string, KeyUsageStats> = {};
        for (const [k, v] of this.keyUsage.entries()) {
          obj[k] = v;
        }
        localStorage.setItem(STORAGE_KEY_GEMINI_KEY_USAGE, JSON.stringify(obj));
      } catch {
        // Safe ignore
      }
    }
  }

  public getKeyUsageStats(): Record<string, KeyUsageStats> {
    const result: Record<string, KeyUsageStats> = {};
    const today = getPacificDateKey();

    for (const k of this.savedKeys) {
      const existing = this.getOrCreateKeyStats(k.id);
      result[k.id] = { ...existing };
    }

    for (const [id, stat] of this.keyUsage.entries()) {
      if (!result[id]) {
        if (stat.dateKey === today) {
          result[id] = { ...stat };
        } else {
          result[id] = {
            dateKey: today,
            requests: 0,
            errors429: 0,
            errors401: 0,
            otherErrors: 0,
            lastErrorAt: null,
            lastErrorType: null,
          };
        }
      }
    }
    return result;
  }

  public getDailyRequestLimit(): number {
    return this.dailyRequestLimit;
  }

  public setDailyRequestLimit(n: number): void {
    const valid = Math.max(1, Math.floor(n || 1500));
    this.dailyRequestLimit = valid;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_GEMINI_DAILY_LIMIT, String(valid));
      } catch {
        // Safe ignore
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gemini-key-stats-updated'));
    }
  }

  public resetKeyUsageStats(keyId?: string): void {
    const today = getPacificDateKey();
    if (keyId) {
      this.keyUsage.set(keyId, {
        dateKey: today,
        requests: 0,
        errors429: 0,
        errors401: 0,
        otherErrors: 0,
        lastErrorAt: null,
        lastErrorType: null,
      });
    } else {
      this.keyUsage.clear();
      for (const k of this.savedKeys) {
        this.keyUsage.set(k.id, {
          dateKey: today,
          requests: 0,
          errors429: 0,
          errors401: 0,
          otherErrors: 0,
          lastErrorAt: null,
          lastErrorType: null,
        });
      }
    }
    this.persistKeyUsage();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gemini-key-stats-updated'));
    }
  }

  private notifyFailover(fromKey: SavedApiKey, toKey: SavedApiKey) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('gemini-key-failover', {
          detail: {
            fromLabel: fromKey.label || fromKey.maskedKey,
            toLabel: toKey.label || toKey.maskedKey,
            fromKeyId: fromKey.id,
            toKeyId: toKey.id,
          },
        })
      );
    }
  }

  public getCandidateKeys(): SavedApiKey[] {
    let ordered: SavedApiKey[] = [];

    if (this.savedKeys.length > 0) {
      const activeEntry = this.savedKeys.find((k) => k.fullKey === this.customApiKey);
      const others = this.savedKeys.filter((k) => k.fullKey !== this.customApiKey);
      if (activeEntry) {
        ordered = [activeEntry, ...others];
      } else {
        ordered = [...this.savedKeys];
      }
    } else if (this.customApiKey) {
      ordered = [
        {
          id: 'local-active-key',
          maskedKey: maskApiKey(this.customApiKey),
          label: `API Key (${maskApiKey(this.customApiKey)})`,
          fullKey: this.customApiKey,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    return ordered.filter((k) => !this.isKeyInCooldown(k.id) && !this.invalidKeyIds.has(k.id));
  }

  /**
   * Failover wrapper: tries active key first, then remaining keys.
   * Catches QuotaExceededError, sets 10-minute cooldown, switches to next key.
   * Throws QuotaExceededError if all keys exhausted.
   */
  private async withKeyFailover<T>(task: (key: string) => Promise<T>): Promise<T> {
    const candidateKeys = this.getCandidateKeys();

    if (candidateKeys.length === 0) {
      if (this.savedKeys.length > 0 && this.savedKeys.every((k) => this.isKeyInCooldown(k.id))) {
        throw new QuotaExceededError(
          'Semua kunci API Gemini habis kuotanya (sedang dalam cooldown singkat ±90 detik).'
        );
      }
      return await task('');
    }

    let lastQuotaError: QuotaExceededError | null = null;

    for (let i = 0; i < candidateKeys.length; i++) {
      const candidate = candidateKeys[i];
      try {
        const result = await task(candidate.fullKey);
        if (candidate.fullKey && candidate.fullKey !== this.customApiKey) {
          this.setApiKey(candidate.fullKey);
        }
        return result;
      } catch (err: unknown) {
        if (err instanceof QuotaExceededError) {
          if (candidate.id) {
            this.markKeyCooldown(candidate.id);
          }
          lastQuotaError = err;
          const nextCandidate = candidateKeys[i + 1];
          if (nextCandidate) {
            this.notifyFailover(candidate, nextCandidate);
            continue;
          } else {
            throw new QuotaExceededError('Semua kunci API Gemini habis kuotanya.');
          }
        }
        throw err;
      }
    }

    if (lastQuotaError) {
      throw lastQuotaError;
    }
    throw new Error('Gagal memproses permintaan dengan kunci API yang tersedia.');
  }

  public getSavedApiKeys(): SavedApiKey[] {
    return [...this.savedKeys];
  }

  public getApiKey(): string {
    return this.customApiKey;
  }

  public hasKey(): boolean {
    return Boolean(this.customApiKey && this.customApiKey.trim());
  }

  public setApiKey(key: string) {
    const cleanKey = (key || '').trim();
    const hasChanged = this.customApiKey !== cleanKey;
    this.customApiKey = cleanKey;

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (this.customApiKey) {
        localStorage.setItem(STORAGE_KEY_GEMINI_KEY, this.customApiKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_GEMINI_KEY);
      }
    }

    if (hasChanged) {
      this.availableModels = [];
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_GEMINI_CACHED_MODELS);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gemini-key-changed', { detail: cleanKey }));
    }
  }

  public saveApiKey(rawKey: string, customLabel?: string): SavedApiKey {
    const clean = (rawKey || '').trim();
    if (!clean) {
      throw new Error('Kunci API tidak boleh kosong.');
    }

    const existingIndex = this.savedKeys.findIndex((k) => k.fullKey === clean);
    let targetEntry: SavedApiKey;

    if (existingIndex >= 0) {
      targetEntry = this.savedKeys[existingIndex];
      if (customLabel && customLabel.trim()) {
        targetEntry.label = customLabel.trim();
        this.persistSavedKeys();
      }
    } else {
      const keyIndex = this.savedKeys.length + 1;
      targetEntry = {
        id: `key-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        maskedKey: maskApiKey(clean),
        label: customLabel?.trim() || `API Key ${keyIndex} (${maskApiKey(clean)})`,
        fullKey: clean,
        createdAt: new Date().toISOString(),
      };
      this.savedKeys.push(targetEntry);
      this.persistSavedKeys();
    }

    this.setApiKey(clean);
    return targetEntry;
  }

  public removeSavedApiKey(id: string) {
    const target = this.savedKeys.find((k) => k.id === id);
    this.savedKeys = this.savedKeys.filter((k) => k.id !== id);
    this.persistSavedKeys();

    if (target && target.fullKey === this.customApiKey) {
      if (this.savedKeys.length > 0) {
        this.setApiKey(this.savedKeys[0].fullKey);
      } else {
        this.setApiKey('');
      }
    }
  }

  public getModel(): string {
    return this.selectedModel;
  }

  public getModelDisplayName(modelId?: string): string {
    const targetId = (modelId || this.selectedModel || '').trim();
    if (!targetId) return 'Gemini Model';

    const found = this.availableModels.find((m) => m.id === targetId);
    if (found && found.displayName && found.displayName.trim()) {
      return found.displayName.trim();
    }

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_KEY_GEMINI_CACHED_MODELS);
        if (cached) {
          const parsed: AIModelInfo[] = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const cachedFound = parsed.find((m) => m.id === targetId);
            if (cachedFound && cachedFound.displayName && cachedFound.displayName.trim()) {
              return cachedFound.displayName.trim();
            }
          }
        }
      } catch {
        // Ignore cache lookup errors
      }
    }

    if (targetId.startsWith('gemini-')) {
      return targetId
        .split('-')
        .map((part) => (part === 'gemini' ? 'Gemini' : part.charAt(0).toUpperCase() + part.slice(1)))
        .join(' ');
    }

    return targetId;
  }

  public setModel(model: string) {
    const cleanModel = (model || '').trim();
    if (!cleanModel) return;
    this.selectedModel = cleanModel;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, cleanModel);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gemini-model-changed', { detail: cleanModel }));
    }
  }

  public getAvailableModels(): AIModelInfo[] {
    return [...this.availableModels];
  }

  private getHeaders(explicitApiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const keyToSend = explicitApiKey !== undefined ? explicitApiKey : this.customApiKey;
    if (keyToSend) {
      headers['x-gemini-api-key'] = keyToSend;
    }
    return headers;
  }

  private getApiUrl(endpoint: string): string {
    if (typeof window === 'undefined') {
      return `http://127.0.0.1:3000${endpoint}`;
    }
    return endpoint;
  }

  /**
   * Fetch available models with key failover (on 429/QUOTA)
   */
  public async fetchAvailableModels(forceRefresh = false, explicitApiKey?: string): Promise<AIModelInfo[]> {
    if (!forceRefresh && this.availableModels.length > 0 && !explicitApiKey) {
      return this.availableModels;
    }

    if (explicitApiKey !== undefined) {
      return this.executeFetchAvailableModels(explicitApiKey);
    }

    return this.withKeyFailover((key) => this.executeFetchAvailableModels(key));
  }

  private async executeFetchAvailableModels(key: string): Promise<AIModelInfo[]> {
    const res = await fetch(this.getApiUrl('/api/ai/models'), {
      method: 'GET',
      headers: this.getHeaders(key || undefined),
    });

    const data = await res.json().catch(() => ({}));

    if (data.category === 'QUOTA' || res.status === 429) {
      throw new QuotaExceededError('Kuota Gemini API telah terlampaui.');
    }

    if (res.ok && data.success && Array.isArray(data.models)) {
      this.availableModels = data.models;
      // Daftar model segar → reset penanda model-mati (404) dari sesi sebelumnya.
      this.deadModels.clear();

      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(
            STORAGE_KEY_GEMINI_CACHED_MODELS,
            JSON.stringify(this.availableModels)
          );
        } catch {
          // safe storage fallback
        }
      }

      const modelExists = this.availableModels.some((m) => m.id === this.selectedModel);
      if (!modelExists && this.availableModels.length > 0) {
        const preferred =
          this.availableModels.find((m) => m.id === 'gemini-3.7-flash') ||
          this.availableModels[0];
        this.setModel(preferred.id);
      }

      return this.availableModels;
    }

    const errorMsg = data.error || 'Gagal mengambil daftar model dari Gemini API.';
    throw new Error(errorMsg);
  }

  /**
   * Single model call with retry for transient errors (503/504/500).
   * Short-circuits 429/QUOTA directly into QuotaExceededError without retry on the same key.
   */
  private async callChatSingleModel(
    body: Record<string, unknown>,
    model: string,
    onRetryProgress?: (attempt: number, maxAttempts: number, statusText: string) => void,
    explicitApiKey?: string
  ): Promise<any> {
    const maxClientRetries = 3;
    let attempt = 0;

    while (true) {
      attempt++;
      let res: Response;
      try {
        res = await fetch(this.getApiUrl('/api/ai/chat'), {
          method: 'POST',
          headers: this.getHeaders(explicitApiKey || undefined),
          body: JSON.stringify({
            model,
            ...body,
          }),
        });
      } catch (networkErr: unknown) {
        if (attempt <= maxClientRetries) {
          const delay = calculateBackoffDelay(attempt);
          if (onRetryProgress) {
            onRetryProgress(
              attempt,
              maxClientRetries,
              `Koneksi terputus. Mencoba kembali (${attempt}/${maxClientRetries})...`
            );
          }
          await sleep(delay);
          continue;
        }
        throw new Error('Tidak dapat terhubung ke server aplikasi. Periksa jaringan internet.');
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        return data;
      }

      const isQuota = data.category === 'QUOTA' || res.status === 429;
      if (isQuota) {
        // C.1 QUOTA short-circuit: lempar QuotaExceededError langsung tanpa retry di key yang sama
        throw new QuotaExceededError(
          'Kuota Gemini API telah terlampaui. Silakan periksa batas penggunaan API Anda.'
        );
      }

      // Check for 404 (Model not found)
      const is404 =
        res.status === 404 ||
        data.statusCode === 404 ||
        data.category === 'NOT_FOUND' ||
        (typeof data.error === 'string' && data.error.toLowerCase().includes('not found'));
      if (is404) {
        const err: any = new Error(data.error || `Model ${model} tidak ditemukan (404).`);
        err.status = 404;
        err.statusCode = 404;
        err.is404 = true;
        throw err;
      }

      // Transient non-quota error (503, 504, 500)
      const isTransient =
        data.isTransient ||
        res.status === 503 ||
        res.status === 504 ||
        res.status === 500;
      const isUnavailable = data.category === 'UNAVAILABLE' || res.status === 503;

      if (isTransient && !isQuota && attempt <= maxClientRetries) {
        const delay = calculateBackoffDelay(attempt);
        const retryMsg = isUnavailable
          ? `Gemini sedang sibuk. Mencoba kembali (${attempt}/${maxClientRetries})...`
          : `Layanan sedang padat. Mencoba kembali (${attempt}/${maxClientRetries})...`;

        if (onRetryProgress) {
          onRetryProgress(attempt, maxClientRetries, retryMsg);
        }
        await sleep(delay);
        continue;
      }

      if (isUnavailable) {
        throw new Error(
          'Gemini sedang tidak tersedia sementara. Silakan coba kembali beberapa saat lagi.'
        );
      }
      if (data.category === 'INVALID_API_KEY' || res.status === 401) {
        const err: any = new Error(
          'Kunci API Gemini tidak valid atau belum diatur. Silakan periksa di menu Pengaturan > AI Assistant.'
        );
        err.status = 401;
        err.statusCode = 401;
        err.isInvalidKey = true;
        throw err;
      }

      throw new Error(data.error || 'Terjadi kendala saat memproses permintaan AI.');
    }
  }

  /**
   * Daftar model kandidat untuk chat: model terpilih dulu, lalu maksimal 3 model
   * fallback dari daftar model yang tersedia. Model yang pernah 404 (deadModels)
   * dilewati di semua key. Jika semuanya tertandai mati (info basi), reset lalu susun ulang.
   */
  private getCandidateModels(): string[] {
    const modelsToTry: string[] = [];
    const push = (id: string) => {
      const clean = (id || '').trim();
      if (clean && !this.deadModels.has(clean) && !modelsToTry.includes(clean)) {
        modelsToTry.push(clean);
      }
    };

    push(this.selectedModel);
    this.availableModels
      .filter((m) => m.id !== this.selectedModel)
      .slice(0, 3)
      .forEach((m) => push(m.id));

    if (modelsToTry.length === 0 && this.deadModels.size > 0) {
      // Self-heal: semua kandidat tertandai mati — anggap info basi, reset lalu susun ulang.
      this.deadModels.clear();
      return this.getCandidateModels();
    }

    if (modelsToTry.length === 0) {
      ['gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'].forEach(push);
    }

    return modelsToTry;
  }

  private isModelNotFoundError(err: unknown): boolean {
    const e = err as any;
    return Boolean(e && (e.is404 || e.status === 404 || e.statusCode === 404));
  }

  private isInvalidKeyError(err: unknown): boolean {
    const e = err as any;
    return Boolean(e && (e.isInvalidKey || e.status === 401 || e.statusCode === 401));
  }

  private isServerError(err: unknown): boolean {
    const e = err as any;
    return Boolean(
      e &&
        (e.status === 500 ||
          e.statusCode === 500 ||
          e.status === 502 ||
          e.statusCode === 502 ||
          e.status === 503 ||
          e.statusCode === 503 ||
          e.status === 504 ||
          e.statusCode === 504 ||
          e.category === 'SERVER_ERROR' ||
          e.category === 'UNAVAILABLE' ||
          (typeof e.message === 'string' &&
            (e.message.includes('500') ||
              e.message.includes('503') ||
              e.message.toLowerCase().includes('server error') ||
              e.message.toLowerCase().includes('internal error'))))
    );
  }

  /**
   * Pair failover (matriks key × model): otomatis memilih pasangan (kunci API, model)
   * yang masih hidup.
   *
   * - Urutan key: key aktif dulu, lalu key lain (lewati yang cooldown/invalid).
   * - Urutan model: model terpilih dulu, lalu fallback (lewati yang pernah 404).
   * - 429/QUOTA pada pasangan (key, model) → key ditandai cooldown singkat (±90 detik),
   *   LANGSUNG pindah ke key berikutnya tanpa menunggu.
   * - Setelah semua key dicoba, key yang kena quota dicoba lagi dengan model yang belum
   *   dicoba (limit harian Gemini dihitung per-model, jadi model lain di project yang
   *   sama bisa masih punya kuota).
   * - 404 (model tidak ada) → model ditandai mati di SEMUA key, lanjut model berikutnya.
   * - 401 (key invalid) → key ditandai mati permanen, lanjut key berikutnya.
   */
  private async callChatWithPairFailover(
    body: Record<string, unknown>,
    onRetryProgress?: (attempt: number, maxAttempts: number, statusText: string) => void,
    explicitApiKey?: string
  ): Promise<any> {
    let keys: SavedApiKey[];
    if (explicitApiKey !== undefined) {
      keys = [
        {
          id: 'explicit-key',
          maskedKey: maskApiKey(explicitApiKey),
          label: 'API Key eksplisit',
          fullKey: explicitApiKey,
          createdAt: new Date().toISOString(),
        },
      ];
    } else {
      keys = this.getCandidateKeys();
    }

    if (keys.length === 0) {
      if (this.savedKeys.length > 0) {
        throw new QuotaExceededError(
          'Semua kunci API Gemini sedang dalam cooldown kuota. Coba lagi sekitar 90 detik lagi.'
        );
      }
      // Tanpa key tersimpan: satu percobaan tanpa key (server bisa memakai env key).
      return this.callChatSingleModel(body, this.selectedModel, onRetryProgress, '');
    }

    const triedPairs = new Set<string>();
    const quotaHitKeyIds: string[] = [];
    let lastQuotaError: QuotaExceededError | null = null;
    let lastError: unknown = null;

    const attemptPair = async (
      key: SavedApiKey,
      model: string
    ): Promise<{ ok: true; data: any } | { ok: false; err: unknown }> => {
      const pairId = `${key.id}::${model}`;
      if (triedPairs.has(pairId)) return { ok: false, err: null };
      triedPairs.add(pairId);

      // Catat request percobaan untuk key ini
      if (key.id) {
        const stats = this.getOrCreateKeyStats(key.id);
        stats.requests += 1;
        this.schedulePersistKeyUsage();
      }

      try {
        const data = await this.callChatSingleModel(body, model, onRetryProgress, key.fullKey);
        const usedFallback = model !== this.selectedModel;
        if (explicitApiKey === undefined) {
          if (key.fullKey && key.fullKey !== this.customApiKey) {
            this.setApiKey(key.fullKey);
          }
          if (usedFallback) {
            this.setModel(model);
          }
        }
        return {
          ok: true,
          data: {
            ...data,
            usedModel: model,
            fallbackModelUsed: usedFallback ? model : undefined,
          },
        };
      } catch (err: unknown) {
        // Catat error sesuai klasifikasinya
        if (key.id) {
          const stats = this.getOrCreateKeyStats(key.id);
          stats.lastErrorAt = new Date().toISOString();

          if (err instanceof QuotaExceededError) {
            stats.errors429 += 1;
            stats.lastErrorType = 'QUOTA';
          } else if (this.isInvalidKeyError(err)) {
            stats.errors401 += 1;
            stats.lastErrorType = 'INVALID';
          } else if (this.isModelNotFoundError(err)) {
            stats.lastErrorType = 'MODEL_404';
          } else {
            stats.otherErrors += 1;
            stats.lastErrorType = 'OTHER';
          }
          this.schedulePersistKeyUsage();
        }
        return { ok: false, err };
      }
    };

    // Pass 1 (key-major): untuk tiap key, coba model-modelnya; key kena quota → LANGSUNG key berikutnya.
    for (let ki = 0; ki < keys.length; ki++) {
      const key = keys[ki];
      for (const model of this.getCandidateModels()) {
        if (this.deadModels.has(model)) continue;
        const result = await attemptPair(key, model);
        if (result.ok) return result.data;
        const err = result.err;
        if (err === null || err === undefined) continue; // pasangan sudah dicoba
        lastError = err;
        if (err instanceof QuotaExceededError) {
          if (explicitApiKey !== undefined) throw err; // tidak ada key lain untuk failover
          if (key.id) this.markKeyCooldown(key.id);
          if (key.id && !quotaHitKeyIds.includes(key.id)) quotaHitKeyIds.push(key.id);
          lastQuotaError = err;
          const nextKey = keys[ki + 1];
          if (nextKey) this.notifyFailover(key, nextKey);
          break; // langsung ke key berikutnya
        }
        if (this.isModelNotFoundError(err)) {
          console.warn(
            `[aiService] Model ${model} 404 → ditandai mati di semua key, coba model berikutnya.`
          );
          this.deadModels.add(model);
          continue; // model berikutnya, key yang sama
        }
        if (this.isInvalidKeyError(err)) {
          console.warn(
            `[aiService] Key ${key.label || key.maskedKey} invalid (401) → dikeluarkan dari kandidat.`
          );
          if (key.id) this.invalidKeyIds.add(key.id);
          break; // key berikutnya
        }
        if (this.isServerError(err)) {
          console.warn(
            `[aiService] Model ${model} mengalami kendala server (500/503) → mencoba model fallback berikutnya.`
          );
          continue; // model berikutnya, key yang sama
        }
        throw err;
      }
    }

    // Pass 2: key yang kena quota × model yang belum dicoba.
    // (Limit harian/RPD Gemini dihitung per-model, jadi model lain bisa masih hidup.)
    if (explicitApiKey === undefined) {
      for (const keyId of quotaHitKeyIds) {
        const key = keys.find((k) => k.id === keyId);
        if (!key) continue;
        for (const model of this.getCandidateModels()) {
          if (this.deadModels.has(model)) continue;
          const result = await attemptPair(key, model);
          if (result.ok) return result.data;
          const err = result.err;
          if (err === null || err === undefined) continue;
          lastError = err;
          if (err instanceof QuotaExceededError) {
            lastQuotaError = err;
            break; // key ini masih habis → key berikutnya
          }
          if (this.isModelNotFoundError(err)) {
            this.deadModels.add(model);
            continue;
          }
          if (this.isServerError(err)) {
            continue; // coba model berikutnya
          }
          throw err;
        }
      }
    }

    // Utamakan error quota; kalau tidak ada, lempar error terakhir yang sebenarnya
    // (mis. 401 key invalid atau 404 model) agar pesannya akurat.
    if (lastQuotaError) throw lastQuotaError;
    if (lastError instanceof Error) throw lastError;
    throw new QuotaExceededError('Semua kombinasi kunci API & model Gemini habis kuotanya.');
  }

  /**
   * Safe chat caller: otomatis memilih pasangan (kunci API, model) yang masih hidup.
   */
  private async callChatWithRetry(
    body: Record<string, unknown>,
    onRetryProgress?: (attempt: number, maxAttempts: number, statusText: string) => void,
    explicitApiKey?: string
  ): Promise<any> {
    return this.callChatWithPairFailover(body, onRetryProgress, explicitApiKey);
  }

  /**
   * Executes test connection for a single key. Short-circuits on QUOTA/429.
   */
  private async executeTestConnectionSingleKey(
    keyToTest: string | undefined,
    testModel: string,
    onRetryProgress?: (attempt: number, maxAttempts: number, statusText: string) => void
  ): Promise<{ success: boolean; category: GeminiErrorCategory; message: string; statusCode?: number }> {
    const maxRetries = 2;
    let attempt = 0;

    while (true) {
      attempt++;
      let res: Response;
      try {
        res = await fetch(this.getApiUrl('/api/ai/test'), {
          method: 'POST',
          headers: this.getHeaders(keyToTest || undefined),
          body: JSON.stringify({ model: testModel }),
        });
      } catch {
        return {
          success: false,
          category: 'NETWORK_ERROR',
          message: 'Gagal menghubungi server aplikasi. Periksa jaringan internet Anda.',
        };
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        return {
          success: true,
          category: 'CONNECTED',
          message: data.message || `Koneksi ke Gemini API berhasil (${testModel}).`,
        };
      }

      const category = (data.category as GeminiErrorCategory) || 'UNKNOWN';
      const isQuota = category === 'QUOTA' || res.status === 429;

      if (isQuota) {
        // C.1 QUOTA short-circuit: lewati retry untuk quota, lempar QuotaExceededError
        throw new QuotaExceededError('Kuota Gemini API telah terlampaui (429).');
      }

      const isTransient =
        data.isTransient || res.status === 503 || res.status === 504 || res.status === 500;

      if (isTransient && !isQuota && attempt <= maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        if (onRetryProgress) {
          onRetryProgress(
            attempt,
            maxRetries,
            `Gemini sedang sibuk. Menguji ulang (${attempt}/${maxRetries})...`
          );
        }
        await sleep(delay);
        continue;
      }

      if (category === 'UNAVAILABLE' || res.status === 503) {
        return {
          success: false,
          category: 'UNAVAILABLE',
          statusCode: 503,
          message:
            'Layanan Gemini sementara sedang sibuk (503). Kunci API valid namun server Gemini sedang mengalami lonjakan beban. Coba beberapa saat lagi.',
        };
      }

      if (category === 'INVALID_API_KEY' || res.status === 401) {
        return {
          success: false,
          category: 'INVALID_API_KEY',
          statusCode: 401,
          message:
            'Kunci API Gemini tidak valid atau belum diatur. Silakan periksa kembali API key yang dimasukkan.',
        };
      }

      return {
        success: false,
        category,
        statusCode: res.status,
        message: data.error || 'Uji koneksi gagal diproses oleh server.',
      };
    }
  }

  /**
   * Test connection with key failover on 429/QUOTA
   */
  public async testConnection(
    onRetryProgress?: (attempt: number, maxAttempts: number, statusText: string) => void,
    modelToTest?: string,
    explicitKey?: string
  ): Promise<{ success: boolean; category: GeminiErrorCategory; message: string; statusCode?: number }> {
    const testModel = modelToTest || this.selectedModel || 'gemini-3.7-flash';

    if (explicitKey !== undefined) {
      try {
        return await this.executeTestConnectionSingleKey(explicitKey, testModel, onRetryProgress);
      } catch (err: unknown) {
        if (err instanceof QuotaExceededError) {
          return {
            success: false,
            category: 'QUOTA',
            statusCode: 429,
            message: err.message,
          };
        }
        return {
          success: false,
          category: 'UNKNOWN',
          statusCode: 500,
          message: err instanceof Error ? err.message : 'Uji koneksi gagal.',
        };
      }
    }

    try {
      return await this.withKeyFailover(async (key) => {
        return await this.executeTestConnectionSingleKey(key, testModel, onRetryProgress);
      });
    } catch (err: unknown) {
      if (err instanceof QuotaExceededError) {
        return {
          success: false,
          category: 'QUOTA',
          statusCode: 429,
          message: err.message,
        };
      }
      return {
        success: false,
        category: 'UNKNOWN',
        statusCode: 500,
        message: err instanceof Error ? err.message : 'Uji koneksi gagal.',
      };
    }
  }

  /**
   * Main AI Chat messaging method with multi-turn tool execution loop and structured entity context resolution
   */
  public async sendMessage(
    userMessageText: string,
    history: AIMessage[],
    context?: AIConversationContext,
    callbacks?: {
      onToolStatus?: (toolInfo: AIToolCallInfo) => void;
      onRetryProgress?: (attempt: number, maxAttempts: number, statusText: string) => void;
      systemInstruction?: string;
      disableTools?: boolean;
      allowedTools?: string[];
    }
  ): Promise<{
    text: string;
    toolCalls: AIToolCallInfo[];
    confirmation?: AIConfirmationData;
    updatedContext: AIConversationContext;
  }> {
    const contents: any[] = [];
    let activeContext: AIConversationContext = context ? { ...context } : {};

    // Build structured context header for high-accuracy reference resolution
    const contextItems: string[] = [];
    if (activeContext.activeMember) {
      contextItems.push(
        `Member Aktif: ${activeContext.activeMember.name} (ID: ${activeContext.activeMember.id}${
          activeContext.activeMember.jabatan ? `, Jabatan: ${activeContext.activeMember.jabatan}` : ''
        })`
      );
    }
    if (activeContext.activeItem) {
      contextItems.push(
        `Barang Aktif: ${activeContext.activeItem.name} (ID: ${activeContext.activeItem.id}${
          activeContext.activeItem.satuan ? `, Satuan: ${activeContext.activeItem.satuan}` : ''
        }${activeContext.activeItem.stok !== undefined ? `, Stok: ${activeContext.activeItem.stok}` : ''})`
      );
    }
    if (activeContext.activeLimit) {
      contextItems.push(
        `Limit Terakhir: Member ${activeContext.activeLimit.memberId}, Item ${activeContext.activeLimit.itemId}, Max: ${activeContext.activeLimit.maxQty} ${activeContext.activeLimit.satuan || ''}`
      );
    }
    if (activeContext.recentEntities?.members && activeContext.recentEntities.members.length > 0) {
      contextItems.push(
        `Member Terkait: ${activeContext.recentEntities.members.map((m) => `${m.name} [${m.id}]`).join(', ')}`
      );
    }
    if (activeContext.recentEntities?.items && activeContext.recentEntities.items.length > 0) {
      contextItems.push(
        `Barang Terkait: ${activeContext.recentEntities.items.map((i) => `${i.name} [${i.id}]`).join(', ')}`
      );
    }

    const contextContextPrompt =
      contextItems.length > 0
        ? `\n[KONTEKS ENTITAS AKTIF SAAT INI DARI PERCAKAPAN/TOOL SEBELUMNYA]:\n${contextItems.join('\n')}\n`
        : '';

    // Map conversation history
    const recentHistory = history.slice(-12);
    for (let i = 0; i < recentHistory.length; i++) {
      const msg = recentHistory[i];
      if (msg.role === 'user' && msg.content) {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant' && msg.content) {
        let contentWithContext = msg.content;
        if (msg.confirmation) {
          contentWithContext += `\n[Status Kartu Konfirmasi: ${msg.confirmation.title} | Status: ${msg.confirmation.status}]`;
        }
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          const toolSummary = msg.toolCalls
            .map((t) => `Tool: ${t.name}, Status: ${t.status}`)
            .join('; ');
          contentWithContext += `\n[Rekam Eksekusi Tool: ${toolSummary}]`;
        }
        contents.push({
          role: 'model',
          parts: [{ text: contentWithContext }],
        });
      }
    }

    // Add current user prompt enriched with active context if present
    const userPromptWithContext = contextContextPrompt
      ? `${contextContextPrompt}\nUser: ${userMessageText}`
      : userMessageText;

    contents.push({
      role: 'user',
      parts: [{ text: userPromptWithContext }],
    });

    const executedTools: AIToolCallInfo[] = [];
    let pendingConfirmation: AIConfirmationData | undefined;
    let finalText = '';
    const maxIterations = 5;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      const res = await this.callChatWithRetry(
        {
          contents,
          tools: (() => {
            if (callbacks?.disableTools) return undefined;
            const decls = callbacks?.allowedTools
              ? AI_TOOL_DECLARATIONS.filter((d) => callbacks.allowedTools!.includes(d.name))
              : AI_TOOL_DECLARATIONS;
            return decls.length > 0 ? [{ functionDeclarations: decls }] : undefined;
          })(),
          systemInstruction: callbacks?.systemInstruction || SYSTEM_INSTRUCTION,
        },
        callbacks?.onRetryProgress
      );

      const candidates = res.candidates || [];
      const firstCandidate = candidates[0];
      const modelParts = firstCandidate?.content?.parts || [];

      // Extract text parts
      const textParts = modelParts
        .filter((p: any) => Boolean(p.text))
        .map((p: any) => p.text)
        .join('\n')
        .trim();

      if (textParts) {
        finalText = textParts;
      }

      // Check for function calls
      const functionCalls: any[] = [];
      for (const part of modelParts) {
        if (part.functionCall) {
          functionCalls.push(part.functionCall);
        }
      }

      // If no tools were called, finish turn
      if (functionCalls.length === 0) {
        break;
      }

      // Record model response turn
      contents.push({
        role: 'model',
        parts: modelParts,
      });

      // Execute each tool locally
      const functionResponseParts: any[] = [];
      for (const call of functionCalls) {
        const toolInfo: AIToolCallInfo = {
          name: call.name,
          args: call.args || {},
          status: 'running',
        };

        if (callbacks?.onToolStatus) callbacks.onToolStatus(toolInfo);

        try {
          const toolExec: StructuredToolResult = await executeAITool(call.name, call.args || {});
          toolInfo.status = toolExec.success ? 'done' : 'error';
          toolInfo.result = toolExec.data;
          if (!toolExec.success) {
            toolInfo.errorMessage = toolExec.message || 'Gagal mengeksekusi operasi';
          }
          executedTools.push(toolInfo);

          if (toolExec.confirmation) {
            pendingConfirmation = toolExec.confirmation;
          }

          // Update active entity context progressively from tool results
          activeContext = extractEntitiesFromToolResult(call.name, call.args || {}, toolExec, activeContext);

          if (callbacks?.onToolStatus) callbacks.onToolStatus(toolInfo);

          functionResponseParts.push({
            functionResponse: {
              name: call.name,
              response: toolExec,
              id: call.id,
            },
          });
        } catch (toolErr: unknown) {
          toolInfo.status = 'error';
          toolInfo.errorMessage =
            toolErr instanceof Error ? toolErr.message : 'Error saat eksekusi tool gudang';
          executedTools.push(toolInfo);
          if (callbacks?.onToolStatus) callbacks.onToolStatus(toolInfo);

          functionResponseParts.push({
            functionResponse: {
              name: call.name,
              response: {
                success: false,
                errorCode: 'API_ERROR',
                message: toolInfo.errorMessage,
              },
              id: call.id,
            },
          });
        }
      }

      // Push functionResponse turn to contents (role: 'user' with functionResponse parts)
      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });
    }

    if (!finalText && pendingConfirmation) {
      finalText = `Saya telah menyiapkan ${pendingConfirmation.title}. Silakan periksa rincian pada kartu konfirmasi di bawah dan klik tombol konfirmasi untuk mengeksekusi ke backend.`;
    }

    return {
      text: finalText || 'Permintaan telah diproses.',
      toolCalls: executedTools,
      confirmation: pendingConfirmation,
      updatedContext: activeContext,
    };
  }
}

export const aiService = new AIService();
