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
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-900 text-white text-[11px] px-2.5 py-1 rounded-full shadow-lg border border-stone-700 pointer-events-none flex items-center gap-1.5 z-20">
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
            ? 'bg-stone-100 dark:bg-stone-800 text-stone-300 dark:text-stone-600 cursor-not-allowed border border-stone-200 dark:border-stone-700'
            : status === 'LISTENING'
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 ring-4 ring-emerald-100 animate-pulse'
            : status === 'SPEAKING'
            ? 'bg-teal-600 text-white shadow-md shadow-teal-500/30 ring-4 ring-teal-100 animate-pulse'
            : status === 'THINKING'
            ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30 ring-4 ring-amber-100'
            : status === 'CONNECTING'
            ? 'bg-amber-500 text-white shadow-md ring-4 ring-amber-100'
            : status === 'ERROR'
            ? 'bg-rose-100 text-rose-700 border border-rose-300 hover:bg-rose-200'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-200 dark:border-stone-700'
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
