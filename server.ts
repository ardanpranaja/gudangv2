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
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

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
    const result = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Ping test. Jawab "OK".',
    });
    res.json({
      success: true,
      message: 'Koneksi ke Gemini API berhasil.',
      reply: result.text || 'OK',
    });
  } catch (err: any) {
    console.error('[AI Test Error]:', err?.message);
    res.status(400).json({
      success: false,
      error: err?.message || 'Gagal terhubung ke Gemini API',
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

    const response = await client.models.generateContent({
      model,
      contents,
      config,
    });

    const functionCalls = response.functionCalls || [];
    const text = response.text || '';

    res.json({
      success: true,
      text,
      functionCalls,
      candidates: response.candidates,
    });
  } catch (err: any) {
    console.error('[AI Chat Error]:', err?.message);
    res.status(500).json({
      success: false,
      error: err?.message || 'Gagal memproses pesan AI',
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
