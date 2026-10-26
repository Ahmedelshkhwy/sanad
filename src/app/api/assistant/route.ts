import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { runAssistant, type AssistantEvent, type AssistantResult } from "@/lib/assistant/engine";
import { cairoTime, sendTelegram } from "@/lib/notify";

const body = z.object({
  question: z.string().trim().min(1).max(500),
  session: z.string().regex(/^[a-z0-9]{8,40}$/i),
  followup: z.boolean().optional().default(false),
});

const ALERT_TITLE: Record<string, string> = {
  urgent: "[طارئ] سؤال فيه علامات خطورة",
  handoff: "[محتاج ردّك] سؤال ملوش إجابة مناسبة",
  pharmacist: "[صيدلي] سؤال محتاج تقييمك",
};

/** Streams the reply as newline-delimited JSON events. */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { question, session, followup } = parsed.data;

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("assistant_allowed", { p_session: session });
  if (allowed === false) {
    return Response.json({ error: "limit", text: "وصلت لأقصى عدد أسئلة دلوقتي. جرّب تاني بعد شوية، أو كلّم الصيدلي على واتساب." }, { status: 429 });
  }
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ?? null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: AssistantEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      const gen = runAssistant({ question, followup, userId, supabase });
      let result: AssistantResult | undefined;
      try {
        for (;;) {
          const step = await gen.next();
          if (step.done) {
            result = step.value;
            break;
          }
          send(step.value);
        }
      } catch {
        send({ t: "meta", kind: "handoff", needsPharmacist: true });
        send({ t: "replace", text: "حصلت مشكلة ومقدرتش أرد دلوقتي. جرّب تاني بعد شوية، وفي الطوارئ كلّم 123." });
        send({ t: "done" });
      } finally {
        controller.close();
      }
      if (!result) return;

      await supabase.rpc("log_assistant", {
        p_session: session,
        p_question: question,
        p_mode: result.kind,
        p_ref: result.ref ?? "",
        p_similarity: result.similarity ?? 0,
        p_reply: result.text,
        p_needs_pharmacist: result.needsPharmacist,
        p_reason: result.reason,
      });

      const alertKey = result.kind === "urgent" ? "urgent" : result.kind === "handoff" ? "handoff" : result.needsPharmacist ? "pharmacist" : null;
      if (alertKey) {
        await sendTelegram(
          `${ALERT_TITLE[alertKey]}\n\n${question}${result.reason ? `\n\nالسبب: ${result.reason}` : ""}\nالوقت: ${cairoTime()}${userId ? "\n(مستخدم مسجّل)" : ""}`,
        );
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
