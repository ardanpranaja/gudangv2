/** Format tanggal ISO ke DD/MM/YYYY (id-ID). */
export function formatTanggal(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format tanggal ISO ke DD/MM/YYYY HH:MM (id-ID). */
export function formatTanggalWaktu(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return (
    d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );
}
