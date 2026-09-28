import OpenAI from "openai";
import { ANSWER_SYSTEM_PROMPT, buildMessages, cleanForDisplay, type Turn } from "@/lib/prompt";

// Edge runtime gives noticeably lower cold-start latency, which is
// the whole point of this app.
export const runtime = "edge";

// Provider settings live in .env.local, NOT in code.
// Groq, OpenRouter, xAI and many others speak the same "OpenAI-style"
// protocol, so switching provider = changing these three values.
const BASE_URL = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
const MODEL = process.env.LLM_MODEL || "openai/gpt-oss-20b";

// Each model family controls "thinking" differently, and sending the wrong
// value makes the API reject the request. So we choose per model.
//  - openai/gpt-oss-*: always thinks; "low" is the shortest it allows.
//  - qwen/*: thinking can be switched off entirely with "none" (fastest).
//  - anything else: send nothing.
function reasoningParams(model: string): Record<string, string> {
  if (model.startsWith("openai/gpt-oss")) return { reasoning_effort: "low" };
  if (model.startsWith("qwen/")) return { reasoning_effort: "none" };
  return {};
}

export async function POST(req: Request) {
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey) {
    console.error("[answer] LLM_API_KEY is not set");
    return new Response(
      "LLM_API_KEY is missing. Add it to .env.local and restart `npm run dev`.",
      { status: 500 }
    );
  }

  const { question, history = [] } = (await req.json()) as {
    question: string;
    history?: Turn[];
  };

  if (!question?.trim()) {
    return new Response("Question is required.", { status: 400 });
  }

  const client = new OpenAI({ apiKey, baseURL: BASE_URL });

  const encoder = new TextEncoder();
  let stream: Awaited<ReturnType<typeof createStream>> | null = null;

  function createStream() {
    return client.chat.completions.create({
      model: MODEL,
      // Some Groq models (the "openai/gpt-oss-*" family) think privately
      // before answering, and that hidden thinking eats into this budget.
      // 300 was too tight — a hard question could burn the whole budget
      // on thinking and leave nothing for the visible answer. 700 leaves
      // headroom even for a three-line answer plus some thinking.
      max_tokens: 700,
      stream: true,
      // Thinking level depends on the model family (see reasoningParams).
      ...reasoningParams(MODEL),
      messages: [
        // In the OpenAI format the system prompt is the first message.
        { role: "system", content: ANSWER_SYSTEM_PROMPT },
        ...buildMessages(question, history),
      ],
    });
  }

  const body = new ReadableStream({
    async start(controller) {
      try {
        stream = await createStream();

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) controller.enqueue(encoder.encode(cleanForDisplay(text)));
        }
      } catch (err: any) {
        console.error("[answer] stream failed:", err?.status, err?.message ?? err);
        const reason = err?.status
          ? `${err.status} ${err?.message ?? ""}`
          : err?.message ?? "unknown error";
        controller.enqueue(encoder.encode(`[Failed: ${reason}]`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      // Fired when the browser aborts because a newer question arrived.
      stream?.controller.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}