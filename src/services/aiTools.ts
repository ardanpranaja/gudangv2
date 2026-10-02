import { api } from './api';
import { AIConfirmationData, AIConfirmationType } from '../types/ai';

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
    name: 'get_bincard',
    description: 'Ambil kartu stok (Bin Card) suatu barang untuk memeriksa riwayat pergerakan masuk/keluar, saldo awal, dan saldo akhir.',
    parameters: {
      type: 'OBJECT',
      properties: {
        itemId: {
          type: 'STRING',
          description: 'ID Barang wajib diisi, misalnya "PRL0098" atau "BRG000001".',
        },
      },
      required: ['itemId'],
    },
  },
  {
    name: 'get_member_history',
    description: 'Ambil riwayat pengambilan barang oleh member tertentu beserta akumulasi barang yang diambil.',
    parameters: {
      type: 'OBJECT',
      properties: {
        memberId: {
          type: 'STRING',
          description: 'ID Member wajib diisi, misalnya "MBR000008".',
        },
      },
      required: ['memberId'],
    },
  },
  {
    name: 'check_pickup_eligibility',
    description: 'Validasi kelayakan pengambilan barang oleh member berdasarkan kuota MAX_QTY dan masa pakai (early pickup). Mengembalikan status apakah boleh diambil atau perlu pengajuan.',
    parameters: {
      type: 'OBJECT',
      properties: {
        memberId: {
          type: 'STRING',
          description: 'ID Member, e.g. MBR000008.',
        },
        itemId: {
          type: 'STRING',
          description: 'ID Barang, e.g. PRL0098.',
        },
        qty: {
          type: 'NUMBER',
          description: 'Jumlah kuantitas yang ingin diambil.',
        },
      },
      required: ['memberId', 'itemId', 'qty'],
    },
  },
  {
    name: 'get_pending_requests',
    description: 'Ambil daftar pengajuan early pickup (Pengajuan Pengambilan).',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: 'Status filter: "MENUNGGU", "DISETUJUI", "DITOLAK", atau kosongkan untuk semua.',
        },
      },
    },
  },
  {
    name: 'get_system_health',
    description: 'Periksa status kesehatan koneksi sistem backend Google Apps Script dan Google Spreadsheet.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'propose_transaction',
    description: 'Siapkan draft transaksi baru (BARANG_MASUK, BARANG_KELUAR, PINJAM, KEMBALI) untuk diverifikasi dan dikonfirmasi langsung oleh user melalui antarmuka.',
    parameters: {
      type: 'OBJECT',
      properties: {
        type: {
          type: 'STRING',
          description: 'Jenis transaksi: "BARANG_MASUK", "BARANG_KELUAR", "PINJAM", atau "KEMBALI".',
        },
        itemId: {
          type: 'STRING',
          description: 'ID Item yang ditransaksikan.',
        },
        jumlah: {
          type: 'NUMBER',
          description: 'Jumlah kuantitas transaksi.',
        },
        memberId: {
          type: 'STRING',
          description: 'ID Member penerima/peminjam (wajib untuk BARANG_KELUAR, PINJAM, KEMBALI).',
        },
        keterangan: {
          type: 'STRING',
          description: 'Keterangan atau alasan transaksi.',
        },
        noDokumen: {
          type: 'STRING',
          description: 'Nomor dokumen referensi (opsional, jika ada surat jalan/bon).',
        },
      },
      required: ['type', 'itemId', 'jumlah'],
    },
  },
  {
    name: 'propose_request',
    description: 'Siapkan draft pengajuan early pickup (Pengajuan Pengambilan) saat pengambilan barang belum memenuhi masa pakai.',
    parameters: {
      type: 'OBJECT',
      properties: {
        memberId: {
          type: 'STRING',
          description: 'ID Member pemohon.',
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
          description: 'Alasan pengajuan pengambilan sebelum waktu jatuh tempo.',
        },
      },
      required: ['memberId', 'itemId', 'jumlah', 'alasan'],
    },
  },
];

export interface ToolExecutionResult {
  data: Record<string, unknown> | Array<unknown> | string | number | boolean;
  confirmation?: AIConfirmationData;
}

/**
 * Executes a tool on the client side using the authoritative api.ts service.
 */
export async function executeAITool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolExecutionResult> {
  switch (name) {
    case 'check_stock': {
      const stockList = await api.getStock();
      const query = typeof args.query === 'string' ? args.query.toLowerCase().trim() : '';
      const lowStockOnly = Boolean(args.lowStockOnly);

      let filtered = stockList;
      if (query) {
        filtered = filtered.filter(
          (s) =>
            s.namaItem.toLowerCase().includes(query) ||
            s.idItem.toLowerCase().includes(query) ||
            (s.kategori && s.kategori.toLowerCase().includes(query)) ||
            (s.lokasi && s.lokasi.toLowerCase().includes(query))
        );
      }
      if (lowStockOnly) {
        filtered = filtered.filter((s) => s.isLowStock);
      }

      const result = filtered.slice(0, 15).map((s) => ({
        idItem: s.idItem,
        namaItem: s.namaItem,
        kategori: s.kategori,
        satuan: s.satuan,
        stok: s.stok,
        minStok: s.minStok,
        statusStok: s.isLowStock ? 'MENIPIS' : 'AMAN',
        lokasi: s.lokasi,
      }));

      return {
        data: {
          totalDitemukan: filtered.length,
          ditampilkan: result.length,
          items: result,
        },
      };
    }

    case 'get_items': {
      const items = await api.getItems();
      const query = typeof args.query === 'string' ? args.query.toLowerCase().trim() : '';
      let filtered = items;
      if (query) {
        filtered = filtered.filter(
          (i) =>
            i.NAMA_ITEM.toLowerCase().includes(query) ||
            i.ID_ITEM.toLowerCase().includes(query) ||
            (i.KATEGORI && i.KATEGORI.toLowerCase().includes(query))
        );
      }

      return {
        data: {
          total: filtered.length,
          items: filtered.slice(0, 15).map((i) => ({
            id: i.ID_ITEM,
            nama: i.NAMA_ITEM,
            kategori: i.KATEGORI,
            satuan: i.SATUAN,
            lokasi: i.LOKASI,
            masaPakaiBulan: i.MASA_PAKAI_BULAN,
            status: i.STATUS,
          })),
        },
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

      return {
        data: {
          total: filtered.length,
          members: filtered.slice(0, 15).map((m) => ({
            id: m.ID_MEMBER,
            nama: m.NAMA_MEMBER,
            jabatan: m.JABATAN,
            noHp: m.NO_HP || '-',
            status: m.STATUS,
          })),
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

    case 'get_bincard': {
      const itemId = String(args.itemId || '').trim();
      if (!itemId) {
        return { data: { error: 'ID Barang wajib disertakan.' } };
      }
      const bincard = await api.getBinCard(itemId);
      return {
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
        return { data: { error: 'ID Member wajib disertakan.' } };
      }
      const history = await api.getMemberHistory(memberId);
      return {
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

      const eligibility = await api.getPickupEligibility(memberId, itemId, qty);
      return {
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
      const requests = await api.getRequests();
      const status = typeof args.status === 'string' ? args.status.trim().toUpperCase() : '';
      let filtered = requests;
      if (status) {
        filtered = filtered.filter((r) => r.STATUS.toUpperCase() === status);
      }
      return {
        data: {
          total: filtered.length,
          requests: filtered.slice(0, 10).map((r) => ({
            id: r.ID_PENGAJUAN,
            tanggal: r.TANGGAL,
            memberId: r.ID_MEMBER,
            itemId: r.ID_ITEM,
            jumlah: r.JUMLAH,
            alasan: r.ALASAN,
            status: r.STATUS,
          })),
        },
      };
    }

    case 'get_system_health': {
      const health = await api.checkHealth();
      return {
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
      const itemId = String(args.itemId || '').trim();
      const jumlah = Number(args.jumlah || 1);
      const memberId = typeof args.memberId === 'string' ? args.memberId.trim() : '';
      const keterangan = typeof args.keterangan === 'string' ? args.keterangan.trim() : '';
      const noDokumen = typeof args.noDokumen === 'string' ? args.noDokumen.trim() : '';
      const tanggal = new Date().toISOString().slice(0, 10);

      // Validate metadata lookup
      let itemName = itemId;
      let satuan = 'item';
      let memberName = memberId;

      try {
        const [items, members] = await Promise.all([api.getItems(), api.getMembers()]);
        const matchedItem = items.find((i) => i.ID_ITEM === itemId);
        if (matchedItem) {
          itemName = matchedItem.NAMA_ITEM;
          satuan = matchedItem.SATUAN || 'item';
        }
        if (memberId) {
          const matchedMember = members.find((m) => m.ID_MEMBER === memberId);
          if (matchedMember) {
            memberName = `${matchedMember.NAMA_MEMBER} (${matchedMember.JABATAN || 'Member'})`;
          }
        }
      } catch {
        // Safe fallback
      }

      // Pre-check eligibility if BARANG_KELUAR
      let eligibilityNote = '';
      if (type === 'BARANG_KELUAR' && memberId) {
        try {
          const el = await api.getPickupEligibility(memberId, itemId, jumlah);
          if (!el.allowed) {
            eligibilityNote = `Perhatian: ${el.reason || 'Pengambilan melebihi limit atau belum memenuhi masa pakai.'}`;
          }
        } catch {
          // ignore precheck failure
        }
      }

      const confirmation: AIConfirmationData = {
        id: `conf-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type,
        title: `Konfirmasi Transaksi ${type.replace('_', ' ')}`,
        description: eligibilityNote || undefined,
        details: [
          { label: 'Jenis Transaksi', value: type, highlight: true },
          { label: 'Barang', value: `${itemName} [${itemId}]` },
          { label: 'Jumlah', value: `${jumlah} ${satuan}`, highlight: true },
          ...(memberId ? [{ label: 'Member', value: `${memberName} [${memberId}]` }] : []),
          ...(keterangan ? [{ label: 'Keterangan', value: keterangan }] : []),
          ...(noDokumen ? [{ label: 'No. Dokumen', value: noDokumen }] : []),
          { label: 'Tanggal', value: tanggal },
        ],
        rawInput: {
          type,
          itemId,
          jumlah,
          memberId,
          keterangan,
          noDokumen,
          tanggal,
        },
        status: 'pending',
      };

      return {
        data: {
          status: 'PROPOSED',
          message: 'Draft transaksi telah dibuat dan menunggu konfirmasi pengguna.',
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

      let itemName = itemId;
      let memberName = memberId;
      try {
        const [items, members] = await Promise.all([api.getItems(), api.getMembers()]);
        const matchedItem = items.find((i) => i.ID_ITEM === itemId);
        if (matchedItem) itemName = matchedItem.NAMA_ITEM;
        const matchedMember = members.find((m) => m.ID_MEMBER === memberId);
        if (matchedMember) memberName = `${matchedMember.NAMA_MEMBER} (${matchedMember.JABATAN || 'Member'})`;
      } catch {
        // fallback
      }

      const confirmation: AIConfirmationData = {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
        data: {
          status: 'PROPOSED',
          message: 'Draft pengajuan early pickup telah disiapkan dan menunggu konfirmasi pengguna.',
          details: confirmation.details,
        },
        confirmation,
      };
    }

    default:
      throw new Error(`Tool tidak dikenal: ${name}`);
  }
}
