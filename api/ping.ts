/* Diagnostik: uji import file trivial dari ../src/ */
import { PINGTEST_VALUE } from '../src/_pingtest';

export default async function handler(_req: any, res: any): Promise<void> {
  res.status(200).json({ ok: true, value: PINGTEST_VALUE });
}
