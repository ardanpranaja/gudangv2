/* Fungsi diagnostik sementara — menguji rantai import api/_lib/gemini.ts di Vercel. */
import { getGeminiClient } from './_lib/gemini';

export default async function handler(req: any, res: any): Promise<void> {
  void getGeminiClient;
  res.status(200).json({
    ok: true,
    hasKeyHeader: !!req.headers['x-gemini-api-key'],
    nodeVersion: process.version,
  });
}
