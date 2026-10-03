/**
 * Utility functions for Gemini Live API audio processing:
 * - Resampling to 16kHz PCM 16-bit little-endian for microphone input
 * - Decoding 24kHz PCM 16-bit little-endian for model voice output
 */

/**
 * Resamples a Float32Array from inputSampleRate to 16000Hz and converts to 16-bit PCM little-endian
 */
export function resampleAndConvertToPCM16(
  inputBuffer: Float32Array,
  inputSampleRate: number,
  targetSampleRate: number = 16000
): ArrayBuffer {
  let samples: Float32Array;

  if (inputSampleRate === targetSampleRate) {
    samples = inputBuffer;
  } else {
    const ratio = inputSampleRate / targetSampleRate;
    const newLength = Math.round(inputBuffer.length / ratio);
    samples = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const originIndex = i * ratio;
      const indexFloor = Math.floor(originIndex);
      const indexCeil = Math.min(inputBuffer.length - 1, indexFloor + 1);
      const interpolation = originIndex - indexFloor;
      samples[i] =
        inputBuffer[indexFloor] * (1 - interpolation) +
        inputBuffer[indexCeil] * interpolation;
    }
  }

  const pcm16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return pcm16.buffer;
}

/**
 * Converts ArrayBuffer to Base64 string safely
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes base64 string of 24kHz 16-bit little-endian PCM into an AudioBuffer
 */
export function decodePCM24kToAudioBuffer(
  base64Audio: string,
  audioContext: AudioContext
): AudioBuffer {
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 16-bit samples = 2 bytes per sample
  const sampleCount = Math.floor(len / 2);
  const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const audioBuffer = audioContext.createBuffer(1, sampleCount, 24000);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < sampleCount; i++) {
    const int16 = dataView.getInt16(i * 2, true); // little-endian
    channelData[i] = int16 / 32768.0;
  }

  return audioBuffer;
}
