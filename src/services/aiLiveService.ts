import { LiveAssistantStatus, AIConfirmationData } from '../types/ai';
import { aiService } from './aiService';
import {
  resampleAndConvertToPCM16,
  arrayBufferToBase64,
  decodePCM24kToAudioBuffer,
} from './aiAudioUtils';

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

export class AILiveService {
  private ws: WebSocket | null = null;
  private status: LiveAssistantStatus = 'DISCONNECTED';
  private statusText: string = 'Tidak aktif';
  private callbacks: LiveServiceCallbacks = {};

  // Audio capture
  private mediaStream: MediaStream | null = null;
  private inputAudioContext: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  // Audio playback
  private outputAudioContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  // Transcript accumulator
  private currentInputTranscript: string = '';
  private currentOutputTranscript: string = '';

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
        this.statusText = text || 'Menghubungkan ke Gemini Live...';
        break;
      case 'LISTENING':
        this.statusText = text || 'Mendengarkan suara Anda...';
        break;
      case 'THINKING':
        this.statusText = text || 'Gemini sedang memproses...';
        break;
      case 'SPEAKING':
        this.statusText = text || 'Gemini sedang berbicara...';
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

    const hasAudioContext = !!(window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!hasAudioContext) {
      return {
        supported: false,
        reason: 'Browser Anda tidak mendukung Web Audio API.',
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
   * Connect to Gemini Live API session
   */
  public async startSession(callbacks: LiveServiceCallbacks): Promise<void> {
    this.callbacks = callbacks;

    // Disconnect any existing session first
    if (this.isConnected()) {
      this.disconnect();
    }

    // 1. Check feature support
    const check = await this.checkMicrophoneSupport();
    if (!check.supported) {
      const err = check.reason || 'Mikrofon tidak didukung.';
      this.setStatus('ERROR', err);
      this.callbacks.onError?.(err);
      return;
    }

    this.setStatus('CONNECTING');

    // 2. Request microphone permission explicitly
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
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
      this.cleanupAudio();
      return;
    }

    // 3. Connect to Backend WebSocket Live bridge
    try {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.host}/api/ai/live`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Send init configuration including custom API key if present
        const apiKey = aiService.getApiKey();
        this.ws?.send(
          JSON.stringify({
            type: 'init',
            apiKey: apiKey || undefined,
            model: 'gemini-3.8-live',
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (parseErr) {
          console.error('[Live WS] Failed to parse message:', parseErr);
        }
      };

      this.ws.onerror = (e) => {
        console.error('[Live WS] Error:', e);
        const errMsg = 'Gagal terhubung ke WebSocket Live Assistant.';
        this.setStatus('ERROR', errMsg);
        this.callbacks.onError?.(errMsg);
      };

      this.ws.onclose = () => {
        if (this.status !== 'ERROR') {
          this.setStatus('DISCONNECTED');
        }
        this.cleanupAudio();
      };
    } catch (wsErr: unknown) {
      const errMsg = wsErr instanceof Error ? wsErr.message : 'Koneksi ke Live server gagal.';
      this.setStatus('ERROR', errMsg);
      this.callbacks.onError?.(errMsg);
      this.cleanupAudio();
    }
  }

  /**
   * Handle incoming messages from backend Live WebSocket bridge
   */
  private handleServerMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case 'ready': {
        // Live session ready, start capturing and streaming microphone
        this.startMicrophoneCapture();
        this.initPlaybackAudioContext();
        this.setStatus('LISTENING');
        break;
      }

      case 'audio': {
        // Gemini model returned audio chunk
        if (typeof msg.audio === 'string') {
          this.setStatus('SPEAKING');
          this.playAudioChunk(msg.audio);
        }
        break;
      }

      case 'interrupted': {
        // User interrupted the model
        this.stopAllAudioPlayback();
        this.setStatus('LISTENING');
        break;
      }

      case 'input_transcript': {
        // User speech transcript
        if (typeof msg.text === 'string') {
          this.currentInputTranscript += msg.text;
          this.callbacks.onInputTranscript?.(this.currentInputTranscript, false);
        }
        break;
      }

      case 'output_transcript': {
        // Model speech transcript
        if (typeof msg.text === 'string') {
          this.currentOutputTranscript += msg.text;
          this.callbacks.onOutputTranscript?.(this.currentOutputTranscript, false);
        }
        break;
      }

      case 'tool_call_start': {
        this.setStatus('THINKING');
        const calls = (msg.calls as Array<{ name: string; args: Record<string, unknown> }>) || [];
        for (const call of calls) {
          this.callbacks.onToolCallStart?.(call.name, call.args || {});
        }
        break;
      }

      case 'tool_call_result': {
        const toolName = (msg.name as string) || '';
        this.callbacks.onToolCallDone?.(toolName, msg.data);
        if (msg.confirmation) {
          this.callbacks.onConfirmationDraft?.(msg.confirmation as AIConfirmationData);
        }
        break;
      }

      case 'turn_complete': {
        // Finalize transcript turns
        if (this.currentInputTranscript) {
          this.callbacks.onInputTranscript?.(this.currentInputTranscript, true);
          this.currentInputTranscript = '';
        }
        if (this.currentOutputTranscript) {
          this.callbacks.onOutputTranscript?.(this.currentOutputTranscript, true);
          this.currentOutputTranscript = '';
        }
        this.callbacks.onTurnComplete?.();
        if (this.activeSources.length === 0) {
          this.setStatus('LISTENING');
        }
        break;
      }

      case 'error': {
        const errorText = (msg.error as string) || 'Terjadi kesalahan pada sesi Gemini Live.';
        this.setStatus('ERROR', errorText);
        this.callbacks.onError?.(errorText);
        break;
      }

      case 'closed': {
        this.disconnect();
        break;
      }
    }
  }

  /**
   * Initializes microphone capture & streaming 16kHz PCM
   */
  private startMicrophoneCapture() {
    if (!this.mediaStream) return;

    try {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.inputAudioContext = new AudioCtxClass();

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
      // bufferSize: 2048 gives low latency (~128ms)
      this.processorNode = this.inputAudioContext.createScriptProcessor(2048, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (this.status === 'ERROR' || this.status === 'DISCONNECTED') return;

        const inputChannelData = e.inputBuffer.getChannelData(0);
        const sampleRate = this.inputAudioContext?.sampleRate || 44100;

        // Convert and resample to 16kHz PCM 16-bit
        const pcmBuffer = resampleAndConvertToPCM16(inputChannelData, sampleRate, 16000);
        const base64Audio = arrayBufferToBase64(pcmBuffer);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'audio',
              audio: base64Audio,
            })
          );
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.inputAudioContext.destination);
    } catch (err) {
      console.error('[Live Capture] Failed to initialize audio processing:', err);
    }
  }

  /**
   * Initializes 24kHz Web Audio playback context
   */
  private initPlaybackAudioContext() {
    if (!this.outputAudioContext || this.outputAudioContext.state === 'closed') {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      // 24kHz matches model output
      try {
        this.outputAudioContext = new AudioCtxClass({ sampleRate: 24000 });
      } catch {
        this.outputAudioContext = new AudioCtxClass();
      }
    }
    if (this.outputAudioContext.state === 'suspended') {
      this.outputAudioContext.resume().catch(() => {});
    }
    this.nextPlayTime = 0;
  }

  /**
   * Plays a 24kHz PCM chunk with gapless Web Audio scheduling
   */
  private playAudioChunk(base64Audio: string) {
    if (!this.outputAudioContext) {
      this.initPlaybackAudioContext();
    }
    if (!this.outputAudioContext) return;

    try {
      const audioBuffer = decodePCM24kToAudioBuffer(base64Audio, this.outputAudioContext);
      const currentTime = this.outputAudioContext.currentTime;

      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + 0.03; // tiny buffer (30ms) to prevent audio underrun click
      }

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioContext.destination);

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.activeSources.push(source);

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
        if (this.activeSources.length === 0 && this.status === 'SPEAKING') {
          this.setStatus('LISTENING');
        }
      };
    } catch (decodeErr) {
      console.error('[Live Playback] Error decoding audio chunk:', decodeErr);
    }
  }

  /**
   * Stop active audio playback immediately upon interruption
   */
  private stopAllAudioPlayback() {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // ignore already stopped sources
      }
    }
    this.activeSources = [];
    this.nextPlayTime = 0;
  }

  /**
   * Cleanup audio devices and context
   */
  private cleanupAudio() {
    this.stopAllAudioPlayback();

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch {}
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
      this.inputAudioContext.close().catch(() => {});
      this.inputAudioContext = null;
    }

    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      this.outputAudioContext.close().catch(() => {});
      this.outputAudioContext = null;
    }
  }

  /**
   * Disconnect the Live session
   */
  public disconnect() {
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'close' }));
        }
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.cleanupAudio();
    this.currentInputTranscript = '';
    this.currentOutputTranscript = '';
    this.setStatus('DISCONNECTED');
  }
}

export const aiLiveService = new AILiveService();
