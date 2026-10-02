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
        title="AI Assistant GudangPresisi"
        description="Asisten operasional gudang berbasis Gemini dengan dukungan Voice & Chat. Cari stok barang, validasi kelayakan pengambilan member, dan pantau mutasi kartu stok secara real-time."
        actions={
          <button
            type="button"
            onClick={() => navigateTo('pengaturan')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Pengaturan AI</span>
          </button>
        }
      />

      {/* Main Chat Interface */}
      <AIChat />
    </div>
  );
};
