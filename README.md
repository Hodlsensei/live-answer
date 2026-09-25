# Live Answer

Someone asks a question out loud. The answer appears on screen while they are
still finishing the sentence.

## Run it

```bash
npm install
cp .env.example .env.local     # add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000 in **Chrome or Edge** — they ship the Web Speech API.
Safari and Firefox fall back to the typing box.

## File map

```
app/
  layout.tsx            shell
  globals.css           colour tokens, light + dark
  page.tsx              the whole UI, wires the two hooks together
  page.module.css       page styles
  api/answer/route.ts   edge route, streams tokens from Claude
hooks/
  useSpeechQuestion.ts  microphone, transcript, end-of-question detection
  useStreamingAnswer.ts fetch + stream reader + cancel-on-newer-question
lib/
  prompt.ts             system prompt, question gate, rolling context
types/
  speech.d.ts           Web Speech API declarations
```

## The four things that decide whether it feels fast

1. **Interim results.** `interimResults = true` gives you words as they are
   spoken instead of after the sentence. Without it everything feels a second
   slower than it is.

2. **End-of-question detection.** `hooks/useSpeechQuestion.ts` waits 700 ms of
   silence before treating speech as a finished question. Tune `silenceMs`:
   below 500 it interrupts people mid-sentence, above 1000 it feels sluggish.

3. **Cancellation.** `useStreamingAnswer` aborts the previous request when a new
   question arrives. Skip this and two answers paint over each other.

4. **Token streaming.** The route streams raw text chunks and the client paints
   them as they arrive. An answer that *starts* in 400 ms feels faster than one
   that appears complete at 2 seconds.

## Latency budget

| Stage | Typical |
| --- | --- |
| Speech to text (browser) | 100–300 ms |
| Silence window | 700 ms |
| Model first token (Haiku, edge) | 300–700 ms |
| **Words on screen** | **1.1–1.7 s** |

The silence window is the biggest chunk. The way to cut it is optimistic
generation: start answering the partial transcript, and abort if the question
changes. That is the most interesting upgrade to make next.

## Where to take it next

**Swap in Deepgram.** Browser speech is free but inaccurate with accents and
absent on Safari. Deepgram streams over a WebSocket, returns partials in
~150 ms, and tells you when a speaker finished. Add `DEEPGRAM_API_KEY`, open a
socket from a `/api/transcribe` route, and replace `useSpeechQuestion`'s
internals — the hook's public shape stays the same.

**Answer from your own documents.** Put your content in Postgres with
`pgvector`, embed each question, retrieve the top 4 chunks, and prepend them to
the message in `buildMessages`. This is the change that turns a demo into
something worth paying for.

**Cache repeats.** In support and kiosk settings roughly a third of questions
repeat. Hash the normalised question, store the answer in Redis, and serve hits
in about 50 ms.

**Add a display mode.** Full-screen, large type, no chrome — for kiosks and
second monitors.

## Cost note

Haiku at 300 output tokens runs a fraction of a cent per question. The thing to
watch is the question gate in `lib/prompt.ts`: without it, every stray fragment
of speech becomes a paid API call.
