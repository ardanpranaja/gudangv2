import { api } from './api';
import {
  AIConfirmationData,
  AIConfirmationType,
  StructuredToolResult,
  AIConversationContext,
} from '../types/ai';

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
    description: 'Ambil daftar pengajuan early pickup / permohonan khusus (PENGAJUAN) yang membutuhkan persetujuan admin.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: 'Filter status (misal "MENUNGGU", "DISETUJUI", "DITOLAK").',
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
        const query = typeof args.query === 'string' ? args.query.toLowerCase().trim() : '';
        const lowStockOnly = Boolean(args.lowStockOnly);

        let filtered = stocks;
        if (query) {
          filtered = filtered.filter(
            (s) =>
              s.namaItem.toLowerCase().includes(query) ||
              s.idItem.toLowerCase().includes(query) ||
              (s.kategori && s.kategori.toLowerCase().includes(query))
          );
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
        const requests = await api.getRequests();
        const status = typeof args.status === 'string' ? args.status.trim().toUpperCase() : '';
        let filtered = requests;
        if (status) {
          filtered = filtered.filter((r) => r.STATUS.toUpperCase() === status);
        }
        return {
          success: true,
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
