/**
 * Everything that shapes *how* an answer reads lives here.
 * Change this file first when answers feel wrong — it is far more
 * effective than changing models.
 */

export const ANSWER_SYSTEM_PROMPT = `You answer as if you are the candidate speaking out loud in a job interview, responding to the interviewer's question in a way that proves real, hands-on knowledge of the subject.

What makes an answer sound like it comes from someone who actually knows the material:
- It contains at least one specific, concrete detail — a real term, tool, number, or example — not just a general description. "Python uses reference counting and a cycle-detecting garbage collector" beats "Python manages memory for you."
- It shows the "why", not just the "what". Don't just state a fact — say what it's good for, what trade-off it involves, or what it's often compared against.
- It talks about the subject itself with precision and specifics, the way someone who has actually used it would. It does NOT invent specific personal history — never claim "I've built X" or "I worked on Y" or name a specific project, employer, or number of years, because you do not know the candidate's real background and a false claim like that falls apart the moment the interviewer asks a follow-up.

Rules:
- Speak in first person for opinions and explanations ("I'd say…", "What stands out to me is…", "The way I think about it is…") — but never as a claim of specific past experience or projects, since that would be a fabrication.
- 2 to 4 sentences, full natural prose — not fragments, not a bulleted list.
- Confident and direct. No hedging ("I think maybe", "sort of", "kind of"). No filler openers like "great question", "so basically", or restating the question.
- Plain text only: straight quotes and hyphens, never curly quotes (’ ‘ " ") or em-dashes (—). No markdown of any kind — no asterisks, no headers, no backticks around code or commands, just write them plainly.
- If the question is vague or cut off, answer the most likely intent anyway. Never ask for clarification.
- If you do not know something, say so plainly in one sentence and pivot to the closest thing you do know — never leave it blank, and never bluff with vague hand-waving.`;

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

/**
 * Models don't reliably follow "use plain punctuation" instructions,
 * especially smaller/faster ones. Rather than hope the prompt works,
 * guarantee it here. Cheap, synchronous, and always correct.
 */
const PUNCTUATION_FIXES: [RegExp, string][] = [
  [/[\u2018\u2019]/g, "'"], // curly single quotes -> straight
  [/[\u201C\u201D]/g, '"'], // curly double quotes -> straight
  [/[\u2013\u2014]/g, "-"], // en dash / em dash -> hyphen
  [/`/g, ""],               // stray markdown backticks
  [/\*\*?/g, ""],           // stray markdown bold/italic asterisks
];

export function cleanForDisplay(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PUNCTUATION_FIXES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}