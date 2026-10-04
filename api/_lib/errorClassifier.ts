/* Vendored copy of src/services/aiErrorClassifier.ts — SELF-CONTAINED.
 * Alasan: bundler Vercel crash jika function mengimpor dari luar direktori api/.
 * File ini tidak mengimpor apa pun dari ../src. Jika logika klasifikasi berubah
 * di src/services/aiErrorClassifier.ts, salin perubahannya ke sini. */

export type GeminiErrorCategory =
  | 'CONNECTED'
  | 'UNAVAILABLE'
  | 'QUOTA'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'INVALID_API_KEY'
  | 'PERMISSION_DENIED'
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface ClassifiedError {
  category: GeminiErrorCategory;
  statusCode: number;
  message: string;
  isTransient: boolean;
  technicalDetails?: string;
}

/**
 * Classifies errors from the Gemini API safely without exposing sensitive secrets
 */
export function classifyError(err: unknown): ClassifiedError {
  let msg = '';
  let status = 500;

  if (err instanceof Error) {
    msg = err.message || '';
    if (typeof (err as any).status === 'number') status = (err as any).status;
    else if (typeof (err as any).statusCode === 'number') status = (err as any).statusCode;
    else if (typeof (err as any).code === 'number') status = (err as any).code;
  } else if (typeof err === 'string') {
    msg = err;
  } else if (typeof err === 'object' && err !== null) {
    const errObj = err as Record<string, unknown>;
    msg =
      (typeof errObj.message === 'string' ? errObj.message : '') ||
      (typeof errObj.error === 'string' ? errObj.error : '') ||
      JSON.stringify(err);
    if (typeof errObj.status === 'number') status = errObj.status;
    else if (typeof errObj.statusCode === 'number') status = errObj.statusCode;
    else if (typeof errObj.code === 'number') status = errObj.code;
  }

  // Try parsing inner JSON error message if present (common in @google/genai ApiError)
  if (msg.startsWith('{') && msg.includes('"error"')) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.error?.code && typeof parsed.error.code === 'number') {
        status = parsed.error.code;
      }
      if (parsed?.error?.message && typeof parsed.error.message === 'string') {
        msg = parsed.error.message;
      }
    } catch {
      // Ignore JSON parse failure
    }
  }

  // Mask any potential key occurrences in technicalDetails
  const sanitizedMsg = msg.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
  const lowerMsg = sanitizedMsg.toLowerCase();

  // 1. Invalid API Key (401 / API_KEY_INVALID)
  if (
    lowerMsg.includes('api_key_invalid') ||
    lowerMsg.includes('api key not valid') ||
    lowerMsg.includes('invalid api key') ||
    lowerMsg.includes('unauthenticated') ||
    status === 401
  ) {
    return {
      category: 'INVALID_API_KEY',
      statusCode: 401,
      message: 'Kunci API Gemini tidak valid. Silakan periksa di menu Pengaturan > AI Assistant.',
      isTransient: false,
      technicalDetails: sanitizedMsg,
    };
  }

  // 2. Permission Denied (403)
  if (status === 403 || lowerMsg.includes('permission_denied') || lowerMsg.includes('permission denied')) {
    return {
      category: 'PERMISSION_DENIED',
      statusCode: 403,
      message: 'Akses Gemini API ditolak (izin atau hak akses tidak mencukupi).',
      isTransient: false,
      technicalDetails: sanitizedMsg,
    };
  }

  // 3. Quota / Rate limit (429)
  if (
    status === 429 ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('quota') ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('429')
  ) {
    return {
      category: 'QUOTA',
      statusCode: 429,
      message: 'Kuota Gemini API telah terlampaui. Silakan periksa batas kuota akun Anda.',
      isTransient: true,
      technicalDetails: sanitizedMsg,
    };
  }

  // 4. Unavailable / 503 / High Demand
  if (
    status === 503 ||
    lowerMsg.includes('503') ||
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('high demand') ||
    lowerMsg.includes('spikes in demand') ||
    lowerMsg.includes('overloaded')
  ) {
    return {
      category: 'UNAVAILABLE',
      statusCode: 503,
      message: 'Gemini sedang tidak tersedia sementara. Silakan coba kembali beberapa saat lagi.',
      isTransient: true,
      technicalDetails: sanitizedMsg,
    };
  }

  // 5. Timeout (408 / 504 / deadline exceeded)
  if (
    status === 408 ||
    status === 504 ||
    lowerMsg.includes('deadline_exceeded') ||
    lowerMsg.includes('timed out') ||
    lowerMsg.includes('timeout')
  ) {
    return {
      category: 'TIMEOUT',
      statusCode: 504,
      message: 'Batas waktu komunikasi ke model Gemini terlampaui.',
      isTransient: true,
      technicalDetails: sanitizedMsg,
    };
  }

  // 6. Server Error (500 / 502)
  if (
    status === 500 ||
    status === 502 ||
    lowerMsg.includes('internal server error') ||
    lowerMsg.includes('internal error')
  ) {
    return {
      category: 'SERVER_ERROR',
      statusCode: 500,
      message: 'Terjadi gangguan sementara pada server Gemini.',
      isTransient: true,
      technicalDetails: sanitizedMsg,
    };
  }

  // 7. Invalid Request (400)
  if (status === 400 || lowerMsg.includes('invalid_argument')) {
    return {
      category: 'INVALID_REQUEST',
      statusCode: 400,
      message: 'Format permintaan ke model AI tidak valid.',
      isTransient: false,
      technicalDetails: sanitizedMsg,
    };
  }

  // 8. Network Error
  if (lowerMsg.includes('fetch failed') || lowerMsg.includes('econnrefused') || lowerMsg.includes('enotfound')) {
    return {
      category: 'NETWORK_ERROR',
      statusCode: 503,
      message: 'Gagal terhubung ke server Gemini. Periksa jaringan internet.',
      isTransient: true,
      technicalDetails: sanitizedMsg,
    };
  }

  return {
    category: 'UNKNOWN',
    statusCode: status || 500,
    message: sanitizedMsg || 'Terjadi kendala saat memproses permintaan AI.',
    isTransient: false,
    technicalDetails: sanitizedMsg,
  };
}
