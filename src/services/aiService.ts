import { AIMessage, AIToolCallInfo, AIConfirmationData } from '../types/ai';
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
- Selalu gunakan format bahasa Indonesia yang sopan, ringkas, rapi, dan mudah dibaca (gunakan bullet point atau tabel ringkas bila menampilkan data banyak).
- Jangan pernah membuat atau mengarang ID Transaksi baru.
- Jika pengguna meminta transaksi (misal: "Catat barang keluar 2 pcs plastik untuk Budi"), selalu gunakan tool propose_transaction agar sistem menampilkan kartu konfirmasi resmi di UI sebelum transaksi benar-benar dieksekusi.
- Berikan peringatan jika barang yang diminta stoknya menipis atau tidak mencukupi.`;

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

  /**
   * Test connection to Gemini API
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: this.getHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Uji koneksi gagal.');
      }
      return { success: true, message: data.message || 'Koneksi ke Gemini API sukses.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Gagal menghubungi server AI.' };
    }
  }

  /**
   * Send chat message and handle tool invocation loop
   */
  public async sendMessage(
    userText: string,
    history: AIMessage[],
    onToolStatus?: (toolInfo: AIToolCallInfo) => void
  ): Promise<{
    text: string;
    toolCalls: AIToolCallInfo[];
    confirmation?: AIConfirmationData;
  }> {
    const executedTools: AIToolCallInfo[] = [];
    let pendingConfirmation: AIConfirmationData | undefined;

    // Convert existing message history to Gemini API contents format
    const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];

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

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          contents,
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: AI_TOOL_DECLARATIONS }],
          model: this.selectedModel,
        }),
      });

      const responseData = await res.json();
      if (!res.ok || !responseData.success) {
        throw new Error(responseData.error || 'Gagal berkomunikasi dengan model AI.');
      }

      const functionCalls = responseData.functionCalls || [];
      const textOutput = responseData.text || '';

      // If no function call, we reached final response
      if (functionCalls.length === 0) {
        finalText = textOutput;
        break;
      }

      // Add model's function call message to contents to maintain valid conversational turn
      const modelParts = responseData.candidates?.[0]?.content?.parts || [];
      contents.push({
        role: 'model',
        parts: modelParts.length > 0 ? modelParts : [{ text: textOutput || 'Memeriksa sistem gudang...' }],
      });

      // Execute each function call
      for (const call of functionCalls) {
        const toolInfo: AIToolCallInfo = {
          name: call.name,
          args: call.args || {},
          status: 'running',
        };
        if (onToolStatus) onToolStatus(toolInfo);

        try {
          const toolExec = await executeAITool(call.name, call.args || {});
          toolInfo.status = 'done';
          toolInfo.result = toolExec.data;
          executedTools.push(toolInfo);

          if (toolExec.confirmation) {
            pendingConfirmation = toolExec.confirmation;
          }

          if (onToolStatus) onToolStatus(toolInfo);

          // Return function response to model
          contents.push({
            role: 'user',
            parts: [
              {
                text: `[Tool Result for ${call.name}]: ${JSON.stringify(toolExec.data)}`,
              },
            ],
          });
        } catch (toolErr: any) {
          toolInfo.status = 'error';
          toolInfo.errorMessage = toolErr?.message || 'Error saat eksekusi tool';
          executedTools.push(toolInfo);
          if (onToolStatus) onToolStatus(toolInfo);

          contents.push({
            role: 'user',
            parts: [
              {
                text: `[Tool Error for ${call.name}]: ${toolInfo.errorMessage}`,
              },
            ],
          });
        }
      }
    }

    if (!finalText && pendingConfirmation) {
      finalText = `Saya telah menyiapkan ${pendingConfirmation.title}. Silakan periksa detailnya dan klik tombol konfirmasi di bawah untuk memproses.`;
    }

    return {
      text: finalText || 'Permintaan telah diproses.',
      toolCalls: executedTools,
      confirmation: pendingConfirmation,
    };
  }
}

export const aiService = new AIService();
