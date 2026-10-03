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

  let colorClasses = 'text-slate-600 bg-slate-100 border-slate-200';
  let Icon = Clock;

  switch (normalized) {
    case 'AKTIF':
    case 'SELESAI':
    case 'TERSEDIA':
    case 'BAIK':
      colorClasses = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      Icon = CheckCircle2;
      break;
    case 'DISETUJUI':
      colorClasses = 'text-blue-700 bg-blue-50 border-blue-200';
      Icon = CheckCircle2;
      break;
    case 'DIPROSES':
      colorClasses = 'text-orange-700 bg-orange-50 border-orange-200';
      Icon = Clock;
      break;
    case 'MENUNGGU':
    case 'SEDANG_DIGUNAKAN':
    case 'MAINTENANCE':
      colorClasses = 'text-amber-700 bg-amber-50 border-amber-200';
      Icon = AlertTriangle;
      break;
    case 'NONAKTIF':
    case 'DITOLAK':
    case 'DIBATALKAN':
    case 'RUSAK':
    case 'TIDAK_AKTIF':
      colorClasses = 'text-rose-700 bg-rose-50 border-rose-200';
      Icon = XCircle;
      break;
    case 'SM':
    case 'SPV':
    case 'TL':
      colorClasses = 'text-blue-700 bg-blue-50 border-blue-200';
      Icon = ShieldCheck;
      break;
    case 'CREW':
    case 'VENDOR':
      colorClasses = 'text-slate-700 bg-slate-100 border-slate-200';
      Icon = CheckCircle2;
      break;
    default:
      colorClasses = 'text-slate-700 bg-slate-50 border-slate-200';
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
