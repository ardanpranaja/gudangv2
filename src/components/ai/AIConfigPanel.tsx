import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { aiService, maskApiKey } from '../../services/aiService';
import { useApp } from '../../context/AppContext';
import { GeminiErrorCategory, SavedApiKey, KeyUsageStats, AIModelInfo } from '../../types/ai';
import {
  Bot,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Key,
  Plus,
  Trash2,
  Layers,
  Cpu,
  ShieldCheck,
  ExternalLink,
  Info,
  Check,
} from 'lucide-react';

/**
 * Categorizes a model heuristically based on id, displayName, and description.
 * Safe fallback: anything unclassified goes into 'other' or 'chat'.
 */
function categorizeModel(model: AIModelInfo): 'chat' | 'specialist' | 'other' {
  const text = `${model.id} ${model.displayName || ''} ${model.description || ''}`.toLowerCase();

  // Specialist models (music/lyria, tts/speech, robotics, computer-use, deep-research, antigravity, image generation)
  const specialistKeywords = [
    'lyria',
    'music',
    'tts',
    'speech',
    'robotics',
    'computer-use',
    'deep-research',
    'antigravity',
    'imagen',
    'image-generation',
    'whisper',
  ];

  if (specialistKeywords.some((kw) => text.includes(kw))) {
    return 'specialist';
  }

  // Chat & Operational: models suited for general text reasoning & tool calling
  const chatKeywords = [
    'flash',
    'pro',
    'gemini-1.5',
    'gemini-2.0',
    'gemini-2.5',
    'gemini-3.0',
    'gemini-3.7',
    'gemini-3',
    'thinking',
    'learnlm',
  ];

  if (chatKeywords.some((kw) => text.includes(kw))) {
    return 'chat';
  }

  return 'other';
}

export const AIConfigPanel: React.FC = () => {
  const { addToast } = useApp();

  // Saved Keys State
  const [savedKeys, setSavedKeys] = useState<SavedApiKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');

  // Key Usage & Cooldown State
  const [keyUsageStats, setKeyUsageStats] = useState<Record<string, KeyUsageStats>>({});
  const [dailyLimitInput, setDailyLimitInput] = useState<number>(1500);
  const [cooldownRemainingMap, setCooldownRemainingMap] = useState<Record<string, number>>({});

  // New Key Form State
  const [isAddingNewKey, setIsAddingNewKey] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [saveKeyError, setSaveKeyError] = useState<string | null>(null);

  // Dynamic Models State
  const [availableModels, setAvailableModels] = useState<AIModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(aiService.getModel());
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Connection Test State
  const [isTesting, setIsTesting] = useState(false);
  const [testingProgressText, setTestingProgressText] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    category: GeminiErrorCategory;
    message: string;
    statusCode?: number;
  } | null>(null);

  // Load Models Callback
  const loadModels = useCallback(async (forceRefresh = false) => {
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      const models = await aiService.fetchAvailableModels(forceRefresh);
      setAvailableModels(models);
      // Synchronize selected model
      const currentModel = aiService.getModel();
      const exists = models.some((m) => m.id === currentModel);
      if (exists) {
        setSelectedModel(currentModel);
      } else if (models.length > 0) {
        const preferred =
          models.find((m) => m.id === 'gemini-3.7-flash') ||
          models.find((m) => categorizeModel(m) === 'chat') ||
          models[0];
        setSelectedModel(preferred.id);
        aiService.setModel(preferred.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat daftar model dari API.';
      setModelsError(msg);
      setTestResult(null);
      setAvailableModels(aiService.getAvailableModels());
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // Sync state from aiService
  const syncStateFromService = useCallback(() => {
    const keys = aiService.getSavedApiKeys();
    setSavedKeys(keys);

    const activeRawKey = aiService.getApiKey();
    if (activeRawKey) {
      const matching = keys.find((k) => k.fullKey === activeRawKey);
      if (matching) {
        setSelectedKeyId(matching.id);
      } else {
        const newEntry = aiService.saveApiKey(activeRawKey);
        setSavedKeys(aiService.getSavedApiKeys());
        setSelectedKeyId(newEntry.id);
      }
    } else {
      setSelectedKeyId('__env__');
    }

    setSelectedModel(aiService.getModel());
    setKeyUsageStats(aiService.getKeyUsageStats());
    setDailyLimitInput(aiService.getDailyRequestLimit());
  }, []);

  // Initial Load & Event Listeners
  useEffect(() => {
    let isMounted = true;

    const loadCentral = async () => {
      try {
        await aiService.loadCentralKeys();
      } catch (err) {
        console.warn('Gagal memuat kunci terpusat:', err);
      }
      if (isMounted) {
        syncStateFromService();
        loadModels(false);
      }
    };

    loadCentral();

    const handleKeyChanged = () => {
      syncStateFromService();
      loadModels(true);
    };

    const handleModelChanged = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      if (customEvt.detail) {
        setSelectedModel(customEvt.detail);
      } else {
        setSelectedModel(aiService.getModel());
      }
    };

    const handleFailover = (e: Event) => {
      const customEvt = e as CustomEvent<{
        fromLabel: string;
        toLabel: string;
        fromKeyId?: string;
        toKeyId?: string;
      }>;
      if (customEvt.detail?.fromLabel && customEvt.detail?.toLabel) {
        addToast(
          'warning',
          'Failover Kunci Otomatis',
          `Kunci "${customEvt.detail.fromLabel}" kuota habis, beralih ke "${customEvt.detail.toLabel}".`
        );
        syncStateFromService();
      }
    };

    const handleStatsUpdated = () => {
      setKeyUsageStats(aiService.getKeyUsageStats());
      setDailyLimitInput(aiService.getDailyRequestLimit());
    };

    window.addEventListener('gemini-key-changed', handleKeyChanged);
    window.addEventListener('gemini-model-changed', handleModelChanged);
    window.addEventListener('gemini-key-failover', handleFailover);
    window.addEventListener('gemini-key-stats-updated', handleStatsUpdated);
    window.addEventListener('storage', syncStateFromService);
    window.addEventListener('focus', syncStateFromService);

    return () => {
      isMounted = false;
      window.removeEventListener('gemini-key-changed', handleKeyChanged);
      window.removeEventListener('gemini-model-changed', handleModelChanged);
      window.removeEventListener('gemini-key-failover', handleFailover);
      window.removeEventListener('gemini-key-stats-updated', handleStatsUpdated);
      window.removeEventListener('storage', syncStateFromService);
      window.removeEventListener('focus', syncStateFromService);
    };
  }, [addToast, loadModels, syncStateFromService]);

  // Live countdown timer for active cooldowns
  useEffect(() => {
    const updateCooldowns = () => {
      const map: Record<string, number> = {};
      for (const k of savedKeys) {
        const sec = aiService.getKeyCooldownRemainingSec(k.id);
        if (sec > 0) {
          map[k.id] = sec;
        }
      }
      setCooldownRemainingMap(map);
    };

    updateCooldowns();
    const interval = setInterval(updateCooldowns, 1000);
    return () => clearInterval(interval);
  }, [savedKeys]);

  // Handle switching active API Key centrally
  const handleKeySelectionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTestResult(null);
    setSaveKeyError(null);

    if (value === '__add_new__') {
      setIsAddingNewKey(true);
      return;
    }

    setIsAddingNewKey(false);
    setSelectedKeyId(value);

    if (value === '__env__') {
      aiService.setApiKey('');
      addToast('info', 'Kunci Server Aktif', 'Menggunakan GEMINI_API_KEY dari lingkungan server.');
    } else {
      const target = savedKeys.find((k) => k.id === value);
      if (target) {
        await aiService.setActiveCentralKey(target.id);
        addToast('success', 'API Key Aktif Diperbarui', `Kunci aktif: ${target.label} (${target.maskedKey})`);
      }
    }

    // Refresh model list using the newly selected API Key
    await loadModels(true);
  };

  // Handle Saving New API Key Centrally
  const handleSaveNewKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newKeyInput.trim();
    if (!cleanKey) {
      setSaveKeyError('Silakan masukkan API Key Gemini yang valid.');
      return;
    }

    setIsSavingKey(true);
    setSaveKeyError(null);
    setTestResult(null);

    try {
      // 1. Test the new key before persisting
      const testRes = await aiService.testConnection(undefined, selectedModel, cleanKey);
      if (!testRes.success && testRes.category === 'INVALID_API_KEY') {
        throw new Error('API Key tidak valid. Silakan periksa kembali kunci dari Google AI Studio.');
      }

      // 2. Persist key centrally to backend database
      const savedEntry = await aiService.saveCentralApiKey(cleanKey, newKeyLabel.trim() || undefined);
      syncStateFromService();
      setSelectedKeyId(savedEntry.id);
      setIsAddingNewKey(false);
      setNewKeyInput('');
      setNewKeyLabel('');
      setShowNewKey(false);

      addToast(
        'success',
        'API Key Tersimpan Terpusat',
        `Kunci "${savedEntry.label}" (${savedEntry.maskedKey}) tersimpan di database dan berlaku untuk semua perangkat.`
      );

      // 3. Refresh models dynamically using new key
      await loadModels(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan dan memvalidasi API Key.';
      setSaveKeyError(msg);
      addToast('error', 'Validasi Kunci Gagal', msg);
    } finally {
      setIsSavingKey(false);
    }
  };

  // Handle Deleting a Saved API Key Centrally
  const handleDeleteKey = async (keyIdToDelete: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = savedKeys.find((k) => k.id === keyIdToDelete);
    if (!target) return;

    if (
      window.confirm(
        `Hapus API Key "${target.label}" (${target.maskedKey}) dari database pusat? Tindakan ini berlaku untuk semua perangkat.`
      )
    ) {
      try {
        await aiService.removeCentralApiKey(keyIdToDelete);
        syncStateFromService();
        addToast('info', 'Kunci Dihapus', `API Key ${target.maskedKey} telah dihapus dari database.`);
        loadModels(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal menghapus kunci dari database.';
        addToast('error', 'Gagal Hapus Kunci', msg);
      }
    }
  };

  // Handle Model Change
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    aiService.setModel(newModel);
    setTestResult(null);
    addToast('info', 'Model Diperbarui', `Model aktif: ${aiService.getModelDisplayName(newModel)}`);
  };

  // Handle Refreshing Models List Manually
  const handleRefreshModels = async () => {
    await loadModels(true);
    addToast('success', 'Daftar Model Diperbarui', 'Daftar model Gemini terbaru berhasil dimuat dari API.');
  };

  // Handle Testing Connection (Tests explicitly selected key in dropdown per Requirement 5)
  const handleTestConnection = async () => {
    aiService.setModel(selectedModel);

    setIsTesting(true);
    setTestingProgressText(null);
    setTestResult(null);
    setModelsError(null);

    try {
      const explicitKeyToTest = activeKeyObj ? activeKeyObj.fullKey : undefined;
      const res = await aiService.testConnection(
        (_attempt, _max, text) => {
          setTestingProgressText(text);
        },
        selectedModel,
        explicitKeyToTest
      );
      setTestResult(res);

      if (res.success) {
        addToast('success', 'Koneksi Berhasil', res.message);
      } else if (res.category === 'UNAVAILABLE') {
        addToast('warning', 'Layanan Gemini Sibuk (503)', res.message);
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

  // Grouping Models
  const { chatModels, specialistModels, otherModels } = useMemo(() => {
    const chat: AIModelInfo[] = [];
    const specialist: AIModelInfo[] = [];
    const other: AIModelInfo[] = [];

    availableModels.forEach((m) => {
      const category = categorizeModel(m);
      if (category === 'chat') {
        chat.push(m);
      } else if (category === 'specialist') {
        specialist.push(m);
      } else {
        other.push(m);
      }
    });

    return { chatModels: chat, specialistModels: specialist, otherModels: other };
  }, [availableModels]);

  // Currently Active Key Object for info
  const activeKeyObj = savedKeys.find((k) => k.id === selectedKeyId);
  const activeMaskedText = activeKeyObj
    ? activeKeyObj.maskedKey
    : aiService.getApiKey()
    ? maskApiKey(aiService.getApiKey())
    : 'Kunci Server Default';

  // Selected Model Object
  const selectedModelObj = availableModels.find((m) => m.id === selectedModel);
  const isSelectedSpecialist = selectedModelObj ? categorizeModel(selectedModelObj) === 'specialist' : false;

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border-2 border-stone-900 dark:border-stone-400 shadow-[5px_5px_0px_#18181b] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-stone-900 dark:border-stone-700 pb-3.5">
        <div className="flex items-center gap-2 text-stone-950 dark:text-stone-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-300 border-2 border-stone-900 flex items-center justify-center shadow-[2px_2px_0px_#18181b]">
            <Bot className="w-4 h-4 text-stone-950 stroke-[2.5]" />
          </div>
          <h3 className="text-base font-black tracking-tight">Konfigurasi Uti AI (Gemini API)</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 bg-amber-300 text-stone-950 border-2 border-stone-900 rounded-lg shadow-[2px_2px_0px_#18181b]">
          <Sparkles className="w-3.5 h-3.5 text-stone-950 stroke-[2.5]" />
          <span>Chat &amp; Operasional Engine</span>
        </div>
      </div>

      <div className="space-y-6 text-xs">
        {/* ===================================================================== */}
        {/* SECTION 1: API KEYS MANAGEMENT */}
        {/* ===================================================================== */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="block font-black text-stone-950 dark:text-stone-100 text-xs">
                  Pengelolaan API Key Gemini:
                </label>
                {activeKeyObj && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-300 text-stone-950 border border-stone-900 text-[10px] font-black shadow-[1.5px_1.5px_0px_#18181b]">
                    <Check className="w-3 h-3 stroke-[3]" />
                    Aktif: {activeKeyObj.label}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-stone-600 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline shrink-0 stroke-[2.5]" />
                <span>Tersimpan terpusat di database — berlaku untuk semua perangkat.</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-800 dark:text-stone-300">
              <Key className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
              <span>
                Aktif: <strong className="font-mono bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-900 dark:border-stone-600 text-stone-950 dark:text-stone-100">{activeMaskedText}</strong>
              </span>
            </div>
          </div>

          {/* EMPTY STATE: When no keys are saved at all */}
          {savedKeys.length === 0 && !isAddingNewKey ? (
            <div className="p-4 bg-amber-50 dark:bg-stone-800/80 border-2 border-stone-900 dark:border-stone-500 rounded-xl space-y-3 shadow-[3.5px_3.5px_0px_#18181b]">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-300 border-2 border-stone-900 text-stone-950 flex items-center justify-center shrink-0 mt-0.5 shadow-[2px_2px_0px_#18181b]">
                  <Key className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-black text-stone-950 dark:text-stone-100 text-xs">
                    Belum Ada API Key Gemini Tersimpan
                  </h4>
                  <p className="text-stone-700 dark:text-stone-300 text-[11px] leading-relaxed font-medium">
                    Untuk menggunakan Uti AI secara optimal dengan kuota penuh Anda sendiri,
                    tambahkan API Key resmi dari Google AI Studio. Kunci akan tersimpan terpusat di database untuk seluruh perangkat.
                  </p>
                </div>
              </div>

              {/* Steps Guide */}
              <div className="bg-white dark:bg-stone-900 p-3 rounded-lg border-2 border-stone-900 dark:border-stone-600 space-y-2 text-[11px] shadow-[2px_2px_0px_#18181b]">
                <div className="font-bold text-stone-950 dark:text-stone-100">Langkah Cepat Mendapatkan Kunci:</div>
                <ol className="list-decimal list-inside space-y-1 text-stone-700 dark:text-stone-300 font-medium">
                  <li>
                    Kunjungi{' '}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-800 dark:text-amber-300 underline font-bold inline-flex items-center gap-0.5 hover:text-amber-600"
                    >
                      Google AI Studio <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                  <li>Klik tombol <strong>&quot;Create API key&quot;</strong> (Gratis).</li>
                  <li>Salin kuncinya dan klik tombol <strong>&quot;+ Tambah API Key Baru&quot;</strong> di bawah.</li>
                </ol>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  <span>Tersimpan terpusat di database — berlaku untuk semua perangkat.</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNewKey(true)}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 border-2 border-stone-900 rounded-lg font-black transition-all inline-flex items-center gap-1.5 shadow-[3px_3px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Tambah API Key Baru</span>
                </button>
              </div>
            </div>
          ) : (
            /* SELECTOR & CONTROLS: When keys exist or user is selecting */
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <select
                  value={isAddingNewKey ? '__add_new__' : selectedKeyId}
                  onChange={handleKeySelectionChange}
                  className="w-full px-3 py-2 border-2 border-stone-900 dark:border-stone-500 rounded-lg focus:ring-2 focus:ring-amber-400 text-stone-950 dark:text-stone-100 text-xs bg-white dark:bg-stone-900 font-bold shadow-[2.5px_2.5px_0px_#18181b]"
                >
                  <option value="__env__">
                    ⚙️ Kunci Server Environment (Default / Otomatis)
                  </option>
                  {savedKeys.map((k, idx) => {
                    const inCooldown = aiService.isKeyInCooldown(k.id);
                    const labelHasMask = !!(k.label && k.maskedKey && k.label.includes(k.maskedKey));
                    return (
                      <option key={k.id} value={k.id}>
                        🔑 {k.label || `API Key ${idx + 1}`}
                        {labelHasMask ? '' : ` •••• (${k.maskedKey})`}
                        {inCooldown ? ' [Cooldown Kuota]' : ''}
                      </option>
                    );
                  })}
                  <option value="__add_new__" className="font-black text-amber-700 dark:text-amber-400">
                    + Masukkan API Key Baru...
                  </option>
                </select>
              </div>

              <div className="flex gap-2">
                {!isAddingNewKey && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewKey(true)}
                    className="px-3.5 py-2 bg-yellow-300 hover:bg-yellow-200 text-stone-950 border-2 border-stone-900 rounded-lg font-black transition-all inline-flex items-center gap-1.5 shrink-0 shadow-[2.5px_2.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    title="Tambah API Key Baru"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Tambah Kunci</span>
                  </button>
                )}

                {activeKeyObj && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteKey(activeKeyObj.id, e)}
                    className="px-3 py-2 bg-rose-200 hover:bg-rose-300 text-stone-950 border-2 border-stone-900 rounded-lg font-black transition-all inline-flex items-center gap-1 shrink-0 shadow-[2.5px_2.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    title="Hapus Kunci Aktif"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="hidden sm:inline">Hapus</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE KEY STATUS CARD */}
          {activeKeyObj && (
            <div className="p-3.5 bg-emerald-100 dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-500 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[3px_3px_0px_#18181b]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-400 text-stone-950 border border-stone-900 text-[10px] font-black shadow-[1.5px_1.5px_0px_#18181b]">
                    <Check className="w-3 h-3 stroke-[3]" />
                    Kunci Aktif
                  </span>
                  <span className="font-black text-stone-950 dark:text-stone-100 text-xs">{activeKeyObj.label}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-stone-700 dark:text-stone-300 font-mono font-medium">
                  <span>Masked: {activeKeyObj.maskedKey}</span>
                  {activeKeyObj.createdAt && (
                    <>
                      <span>•</span>
                      <span className="font-sans">
                        Ditambahkan: {new Date(activeKeyObj.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || isLoadingModels}
                className="px-3.5 py-1.5 bg-emerald-300 hover:bg-emerald-400 text-stone-950 border-2 border-stone-900 rounded-lg font-black transition-all inline-flex items-center gap-1.5 shrink-0 shadow-[2.5px_2.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isTesting ? 'animate-spin' : ''}`} />
                <span>{testingProgressText ? 'Menguji...' : 'Uji Koneksi Kunci Ini'}</span>
              </button>
            </div>
          )}

          {/* FORM: INPUT API KEY BARU */}
          {isAddingNewKey && (
            <div className="p-4 bg-sky-50 dark:bg-stone-800/90 border-2 border-stone-900 dark:border-stone-500 rounded-xl space-y-3 transition-all shadow-[3.5px_3.5px_0px_#18181b]">
              <div className="flex items-center justify-between border-b-2 border-stone-900 dark:border-stone-700 pb-2">
                <div className="flex items-center gap-1.5 text-stone-950 dark:text-stone-100 font-black">
                  <Plus className="w-4 h-4 stroke-[3] text-stone-950 dark:text-stone-100" />
                  <span>Input &amp; Simpan API Key Baru</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewKey(false);
                    setSaveKeyError(null);
                  }}
                  className="text-stone-600 dark:text-stone-400 hover:text-stone-950 font-bold text-xs"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleSaveNewKey} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-[11px] font-bold text-stone-900 dark:text-stone-200">
                      Kunci API Gemini (AIzaSy...):
                    </label>
                    <div className="relative">
                      <input
                        type={showNewKey ? 'text' : 'password'}
                        value={newKeyInput}
                        onChange={(e) => setNewKeyInput(e.target.value)}
                        placeholder="Tempel API Key baru di sini..."
                        autoComplete="off"
                        className="w-full pl-3 pr-10 py-2 border-2 border-stone-900 dark:border-stone-500 rounded-lg text-stone-950 dark:text-stone-100 font-mono text-xs bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewKey(!showNewKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-600 dark:text-stone-400 hover:text-stone-950 p-0.5"
                        title={showNewKey ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showNewKey ? <EyeOff className="w-4 h-4 stroke-[2.5]" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-stone-900 dark:text-stone-200">
                      Label Kunci (Opsional):
                    </label>
                    <input
                      type="text"
                      value={newKeyLabel}
                      onChange={(e) => setNewKeyLabel(e.target.value)}
                      placeholder={`API Key ${savedKeys.length + 1}`}
                      className="w-full px-3 py-2 border-2 border-stone-900 dark:border-stone-500 rounded-lg text-stone-950 dark:text-stone-100 text-xs bg-white dark:bg-stone-900 font-bold shadow-[2px_2px_0px_#18181b]"
                    />
                  </div>
                </div>

                {saveKeyError && (
                  <div className="p-2.5 bg-rose-200 border-2 border-stone-900 rounded-lg text-stone-950 font-bold text-[11px] flex items-center gap-2 shadow-[2px_2px_0px_#18181b]">
                    <AlertCircle className="w-4 h-4 text-rose-800 shrink-0 stroke-[2.5]" />
                    <span>{saveKeyError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewKey(false);
                      setSaveKeyError(null);
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-600 text-stone-950 dark:text-stone-200 rounded-lg font-bold hover:bg-stone-100 shadow-[2px_2px_0px_#18181b]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingKey || !newKeyInput.trim()}
                    className="px-4 py-1.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-stone-950 border-2 border-stone-900 rounded-lg font-black transition-all inline-flex items-center gap-1.5 shadow-[2.5px_2.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    {isSavingKey ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin stroke-[2.5]" />
                        <span>Memvalidasi &amp; Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-stone-950 stroke-[2.5]" />
                        <span>Simpan &amp; Jadikan Kunci Aktif</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SECTION 1.5: STATUS & ESTIMASI KUOTA API KEY */}
          {/* ===================================================================== */}
          <div className="pt-4 border-t-2 border-stone-900 dark:border-stone-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              <div>
                <h4 className="text-xs font-black text-stone-950 dark:text-stone-100 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
                  <span>Status &amp; Estimasi Kuota API Key</span>
                </h4>
                <p className="text-[11px] font-medium text-stone-600 dark:text-stone-400 mt-0.5">
                  Estimasi — dihitung dari request yang tercatat di perangkat ini, reset tengah malam waktu Pasifik.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-yellow-100 dark:bg-stone-800 px-3 py-1 rounded-lg border-2 border-stone-900 dark:border-stone-500 text-[11px] shadow-[2px_2px_0px_#18181b]">
                  <span className="text-stone-900 dark:text-stone-200 font-bold">Batas Harian:</span>
                  <input
                    type="number"
                    min={10}
                    max={100000}
                    value={dailyLimitInput || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDailyLimitInput(isNaN(val) ? 0 : val);
                    }}
                    onBlur={() => {
                      const val = dailyLimitInput > 0 ? dailyLimitInput : 1500;
                      setDailyLimitInput(val);
                      aiService.setDailyRequestLimit(val);
                      addToast('success', 'Batas Harian Diperbarui', `Batas estimasi diatur ke ${val} request/hari.`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = dailyLimitInput > 0 ? dailyLimitInput : 1500;
                        setDailyLimitInput(val);
                        aiService.setDailyRequestLimit(val);
                        addToast('success', 'Batas Harian Diperbarui', `Batas estimasi diatur ke ${val} request/hari.`);
                      }
                    }}
                    className="w-16 px-1 py-0.5 text-center font-mono font-black bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-500 rounded text-stone-950 dark:text-stone-100 text-xs"
                    title="Batas estimasi request harian (default 1500 untuk tier flash gratis)"
                  />
                  <span className="text-stone-700 dark:text-stone-300 font-bold">req</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset semua statistik request dan error API key di perangkat ini?')) {
                      aiService.resetKeyUsageStats();
                      addToast('info', 'Statistik Direset', 'Statistik penggunaan API key telah direset ke nol.');
                    }
                  }}
                  className="px-3 py-1.5 text-[11px] font-bold text-stone-950 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 border-2 border-stone-900 dark:border-stone-500 rounded-lg shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  title="Reset akumulasi request dan error hari ini"
                >
                  Reset statistik
                </button>
              </div>
            </div>

            {savedKeys.length === 0 ? (
              <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border-2 border-dashed border-stone-900 dark:border-stone-600 rounded-xl text-center text-xs font-semibold text-stone-600 dark:text-stone-400">
                Belum ada API Key tersimpan. Tambahkan API Key di atas untuk memantau status dan estimasi kuota.
              </div>
            ) : (
              <div className="space-y-3">
                {savedKeys.map((k, idx) => {
                  const isSelected = k.fullKey === aiService.getApiKey();
                  const isInvalid = aiService.isKeyInvalid(k.id);
                  const cooldownSec = cooldownRemainingMap[k.id] || 0;
                  const isCooldown = cooldownSec > 0 || aiService.isKeyInCooldown(k.id);
                  const stats = keyUsageStats[k.id] || {
                    dateKey: '',
                    requests: 0,
                    errors429: 0,
                    errors401: 0,
                    otherErrors: 0,
                    lastErrorAt: null,
                    lastErrorType: null,
                  };

                  const requests = stats.requests || 0;
                  const limit = dailyLimitInput || 1500;
                  const percentage = Math.min(100, Math.round((requests / limit) * 100));

                  let barColorClass = 'bg-emerald-400';
                  let barTextColorClass = 'text-emerald-800 dark:text-emerald-300';
                  if (percentage >= 95) {
                    barColorClass = 'bg-rose-400';
                    barTextColorClass = 'text-rose-800 dark:text-rose-300';
                  } else if (percentage >= 70) {
                    barColorClass = 'bg-amber-400';
                    barTextColorClass = 'text-amber-800 dark:text-amber-300';
                  }

                  let formattedErrorTime = '-';
                  if (stats.lastErrorAt) {
                    try {
                      const d = new Date(stats.lastErrorAt);
                      formattedErrorTime = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    } catch {
                      formattedErrorTime = '-';
                    }
                  }

                  const hasErrors = stats.errors429 > 0 || stats.errors401 > 0 || stats.otherErrors > 0;

                  return (
                    <div
                      key={k.id}
                      className={`p-3.5 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'bg-amber-100/70 dark:bg-amber-950/40 border-stone-900 dark:border-amber-500 shadow-[3.5px_3.5px_0px_#18181b]'
                          : 'bg-white dark:bg-stone-900 border-stone-900 dark:border-stone-600 shadow-[2.5px_2.5px_0px_#18181b]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs text-stone-950 dark:text-stone-100">
                            {k.label || `API Key ${idx + 1}`}
                          </span>
                          <span className="text-[11px] font-mono font-medium text-stone-600 dark:text-stone-400">
                            •••• ({k.maskedKey})
                          </span>

                          {isSelected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-300 text-stone-950 border border-stone-900 font-black text-[10px] shadow-[1.5px_1.5px_0px_#18181b]">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Sedang dipakai</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isInvalid ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-200 text-stone-950 font-black text-[10px] border border-stone-900 shadow-[1.5px_1.5px_0px_#18181b]">
                                <AlertCircle className="w-3 h-3 text-rose-800 stroke-[2.5]" />
                                <span>Invalid</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteKey(k.id, e)}
                                className="px-2 py-0.5 text-[10px] font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded border border-stone-900 shadow-[1px_1px_0px_#18181b]"
                                title="Hapus key invalid"
                              >
                                Hapus
                              </button>
                            </div>
                          ) : isCooldown ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-200 text-stone-950 font-black text-[10px] border border-stone-900 shadow-[1.5px_1.5px_0px_#18181b] animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-800 stroke-[2.5]" />
                              <span>Cooldown — sisa {cooldownSec}s</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-200 text-stone-950 font-black text-[10px] border border-stone-900 shadow-[1.5px_1.5px_0px_#18181b]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800 stroke-[2.5]" />
                              <span>Aktif</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-700 dark:text-stone-300 font-bold">
                            ≈ {requests} / {limit} request hari ini
                          </span>
                          <span className={`font-mono font-black ${barTextColorClass}`}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="h-3 w-full bg-stone-200 dark:bg-stone-800 rounded-md overflow-hidden border-2 border-stone-900 dark:border-stone-600">
                          <div
                            className={`h-full transition-all duration-500 ${barColorClass}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-2 text-[11px] text-stone-600 dark:text-stone-400 font-mono font-semibold flex items-center justify-between">
                        {hasErrors ? (
                          <span className="text-rose-700 dark:text-rose-400">
                            429 ×{stats.errors429} · 401 ×{stats.errors401} · terakhir: {formattedErrorTime} ({stats.lastErrorType || 'OTHER'})
                          </span>
                        ) : (
                          <span className="font-sans text-stone-500 dark:text-stone-400">
                            Belum ada error hari ini
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* SECTION 2: DYNAMIC MODEL SELECTOR (GROUPED) */}
        {/* ===================================================================== */}
        <div className="pt-4 border-t-2 border-stone-900 dark:border-stone-700">
          <div className="flex items-center justify-between mb-2">
            <label className="block font-black text-stone-950 dark:text-stone-100 text-xs">
              Model Gemini (Discovery Dinamis dari API):
            </label>
            <button
              type="button"
              onClick={handleRefreshModels}
              disabled={isLoadingModels}
              className="text-[11px] font-bold text-stone-800 dark:text-stone-300 hover:text-stone-950 inline-flex items-center gap-1.5 transition-colors px-2 py-0.5 bg-stone-100 dark:bg-stone-800 border border-stone-900 dark:border-stone-600 rounded shadow-[1px_1px_0px_#18181b]"
              title="Perbarui daftar model dari Google AI Studio"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingModels ? 'animate-spin text-emerald-600' : 'text-stone-700 dark:text-stone-300'}`} />
              <span>{isLoadingModels ? 'Memuat model...' : 'Refresh Models'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <select
                value={selectedModel}
                onChange={handleModelChange}
                disabled={isLoadingModels}
                className="w-full px-3 py-2 border-2 border-stone-900 dark:border-stone-500 rounded-lg focus:ring-2 focus:ring-amber-400 text-stone-950 dark:text-stone-100 text-xs bg-white dark:bg-stone-900 font-bold shadow-[2.5px_2.5px_0px_#18181b]"
              >
                {isLoadingModels && availableModels.length === 0 && (
                  <option value={selectedModel}>Memuat daftar model dari API...</option>
                )}

                {/* Group 1: Chat & Operational (Recommended) */}
                {chatModels.length > 0 && (
                  <optgroup label="🌟 Chat &amp; Operasional Gudang (Direkomendasikan)">
                    {chatModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName} ({m.id})
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Group 2: Other Models */}
                {otherModels.length > 0 && (
                  <optgroup label="Model Lainnya">
                    {otherModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName} ({m.id})
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Group 3: Specialist Models */}
                {specialistModels.length > 0 && (
                  <optgroup label="⚠️ Model Spesialis (Tidak disarankan untuk chat gudang)">
                    {specialistModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName} ({m.id}) — Spesialis
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Fallback if list is empty or current model not yet in groups */}
                {availableModels.length === 0 && (
                  <option value={selectedModel}>
                    {aiService.getModelDisplayName(selectedModel)} ({selectedModel})
                  </option>
                )}
              </select>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isLoadingModels}
              className="px-4 py-2 bg-emerald-300 hover:bg-emerald-400 text-stone-950 border-2 border-stone-900 rounded-lg font-black transition-all inline-flex items-center gap-1.5 shrink-0 shadow-[2.5px_2.5px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isTesting ? 'animate-spin' : ''}`} />
              <span>{testingProgressText ? 'Mencoba...' : 'Test Connection'}</span>
            </button>
          </div>

          {/* Warning badge if user explicitly selected a specialist model */}
          {isSelectedSpecialist && (
            <div className="mt-2 p-3 bg-amber-100 border-2 border-stone-900 rounded-lg text-xs text-stone-950 font-bold flex items-start gap-2 shadow-[2px_2px_0px_#18181b]">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 stroke-[2.5]" />
              <div>
                <strong>Perhatian:</strong> Model ini tergolong model spesialis (audio/vision/research/robotics) dan tidak dioptimalkan untuk percakapan chat operasional atau tool calling gudang. Sebaiknya gunakan seri <strong>Gemini Flash</strong> atau <strong>Pro</strong>.
              </div>
            </div>
          )}

          {/* Model Description & Metadata */}
          {selectedModelObj && (
            <div className="mt-2 p-3 bg-stone-100 dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-600 rounded-lg text-xs text-stone-900 dark:text-stone-200 space-y-1 shadow-[2px_2px_0px_#18181b]">
              <div className="flex items-center justify-between">
                <span className="font-black text-stone-950 dark:text-stone-100 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300 stroke-[2.5]" />
                  {selectedModelObj.displayName}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-300 text-stone-950 border border-stone-900 font-mono font-bold text-[10px] shadow-[1px_1px_0px_#18181b]">
                  <Layers className="w-2.5 h-2.5 text-stone-950" />
                  {selectedModelObj.id}
                </span>
              </div>
              {selectedModelObj.description && (
                <p className="text-stone-600 dark:text-stone-400 font-medium leading-relaxed text-[11px] pt-1">
                  {selectedModelObj.description}
                </p>
              )}
            </div>
          )}

          {modelsError && (
            <div className="mt-2 p-3 bg-amber-100 border-2 border-stone-900 rounded-lg text-stone-950 text-xs font-bold flex items-center justify-between shadow-[2px_2px_0px_#18181b]">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-800 stroke-[2.5]" />
                <span>{modelsError}</span>
              </div>
              <button
                type="button"
                onClick={() => loadModels(true)}
                className="font-black underline hover:text-amber-900 ml-2 shrink-0"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress feedback while testing */}
      {isTesting && testingProgressText && (
        <div className="p-3 bg-amber-100 border-2 border-stone-900 rounded-lg text-stone-950 font-black text-xs flex items-center gap-2 shadow-[2.5px_2.5px_0px_#18181b]">
          <span className="neo-spinner-multicolor-sm" />
          <span>{testingProgressText}</span>
        </div>
      )}

      {/* Test Connection Result Box */}
      {testResult && (
        <div
          className={`p-3.5 rounded-xl border-2 border-stone-900 shadow-[4px_4px_0px_#18181b] text-xs flex items-start gap-2.5 ${
            testResult.success
              ? 'bg-emerald-100 text-stone-950'
              : testResult.category === 'UNAVAILABLE' || testResult.category === 'QUOTA'
              ? 'bg-amber-100 text-stone-950'
              : 'bg-rose-100 text-stone-950'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5 stroke-[2.5]" />
          ) : testResult.category === 'UNAVAILABLE' || testResult.category === 'QUOTA' ? (
            <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5 stroke-[2.5]" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-800 shrink-0 mt-0.5 stroke-[2.5]" />
          )}

          <div className="space-y-1">
            <div className="font-black text-sm">
              {testResult.success
                ? 'Koneksi Berhasil'
                : testResult.category === 'UNAVAILABLE'
                ? 'Layanan Gemini Sementara Sibuk (503)'
                : testResult.category === 'QUOTA'
                ? 'Batas Kuota Penggunaan Terlampaui (429)'
                : testResult.category === 'INVALID_API_KEY'
                ? 'Kunci API Tidak Valid (401)'
                : 'Koneksi Gagal'}
            </div>
            <p className="leading-relaxed font-semibold opacity-95">{testResult.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
