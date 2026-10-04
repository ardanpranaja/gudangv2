/* Diagnostik: uji rantai import mandiri di dalam api/ (_lib/gemini -> _lib/errorClassifier + @google/genai) */
import { getGeminiClient, classifyError } from './_lib/gemini';

export default async function handler(req: any, res: any): Promise<void> {
  void getGeminiClient;
  const c = classifyError(new Error('tes diagnostik'));
  res.status(200).json({
    ok: true,
    category: c.category,
    hasKeyHeader: !!(req.headers && req.headers['x-gemini-api-key']),
    nodeVersion: process.version,
  });
}
