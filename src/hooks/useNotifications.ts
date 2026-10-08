import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { useApp, PageId } from '../context/AppContext';
import { MasterMember, ItemStock, Transaksi, PengajuanPengambilan } from '../types';

export type NotificationType = 'LOW_STOCK' | 'OVERDUE_LOAN' | 'PENDING_REQUEST';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  detail?: string;
  timestamp: string;
  elapsedDays?: number;
  elapsedText?: string;
  severity: 'danger' | 'warning' | 'info';
  isRead: boolean;
  actionPage: PageId;
  actionParams?: Record<string, any>;
  actionLabel: string;
  data: {
    itemId?: string;
    namaItem?: string;
    satuan?: string;
    currentStock?: number;
    minStock?: number;
    memberId?: string;
    namaMember?: string;
    memberPhone?: string;
    memberDept?: string;
    memberFloor?: string;
    tanggalPinjam?: string;
    sisaPinjam?: number;
    requestId?: string;
    requestQty?: number;
  };
}

export interface UseNotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
  lowStockCount: number;
  overdueLoanCount: number;
  pendingRequestCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
}

const STORAGE_KEY_READ_NOTIFS = 'kegudangaja_read_notifications';
const STORAGE_KEY_DISMISSED = 'kegudangaja_dismissed_notifications';

export const useNotifications = (): UseNotificationsResult => {
  const { refreshKey, role } = useApp();
  const [rawNotifications, setRawNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Read set persisted in localStorage
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_READ_NOTIFS);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Dismissed IDs
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DISMISSED);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const saveReadIds = (newSet: Set<string>) => {
    setReadIds(new Set(newSet));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_READ_NOTIFS, JSON.stringify(Array.from(newSet)));
      } catch {
        // ignore
      }
    }
  };

  const saveDismissedIds = (newSet: Set<string>) => {
    setDismissedIds(new Set(newSet));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(Array.from(newSet)));
      } catch {
        // ignore
      }
    }
  };

  const loadNotificationsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch concurrently
      const [stocksData, membersData, txData, reqData] = await Promise.allSettled([
        api.getStock(),
        api.getMembers(),
        api.getTransactions(),
        api.getRequests(),
      ]);

      const stocks: ItemStock[] = stocksData.status === 'fulfilled' ? stocksData.value : [];
      const members: MasterMember[] = membersData.status === 'fulfilled' ? membersData.value : [];
      const transactions: Transaksi[] = txData.status === 'fulfilled' ? txData.value : [];
      const requests: PengajuanPengambilan[] = reqData.status === 'fulfilled' ? reqData.value : [];

      const memberMap = new Map<string, MasterMember>();
      members.forEach((m) => memberMap.set(m.ID_MEMBER, m));

      const generated: NotificationItem[] = [];

      // -------------------------------------------------------------
      // 1. STOK MENIPIS & STOK HABIS
      // -------------------------------------------------------------
      for (const item of stocks) {
        if (item.isLowStock || item.stok <= item.minStok) {
          const isZero = item.stok <= 0;
          const notifId = `low-stock-${item.idItem}`;

          generated.push({
            id: notifId,
            type: 'LOW_STOCK',
            title: isZero ? `Stok Habis: ${item.namaItem}` : `Stok Menipis: ${item.namaItem}`,
            message: isZero
              ? `Stok saat ini kosong (0 ${item.satuan}). Batas minimum: ${item.minStok} ${item.satuan}.`
              : `Sisa ${item.stok} ${item.satuan} (Batas minimum: ${item.minStok} ${item.satuan}).`,
            detail: `Rak/Lokasi: ${item.lokasi || '-'} • Kategori: ${item.kategori}`,
            timestamp: new Date().toISOString(),
            elapsedText: isZero ? 'Kritis' : 'Menipis',
            severity: isZero ? 'danger' : 'warning',
            isRead: readIds.has(notifId),
            actionPage: 'stok',
            actionParams: { filter: 'LOW', search: item.namaItem },
            actionLabel: 'Lihat Stok',
            data: {
              itemId: item.idItem,
              namaItem: item.namaItem,
              satuan: item.satuan,
              currentStock: item.stok,
              minStock: item.minStok,
            },
          });
        }
      }

      // -------------------------------------------------------------
      // 2. PEMINJAMAN BELUM KEMBALI & TERLAMBAT
      // -------------------------------------------------------------
      const pinjamTxs = transactions.filter((t) => String(t.JENIS_TRANSAKSI).toUpperCase() === 'PINJAM');
      const kembaliTxs = transactions.filter((t) => String(t.JENIS_TRANSAKSI).toUpperCase() === 'KEMBALI');

      const kembaliMap = new Map<string, number>();
      for (const t of kembaliTxs) {
        const key = `${t.ID_MEMBER || ''}|${t.ID_ITEM}`;
        kembaliMap.set(key, (kembaliMap.get(key) || 0) + Number(t.JUMLAH || 0));
      }

      interface LoanAggregate {
        memberId: string;
        itemId: string;
        namaMember: string;
        namaItem: string;
        satuan: string;
        totalQty: number;
        earliestDate: string;
        docNos: string[];
      }

      const loanMap = new Map<string, LoanAggregate>();
      for (const t of pinjamTxs) {
        const key = `${t.ID_MEMBER || ''}|${t.ID_ITEM}`;
        const rawDate = String(t.TANGGAL || t.TIMESTAMP || '').slice(0, 10);
        const existing = loanMap.get(key);

        if (!existing) {
          loanMap.set(key, {
            memberId: t.ID_MEMBER || '',
            itemId: t.ID_ITEM,
            namaMember: t.NAMA_MEMBER || t.ID_MEMBER || 'Member',
            namaItem: t.NAMA_ITEM || t.ID_ITEM,
            satuan: t.SATUAN || 'UNIT',
            totalQty: Number(t.JUMLAH || 0),
            earliestDate: rawDate,
            docNos: t.NO_DOKUMEN ? [t.NO_DOKUMEN] : [],
          });
        } else {
          existing.totalQty += Number(t.JUMLAH || 0);
          if (rawDate && (!existing.earliestDate || rawDate < existing.earliestDate)) {
            existing.earliestDate = rawDate;
          }
          if (t.NO_DOKUMEN && !existing.docNos.includes(t.NO_DOKUMEN)) {
            existing.docNos.push(t.NO_DOKUMEN);
          }
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const [key, loan] of loanMap.entries()) {
        const returned = kembaliMap.get(key) || 0;
        const sisa = loan.totalQty - returned;

        if (sisa > 0) {
          const loanDate = loan.earliestDate ? new Date(loan.earliestDate) : new Date();
          loanDate.setHours(0, 0, 0, 0);
          const diffMs = today.getTime() - loanDate.getTime();
          const elapsedDays = isNaN(diffMs) ? 0 : Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

          const memberObj = memberMap.get(loan.memberId);
          const noHp = memberObj?.NO_HP || '';
          const jabatan = memberObj?.JABATAN || '';
          const lantai = memberObj?.LANTAI || '';

          const notifId = `loan-${key}`;
          const isOverdue = elapsedDays >= 3;
          const isCritical = elapsedDays >= 7;

          const elapsedText =
            elapsedDays === 0
              ? 'Hari ini'
              : elapsedDays === 1
              ? 'Kemarin (1 hari lalu)'
              : `${elapsedDays} hari lalu`;

          const detailParts: string[] = [];
          if (noHp) detailParts.push(`WA: ${noHp}`);
          if (jabatan) detailParts.push(`Jabatan: ${jabatan}`);
          if (lantai) detailParts.push(`Lt. ${lantai}`);
          if (loan.docNos.length > 0) detailParts.push(`Dok: ${loan.docNos[0]}`);

          generated.push({
            id: notifId,
            type: 'OVERDUE_LOAN',
            title: isCritical
              ? `Pinjaman Kritis: ${loan.namaMember}`
              : isOverdue
              ? `Pinjaman Terlambat: ${loan.namaMember}`
              : `Peminjaman Aktif: ${loan.namaMember}`,
            message: `${loan.namaItem} (${sisa} ${loan.satuan}) dipinjam sejak ${loan.earliestDate || '-'} (${elapsedText}).`,
            detail: detailParts.join(' • '),
            timestamp: loan.earliestDate || new Date().toISOString(),
            elapsedDays,
            elapsedText: isOverdue ? `Terlambat ${elapsedDays} hr` : elapsedText,
            severity: isCritical ? 'danger' : isOverdue ? 'warning' : 'info',
            isRead: readIds.has(notifId),
            actionPage: 'kembali',
            actionParams: { memberId: loan.memberId, itemId: loan.itemId },
            actionLabel: 'Proses Pengembalian',
            data: {
              memberId: loan.memberId,
              namaMember: loan.namaMember,
              memberPhone: noHp,
              memberDept: jabatan,
              memberFloor: lantai,
              itemId: loan.itemId,
              namaItem: loan.namaItem,
              satuan: loan.satuan,
              sisaPinjam: sisa,
              tanggalPinjam: loan.earliestDate,
            },
          });
        }
      }

      // -------------------------------------------------------------
      // 3. PENGAJUAN MENUNGGU PERSETUJUAN
      // -------------------------------------------------------------
      for (const req of requests) {
        const statusClean = String(req.STATUS || '').toUpperCase().trim();
        if (statusClean === 'MENUNGGU') {
          const notifId = `req-${req.ID_PENGAJUAN}`;
          const memberObj = memberMap.get(req.ID_MEMBER);

          generated.push({
            id: notifId,
            type: 'PENDING_REQUEST',
            title: `Pengajuan Menunggu: ${req.NAMA_MEMBER || req.ID_MEMBER}`,
            message: `Meminta ${req.JUMLAH} unit ${req.NAMA_ITEM || req.ID_ITEM}. Alasan: "${req.ALASAN || '-'}"`,
            detail: `No Pengajuan: ${req.ID_PENGAJUAN} • Tanggal: ${req.TANGGAL || '-'}`,
            timestamp: req.TANGGAL || new Date().toISOString(),
            elapsedText: 'Menunggu Review',
            severity: 'warning',
            isRead: readIds.has(notifId),
            actionPage: 'pengajuan',
            actionParams: { requestId: req.ID_PENGAJUAN },
            actionLabel: 'Review Pengajuan',
            data: {
              requestId: req.ID_PENGAJUAN,
              memberId: req.ID_MEMBER,
              namaMember: req.NAMA_MEMBER || memberObj?.NAMA_MEMBER,
              itemId: req.ID_ITEM,
              namaItem: req.NAMA_ITEM,
              requestQty: req.JUMLAH,
            },
          });
        }
      }

      setRawNotifications(generated);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat daftar notifikasi.');
    } finally {
      setIsLoading(false);
    }
  }, [readIds]);

  // Initial and refresh trigger
  useEffect(() => {
    loadNotificationsData();
  }, [refreshKey, role]);

  // Periodic polling every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotificationsData();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadNotificationsData]);

  // Filter out dismissed notifications and sort
  const notifications = useMemo(() => {
    return rawNotifications
      .filter((n) => !dismissedIds.has(n.id))
      .map((n) => ({
        ...n,
        isRead: readIds.has(n.id),
      }))
      .sort((a, b) => {
        // 1. Unread first
        if (!a.isRead && b.isRead) return -1;
        if (a.isRead && !b.isRead) return 1;

        // 2. Severity: danger > warning > info
        const sevOrder = { danger: 0, warning: 1, info: 2 };
        if (sevOrder[a.severity] !== sevOrder[b.severity]) {
          return sevOrder[a.severity] - sevOrder[b.severity];
        }

        // 3. Elapsed days desc (for loans)
        const aDays = a.elapsedDays || 0;
        const bDays = b.elapsedDays || 0;
        if (aDays !== bDays) return bDays - aDays;

        // 4. Timestamp desc
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [rawNotifications, readIds, dismissedIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const lowStockCount = useMemo(() => {
    return notifications.filter((n) => n.type === 'LOW_STOCK' && !n.isRead).length;
  }, [notifications]);

  const overdueLoanCount = useMemo(() => {
    return notifications.filter((n) => n.type === 'OVERDUE_LOAN' && !n.isRead).length;
  }, [notifications]);

  const pendingRequestCount = useMemo(() => {
    return notifications.filter((n) => n.type === 'PENDING_REQUEST' && !n.isRead).length;
  }, [notifications]);

  const markAsRead = useCallback(
    (id: string) => {
      const next = new Set(readIds);
      next.add(id);
      saveReadIds(next);
    },
    [readIds]
  );

  const markAllAsRead = useCallback(() => {
    const next = new Set(readIds);
    for (const n of notifications) {
      next.add(n.id);
    }
    saveReadIds(next);
  }, [notifications, readIds]);

  const clearNotification = useCallback(
    (id: string) => {
      const nextDismissed = new Set(dismissedIds);
      nextDismissed.add(id);
      saveDismissedIds(nextDismissed);
    },
    [dismissedIds]
  );

  return {
    notifications,
    unreadCount,
    lowStockCount,
    overdueLoanCount,
    pendingRequestCount,
    isLoading,
    error,
    refresh: loadNotificationsData,
    markAsRead,
    markAllAsRead,
    clearNotification,
  };
};
