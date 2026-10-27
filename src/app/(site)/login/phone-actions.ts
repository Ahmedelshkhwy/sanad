"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, normalizePin, phoneEmail, pinPassword } from "@/lib/pin";
import { text, type FormState } from "@/lib/form";

const safeNext = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "/");
  return /^\/[^/\\]/.test(s) || s === "/" ? s : "/";
};

const LOCKED = "دخلت رقم سري غلط كذا مرة. استنى ربع ساعة وجرّب تاني، أو كلّم الصيدلي على واتساب.";

async function signIn(phone: string, pin: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: phoneEmail(phone), password: pinPassword(phone, pin) });
  if (error) {
    await supabase.rpc("pin_failed", { p_phone: phone });
    return false;
  }
  await supabase.rpc("pin_succeeded", { p_phone: phone });
  return true;
}

export async function phoneSignIn(_prev: FormState, form: FormData): Promise<FormState> {
  const phone = normalizePhone(String(form.get("phone") ?? ""), String(form.get("cc") ?? "20"));
  const pin = normalizePin(String(form.get("pin") ?? ""));
  if (!phone) return { status: "error", message: "رقم الموبايل مش مظبوط." };
  if (!pin) return { status: "error", message: "الرقم السري ٥ خانات." };

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("pin_allowed", { p_phone: phone });
  if (allowed === false) return { status: "error", message: LOCKED };

  if (!(await signIn(phone, pin))) return { status: "error", message: "الرقم أو الرقم السري غلط." };
  redirect(safeNext(form.get("next")));
}

export async function phoneSignUp(_prev: FormState, form: FormData): Promise<FormState> {
  const name = text(form.get("name"), 60);
  const phone = normalizePhone(String(form.get("phone") ?? ""), String(form.get("cc") ?? "20"));
  const pin = normalizePin(String(form.get("pin") ?? ""));
  const confirm = normalizePin(String(form.get("pin_confirm") ?? ""));
  if (name.length < 2) return { status: "error", message: "اكتب اسمك." };
  if (!phone) return { status: "error", message: "رقم الموبايل مش مظبوط." };
  if (!pin) return { status: "error", message: "اختار رقم سري من ٥ خانات، أرقام أو حروف." };
  if (pin !== confirm) return { status: "error", message: "الرقم السري والتأكيد مش زي بعض." };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (existing) return { status: "error", message: "الرقم ده عليه حساب. ادخل بيه، ولو نسيت الرقم السري كلّم الصيدلي على واتساب." };

  const { data: created, error } = await admin.auth.admin.createUser({
    email: phoneEmail(phone),
    password: pinPassword(phone, pin),
    email_confirm: true,
    user_metadata: { display_name: name, phone },
  });
  if (error || !created.user) {
    const taken = /already|registered|exists/i.test(error?.message ?? "");
    return { status: "error", message: taken ? "الرقم ده عليه حساب. ادخل بيه بدل ما تسجّل." : "مقدرناش نعمل الحساب. جرّب تاني بعد شوية." };
  }
  await admin.from("profiles").update({ phone, display_name: name }).eq("id", created.user.id);

  if (!(await signIn(phone, pin))) return { status: "error", message: "الحساب اتعمل، بس الدخول ما تمّش. جرّب تدخل برقمك." };
  redirect(safeNext(form.get("next")));
}
