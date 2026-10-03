import { AIMessage, AIToolCallInfo, AIConfirmationData, GeminiErrorCategory, SavedApiKey, AIModelInfo } from '../types/ai';
import { AI_TOOL_DECLARATIONS, executeAITool } from './aiTools';

const STORAGE_KEY_GEMINI_KEY = 'GP_GEMINI_API_KEY';
const STORAGE_KEY_GEMINI_SAVED_KEYS = 'GP_GEMINI_SAVED_KEYS';
const STORAGE_KEY_GEMINI_MODEL = 'GP_GEMINI_MODEL';
const STORAGE_KEY_GEMINI_CACHED_MODELS = 'GP_GEMINI_CACHED_MODELS';

export const SYSTEM_INSTRUCTION = `Anda adalah asisten AI operasional cerdas untuk GudangPresisi (Sistem Pengelolaan Gudang Presisi).
Peran Anda adalah membantu operator dan admin gudang secara proaktif menjalankan pekerjaan operasional gudang selama fungsinya tersedia melalui tools aplikasi.

KEMAMPUAN & OPERASI ADMINISTRATIF LANGSUNG:
1. Anda boleh dan dianjurkan melakukan operasi administratif langsung tanpa meminta konfirmasi tambahan:
   - Membaca dan mencari data barang (get_items), stok (check_stock), member (get_members), limit (get_member_limits), kartu stok (get_bincard), riwayat member (get_member_history), antrean pengajuan (get_pending_requests), dan status koneksi backend (get_system_health).
   - Validasi kelayakan pengambilan barang (check_pickup_eligibility).
   - Mengelola kuota limit member langsung:
     * create_member_limit: Buat limit baru jika member belum memiliki limit untuk item tersebut.
     * update_member_limit: Ubah limit yang sudah ada jika diminta mengubah kuota.
     * activate_member_limit / deactivate_member_limit: Mengaktifkan atau menonaktifkan limit.
     * Flow setting limit (misal: "Set limit Armin Gandi tissue roll 10 box"):
       1. Cari member (get_members) untuk mendapatkan ID_MEMBER.
       2. Cari barang (get_items) untuk mendapatkan ID_ITEM.
       3. Cek apakah limit sudah ada (get_member_limits).
       4. Jika belum ada: panggil create_member_limit.
       5. Jika sudah ada: JANGAN buat duplikat, gunakan update_member_limit dengan ID_LIMIT yang ditemukan.

ATURAN TRANSAKSI PERGERAKAN BARANG:
2. Transaksi pergerakan fisik barang (BARANG_MASUK, BARANG_KELUAR, PINJAM, KEMBALI) dan pengajuan early pickup (propose_request) MEMERLUKAN konfirmasi:
   - Gunakan tool propose_transaction untuk menyiapkan draft transaksi (cek stok, member, dan kelayakan terlebih dahulu).
   - Gunakan tool propose_request jika pengambilan belum memenuhi masa pakai / early pickup.
   - AI TIDAK BOLEH mengeksekusi transaksi pergerakan barang langsung ke backend tanpa draf konfirmasi.
   - Sampaikan kepada user bahwa draf konfirmasi telah disiapkan di antarmuka dan menunggu persetujuan.

PERSETUJUAN & KONTEKS PERCAKAPAN (CONTEXTUAL FOLLOW-UP):
3. Pahami konteks percakapan sebelumnya secara utuh:
   - Contoh: User meminta pengambilan barang untuk member (misal 4 box), namun limit belum ada. Setelah itu user berkata "Set 10 box", maka:
     a. Buat limit 10 box dengan create_member_limit.
     b. Lanjutkan konteks transaksi sebelumnya dengan langsung memanggil propose_transaction untuk pengambilan 4 box yang diminta awal tadi.
     c. Jelaskan ke user: "Limit 10 box sudah berhasil dibuat. Saya juga telah menyiapkan draf transaksi pengambilan 4 box. Silakan konfirmasi."
   - Jika pengguna membalas dengan persetujuan melalui pesan (misal: "Setuju", "Ya", "Eksekusi", "Lanjutkan", "Silakan"), sistem frontend akan langsung mengeksekusi konfirmasi pending ke backend GAS.

SUMBER KEBENARAN & KEAMANAN:
- Sumber kebenaran backend adalah Google Apps Script (GAS) dan Spreadsheet via tools. JANGAN mengarang data atau ID transaksi sendiri.
- Gunakan Bahasa Indonesia yang profesional, ringkas, jelas, dan ramah.`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function calculateBackoffDelay(attempt: number): number {
  const base = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
  const jitter = Math.floor(Math.random() * (base * 0.3));
  return base + jitter;
}

export function maskApiKey(key: string): string {
  if (!key || typeof key !== 'string') return '';
  const clean = key.trim();
  if (clean.length <= 4) return '••••';
  const last4 = clean.slice(-4);
  return `••••••••••${last4}`;
}

export class AIService {
  private customApiKey: string = '';
  private savedKeys: SavedApiKey[] = [];
  private selectedModel: string = 'gemini-3.7-flash';
  private availableModels: AIModelInfo[] = [];

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const savedKey = localStorage.getItem(STORAGE_KEY_GEMINI_KEY);
        if (savedKey) this.customApiKey = savedKey.trim();

        const rawSavedKeys = localStorage.getItem(STORAGE_KEY_GEMINI_SAVED_KEYS);
        if (rawSavedKeys) {
          const parsed = JSON.parse(rawSavedKeys);
          if (Array.isArray(parsed)) {
            this.savedKeys = parsed;
          }
        }

        // If we have an active key but no saved keys array yet, seed it into savedKeys
        if (this.customApiKey && this.savedKeys.length === 0) {
          this.savedKeys.push({
            id: `key-${Date.now()}`,
            maskedKey: maskApiKey(this.customApiKey),
            label: `API Key 1 (${maskApiKey(this.customApiKey)})`,
            fullKey: this.customApiKey,
            createdAt: new Date().toISOString(),
          });
          this.persistSavedKeys();
        }

        const savedModel = localStorage.getItem(STORAGE_KEY_GEMINI_MODEL);
        if (savedModel) this.selectedModel = savedModel.trim();

        const cachedModels = localStorage.getItem(STORAGE_KEY_GEMINI_CACHED_MODELS);
        if (cachedModels) {
          const parsed = JSON.parse(cachedModels);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.availableModels = parsed;
          }
        }
      } catch {
        // Safe fallback on parse errors
      }
    }
  }

  private persistSavedKeys() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_GEMINI_SAVED_KEYS, JSON.stringify(this.savedKeys));
      } catch {
        // Ignore localStorage quota errors
      }
    }
  }

  public getSavedApiKeys(): SavedApiKey[] {
    return [...this.savedKeys];
  }

  public getApiKey(): string {
    return this.customApiKey;
  }

  public setApiKey(key: string) {
    const cleanKey = (key || '').trim();
    const hasChanged = this.customApiKey !== cleanKey;
    this.customApiKey = cleanKey;

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (this.customApiKey) {
        localStorage.setItem(STORAGE_KEY_GEMINI_KEY, this.customApiKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_GEMINI_KEY);
      }
    }

    if (hasChanged) {
      // Clear cached models so fresh discovery occurs for new key
      this.availableModels = [];
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_GEMINI_CACHED_MODELS);
      }
    }
  }

  /**
   * Save an API key into persistent storage without duplicates and make it active
   */
  public saveApiKey(rawKey: string, customLabel?: string): SavedApiKey {
    const clean = (rawKey || '').trim();
    if (!clean) {
      throw new Error('Kunci API tidak boleh kosong.');
    }

    // Check if key already exists
    const existingIndex = this.savedKeys.findIndex((k) => k.fullKey === clean);
    let targetEntry: SavedApiKey;

    if (existingIndex >= 0) {
      targetEntry = this.savedKeys[existingIndex];
      if (customLabel && customLabel.trim()) {
        targetEntry.label = customLabel.trim();
        this.persistSavedKeys();
      }
    } else {
      const keyIndex = this.savedKeys.length + 1;
      targetEntry = {
        id: `key-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        maskedKey: maskApiKey(clean),
        label: customLabel?.trim() || `API Key ${keyIndex} (${maskApiKey(clean)})`,
        fullKey: clean,
        createdAt: new Date().toISOString(),
      };
      this.savedKeys.push(targetEntry);
      this.persistSavedKeys();
    }

    this.setApiKey(clean);
    return targetEntry;
  }

  /**
   * Remove a saved API key by ID
   */
  public removeSavedApiKey(id: string) {
    const target = this.savedKeys.find((k) => k.id === id);
    this.savedKeys = this.savedKeys.filter((k) => k.id !== id);
    this.persistSavedKeys();

    // If the active key was removed, switch to another saved key or reset
    if (target && target.fullKey === this.customApiKey) {
      if (this.savedKeys.length > 0) {
        this.setApiKey(this.savedKeys[0].fullKey);
      } else {
        this.setApiKey('');
      }
    }
  }

  public getModel(): string {
    return this.selectedModel;
  }

  public setModel(model: string) {
    const cleanModel = (model || '').trim();
    if (!cleanModel) return;
    this.selectedModel = cleanModel;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, cleanModel);
    }
  }

  public getAvailableModels(): AIModelInfo[] {
    return [...this.availableModels];
  }

  /**
   * Dynamically fetch all compatible models for the active API key
   */
  public async fetchAvailableModels(forceRefresh = false): Promise<AIModelInfo[]> {
    if (!forceRefresh && this.availableModels.length > 0) {
      return this.availableModels;
    }

    try {
      const res = await fetch(this.getApiUrl('/api/ai/models'), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && Array.isArray(data.models)) {
        this.availableModels = data.models;

        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(
              STORAGE_KEY_GEMINI_CACHED_MODELS,
              JSON.stringify(this.availableModels)
            );
          } catch {
            // Safe storage quota fallback
          }
        }

        // Check if selected model is present in discovered models
        const modelExists = this.availableModels.some((m) => m.id === this.selectedModel);
        if (!modelExists && this.availableModels.length > 0) {
          // If current model is not present, pick gemini-3.7-flash or the first valid model
          const preferred = this.availableModels.find((m) => m.id === 'gemini-3.7-flash') || this.availableModels[0];
          this.setModel(preferred.id);
        }

        return this.availableModels;
      }

      if (!res.ok) {
        const errorMsg = data.error || 'Gagal mengambil daftar model dari Gemini API.';
        throw new Error(errorMsg);
      }
    } catch (err: unknown) {
      if (this.availableModels.length > 0) {
        return this.availableModels;
      }
      // Provide basic fallback if network fails
      const fallbackModels: AIModelInfo[] = [
        {
          id: 'gemini-3.7-flash',
          name: 'models/gemini-3.7-flash',
          displayName: 'Gemini 3.7 Flash',
          description: 'Model standar cepat & responsif',
          supportedActions: ['generateContent'],
        },
        {
          id: 'gemini-3.8-flash',
          name: 'models/gemini-3.8-flash',
          displayName: 'Gemini 3.8 Flash',
          description: 'Model generasi mutakhir',
          supportedActions: ['generateContent'],
        },
      ];
      this.availableModels = fallbackModels;
      throw err;
    }

    return this.availableModels;
  }

  private getHeaders(explicitApiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const keyToSend = explicitApiKey !== undefined ? explicitApiKey : this.customApiKey;
    if (keyToSend) {
      headers['x-gemini-api-key'] = keyToSend;
    }
    return headers;
  }

  private getApiUrl(endpoint: string): string {
    if (typeof window === 'undefined') {
      return `http://127.0.0.1:3000${endpoint}`;
    }
    return endpoint;
  }

  /**
   * Safe chat caller with exponential backoff & jitter for transient errors (503, 429, etc.)
   */
  private async callChatWithRetry(
    body: Record<string, unknown>,
    onRetryProgress?: (attempt: number, maxAttempts: number, statusText: string) => void
  ): Promise<any> {
    const maxClientRetries = 3;
    let attempt = 0;

    while (true) {
      attempt++;
      let res: Response;
      try {
        res = await fetch(this.getApiUrl('/api/ai/chat'), {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            model: this.selectedModel,
            ...body,
          }),
        });
      } catch (networkErr: unknown) {
        if (attempt <= maxClientRetries) {
          const delay = calculateBackoffDelay(attempt);
          if (onRetryProgress) {
            onRetryProgress(
              attempt,
              maxClientRetries,
              `Koneksi terputus. Mencoba kembali (${attempt}/${maxClientRetries})...`
            );
          }
          await sleep(delay);
          continue;
        }
        throw new Error('Tidak dapat terhubung ke server aplikasi. Periksa jaringan internet.');
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        return data;
      }

      // Check if transient error (503, 429, 504, 500)
      const isTransient =
        data.isTransient ||
        res.status === 503 ||
        res.status === 429 ||
        res.status === 504 ||
        res.status === 500;
      const isUnavailable = data.category === 'UNAVAILABLE' || res.status === 503;

      if (isTransient && attempt <= maxClientRetries) {
        const delay = calculateBackoffDelay(attempt);
        const retryMsg = isUnavailable
          ? `Gemini sedang sibuk. Mencoba kembali (${attempt}/${maxClientRetries})...`
          : `Layanan sedang padat. Mencoba kembali (${attempt}/${maxClientRetries})...`;

        if (onRetryProgress) {
          onRetryProgress(attempt, maxClientRetries, retryMsg);
        }
        await sleep(delay);
        continue;
      }

      // Exhausted retries or non-transient error
      if (isUnavailable) {
        throw new Error(
          'Gemini sedang tidak tersedia sementara. Silakan coba kembali beberapa saat lagi.'
        );
      }
      if (data.category === 'QUOTA' || res.status === 429) {
        throw new Error(
          'Kuota Gemini API telah terlampaui. Silakan periksa batas penggunaan API Anda.'
        );
      }
      if (data.category === 'INVALID_API_KEY' || res.status === 401) {
        throw new Error(
          'Kunci API Gemini tidak valid. Silakan periksa di menu Pengaturan > AI Assistant.'
        );
      }

      throw new Error(data.error || 'Terjadi kendala saat memproses permintaan AI.');
    }
  }

  /**
   * Test connection to Gemini API with retry and specific status classification
   */
  public async testConnection(
    onRetryProgress?: (attempt: number, maxAttempts: number, statusText: string) => void,
    modelToTest?: string,
    explicitKey?: string
  ): Promise<{ success: boolean; category: GeminiErrorCategory; message: string; statusCode?: number }> {
    const maxRetries = 2;
    let attempt = 0;
    const testModel = modelToTest || this.selectedModel || 'gemini-3.7-flash';

    while (true) {
      attempt++;
      let res: Response;
      try {
        res = await fetch(this.getApiUrl('/api/ai/test'), {
          method: 'POST',
          headers: this.getHeaders(explicitKey),
          body: JSON.stringify({ model: testModel }),
        });
      } catch {
        return {
          success: false,
          category: 'NETWORK_ERROR',
          message: 'Gagal menghubungi server aplikasi. Periksa jaringan internet Anda.',
        };
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        return {
          success: true,
          category: 'CONNECTED',
          message: data.message || `Koneksi ke Gemini API berhasil (${testModel}).`,
        };
      }

      const category = (data.category as GeminiErrorCategory) || 'UNKNOWN';
      const isTransient =
        data.isTransient || res.status === 503 || res.status === 429 || res.status === 504;

      if (isTransient && attempt <= maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        if (onRetryProgress) {
          onRetryProgress(
            attempt,
            maxRetries,
            `Gemini sedang sibuk. Menguji ulang (${attempt}/${maxRetries})...`
          );
        }
        await sleep(delay);
        continue;
      }

      if (category === 'UNAVAILABLE' || res.status === 503) {
        return {
          success: false,
          category: 'UNAVAILABLE',
          statusCode: 503,
          message:
            'Layanan Gemini sementara sedang sibuk (503). Kunci API valid namun server Gemini sedang mengalami lonjakan beban. Coba beberapa saat lagi.',
        };
      }

      if (category === 'QUOTA' || res.status === 429) {
        return {
          success: false,
          category: 'QUOTA',
          statusCode: 429,
          message:
            'Kuota Gemini API telah terlampaui (429). Silakan periksa limit kuota akun Anda.',
        };
      }

      if (category === 'INVALID_API_KEY' || res.status === 401) {
        return {
          success: false,
          category: 'INVALID_API_KEY',
          statusCode: 401,
          message:
            'Kunci API Gemini tidak valid. Silakan periksa kembali API key yang dimasukkan.',
        };
      }

      return {
        success: false,
        category,
        statusCode: res.status,
        message: data.error || 'Uji koneksi gagal diproses oleh server.',
      };
    }
  }

  /**
   * Main AI Chat messaging method with multi-turn tool execution loop
   */
  public async sendMessage(
    userMessageText: string,
    history: AIMessage[],
    callbacks?: {
      onToolStatus?: (toolInfo: AIToolCallInfo) => void;
      onRetryProgress?: (attempt: number, maxAttempts: number, statusText: string) => void;
    }
  ): Promise<{
    text: string;
    toolCalls: AIToolCallInfo[];
    confirmation?: AIConfirmationData;
  }> {
    const contents: any[] = [];

    // Map conversation history
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'user' && msg.content) {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant' && msg.content) {
        let contentWithContext = msg.content;
        if (msg.confirmation) {
          contentWithContext += `\n[Status Kartu Konfirmasi: ${msg.confirmation.title} | Status: ${msg.confirmation.status}]`;
        }
        contents.push({
          role: 'model',
          parts: [{ text: contentWithContext }],
        });
      }
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: userMessageText }],
    });

    const executedTools: AIToolCallInfo[] = [];
    let pendingConfirmation: AIConfirmationData | undefined;
    let finalText = '';
    const maxIterations = 5;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      const res = await this.callChatWithRetry(
        {
          contents,
          tools: [{ functionDeclarations: AI_TOOL_DECLARATIONS }],
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks?.onRetryProgress
      );

      const candidates = res.candidates || [];
      const firstCandidate = candidates[0];
      const modelParts = firstCandidate?.content?.parts || [];

      // Extract text parts
      const textParts = modelParts
        .filter((p: any) => Boolean(p.text))
        .map((p: any) => p.text)
        .join('\n')
        .trim();

      if (textParts) {
        finalText = textParts;
      }

      // Check for function calls
      const functionCalls: any[] = [];
      for (const part of modelParts) {
        if (part.functionCall) {
          functionCalls.push(part.functionCall);
        }
      }

      // If no tools were called, finish turn
      if (functionCalls.length === 0) {
        break;
      }

      // Record model response turn
      contents.push({
        role: 'model',
        parts: modelParts,
      });

      // Execute each tool locally
      const functionResponseParts: any[] = [];
      for (const call of functionCalls) {
        const toolInfo: AIToolCallInfo = {
          name: call.name,
          args: call.args || {},
          status: 'running',
        };

        if (callbacks?.onToolStatus) callbacks.onToolStatus(toolInfo);

        try {
          const toolExec = await executeAITool(call.name, call.args || {});
          toolInfo.status = 'done';
          toolInfo.result = toolExec.data;
          executedTools.push(toolInfo);

          if (toolExec.confirmation) {
            pendingConfirmation = toolExec.confirmation;
          }

          if (callbacks?.onToolStatus) callbacks.onToolStatus(toolInfo);

          const responseObj =
            typeof toolExec.data === 'object' && toolExec.data !== null && !Array.isArray(toolExec.data)
              ? (toolExec.data as Record<string, unknown>)
              : { result: toolExec.data };

          functionResponseParts.push({
            functionResponse: {
              name: call.name,
              response: responseObj,
              id: call.id,
            },
          });
        } catch (toolErr: unknown) {
          toolInfo.status = 'error';
          toolInfo.errorMessage =
            toolErr instanceof Error ? toolErr.message : 'Error saat eksekusi tool gudang';
          executedTools.push(toolInfo);
          if (callbacks?.onToolStatus) callbacks.onToolStatus(toolInfo);

          functionResponseParts.push({
            functionResponse: {
              name: call.name,
              response: { error: toolInfo.errorMessage },
              id: call.id,
            },
          });
        }
      }

      // Push functionResponse turn to contents (role: 'user' with functionResponse parts)
      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });
    }

    if (!finalText && pendingConfirmation) {
      finalText = `Saya telah menyiapkan ${pendingConfirmation.title}. Silakan periksa rincian pada kartu konfirmasi di bawah dan klik tombol konfirmasi untuk mengeksekusi ke backend.`;
    }

    return {
      text: finalText || 'Permintaan telah diproses.',
      toolCalls: executedTools,
      confirmation: pendingConfirmation,
    };
  }
}

export const aiService = new AIService();
