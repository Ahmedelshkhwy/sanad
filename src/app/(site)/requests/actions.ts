"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { text, type FormState } from "@/lib/form";
import { cairoTime, sendTelegram } from "@/lib/notify";
import { dbError } from "@/lib/errors";
import { getRegions, regionOptions } from "@/lib/regions";

export async function createRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/requests/new");
  const medicine = text(form.get("medicine_name"), 120);
  const strength = text(form.get("strength"), 60) || null;
  const regionId = String(form.get("region_id") ?? "");
  const area = (regionOptions(await getRegions()).find((r) => r.id === regionId)?.label ?? "").slice(0, 80);
  const details = text(form.get("details"), 1000);
  const phoneRaw = text(form.get("contact_phone"), 20).replace(/\D/g, "").replace(/^0+/, "");
  const phone = phoneRaw ? `+20${phoneRaw}`.replace(/^\+2020/, "+20") : null;

  if (medicine.length < 2) return { status: "error", message: "اكتب اسم الدوا أو المادة الفعالة." };
  if (area.length < 2) return { status: "error", message: "اختار منطقتك." };
  if (phone && !/^\+[0-9]{8,15}$/.test(phone)) return { status: "error", message: "رقم الموبايل مش مظبوط." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("help_requests")
    .insert({ user_id: user.id, kind: "medicine", medicine_name: medicine, strength, area, region_id: regionId, details, contact_phone: phone })
    .select("id")
    .single();
  if (error || !data) return dbError(error, "مقدرناش نسجّل الطلب. جرّب تاني.");

  await sendTelegram(
    `[طلب دوا جديد]\n\n${medicine}${strength ? ` ${strength}` : ""}\nالمنطقة: ${area}${details ? `\nتفاصيل: ${details}` : ""}${phone ? `\nموبايل: ${phone}` : ""}\nالوقت: ${cairoTime()}`,
  );
  redirect(`/requests/${data.id}`);
}

/** The owner closes their own request: found it ("completed") or no longer needs it ("cancelled"). */
export async function closeRequest(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireUser(`/requests/${requestId}`);
  const status = form.get("status") === "completed" ? "completed" : "cancelled";
  const supabase = await createClient();
  const { error } = await supabase.rpc("finish_request", { p_request: requestId, p_status: status, p_note: status === "completed" ? "صاحب الطلب لقى الدوا." : "صاحب الطلب لغاه." });
  if (error) return dbError(error, "مقدرناش نقفل الطلب.");
  revalidatePath(`/requests/${requestId}`);
  return { status: "ok" };
}
