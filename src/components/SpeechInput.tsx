import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function SpeechInput({ onTranscript, disabled }: SpeechInputProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript) onTranscript(transcript);
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, [onTranscript]);

  const toggle = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      recognition.start();
      setListening(true);
    }
  }, [listening]);

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`speech-btn ${listening ? 'speech-btn--active' : ''}`}
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? 'Stop dictation' : 'Start dictation'}
      title={listening ? 'Stop dictation' : 'Describe your song with voice'}
    >
      <span className="speech-icon">{listening ? '⏹' : '🎤'}</span>
      <span className="speech-label">
        {listening ? 'Listening…' : 'Voice'}
      </span>
    </button>
  );
}
