import "server-only";
import { AiUnavailableError, type AiProvider } from "./provider";

const API = "https://generativelanguage.googleapis.com/v1beta";
export const EMBED_DIMS = 768;

function key() {
  const k = process.env.GEMINI_API_KEY?.trim();
  if (!k) throw new AiUnavailableError("GEMINI_API_KEY is not set");
  return k;
}

function chatModels() {
  return (process.env.GEMINI_CHAT_MODELS || "gemini-3.1-flash-lite,gemini-3.5-flash")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

async function* readSse(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      try {
        const json = JSON.parse(line.slice(5));
        const parts = json?.candidates?.[0]?.content?.parts ?? [];
        const text = parts.map((p: { text?: string }) => p.text ?? "").join("");
        if (text) yield text;
      } catch {
        /* keep-alive or partial line */
      }
    }
  }
}

export const gemini: AiProvider = {
  name: "gemini",

  async embed(texts) {
    const model = `models/${process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001"}`;
    const res = await fetch(`${API}/${model}:batchEmbedContents`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key() },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model,
          content: { parts: [{ text }] },
          taskType: "SEMANTIC_SIMILARITY",
          outputDimensionality: EMBED_DIMS,
        })),
      }),
    });
    if (!res.ok) throw new AiUnavailableError(`embed ${res.status}`);
    const json = (await res.json()) as { embeddings: { values: number[] }[] };
    return json.embeddings.map((e) => e.values);
  },

  async *stream(prompt, options = {}) {
    const body = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens ?? 2048,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    let lastError = "no model configured";
    for (const model of chatModels()) {
      const res = await fetch(`${API}/models/${model}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key() },
        body,
        signal: AbortSignal.timeout(30_000),
      }).catch((e: Error) => ({ ok: false, status: 0, body: null, statusText: e.message }) as const);
      if (res.ok && res.body) {
        yield* readSse(res.body);
        return;
      }
      // 503 (busy) and 429 (quota) are common on the free tier: try the next model
      lastError = `${model} ${res.status}`;
    }
    throw new AiUnavailableError(lastError);
  },
};
