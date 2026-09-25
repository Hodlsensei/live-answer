/**
 * Everything that shapes *how* an answer reads lives here.
 * Change this file first when answers feel wrong — it is far more
 * effective than changing models.
 */

export const ANSWER_SYSTEM_PROMPT = `You answer spoken questions for a live on-screen display. The person reading you is mid-conversation and can only glance at the screen.

Rules:
- Maximum 3 lines. Each line under 15 words.
- Put the single most useful fact in the first six words.
- No preamble, no "great question", no restating the question.
- No markdown headers, no bold. Plain lines, one idea each.
- If the question is vague or cut off, answer the most likely intent anyway. Never ask for clarification.
- If you do not know, say so in one line and give the closest useful fact.`;

/**
 * Cheap gate that runs before we spend a model call.
 * Speech recognition emits a lot of fragments; most are not questions.
 */
const QUESTION_STARTERS = [
  "what", "why", "how", "when", "where", "who", "which", "can", "could",
  "would", "should", "is", "are", "do", "does", "did", "will", "tell me",
  "explain", "describe", "walk me through", "give me",
];

export function looksLikeQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length < 8) return false;
  if (t.endsWith("?")) return true;
  return QUESTION_STARTERS.some((s) => t.startsWith(s));
}

/**
 * Keeps a short rolling context so follow-ups like
 * "and what about the second one?" still make sense.
 */
export type Turn = { question: string; answer: string };

export function buildMessages(question: string, history: Turn[]) {
  const recent = history.slice(-3);
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const turn of recent) {
    messages.push({ role: "user", content: turn.question });
    messages.push({ role: "assistant", content: turn.answer });
  }
  messages.push({ role: "user", content: question });
  return messages;
}
