import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface AIVoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// Declare SpeechRecognition types for browsers
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export const AIVoiceButton: React.FC<AIVoiceButtonProps> = ({ onTranscript, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'id-ID'; // Bahasa Indonesia

      recognition.onstart = () => {
        setIsListening(true);
        setInterimText('');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            currentInterim += transcript;
          }
        }

        if (finalTranscript) {
          onTranscript(finalTranscript.trim());
          setInterimText('');
        } else {
          setInterimText(currentInterim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[Voice Recognition Error]:', event?.error);
        setIsListening(false);
        setInterimText('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('SpeechRecognition initialization failed:', e);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript]);

  const toggleListen = () => {
    if (!recognitionRef.current || !isSupported) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Failed to start speech recognition:', err);
      }
    }
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        title="Web Speech API tidak didukung pada peramban ini. Gunakan Google Chrome/Edge."
        disabled
        className="p-2.5 rounded-full text-slate-300 bg-slate-100 cursor-not-allowed"
      >
        <MicOff className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="relative flex items-center">
      {/* Interim text floating badge */}
      {isListening && interimText && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-full shadow-lg border border-slate-700 pointer-events-none animate-pulse">
          &ldquo;{interimText}&rdquo;
        </div>
      )}

      <button
        type="button"
        onClick={toggleListen}
        disabled={disabled}
        title={isListening ? 'Hentikan rekaman suara' : 'Tekan untuk berbicara'}
        className={`relative p-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isListening
            ? 'bg-rose-600 text-white shadow-lg ring-rose-400 animate-pulse'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 focus:ring-slate-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isListening ? (
          <span className="flex items-center justify-center">
            <span className="absolute w-full h-full rounded-full bg-rose-500 animate-ping opacity-75" />
            <Mic className="w-5 h-5 relative z-10" />
          </span>
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};
