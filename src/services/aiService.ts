import { AIMessage, AIToolCallInfo, AIConfirmationData, GeminiErrorCategory } from '../types/ai';
import { AI_TOOL_DECLARATIONS, executeAITool } from './aiTools';

const STORAGE_KEY_GEMINI_KEY = 'GP_GEMINI_API_KEY';
const STORAGE_KEY_GEMINI_MODEL = 'GP_GEMINI_MODEL';

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
  // attempt 1: base ~1000ms + random jitter 0-300ms
  // attempt 2: base ~2000ms + random jitter 0-500ms
  // attempt 3: base ~4000ms + random jitter 0-800ms
  const base = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
  const jitter = Math.floor(Math.random() * (base * 0.3));
  return base + jitter;
}

export class AIService {
  private customApiKey: string = '';
  private selectedModel: string = 'gemini-3.7-flash';

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
        let contentWithContext = msg.content;
        if (msg.confirmation) {
          contentWithContext += `\n[Status Kartu Konfirmasi: ${msg.confirmation.title} | Status: ${msg.confirmation.status} | Jenis: ${msg.confirmation.type} | Item: ${msg.confirmation.rawInput.itemId} | Jumlah: ${msg.confirmation.rawInput.jumlah} | Member: ${msg.confirmation.rawInput.memberId || '-'}]`;
        }
        contents.push({
          role: 'model',
          parts: [{ text: contentWithContext }],
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
