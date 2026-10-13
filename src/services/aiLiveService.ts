import { LiveAssistantStatus, AIConfirmationData } from '../types/ai';
import { aiService } from './aiService';

export interface LiveServiceCallbacks {
  onStatusChange?: (status: LiveAssistantStatus, statusText: string) => void;
  onInputTranscript?: (text: string, isFinal: boolean) => void;
  onOutputTranscript?: (text: string, isFinal: boolean) => void;
  onTurnComplete?: () => void;
  onToolCallStart?: (toolName: string, args: Record<string, unknown>) => void;
  onToolCallDone?: (toolName: string, data: unknown) => void;
  onConfirmationDraft?: (confirmation: AIConfirmationData) => void;
  onError?: (errorMessage: string) => void;
}

// Web Speech API types (not all in default TS DOM lib)
interface SpeechRecognitionResultItem {
  transcript: string;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

/**
 * Voice session service using the browser's native Web Speech API.
 *
 * Replaces the previous Gemini Live WebSocket bridge (/api/ai/live) which was
 * never implemented on the backend. Flow per turn:
 *   dengar (SpeechRecognition id-ID) -> kirim teks ke aiService ->
 *   bacakan jawaban (speechSynthesis) -> dengar lagi.
 *
 * The callback interface is unchanged so AIChat.tsx needs no modification.
 */
export class AILiveService {
  private status: LiveAssistantStatus = 'DISCONNECTED';
  private statusText: string = 'Tidak aktif';
  private callbacks: LiveServiceCallbacks = {};

  private recognition: SpeechRecognitionInstance | null = null;
  private listening = false;
  private processing = false;
  private currentInputTranscript = '';
  private sessionActive = false;

  public getStatus(): LiveAssistantStatus {
    return this.status;
  }

  public getStatusText(): string {
    return this.statusText;
  }

  public isConnected(): boolean {
    return this.status !== 'DISCONNECTED' && this.status !== 'ERROR';
  }

  private setStatus(status: LiveAssistantStatus, text?: string) {
    this.status = status;
    switch (status) {
      case 'CONNECTING':
        this.statusText = text || 'Menyiapkan suara...';
        break;
      case 'LISTENING':
        this.statusText = text || 'Mendengarkan suara Anda...';
        break;
      case 'THINKING':
        this.statusText = text || 'Uti sedang memproses...';
        break;
      case 'SPEAKING':
        this.statusText = text || 'Uti sedang berbicara...';
        break;
      case 'ERROR':
        this.statusText = text || 'Terjadi kesalahan pada sesi suara.';
        break;
      case 'DISCONNECTED':
        this.statusText = text || 'Sesi suara diakhiri.';
        break;
    }
    this.callbacks.onStatusChange?.(this.status, this.statusText);
  }

  private getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  /**
   * Check browser capability & microphone availability before connecting
   */
  public async checkMicrophoneSupport(): Promise<{ supported: boolean; reason?: string }> {
    if (typeof window === 'undefined') {
      return { supported: false, reason: 'Lingkungan browser tidak terdeteksi.' };
    }

    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      return {
        supported: false,
        reason: 'Akses mikrofon memerlukan koneksi aman (HTTPS). Buka aplikasi dengan HTTPS.',
      };
    }

    if (!this.getSpeechRecognitionCtor()) {
      return {
        supported: false,
        reason:
          'Browser Anda tidak mendukung pengenalan suara (Web Speech API). Gunakan Chrome atau Edge versi terbaru.',
      };
    }

    if (!('speechSynthesis' in window)) {
      return {
        supported: false,
        reason: 'Browser Anda tidak mendukung suara balasan (speech synthesis).',
      };
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        reason: 'Browser atau environment iframe ini tidak mendukung akses mikrofon (getUserMedia).',
      };
    }

    return { supported: true };
  }

  /**
   * Start a voice session: listen -> AI -> speak -> listen...
   */
  public async startSession(callbacks: LiveServiceCallbacks): Promise<void> {
    this.callbacks = callbacks;

    if (this.isConnected()) {
      this.disconnect();
    }

    const check = await this.checkMicrophoneSupport();
    if (!check.supported) {
      const err = check.reason || 'Suara tidak didukung.';
      this.setStatus('ERROR', err);
      this.callbacks.onError?.(err);
      return;
    }

    this.setStatus('CONNECTING');

    // Request microphone permission explicitly so the user gets a clear prompt
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (micErr: unknown) {
      let friendlyMsg = 'Gagal mengakses mikrofon.';
      if (micErr instanceof DOMException) {
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          friendlyMsg =
            'Izin akses mikrofon ditolak oleh browser atau pengaturan sistem. Mohon berikan izin mikrofon untuk menggunakan fitur suara.';
        } else if (micErr.name === 'NotFoundError' || micErr.name === 'DevicesNotFoundError') {
          friendlyMsg = 'Perangkat mikrofon tidak ditemukan di sistem Anda.';
        } else if (micErr.name === 'NotReadableError') {
          friendlyMsg = 'Mikrofon sedang digunakan oleh aplikasi lain atau tidak dapat dibaca.';
        } else if (micErr.name === 'SecurityError') {
          friendlyMsg = 'Akses mikrofon diblokir oleh kebijakan keamanan browser (iframe/insecure context).';
        }
      }
      this.setStatus('ERROR', friendlyMsg);
      this.callbacks.onError?.(friendlyMsg);
      return;
    }

    if (!aiService.hasKey()) {
      const err = 'API key Gemini belum diatur. Atur dulu di panel Pengaturan AI sebelum memakai suara.';
      this.setStatus('ERROR', err);
      this.callbacks.onError?.(err);
      return;
    }

    this.sessionActive = true;
    this.currentInputTranscript = '';
    this.startListening();
  }

  private startListening() {
    if (!this.sessionActive || this.processing) return;

    const Ctor = this.getSpeechRecognitionCtor();
    if (!Ctor) return;

    this.stopRecognition();

    const rec = new Ctor();
    rec.lang = 'id-ID';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    this.recognition = rec;
    this.listening = true;
    this.currentInputTranscript = '';
    this.setStatus('LISTENING');

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0]?.transcript || '';
        if (res.isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      const shown = (finalText + interim).trim();
      if (shown) {
        this.currentInputTranscript = shown;
        this.callbacks.onInputTranscript?.(shown, !!finalText);
      }
      if (finalText.trim()) {
        // Final utterance captured; process it
        this.stopRecognition();
        void this.processUtterance(finalText.trim());
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' / 'aborted' are normal; just restart listening
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        const err = 'Izin mikrofon ditolak. Berikan izin mikrofon lalu coba lagi.';
        this.setStatus('ERROR', err);
        this.callbacks.onError?.(err);
        this.sessionActive = false;
        return;
      }
      console.warn('[Voice] recognition error:', event.error);
    };

    rec.onend = () => {
      this.listening = false;
      // Auto-restart while session is active and not busy processing/speaking
      if (this.sessionActive && !this.processing) {
        // small delay to avoid tight restart loops on persistent errors
        window.setTimeout(() => {
          if (this.sessionActive && !this.processing && !this.listening) {
            this.startListening();
          }
        }, 300);
      }
    };

    try {
      rec.start();
    } catch (err) {
      console.error('[Voice] failed to start recognition:', err);
      this.listening = false;
    }
  }

  private stopRecognition() {
    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.listening = false;
  }

  private async processUtterance(text: string) {
    if (!this.sessionActive) return;
    this.processing = true;
    this.setStatus('THINKING');

    // Finalize input transcript
    this.callbacks.onInputTranscript?.(text, true);

    try {
      const response = await aiService.sendMessage(text, [], undefined, {
        onToolStatus: (toolInfo) => {
          this.callbacks.onToolCallStart?.(toolInfo.name, {});
        },
      });

      for (const tc of response.toolCalls || []) {
        this.callbacks.onToolCallDone?.(tc.name, tc.result);
      }

      if (response.confirmation) {
        this.callbacks.onConfirmationDraft?.(response.confirmation);
      }

      const reply = (response.text || '').trim();
      if (reply) {
        this.callbacks.onOutputTranscript?.(reply, true);
        this.speak(reply);
      } else {
        this.finishTurn();
      }
    } catch (err) {
      console.error('[Voice] AI processing error:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal memproses suara.';
      this.callbacks.onError?.(errMsg);
      this.finishTurn();
    }
  }

  private pickIndonesianVoice(): SpeechSynthesisVoice | null {
    try {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return null;
      return (
        voices.find((v) => v.lang.toLowerCase().startsWith('id')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('ms')) ||
        null
      );
    } catch {
      return null;
    }
  }

  private speak(text: string) {
    if (!this.sessionActive) {
      this.finishTurn();
      return;
    }
    this.setStatus('SPEAKING');
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'id-ID';
      utter.rate = 1;
      const voice = this.pickIndonesianVoice();
      if (voice) utter.voice = voice;
      utter.onend = () => this.finishTurn();
      utter.onerror = () => this.finishTurn();
      // Ensure voices are loaded on some browsers before speaking
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          const v = this.pickIndonesianVoice();
          if (v) utter.voice = v;
          window.speechSynthesis.speak(utter);
        };
        // fallback: speak anyway after short delay
        window.setTimeout(() => {
          if (this.status === 'SPEAKING') window.speechSynthesis.speak(utter);
        }, 400);
      } else {
        window.speechSynthesis.speak(utter);
      }
    } catch (err) {
      console.error('[Voice] speech synthesis error:', err);
      this.finishTurn();
    }
  }

  private finishTurn() {
    this.processing = false;
    this.currentInputTranscript = '';
    this.callbacks.onTurnComplete?.();
    if (this.sessionActive) {
      this.startListening();
    } else {
      this.setStatus('DISCONNECTED');
    }
  }

  /**
   * Disconnect the voice session
   */
  public disconnect() {
    this.sessionActive = false;
    this.processing = false;
    this.stopRecognition();
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
    this.currentInputTranscript = '';
    this.setStatus('DISCONNECTED');
  }
}

export const aiLiveService = new AILiveService();
