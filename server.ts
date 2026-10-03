import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { classifyError, ClassifiedError, GeminiErrorCategory } from './src/services/aiErrorClassifier';

export { classifyError, type ClassifiedError, type GeminiErrorCategory };

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

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
        console.log(
          `[AI Server Info] Layanan sibuk (${classified.category} - ${classified.statusCode}). Mencoba kembali attempt ${attempt}/${maxRetries} dalam ${delay}ms...`
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

startServer();
