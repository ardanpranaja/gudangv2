import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AIMessage as AIMessageType,
  AIConfirmationData,
  AIToolCallInfo,
  LiveAssistantStatus,
  AIConversation,
  AIConversationContext,
} from '../../types/ai';
import { aiService } from '../../services/aiService';
import { aiLiveService } from '../../services/aiLiveService';
import { aiConversationService } from '../../services/aiConversationService';
import { AIMessage } from './AIMessage';
import { AIVoiceButton } from './AIVoiceButton';
import { AILiveOverlay } from './AILiveOverlay';
import { useApp } from '../../context/AppContext';
import {
  executeConfirmationBackend,
  isUserConfirmationApproval,
  isUserCancellation,
} from '../../services/aiConfirmationHandler';
import { normalizeGasErrorMessage } from '../../services/api';
import {
  Send,
  Bot,
  Trash2,
  Loader2,
  Plus,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  History,
  X,
  UserCheck,
  Package,
} from 'lucide-react';

const SUGGESTIONS = [
  'Cari stok plastik biru',
  'Cek barang yang stoknya menipis',
  'Cari member Armin',
  'Set limit Armin Gandi tissue roll 10 box',
  'Lihat riwayat mutasi kartu stok barang',
  'Validasi kelayakan pengambilan barang',
  'Periksa status koneksi backend GAS',
];

export const AIChat: React.FC = () => {
  const { addToast, triggerRefresh } = useApp();

  // Conversation session state
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [conversationTitle, setConversationTitle] = useState<string>('Percakapan Baru');
  const [conversationContext, setConversationContext] = useState<AIConversationContext>({});
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Active chat state
  const [messages, setMessages] = useState<AIMessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [currentRuntimeModel, setCurrentRuntimeModel] = useState<string>(aiService.getModel());

  // Live Assistant state
  const [liveStatus, setLiveStatus] = useState<LiveAssistantStatus>('DISCONNECTED');
  const [liveStatusText, setLiveStatusText] = useState('Tidak aktif');
  const [userLiveTranscript, setUserLiveTranscript] = useState('');
  const [geminiLiveTranscript, setGeminiLiveTranscript] = useState('');
  const [liveActiveTool, setLiveActiveTool] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync runtime model state
  useEffect(() => {
    const syncModel = () => {
      setCurrentRuntimeModel(aiService.getModel());
    };
    syncModel();
    window.addEventListener('storage', syncModel);
    window.addEventListener('focus', syncModel);
    return () => {
      window.removeEventListener('storage', syncModel);
      window.removeEventListener('focus', syncModel);
    };
  }, []);

  // Load conversation list from IndexedDB on mount
  const refreshConversationsList = useCallback(async () => {
    try {
      const list = await aiConversationService.listConversations();
      setConversations(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  // Initialize or resume conversation on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const list = await refreshConversationsList();
      if (!isMounted) return;

      if (list.length > 0) {
        // Load most recent conversation
        const latest = list[0];
        setCurrentConversationId(latest.id);
        setConversationTitle(latest.title);
        setMessages(latest.messages || []);
        setConversationContext(latest.context || {});
      } else {
        // Start a fresh conversation
        const newId = `conv-${Date.now()}`;
        setCurrentConversationId(newId);
        setConversationTitle('Percakapan Baru');
        setMessages([]);
        setConversationContext({});
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [refreshConversationsList]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, activeTool, retryStatus, liveStatus, userLiveTranscript, geminiLiveTranscript]);

  // Clean up Live session when unmounting
  useEffect(() => {
    return () => {
      aiLiveService.disconnect();
    };
  }, []);

  // Save current conversation state to IndexedDB whenever messages or context change
  const persistCurrentConversation = useCallback(
    async (
      updatedMessages: AIMessageType[],
      titleOverride?: string,
      contextOverride?: AIConversationContext
    ) => {
      if (!currentConversationId) return;

      const title = titleOverride !== undefined ? titleOverride : conversationTitle;
      const ctx = contextOverride !== undefined ? contextOverride : conversationContext;

      const record: AIConversation = {
        id: currentConversationId,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: updatedMessages,
        context: ctx,
      };

      await aiConversationService.saveConversation(record);
      await refreshConversationsList();
    },
    [currentConversationId, conversationTitle, conversationContext, refreshConversationsList]
  );

  // Switch to a new chat
  const handleNewChat = () => {
    const newId = `conv-${Date.now()}`;
    setCurrentConversationId(newId);
    setConversationTitle('Percakapan Baru');
    setMessages([]);
    setConversationContext({});
    setIsLoading(false);
    setActiveTool(null);
    setRetryStatus(null);
    setIsHistoryOpen(false);
    addToast('info', 'Chat Baru Dibuat', 'Mulai percakapan baru dengan AI Assistant GudangV2.');
  };

  // Open an existing conversation
  const handleOpenConversation = async (convId: string) => {
    if (convId === currentConversationId) {
      setIsHistoryOpen(false);
      return;
    }

    try {
      const conv = await aiConversationService.getConversation(convId);
      if (conv) {
        setCurrentConversationId(conv.id);
        setConversationTitle(conv.title);
        setMessages(conv.messages || []);
        setConversationContext(conv.context || {});
        setIsHistoryOpen(false);
        addToast('info', 'Percakapan Dimuat', `Memuat: ${conv.title}`);
      }
    } catch {
      addToast('error', 'Gagal Memuat', 'Gagal memuat percakapan yang dipilih.');
    }
  };

  // Delete a conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Hapus percakapan ini dari riwayat?')) return;

    try {
      await aiConversationService.deleteConversation(convId);
      const updatedList = await refreshConversationsList();

      if (convId === currentConversationId) {
        if (updatedList.length > 0) {
          const nextConv = updatedList[0];
          setCurrentConversationId(nextConv.id);
          setConversationTitle(nextConv.title);
          setMessages(nextConv.messages || []);
          setConversationContext(nextConv.context || {});
        } else {
          handleNewChat();
        }
      }
      addToast('info', 'Percakapan Dihapus', 'Riwayat percakapan telah dihapus.');
    } catch {
      addToast('error', 'Gagal Menghapus', 'Gagal menghapus percakapan.');
    }
  };

  // Send message handler
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

    // Auto title generation on first message
    let effectiveTitle = conversationTitle;
    if (messages.length === 0 || conversationTitle === 'Percakapan Baru') {
      effectiveTitle = aiConversationService.generateTitle(text);
      setConversationTitle(effectiveTitle);
    }

    // =========================================================================
    // FRONTEND CONFIRMATION HANDLER (Chat Approval Flow)
    // =========================================================================
    const pendingConfirmations = messages
      .filter((m) => m.confirmation && m.confirmation.status === 'pending')
      .map((m) => m.confirmation!);

    // Case A: User expresses approval ("Setuju", "Ya", "Eksekusi", "Lanjutkan", "Silakan")
    if (isUserConfirmationApproval(text)) {
      if (pendingConfirmations.length === 1) {
        const targetConf = pendingConfirmations[0];
        setActiveTool('Eksekusi Transaksi');
        try {
          const res = await executeConfirmationBackend(targetConf);

          const updatedConf: AIConfirmationData = {
            ...targetConf,
            status: 'executed',
            executionResult: {
              success: true,
              message: res.message,
              idTransaksi: res.idTransaksi,
              idPengajuan: res.idPengajuan,
            },
          };

          handleUpdateConfirmation(updatedConf);

          if (targetConf.type === 'REQUEST') {
            addToast('success', 'Pengajuan Berhasil', `Pengajuan ${res.idPengajuan || ''} berhasil dicatat.`);
          } else {
            addToast(
              'success',
              'Transaksi Berhasil',
              `Transaksi ${targetConf.type} (${res.idTransaksi || ''}) berhasil disimpan ke Spreadsheet.`
            );
          }
          triggerRefresh();

          const docIdInfo = res.idTransaksi
            ? ` (ID Transaksi: **${res.idTransaksi}**)`
            : res.idPengajuan
            ? ` (ID Pengajuan: **${res.idPengajuan}**)`
            : '';

          const assistantReply: AIMessageType = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: `Persetujuan diterima. **${targetConf.title}**${docIdInfo} telah berhasil dieksekusi dan dicatat resmi ke backend Google Spreadsheet GudangV2.`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            confirmation: updatedConf,
          };

          const finalMessages = [...newHistory, assistantReply];
          setMessages(finalMessages);
          await persistCurrentConversation(finalMessages, effectiveTitle);
        } catch (execErr: unknown) {
          const errMsg = normalizeGasErrorMessage(execErr, undefined, 'Gagal mengeksekusi operasi.');
          const failedConf: AIConfirmationData = {
            ...targetConf,
            status: 'failed',
            executionResult: {
              success: false,
              message: errMsg,
            },
          };
          handleUpdateConfirmation(failedConf);
          addToast('error', 'Eksekusi Gagal', errMsg);

          const assistantReply: AIMessageType = {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: `Eksekusi transaksi gagal: ${errMsg}. Silakan coba kembali dengan tombol **Coba Lagi** pada kartu transaksi di atas.`,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            confirmation: failedConf,
          };

          const finalMessages = [...newHistory, assistantReply];
          setMessages(finalMessages);
          await persistCurrentConversation(finalMessages, effectiveTitle);
        } finally {
          setIsLoading(false);
          setActiveTool(null);
        }
        return;
      } else if (pendingConfirmations.length > 1) {
        const assistantReply: AIMessageType = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: `Terdapat ${pendingConfirmations.length} transaksi yang menunggu konfirmasi. Untuk menghindari eksekusi yang salah, silakan klik tombol **Konfirmasi & Simpan** langsung pada kartu transaksi yang Anda inginkan, atau sebutkan transaksi mana yang ingin disetujui.`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };
        const finalMessages = [...newHistory, assistantReply];
        setMessages(finalMessages);
        await persistCurrentConversation(finalMessages, effectiveTitle);
        setIsLoading(false);
        return;
      }
    }

    // Case B: User expresses cancellation ("Batal", "Batalkan")
    if (isUserCancellation(text) && pendingConfirmations.length > 0) {
      const updatedMessages = newHistory.map((m) => {
        if (m.confirmation && m.confirmation.status === 'pending') {
          return {
            ...m,
            confirmation: {
              ...m.confirmation,
              status: 'cancelled' as const,
            },
          };
        }
        return m;
      });

      const assistantReply: AIMessageType = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: 'Draf transaksi telah dibatalkan sesuai instruksi Anda.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...updatedMessages, assistantReply];
      setMessages(finalMessages);
      await persistCurrentConversation(finalMessages, effectiveTitle);
      addToast('info', 'Transaksi Dibatalkan', 'Draf transaksi telah dibatalkan.');
      setIsLoading(false);
      return;
    }

    // Standard AI Assistant Turn with entity context resolution
    try {
      const response = await aiService.sendMessage(
        text,
        newHistory,
        conversationContext,
        {
          onToolStatus: (toolInfo: AIToolCallInfo) => {
            setActiveTool(toolInfo.name);
          },
          onRetryProgress: (_attempt, _max, statusText) => {
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

      const finalMessages = [...newHistory, assistantMsg];
      const updatedContext = response.updatedContext || conversationContext;

      setMessages(finalMessages);
      setConversationContext(updatedContext);

      // Persist turn immediately to IndexedDB
      await persistCurrentConversation(finalMessages, effectiveTitle, updatedContext);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat memproses permintaan ke Gemini AI.';

      const errorAssistantMsg: AIMessageType = {
        id: `asst-err-${Date.now()}`,
        role: 'assistant',
        content: `Maaf, terjadi kendala: ${errorMsg}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        error: errorMsg,
      };

      const finalMessages = [...newHistory, errorAssistantMsg];
      setMessages(finalMessages);
      await persistCurrentConversation(finalMessages, effectiveTitle);
      addToast('error', 'Kendala AI Assistant', errorMsg);
    } finally {
      setIsLoading(false);
      setActiveTool(null);
      setRetryStatus(null);
    }
  };

  const handleUpdateConfirmation = (updated: AIConfirmationData) => {
    setMessages((prev) => {
      const next = prev.map((msg) =>
        msg.confirmation && msg.confirmation.id === updated.id
          ? { ...msg, confirmation: updated }
          : msg
      );
      persistCurrentConversation(next);
      return next;
    });
  };

  // Live Voice toggle
  const handleToggleLiveVoice = async () => {
    if (aiLiveService.isConnected()) {
      aiLiveService.disconnect();
      setLiveStatus('DISCONNECTED');
      setLiveStatusText('Tidak aktif');
      return;
    }

    setUserLiveTranscript('');
    setGeminiLiveTranscript('');
    setLiveActiveTool(null);

    await aiLiveService.startSession({
      onStatusChange: (status: LiveAssistantStatus, text: string) => {
        setLiveStatus(status);
        setLiveStatusText(text);
      },
      onInputTranscript: (text: string) => {
        setUserLiveTranscript(text);
      },
      onOutputTranscript: (text: string) => {
        setGeminiLiveTranscript(text);
      },
      onToolCallStart: (toolName: string) => {
        setLiveActiveTool(toolName);
      },
      onToolCallDone: () => {
        setLiveActiveTool(null);
      },
      onConfirmationDraft: (conf: AIConfirmationData) => {
        const confMsg: AIMessageType = {
          id: `asst-voice-${Date.now()}`,
          role: 'assistant',
          content: `Saya telah menyiapkan ${conf.title} berdasarkan percakapan suara. Silakan periksa rincian pada kartu di bawah:`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          confirmation: conf,
        };
        setMessages((prev) => {
          const next = [...prev, confMsg];
          persistCurrentConversation(next);
          return next;
        });
      },
      onError: (errMsg: string) => {
        addToast('error', 'Gemini Live Voice Error', errMsg);
      },
    });
  };

  const availableModels = aiService.getAvailableModels();
  const matchedModelObj = availableModels.find((m) => m.id === currentRuntimeModel);
  const runtimeModelDisplayName = matchedModelObj ? matchedModelObj.displayName : currentRuntimeModel;

  // Filtered conversation history for search
  const filteredConversations = conversations.filter((c) => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    const titleMatch = c.title.toLowerCase().includes(q);
    const messageMatch = (c.messages || []).some((m) => m.content.toLowerCase().includes(q));
    return titleMatch || messageMatch;
  });

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[540px] bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-xs relative">
      {/* --------------------------------------------------------------------- */}
      {/* HISTORY SIDEBAR (Collapsible / Responsive Drawer) */}
      {/* --------------------------------------------------------------------- */}
      <div
        className={`bg-white border-r border-slate-200 flex flex-col z-20 transition-all duration-200 absolute md:static inset-y-0 left-0 ${
          isHistoryOpen
            ? 'w-72 shadow-lg md:shadow-none translate-x-0'
            : 'w-0 md:w-64 -translate-x-full md:translate-x-0 overflow-hidden'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/70">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Riwayat Percakapan</span>
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors inline-flex items-center gap-1 shadow-2xs"
            title="Mulai Percakapan Baru"
          >
            <Plus className="w-3 h-3" />
            <span>Chat Baru</span>
          </button>
        </div>

        {/* Search in History */}
        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="Cari riwayat chat..."
              className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            {historySearchQuery && (
              <button
                type="button"
                onClick={() => setHistorySearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-3 text-xs text-slate-400">
              {historySearchQuery ? 'Tidak ada hasil pencarian.' : 'Belum ada riwayat percakapan.'}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.id === currentConversationId;
              const dateStr = new Date(c.updatedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={c.id}
                  onClick={() => handleOpenConversation(c.id)}
                  className={`group px-2.5 py-2 rounded-lg cursor-pointer transition-all text-xs flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium'
                      : 'hover:bg-slate-100/80 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span className="truncate">{c.title || 'Percakapan'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 pl-5">
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span>{c.messages?.length || 0} pesan</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 rounded transition-opacity"
                    title="Hapus percakapan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Active Entity Context Badge in Sidebar */}
        {(conversationContext.activeMember || conversationContext.activeItem) && (
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-700 text-[10px] uppercase tracking-wider">
              Konteks Aktif Sesi
            </div>
            {conversationContext.activeMember && (
              <div className="flex items-center gap-1.5 text-slate-700 truncate">
                <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate font-medium">{conversationContext.activeMember.name}</span>
              </div>
            )}
            {conversationContext.activeItem && (
              <div className="flex items-center gap-1.5 text-slate-700 truncate">
                <Package className="w-3 h-3 text-teal-600 shrink-0" />
                <span className="truncate font-medium">{conversationContext.activeItem.name}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* MAIN CHAT AREA */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Chat Subheader */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Toggle History Button (Mobile/Desktop) */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="md:hidden p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
              title="Toggle Riwayat"
            >
              <History className="w-4 h-4" />
            </button>

            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                liveStatus === 'LISTENING' || liveStatus === 'SPEAKING'
                  ? 'bg-teal-500 animate-ping'
                  : liveStatus === 'CONNECTING'
                  ? 'bg-amber-500 animate-spin'
                  : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-800 block truncate">
                {liveStatus !== 'DISCONNECTED'
                  ? `Gemini Live Voice (${liveStatus})`
                  : currentRuntimeModel
                  ? `AI Assistant Terhubung (${runtimeModelDisplayName})`
                  : 'AI Assistant — Model belum dipilih'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {conversationTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleNewChat}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors inline-flex items-center gap-1"
              title="Buat Chat Baru"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat Baru</span>
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
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
                  atau siapkan draf transaksi dengan mengetik pesan atau menggunakan percakapan suara realtime (Gemini Live).
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

          {/* Loading / Tool executing indicator in chat mode */}
          {isLoading && (
            <div className="flex gap-3 justify-start animate-fadeIn">
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

        {/* Realtime Live Voice Overlay Bar when Live Session is active */}
        <AILiveOverlay
          status={liveStatus}
          statusText={liveStatusText}
          userTranscript={userLiveTranscript}
          geminiTranscript={geminiLiveTranscript}
          activeTool={liveActiveTool}
          onDisconnect={handleToggleLiveVoice}
        />

        {/* Input Form Bar */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ketik instruksi gudang, stok, limit member, atau draf transaksi..."
                disabled={isLoading}
                className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 transition-all"
                title="Kirim Pesan"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Live Voice Button */}
            <AIVoiceButton
              status={liveStatus}
              statusText={liveStatusText}
              onToggle={handleToggleLiveVoice}
            />
          </form>
        </div>
      </div>
    </div>
  );
};
