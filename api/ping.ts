/* Diagnostik: uji import aiErrorClassifier dari api/ */
import { classifyError } from '../src/services/aiErrorClassifier';

export default async function handler(_req: any, res: any): Promise<void> {
  const c = classifyError(new Error('tes diagnostik'));
  res.status(200).json({ ok: true, category: c.category });
}
