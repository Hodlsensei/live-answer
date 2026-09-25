"use client";

import { useCallback, useRef, useState } from "react";
import type { Turn } from "@/lib/prompt";

export type AnswerState = {
  question: string;
  text: string;
  pending: boolean;
  firstTokenMs: number | null;
  totalMs: number | null;
  error: string | null;
};

const EMPTY: AnswerState = {
  question: "",
  text: "",
  pending: false,
  firstTokenMs: null,
  totalMs: null,
  error: null,
};

export function useStreamingAnswer() {
  const [state, setState] = useState<AnswerState>(EMPTY);
  const [history, setHistory] = useState<Turn[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const lastQuestionRef = useRef("");
  const historyRef = useRef<Turn[]>([]);
  historyRef.current = history;

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || q === lastQuestionRef.current) return;
    lastQuestionRef.current = q;

    // A newer question always wins. Without this, two streams paint
    // over each other and the screen looks broken.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const started = performance.now();
    let firstToken: number | null = null;
    let full = "";

    setState({ ...EMPTY, question: q, pending: true });

    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history: historyRef.current }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Server responded ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (firstToken === null) firstToken = performance.now() - started;
        full += decoder.decode(value, { stream: true });

        setState((prev) => ({
          ...prev,
          text: full,
          firstTokenMs: firstToken,
        }));
      }

      const totalMs = performance.now() - started;
      setState((prev) => ({ ...prev, pending: false, totalMs }));
      setHistory((prev) => [...prev, { question: q, answer: full }].slice(-6));
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        pending: false,
        error: err?.message || "Could not reach the answer service. Try again.",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    lastQuestionRef.current = "";
    setState(EMPTY);
    setHistory([]);
  }, []);

  return { ...state, history, ask, reset };
}