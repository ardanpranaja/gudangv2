import { AIMessage, AIToolCallInfo, AIConfirmationData, GeminiErrorCategory } from '../types/ai';
import { AI_TOOL_DECLARATIONS, executeAITool } from './aiTools';

const STORAGE_KEY_GEMINI_KEY = 'GP_GEMINI_API_KEY';
const STORAGE_KEY_GEMINI_MODEL = 'GP_GEMINI_MODEL';

const SYSTEM_INSTRUCTION = `Anda adalah asisten AI operasional cerdas untuk GudangPresisi (Sistem Pengelolaan Gudang Presisi).
Peran Anda adalah membantu operator dan admin gudang dalam:
1. Mengecek stok barang saat ini, lokasi penyimpanan, dan barang yang menipis (isLowStock).
2. Memeriksa kelayakan pengambilan barang oleh member (kuota MAX_QTY, masa pakai, early pickup).
3. Mengecek kartu stok (Bin Card) dan riwayat mutasi barang.
4. Mengecek riwayat pengambilan barang oleh member.
5. Menyiapkan transaksi gudang (Barang Masuk, Barang Keluar, Pinjam, Kembali) atau pengajuan early pickup.

ATURAN UTAMA & KEAMANAN:
- Sumber kebenaran utama adalah Google Spreadsheet backend via tools yang disediakan. JANGAN mengarang data stok, transaksi, atau member jika tidak ada dari tools.
- Selalu gunakan format bahasa Indonesia yang sopan, ringkas, rapi, dan mudah dibaca (gunakan bullet point atau format ringkas bila menampilkan banyak data).
- Jangan pernah membuat atau mengarang ID Transaksi baru.
- Jika pengguna meminta transaksi (misal: "Catat barang keluar 2 pcs plastik untuk Budi"), selalu gunakan tool propose_transaction agar sistem menampilkan kartu konfirmasi resmi di UI sebelum transaksi benar-benar dieksekusi.
- Berikan peringatan jika barang yang diminta stoknya menipis atau tidak mencukupi.`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function calculateBackoffDelay(attempt: number): number {
  // attempt 1: base ~1000ms + random jitter 0-300ms
  // attempt 2: base ~2000ms + random jitter 0-500ms
  // attempt 3: base ~4000ms + random jitter 0-800ms
  const base = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
  const jitter = Math.floor(Math.random() * (base * 0.3));
  return base + jitter;
}

export class AIService {
  private customApiKey: string = '';
  private selectedModel: string = 'gemini-3.8-flash';

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const savedKey = localStorage.getItem(STORAGE_KEY_GEMINI_KEY);
      if (savedKey) this.customApiKey = savedKey.trim();

      const savedModel = localStorage.getItem(STORAGE_KEY_GEMINI_MODEL);
      if (savedModel) this.selectedModel = savedModel.trim();
    }
  }

  public getApiKey(): string {
    return this.customApiKey;
  }

  public setApiKey(key: string) {
    this.customApiKey = key.trim();
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (this.customApiKey) {
        localStorage.setItem(STORAGE_KEY_GEMINI_KEY, this.customApiKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_GEMINI_KEY);
      }
    }
  }

  public getModel(): string {
    return this.selectedModel;
  }

  public setModel(model: string) {
    this.selectedModel = model;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, model);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.customApiKey) {
      headers['x-gemini-api-key'] = this.customApiKey;
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
          body: JSON.stringify(body),
        });
      } catch (networkErr: unknown) {
        if (attempt <= maxClientRetries) {
          const delay = calculateBackoffDelay(attempt);
          if (onRetryProgress) {
            onRetryProgress(attempt, maxClientRetries, `Koneksi terputus. Mencoba kembali (${attempt}/${maxClientRetries})...`);
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
      const isTransient = data.isTransient || res.status === 503 || res.status === 429 || res.status === 504 || res.status === 500;
      const isUnavailable = data.category === 'UNAVAILABLE' || res.status === 503;

      if (isTransient && attempt <= maxClientRetries) {
        const delay = calculateBackoffDelay(attempt);
        const retryMsg = isUnavailable
          ? `Gemini sedang sibuk. Mencoba kembali (${attempt}/${maxClientRetries})...`
          : `Layanan sedang padat. Mencoba kembali (${attempt}/${maxClientRetries})...`;

        if (onRetryProgress) {
          onRetryProgress(attempt, maxClientRetries, retryMsg);
        }
        console.warn(`[AI Client Retry] Attempt ${attempt}/${maxClientRetries}: waiting ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Exhausted retries or non-transient error
      if (isUnavailable) {
        throw new Error('Gemini sedang tidak tersedia sementara. Silakan coba kembali beberapa saat lagi.');
      }
      if (data.category === 'QUOTA' || res.status === 429) {
        throw new Error('Kuota Gemini API telah terlampaui. Silakan periksa batas penggunaan API Anda.');
      }
      if (data.category === 'INVALID_API_KEY' || res.status === 401) {
        throw new Error('Kunci API Gemini tidak valid. Silakan periksa di menu Pengaturan > AI Assistant.');
      }

      throw new Error(data.error || 'Terjadi kendala saat memproses permintaan AI.');
    }
  }

  /**
   * Test connection to Gemini API with retry and specific status classification
   */
  public async testConnection(
    onRetryProgress?: (attempt: number, maxAttempts: number, statusText: string) => void
  ): Promise<{ success: boolean; category: GeminiErrorCategory; message: string; statusCode?: number }> {
    const maxRetries = 2;
    let attempt = 0;

    while (true) {
      attempt++;
      let res: Response;
      try {
        res = await fetch(this.getApiUrl('/api/ai/test'), {
          method: 'POST',
          headers: this.getHeaders(),
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
          message: data.message || 'Koneksi ke Gemini API berhasil.',
        };
      }

      const category = (data.category as GeminiErrorCategory) || 'UNKNOWN';
      const isTransient = data.isTransient || res.status === 503 || res.status === 429 || res.status === 504;

      if (isTransient && attempt <= maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        if (onRetryProgress) {
          onRetryProgress(attempt, maxRetries, `Gemini sedang sibuk. Menguji ulang (${attempt}/${maxRetries})...`);
        }
        await sleep(delay);
        continue;
      }

      if (category === 'UNAVAILABLE' || res.status === 503) {
        return {
          success: false,
          category: 'UNAVAILABLE',
          statusCode: 503,
          message: 'Layanan Gemini sementara sedang sibuk (503). Kunci API valid namun server Gemini sedang mengalami lonjakan beban. Coba beberapa saat lagi.',
        };
      }

      if (category === 'QUOTA' || res.status === 429) {
        return {
          success: false,
          category: 'QUOTA',
          statusCode: 429,
          message: 'Kuota Gemini API telah terlampaui (429). Silakan periksa limit kuota akun Anda.',
        };
      }

      if (category === 'INVALID_API_KEY' || res.status === 401) {
        return {
          success: false,
          category: 'INVALID_API_KEY',
          statusCode: 401,
          message: 'Kunci API Gemini tidak valid. Silakan periksa kembali API key yang dimasukkan.',
        };
      }

      return {
        success: false,
        category,
        statusCode: res.status,
        message: data.error || 'Uji koneksi gagal.',
      };
    }
  }

  /**
   * Send chat message and handle tool invocation loop with standard function calling turns
   */
  public async sendMessage(
    userText: string,
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
    const executedTools: AIToolCallInfo[] = [];
    let pendingConfirmation: AIConfirmationData | undefined;

    // Convert existing message history to Gemini API contents format
    const contents: Array<Record<string, unknown>> = [];

    // Filter relevant recent history (last 10 turns)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant' && msg.content) {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: userText }],
    });

    const maxIterations = 5;
    let iteration = 0;
    let finalText = '';

    while (iteration < maxIterations) {
      iteration++;

      const responseData = await this.callChatWithRetry(
        {
          contents,
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: AI_TOOL_DECLARATIONS }],
          model: this.selectedModel,
        },
        callbacks?.onRetryProgress
      );

      const functionCalls: Array<{ name: string; args: Record<string, unknown>; id?: string }> =
        responseData.functionCalls || [];
      const textOutput = responseData.text || '';

      // If no function calls returned, we reached final response
      if (functionCalls.length === 0) {
        finalText = textOutput;
        break;
      }

      // Add model's functionCall turn to contents to preserve valid conversational turn
      const modelContent = responseData.candidates?.[0]?.content;
      if (modelContent) {
        contents.push(modelContent);
      } else {
        contents.push({
          role: 'model',
          parts: functionCalls.map((call) => ({
            functionCall: {
              id: call.id,
              name: call.name,
              args: call.args,
            },
          })),
        });
      }

      // Execute each function call and collect functionResponse parts
      const functionResponseParts: Array<{
        functionResponse: {
          name: string;
          response: Record<string, unknown>;
          id?: string;
        };
      }> = [];

      for (const call of functionCalls) {
        const toolInfo: AIToolCallInfo = {
          id: call.id,
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
