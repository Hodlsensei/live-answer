"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { looksLikeQuestion } from "@/lib/prompt";

type Options = {
  /** Fires once the speaker has paused long enough to count as finished. */
  onQuestion: (question: string) => void;
  /** Milliseconds of silence that end a question. 600–900 feels right. */
  silenceMs?: number;
  lang?: string;
};

export function useSpeechQuestion({
  onQuestion,
  silenceMs = 700,
  lang = "en-US",
}: Options) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recogRef = useRef<any>(null);
  const finalRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningRef = useRef(false);
  const onQuestionRef = useRef(onQuestion);

  useEffect(() => {
    onQuestionRef.current = onQuestion;
  }, [onQuestion]);

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      setSupported(false);
      return;
    }

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = lang;

    recog.onresult = (ev: any) => {
      let live = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const chunk = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalRef.current += chunk;
        else live += chunk;
      }

      setTranscript(finalRef.current);
      setInterim(live);

      if (timerRef.current) clearTimeout(timerRef.current);

      const candidate = (finalRef.current + " " + live).trim();
      if (!looksLikeQuestion(candidate)) return;

      timerRef.current = setTimeout(() => {
        onQuestionRef.current(candidate);
        finalRef.current = "";
        setInterim("");
      }, silenceMs);
    };

    recog.onerror = (ev: any) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        setError("Microphone access was blocked. Allow it in your browser, or type instead.");
        listeningRef.current = false;
        setListening(false);
      }
      if (ev.error === "network") {
        setError("Speech service unreachable. Check your connection.");
      }
    };

    // Chrome stops the recognizer on its own every so often; restart it.
    recog.onend = () => {
      if (listeningRef.current) {
        try {
          recog.start();
        } catch {
          /* already starting */
        }
      }
    };

    recogRef.current = recog;

    return () => {
      listeningRef.current = false;
      try {
        recog.stop();
      } catch {
        /* not running */
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lang, silenceMs]);

  const start = useCallback(() => {
    if (!recogRef.current) return;
    setError(null);
    listeningRef.current = true;
    setListening(true);
    try {
      recogRef.current.start();
    } catch {
      /* already running */
    }
  }, []);

  const stop = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    try {
      recogRef.current?.stop();
    } catch {
      /* not running */
    }
  }, []);

  const toggle = useCallback(() => {
    listeningRef.current ? stop() : start();
  }, [start, stop]);

  return { listening, supported, transcript, interim, error, start, stop, toggle };
}
