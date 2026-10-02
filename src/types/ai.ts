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

export interface AIConfirmationData {
  id: string;
  type: AIConfirmationType;
  title: string;
  description?: string;
  details: AIConfirmationDetail[];
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

export interface AIConfig {
  apiKey?: string;
  model: string;
  isConnected: boolean;
  lastChecked?: string;
  errorMessage?: string;
}
