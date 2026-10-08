import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status?: string | null;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const rawStatus = status !== null && status !== undefined ? String(status).trim() : '';
  const displayStatus = rawStatus.length > 0 ? rawStatus : '-';
  const normalized = displayStatus.toUpperCase();

  let colorClasses = 'text-stone-950 bg-yellow-200 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b]';
  let Icon = Clock;

  switch (normalized) {
    case 'AKTIF':
    case 'SELESAI':
    case 'TERSEDIA':
    case 'BAIK':
      colorClasses = 'text-stone-950 bg-emerald-300 dark:bg-emerald-400 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b]';
      Icon = CheckCircle2;
      break;
    case 'DISETUJUI':
      colorClasses = 'text-stone-950 bg-sky-300 dark:bg-sky-400 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b]';
      Icon = CheckCircle2;
      break;
    case 'DIPROSES':
    case 'BARANG_MASUK':
    case 'MASUK':
      colorClasses = 'text-stone-950 bg-indigo-200 dark:bg-indigo-300 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b]';
      Icon = Clock;
      break;
    case 'MENUNGGU':
    case 'SEDANG_DIGUNAKAN':
    case 'MAINTENANCE':
    case 'PINJAM':
      colorClasses = 'text-stone-950 bg-amber-300 dark:bg-amber-400 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b]';
      Icon = AlertTriangle;
      break;
    case 'NONAKTIF':
    case 'DITOLAK':
    case 'DIBATALKAN':
    case 'RUSAK':
    case 'TIDAK_AKTIF':
    case 'BARANG_KELUAR':
    case 'KELUAR':
      colorClasses = 'text-stone-950 bg-rose-300 dark:bg-rose-400 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b]';
      Icon = XCircle;
      break;
    case 'SM':
    case 'SPV':
    case 'TL':
      colorClasses = 'text-stone-950 bg-purple-300 dark:bg-purple-400 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b]';
      Icon = ShieldCheck;
      break;
    case 'CREW':
    case 'VENDOR':
      colorClasses = 'text-stone-950 bg-stone-200 dark:bg-stone-300 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b]';
      Icon = CheckCircle2;
      break;
    default:
      colorClasses = 'text-stone-950 bg-yellow-200 dark:bg-yellow-300 border-2 border-stone-900 shadow-[2px_2px_0px_#18181b]';
      Icon = CheckCircle2;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-black rounded ${colorClasses} ${sizeClasses} whitespace-nowrap`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" aria-hidden="true" />
      <span className="tracking-tight">{displayStatus}</span>
    </span>
  );
};
