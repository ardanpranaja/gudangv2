import React from 'react';
import { LiveAssistantStatus } from '../../types/ai';
import { Mic, Volume2, Sparkles, AlertCircle, X, Loader2 } from 'lucide-react';

interface AILiveOverlayProps {
  status: LiveAssistantStatus;
  statusText: string;
  userTranscript?: string;
  geminiTranscript?: string;
  activeTool?: string | null;
  onDisconnect: () => void;
}

export const AILiveOverlay: React.FC<AILiveOverlayProps> = ({
  status,
  statusText,
  userTranscript,
  geminiTranscript,
  activeTool,
  onDisconnect,
}) => {
  if (status === 'DISCONNECTED') return null;

  return (
    <div className="mx-4 mb-2 p-3 bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-xl shadow-lg border border-stone-700/80 transition-all duration-300">
      <div className="flex items-center justify-between gap-3">
        {/* Left Status Icon & Label */}
        <div className="flex items-center gap-2.5 min-w-0">
          {status === 'CONNECTING' && (
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          {status === 'LISTENING' && (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 relative">
              <span className="absolute inset-0 rounded-lg bg-emerald-400/20 animate-ping" />
              <Mic className="w-4 h-4 relative z-10" />
            </div>
          )}
          {status === 'THINKING' && (
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
          )}
          {status === 'SPEAKING' && (
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 relative">
              <span className="absolute inset-0 rounded-lg bg-teal-400/20 animate-pulse" />
              <Volume2 className="w-4 h-4 relative z-10" />
            </div>
          )}
          {status === 'ERROR' && (
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-300">
                Gemini Live Voice
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  status === 'LISTENING'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : status === 'SPEAKING'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : status === 'THINKING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : status === 'CONNECTING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-stone-200 truncate font-medium">
              {activeTool ? `Menjalankan tool: ${activeTool}...` : statusText}
            </p>
          </div>
        </div>

        {/* Right Action: Close/Disconnect */}
        <button
          type="button"
          onClick={onDisconnect}
          className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-medium flex items-center gap-1.5 border border-stone-600 transition-colors shrink-0"
          title="Akhiri sesi suara"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Matikan Suara</span>
        </button>
      </div>

      {/* Live Audio Transcripts Preview */}
      {(userTranscript || geminiTranscript) && (
        <div className="mt-2.5 pt-2 border-t border-stone-700/60 text-xs space-y-1">
          {userTranscript && (
            <div className="flex items-start gap-1.5 text-stone-300">
              <span className="font-semibold text-emerald-400 shrink-0">Anda:</span>
              <span className="italic line-clamp-2">&ldquo;{userTranscript}&rdquo;</span>
            </div>
          )}
          {geminiTranscript && (
            <div className="flex items-start gap-1.5 text-stone-300">
              <span className="font-semibold text-teal-400 shrink-0">Gemini:</span>
              <span className="line-clamp-2">&ldquo;{geminiTranscript}&rdquo;</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
