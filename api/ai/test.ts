/* Vercel Serverless Function: POST /api/ai/test
 * Uji koneksi Gemini API (port dari server.ts). */
import {
  getGeminiClient,
  executeGeminiGenerate,
  sendClassifiedError,
  getBody,
  type ApiReq,
  type ApiRes,
} from '../_lib/gemini';

export default async function handler(req: ApiReq, res: ApiRes): Promise<void> {
  try {
    const client = getGeminiClient(req);
    const body = getBody(req);
    const queryModel = req.query?.model;
    const requestedModel =
      body.model || (Array.isArray(queryModel) ? queryModel[0] : queryModel) || 'gemini-3.7-flash';

    const result = await executeGeminiGenerate(
      client,
      requestedModel,
      'Ping test. Jawab "OK".',
      undefined,
      1
    );

    res.status(200).json({
      success: true,
      category: 'CONNECTED',
      message: `Koneksi ke Gemini API berhasil menggunakan model ${requestedModel}.`,
      reply: result.text || 'OK',
    });
  } catch (err: unknown) {
    sendClassifiedError(res, err);
  }
}
