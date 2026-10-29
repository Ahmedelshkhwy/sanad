"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { dbError } from "@/lib/errors";
import { text, type FormState } from "@/lib/form";

const UUID = /^[0-9a-f-]{36}$/;

/** Approve (with the note pharmacies will see) or reject a new request. */
export async function reviewRequest(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("/admin/requests");
  const decision = String(form.get("decision"));
  const region = String(form.get("region_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_request", {
    p_request: requestId,
    p_decision: decision,
    p_note: text(form.get("note"), 1000),
    p_public_note: text(form.get("public_note"), 500),
    p_region: UUID.test(region) ? region : null,
  });
  if (error) return dbError(error, "مقدرناش نحدّث الطلب.");
  revalidatePath("/admin/requests");
  return { status: "ok", message: decision === "approve" ? "اتوافق عليه. انشره للصيدليات." : "اترفض، والمستخدم وصله إشعار." };
}

/** Sends the request to the pharmacies covering its region, or to the ones picked. */
export async function publishRequest(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("/admin/requests");
  const picked = form.getAll("providers").map(String).filter((id) => UUID.test(id));
  const days = Number(form.get("days")) || 3;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publish_request", {
    p_request: requestId,
    p_providers: picked.length ? picked : null,
    p_days: days,
  });
  if (error) return dbError(error, "مقدرناش ننشر الطلب.");
  revalidatePath("/admin/requests");
  return { status: "ok", message: data ? `اتبعت لـ ${data} صيدلية.` : "كل الصيدليات دي وصلها الطلب قبل كده." };
}

export async function finishRequest(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("/admin/requests");
  const status = String(form.get("status"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("finish_request", { p_request: requestId, p_status: status, p_note: text(form.get("note"), 1000) });
  if (error) return dbError(error, "مقدرناش نقفل الطلب.");
  revalidatePath("/admin/requests");
  return { status: "ok", message: "اتقفل، والمستخدم وصله إشعار." };
}
