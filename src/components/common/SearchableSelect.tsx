import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  extra?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  emptyMessage?: string;
  size?: 'sm' | 'md';
  /** Bila true, trigger selalu tampil sebagai placeholder bersih (tanpa ID/nama/badge)
      walau sudah ada opsi terpilih. Untuk form crew yang menampilkan hasil di kartu terpisah. */
  minimalTrigger?: boolean;
  /** Bila true, badge ID (value) ditampilkan di samping label pada trigger & opsi dropdown.
      Default false — ID disembunyikan agar tampilan pencarian lebih rapi (hanya nama). */
  showId?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi...',
  searchPlaceholder = 'Ketik untuk mencari...',
  disabled = false,
  required = false,
  className = '',
  emptyMessage = 'Tidak ditemukan data yang cocok',
  size = 'md',
  minimalTrigger = false,
  showId = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Selected option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(query);
      const matchValue = opt.value.toLowerCase().includes(query);
      const matchSublabel = opt.sublabel ? opt.sublabel.toLowerCase().includes(query) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(query) : false;
      const matchExtra = opt.extra ? opt.extra.toLowerCase().includes(query) : false;
      return matchLabel || matchValue || matchSublabel || matchBadge || matchExtra;
    });
  }, [options, searchQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setFocusedIndex(-1);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const activeItem = listElement.children[focusedIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          const opt = filteredOptions[focusedIndex];
          if (!opt.disabled) {
            onChange(opt.value);
            setIsOpen(false);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (opt: SearchableSelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1.5 text-xs min-h-[32px]'
      : 'px-3 py-2 text-xs min-h-[38px]';

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for native form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          required={required}
          onChange={() => {}}
          tabIndex={-1}
          className="sr-only"
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full text-left bg-white dark:bg-stone-900 border-2 rounded-lg transition-all flex items-center justify-between gap-2 shadow-[2.5px_2.5px_0px_#18181b] ${sizeClasses} ${
          disabled
            ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border-stone-400 cursor-not-allowed shadow-none'
            : isOpen
            ? 'border-stone-900 dark:border-stone-300 ring-2 ring-amber-400 text-stone-950 dark:text-stone-100'
            : 'border-stone-900 dark:border-stone-500 hover:border-stone-950 text-stone-950 dark:text-stone-100'
        }`}
      >
        <div className="flex-1 truncate">
          {selectedOption && !minimalTrigger ? (
            <div className="flex items-center gap-2 truncate">
              {showId && (
                <span className="font-mono text-[11px] font-black text-stone-950 bg-amber-200 px-1.5 py-0.5 rounded border border-stone-900 shrink-0 shadow-[1px_1px_0px_#18181b]">
                  {selectedOption.value}
                </span>
              )}
              <span className="font-bold text-stone-950 dark:text-stone-100 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 border border-stone-900 shadow-[1px_1px_0px_#18181b] ${
                    selectedOption.badgeColor === 'green' || selectedOption.badgeColor === 'emerald'
                      ? 'bg-emerald-300 text-stone-950'
                      : selectedOption.badgeColor === 'red' || selectedOption.badgeColor === 'rose'
                      ? 'bg-rose-300 text-stone-950'
                      : selectedOption.badgeColor === 'blue'
                      ? 'bg-sky-300 text-stone-950'
                      : 'text-stone-950 bg-yellow-200'
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
              {selectedOption.sublabel && (
                <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate font-medium">
                  ({selectedOption.sublabel})
                </span>
              )}
            </div>
          ) : (
            <span className="text-stone-500 dark:text-stone-400 font-medium">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-stone-700 dark:text-stone-300 shrink-0">
          <ChevronDown
            className={`w-4 h-4 stroke-[2.5] transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-stone-950 dark:text-stone-100' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-400 rounded-xl shadow-[4.5px_4.5px_0px_#18181b] overflow-hidden animate-fadeIn min-w-[280px]">
          {/* Search Box */}
          <div className="p-2.5 border-b-2 border-stone-900 dark:border-stone-700 bg-amber-50/70 dark:bg-stone-800/80">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-2.5 text-stone-700 dark:text-stone-300 pointer-events-none stroke-[2.5]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-600 rounded-lg text-stone-950 dark:text-stone-100 font-bold placeholder:text-stone-400 shadow-[1.5px_1.5px_0px_#18181b] focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 text-stone-700 dark:text-stone-300 hover:text-stone-950 p-0.5"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              )}
            </div>
            {filteredOptions.length > 0 && (
              <div className="px-1 pt-1.5 text-[10px] text-stone-600 dark:text-stone-400 font-medium flex items-center justify-between">
                <span>Ditemukan {filteredOptions.length} data</span>
                <span className="italic font-bold">Gunakan ↑ ↓ dan Enter</span>
              </div>
            )}
          </div>

          {/* Options List */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto py-1 divide-y divide-stone-200 dark:divide-stone-700/80 text-xs"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-6 text-center text-stone-500 dark:text-stone-400">
                <Search className="w-6 h-6 mx-auto mb-1.5 text-stone-400 stroke-2" />
                <p className="font-bold text-stone-800 dark:text-stone-200">{emptyMessage}</p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-medium">
                  Coba gunakan kata kunci pencarian lain
                </p>
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isFocused = idx === focusedIndex;

                return (
                  <li
                    key={`${opt.value}-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed bg-stone-100 dark:bg-stone-800'
                        : isSelected
                        ? 'bg-amber-100 dark:bg-amber-950/60 font-bold text-stone-950 dark:text-stone-50'
                        : isFocused
                        ? 'bg-stone-100 dark:bg-stone-800 text-stone-950 dark:text-stone-100 font-medium'
                        : 'text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {showId && (
                          <span className="font-mono text-[11px] font-black text-stone-950 bg-stone-200 dark:bg-stone-700 px-1.5 py-0.2 rounded border border-stone-900 shrink-0 shadow-[1px_1px_0px_#18181b]">
                            {opt.value}
                          </span>
                        )}
                        <span className="font-bold text-stone-950 dark:text-stone-100 truncate">
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 border border-stone-900 shadow-[1px_1px_0px_#18181b] ${
                              opt.badgeColor === 'green' || opt.badgeColor === 'emerald'
                                ? 'bg-emerald-300 text-stone-950'
                                : opt.badgeColor === 'red' || opt.badgeColor === 'rose'
                                ? 'bg-rose-300 text-stone-950'
                                : opt.badgeColor === 'blue'
                                ? 'bg-sky-300 text-stone-950'
                                : 'text-stone-950 bg-yellow-200'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {(opt.sublabel || opt.extra) && (
                        <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 flex items-center gap-2 truncate font-medium">
                          {opt.sublabel && <span>{opt.sublabel}</span>}
                          {opt.sublabel && opt.extra && <span>·</span>}
                          {opt.extra && <span className="text-stone-500 dark:text-stone-400">{opt.extra}</span>}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-stone-950 dark:text-stone-100 shrink-0 stroke-[3]" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
