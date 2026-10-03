import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { classifyError, ClassifiedError, GeminiErrorCategory } from './src/services/aiErrorClassifier';
import { AI_TOOL_DECLARATIONS, executeAITool } from './src/services/aiTools';

export { classifyError, type ClassifiedError, type GeminiErrorCategory };

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function calculateBackoffDelay(attempt: number): number {
  const base = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
  const jitter = Math.floor(Math.random() * (base * 0.3));
  return base + jitter;
}

/**
 * Executes a Gemini operation with retry and model fallback for transient errors (503, 429, 500, 504)
 */
async function generateWithFallback(
  client: GoogleGenAI,
  primaryModel: string,
  contents: unknown,
  config: unknown,
  maxRetries = 2
): Promise<any> {
  const modelsToTry = [
    primaryModel || 'gemini-3.7-flash',
    primaryModel === 'gemini-3.8-flash' ? 'gemini-3.7-flash' : 'gemini-3.8-flash',
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  let lastError: unknown;

  for (const model of modelsToTry) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      attempt++;
      try {
        return await client.models.generateContent({
          model,
          contents: contents as any,
          config: config as any,
        });
      } catch (err: unknown) {
        lastError = err;
        const classified = classifyError(err);

        // If QUOTA (429), immediately break to try fallback model instead of waiting
        if (classified.category === 'QUOTA') {
          console.log(`[AI Server Info] Model ${model} mencapai limit kuota (429). Beralih ke model alternatif...`);
          break;
        }

        if (classified.isTransient && attempt <= maxRetries) {
          const delay = calculateBackoffDelay(attempt);
          console.log(
            `[AI Server Info] Layanan ${model} (${classified.category} - ${classified.statusCode}). Mencoba kembali attempt ${attempt}/${maxRetries} dalam ${delay}ms...`
          );
          await sleep(delay);
          continue;
        }

        // If transient error after retries, switch to fallback model
        if (classified.isTransient) {
          break;
        }
        throw err;
      }
    }
  }

  throw lastError;
}

// Helper to get Gemini Client safely
function getGeminiClient(req: express.Request): GoogleGenAI {
  const headerKey = req.headers['x-gemini-api-key'] as string | undefined;
  const apiKey = (headerKey && headerKey.trim()) || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('Gemini API Key belum dikonfigurasi. Atur API key di Pengaturan > AI Assistant atau environment server.');
  }
  return new GoogleGenAI({ apiKey });
}

// GET /api/ai/models — list models available to the active Gemini API key.
// Only models suitable for GudangPresisi text/tool chat are returned.
app.get('/api/ai/models', async (req, res) => {
  try {
    const client = getGeminiClient(req);
    const models: any[] = [];
    for await (const model of client.models.list()) {
      const id = String(model.baseModelId || model.name || '').replace(/^models\//, '');
      const actions = Array.isArray(model.supportedActions)
        ? model.supportedActions
        : Array.isArray(model.supportedGenerationMethods)
        ? model.supportedGenerationMethods
        : [];
      const lower = id.toLowerCase();
      const excluded = /(image|tts|live|transcribe|embedding|robotics|veo|lyria|computer-use|deep-research|antigravity)/i.test(lower);
      const supportsGenerateContent = actions.length === 0 || actions.includes('generateContent');

      if (!id || excluded || !supportsGenerateContent) continue;

      models.push({
        id,
        name: model.displayName || id,
        description: model.description || '',
        version: model.version || '',
        inputTokenLimit: model.inputTokenLimit || null,
        outputTokenLimit: model.outputTokenLimit || null,
        supportedActions: actions,
      });
    }

    models.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    res.json({ success: true, count: models.length, models });
  } catch (err: unknown) {
    const classified = classifyError(err);
    res.status(classified.statusCode).json({
      success: false,
      category: classified.category,
      statusCode: classified.statusCode,
      isTransient: classified.isTransient,
      error: classified.message,
    });
  }
});

// POST /api/ai/test
app.post('/api/ai/test', async (req, res) => {
  try {
    const client = getGeminiClient(req);
    const result = await generateWithFallback(
      client,
      'gemini-3.7-flash',
      'Ping test. Jawab "OK".',
      undefined,
      1
    );

    res.json({
      success: true,
      category: 'CONNECTED',
      message: 'Koneksi ke Gemini API berhasil.',
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
    const { contents, tools, systemInstruction, model = 'gemini-3.7-flash' } = req.body;

    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (tools && Array.isArray(tools) && tools.length > 0) {
      config.tools = tools;
    }

    const response = await generateWithFallback(
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

const LIVE_SYSTEM_INSTRUCTION = `Anda adalah asisten AI suara dan operasional cerdas untuk GudangPresisi (Sistem Pengelolaan Gudang Presisi).
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
