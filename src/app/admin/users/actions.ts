"use server";

import { randomInt } from "node:crypto";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { pinPassword } from "@/lib/pin";
import type { FormState } from "@/lib/form";

/** Sets a fresh 5-digit PIN for a phone account and shows it once, for the admin to pass on. */
export async function resetPin(userId: string, _prev: FormState): Promise<FormState> {
  const me = await requireStaff("/admin/users");
  if (me.role !== "admin") return { status: "error", message: "الأدمن بس يقدر يعمل كده." };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("phone").eq("id", userId).single();
  if (!profile?.phone) return { status: "error", message: "الحساب ده مش برقم موبايل." };

  const pin = String(randomInt(0, 100000)).padStart(5, "0");
  const { error } = await admin.auth.admin.updateUserById(userId, { password: pinPassword(profile.phone, pin) });
  if (error) return { status: "error", message: "مقدرناش نغيّر الرقم السري." };
  await admin.rpc("pin_unlock", { p_phone: profile.phone });
  return { status: "ok", message: `الرقم السري الجديد: ${pin} — ابعته لصاحب الحساب، وهو يقدر يغيّره من حسابه.` };
}
