/* Vercel Serverless Function: GET/POST /api/ai/models
 * Discovery model Gemini dinamis + filter kapabilitas (port dari server.ts). */
import { getGeminiClient, sendClassifiedError, type ApiReq, type ApiRes } from '../_lib/gemini';

export default async function handler(req: ApiReq, res: ApiRes): Promise<void> {
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
      const isGenerative =
        supportedActions.includes('generateContent') || supportedActions.length === 0;

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

    res.status(200).json({ success: true, total: models.length, models });
  } catch (err: unknown) {
    sendClassifiedError(res, err);
  }
}
