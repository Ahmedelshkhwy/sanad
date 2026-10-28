"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { isStatus } from "@/lib/requests";
import { text, type FormState } from "@/lib/form";

/** Adds a timeline entry; a database trigger moves the request and notifies its owner. */
export async function updateRequest(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff("/admin/requests");
  const status = String(form.get("status"));
  if (!isStatus(status) || status === "new") return { status: "error", message: "اختار حالة." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("request_updates")
    .insert({ request_id: requestId, author_id: staff.id, status, note: text(form.get("note"), 1000) });
  if (error) return { status: "error", message: "مقدرناش نحدّث الطلب." };
  revalidatePath("/admin/requests");
  return { status: "ok", message: "اتحدّث، والمستخدم وصله إشعار." };
}

/** Forwards a request to a partner pharmacy and tells its owner where it went. */
export async function forwardRequest(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const staff = await requireStaff("/admin/requests");
  const partnerId = String(form.get("partner_id") ?? "");
  const supabase = await createClient();
  const { data: partner } = await supabase.from("partners").select("id, name").eq("id", partnerId).eq("active", true).maybeSingle();
  if (!partner) return { status: "error", message: "اختار صيدلية." };
  const { error } = await supabase.from("help_requests").update({ partner_id: partner.id }).eq("id", requestId);
  if (error) return { status: "error", message: "مقدرناش نحوّل الطلب." };
  await supabase
    .from("request_updates")
    .insert({ request_id: requestId, author_id: staff.id, status: "searching", note: `طلبك اتحوّل لصيدلية ${partner.name}.` });
  revalidatePath("/admin/requests");
  return { status: "ok", message: `اتحوّل لـ ${partner.name}.` };
}
