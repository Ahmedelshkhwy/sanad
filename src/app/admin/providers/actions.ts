"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { dbError } from "@/lib/errors";
import { normalizePhone } from "@/lib/pin";
import { text, type FormState } from "@/lib/form";
import { KIND } from "@/lib/providers";
import { getRegions } from "@/lib/regions";

const UUID = /^[0-9a-f-]{36}$/;
const regionsOf = (form: FormData) => form.getAll("regions").map(String).filter((id) => UUID.test(id));

function done(message: string): FormState {
  updateTag("pharmacies");
  revalidatePath("/admin/providers");
  return { status: "ok", message };
}

/** Staff add a provider directly; it starts verified since staff checked it themselves. */
export async function addProvider(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("/admin/providers");
  const name = text(form.get("name"), 120);
  if (name.length < 2) return { status: "error", message: "اكتب الاسم." };
  const kind = String(form.get("kind"));
  const region = String(form.get("region_id") ?? "");
  const whatsapp = normalizePhone(text(form.get("whatsapp"), 20)) ?? "";
  const area = (await getRegions()).find((r) => r.id === region)?.name ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("providers")
    .insert({
      name,
      kind: kind in KIND ? kind : "pharmacy",
      area,
      region_id: UUID.test(region) ? region : null,
      phone: text(form.get("phone"), 20) || null,
      whatsapp: whatsapp || null,
      address: text(form.get("address"), 200),
      status: "verified",
      verified_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) return dbError(error, "مقدرناش نضيفها. راجع رقم الواتساب.");
  if (UUID.test(region)) await supabase.rpc("update_provider", { p_provider: data.id, p_address: text(form.get("address"), 200), p_phone: text(form.get("phone"), 20), p_whatsapp: whatsapp, p_regions: [region] });
  return done("اتضافت.");
}

export async function setProviderStatus(providerId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("/admin/providers");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_provider_status", { p_provider: providerId, p_status: String(form.get("status")), p_note: text(form.get("note"), 300) });
  if (error) return dbError(error, "مقدرناش نغيّر الحالة.");
  return done("اتغيّرت، وأعضاء الصيدلية وصلهم إشعار.");
}

export async function toggleProvider(providerId: string, active: boolean) {
  await requireStaff("/admin/providers");
  const supabase = await createClient();
  await supabase.from("providers").update({ active }).eq("id", providerId);
  done("");
}

export async function saveProvider(providerId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("/admin/providers");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_provider", {
    p_provider: providerId,
    p_address: text(form.get("address"), 200),
    p_phone: text(form.get("phone"), 20),
    p_whatsapp: normalizePhone(text(form.get("whatsapp"), 20)) ?? "",
    p_regions: regionsOf(form),
  });
  if (error) return dbError(error, "مقدرناش نحفظ. راجع رقم الواتساب.");
  return done("اتحفظ.");
}

export async function addMember(providerId: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("/admin/providers");
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_provider_member", {
    p_provider: providerId,
    p_phone: normalizePhone(text(form.get("phone"), 20)) ?? "",
    p_role: form.get("role") === "staff" ? "staff" : "owner",
  });
  if (error) return dbError(error, "مقدرناش نضيفه.");
  return done("اتضاف، ووصله إشعار.");
}
