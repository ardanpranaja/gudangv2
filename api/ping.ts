/* Diagnostik: tanpa import, tanpa akses req — apakah function Vercel bisa jalan sama sekali? */
export default async function handler(_req: any, res: any): Promise<void> {
  res.status(200).json({ ok: true });
}
