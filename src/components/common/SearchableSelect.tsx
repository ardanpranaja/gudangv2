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
        className={`w-full text-left bg-white border rounded transition-colors flex items-center justify-between gap-2 ${sizeClasses} ${
          disabled
            ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'border-slate-900 ring-1 ring-slate-900 shadow-xs'
            : 'border-slate-200 hover:border-slate-300 text-slate-800'
        }`}
      >
        <div className="flex-1 truncate">
          {selectedOption && !minimalTrigger ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                {selectedOption.value}
              </span>
              <span className="font-medium text-slate-900 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 border ${
                    selectedOption.badgeColor === 'green' || selectedOption.badgeColor === 'emerald'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                      : selectedOption.badgeColor === 'red' || selectedOption.badgeColor === 'rose'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                      : selectedOption.badgeColor === 'blue'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                      : 'text-slate-600 bg-slate-50 border-slate-200'
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
              {selectedOption.sublabel && (
                <span className="text-[11px] text-slate-400 truncate">
                  ({selectedOption.sublabel})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-400 shrink-0">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-slate-700' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-fadeIn min-w-[280px]">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-slate-900 text-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {filteredOptions.length > 0 && (
              <div className="px-1 pt-1 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Ditemukan {filteredOptions.length} data</span>
                <span className="italic">Gunakan ↑ ↓ dan Enter</span>
              </div>
            )}
          </div>

          {/* Options List */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50 text-xs"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-6 text-center text-slate-400">
                <Search className="w-6 h-6 mx-auto mb-1.5 text-slate-300 stroke-1" />
                <p className="font-medium text-slate-600">{emptyMessage}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
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
                        ? 'opacity-40 cursor-not-allowed bg-slate-50'
                        : isSelected
                        ? 'bg-slate-100/80 font-medium text-slate-950'
                        : isFocused
                        ? 'bg-slate-50 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                          {opt.value}
                        </span>
                        <span className="font-medium text-slate-900 truncate">
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded shrink-0 border ${
                              opt.badgeColor === 'green' || opt.badgeColor === 'emerald'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                                : opt.badgeColor === 'red' || opt.badgeColor === 'rose'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                                : opt.badgeColor === 'blue'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                                : 'text-slate-600 bg-slate-100 border-slate-200'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {(opt.sublabel || opt.extra) && (
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 truncate">
                          {opt.sublabel && <span>{opt.sublabel}</span>}
                          {opt.sublabel && opt.extra && <span>·</span>}
                          {opt.extra && <span className="text-slate-400">{opt.extra}</span>}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-slate-900 shrink-0" />
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
