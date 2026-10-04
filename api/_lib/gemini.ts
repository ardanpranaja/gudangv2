/* Shared helpers for Vercel Serverless Functions under /api/ai/*.
 * File/dirname diawali "_" agar TIDAK dianggap function oleh Vercel.
 * Logika disalin dari server.ts (dipakai saat dev/AI Studio) agar perilaku identik. */
import { GoogleGenAI } from '@google/genai';
import { classifyError } from './errorClassifier.js';

export { classifyError };

export interface ApiReq {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

export interface ApiRes {
  status: (code: number) => ApiRes;
  json: (data: unknown) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function calculateBackoffDelay(attempt: number): number {
  const base = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
  const jitter = Math.floor(Math.random() * (base * 0.3));
  return base + jitter;
}

/** Ambil API key dari header x-gemini-api-key (kontrak yang sama dengan server.ts). */
export function getGeminiClient(req: ApiReq): GoogleGenAI {
  const raw = req.headers['x-gemini-api-key'];
  const apiKey = (Array.isArray(raw) ? raw[0] : raw || '').trim();
  if (!apiKey) {
    const err: any = new Error(
      'API Key belum dipilih atau tidak tersedia. Silakan pilih atau masukkan API Key di Pengaturan > AI Assistant.'
    );
    err.status = 401;
    err.statusCode = 401;
    throw err;
  }
  return new GoogleGenAI({ apiKey });
}

/** generateContent dengan retry backoff untuk error transient. Tanpa fallback model. */
export async function executeGeminiGenerate(
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
        await sleep(calculateBackoffDelay(attempt));
        continue;
      }
      throw err;
    }
  }
}

/** Kirim respons error terklasifikasi (format sama dengan server.ts). */
export function sendClassifiedError(res: ApiRes, err: unknown): void {
  const classified = classifyError(err);
  res.status(classified.statusCode).json({
    success: false,
    category: classified.category,
    statusCode: classified.statusCode,
    isTransient: classified.isTransient,
    error: classified.message,
    technicalDetails: classified.technicalDetails,
  });
}

/** Ambil body sebagai objek (Vercel sudah parse JSON; defensif untuk string). */
export function getBody(req: ApiReq): Record<string, any> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, any>;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}
