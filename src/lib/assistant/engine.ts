import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gemini } from "@/lib/ai/gemini";
import type { AiProvider } from "@/lib/ai/provider";
import { buildPrompt, CONTROL_RE, type HealthContext, type KbMatch, type Mode } from "./prompt";
import { findPharmacistHint, findUrgent } from "./risk";

export const HANDOFF_TEXT = "أمورك طيبة؟ كلّم الصيدلي على واتساب، أو ابعت رقمك وهيتواصل معاك.";
export const URGENT_TEXT = "ده ممكن يكون حالة طارئة. متستناش رد هنا: كلّم الإسعاف على 123 أو روح أقرب مستشفى، وخلّي حد يفضل جنبك.";
export const AI_SOURCE = "ردّ من الذكاء الاصطناعي، مش من إجابات الصيدلي";
const EXACT = 0.95;

export type Kind = "approved" | "clarify" | "general" | "handoff" | "urgent";

export type AssistantEvent =
  | { t: "meta"; kind: Kind; source?: string; ref?: string; needsPharmacist: boolean }
  | { t: "delta"; text: string }
  | { t: "replace"; text: string }
  | { t: "done" };

export type AssistantResult = { kind: Kind; text: string; ref: string | null; similarity: number | null; needsPharmacist: boolean; reason: string };

/** Strips markdown the model sometimes adds; the chat shows plain text. */
export function plain(t: string): string {
  return t
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^\s*[*•]\s+/gm, "- ")
    .replace(/([.:؟!،])[ \t]+-[ \t]+/g, "$1\n- ");
}

async function loadHealth(supabase: SupabaseClient, userId: string | null): Promise<HealthContext | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from("health_profiles")
    .select("birth_year, sex, pregnant, chronic_conditions, medications, allergies, share_with_assistant")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.share_with_assistant) return null;
  return {
    age: data.birth_year ? new Date().getFullYear() - data.birth_year : null,
    sex: data.sex,
    pregnant: data.pregnant,
    conditions: data.chronic_conditions ?? [],
    medications: data.medications ?? [],
    allergies: data.allergies ?? [],
  };
}

async function findMatches(ai: AiProvider, supabase: SupabaseClient, question: string): Promise<KbMatch[]> {
  const [vector] = await ai.embed([question]);
  const { data, error } = await supabase.rpc("match_kb", { query_embedding: JSON.stringify(vector), match_count: 3 });
  if (error) throw new Error(error.message);
  return (data ?? []) as KbMatch[];
}

/**
 * Answers one question as a stream of events, then resolves with what happened (for the log).
 * Order: emergency words → nearest approved answers → one streamed model call that picks the mode.
 */
export async function* runAssistant(input: {
  question: string;
  followup: boolean;
  userId: string | null;
  supabase: SupabaseClient;
  ai?: AiProvider;
  allowGeneral?: boolean;
}): AsyncGenerator<AssistantEvent, AssistantResult> {
  const ai = input.ai ?? gemini;
  const { question, supabase } = input;
  const allowGeneral = input.allowGeneral ?? process.env.AI_FREE_ANSWER !== "false";

  const urgent = findUrgent(question);
  if (urgent) {
    yield { t: "meta", kind: "urgent", needsPharmacist: true };
    yield { t: "replace", text: URGENT_TEXT };
    yield { t: "done" };
    return { kind: "urgent", text: URGENT_TEXT, ref: null, similarity: null, needsPharmacist: true, reason: `كلمة خطورة: ${urgent}` };
  }

  const notes: string[] = [];
  let refs: KbMatch[] = [];
  try {
    refs = (await findMatches(ai, supabase, question)).filter((r) => r.similarity >= 0.6);
  } catch (e) {
    notes.push(`البحث فشل: ${(e as Error).message}`);
  }
  const health = await loadHealth(supabase, input.userId).catch(() => null);
  const prompt = buildPrompt({
    question,
    refs,
    health,
    allowClarify: !input.followup,
    allowGeneral,
    hint: findPharmacistHint(question),
  });

  let buffer = "";
  let mode: Mode | null = null;
  let ref: KbMatch | null = null;
  let needsPharmacist = false;
  let sent = "";

  try {
    for await (const chunk of ai.stream(prompt)) {
      if (mode === null) {
        buffer += chunk;
        const m = buffer.match(CONTROL_RE);
        if (!m) {
          if (buffer.length < 160) continue;
          mode = allowGeneral ? "general" : "pharmacist"; // the model skipped the control line
        } else {
          mode = m[1] as Mode;
          const n = Number(m[2]);
          needsPharmacist = m[3] === "yes";
          buffer = buffer.slice(m[0].length);
          if (mode === "approved") {
            ref = refs[n - 1] ?? null;
            if (!ref) mode = allowGeneral ? "general" : "pharmacist";
          }
          if (mode === "clarify" && input.followup) mode = allowGeneral ? "general" : "pharmacist";
          if (mode === "general" && !allowGeneral) mode = "pharmacist";
        }
        if (mode === "pharmacist") break;
        const kind: Kind = mode;
        yield {
          t: "meta",
          kind,
          needsPharmacist,
          ref: ref?.id,
          source: kind === "approved" ? ref?.source || "إجابة معتمدة من صيدلي" : kind === "general" ? AI_SOURCE : undefined,
        };
        if (buffer) {
          const text = plain(buffer);
          sent += text;
          yield { t: "delta", text };
        }
        continue;
      }
      const text = plain(chunk);
      sent += text;
      yield { t: "delta", text };
    }
  } catch (e) {
    notes.push(`الموديل فشل: ${(e as Error).message}`);
  }

  // model failed before writing anything useful
  if (mode === null || (mode !== "pharmacist" && !sent.trim())) {
    const best = refs[0];
    if (best && best.similarity >= EXACT) {
      yield { t: "meta", kind: "approved", needsPharmacist: false, ref: best.id, source: best.source };
      yield { t: "replace", text: best.answer };
      yield { t: "done" };
      return { kind: "approved", text: best.answer, ref: best.id, similarity: best.similarity, needsPharmacist: false, reason: notes.join(" | ") };
    }
    mode = "pharmacist";
  }

  if (mode === "pharmacist") {
    yield { t: "meta", kind: "handoff", needsPharmacist: true };
    yield { t: "replace", text: HANDOFF_TEXT };
    yield { t: "done" };
    return {
      kind: "handoff",
      text: HANDOFF_TEXT,
      ref: refs[0]?.id ?? null,
      similarity: refs[0]?.similarity ?? null,
      needsPharmacist: true,
      reason: ["مفيش إجابة مناسبة", ...notes].join(" | "),
    };
  }

  yield { t: "done" };
  return {
    kind: mode,
    text: sent.trim(),
    ref: ref?.id ?? null,
    similarity: ref?.similarity ?? refs[0]?.similarity ?? null,
    needsPharmacist,
    reason: notes.join(" | "),
  };
}
