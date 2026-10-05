import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  subtitle,
  icon: Icon,
  variant = 'default',
  onClick,
}) => {
  let borderClass = 'border-slate-200 dark:border-slate-800';
  let valueColor = 'text-slate-900 dark:text-slate-100';

  if (variant === 'warning') {
    borderClass = 'border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/30';
    valueColor = 'text-amber-900 dark:text-amber-300';
  } else if (variant === 'danger') {
    borderClass = 'border-rose-200 dark:border-rose-800/60 bg-rose-50/30 dark:bg-rose-950/30';
    valueColor = 'text-rose-900 dark:text-rose-300';
  } else if (variant === 'success') {
    borderClass = 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/30';
    valueColor = 'text-emerald-900 dark:text-emerald-300';
  }

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`p-4 rounded-lg bg-white dark:bg-slate-900 border ${borderClass} flex flex-col justify-between text-left transition-all ${
        onClick ? 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-semibold tracking-tight tabular-nums font-mono ${valueColor}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{unit}</span>}
      </div>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-1">{subtitle}</p>}
    </Component>
  );
};
