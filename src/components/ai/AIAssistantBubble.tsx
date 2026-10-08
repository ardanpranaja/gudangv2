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
          allowedTools: ['get_product_knowledge'], // Hanya tool pengetahuan produk; tool stok/tulis tetap nonaktif agar angka stok tidak bocor
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
        <div className="w-[calc(100vw-2rem)] sm:w-[380px] h-[520px] max-h-[85vh] bg-white dark:bg-stone-900 rounded-2xl border-2 border-stone-900 dark:border-stone-400 shadow-[6px_6px_0px_#18181b] flex flex-col overflow-hidden animate-fadeIn transition-colors">
          {/* Header */}
          <div className="px-4 py-3 bg-amber-300 dark:bg-amber-400 text-stone-950 border-b-2 border-stone-900 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <AIAvatarIcon size="sm" status={isLoading ? 'busy' : 'online'} isThinking={isLoading} showStatusDot />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black truncate">Uti AI</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                </div>
                <p className="text-[10px] font-bold text-stone-800 truncate">
                  {isLoading ? 'Sedang merespons...' : 'Online • Panduan Gudang'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1 rounded-md border-2 border-stone-900 bg-white hover:bg-stone-100 text-stone-950 shadow-[1.5px_1.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                title="Mulai percakapan baru"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md border-2 border-stone-900 bg-white hover:bg-stone-100 text-stone-950 shadow-[1.5px_1.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                title="Tutup asisten"
              >
                <ChevronDown className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Active Context Bar (Informational Chip) */}
          {(selectedMember || selectedItem) && (
            <div className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 border-b-2 border-stone-900 flex items-center gap-2 overflow-x-auto text-[10px] text-stone-800 dark:text-stone-200">
              <span className="font-black text-stone-700 dark:text-stone-300 shrink-0">Konteks:</span>
              {selectedMember && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-200 text-stone-950 border border-stone-900 font-bold shrink-0 shadow-[1px_1px_0px_#18181b]">
                  <User className="w-2.5 h-2.5 text-stone-950" />
                  <span className="max-w-[120px] truncate">{selectedMember.NAMA_MEMBER}</span>
                  {selectedMember.LANTAI && (
                    <span className="text-[9px]">Lt.{selectedMember.LANTAI}</span>
                  )}
                </span>
              )}
              {selectedItem && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-200 text-stone-950 border border-stone-900 font-bold shrink-0 shadow-[1px_1px_0px_#18181b]">
                  <Package className="w-2.5 h-2.5 text-stone-950" />
                  <span className="max-w-[120px] truncate">{selectedItem.NAMA_ITEM}</span>
                  <span
                    className={`text-[9px] font-black ${
                      isItemReady ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    [{isItemReady ? 'READY' : 'KOSONG'}]
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-stone-50 dark:bg-stone-900/60">
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
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed text-xs shadow-[2px_2px_0px_#18181b] whitespace-pre-wrap border-2 border-stone-900 ${
                      isAssistant
                        ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-stone-100 rounded-tl-xs font-medium'
                        : 'bg-amber-300 text-stone-950 rounded-tr-xs font-bold'
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
                <div className="text-[10px] font-black text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Pertanyaan Cepat:</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map((promptText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(promptText)}
                      className="text-left px-3 py-1.5 bg-cyan-100 hover:bg-cyan-200 text-stone-950 font-bold border-2 border-stone-900 rounded-lg text-[11px] shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
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
                <div className="bg-white dark:bg-stone-800 border-2 border-stone-900 rounded-2xl rounded-tl-xs px-3.5 py-2 text-stone-900 dark:text-stone-100 text-xs flex items-center gap-2 shadow-[2px_2px_0px_#18181b]">
                  <span className="neo-spinner-multicolor-sm" />
                  <span className="font-bold">Asisten sedang mengetik respons...</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-100 border-2 border-stone-900 text-rose-950 text-[11px] font-bold flex items-start gap-2 shadow-[2px_2px_0px_#18181b]">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5 stroke-[2.5]" />
                <div className="flex-1 leading-tight">{errorMessage}</div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Missing API Key Warning */}
          {!hasApiKey && (
            <div className="p-2.5 bg-amber-200 border-t-2 border-stone-900 text-[11px] font-bold text-amber-950 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-900 shrink-0 mt-0.5 stroke-[2.5]" />
              <div className="flex-1 leading-tight">
                Fitur chat AI membutuhkan API key — hubungi admin gudang.
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-2.5 bg-white dark:bg-stone-900 border-t-2 border-stone-900">
            <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 border-2 border-stone-900 rounded-xl px-2.5 py-1.5 focus-within:shadow-[2px_2px_0px_#18181b] transition-all">
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
                className="flex-1 bg-transparent text-xs text-stone-950 dark:text-stone-100 placeholder:text-stone-500 font-medium resize-none focus:outline-none max-h-24 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !hasApiKey || !inputText.trim()}
                className="p-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 border-2 border-stone-900 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                title="Kirim pertanyaan"
              >
                <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between text-[9px] font-bold text-stone-600 dark:text-stone-400 px-1">
              <span>Tekan Enter untuk kirim</span>
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
            <div className="relative mb-3 w-72 sm:w-80 bg-amber-50 dark:bg-stone-900 rounded-2xl border-2 border-stone-900 dark:border-stone-400 shadow-[5px_5px_0px_#18181b] p-3.5 text-xs text-stone-800 dark:text-stone-200 animate-fadeIn select-none">
              {/* Header with Title & Close button */}
              <div className="flex items-center justify-between border-b-2 border-stone-900/60 pb-2 mb-2">
                <div className="flex items-center gap-2 font-black text-stone-950 dark:text-stone-100">
                  <AIAvatarIcon size="xs" />
                  <span>Petunjuk Form Permintaan</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(false);
                  }}
                  className="p-1 rounded border border-stone-900 text-stone-900 dark:text-stone-100 hover:bg-rose-200 transition-colors"
                  title="Tutup petunjuk"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Body Steps */}
              <div
                onClick={() => setIsOpen(true)}
                className="cursor-pointer space-y-1.5 text-[11px] leading-relaxed"
              >
                <p className="font-bold text-stone-900 dark:text-stone-100">
                  Halo! Saya Uti AI. Cara memakai form ini:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-stone-700 dark:text-stone-300 font-medium">
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
                <div className="pt-2 flex items-center justify-between text-stone-950 dark:text-amber-300 font-black border-t-2 border-stone-900/40">
                  <span>Klik saya untuk bertanya!</span>
                  <span className="text-[10px] underline bg-amber-300 px-2 py-0.5 rounded border border-stone-900 shadow-[1px_1px_0px_#18181b]">Buka Chat &rarr;</span>
                </div>
              </div>

              {/* Pointer Triangle Arrow pointing down towards avatar */}
              <div className="absolute -bottom-2 right-6 w-4 h-4 bg-amber-50 dark:bg-stone-900 border-b-2 border-r-2 border-stone-900 rotate-45" />
            </div>
          )}

          {/* Floating Avatar Button with Neo-Brutalist Styling */}
          <div className="relative animate-float">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full bg-pink-400 hover:bg-pink-300 text-stone-950 border-2.5 border-stone-950 shadow-[4.5px_4.5px_0px_#18181b] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#18181b] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_#18181b] flex items-center justify-center transition-all cursor-pointer overflow-visible"
              aria-label="Buka Uti AI"
              title="Tanya Uti AI"
            >
              {/* Inner High-Fidelity Robot Mascot */}
              <AIAvatarIcon size="md" />

              {/* Orbiting Sparkle Accent */}
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 absolute -top-1 -right-1 drop-shadow-sm pointer-events-none stroke-[2]" />

              {/* Pulsing Online Status Badge */}
              <span className="absolute bottom-0 right-0 flex items-center justify-center pointer-events-none">
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-stone-950 shadow-[1px_1px_0px_#000]" />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
