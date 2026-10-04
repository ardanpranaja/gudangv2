/* Diagnostik: relative import DENGAN ekstensi .js eksplisit */
import { classifyError } from './_lib/errorClassifier.js';

export default async function handler(_req: any, res: any): Promise<void> {
  const c = classifyError(new Error('tes diagnostik'));
  res.status(200).json({ ok: true, category: c.category });
}
