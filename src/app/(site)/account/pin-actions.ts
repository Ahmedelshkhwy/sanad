"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizePin, phoneEmail, pinPassword } from "@/lib/pin";
import type { FormState } from "@/lib/form";

export async function changePin(_prev: FormState, form: FormData): Promise<FormState> {
  await requireUser("/account");
  const current = normalizePin(String(form.get("current") ?? ""));
  const next = normalizePin(String(form.get("pin") ?? ""));
  const confirm = normalizePin(String(form.get("pin_confirm") ?? ""));
  if (!current || !next) return { status: "error", message: "الرقم السري ٥ خانات." };
  if (next !== confirm) return { status: "error", message: "الرقم الجديد والتأكيد مش زي بعض." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: profile } = await supabase.from("profiles").select("phone").eq("id", claims?.claims?.sub ?? "").single();
  if (!profile?.phone) return { status: "error", message: "حسابك مش برقم موبايل." };

  const { data: allowed } = await supabase.rpc("pin_allowed", { p_phone: profile.phone });
  if (allowed === false) return { status: "error", message: "محاولات كتير غلط. استنى ربع ساعة." };

  // confirm the current PIN before replacing it
  const { error: wrong } = await supabase.auth.signInWithPassword({ email: phoneEmail(profile.phone), password: pinPassword(profile.phone, current) });
  if (wrong) {
    await supabase.rpc("pin_failed", { p_phone: profile.phone });
    return { status: "error", message: "الرقم السري الحالي غلط." };
  }
  const { error } = await supabase.auth.updateUser({ password: pinPassword(profile.phone, next) });
  if (error) return { status: "error", message: "مقدرناش نغيّر الرقم السري." };
  return { status: "ok", message: "اتغيّر الرقم السري." };
}
