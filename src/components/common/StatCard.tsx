import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'warning' | 'danger' | 'success' | 'purple' | 'cyan';
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
  // Neo-Brutalist Color Config
  let cardBg = 'bg-cyan-50/70 dark:bg-cyan-950/30';
  let iconBoxBg = 'bg-cyan-300 dark:bg-cyan-400 text-stone-950';
  let valueColor = 'text-stone-900 dark:text-stone-100';

  if (variant === 'warning') {
    cardBg = 'bg-amber-50/80 dark:bg-amber-950/30';
    iconBoxBg = 'bg-amber-300 dark:bg-amber-400 text-stone-950';
    valueColor = 'text-amber-950 dark:text-amber-300';
  } else if (variant === 'danger') {
    cardBg = 'bg-rose-50/80 dark:bg-rose-950/30';
    iconBoxBg = 'bg-rose-300 dark:bg-rose-400 text-stone-950';
    valueColor = 'text-rose-950 dark:text-rose-300';
  } else if (variant === 'success') {
    cardBg = 'bg-emerald-50/80 dark:bg-emerald-950/30';
    iconBoxBg = 'bg-emerald-300 dark:bg-emerald-400 text-stone-950';
    valueColor = 'text-emerald-950 dark:text-emerald-300';
  } else if (variant === 'purple') {
    cardBg = 'bg-purple-50/80 dark:bg-purple-950/30';
    iconBoxBg = 'bg-purple-300 dark:bg-purple-400 text-stone-950';
    valueColor = 'text-purple-950 dark:text-purple-300';
  }

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`p-4 rounded-lg border-2 border-stone-900 dark:border-stone-400 shadow-[4px_4px_0px_#18181b] flex flex-col justify-between text-left transition-all ${cardBg} ${
        onClick
          ? 'cursor-pointer hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[5.5px_5.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1.5px_1.5px_0px_#18181b]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-bold text-stone-700 dark:text-stone-300 tracking-tight">
          {label}
        </span>
        {Icon && (
          <div className={`p-1.5 rounded border-2 border-stone-900 dark:border-stone-900 shadow-[2px_2px_0px_#18181b] shrink-0 ${iconBoxBg}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-black tracking-tight tabular-nums font-mono ${valueColor}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs font-bold text-stone-600 dark:text-stone-400">
            {unit}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] font-medium text-stone-600 dark:text-stone-400 mt-2 line-clamp-1">
          {subtitle}
        </p>
      )}
    </Component>
  );
};
