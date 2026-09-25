"use client";

import { useCallback, useState } from "react";
import { useSpeechQuestion } from "@/hooks/useSpeechQuestion";
import { useStreamingAnswer } from "@/hooks/useStreamingAnswer";
import styles from "./page.module.css";

export default function Page() {
  const [typed, setTyped] = useState("");

  const answer = useStreamingAnswer();

  const handleQuestion = useCallback(
    (question: string) => {
      answer.ask(question);
    },
    [answer]
  );

  const speech = useSpeechQuestion({ onQuestion: handleQuestion });

  const heard = (speech.transcript + " " + speech.interim).trim();

  function submitTyped(e: React.FormEvent) {
    e.preventDefault();
    const q = typed.trim();
    if (!q) return;
    answer.ask(q);
    setTyped("");
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Live Answer</h1>
          <p className={styles.tagline}>
            Ask out loud. The answer starts writing before you finish.
          </p>
        </div>

        <button
          type="button"
          onClick={speech.toggle}
          disabled={!speech.supported}
          aria-pressed={speech.listening}
          className={styles.mic}
        >
          <span
            className={speech.listening ? styles.dotLive : styles.dot}
            aria-hidden="true"
          />
          {!speech.supported
            ? "Voice unavailable"
            : speech.listening
              ? "Listening"
              : "Start listening"}
        </button>
      </header>

      <section className={styles.heard} aria-live="polite">
        <span className={styles.caption}>Heard</span>
        <p className={styles.heardText}>
          {speech.transcript}
          {speech.interim ? (
            <span className={styles.interim}>{speech.interim}</span>
          ) : null}
          {!heard ? (
            <span className={styles.interim}>Nothing yet.</span>
          ) : null}
        </p>
      </section>

      <section className={styles.card} aria-live="polite">
        <span className={styles.caption}>Answer</span>
        <p className={styles.answer}>
          {answer.text ||
            (answer.pending ? "Thinking…" : "Answers appear here.")}
        </p>

        {(answer.firstTokenMs || answer.totalMs) && (
          <p className={styles.timing}>
            first words in {Math.round(answer.firstTokenMs ?? 0)} ms
            {answer.totalMs
              ? ` · complete in ${Math.round(answer.totalMs)} ms`
              : ""}
          </p>
        )}

        {answer.error && <p className={styles.error}>{answer.error}</p>}
      </section>

      <form className={styles.typed} onSubmit={submitTyped}>
        <input
          className={styles.input}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Or type a question"
          aria-label="Type a question"
        />
        <button className={styles.ask} type="submit">
          Ask
        </button>
      </form>

      {speech.error && <p className={styles.error}>{speech.error}</p>}
      {!speech.supported && (
        <p className={styles.note}>
          This browser has no speech recognition. Chrome and Edge do; typing
          works everywhere.
        </p>
      )}
    </main>
  );
}
