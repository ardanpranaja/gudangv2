export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AIToolCallInfo {
  id?: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'done' | 'error';
  errorMessage?: string;
}

export type AIConfirmationType =
  | 'BARANG_MASUK'
  | 'BARANG_KELUAR'
  | 'PINJAM'
  | 'KEMBALI'
  | 'REQUEST';

export interface AIConfirmationDetail {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface AIConfirmationItem {
  itemId: string;
  itemName: string;
  jumlah: number;
  satuan: string;
  availableStock?: number;
}

export interface AIConfirmationData {
  id: string;
  type: AIConfirmationType;
  title: string;
  description?: string;
  details: AIConfirmationDetail[];
  /** Daftar barang untuk transaksi multi-item. Jika kosong/undefined, gunakan rawInput tunggal (kompatibilitas lama). */
  items?: AIConfirmationItem[];
  rawInput: Record<string, unknown>;
  status: 'pending' | 'confirmed' | 'cancelled' | 'executed' | 'failed';
  executionResult?: {
    success: boolean;
    message?: string;
    idTransaksi?: string;
    idPengajuan?: string;
  };
}

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  timestamp: string;
  toolCalls?: AIToolCallInfo[];
  confirmation?: AIConfirmationData;
  error?: string;
}

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

export interface SavedApiKey {
  id: string;
  maskedKey: string;
  label: string;
  fullKey: string;
  createdAt: string;
}

export interface KeyUsageStats {
  /** Tanggal bucket dalam zona America/Los_Angeles (format YYYY-MM-DD). Kuota Google reset tengah malam waktu Pasifik. */
  dateKey: string;
  requests: number;      // total percobaan request yang dikirim memakai key ini
  errors429: number;     // berapa kali key ini kena 429/kuota hari ini
  errors401: number;     // berapa kali key ini 401/invalid hari ini
  otherErrors: number;
  lastErrorAt: string | null;   // ISO timestamp error terakhir
  lastErrorType: 'QUOTA' | 'INVALID' | 'MODEL_404' | 'OTHER' | null;
}

export interface AIModelInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  supportedActions?: string[];
}

export interface AIConfig {
  apiKey?: string;
  model: string;
  isConnected: boolean;
  category?: GeminiErrorCategory;
  lastChecked?: string;
  errorMessage?: string;
}

export type LiveAssistantStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'ERROR';

export interface AIConversationContext {
  activeMember?: {
    id: string;
    name: string;
    jabatan?: string;
    divisi?: string;
  };
  activeItem?: {
    id: string;
    name: string;
    satuan?: string;
    kategori?: string;
    lokasi?: string;
    stok?: number;
  };
  activeLimit?: {
    id?: string;
    memberId: string;
    itemId: string;
    maxQty: number;
    satuan?: string;
    status?: string;
  };
  recentEntities?: {
    members?: Array<{
      id: string;
      name: string;
      jabatan?: string;
    }>;
    items?: Array<{
      id: string;
      name: string;
      satuan?: string;
    }>;
  };
}

export interface AIConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AIMessage[];
  context?: AIConversationContext;
}

export interface StructuredToolResult<T = unknown> {
  success: boolean;
  errorCode?:
    | 'MISSING_PARAMETER'
    | 'LIMIT_ALREADY_EXISTS'
    | 'NOT_FOUND'
    | 'INVALID_INPUT'
    | 'API_ERROR'
    | 'UNAUTHORIZED'
    | 'INSUFFICIENT_STOCK'
    | 'ITEM_NOT_FOUND'
    | 'MEMBER_NOT_FOUND'
    | 'MEMBER_INACTIVE'
    | 'FETCH_FAILED'
    | string;
  message?: string;
  missing?: string[];
  data?: T;
  idLimit?: string;
  idTransaksi?: string;
  idPengajuan?: string;
  confirmation?: AIConfirmationData;
}

export interface AIError {
  category: GeminiErrorCategory;
  errorCode?: string;
  statusCode?: number;
  tool?: string;
  message: string;
  technicalDetails?: string;
  retryable?: boolean;
}

