import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gemini } from "@/lib/ai/gemini";

/**
 * Embeds every variant that has no vector yet, in small batches (the free tier caps
 * texts per minute). Runs as the signed-in staff member, so RLS applies.
 */
export async function indexMissingVariants(supabase: SupabaseClient, budgetMs = 50_000) {
  const started = Date.now();
  let done = 0;
  for (;;) {
    const { data: rows, error } = await supabase.from("kb_variants").select("id, text").is("embedding", null).limit(20);
    if (error) throw new Error(error.message);
    if (!rows?.length) return { done, remaining: 0 };
    const vectors = await gemini.embed(rows.map((r) => r.text));
    for (let i = 0; i < rows.length; i++) {
      const { error: e } = await supabase.from("kb_variants").update({ embedding: JSON.stringify(vectors[i]) }).eq("id", rows[i].id);
      if (e) throw new Error(e.message);
    }
    done += rows.length;
    if (Date.now() - started > budgetMs) {
      const { count } = await supabase.from("kb_variants").select("id", { count: "exact", head: true }).is("embedding", null);
      return { done, remaining: count ?? 0 };
    }
  }
}

/** Replaces an entry's phrasings: the question itself plus each alternative, one per line or ؛. */
export async function setVariants(supabase: SupabaseClient, entryId: string, question: string, alternatives: string) {
  const texts = Array.from(
    new Set([question, ...alternatives.split(/[\n؛;]+/)].map((s) => s.trim()).filter(Boolean)),
  ).slice(0, 15);
  const { data: existing } = await supabase.from("kb_variants").select("id, text").eq("entry_id", entryId);
  const keep = new Set(texts);
  const stale = (existing ?? []).filter((v) => !keep.has(v.text)).map((v) => v.id);
  if (stale.length) await supabase.from("kb_variants").delete().in("id", stale);
  const have = new Set((existing ?? []).map((v) => v.text));
  const fresh = texts.filter((t) => !have.has(t)).map((text) => ({ entry_id: entryId, text }));
  if (fresh.length) await supabase.from("kb_variants").insert(fresh);
}
