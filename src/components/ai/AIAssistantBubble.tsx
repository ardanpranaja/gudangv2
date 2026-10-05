import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  X,
  Send,
  Loader2,
  ChevronDown,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  User,
  Package,
  Layers,
} from 'lucide-react';
import { AIAvatarIcon } from './AIAvatarIcon';
import { aiService, MEMBER_SYSTEM_INSTRUCTION } from '../../services/aiService';
import { MasterMember, MasterItem } from '../../types';
import { AIMessage } from '../../types/ai';

interface AIAssistantBubbleProps {
  selectedMember?: MasterMember | null;
  selectedItem?: MasterItem | null;
  isItemReady?: boolean;
}

const INITIAL_GREETING =
  'Halo! Saya Uti AI, asisten panduan Kegudangaja. Ada yang ingin Anda tanyakan seputar cara pengisian form permintaan, arti status barang, atau alur verifikasi gudang? Silakan tanyakan di sini!';

const QUICK_PROMPTS = [
  'Bagaimana alur setelah permintaan diajukan?',
  'Apa arti status READY dan KOSONG?',
  'Kenapa alasan wajib diisi?',
  'Kapan barang yang saya minta bisa diambil?',
];

export const AIAssistantBubble: React.FC<AIAssistantBubbleProps> = ({
  selectedMember,
  selectedItem,
  isItemReady,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [hasApiKey, setHasApiKey] = useState<boolean>(aiService.hasKey());
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg-initial',
      role: 'assistant',
      content: INITIAL_GREETING,
      timestamp: new Date().toISOString(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync API Key status from aiService & window events
  useEffect(() => {
    const syncKey = () => {
      setHasApiKey(aiService.hasKey());
    };
    syncKey();
    window.addEventListener('gemini-key-changed', syncKey);
    window.addEventListener('storage', syncKey);
    return () => {
      window.removeEventListener('gemini-key-changed', syncKey);
      window.removeEventListener('storage', syncKey);
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input on panel open
  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || isLoading) return;

    if (!hasApiKey) {
      setErrorMessage('Fitur chat AI membutuhkan API key — hubungi admin gudang.');
      return;
    }

    setErrorMessage(null);
    setInputText('');

    const userMsg: AIMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      // Build safe context without leaking stock numbers
      const contextPayload: any = {};

      if (selectedMember) {
        contextPayload.activeMember = {
          id: selectedMember.ID_MEMBER,
          name: selectedMember.NAMA_MEMBER,
          jabatan: selectedMember.JABATAN,
          divisi: selectedMember.LANTAI ? `Lantai ${selectedMember.LANTAI}` : undefined,
        };
      }

      if (selectedItem) {
        contextPayload.activeItem = {
          id: selectedItem.ID_ITEM,
          name: selectedItem.NAMA_ITEM,
          satuan: selectedItem.SATUAN,
          kategori: selectedItem.KATEGORI,
          // CRITICAL SECURITY RULE: stok number is strictly NOT included!
        };
      }

      // Add hint about current readiness state
      const readinessHint = selectedItem
        ? `[Status Barang Terpilih Saat Ini: ${isItemReady ? 'READY' : 'KOSONG'}]`
        : '';
      const promptWithHint = readinessHint ? `${readinessHint}\n${content}` : content;

      const response = await aiService.sendMessage(
        promptWithHint,
        nextMessages,
        contextPayload,
        {
          systemInstruction: MEMBER_SYSTEM_INSTRUCTION,
          disableTools: true, // Disable write tools and stock checks to prevent leaking stock numbers
        }
      );

      const botMsg: AIMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: response.text || 'Maaf, saya tidak dapat merespons saat ini.',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const errText =
        err instanceof Error
          ? err.message
          : 'Terjadi kendala saat menghubungi asisten AI. Silakan coba lagi.';
      setErrorMessage(errText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        role: 'assistant',
        content: INITIAL_GREETING,
        timestamp: new Date().toISOString(),
      },
    ]);
    setErrorMessage(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* --------------------------------------------------------------------- */}
      {/* 1. CHAT PANEL (WHEN OPEN)                                             */}
      {/* --------------------------------------------------------------------- */}
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-[380px] h-[520px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden animate-fadeIn transition-colors">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <AIAvatarIcon size="sm" status={isLoading ? 'busy' : 'online'} isThinking={isLoading} showStatusDot />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold truncate">Uti AI</h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                </div>
                <p className="text-[10px] text-slate-300 dark:text-slate-400 truncate">
                  {isLoading ? 'Sedang merespons...' : 'Online • Siap membantu'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900 transition-colors"
                title="Mulai percakapan baru"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900 transition-colors"
                title="Tutup asisten"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Context Bar (Informational Chip) */}
          {(selectedMember || selectedItem) && (
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-[10px] text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-400 dark:text-slate-500 shrink-0">Konteks Form:</span>
              {selectedMember && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 shrink-0">
                  <User className="w-2.5 h-2.5 text-slate-400" />
                  <span className="max-w-[120px] truncate">{selectedMember.NAMA_MEMBER}</span>
                  {selectedMember.LANTAI && (
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">Lt.{selectedMember.LANTAI}</span>
                  )}
                </span>
              )}
              {selectedItem && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 shrink-0">
                  <Package className="w-2.5 h-2.5 text-slate-400" />
                  <span className="max-w-[120px] truncate">{selectedItem.NAMA_ITEM}</span>
                  <span
                    className={`text-[9px] font-bold ${
                      isItemReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    [{isItemReady ? 'READY' : 'KOSONG'}]
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-slate-50/50 dark:bg-slate-950/40">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="mt-0.5 shrink-0">
                      <AIAvatarIcon size="xs" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed text-xs shadow-2xs whitespace-pre-wrap ${
                      isAssistant
                        ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                        : 'bg-slate-900 dark:bg-emerald-600 text-white rounded-tr-xs'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {/* Quick Prompts (only on start or single message) */}
            {messages.length <= 2 && !isLoading && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  <span>Pertanyaan Cepat:</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map((promptText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(promptText)}
                      className="text-left px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="mt-0.5 shrink-0">
                  <AIAvatarIcon size="xs" isThinking status="busy" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-xs px-3.5 py-2 text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Asisten sedang mengetik respons...</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-tight">{errorMessage}</div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Missing API Key Warning */}
          {!hasApiKey && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-tight">
                Fitur chat AI membutuhkan API key — hubungi admin gudang.
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:border-slate-800 dark:focus-within:border-slate-400 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || !hasApiKey}
                placeholder={
                  hasApiKey
                    ? 'Tanyakan panduan pengajuan barang...'
                    : 'Chat AI dinonaktifkan (belum ada API Key)'
                }
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none focus:outline-none max-h-24 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !hasApiKey || !inputText.trim()}
                className="p-1.5 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                title="Kirim pertanyaan"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 px-1">
              <span>Tekan Enter untuk mengirim</span>
              <span>Uti AI</span>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. FLOATING BUBBLE AVATAR (WHEN CLOSED)                               */}
      {/* --------------------------------------------------------------------- */}
      {!isOpen && (
        <div className="relative flex flex-col items-end">
          {/* Greeting / Instruction Speech Bubble Tooltip */}
          {showTooltip && (
            <div className="relative mb-3 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-3.5 text-xs text-slate-700 dark:text-slate-300 animate-fadeIn select-none">
              {/* Header with Title & Close button */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <AIAvatarIcon size="xs" />
                  <span>Petunjuk Form Permintaan</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(false);
                  }}
                  className="p-1 rounded text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Tutup petunjuk"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body Steps */}
              <div
                onClick={() => setIsOpen(true)}
                className="cursor-pointer space-y-1.5 text-[11px] leading-relaxed"
              >
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  Halo! Saya Uti AI. Cara memakai form ini:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Pilih nama Anda</strong> (perhatikan lantai tugas)
                  </li>
                  <li>
                    <strong>Pilih barang</strong> (status <code>[READY]</code> / <code>[KOSONG]</code>)
                  </li>
                  <li>
                    <strong>Isi jumlah &amp; alasan</strong> (wajib diisi)
                  </li>
                  <li>
                    <strong>Klik Ajukan Permintaan</strong>
                  </li>
                </ol>
                <div className="pt-1.5 flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-semibold border-t border-slate-50 dark:border-slate-800">
                  <span>Klik saya untuk bertanya!</span>
                  <span className="text-[10px] underline">Buka Chat &rarr;</span>
                </div>
              </div>

              {/* Pointer Triangle Arrow pointing down towards avatar */}
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-800 rotate-45" />
            </div>
          )}

          {/* Floating Avatar Button with Float & Glow Animation */}
          <div className="relative animate-float">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="group relative w-14 h-14 rounded-full bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 text-white shadow-2xl hover:shadow-emerald-500/25 border-2 border-emerald-400/50 hover:border-emerald-300 flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer overflow-visible"
              aria-label="Buka Uti AI"
              title="Tanya Uti AI"
            >
              {/* Outer Pulse Glow Halo */}
              <span className="absolute -inset-2 rounded-full bg-emerald-500/20 group-hover:bg-emerald-400/35 blur-xs transition-all pointer-events-none" />

              {/* Inner High-Fidelity Robot Mascot */}
              <AIAvatarIcon size="md" className="group-hover:scale-105 transition-transform" />

              {/* Orbiting Sparkle Accent */}
              <Sparkles className="w-3.5 h-3.5 text-emerald-300 absolute -top-1 -right-1 animate-spin-slow drop-shadow-sm pointer-events-none" />

              {/* Pulsing Online Status Badge */}
              <span className="absolute bottom-0 right-0 flex items-center justify-center pointer-events-none">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950 shadow-xs" />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
