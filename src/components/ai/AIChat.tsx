import React, { useState, useEffect, useRef } from 'react';
import { AIMessage as AIMessageType, AIConfirmationData, AIToolCallInfo } from '../../types/ai';
import { aiService } from '../../services/aiService';
import { AIMessage } from './AIMessage';
import { AIVoiceButton } from './AIVoiceButton';
import { Send, Bot, Sparkles, Trash2, Loader2, Info } from 'lucide-react';

const SUGGESTIONS = [
  'Cari stok plastik biru',
  'Cek barang yang stoknya menipis',
  'Cek limit pengambilan barang member',
  'Lihat riwayat mutasi kartu stok barang',
  'Validasi kelayakan pengambilan barang',
  'Periksa status koneksi backend GAS',
];

export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<AIMessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, activeTool, retryStatus]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');

    const userMsg: AIMessageType = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);
    setActiveTool(null);
    setRetryStatus(null);

    try {
      const response = await aiService.sendMessage(
        text,
        newHistory,
        {
          onToolStatus: (toolInfo: AIToolCallInfo) => {
            setActiveTool(toolInfo.name);
            setRetryStatus(null);
          },
          onRetryProgress: (_attempt: number, _maxAttempts: number, statusText: string) => {
            setRetryStatus(statusText);
          },
        }
      );

      const assistantMsg: AIMessageType = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        toolCalls: response.toolCalls,
        confirmation: response.confirmation,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AIMessageType = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: err?.message || 'Gemini sedang tidak tersedia sementara. Silakan coba kembali beberapa saat lagi.',
        error: err?.message,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setActiveTool(null);
      setRetryStatus(null);
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    if (transcript) {
      handleSendMessage(transcript);
    }
  };

  const handleUpdateConfirmation = (updated: AIConfirmationData) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.confirmation && msg.confirmation.id === updated.id
          ? { ...msg, confirmation: updated }
          : msg
      )
    );
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] min-h-[500px] bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Chat Top Subheader */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-800">
            AI Assistant Terhubung (Gemini 3.8 Flash)
          </span>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearChat}
            className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Chat</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Ada yang bisa dibantu untuk operasional gudang hari ini?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tanyakan posisi stok barang, validasi kuota limit member, cek mutasi kartu stok,
                atau siapkan draf transaksi dengan mengetik atau berbicara langsung.
              </p>
            </div>

            {/* Quick Suggestions Chips */}
            <div className="w-full max-w-lg pt-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Contoh Perintah Cepat
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(item)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-colors shadow-2xs text-left"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <AIMessage
              key={msg.id}
              message={msg}
              onUpdateConfirmation={handleUpdateConfirmation}
            />
          ))
        )}

        {/* Loading / Tool executing indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl rounded-tl-none p-3.5 shadow-xs flex items-center gap-2.5 text-xs text-slate-600">
              <Loader2 className={`w-4 h-4 animate-spin ${retryStatus ? 'text-amber-500' : 'text-slate-800'}`} />
              <span className={retryStatus ? 'text-amber-700 font-medium' : ''}>
                {retryStatus || (activeTool ? `Memeriksa data ${activeTool}...` : 'Sedang berpikir...')}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Voice Input Button */}
          <AIVoiceButton
            onTranscript={handleVoiceTranscript}
            disabled={isLoading}
          />

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ketik perintah atau tanyakan stok gudang..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-white transition-colors focus:outline-none shadow-xs"
            aria-label="Kirim pesan"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-slate-400">
          <Info className="w-3 h-3" />
          <span>Transaksi gudang selalu meminta konfirmasi operator sebelum dicatat ke Spreadsheet.</span>
        </div>
      </div>
    </div>
  );
};
