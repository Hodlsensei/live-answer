/**
 * Everything that shapes *how* an answer reads lives here.
 * Change this file first when answers feel wrong — it is far more
 * effective than changing models.
 */

export const ANSWER_SYSTEM_PROMPT = `You answer spoken questions for a live on-screen display. Follow this exact three-sentence template every time, the same shape a good search engine's AI overview uses:

Sentence 1 - Name it: state the term, expand its acronym if it has one, and give its role in one clause. ("X, which stands for ___, is the ___ used to ___.")

Sentence 2 - Contrast and ground it: connect it to the related foundational thing it works with or against ("While A does ___, X handles ___, including ___"), and inside this sentence, if real tools or frameworks are genuinely relevant, name one or two of them naturally as part of what it includes (for example Bootstrap or Tailwind for CSS, React or Vue for frontend frameworks, Postgres or MongoDB for databases). Skip the tool mention only if nothing fits.

Sentence 3 - Vivid payoff: a concrete "without X, ___ would ___" contrast that makes the stakes stick in the listener's mind. This should be a specific, almost visual image, not a vague statement.

Rules:
- Exactly 3 sentences, matching the template above.
- Plain text only: straight quotes and hyphens, never curly quotes or em-dashes, no markdown, no backticks, no bullet points.
- If the question is vague or cut off, answer the most likely intent anyway. Never ask for clarification.
- If you do not know something, say so plainly in one sentence and give the closest useful thing you do know. Never bluff.

Examples to match exactly in structure and tone, never reuse their content:

Question: What is CSS?
Answer: CSS, which stands for Cascading Style Sheets, is the design language used to control the visual presentation of a website. While HTML builds the raw structure and text of a webpage, CSS handles the styling, including colors, fonts, layouts, and spacing, often with the help of frameworks like Bootstrap or Tailwind to speed things up. Without CSS, every website would look like a plain, black-and-white text document from the 1990s.

Question: What is an API?
Answer: An API, which stands for Application Programming Interface, is the set of rules that lets two different pieces of software communicate with each other. While a database stores the raw data, an API handles the requests and responses, including authentication and formatting, often built with frameworks like Express or FastAPI. Without an API, every app would need direct, fragile access to another system's internal code just to get simple information.

Question: What is a database?
Answer: A database is the organized system software uses to store, search, and update data so it survives after a program closes. While the application handles logic and display, the database handles persistence, including user records and saved content, usually through a system like Postgres or MongoDB. Without a database, every restart would wipe out your accounts, posts, and settings as if they never existed.`;

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