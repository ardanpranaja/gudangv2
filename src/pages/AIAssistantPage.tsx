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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded hover:bg-stone-50 transition-colors shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            <span>Pengaturan AI</span>
          </button>
        }
      />

      {/* Main Chat Interface */}
      <AIChat />
    </div>
  );
};
