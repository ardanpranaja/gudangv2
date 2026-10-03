import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

export type GeminiErrorCategory =
  | 'CONNECTED'
  | 'UNAVAILABLE'
  | 'QUOTA'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'INVALID_API_KEY'
  | 'PERMISSION_DENIED'
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

/**
 * Classifies errors from the Gemini API safely without exposing sensitive secrets
 */
export function classifyError(err: unknown): ClassifiedError {
  let msg = '';
  let status = 500;

  if (err instanceof Error) {
    msg = err.message || '';
  } else if (typeof err === 'string') {
    msg = err;
  } else if (typeof err === 'object' && err !== null) {
    const errObj = err as Record<string, unknown>;
    msg = (typeof errObj.message === 'string' ? errObj.message : '') ||
          (typeof errObj.error === 'string' ? errObj.error : '') ||
          JSON.stringify(err);
    if (typeof errObj.status === 'number') status = errObj.status;
    if (typeof errObj.statusCode === 'number') status = errObj.statusCode;
  }

  // Mask any potential key occurrences in technicalDetails
  const sanitizedMsg = msg.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
  const lowerMsg = sanitizedMsg.toLowerCase();

  // 1. Invalid API Key
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

  // 2. Permission Denied
  if (status === 403 || lowerMsg.includes('permission_denied') || lowerMsg.includes('permission denied')) {
    return {
      category: 'PERMISSION_DENIED',
      statusCode: 403,
      message: 'Akses Gemini API ditolak (izin atau hak akses tidak mencukupi).',
      isTransient: false,
      technicalDetails: sanitizedMsg,
    };
  }

  // 3. Quota / Rate limit (429)
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

  // 4. Unavailable / 503 / High Demand
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
      message: 'Gemini sedang mengalami kepadatan layanan. Sistem sedang mencoba kembali...',
      isTransient: true,
      technicalDetails: sanitizedMsg,
    };
  }

  // 5. Timeout (408 / 504 / deadline exceeded)
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

  // 6. Server Error (500 / 502)
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

  // 7. Invalid Request (400)
  if (status === 400 || lowerMsg.includes('invalid_argument')) {
    return {
      category: 'INVALID_REQUEST',
      statusCode: 400,
      message: 'Format permintaan ke model AI tidak valid.',
      isTransient: false,
      technicalDetails: sanitizedMsg,
    };
  }

  // 8. Network Error
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function calculateBackoffDelay(attempt: number): number {
  // attempt 1: ~1000ms + jitter
  // attempt 2: ~2000ms + jitter
  const base = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
  const jitter = Math.floor(Math.random() * (base * 0.3));
  return base + jitter;
}

/**
 * Executes a Gemini operation with retry for transient errors (503, 429, 408, 500, 502, 504)
 */
async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (err: unknown) {
      const classified = classifyError(err);
      if (classified.isTransient && attempt <= maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        console.warn(
          `[AI Server Retry] Transient error (${classified.category} - ${classified.statusCode}). Retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
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

// POST /api/ai/test
app.post('/api/ai/test', async (req, res) => {
  try {
    const client = getGeminiClient(req);
    const result = await executeWithRetry(async () => {
      return await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Ping test. Jawab "OK".',
      });
    }, 2);

    res.json({
      success: true,
      category: 'CONNECTED',
      message: 'Koneksi ke Gemini API berhasil.',
      reply: result.text || 'OK',
    });
  } catch (err: unknown) {
    const classified = classifyError(err);
    console.error(`[AI Test Error] ${classified.category} (${classified.statusCode}):`, classified.technicalDetails);

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
    const { contents, tools, systemInstruction, model = 'gemini-3.8-flash' } = req.body;

    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (tools && Array.isArray(tools) && tools.length > 0) {
      config.tools = tools;
    }

    const response = await executeWithRetry(async () => {
      return await client.models.generateContent({
        model,
        contents,
        config,
      });
    }, 2);

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
    console.error(`[AI Chat Error] ${classified.category} (${classified.statusCode}):`, classified.technicalDetails);

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

const isMainModule = process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));
if (isMainModule) {
  startServer();
}
