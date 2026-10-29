"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { dbError } from "@/lib/errors";
import { normalizePhone } from "@/lib/pin";
import { text, type FormState } from "@/lib/form";
import { cairoTime, sendTelegram } from "@/lib/notify";

const UUID = /^[0-9a-f-]{36}$/;

export async function applyProvider(_prev: FormState, form: FormData): Promise<FormState> {
  await requireUser("/portal");
  const name = text(form.get("name"), 120);
  const region = String(form.get("region_id") ?? "");
  const phone = text(form.get("phone"), 20);
  if (name.length < 2) return { status: "error", message: "اكتب اسم الصيدلية." };
  if (!UUID.test(region)) return { status: "error", message: "اختار المنطقة." };
  if (phone.replace(/\D/g, "").length < 8) return { status: "error", message: "اكتب رقم تليفون الصيدلية." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_provider", {
    p_name: name,
    p_region: region,
    p_address: text(form.get("address"), 200),
    p_phone: phone,
    p_whatsapp: normalizePhone(text(form.get("whatsapp"), 20)) ?? "",
    p_license: text(form.get("license_no"), 60),
  });
  if (error) return dbError(error, "مقدرناش نسجّل الطلب. راجع رقم الواتساب.");
  await sendTelegram(`[صيدلية عاوزة تنضم]\n\n${name}\nالوقت: ${cairoTime()}`);
  revalidatePath("/portal");
  return { status: "ok", message: "وصلنا طلبك." };
}

/** A pharmacy says whether it has the medicine; it can change its answer while the request is open. */
export async function respond(requestId: string, providerId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireUser("/portal");
  const response = String(form.get("response"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_request", {
    p_request: requestId,
    p_provider: providerId,
    p_response: response,
    p_note: text(form.get("note"), 300),
  });
  if (error) return dbError(error, "مقدرناش نسجّل ردك.");
  revalidatePath("/portal");
  return { status: "ok", message: response === "available" ? "اتسجّل إنه متوفر، وصاحب الطلب هيوصله بياناتكم." : "اتسجّل إنه مش متوفر." };
}

export async function saveMyProvider(providerId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireUser("/portal");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_provider", {
    p_provider: providerId,
    p_address: text(form.get("address"), 200),
    p_phone: text(form.get("phone"), 20),
    p_whatsapp: normalizePhone(text(form.get("whatsapp"), 20)) ?? "",
    p_regions: form.getAll("regions").map(String).filter((id) => UUID.test(id)),
  });
  if (error) return dbError(error, "مقدرناش نحفظ. راجع رقم الواتساب.");
  revalidatePath("/portal");
  return { status: "ok", message: "اتحفظ." };
}
