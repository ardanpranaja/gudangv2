import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import { useApp } from '../../context/AppContext';
import { GeminiErrorCategory } from '../../types/ai';
import { Bot, Sparkles, CheckCircle2, AlertCircle, AlertTriangle, RefreshCw, Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react';

export const AIConfigPanel: React.FC = () => {
  const { addToast } = useApp();
  const [apiKeyInput, setApiKeyInput] = useState(aiService.getApiKey());
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testingProgressText, setTestingProgressText] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    category: GeminiErrorCategory;
    message: string;
    statusCode?: number;
  } | null>(null);
  const [selectedModel, setSelectedModel] = useState(aiService.getModel());
  const [savedKeys, setSavedKeys] = useState(aiService.getSavedApiKeys());
  const [selectedSavedKeyId, setSelectedSavedKeyId] = useState('');

  useEffect(() => {
    setApiKeyInput(aiService.getApiKey());
    setSelectedModel(aiService.getModel());
    setSavedKeys(aiService.getSavedApiKeys());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    aiService.setApiKey(apiKeyInput);
    aiService.saveApiKey(apiKeyInput);
    aiService.setModel(selectedModel);
    setSavedKeys(aiService.getSavedApiKeys());
    addToast('success', 'Konfigurasi Disimpan', 'Konfigurasi AI Assistant telah diperbarui.');
  };

  const handleTestConnection = async () => {
    // Save state first before testing
    aiService.setApiKey(apiKeyInput);
    aiService.setModel(selectedModel);

    setIsTesting(true);
    setTestingProgressText(null);
    setTestResult(null);

    try {
      const res = await aiService.testConnection((_attempt, _max, text) => {
        setTestingProgressText(text);
      });
      setTestResult(res);

      if (res.success) {
        addToast('success', 'Koneksi Berhasil', res.message);
      } else if (res.category === 'UNAVAILABLE') {
        addToast('warning', 'Layanan Gemini Sedang Padat (503)', res.message);
      } else if (res.category === 'QUOTA') {
        addToast('warning', 'Batas Kuota Penggunaan (429)', res.message);
      } else {
        addToast('error', 'Koneksi Gagal', res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menguji koneksi.';
      setTestResult({ success: false, category: 'UNKNOWN', message: msg });
      addToast('error', 'Koneksi Gagal', msg);
    } finally {
      setIsTesting(false);
      setTestingProgressText(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-slate-900">
          <Bot className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Konfigurasi AI Assistant (Gemini API)</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Chat &amp; Voice Engine</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Gemini API Key:
          </label>

          {savedKeys.length > 0 && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedSavedKeyId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedSavedKeyId(id);
                    if (id) {
                      const key = aiService.useSavedApiKey(id);
                      setApiKeyInput(key);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded bg-slate-50 text-slate-700 text-xs"
                >
                  <option value="">Pilih API Key yang pernah disimpan...</option>
                  {savedKeys.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} — {item.key.slice(0, 4)}••••{item.key.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedSavedKeyId && (
                <button
                  type="button"
                  title="Hapus API Key tersimpan"
                  onClick={() => {
                    aiService.removeSavedApiKey(selectedSavedKeyId);
                    setSavedKeys(aiService.getSavedApiKeys());
                    setSelectedSavedKeyId('');
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 border border-slate-200 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy... (atau kosongkan untuk menggunakan server environment key)"
                className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title={showKey ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{testingProgressText ? 'Mencoba...' : 'Test Connection'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            Kunci API digunakan oleh server untuk berkomunikasi dengan model Gemini (default: <code>gemini-3.8-flash</code>).
            Jika lingkungan server telah menyediakan <code>GEMINI_API_KEY</code>, Anda dapat mengosongkan kolom ini.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Model Gemini:
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 text-slate-800 text-xs bg-white"
            >
              <option value="gemini-3.8-flash">gemini-3.8-flash (Default)</option>
              <option value="gemini-3.7-flash">gemini-3.7-flash</option>
              <option value="gemini-3.6-flash">gemini-3.6-flash</option>
              <option value="gemini-3.5-flash">gemini-3.5-flash</option>
              <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
              <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
            </select>
          </div>
        </div>
      </form>

      {/* Progress feedback while testing */}
      {isTesting && testingProgressText && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
          <span>{testingProgressText}</span>
        </div>
      )}

      {/* Test Connection Result Box */}
      {testResult && (
        <div
          className={`p-3.5 rounded border text-xs flex items-start gap-2.5 ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : testResult.category === 'UNAVAILABLE' || testResult.category === 'QUOTA'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : testResult.category === 'UNAVAILABLE' || testResult.category === 'QUOTA' ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <div className="font-semibold">
              {testResult.success
                ? 'Koneksi Gemini API Aktif'
                : testResult.category === 'UNAVAILABLE'
                ? 'Layanan Gemini Sementara Sibuk (HTTP 503)'
                : testResult.category === 'QUOTA'
                ? 'Batas Kuota Penggunaan Terlampaui (HTTP 429)'
                : testResult.category === 'INVALID_API_KEY'
                ? 'Kunci API Tidak Valid'
                : 'Koneksi Gemini API Gagal'}
            </div>
            <div className="text-[11px] opacity-90 leading-relaxed">{testResult.message}</div>
          </div>
        </div>
      )}
    </div>
  );
};
