import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  kicker?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  kicker,
  actions,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 mb-6 border-b-2 border-stone-900 dark:border-stone-600">
      <div>
        {kicker && (
          <div className="mb-1.5">
            <span className="inline-block px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase bg-amber-300 text-stone-950 border-2 border-stone-900 rounded shadow-[1.5px_1.5px_0px_#18181b]">
              {kicker}
            </span>
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100 text-balance">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm font-medium text-stone-600 dark:text-stone-400 mt-1 max-w-2xl leading-normal">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
};
