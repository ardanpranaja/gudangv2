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

  let colorClasses = 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  let Icon = Clock;

  switch (normalized) {
    case 'AKTIF':
    case 'SELESAI':
    case 'TERSEDIA':
    case 'BAIK':
      colorClasses = 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
      Icon = CheckCircle2;
      break;
    case 'DISETUJUI':
      colorClasses = 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800';
      Icon = CheckCircle2;
      break;
    case 'DIPROSES':
      colorClasses = 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800';
      Icon = Clock;
      break;
    case 'MENUNGGU':
    case 'SEDANG_DIGUNAKAN':
    case 'MAINTENANCE':
      colorClasses = 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';
      Icon = AlertTriangle;
      break;
    case 'NONAKTIF':
    case 'DITOLAK':
    case 'DIBATALKAN':
    case 'RUSAK':
    case 'TIDAK_AKTIF':
      colorClasses = 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800';
      Icon = XCircle;
      break;
    case 'SM':
    case 'SPV':
    case 'TL':
      colorClasses = 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800';
      Icon = ShieldCheck;
      break;
    case 'CREW':
    case 'VENDOR':
      colorClasses = 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
      Icon = CheckCircle2;
      break;
    default:
      colorClasses = 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
      Icon = CheckCircle2;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border ${colorClasses} ${sizeClasses} whitespace-nowrap`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{displayStatus}</span>
    </span>
  );
};
