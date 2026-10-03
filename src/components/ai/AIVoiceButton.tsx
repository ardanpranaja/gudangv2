import React from 'react';
import { Mic, MicOff, Loader2, Volume2, Sparkles } from 'lucide-react';
import { LiveAssistantStatus } from '../../types/ai';

interface AIVoiceButtonProps {
  status: LiveAssistantStatus;
  statusText: string;
  onToggle: () => void;
  disabled?: boolean;
}

export const AIVoiceButton: React.FC<AIVoiceButtonProps> = ({
  status,
  statusText,
  onToggle,
  disabled = false,
}) => {
  const isLive = status !== 'DISCONNECTED' && status !== 'ERROR';

  return (
    <div className="relative flex items-center">
      {/* Floating tooltip/badge when active */}
      {isLive && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-full shadow-lg border border-slate-700 pointer-events-none flex items-center gap-1.5 z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{statusText}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        title={
          isLive
            ? `Gemini Live Aktif (${status}) - Klik untuk mematikan suara`
            : 'Mulai Percakapan Suara Realtime (Gemini Live API)'
        }
        className={`p-2.5 rounded-full transition-all relative flex items-center justify-center shrink-0 ${
          disabled
            ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
            : status === 'LISTENING'
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 ring-4 ring-emerald-100 animate-pulse'
            : status === 'SPEAKING'
            ? 'bg-teal-600 text-white shadow-md shadow-teal-500/30 ring-4 ring-teal-100 animate-pulse'
            : status === 'THINKING'
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-4 ring-indigo-100'
            : status === 'CONNECTING'
            ? 'bg-amber-500 text-white shadow-md ring-4 ring-amber-100'
            : status === 'ERROR'
            ? 'bg-rose-100 text-rose-700 border border-rose-300 hover:bg-rose-200'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
        }`}
      >
        {status === 'CONNECTING' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : status === 'SPEAKING' ? (
          <Volume2 className="w-5 h-5" />
        ) : status === 'THINKING' ? (
          <Sparkles className="w-5 h-5 animate-spin" />
        ) : status === 'ERROR' ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};
