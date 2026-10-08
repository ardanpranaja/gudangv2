import React from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { AIChat } from '../components/ai/AIChat';
import { useApp } from '../context/AppContext';
import { Bot, Settings, Sparkles } from 'lucide-react';

export const AIAssistantPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <PageHeader
        title="Uti AI"
        description="Asisten operasional gudang berbasis Gemini dengan dukungan Voice & Chat, rekam riwayat percakapan persisten, dan resolusi entitas kontekstual."
        actions={
          <button
            type="button"
            onClick={() => navigateTo('pengaturan')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-stone-950 bg-yellow-300 hover:bg-yellow-200 border-2 border-stone-900 rounded-lg shadow-[2.5px_2.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            <Settings className="w-3.5 h-3.5 text-stone-950 stroke-[2.5]" />
            <span>Pengaturan AI</span>
          </button>
        }
      />

      {/* Main Chat Interface */}
      <AIChat />
    </div>
  );
};
