// useSpeechToText.js
import { useState, useRef, useCallback } from "react";

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export function useSpeechToText({ onResult }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(!!SpeechRecognitionAPI);
  const recognitionRef = useRef(null);
  const lastTranscriptRef = useRef("");
  const isManualStopRef = useRef(false);

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    isManualStopRef.current = false;
    lastTranscriptRef.current = "";

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "fa-IR";
    recognition.continuous = true;
    recognition.interimResults = true; // needed for onresult to fire reliably

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          // Dedupe: mobile engines sometimes re-emit the same final
          // phrase right after a session restart — skip an exact
          // repeat of the immediately preceding phrase.
          if (transcript && transcript !== lastTranscriptRef.current) {
            onResult(transcript);
            lastTranscriptRef.current = transcript;
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      // "no-speech" fires often on mobile during natural pauses —
      // don't treat it as a hard stop, let onend decide whether to
      // restart, same as any other natural session end.
      if (event.error !== "no-speech") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (!isManualStopRef.current) {
        // Mobile engines end a "continuous" session on their own
        // after a pause far more aggressively than desktop — auto
        // restarting here recreates the effect of one continuous
        // session without relying on mobile's buggy continuous mode.
        try {
          recognition.start();
        } catch {
          // start() can throw if called again too quickly right
          // after a stop — safe to ignore, the user can just tap
          // the mic again.
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onResult]);

  const stop = useCallback(() => {
    isManualStopRef.current = true;
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, isSupported, start, stop };
}