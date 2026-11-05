import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cairoTime, sendTelegram } from "@/lib/notify";

const body = z.object({
  phone: z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().min(8).max(15)),
  question: z.string().trim().max(500).optional().default(""),
  session: z.string().regex(/^[a-z0-9]{8,40}$/i),
});

/** "Send me your number": the number goes to the pharmacist's Telegram and is not stored. */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, text: "الرقم مش مظبوط. اكتب مفتاح الدولة والرقم بالأرقام بس." }, { status: 400 });
  const { phone, question, session } = parsed.data;

  const supabase = await createClient();
  const { data: slot } = await supabase.rpc("claim_callback_slot", { p_session: session });
  if (slot === false) return Response.json({ ok: true, text: "وصلتنا طلباتك. الصيدلي هيتواصل معاك." });

  const ok = await sendTelegram(
    `[طلب اتصال] عايز حد يكلمه\n\nالرقم: +${phone}\nواتساب: https://wa.me/${phone}${question ? `\n\nسؤاله: ${question}` : ""}\nالوقت: ${cairoTime()}`,
  );
  if (ok) return Response.json({ ok: true, text: "وصلنا رقمك. الصيدلي هيتواصل معاك." });

  // a number that never arrived doesn't count, or a later try would be told "we got your requests"
  const admin = createAdminClient();
  const { data: last } = await admin.from("callback_requests").select("id").eq("session", session).order("id", { ascending: false }).limit(1).maybeSingle();
  if (last) await admin.from("callback_requests").delete().eq("id", last.id);
  return Response.json({ ok: false, text: "مقدرناش نوصّل رقمك دلوقتي. جرّب تاني، أو كلّم الصيدلي على واتساب." }, { status: 502 });
}
