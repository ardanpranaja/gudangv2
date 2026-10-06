import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

export type GeminiErrorCategory =
  | 'INVALID_API_KEY'
  | 'PERMISSION_DENIED'
  | 'QUOTA'
  | 'UNAVAILABLE'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface ClassifiedError {
  category: GeminiErrorCategory;
  statusCode: number;
  message: string;
  isTransient: boolean;
  technicalDetails?: string;
}

export function classifyError(err: unknown): ClassifiedError {
  let msg = '';
  let status = 500;

  if (err instanceof Error) {
    msg = err.message || '';
    if (typeof (err as any).status === 'number') status = (err as any).status;
    else if (typeof (err as any).statusCode === 'number') status = (err as any).statusCode;
    else if (typeof (err as any).code === 'number') status = (err as any).code;
  } else if (typeof err === 'string') {
    msg = err;
  } else if (typeof err === 'object' && err !== null) {
    const errObj = err as Record<string, unknown>;
    msg =
      (typeof errObj.message === 'string' ? errObj.message : '') ||
      (typeof errObj.error === 'string' ? errObj.error : '') ||
      JSON.stringify(err);
    if (typeof errObj.status === 'number') status = errObj.status;
    else if (typeof errObj.statusCode === 'number') status = errObj.statusCode;
    else if (typeof errObj.code === 'number') status = errObj.code;
  }

  if (msg.startsWith('{') && msg.includes('"error"')) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.error?.code && typeof parsed.error.code === 'number') {
        status = parsed.error.code;
      }
      if (parsed?.error?.message && typeof parsed.error.message === 'string') {
        msg = parsed.error.message;
      }
    } catch {
      // Ignore
    }
  }

  const sanitizedMsg = msg.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
  const lowerMsg = sanitizedMsg.toLowerCase();

  if (
    lowerMsg.includes('api_key_invalid') ||
    lowerMsg.includes('api key not valid') ||
    lowerMsg.includes('invalid api key') ||
    lowerMsg.includes('unauthenticated') ||
    status === 401
  ) {
    return {
      category: 'INVALID_API_KEY',
      statusCode: 401,
      message: 'Kunci API Gemini tidak valid. Silakan periksa di menu Pengaturan > AI Assistant.',
      isTransient: false,
      technicalDetails: sanitizedMsg,
    };
  }

  if (status === 403 || lowerMsg.includes('permission_denied') || lowerMsg.includes('permission denied')) {
    return {
      category: 'PERMISSION_DENIED',
      statusCode: 403,
      message: 'Akses Gemini API ditolak (izin atau hak akses tidak mencukupi).',
      isTransient: false,
      technicalDetails: sanitizedMsg,
    };
  }

  if (
    status === 429 ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('quota') ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('429')
  ) {
    return {
      category: 'QUOTA',
      statusCode: 429,
      message: 'Kuota Gemini API telah terlampaui. Silakan periksa batas kuota akun Anda.',
      isTransient: true,
      technicalDetails: sanitizedMsg,
    };
  }

  if (
    status === 503 ||
    lowerMsg.includes('503') ||
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('high demand') ||
    lowerMsg.includes('spikes in demand') ||
    lowerMsg.includes('overloaded')
  ) {
    return {
      category: 'UNAVAILABLE',
      statusCode: 503,
      message: 'Gemini sedang tidak tersedia sementara. Silakan coba kembali beberapa saat lagi.',
      isTransient: true,
      technicalDetails: sanitizedMsg,
    };
  }

  if (
    status === 408 ||
    status === 504 ||
    lowerMsg.includes('deadline_exceeded') ||
    lowerMsg.includes('timed out') ||
    lowerMsg.includes('timeout')
  ) {
    return {
      category: 'TIMEOUT',
      statusCode: 504,
      message: 'Batas waktu komunikasi ke model Gemini terlampaui.',
      isTransient: true,
      technicalDetails: sanitizedMsg,
    };
  }

  if (
    status === 500 ||
    status === 502 ||
    lowerMsg.includes('internal server error') ||
    lowerMsg.includes('internal error')
  ) {
    return {
      category: 'SERVER_ERROR',
      statusCode: 500,
      message: 'Terjadi gangguan sementara pada server Gemini.',
      isTransient: true,
      technicalDetails: sanitizedMsg,
    };
  }

  if (status === 400 || lowerMsg.includes('invalid_argument')) {
    return {
      category: 'INVALID_REQUEST',
      statusCode: 400,
      message: 'Format permintaan ke model AI tidak valid.',
      isTransient: false,
      technicalDetails: sanitizedMsg,
    };
  }

  if (lowerMsg.includes('fetch failed') || lowerMsg.includes('econnrefused') || lowerMsg.includes('enotfound')) {
    return {
      category: 'NETWORK_ERROR',
      statusCode: 503,
      message: 'Gagal terhubung ke server Gemini. Periksa jaringan internet.',
      isTransient: true,
      technicalDetails: sanitizedMsg,
    };
  }

  return {
    category: 'UNKNOWN',
    statusCode: status || 500,
    message: sanitizedMsg || 'Terjadi kendala saat memproses permintaan AI.',
    isTransient: false,
    technicalDetails: sanitizedMsg,
  };
}

const AI_TOOL_DECLARATIONS = [
  {
    name: 'check_stock',
    description: 'Cek posisi stok barang saat ini di gudang. Bisa mencari berdasarkan nama barang, kategori, atau memfilter stok minimum.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Kata kunci nama barang atau kategori.' },
        lowStockOnly: { type: 'BOOLEAN', description: 'Set true untuk melihat stok menipis.' },
      },
    },
  },
  {
    name: 'get_items',
    description: 'Ambil katalog master barang gudang.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Kata kunci pencarian nama atau kategori barang.' },
      },
    },
  },
  {
    name: 'get_members',
    description: 'Ambil daftar master member gudang.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Kata kunci pencarian nama atau ID member.' },
      },
    },
  },
  {
    name: 'get_pending_requests',
    description: 'Ambil daftar pengajuan early pickup yang memerlukan persetujuan.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'Status filter (MENUNGGU, DISETUJUI, DITOLAK).' },
      },
    },
  },
];

async function executeAITool(name: string, args: Record<string, unknown>): Promise<{ success: boolean; data: any; confirmation?: any }> {
  const gasUrl = process.env.VITE_GAS_API_URL || process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzMK3VeOCqqGKI-xVnkKij17NCaZ7VQHzgxX6y6CD7PoJydaIyiI_P5mvxdMlTlIEOK/exec';
  try {
    let action = '';
    if (name === 'check_stock') action = 'getStock';
    else if (name === 'get_items') action = 'getItems';
    else if (name === 'get_members') action = 'getMembers';
    else if (name === 'get_pending_requests') action = 'getRequests';

    if (action) {
      const resp = await fetch(`${gasUrl}?action=${action}`);
      if (resp.ok) {
        const json = await resp.json() as any;
        return { success: true, data: json.data || json };
      }
    }
    return { success: true, data: { status: 'OK', tool: name, args } };
  } catch (err: any) {
    return { success: false, data: { error: err.message || 'Tool execution failed' } };
  }
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Health check endpoints for Cloud Run & load balancers
app.get(['/healthz', '/api/health'], (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function calculateBackoffDelay(attempt: number): number {
  const base = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
  const jitter = Math.floor(Math.random() * (base * 0.3));
  return base + jitter;
}

/**
 * Executes a Gemini operation strictly with the user's selected model with exponential backoff on transient errors (503, 429, 500, 504).
 * No hardcoded fallback models are used.
 */
async function executeGeminiGenerate(
  client: GoogleGenAI,
  selectedModel: string,
  contents: unknown,
  config: unknown,
  maxRetries = 2
): Promise<any> {
  const targetModel = (selectedModel && selectedModel.trim()) || '';
  if (!targetModel) {
    throw new Error('Model belum dipilih. Silakan pilih model di Pengaturan > AI Assistant.');
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;
    try {
      return await client.models.generateContent({
        model: targetModel,
        contents: contents as any,
        config: config as any,
      });
    } catch (err: unknown) {
      const classified = classifyError(err);
      if (classified.isTransient && attempt <= maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        console.log(
          `[AI Server Info] Percobaan ${attempt}/${maxRetries} untuk model ${targetModel} (${classified.category} - ${classified.statusCode}). Menunggu ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }
      // Re-throw without changing target model
      throw err;
    }
  }
}

// Helper to get Gemini Client safely from request headers
function getGeminiClient(req: express.Request): GoogleGenAI {
  const headerKey = req.headers['x-gemini-api-key'] as string | undefined;
  const apiKey = (headerKey && headerKey.trim()) || '';
  if (!apiKey) {
    const err: any = new Error('API Key belum dipilih atau tidak tersedia. Silakan pilih atau masukkan API Key di Pengaturan > AI Assistant.');
    err.status = 401;
    err.statusCode = 401;
    throw err;
  }
  return new GoogleGenAI({ apiKey });
}

// GET & POST /api/ai/models - Dynamic Model Discovery with Capability Filtering
const handleModelsDiscovery = async (req: express.Request, res: express.Response) => {
  try {
    const client = getGeminiClient(req);
    const modelsIterator = await client.models.list();
    const models: Array<{
      id: string;
      name: string;
      displayName: string;
      description?: string;
      supportedActions: string[];
    }> = [];

    for await (const m of modelsIterator) {
      const supportedActions = (m as any).supportedActions || [];
      // Capability Filter: Ensure model supports text/multimodal generation (generateContent)
      // GudangV2 utilizes generateContent for chat, reasoning, tool execution, and structured query
      const isGenerative =
        supportedActions.includes('generateContent') ||
        supportedActions.length === 0;

      if (isGenerative) {
        const cleanId = (m.name || '').replace(/^models\//, '');
        models.push({
          id: cleanId,
          name: m.name || cleanId,
          displayName: m.displayName || cleanId,
          description: m.description || '',
          supportedActions,
        });
      }
    }

    res.json({
      success: true,
      total: models.length,
      models,
    });
  } catch (err: unknown) {
    const classified = classifyError(err);
    console.log(`[AI Models Discovery Info] ${classified.category} (${classified.statusCode})`);

    res.status(classified.statusCode).json({
      success: false,
      category: classified.category,
      statusCode: classified.statusCode,
      isTransient: classified.isTransient,
      error: classified.message,
      technicalDetails: classified.technicalDetails,
    });
  }
};

app.get('/api/ai/models', handleModelsDiscovery);
app.post('/api/ai/models', handleModelsDiscovery);

// POST /api/ai/test
app.post('/api/ai/test', async (req, res) => {
  try {
    const client = getGeminiClient(req);
    const requestedModel = req.body?.model || (req.query?.model as string) || 'gemini-3.7-flash';
    const result = await executeGeminiGenerate(
      client,
      requestedModel,
      'Ping test. Jawab "OK".',
      undefined,
      1
    );

    res.json({
      success: true,
      category: 'CONNECTED',
      message: `Koneksi ke Gemini API berhasil menggunakan model ${requestedModel}.`,
      reply: result.text || 'OK',
    });
  } catch (err: unknown) {
    const classified = classifyError(err);
    console.log(`[AI Test Info] ${classified.category} (${classified.statusCode})`);

    res.status(classified.statusCode).json({
      success: false,
      category: classified.category,
      statusCode: classified.statusCode,
      isTransient: classified.isTransient,
      error: classified.message,
      technicalDetails: classified.technicalDetails,
    });
  }
});

// POST /api/ai/chat
app.post('/api/ai/chat', async (req, res) => {
  try {
    const client = getGeminiClient(req);
    const { contents, tools, systemInstruction, model } = req.body;

    if (!model) {
      return res.status(400).json({
        success: false,
        category: 'INVALID_REQUEST',
        statusCode: 400,
        error: 'Model Gemini belum ditentukan dalam permintaan.',
      });
    }

    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (tools && Array.isArray(tools) && tools.length > 0) {
      config.tools = tools;
    }

    const response = await executeGeminiGenerate(
      client,
      model,
      contents,
      config,
      2
    );

    const functionCalls = response.functionCalls || [];
    const text = response.text || '';

    res.json({
      success: true,
      text,
      functionCalls,
      candidates: response.candidates,
    });
  } catch (err: unknown) {
    const classified = classifyError(err);
    console.log(`[AI Chat Info] ${classified.category} (${classified.statusCode})`);

    res.status(classified.statusCode).json({
      success: false,
      category: classified.category,
      statusCode: classified.statusCode,
      isTransient: classified.isTransient,
      error: classified.message,
      technicalDetails: classified.technicalDetails,
    });
  }
});

// ============================================================================
// GEMINI LIVE API WEBSOCKET BRIDGE (/api/ai/live)
// ============================================================================

const LIVE_SYSTEM_INSTRUCTION = `Anda adalah asisten AI suara dan operasional cerdas untuk GudangV2 (Sistem Pengelolaan Gudang V2).
Peran Anda adalah membantu operator dan admin gudang secara proaktif menjalankan pekerjaan operasional gudang melalui percakapan suara realtime.

KEMAMPUAN & OPERASI ADMINISTRATIF LANGSUNG:
1. Anda boleh melakukan operasi administratif langsung tanpa konfirmasi:
   - Membaca dan mencari data barang (get_items), stok (check_stock), member (get_members), limit (get_member_limits), kartu stok (get_bincard), riwayat member (get_member_history), antrean pengajuan (get_pending_requests), dan status koneksi backend (get_system_health).
   - Validasi kelayakan pengambilan barang (check_pickup_eligibility).
   - Mengelola kuota limit member langsung:
     * create_member_limit: Buat limit baru jika member belum memiliki limit untuk item tersebut.
     * update_member_limit: Ubah kuota limit yang sudah ada jika diminta mengubah kuota.
     * activate_member_limit / deactivate_member_limit: Mengaktifkan atau menonaktifkan limit.
     * Flow setting limit: cari member (get_members) -> cari item (get_items) -> cek limit sudah ada atau belum (get_member_limits) -> panggil create_member_limit atau update_member_limit.

ATURAN TRANSAKSI PERGERAKAN BARANG:
2. Transaksi pergerakan fisik barang (BARANG_MASUK, BARANG_KELUAR, PINJAM, KEMBALI) dan pengajuan early pickup MEMERLUKAN konfirmasi:
   - Gunakan tool propose_transaction untuk menyiapkan draft transaksi.
   - Sampaikan melalui suara bahwa kartu konfirmasi transaksi telah ditampilkan di layar. JANGAN mengaku transaksi sudah tersimpan jika konfirmasi belum disetujui.

PERSETUJUAN & KONTEKS PERCAKAPAN:
3. Pahami konteks percakapan sebelumnya secara utuh (contoh: jika user minta transaksi lalu limit kurang, user minta set limit, buat limit lalu siapkan transaksi yang diminta sebelumnya).
- Gunakan Bahasa Indonesia yang alami, ringkas, jelas, dan ramah untuk respons suara. JANGAN mengarang data jika tidak ada di tools.`;

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (clientWs: WebSocket) => {
  let geminiSession: any = null;
  let isSessionActive = false;

  const safeSend = (payload: Record<string, unknown>) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(JSON.stringify(payload));
      } catch (err) {
        console.error('[WS Bridge] Send error:', err);
      }
    }
  };

  clientWs.on('message', async (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString());

      // 1. Initialization message
      if (msg.type === 'init') {
        const apiKey = (msg.apiKey && typeof msg.apiKey === 'string' && msg.apiKey.trim()) || process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
          safeSend({
            type: 'error',
            error: 'Gemini API Key belum dikonfigurasi. Atur API key di Pengaturan > AI Assistant.',
          });
          return;
        }

        try {
          const ai = new GoogleGenAI({ apiKey });
          const liveModel = msg.model || 'gemini-3.8-live';

          geminiSession = await ai.live.connect({
            model: liveModel,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
              },
              systemInstruction: LIVE_SYSTEM_INSTRUCTION,
              tools: [{ functionDeclarations: AI_TOOL_DECLARATIONS as any }],
              outputAudioTranscription: {},
              inputAudioTranscription: {},
            },
            callbacks: {
              onopen: () => {
                isSessionActive = true;
                safeSend({ type: 'ready' });
              },
              onmessage: async (serverMsg: LiveServerMessage) => {
                // Audio chunk
                const audio = serverMsg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audio) {
                  safeSend({ type: 'audio', audio });
                }

                // Interruption
                if (serverMsg.serverContent?.interrupted) {
                  safeSend({ type: 'interrupted' });
                }

                // Input audio transcription (user)
                if (serverMsg.serverContent?.inputTranscription?.text) {
                  safeSend({
                    type: 'input_transcript',
                    text: serverMsg.serverContent.inputTranscription.text,
                  });
                }

                // Output audio transcription (model)
                if (serverMsg.serverContent?.outputTranscription?.text) {
                  safeSend({
                    type: 'output_transcript',
                    text: serverMsg.serverContent.outputTranscription.text,
                  });
                }

                // Turn complete
                if (serverMsg.serverContent?.turnComplete) {
                  safeSend({ type: 'turn_complete' });
                }

                // Tool Calls
                const toolCall = serverMsg.toolCall;
                if (toolCall?.functionCalls && toolCall.functionCalls.length > 0) {
                  safeSend({
                    type: 'tool_call_start',
                    calls: toolCall.functionCalls.map((c) => ({ name: c.name || '', args: c.args || {} })),
                  });

                  const functionResponses: Array<{ name: string; response: Record<string, unknown>; id?: string }> = [];

                  for (const call of toolCall.functionCalls) {
                    const toolName = call.name || '';
                    try {
                      const toolExec = await executeAITool(toolName, call.args || {});
                      const responseObj =
                        typeof toolExec.data === 'object' && toolExec.data !== null && !Array.isArray(toolExec.data)
                          ? (toolExec.data as Record<string, unknown>)
                          : { result: toolExec.data };

                      functionResponses.push({
                        name: toolName,
                        response: responseObj,
                        id: call.id,
                      });

                      safeSend({
                        type: 'tool_call_result',
                        name: toolName,
                        id: call.id,
                        data: toolExec.data,
                        confirmation: toolExec.confirmation,
                      });
                    } catch (toolErr: unknown) {
                      const errMsg = toolErr instanceof Error ? toolErr.message : 'Gagal eksekusi tool';
                      functionResponses.push({
                        name: toolName,
                        response: { error: errMsg },
                        id: call.id,
                      });

                      safeSend({
                        type: 'tool_call_result',
                        name: toolName,
                        id: call.id,
                        error: errMsg,
                      });
                    }
                  }

                  if (geminiSession && isSessionActive) {
                    geminiSession.sendToolResponse({ functionResponses });
                  }
                }
              },
              onerror: (err: unknown) => {
                const classified = classifyError(err);
                console.log(`[Live WS Error] ${classified.category} (${classified.statusCode})`);
                safeSend({
                  type: 'error',
                  category: classified.category,
                  error: classified.message,
                });
              },
              onclose: () => {
                isSessionActive = false;
                safeSend({ type: 'closed' });
              },
            },
          });
        } catch (connErr: unknown) {
          const classified = classifyError(connErr);
          safeSend({
            type: 'error',
            category: classified.category,
            error: classified.message,
          });
        }
        return;
      }

      // 2. Realtime audio streaming from client mic
      if (msg.type === 'audio' && typeof msg.audio === 'string') {
        if (geminiSession && isSessionActive) {
          geminiSession.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
        return;
      }

      // 3. Close command
      if (msg.type === 'close') {
        if (geminiSession) {
          try {
            geminiSession.close();
          } catch {}
          geminiSession = null;
        }
        isSessionActive = false;
        return;
      }
    } catch (msgErr) {
      console.error('[WS Bridge] Message error:', msgErr);
    }
  });

  clientWs.on('close', () => {
    isSessionActive = false;
    if (geminiSession) {
      try {
        geminiSession.close();
      } catch {}
      geminiSession = null;
    }
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Handle WebSocket upgrades for /api/ai/live
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    if (pathname === '/api/ai/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
