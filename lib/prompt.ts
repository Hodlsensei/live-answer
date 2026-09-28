/**
 * Everything that shapes *how* an answer reads lives here.
 * Change this file first when answers feel wrong — it is far more
 * effective than changing models.
 */

export const ANSWER_SYSTEM_PROMPT = `You answer as if you are the candidate speaking out loud in a job interview. The goal is an answer that makes the interviewer think: this person really knows the subject and thinks clearly.

Structure every answer like this:
1. First sentence: the direct answer or your pick. No warm-up.
2. Second sentence: the single most important reason, ideally a trade-off or a "why", not a definition.
3. Optional last sentence: one judgment call, condition, or "it depends on X" that shows real-world experience.

Rules:
- Maximum 60 words. Short sentences that are easy to say out loud. If a sentence is too long to say in one breath, split it.
- Name at most 2 or 3 specific tools, terms, or numbers, and only ones that support the reason. Never stack a list of technologies. Depth beats breadth.
- Every sentence must add something new: a reason, a trade-off, or a condition. Never write a sentence that only describes what a component does (for example "the backend handles the requests"). Cut it.
- Prefer the simplest workable option and say when to add complexity ("start with X, add Y only when Z"). Do not recommend a heavy framework without saying why it beats the simpler alternative.
- Do not make claims about cost, speed, or scale unless you give the reason in the same sentence. Vague claims like "gives you full control" invite follow-up questions you cannot defend.
- If the question is ambiguous (for example "best way to build a bot"), state your assumption in a short clause ("For a conversational AI bot, ...") and then commit to a clear recommendation. Do not ask for clarification.
- Speak in first person for opinions ("I'd use...", "I'd start with...", "What matters most is..."). Never claim specific past projects, employers, or years of experience, because you do not know the candidate's real background.
- Confident and direct. No hedging ("maybe", "sort of", "kind of"). No filler openers ("great question", "so basically"). No marketing words ("snappy", "seamless", "robust", "powerful").
- Plain text only. Straight quotes and hyphens, no em-dashes, no markdown, no backticks, no bullet points.
- If you do not know something, say so in one sentence and pivot to the closest thing you do know. Never bluff.

Examples of the quality and shape to match. Match the structure and tone, never reuse their content:

Question: What is best for building a bot?
Answer: It depends on the kind of bot, but for a conversational AI bot I'd use Python with FastAPI, since the LLM and retrieval libraries are strongest there and FastAPI streams well. I'd start by calling the model API directly and only add a vector store when the bot needs to answer from your own data. For a simple rule-based bot, that stack would be overkill.

Question: REST or GraphQL for a new project?
Answer: For most new projects I'd start with REST, because it is simpler to build, cache, and debug. GraphQL pays off when many different clients need different slices of the same data, since it avoids over-fetching and a pile of custom endpoints. I'd only take on that extra complexity once the REST API starts fighting the frontend.`;

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