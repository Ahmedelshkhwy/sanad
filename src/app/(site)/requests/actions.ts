"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { text, type FormState } from "@/lib/form";
import { cairoTime, sendTelegram } from "@/lib/notify";

export async function createRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/requests/new");
  const medicine = text(form.get("medicine_name"), 120);
  const strength = text(form.get("strength"), 60) || null;
  const area = text(form.get("area"), 80);
  const details = text(form.get("details"), 1000);
  const phoneRaw = text(form.get("contact_phone"), 20).replace(/\D/g, "").replace(/^0+/, "");
  const phone = phoneRaw ? `+20${phoneRaw}`.replace(/^\+2020/, "+20") : null;

  if (medicine.length < 2) return { status: "error", message: "اكتب اسم الدوا أو المادة الفعالة." };
  if (area.length < 2) return { status: "error", message: "اكتب القرية أو المدينة." };
  if (phone && !/^\+[0-9]{8,15}$/.test(phone)) return { status: "error", message: "رقم الموبايل مش مظبوط." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("help_requests")
    .insert({ user_id: user.id, kind: "medicine", medicine_name: medicine, strength, area, details, contact_phone: phone })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: "مقدرناش نسجّل الطلب. جرّب تاني." };

  await sendTelegram(
    `[طلب دوا جديد]\n\n${medicine}${strength ? ` ${strength}` : ""}\nالمنطقة: ${area}${details ? `\nتفاصيل: ${details}` : ""}${phone ? `\nموبايل: ${phone}` : ""}\nالوقت: ${cairoTime()}`,
  );
  redirect(`/requests/${data.id}`);
}
