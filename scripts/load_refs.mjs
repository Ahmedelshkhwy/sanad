// Loads cleaned consultations (JSONL from shifaa_prep.py) into public.ref_consultations
// with their embeddings. Safe to re-run: rows that already have a vector are skipped.
//
// usage: node --env-file=.env.local scripts/load_refs.mjs .seed/shifaa/clean.jsonl [dataset]
import { readFileSync } from "node:fs";

const [file, dataset = "shifaa"] = process.argv.slice(2);
const BATCH = 100;
const API = "https://generativelanguage.googleapis.com/v1beta";
const model = `models/${process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001"}`;
// plain PostgREST calls with the service-role key (works on any Node version)
const REST = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/ref_consultations`;
const auth = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function embed(texts) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}/${model}:batchEmbedContents`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY.trim() },
      body: JSON.stringify({
        requests: texts.map((text) => ({ model, content: { parts: [{ text }] }, taskType: "SEMANTIC_SIMILARITY", outputDimensionality: 768 })),
      }),
    });
    if (res.ok) return (await res.json()).embeddings.map((e) => e.values);
    if ((res.status === 429 || res.status >= 500) && attempt < 30) {
      const quota = ((await res.json().catch(() => ({})))?.error?.details ?? []).flatMap((d) => d.violations ?? []).map((v) => v.quotaId);
      console.log(`embed ${res.status} ${quota.join(",")}, waiting a minute (attempt ${attempt})`);
      await sleep(60_000);
      continue;
    }
    throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

async function embeddedIds() {
  const ids = new Set();
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${REST}?select=id&embedding=not.is.null&order=id&offset=${from}&limit=1000`, { headers: auth });
    if (!res.ok) throw new Error(`read ${res.status}: ${await res.text()}`);
    const data = await res.json();
    data.forEach((r) => ids.add(r.id));
    if (data.length < 1000) return ids;
  }
}

const rows = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const done = await embeddedIds();
const todo = rows.filter((r) => !done.has(r.id));
console.log(`${rows.length} rows, ${done.size} already loaded, ${todo.length} to go`);

for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  const vectors = await embed(batch.map((r) => `${r.title}\n${r.question.slice(0, 700)}`));
  const res = await fetch(REST, {
    method: "POST",
    headers: { ...auth, "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(batch.map((r, j) => ({ ...r, dataset, embedding: JSON.stringify(vectors[j]) }))),
  });
  if (!res.ok) throw new Error(`write ${res.status}: ${(await res.text()).slice(0, 200)}`);
  console.log(`${Math.min(i + BATCH, todo.length)}/${todo.length}`);
  // the free tier allows about 100 texts a minute, shared with the live assistant
  await sleep(65_000);
}
console.log("done");
