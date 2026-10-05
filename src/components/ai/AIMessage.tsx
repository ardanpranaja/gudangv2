import React, { useState } from 'react';
import { AIMessage as AIMessageType, AIConfirmationData } from '../../types/ai';
import { AIConfirmation } from './AIConfirmation';
import { AIAvatarIcon } from './AIAvatarIcon';
import { Bot, User, Wrench, ChevronDown, ChevronUp, Check, AlertCircle } from 'lucide-react';

interface AIMessageProps {
  message: AIMessageType;
  onUpdateConfirmation?: (confirmation: AIConfirmationData) => void;
}

export const AIMessage: React.FC<AIMessageProps> = ({ message, onUpdateConfirmation }) => {
  const isUser = message.role === 'user';
  const [showTools, setShowTools] = useState(false);

  // Friendly tool label formatter
  const formatToolName = (name: string): string => {
    switch (name) {
      case 'check_stock':
        return 'Pengecekan Stok Gudang';
      case 'get_items':
        return 'Katalog Master Barang';
      case 'get_members':
        return 'Data Member';
      case 'get_member_limits':
        return 'Pemeriksaan Kuota Limit Member';
      case 'get_bincard':
        return 'Pemeriksaan Kartu Stok (Bin Card)';
      case 'get_member_history':
        return 'Riwayat Pengambilan Member';
      case 'check_pickup_eligibility':
        return 'Validasi Kelayakan Pengambilan';
      case 'get_pending_requests':
        return 'Data Pengajuan Early Pickup';
      case 'get_system_health':
        return 'Diagnostik Koneksi GAS';
      case 'propose_transaction':
        return 'Penyusunan Draft Transaksi';
      case 'propose_request':
        return 'Penyusunan Draft Pengajuan';
      default:
        return name;
    }
  };

  // Simple clean formatting for text paragraphs and lists
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Bold highlight formatting: **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-slate-900 dark:text-slate-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {formattedParts}
          </li>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mt-0.5 shrink-0">
          <AIAvatarIcon size="sm" />
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-xl p-4 shadow-xs ${
          isUser
            ? 'bg-slate-900 dark:bg-slate-700 text-white rounded-tr-none'
            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-none'
        }`}
      >
        {/* Tool calls execution summary */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowTools(!showTools)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <Wrench className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>
                {message.toolCalls.length} data backend diperiksa
              </span>
              {showTools ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showTools && (
              <div className="mt-2 space-y-1 bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded border border-slate-100 dark:border-slate-600 text-[11px]">
                {message.toolCalls.map((tc, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-mono">
                    {tc.status === 'done' ? (
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    ) : tc.status === 'error' ? (
                      <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    )}
                    <span>{formatToolName(tc.name)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Text Body */}
        <div className={`space-y-1 ${isUser ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
          {isUser ? (
            <p className="text-xs leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            renderFormattedContent(message.content)
          )}
        </div>

        {/* Embedded Confirmation Card if any */}
        {message.confirmation && onUpdateConfirmation && (
          <AIConfirmation
            confirmation={message.confirmation}
            onUpdate={onUpdateConfirmation}
          />
        )}

        {/* Error message if any */}
        {message.error && (
          <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded text-rose-700 dark:text-rose-300 text-xs">
            {message.error}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-1.5 text-right ${
            isUser ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {message.timestamp}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
