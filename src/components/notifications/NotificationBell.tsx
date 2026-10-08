import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  X,
  AlertTriangle,
  Clock,
  FileCheck2,
  Package,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Check,
  Filter,
  Inbox,
} from 'lucide-react';
import { useNotifications, NotificationType, NotificationItem } from '../../hooks/useNotifications';
import { useApp } from '../../context/AppContext';

export const NotificationBell: React.FC = () => {
  const { navigateTo } = useApp();
  const {
    notifications,
    unreadCount,
    lowStockCount,
    overdueLoanCount,
    pendingRequestCount,
    isLoading,
    refresh,
    markAsRead,
    markAllAsRead,
    clearNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<NotificationType | 'ALL'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Filtered notifications
  const displayedNotifications = useMemo(() => {
    if (filterType === 'ALL') return notifications;
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  const handleActionClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    setIsOpen(false);
    navigateTo(notif.actionPage, notif.actionParams);
  };

  const getWhatsAppLink = (phone?: string, memberName?: string, itemName?: string, days?: number) => {
    if (!phone) return null;
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    const text = encodeURIComponent(
      `Halo Kak ${memberName || ''},\n\nMengingatkan terkait peminjaman barang gudang *${itemName || 'barang'}* yang dipinjam sejak beberapa waktu lalu (${days || 0} hari lalu). Mohon untuk segera dikembalikan ke bagian gudang jika sudah selesai digunakan.\n\nTerima kasih!`
    );
    return `https://wa.me/${clean}?text=${text}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-1.5 sm:p-2 rounded-lg border-2 border-stone-900 bg-amber-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-[2px_2px_0px_#18181b] hover:bg-amber-200 dark:hover:bg-stone-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center"
        aria-label="Notifikasi sistem"
        title={unreadCount > 0 ? `${unreadCount} notifikasi baru` : 'Pusat Notifikasi'}
      >
        <Bell className={`w-4 h-4 stroke-[2.5] ${unreadCount > 0 ? 'text-stone-950 dark:text-amber-400' : ''}`} />

        {/* Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-rose-500 text-stone-950 dark:text-stone-950 text-[10px] font-black rounded-full border-2 border-stone-900 flex items-center justify-center shadow-[1px_1px_0px_#18181b] animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] max-w-[calc(100vw-1.5rem)] z-50 bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-500 rounded-2xl shadow-[5px_5px_0px_#18181b] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-amber-300 dark:bg-stone-800 border-b-2 border-stone-900 dark:border-stone-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white dark:bg-stone-900 border-2 border-stone-900 flex items-center justify-center shadow-[1.5px_1.5px_0px_#18181b]">
                <Bell className="w-3.5 h-3.5 text-stone-950 dark:text-amber-400 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-stone-950 dark:text-stone-100 leading-none">
                  Notifikasi Sistem
                </h3>
                <p className="text-[11px] font-bold text-stone-800 dark:text-stone-400 mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} peringatan belum dibaca` : 'Semua sudah ditinjau'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Refresh button */}
              <button
                type="button"
                onClick={() => refresh()}
                disabled={isLoading}
                title="Perbarui notifikasi dari backend"
                className="p-1 rounded-md border-2 border-stone-900 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 shadow-[1.5px_1.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* Mark all as read */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Tandai semua sudah dibaca"
                  className="px-2 py-1 rounded-md border-2 border-stone-900 bg-emerald-300 hover:bg-emerald-400 text-stone-950 text-[11px] font-black shadow-[1.5px_1.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all inline-flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3 stroke-[2.5]" />
                  <span className="hidden sm:inline">Tandai Dibaca</span>
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md border-2 border-stone-900 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 hover:bg-rose-200 dark:hover:bg-rose-900 shadow-[1.5px_1.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                title="Tutup panel"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 bg-stone-100 dark:bg-stone-950 border-b-2 border-stone-900 dark:border-stone-700 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg border-2 border-stone-900 font-black transition-all shrink-0 ${
                filterType === 'ALL'
                  ? 'bg-amber-300 text-stone-950 shadow-[2px_2px_0px_#18181b]'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('LOW_STOCK')}
              className={`px-2.5 py-1 rounded-lg border-2 border-stone-900 font-black transition-all shrink-0 ${
                filterType === 'LOW_STOCK'
                  ? 'bg-rose-300 text-stone-950 shadow-[2px_2px_0px_#18181b]'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              Stok Menipis ({lowStockCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('OVERDUE_LOAN')}
              className={`px-2.5 py-1 rounded-lg border-2 border-stone-900 font-black transition-all shrink-0 ${
                filterType === 'OVERDUE_LOAN'
                  ? 'bg-cyan-300 text-stone-950 shadow-[2px_2px_0px_#18181b]'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              Pinjaman ({overdueLoanCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('PENDING_REQUEST')}
              className={`px-2.5 py-1 rounded-lg border-2 border-stone-900 font-black transition-all shrink-0 ${
                filterType === 'PENDING_REQUEST'
                  ? 'bg-purple-300 text-stone-950 shadow-[2px_2px_0px_#18181b]'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              Pengajuan ({pendingRequestCount})
            </button>
          </div>

          {/* List Content */}
          <div className="overflow-y-auto flex-1 divide-y-2 divide-stone-900/10 dark:divide-stone-700/40 max-h-[500px]">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
                <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                  Memeriksa stok fisik dan transaksi pinjaman...
                </p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-stone-800 border-2 border-stone-900 flex items-center justify-center shadow-[3px_3px_0px_#18181b] mb-3">
                  <Check className="w-6 h-6 text-emerald-600 stroke-[3]" />
                </div>
                <h4 className="text-sm font-black text-stone-900 dark:text-stone-100">
                  Tidak Ada Notifikasi Aktif
                </h4>
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mt-1 max-w-[260px]">
                  {filterType === 'ALL'
                    ? 'Seluruh stok di atas batas minimum dan tidak ada pinjaman yang tertunggak.'
                    : 'Tidak ada item dalam kategori ini saat ini.'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const waLink = getWhatsAppLink(
                  notif.data.memberPhone,
                  notif.data.namaMember,
                  notif.data.namaItem,
                  notif.elapsedDays
                );

                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 transition-colors relative ${
                      !notif.isRead
                        ? 'bg-amber-50/70 dark:bg-amber-950/20'
                        : 'bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Icon */}
                      <div
                        className={`w-8 h-8 rounded-lg border-2 border-stone-900 flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#18181b] ${
                          notif.type === 'LOW_STOCK'
                            ? notif.severity === 'danger'
                              ? 'bg-rose-400 text-stone-950'
                              : 'bg-amber-300 text-stone-950'
                            : notif.type === 'OVERDUE_LOAN'
                            ? notif.severity === 'danger'
                              ? 'bg-rose-400 text-stone-950'
                              : notif.severity === 'warning'
                              ? 'bg-amber-300 text-stone-950'
                              : 'bg-cyan-300 text-stone-950'
                            : 'bg-purple-300 text-stone-950'
                        }`}
                      >
                        {notif.type === 'LOW_STOCK' ? (
                          <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                        ) : notif.type === 'OVERDUE_LOAN' ? (
                          <Clock className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <FileCheck2 className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4
                              className={`text-xs font-black truncate max-w-[200px] sm:max-w-[240px] ${
                                !notif.isRead
                                  ? 'text-stone-950 dark:text-stone-100'
                                  : 'text-stone-700 dark:text-stone-300'
                              }`}
                            >
                              {notif.title}
                            </h4>
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0" />
                            )}
                          </div>

                          {/* Elapsed Badge */}
                          {notif.elapsedText && (
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.5 rounded border border-stone-900 shrink-0 ${
                                notif.severity === 'danger'
                                  ? 'bg-rose-200 text-rose-950'
                                  : notif.severity === 'warning'
                                  ? 'bg-amber-200 text-amber-950'
                                  : 'bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-200'
                              }`}
                            >
                              {notif.elapsedText}
                            </span>
                          )}
                        </div>

                        {/* Message */}
                        <p className="text-xs text-stone-800 dark:text-stone-200 font-medium mt-1 leading-snug">
                          {notif.message}
                        </p>

                        {/* Details */}
                        {notif.detail && (
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 font-bold mt-1">
                            {notif.detail}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            {/* Main CTA */}
                            <button
                              type="button"
                              onClick={() => handleActionClick(notif)}
                              className="px-2.5 py-1 text-xs font-black text-stone-950 bg-amber-300 hover:bg-amber-400 border-2 border-stone-900 rounded-lg shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all inline-flex items-center gap-1"
                            >
                              <span>{notif.actionLabel}</span>
                              <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                            </button>

                            {/* WhatsApp Button for Overdue Loans */}
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 text-xs font-black text-stone-950 bg-emerald-300 hover:bg-emerald-400 border-2 border-stone-900 rounded-lg shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all inline-flex items-center gap-1"
                                title="Ingatkan via WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3 stroke-[2.5]" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </a>
                            )}
                          </div>

                          {/* Secondary options: Mark read or clear */}
                          <div className="flex items-center gap-1">
                            {!notif.isRead && (
                              <button
                                type="button"
                                onClick={() => markAsRead(notif.id)}
                                className="p-1 text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white"
                                title="Tandai telah dibaca"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => clearNotification(notif.id)}
                              className="p-1 text-[11px] font-bold text-stone-400 hover:text-rose-600"
                              title="Sembunyikan peringatan ini"
                            >
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-stone-100 dark:bg-stone-950 border-t-2 border-stone-900 dark:border-stone-700 flex items-center justify-between text-[11px] font-bold text-stone-600 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Sinkronisasi otomatis aktif</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigateTo('dashboard');
              }}
              className="text-stone-900 dark:text-stone-200 hover:underline font-black"
            >
              Ke Ringkasan &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
