/* Diagnostik: hanya package import @google/genai, tanpa relative import */
import { GoogleGenAI } from '@google/genai';

export default async function handler(_req: any, res: any): Promise<void> {
  res.status(200).json({ ok: true, sdkLoaded: typeof GoogleGenAI === 'function' });
}
