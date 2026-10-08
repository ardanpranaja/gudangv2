import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  searchValue?: (item: T) => string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T | ((item: T) => string);
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  filterControls?: React.ReactNode;
  actions?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  searchPlaceholder = 'Cari data...',
  emptyTitle,
  emptyDescription,
  pageSize = 10,
  filterControls,
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter by search
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((item) => {
      for (const col of columns) {
        if (col.searchValue) {
          const sv = col.searchValue(item);
          if (sv !== undefined && sv !== null && String(sv).toLowerCase().includes(q)) return true;
        } else {
          const val = item[col.key];
          if (val !== undefined && val !== null && String(val).toLowerCase().includes(q)) {
            return true;
          }
        }
      }
      return false;
    });
  }, [data, search, columns]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let cmp = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB));
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getKey = (item: T, idx: number): string => {
    if (typeof keyField === 'function') {
      const k = keyField(item);
      return k ? `${k}-${idx}` : String(idx);
    }
    return item[keyField] !== undefined ? `${String(item[keyField])}-${idx}` : String(idx);
  };

  if (isError) {
    return <ErrorState error={errorMessage} onRetry={onRetry} />;
  }

  return (
    <div className="w-full bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 shadow-[4.5px_4.5px_0px_#18181b] overflow-hidden transition-colors">
      {/* Control bar */}
      <div className="p-3.5 border-b-2 border-stone-900 dark:border-stone-600 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-stone-100 dark:bg-stone-800/90">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-stone-700 dark:text-stone-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 rounded-lg shadow-[2px_2px_0px_#18181b] focus:shadow-[3px_3px_0px_#18181b] placeholder:text-stone-400 text-stone-900 dark:text-stone-100 font-medium transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterControls}
          {actions}
        </div>
      </div>

      {/* Table content */}
      {isLoading ? (
        <LoadingState rows={pageSize} />
      ) : sortedData.length === 0 ? (
        <div className="p-6">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-stone-900 dark:border-stone-600 bg-amber-50 dark:bg-stone-800 text-stone-950 dark:text-stone-100">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key, col.sortable)}
                      className={`px-4 py-3 text-xs font-black uppercase tracking-wider ${
                        col.sortable ? 'cursor-pointer hover:bg-amber-100 dark:hover:bg-stone-700 select-none' : ''
                      } ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${
                        col.className || ''
                      }`}
                    >
                      <div
                        className={`inline-flex items-center gap-1.5 ${
                          col.align === 'right' ? 'justify-end w-full' : col.align === 'center' ? 'justify-center w-full' : ''
                        }`}
                      >
                        <span>{col.header}</span>
                        {col.sortable && sortKey === col.key && (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-stone-950 dark:text-stone-100 stroke-[3] shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-stone-950 dark:text-stone-100 stroke-[3] shrink-0" />
                          )
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-xs text-stone-900 dark:text-stone-200">
                {paginatedData.map((item, idx) => (
                  <tr key={getKey(item, idx)} className="hover:bg-amber-50/40 dark:hover:bg-stone-800/60 transition-colors">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 ${
                          col.align === 'right' ? 'text-right tabular-nums font-mono' : col.align === 'center' ? 'text-center' : 'text-left'
                        } ${col.className || ''}`}
                      >
                        {col.render ? col.render(item) : String(item[col.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="px-4 py-3 border-t-2 border-stone-900 dark:border-stone-600 bg-stone-100 dark:bg-stone-800/90 flex items-center justify-between text-xs text-stone-700 dark:text-stone-300 font-medium">
            <div>
              Menampilkan{' '}
              <span className="font-black tabular-nums text-stone-950 dark:text-stone-100">
                {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
              </span>{' '}
              sampai{' '}
              <span className="font-black tabular-nums text-stone-950 dark:text-stone-100">
                {Math.min(currentPage * pageSize, sortedData.length)}
              </span>{' '}
              dari <span className="font-black tabular-nums text-stone-950 dark:text-stone-100">{sortedData.length}</span> data
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border-2 border-stone-900 dark:border-stone-400 bg-amber-300 hover:bg-amber-400 text-stone-950 font-bold shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
              <span className="px-2 font-mono font-bold tabular-nums text-stone-900 dark:text-stone-100">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border-2 border-stone-900 dark:border-stone-400 bg-amber-300 hover:bg-amber-400 text-stone-950 font-bold shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
