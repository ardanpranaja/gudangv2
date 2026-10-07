import { api } from './api';
import {
  AIConfirmationData,
  AIConfirmationType,
  StructuredToolResult,
  AIConversationContext,
} from '../types/ai';

// ============ FUZZY MATCHING (toleransi typo) ============
/** Normalisasi nama: lowercase, hapus karakter khusus. */
function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Jarak Levenshtein untuk toleransi typo. */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Skor kecocokan 0-1 antara query dan nama target.
 * Menangani: substring ("kanebo" vs "multi cloth/kanebo"),
 * token ("tisu rol" vs "tissue roll"), dan typo ringan ("tissu" vs "tissue").
 */
function fuzzyScore(query: string, target: string): number {
  const q = normalizeName(query);
  const t = normalizeName(target);
  if (!q || !t) return 0;
  if (t.includes(q) || q.includes(t)) return 1.0;

  const qTokens = q.split(' ').filter(Boolean);
  const tTokens = t.split(' ').filter(Boolean);
  if (qTokens.length > 0) {
    const matched = qTokens.filter((qt) =>
      tTokens.some((tt) => tt.includes(qt) || qt.includes(tt) || levenshtein(qt, tt) <= Math.max(1, Math.floor(qt.length / 4)))
    );
    if (matched.length === qTokens.length) return 0.9;
    if (matched.length > 0) return 0.6 + (0.3 * matched.length) / qTokens.length;
  }

  const dist = levenshtein(q, t);
  const maxLen = Math.max(q.length, t.length);
  return Math.max(0, 1 - dist / maxLen);
}

/** Cari item dengan fuzzy matching, urut dari skor tertinggi. */
function fuzzyMatchItems<T>(query: string, items: T[], getName: (item: T) => string, threshold = 0.45): T[] {
  if (!query.trim()) return items;
  return items
    .map((item) => ({ item, score: fuzzyScore(query, getName(item)) }))
    .filter((x) => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}

// Gemini Function Declarations Schema for @google/genai
export const AI_TOOL_DECLARATIONS = [
  {
    name: 'check_stock',
    description: 'Cek posisi stok barang saat ini di gudang. Bisa mencari berdasarkan nama barang, kategori, atau memfilter barang yang stoknya menipis (isLowStock).',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Kata kunci pencarian nama atau kategori barang (opsional).',
        },
        lowStockOnly: {
          type: 'BOOLEAN',
          description: 'Set true jika ingin hanya melihat barang yang stoknya sudah di bawah atau sama dengan stok minimum.',
        },
      },
    },
  },
  {
    name: 'get_items',
    description: 'Ambil daftar katalog master barang gudang (kode ID_ITEM, NAMA_ITEM, KATEGORI, SATUAN, LOKASI, MASA_PAKAI_BULAN, STATUS).',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Kata kunci nama barang atau kategori (opsional).',
        },
      },
    },
  },
  {
    name: 'get_daily_summary',
    description: 'Ringkasan transaksi barang KELUAR (BARANG_KELUAR dan PINJAM) pada tanggal tertentu, diagregat per barang. Untuk menjawab "barang apa saja yang keluar hari ini/tanggal X".',
    parameters: {
      type: 'OBJECT',
      properties: {
        tanggal: {
          type: 'STRING',
          description: 'Tanggal target: format YYYY-MM-DD, atau "hari ini", "kemarin". Default: hari ini.',
        },
        jenis: {
          type: 'STRING',
          description: 'Filter jenis: "KELUAR" (BARANG_KELUAR+PINJAM, default), "MASUK" (BARANG_MASUK+KEMBALI), atau "SEMUA".',
        },
      },
    },
  },
  {
    name: 'get_pending_returns',
    description: 'Daftar pinjaman barang (PINJAM) yang belum dikembalikan — siapa meminjam apa, kapan, dan sudah berapa lama.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'get_usage_average',
    description: 'Rata-rata pemakaian barang per minggu/bulan berdasarkan riwayat transaksi keluar — untuk acuan perencanaan pembelian.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Kata kunci nama barang (opsional, kosongkan untuk semua barang).' },
        periode: { type: 'STRING', description: '"minggu" atau "bulan". Default: "minggu".' },
      },
    },
  },
  {
    name: 'get_member_recap',
    description: 'Rekap pengambilan barang per member: barang apa saja, total qty, dan kapan terakhir mengambil.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Kata kunci nama member.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_top_items',
    description: 'Barang paling sering diambil (terlaris) pada periode tertentu, diurut dari tertinggi.',
    parameters: {
      type: 'OBJECT',
      properties: {
        periode: { type: 'STRING', description: '"hari", "minggu", atau "bulan". Default: "bulan".' },
        limit: { type: 'NUMBER', description: 'Jumlah barang teratas. Default: 10.' },
      },
    },
  },
  {
    name: 'find_duplicate_members',
    description: 'Cari member dengan nama mirip/duplikat untuk ditinjau sebelum dinonaktifkan.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'deactivate_member',
    description: 'Nonaktifkan member (STATUS=NONAKTIF). HANYA dipakai setelah pengguna mengonfirmasi eksplisit member mana yang dinonaktifkan.',
    parameters: {
      type: 'OBJECT',
      properties: {
        memberId: { type: 'STRING', description: 'ID_MEMBER yang akan dinonaktifkan.' },
      },
      required: ['memberId'],
    },
  },
  {
    name: 'get_product_knowledge',
    description: 'Cari pengetahuan produk barang gudang: cara pakai, takaran/dosis, dan peringatan keselamatan. TIDAK menampilkan angka stok.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Kata kunci nama barang (misal "floor cleaner", "tiner").',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_members',
    description: 'Ambil daftar master member gudang (ID_MEMBER, NAMA_MEMBER, DIVISI, JABATAN, JENIS_MEMBER, STATUS).',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Kata kunci nama atau ID member (opsional).',
        },
      },
    },
  },
  {
    name: 'get_member_limits',
    description: 'Ambil konfigurasi limit kuota pengambilan barang untuk member (MEMBER_LIMIT).',
    parameters: {
      type: 'OBJECT',
      properties: {
        memberId: {
          type: 'STRING',
          description: 'Filter berdasarkan ID Member, contoh "MBR000008" (opsional).',
        },
        itemId: {
          type: 'STRING',
          description: 'Filter berdasarkan ID Item, contoh "PRL0098" (opsional).',
        },
      },
    },
  },
  {
    name: 'create_member_limit',
    description: 'Buat kuota batas limit pengambilan barang baru untuk member (MEMBER_LIMIT). Gunakan jika limit belum ada. Operasi administratif ini langsung dieksekusi ke backend GAS.',
    parameters: {
      type: 'OBJECT',
      properties: {
        memberId: {
          type: 'STRING',
          description: 'ID Member penerima kuota (wajib), misalnya "MBR000008".',
        },
        itemId: {
          type: 'STRING',
          description: 'ID Item barang (wajib), misalnya "PRL0098".',
        },
        maxQty: {
          type: 'NUMBER',
          description: 'Batas kuota maksimal pengambilan barang (wajib).',
        },
        satuan: {
          type: 'STRING',
          description: 'Satuan barang (opsional, misalnya "box", "pcs", "roll").',
        },
        status: {
          type: 'STRING',
          description: 'Status limit: "AKTIF" atau "NONAKTIF" (default "AKTIF").',
        },
      },
      required: ['memberId', 'itemId', 'maxQty'],
    },
  },
  {
    name: 'update_member_limit',
    description: 'Ubah kuota batas limit pengambilan barang member yang sudah terdaftar (berdasarkan ID_LIMIT). Operasi administratif ini langsung dieksekusi ke backend GAS.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limitId: {
          type: 'STRING',
          description: 'ID Limit yang ingin diubah (wajib), misalnya "LIM000001".',
        },
        maxQty: {
          type: 'NUMBER',
          description: 'Batas kuota maksimal baru (wajib).',
        },
        satuan: {
          type: 'STRING',
          description: 'Satuan barang baru (opsional).',
        },
        status: {
          type: 'STRING',
          description: 'Status limit baru: "AKTIF" atau "NONAKTIF" (opsional).',
        },
      },
      required: ['limitId', 'maxQty'],
    },
  },
  {
    name: 'activate_member_limit',
    description: 'Aktifkan kembali limit kuota member (status menjadi AKTIF). Operasi administratif ini langsung dieksekusi ke backend GAS.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limitId: {
          type: 'STRING',
          description: 'ID Limit yang ingin diaktifkan (wajib), misalnya "LIM000001".',
        },
      },
      required: ['limitId'],
    },
  },
  {
    name: 'deactivate_member_limit',
    description: 'Nonaktifkan limit kuota member (status menjadi NONAKTIF). Operasi administratif ini langsung dieksekusi ke backend GAS.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limitId: {
          type: 'STRING',
          description: 'ID Limit yang ingin dinonaktifkan (wajib), misalnya "LIM000001".',
        },
      },
      required: ['limitId'],
    },
  },
  {
    name: 'get_bincard',
    description: 'Ambil kartu stok mutasi pergerakan barang (BIN_CARD) untuk audit dan rekam jejak saldo masuk/keluar.',
    parameters: {
      type: 'OBJECT',
      properties: {
        itemId: {
          type: 'STRING',
          description: 'ID Item barang (wajib), misalnya "PRL0098".',
        },
      },
      required: ['itemId'],
    },
  },
  {
    name: 'get_member_history',
    description: 'Ambil riwayat pengambilan barang seorang member (MEMBER_HISTORY).',
    parameters: {
      type: 'OBJECT',
      properties: {
        memberId: {
          type: 'STRING',
          description: 'ID Member (wajib), misalnya "MBR000008".',
        },
      },
      required: ['memberId'],
    },
  },
  {
    name: 'check_pickup_eligibility',
    description: 'Validasi kelayakan member mengambil barang berdasarkan sisa limit dan tanggal masa pakai barang.',
    parameters: {
      type: 'OBJECT',
      properties: {
        memberId: {
          type: 'STRING',
          description: 'ID Member (wajib).',
        },
        itemId: {
          type: 'STRING',
          description: 'ID Item (wajib).',
        },
        qty: {
          type: 'NUMBER',
          description: 'Jumlah barang yang ingin diambil (default: 1).',
        },
      },
      required: ['memberId', 'itemId'],
    },
  },
  {
    name: 'get_pending_requests',
    description: 'Ambil daftar pengajuan early pickup / permohonan barang yang berstatus MENUNGGU persetujuan admin. Diurutkan dari yang paling lama/tertua. Output memuat ID_PENGAJUAN, TANGGAL, NAMA_MEMBER, NAMA_ITEM, JUMLAH, dan ALASAN.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'approve_requests',
    description: 'Setujui satu atau beberapa pengajuan yang berstatus MENUNGGU di backend. Menyetujui pengajuan otomatis mencatat transaksi BARANG_KELUAR (stok barang fisik akan berkurang). HANYA panggil setelah meminta dan menerima konfirmasi eksplisit dari pengguna.',
    parameters: {
      type: 'OBJECT',
      properties: {
        requestIds: {
          type: 'ARRAY',
          description: 'Daftar ID_PENGAJUAN yang akan disetujui (misal: ["REQ0001", "REQ0002"]). Minimal 1 ID.',
          items: {
            type: 'STRING',
          },
        },
        note: {
          type: 'STRING',
          description: 'Catatan approver / persetujuan (opsional).',
        },
      },
      required: ['requestIds'],
    },
  },
  {
    name: 'reject_requests',
    description: 'Tolak satu atau beberapa pengajuan yang berstatus MENUNGGU di backend. HANYA panggil setelah meminta dan menerima konfirmasi eksplisit dari pengguna. Sangat disarankan menyertakan catatan (note) alasan penolakan.',
    parameters: {
      type: 'OBJECT',
      properties: {
        requestIds: {
          type: 'ARRAY',
          description: 'Daftar ID_PENGAJUAN yang akan ditolak (misal: ["REQ0001"]). Minimal 1 ID.',
          items: {
            type: 'STRING',
          },
        },
        note: {
          type: 'STRING',
          description: 'Catatan alasan penolakan pengajuan.',
        },
      },
      required: ['requestIds'],
    },
  },
  {
    name: 'get_requests',
    description: 'Ambil daftar riwayat pengajuan early pickup / permohonan khusus dengan filter status atau member.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: 'Filter status (misal "MENUNGGU", "DISETUJUI", "DITOLAK", "ALL").',
        },
        memberId: {
          type: 'STRING',
          description: 'Filter berdasarkan ID Member (opsional).',
        },
      },
    },
  },
  {
    name: 'get_system_health',
    description: 'Cek status koneksi aplikasi GudangV2 ke Google Apps Script dan Google Spreadsheet.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'propose_transaction',
    description: 'Siapkan draft konfirmasi pergerakan barang fisik (BARANG_MASUK, BARANG_KELUAR, PINJAM, KEMBALI) sebelum dieksekusi resmi ke backend oleh pengguna.',
    parameters: {
      type: 'OBJECT',
      properties: {
        type: {
          type: 'STRING',
          description: 'Jenis transaksi: BARANG_MASUK | BARANG_KELUAR | PINJAM | KEMBALI.',
        },
        itemId: {
          type: 'STRING',
          description: 'ID Item barang (misal "PRL0098").',
        },
        jumlah: {
          type: 'NUMBER',
          description: 'Jumlah fisik barang.',
        },
        memberId: {
          type: 'STRING',
          description: 'ID Member (wajib untuk BARANG_KELUAR dan PINJAM).',
        },
        keterangan: {
          type: 'STRING',
          description: 'Catatan / keperluan transaksi.',
        },
        noDokumen: {
          type: 'STRING',
          description: 'Nomor surat jalan / referensi dokumen fisik.',
        },
        items: {
          type: 'ARRAY',
          description: 'Daftar barang untuk transaksi MULTI-ITEM (satu member, banyak barang sekaligus). Setiap entri berisi itemId dan jumlah. Jika diisi dan valid, parameter itemId/jumlah tunggal diabaikan.',
          items: {
            type: 'OBJECT',
            properties: {
              itemId: {
                type: 'STRING',
                description: 'ID Item barang (misal "PRL0098").',
              },
              jumlah: {
                type: 'NUMBER',
                description: 'Jumlah fisik barang.',
              },
            },
            required: ['itemId', 'jumlah'],
          },
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'propose_request',
    description: 'Siapkan draft konfirmasi pengajuan early pickup jika pengambilan barang belum memenuhi syarat masa pakai.',
    parameters: {
      type: 'OBJECT',
      properties: {
        memberId: {
          type: 'STRING',
          description: 'ID Member yang mengajukan.',
        },
        itemId: {
          type: 'STRING',
          description: 'ID Item yang diajukan.',
        },
        jumlah: {
          type: 'NUMBER',
          description: 'Jumlah barang yang diajukan.',
        },
        alasan: {
          type: 'STRING',
          description: 'Alasan pengajuan pengambilan lebih awal (wajib).',
        },
      },
      required: ['memberId', 'itemId', 'jumlah', 'alasan'],
    },
  },
];

/**
 * Execute AI warehouse tools directly against GudangV2 API services with structured results
 */
export async function executeAITool(
  name: string,
  args: Record<string, unknown>
): Promise<StructuredToolResult> {
  try {
    switch (name) {
      case 'check_stock': {
        const stocks = await api.getStock();
        const query = typeof args.query === 'string' ? args.query.trim() : '';
        const lowStockOnly = Boolean(args.lowStockOnly);

        let filtered = stocks;
        if (query) {
          const byId = stocks.filter((s) => s.idItem.toLowerCase() === query.toLowerCase());
          filtered = byId.length > 0
            ? byId
            : fuzzyMatchItems(query, stocks, (s) => `${s.namaItem} ${s.kategori || ''}`);
        }
        if (lowStockOnly) {
          filtered = filtered.filter((s) => s.stok <= s.minStok || s.isLowStock);
        }

        const items = filtered.slice(0, 15).map((s) => ({
          id: s.idItem,
          nama: s.namaItem,
          kategori: s.kategori,
          stok: s.stok,
          minStok: s.minStok,
          satuan: s.satuan,
          lokasi: s.lokasi,
          statusStok: s.status,
          isLowStock: s.isLowStock,
        }));

        return {
          success: true,
          data: {
            total: filtered.length,
            items,
          },
        };
      }

      case 'get_items': {
        const items = await api.getItems();
        const query = typeof args.query === 'string' ? args.query.trim() : '';
        let filtered = items;
        if (query) {
          // ID exact match dulu, lalu fuzzy pada nama + kategori (toleransi typo)
          const byId = items.filter((i) => i.ID_ITEM.toLowerCase() === query.toLowerCase());
          filtered = byId.length > 0
            ? byId
            : fuzzyMatchItems(query, items, (i) => `${i.NAMA_ITEM} ${i.KATEGORI || ''}`);
        }

        const mapped = filtered.slice(0, 15).map((i) => ({
          id: i.ID_ITEM,
          nama: i.NAMA_ITEM,
          kategori: i.KATEGORI,
          satuan: i.SATUAN,
          lokasi: i.LOKASI,
          masaPakaiBulan: i.MASA_PAKAI_BULAN,
          status: i.STATUS,
        }));

        return {
          success: true,
          data: {
            total: filtered.length,
            items: mapped,
          },
        };
      }

      case 'get_daily_summary': {
        const rawTanggal = typeof args.tanggal === 'string' ? args.tanggal.trim().toLowerCase() : '';
        const jenisFilter = typeof args.jenis === 'string' ? args.jenis.trim().toUpperCase() : 'KELUAR';

        // Parse tanggal
        const today = new Date();
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        let targetDate: string;
        if (!rawTanggal || rawTanggal === 'hari ini' || rawTanggal === 'today') {
          targetDate = fmt(today);
        } else if (rawTanggal === 'kemarin' || rawTanggal === 'yesterday') {
          const y = new Date(today);
          y.setDate(y.getDate() - 1);
          targetDate = fmt(y);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawTanggal)) {
          targetDate = rawTanggal;
        } else {
          return { success: false, errorCode: 'INVALID_INPUT', message: 'Format tanggal tidak dikenali. Gunakan YYYY-MM-DD, "hari ini", atau "kemarin".' };
        }

        const KELUAR_TYPES = ['BARANG_KELUAR', 'PINJAM'];
        const MASUK_TYPES = ['BARANG_MASUK', 'KEMBALI'];
        let allowedTypes: string[];
        if (jenisFilter === 'MASUK') allowedTypes = MASUK_TYPES;
        else if (jenisFilter === 'SEMUA') allowedTypes = [...KELUAR_TYPES, ...MASUK_TYPES, 'SALDO_AWAL', 'PENYESUAIAN'];
        else allowedTypes = KELUAR_TYPES;

        const allTx = await api.getTransactions();
        const filtered = allTx.filter((t) => {
          const tDate = String(t.TANGGAL || '').slice(0, 10);
          return tDate === targetDate && allowedTypes.includes(String(t.JENIS_TRANSAKSI).toUpperCase());
        });

        // Agregat per barang
        const agg = new Map<string, { nama: string; satuan: string; totalQty: number; count: number; pinjamQty: number; keluarQty: number }>();
        for (const t of filtered) {
          const key = t.ID_ITEM;
          const cur = agg.get(key) || { nama: t.NAMA_ITEM || t.ID_ITEM, satuan: t.SATUAN || '', totalQty: 0, count: 0, pinjamQty: 0, keluarQty: 0 };
          const qty = Number(t.JUMLAH || 0);
          cur.totalQty += qty;
          cur.count += 1;
          if (String(t.JENIS_TRANSAKSI).toUpperCase() === 'PINJAM') cur.pinjamQty += qty;
          else cur.keluarQty += qty;
          agg.set(key, cur);
        }

        const items = [...agg.entries()]
          .map(([id, v]) => ({ idItem: id, ...v }))
          .sort((a, b) => b.totalQty - a.totalQty);

        return {
          success: true,
          data: {
            tanggal: targetDate,
            totalTransaksi: filtered.length,
            totalBarang: items.length,
            items: items.slice(0, 30),
          },
        };
      }

      case 'get_pending_returns': {
        const allTx = await api.getTransactions();
        // PINJAM yang belum ada KEMBALI untuk member+item yang sama (FIFO sederhana)
        const pinjam = allTx.filter((t) => String(t.JENIS_TRANSAKSI).toUpperCase() === 'PINJAM');
        const kembali = allTx.filter((t) => String(t.JENIS_TRANSAKSI).toUpperCase() === 'KEMBALI');
        const kembaliQty = new Map<string, number>();
        for (const t of kembali) {
          const key = `${t.ID_MEMBER || ''}|${t.ID_ITEM}`;
          kembaliQty.set(key, (kembaliQty.get(key) || 0) + Number(t.JUMLAH || 0));
        }
        const pending: Array<Record<string, unknown>> = [];
        const pinjamAgg = new Map<string, { nama: string; namaMember: string; tanggal: string; qty: number }>();
        for (const t of pinjam) {
          const key = `${t.ID_MEMBER || ''}|${t.ID_ITEM}`;
          const cur = pinjamAgg.get(key) || { nama: t.NAMA_ITEM || t.ID_ITEM, namaMember: t.NAMA_MEMBER || t.ID_MEMBER || '-', tanggal: String(t.TANGGAL || '').slice(0, 10), qty: 0 };
          cur.qty += Number(t.JUMLAH || 0);
          if (String(t.TANGGAL || '').slice(0, 10) < cur.tanggal) cur.tanggal = String(t.TANGGAL || '').slice(0, 10);
          pinjamAgg.set(key, cur);
        }
        const today = new Date();
        for (const [key, v] of pinjamAgg) {
          const ret = kembaliQty.get(key) || 0;
          const sisa = v.qty - ret;
          if (sisa > 0) {
            const tglPinjam = new Date(v.tanggal);
            const hari = isNaN(tglPinjam.getTime()) ? '-' : Math.floor((today.getTime() - tglPinjam.getTime()) / 86400000);
            pending.push({ member: v.namaMember, barang: v.nama, sisaPinjam: sisa, tanggalPinjam: v.tanggal, hariBerlalu: hari });
          }
        }
        pending.sort((a, b) => Number(b.hariBerlalu || 0) - Number(a.hariBerlalu || 0));
        return { success: true, data: { total: pending.length, items: pending.slice(0, 30) } };
      }

      case 'get_usage_average': {
        const query = typeof args.query === 'string' ? args.query.trim() : '';
        const periode = typeof args.periode === 'string' && args.periode.toLowerCase() === 'bulan' ? 'bulan' : 'minggu';
        const allTx = await api.getTransactions();
        const keluar = allTx.filter((t) => ['BARANG_KELUAR', 'PINJAM'].includes(String(t.JENIS_TRANSAKSI).toUpperCase()));
        if (keluar.length === 0) return { success: true, data: { items: [], note: 'Belum ada data transaksi keluar.' } };
        // Rentang waktu data
        const dates = keluar.map((t) => String(t.TANGGAL || '').slice(0, 10)).filter(Boolean).sort();
        const spanHari = dates.length > 1
          ? Math.max(1, Math.floor((new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / 86400000) + 1)
          : 1;
        const pembagi = periode === 'bulan' ? spanHari / 30 : spanHari / 7;
        const agg = new Map<string, { nama: string; satuan: string; total: number }>();
        for (const t of keluar) {
          const cur = agg.get(t.ID_ITEM) || { nama: t.NAMA_ITEM || t.ID_ITEM, satuan: t.SATUAN || '', total: 0 };
          cur.total += Number(t.JUMLAH || 0);
          agg.set(t.ID_ITEM, cur);
        }
        let items = [...agg.entries()].map(([id, v]) => ({
          idItem: id, nama: v.nama,
          rataRata: Math.round((v.total / Math.max(pembagi, 0.1)) * 100) / 100,
          satuan: `${v.satuan} per ${periode}`,
          totalPeriode: v.total,
        }));
        if (query) items = fuzzyMatchItems(query, items, (i) => i.nama).slice(0, 15);
        items.sort((a, b) => b.rataRata - a.rataRata);
        return { success: true, data: { periode, rentangHari: spanHari, items: items.slice(0, 20) } };
      }

      case 'get_member_recap': {
        const query = typeof args.query === 'string' ? args.query.trim() : '';
        if (!query) return { success: false, errorCode: 'MISSING_PARAMETER', message: 'Parameter query (nama member) wajib diisi.' };
        const members = await api.getMembers();
        const matched = fuzzyMatchItems(query, members, (m) => m.NAMA_MEMBER);
        if (matched.length === 0) return { success: true, data: { members: [], note: 'Member tidak ditemukan.' } };
        const allTx = await api.getTransactions();
        const result = matched.slice(0, 5).map((m) => {
          const tx = allTx.filter((t) => t.ID_MEMBER === m.ID_MEMBER && ['BARANG_KELUAR', 'PINJAM'].includes(String(t.JENIS_TRANSAKSI).toUpperCase()));
          const agg = new Map<string, { nama: string; qty: number; terakhir: string }>();
          for (const t of tx) {
            const cur = agg.get(t.ID_ITEM) || { nama: t.NAMA_ITEM || t.ID_ITEM, qty: 0, terakhir: '' };
            cur.qty += Number(t.JUMLAH || 0);
            const tg = String(t.TANGGAL || '').slice(0, 10);
            if (tg > cur.terakhir) cur.terakhir = tg;
            agg.set(t.ID_ITEM, cur);
          }
          return {
            nama: m.NAMA_MEMBER, idMember: m.ID_MEMBER, jabatan: m.JABATAN || '',
            totalTransaksi: tx.length,
            barang: [...agg.values()].sort((a, b) => b.qty - a.qty).slice(0, 15),
          };
        });
        return { success: true, data: { members: result } };
      }

      case 'get_top_items': {
        const periode = typeof args.periode === 'string' ? args.periode.toLowerCase() : 'bulan';
        const limit = Math.min(Math.max(Number(args.limit || 10), 1), 30);
        const today = new Date();
        let startDate: Date;
        if (periode === 'hari') startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        else if (periode === 'minggu') { startDate = new Date(today); startDate.setDate(startDate.getDate() - 7); }
        else { startDate = new Date(today); startDate.setMonth(startDate.getMonth() - 1); }
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const start = fmt(startDate);
        const allTx = await api.getTransactions();
        const agg = new Map<string, { nama: string; satuan: string; qty: number; count: number }>();
        for (const t of allTx) {
          const tg = String(t.TANGGAL || '').slice(0, 10);
          if (tg >= start && ['BARANG_KELUAR', 'PINJAM'].includes(String(t.JENIS_TRANSAKSI).toUpperCase())) {
            const cur = agg.get(t.ID_ITEM) || { nama: t.NAMA_ITEM || t.ID_ITEM, satuan: t.SATUAN || '', qty: 0, count: 0 };
            cur.qty += Number(t.JUMLAH || 0);
            cur.count += 1;
            agg.set(t.ID_ITEM, cur);
          }
        }
        const items = [...agg.entries()]
          .map(([id, v]) => ({ idItem: id, ...v }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, limit);
        return { success: true, data: { periode, items } };
      }

      case 'find_duplicate_members': {
        const members = await api.getMembers();
        const aktif = members.filter((m) => String(m.STATUS).toUpperCase() === 'AKTIF');
        const groups = new Map<string, typeof aktif>();
        for (const m of aktif) {
          const key = normalizeName(m.NAMA_MEMBER);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(m);
        }
        // Juga cek kemiripan antar nama berbeda (skor >= 0.85)
        const dupGroups: Array<{ namaNormal: string; members: Array<{ id: string; nama: string; jabatan: string }> }> = [];
        for (const [key, list] of groups) {
          if (list.length > 1) {
            dupGroups.push({ namaNormal: key, members: list.map((m) => ({ id: m.ID_MEMBER, nama: m.NAMA_MEMBER, jabatan: m.JABATAN || '' })) });
          }
        }
        return { success: true, data: { totalGrup: dupGroups.length, groups: dupGroups.slice(0, 20) } };
      }

      case 'deactivate_member': {
        const memberId = String(args.memberId || '').trim();
        if (!memberId) return { success: false, errorCode: 'MISSING_PARAMETER', message: 'Parameter memberId wajib diisi.' };
        const res = await api.updateMember({ idMember: memberId, status: 'NONAKTIF' });
        return { success: true, message: `Member ${memberId} telah dinonaktifkan.`, data: res };
      }

      case 'get_product_knowledge': {
        const items = await api.getItems();
        const query = typeof args.query === 'string' ? args.query.toLowerCase().trim() : '';
        if (!query) {
          return { success: false, errorCode: 'MISSING_PARAMETER', message: 'Parameter query wajib diisi.' };
        }
        const filtered = fuzzyMatchItems(query, items, (i) => `${i.NAMA_ITEM} ${i.KATEGORI || ''}`);
        const mapped = filtered.slice(0, 5).map((i) => ({
          nama: i.NAMA_ITEM,
          kategori: i.KATEGORI,
          caraPakai: i.CARA_PAKAI || '',
          takaran: i.TAKARAN || '',
          perhatian: i.PERHATIAN || '',
        }));
        return {
          success: true,
          data: { total: filtered.length, items: mapped },
        };
      }

      case 'get_members': {
        const members = await api.getMembers();
        const query = typeof args.query === 'string' ? args.query.toLowerCase().trim() : '';
        let filtered = members;
        if (query) {
          filtered = filtered.filter(
            (m) =>
              m.NAMA_MEMBER.toLowerCase().includes(query) ||
              m.ID_MEMBER.toLowerCase().includes(query) ||
              (m.JABATAN && m.JABATAN.toLowerCase().includes(query))
          );
        }

        const mapped = filtered.slice(0, 15).map((m) => ({
          id: m.ID_MEMBER,
          nama: m.NAMA_MEMBER,
          jabatan: m.JABATAN,
          noHp: m.NO_HP || '-',
          status: m.STATUS,
        }));

        return {
          success: true,
          data: {
            total: filtered.length,
            members: mapped,
          },
        };
      }

      case 'get_member_limits': {
        const limits = await api.getLimits();
        const memberId = typeof args.memberId === 'string' ? args.memberId.trim().toUpperCase() : '';
        const itemId = typeof args.itemId === 'string' ? args.itemId.trim().toUpperCase() : '';

        let filtered = limits;
        if (memberId) {
          filtered = filtered.filter((l) => l.ID_MEMBER.toUpperCase() === memberId);
        }
        if (itemId) {
          filtered = filtered.filter((l) => l.ID_ITEM.toUpperCase() === itemId);
        }

        return {
          success: true,
          data: {
            total: filtered.length,
            limits: filtered.slice(0, 15).map((l) => ({
              idLimit: l.ID_LIMIT,
              memberId: l.ID_MEMBER,
              itemId: l.ID_ITEM,
              maxQty: l.MAX_QTY,
              satuan: l.SATUAN,
              status: l.STATUS,
            })),
          },
        };
      }

      case 'create_member_limit': {
        const memberId = String(args.memberId || '').trim();
        const itemId = String(args.itemId || '').trim();
        const maxQty = Number(args.maxQty || 0);
        const satuan = typeof args.satuan === 'string' && args.satuan.trim() ? args.satuan.trim() : undefined;
        const status = (args.status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF') as 'AKTIF' | 'NONAKTIF';

        const missing: string[] = [];
        if (!memberId) missing.push('memberId');
        if (!itemId) missing.push('itemId');
        if (maxQty <= 0) missing.push('maxQty');

        if (missing.length > 0) {
          return {
            success: false,
            errorCode: 'MISSING_PARAMETER',
            message: `Parameter limit belum lengkap (${missing.join(', ')}). Mohon lengkapi data member, item, dan jumlah maxQty.`,
            missing,
          };
        }

        // Check if limit already exists to prevent duplicate creation
        try {
          const existingLimits = await api.getLimits();
          const existing = existingLimits.find(
            (l) =>
              l.ID_MEMBER.toUpperCase() === memberId.toUpperCase() &&
              l.ID_ITEM.toUpperCase() === itemId.toUpperCase()
          );
          if (existing) {
            return {
              success: false,
              errorCode: 'LIMIT_ALREADY_EXISTS',
              message: `Limit untuk member ${memberId} dan barang ${itemId} sudah ada dengan ID_LIMIT "${existing.ID_LIMIT}" (kuota saat ini: ${existing.MAX_QTY} ${existing.SATUAN || ''}, status: ${existing.STATUS}). Jangan buat duplikat.`,
              data: {
                existingLimit: {
                  idLimit: existing.ID_LIMIT,
                  memberId: existing.ID_MEMBER,
                  itemId: existing.ID_ITEM,
                  maxQty: existing.MAX_QTY,
                  satuan: existing.SATUAN,
                  status: existing.STATUS,
                },
              },
            };
          }
        } catch {
          // Proceed
        }

        const res = await api.createLimit({
          memberId,
          itemId,
          maxQty,
          satuan,
          status,
        });

        const createdId = res.ID_LIMIT || (res as any)?.idLimit;

        return {
          success: true,
          message: `Limit member berhasil dibuat untuk ${memberId} - ${itemId} dengan kuota ${maxQty} ${satuan || ''}.`,
          idLimit: createdId,
          data: {
            idLimit: createdId,
            memberId,
            itemId,
            maxQty,
            satuan,
            status,
          },
        };
      }

      case 'update_member_limit': {
        const limitId = String(args.limitId || '').trim();
        const maxQty = Number(args.maxQty || 0);
        const satuan = typeof args.satuan === 'string' && args.satuan.trim() ? args.satuan.trim() : undefined;
        const status = args.status ? ((args.status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF') as 'AKTIF' | 'NONAKTIF') : undefined;

        const missing: string[] = [];
        if (!limitId) missing.push('limitId');
        if (maxQty <= 0) missing.push('maxQty');

        if (missing.length > 0) {
          return {
            success: false,
            errorCode: 'MISSING_PARAMETER',
            message: `Parameter update limit belum lengkap (${missing.join(', ')}).`,
            missing,
          };
        }

        const res = await api.updateLimit({
          limitId,
          maxQty,
          satuan,
          status,
        });

        return {
          success: true,
          message: `Limit member ${limitId} berhasil diperbarui menjadi ${maxQty} ${satuan || ''}.`,
          idLimit: limitId,
          data: {
            idLimit: limitId,
            maxQty,
            satuan,
            status,
            result: res,
          },
        };
      }

      case 'activate_member_limit': {
        const limitId = String(args.limitId || '').trim();
        if (!limitId) {
          return {
            success: false,
            errorCode: 'MISSING_PARAMETER',
            message: 'Parameter limitId wajib diisi.',
            missing: ['limitId'],
          };
        }

        const res = await api.activateLimit(limitId);
        return {
          success: true,
          message: `Limit member ${limitId} berhasil diaktifkan.`,
          idLimit: limitId,
          data: res,
        };
      }

      case 'deactivate_member_limit': {
        const limitId = String(args.limitId || '').trim();
        if (!limitId) {
          return {
            success: false,
            errorCode: 'MISSING_PARAMETER',
            message: 'Parameter limitId wajib diisi.',
            missing: ['limitId'],
          };
        }

        const res = await api.deactivateLimit(limitId);
        return {
          success: true,
          message: `Limit member ${limitId} berhasil dinonaktifkan.`,
          idLimit: limitId,
          data: res,
        };
      }

      case 'get_bincard': {
        const itemId = String(args.itemId || '').trim();
        if (!itemId) {
          return {
            success: false,
            errorCode: 'MISSING_PARAMETER',
            message: 'ID Barang (itemId) wajib disertakan.',
            missing: ['itemId'],
          };
        }
        const bincard = await api.getBinCard(itemId);
        return {
          success: true,
          data: {
            item: bincard.item,
            saldoAwal: bincard.saldoAwal,
            saldoAkhir: bincard.saldoAkhir,
            totalTransaksi: bincard.count,
            transaksiTerakhir: bincard.rows.slice(-5).reverse(),
          },
        };
      }

      case 'get_member_history': {
        const memberId = String(args.memberId || '').trim();
        if (!memberId) {
          return {
            success: false,
            errorCode: 'MISSING_PARAMETER',
            message: 'ID Member (memberId) wajib disertakan.',
            missing: ['memberId'],
          };
        }
        const history = await api.getMemberHistory(memberId);
        return {
          success: true,
          data: {
            member: history.member,
            totalTransaksi: history.totalTransaksi,
            totalQty: history.totalQty,
            bulanIniQty: history.currentMonthQty,
            ringkasanBarang: history.items,
            transaksiTerbaru: history.transactions.slice(0, 5),
          },
        };
      }

      case 'check_pickup_eligibility': {
        const memberId = String(args.memberId || '').trim();
        const itemId = String(args.itemId || '').trim();
        const qty = Number(args.qty || 1);

        if (!memberId || !itemId) {
          return {
            success: false,
            errorCode: 'MISSING_PARAMETER',
            message: 'ID Member dan ID Item wajib disertakan untuk cek kelayakan.',
            missing: [!memberId ? 'memberId' : '', !itemId ? 'itemId' : ''].filter(Boolean),
          };
        }

        const eligibility = await api.getPickupEligibility(memberId, itemId, qty);
        return {
          success: true,
          data: {
            allowed: eligibility.allowed,
            early: eligibility.early,
            reason: eligibility.reason,
            maxQty: eligibility.maxQty,
            masaPakaiBulan: eligibility.masaPakaiBulan,
            dueDate: eligibility.dueDate,
            lastPickupDate: eligibility.lastPickupDate,
          },
        };
      }

      case 'get_pending_requests': {
        const rawRequests = await api.getRequests({ status: 'MENUNGGU' });
        const pending = rawRequests
          .filter((r) => String(r.STATUS || '').toUpperCase() === 'MENUNGGU')
          .sort((a, b) => {
            const ta = a.TIMESTAMP || a.TANGGAL || '';
            const tb = b.TIMESTAMP || b.TANGGAL || '';
            return ta.localeCompare(tb);
          });

        if (pending.length === 0) {
          return {
            success: true,
            message: 'Tidak ada pengajuan yang sedang menunggu persetujuan.',
            data: {
              total: 0,
              requests: [],
            },
          };
        }

        const mapped = pending.map((r) => ({
          ID_PENGAJUAN: r.ID_PENGAJUAN,
          TANGGAL: r.TANGGAL,
          NAMA_MEMBER: r.NAMA_MEMBER || r.ID_MEMBER,
          NAMA_ITEM: r.NAMA_ITEM || r.ID_ITEM,
          JUMLAH: r.JUMLAH,
          ALASAN: r.ALASAN,
          STATUS: r.STATUS,
        }));

        return {
          success: true,
          data: {
            total: mapped.length,
            requests: mapped,
          },
        };
      }

      case 'approve_requests': {
        const rawIds = args.requestIds;
        const requestIds = Array.isArray(rawIds)
          ? rawIds.map((id) => String(id).trim()).filter(Boolean)
          : typeof rawIds === 'string' && rawIds.trim()
          ? [rawIds.trim()]
          : [];

        if (requestIds.length === 0) {
          return {
            success: false,
            errorCode: 'MISSING_PARAMETER',
            message: 'Parameter requestIds wajib diisi (minimal 1 ID_PENGAJUAN).',
            missing: ['requestIds'],
          };
        }

        const note = typeof args.note === 'string' ? args.note.trim() : undefined;
        const results: Array<{ id: string; ok: boolean; message?: string; error?: string }> = [];

        for (const id of requestIds) {
          try {
            const res = await api.approveRequest({ requestId: id, note });
            results.push({
              id,
              ok: true,
              message: res.message || `Pengajuan ${id} berhasil disetujui dan transaksi BARANG_KELUAR telah dicatat.`,
            });
          } catch (err: unknown) {
            results.push({
              id,
              ok: false,
              error: err instanceof Error ? err.message : 'Gagal menyetujui pengajuan.',
            });
          }
        }

        const successCount = results.filter((r) => r.ok).length;
        const failCount = results.filter((r) => !r.ok).length;

        return {
          success: successCount > 0,
          message: `${successCount} dari ${requestIds.length} pengajuan berhasil disetujui.${failCount > 0 ? ` (${failCount} gagal)` : ''}`,
          data: {
            total: requestIds.length,
            successCount,
            failCount,
            results,
          },
        };
      }

      case 'reject_requests': {
        const rawIds = args.requestIds;
        const requestIds = Array.isArray(rawIds)
          ? rawIds.map((id) => String(id).trim()).filter(Boolean)
          : typeof rawIds === 'string' && rawIds.trim()
          ? [rawIds.trim()]
          : [];

        if (requestIds.length === 0) {
          return {
            success: false,
            errorCode: 'MISSING_PARAMETER',
            message: 'Parameter requestIds wajib diisi (minimal 1 ID_PENGAJUAN).',
            missing: ['requestIds'],
          };
        }

        const note = typeof args.note === 'string' ? args.note.trim() : undefined;
        const results: Array<{ id: string; ok: boolean; message?: string; error?: string }> = [];

        for (const id of requestIds) {
          try {
            const res = await api.rejectRequest({ requestId: id, note });
            results.push({
              id,
              ok: true,
              message: res.message || `Pengajuan ${id} berhasil ditolak.`,
            });
          } catch (err: unknown) {
            results.push({
              id,
              ok: false,
              error: err instanceof Error ? err.message : 'Gagal menolak pengajuan.',
            });
          }
        }

        const successCount = results.filter((r) => r.ok).length;
        const failCount = results.filter((r) => !r.ok).length;

        return {
          success: successCount > 0,
          message: `${successCount} dari ${requestIds.length} pengajuan berhasil ditolak.${failCount > 0 ? ` (${failCount} gagal)` : ''}`,
          data: {
            total: requestIds.length,
            successCount,
            failCount,
            results,
          },
        };
      }

      case 'get_requests': {
        const status = typeof args.status === 'string' ? args.status.trim() : undefined;
        const memberId = typeof args.memberId === 'string' ? args.memberId.trim() : undefined;
        const requests = await api.getRequests({ status, memberId });
        return {
          success: true,
          data: {
            total: requests.length,
            requests: requests.slice(0, 20).map((r) => ({
              id: r.ID_PENGAJUAN,
              tanggal: r.TANGGAL,
              memberId: r.ID_MEMBER,
              namaMember: r.NAMA_MEMBER || r.ID_MEMBER,
              itemId: r.ID_ITEM,
              namaItem: r.NAMA_ITEM || r.ID_ITEM,
              jumlah: r.JUMLAH,
              alasan: r.ALASAN,
              status: r.STATUS,
              catatanApprover: r.CATATAN_APPROVER,
            })),
          },
        };
      }

      case 'get_system_health': {
        const health = await api.checkHealth();
        return {
          success: true,
          data: {
            status: health.status,
            version: health.version,
            spreadsheetId: health.spreadsheetId,
            sheetsFound: health.sheetsFound,
            latencyMs: health.latencyMs,
            error: health.error,
          },
        };
      }

      case 'propose_transaction': {
        const type = String(args.type || '').toUpperCase() as AIConfirmationType;
        const memberId = typeof args.memberId === 'string' ? args.memberId.trim() : '';
        const keterangan = typeof args.keterangan === 'string' ? args.keterangan.trim() : '';
        const noDokumen = typeof args.noDokumen === 'string' ? args.noDokumen.trim() : '';
        const tanggal = new Date().toISOString().slice(0, 10);

        // Kumpulkan daftar item: dukung multi-item via args.items, fallback ke itemId/jumlah tunggal.
        type DraftItem = { itemId: string; jumlah: number };
        let draftItems: DraftItem[] = [];
        if (Array.isArray(args.items) && args.items.length > 0) {
          for (const it of args.items as Array<Record<string, unknown>>) {
            const iid = String(it?.itemId || '').trim();
            const qty = Number(it?.jumlah || 0);
            if (iid && qty > 0) draftItems.push({ itemId: iid, jumlah: qty });
          }
        }
        if (draftItems.length === 0) {
          const itemId = String(args.itemId || '').trim();
          const jumlah = Number(args.jumlah || 0);
          if (itemId && jumlah > 0) draftItems.push({ itemId, jumlah });
        }

        if (!type || draftItems.length === 0) {
          return {
            success: false,
            errorCode: 'MISSING_PARAMETER',
            message: 'Parameter type dan daftar barang (items array atau itemId+jumlah) wajib diisi untuk draf transaksi.',
            missing: [!type ? 'type' : '', draftItems.length === 0 ? 'items/itemId+jumlah' : ''].filter(Boolean),
          };
        }

        let memberName = memberId;
        const itemCatalog = new Map<string, { name: string; satuan: string }>();

        try {
          const [items, members] = await Promise.all([api.getItems(), api.getMembers()]);
          for (const it of items) {
            itemCatalog.set(it.ID_ITEM.toUpperCase(), {
              name: it.NAMA_ITEM,
              satuan: it.SATUAN || 'item',
            });
          }
          if (memberId) {
            const matchedMember = members.find((m) => m.ID_MEMBER.toUpperCase() === memberId.toUpperCase());
            if (matchedMember) {
              memberName = `${matchedMember.NAMA_MEMBER} (${matchedMember.JABATAN || 'Member'})`;
            }
          }
        } catch {
          // Safe fallback
        }

        // Resolve nama/satuan tiap item + cek kelayakan per item untuk transaksi keluar.
        const eligibilityNotes: string[] = [];
        const resolvedItems = await Promise.all(
          draftItems.map(async (d) => {
            const cat = itemCatalog.get(d.itemId.toUpperCase());
            const itemName = cat?.name || d.itemId;
            const satuan = cat?.satuan || 'item';
            if ((type === 'BARANG_KELUAR' || type === 'PINJAM') && memberId) {
              try {
                const el = await api.getPickupEligibility(memberId, d.itemId, d.jumlah);
                if (!el.allowed) {
                  eligibilityNotes.push(`${itemName}: ${el.reason || 'melebihi limit atau belum memenuhi masa pakai.'}`);
                }
              } catch {
                // ignore
              }
            }
            return { itemId: d.itemId, itemName, jumlah: d.jumlah, satuan };
          })
        );

        const eligibilityNote = eligibilityNotes.length > 0 ? `Perhatian: ${eligibilityNotes.join(' ')}` : '';
        const isMulti = resolvedItems.length > 1;

        const confirmation: AIConfirmationData = {
          id: `conf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type,
          title: `Konfirmasi Transaksi ${type.replace('_', ' ')}${isMulti ? ` (${resolvedItems.length} barang)` : ''}`,
          description: eligibilityNote || undefined,
          details: [
            { label: 'Jenis Transaksi', value: type, highlight: true },
            ...(isMulti
              ? resolvedItems.map((ri, idx) => ({
                  label: `Barang ${idx + 1}`,
                  value: `${ri.itemName} [${ri.itemId}] — ${ri.jumlah} ${ri.satuan}`,
                  highlight: true,
                }))
              : [
                  { label: 'Barang', value: `${resolvedItems[0].itemName} [${resolvedItems[0].itemId}]` },
                  { label: 'Jumlah', value: `${resolvedItems[0].jumlah} ${resolvedItems[0].satuan}`, highlight: true },
                ]),
            ...(memberId ? [{ label: 'Member', value: `${memberName} [${memberId}]` }] : []),
            ...(keterangan ? [{ label: 'Keterangan', value: keterangan }] : []),
            ...(noDokumen ? [{ label: 'No. Dokumen', value: noDokumen }] : []),
            { label: 'Tanggal', value: tanggal },
          ],
          items: resolvedItems,
          rawInput: {
            type,
            items: resolvedItems.map((ri) => ({ itemId: ri.itemId, jumlah: ri.jumlah })),
            memberId,
            keterangan,
            noDokumen,
            tanggal,
          },
          status: 'pending',
        };

        return {
          success: true,
          message: isMulti
            ? `Draft transaksi multi-item (${resolvedItems.length} barang) telah dibuat dan menunggu konfirmasi pengguna.`
            : 'Draft transaksi telah dibuat dan menunggu konfirmasi pengguna.',
          data: {
            status: 'PROPOSED',
            details: confirmation.details,
            warning: eligibilityNote || undefined,
          },
          confirmation,
        };
      }

      case 'propose_request': {
        const memberId = String(args.memberId || '').trim();
        const itemId = String(args.itemId || '').trim();
        const jumlah = Number(args.jumlah || 1);
        const alasan = String(args.alasan || '').trim();

        if (!memberId || !itemId || !alasan) {
          return {
            success: false,
            errorCode: 'MISSING_PARAMETER',
            message: 'Parameter memberId, itemId, dan alasan wajib disertakan untuk pengajuan early pickup.',
            missing: [!memberId ? 'memberId' : '', !itemId ? 'itemId' : '', !alasan ? 'alasan' : ''].filter(Boolean),
          };
        }

        let itemName = itemId;
        let memberName = memberId;
        try {
          const [items, members] = await Promise.all([api.getItems(), api.getMembers()]);
          const matchedItem = items.find((i) => i.ID_ITEM.toUpperCase() === itemId.toUpperCase());
          if (matchedItem) itemName = matchedItem.NAMA_ITEM;
          const matchedMember = members.find((m) => m.ID_MEMBER.toUpperCase() === memberId.toUpperCase());
          if (matchedMember) memberName = `${matchedMember.NAMA_MEMBER} (${matchedMember.JABATAN || 'Member'})`;
        } catch {
          // fallback
        }

        const confirmation: AIConfirmationData = {
          id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'REQUEST',
          title: 'Konfirmasi Pengajuan Early Pickup',
          details: [
            { label: 'Member', value: `${memberName} [${memberId}]` },
            { label: 'Barang', value: `${itemName} [${itemId}]` },
            { label: 'Jumlah', value: jumlah, highlight: true },
            { label: 'Alasan', value: alasan, highlight: true },
          ],
          rawInput: {
            memberId,
            itemId,
            jumlah,
            alasan,
          },
          status: 'pending',
        };

        return {
          success: true,
          message: 'Draft pengajuan early pickup telah disiapkan dan menunggu konfirmasi pengguna.',
          data: {
            status: 'PROPOSED',
            details: confirmation.details,
          },
          confirmation,
        };
      }

      default:
        return {
          success: false,
          errorCode: 'INVALID_INPUT',
          message: `Tool tidak dikenal: ${name}`,
        };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kegagalan saat mengeksekusi operasi tool.';
    return {
      success: false,
      errorCode: 'API_ERROR',
      message: errorMsg,
    };
  }
}

/**
 * Extract updated entity context from tool execution arguments and result
 */
export function extractEntitiesFromToolResult(
  toolName: string,
  args: Record<string, unknown>,
  result: StructuredToolResult,
  prevContext?: AIConversationContext
): AIConversationContext {
  const nextContext: AIConversationContext = {
    ...prevContext,
    recentEntities: {
      members: [...(prevContext?.recentEntities?.members || [])],
      items: [...(prevContext?.recentEntities?.items || [])],
    },
  };

  const addRecentMember = (m: { id: string; name: string; jabatan?: string }) => {
    const exists = nextContext.recentEntities?.members?.some((x) => x.id === m.id);
    if (!exists) {
      nextContext.recentEntities?.members?.unshift(m);
      if (nextContext.recentEntities?.members && nextContext.recentEntities.members.length > 8) {
        nextContext.recentEntities.members.pop();
      }
    }
  };

  const addRecentItem = (i: { id: string; name: string; satuan?: string }) => {
    const exists = nextContext.recentEntities?.items?.some((x) => x.id === i.id);
    if (!exists) {
      nextContext.recentEntities?.items?.unshift(i);
      if (nextContext.recentEntities?.items && nextContext.recentEntities.items.length > 8) {
        nextContext.recentEntities.items.pop();
      }
    }
  };

  if (toolName === 'get_members' && result.success && result.data) {
    const members = (result.data as any).members || [];
    members.forEach((m: any) => addRecentMember({ id: m.id, name: m.nama, jabatan: m.jabatan }));
    if (members.length === 1) {
      nextContext.activeMember = {
        id: members[0].id,
        name: members[0].nama,
        jabatan: members[0].jabatan,
        divisi: members[0].divisi,
      };
    }
  }

  if ((toolName === 'get_items' || toolName === 'check_stock') && result.success && result.data) {
    const items = (result.data as any).items || [];
    items.forEach((i: any) => addRecentItem({ id: i.id, name: i.nama, satuan: i.satuan }));
    if (items.length === 1) {
      nextContext.activeItem = {
        id: items[0].id,
        name: items[0].nama,
        satuan: items[0].satuan,
        kategori: items[0].kategori,
        lokasi: items[0].lokasi,
        stok: items[0].stok,
      };
    }
  }

  if (toolName === 'create_member_limit' || toolName === 'update_member_limit') {
    if (result.success && result.data) {
      const d = result.data as any;
      if (d.memberId && d.itemId) {
        nextContext.activeLimit = {
          id: result.idLimit || d.idLimit,
          memberId: d.memberId,
          itemId: d.itemId,
          maxQty: d.maxQty,
          satuan: d.satuan,
          status: d.status,
        };
      }
    }
  }

  if (toolName === 'propose_transaction' && result.confirmation) {
    const raw = result.confirmation.rawInput;
    if (raw.memberId && typeof raw.memberId === 'string') {
      nextContext.activeMember = {
        id: raw.memberId,
        name: nextContext.activeMember?.id === raw.memberId ? nextContext.activeMember.name : raw.memberId,
      };
    }
    if (raw.itemId && typeof raw.itemId === 'string') {
      nextContext.activeItem = {
        id: raw.itemId,
        name: nextContext.activeItem?.id === raw.itemId ? nextContext.activeItem.name : raw.itemId,
      };
    }
  }

  return nextContext;
}
