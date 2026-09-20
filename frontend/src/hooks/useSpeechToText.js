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

    const start = useCallback(() => {
        if (!SpeechRecognitionAPI) return;

        const recognition = new SpeechRecognitionAPI();
        recognition.lang = "fa-IR";
        recognition.continuous = true;
        recognition.interimResults = true; // needed for onresult to fire reliably

        recognition.onresult = (event) => {
            // Only process results from resultIndex onward — avoids
            // re-sending earlier phrases already appended in a prior event.
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    onResult(result[0].transcript);
                }
            }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    }, [onResult]);

    const stop = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    return { isListening, isSupported, start, stop };
}