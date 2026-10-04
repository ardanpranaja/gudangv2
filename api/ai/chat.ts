/* Vercel Serverless Function: POST /api/ai/chat
 * Proxy chat Gemini + tools (port dari server.ts). Eksekusi tool tetap di client. */
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
    const { contents, tools, systemInstruction, model } = getBody(req);

    if (!model) {
      res.status(400).json({
        success: false,
        category: 'INVALID_REQUEST',
        statusCode: 400,
        error: 'Model Gemini belum ditentukan dalam permintaan.',
      });
      return;
    }

    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (tools && Array.isArray(tools) && tools.length > 0) {
      config.tools = tools;
    }

    const response = await executeGeminiGenerate(client, model, contents, config, 2);

    res.status(200).json({
      success: true,
      text: response.text || '',
      functionCalls: response.functionCalls || [],
      candidates: response.candidates,
    });
  } catch (err: unknown) {
    sendClassifiedError(res, err);
  }
}
