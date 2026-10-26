"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { toList, type FormState } from "@/lib/form";

export async function saveHealthProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/profile");
  const year = Number(form.get("birth_year"));
  const sex = form.get("sex");
  const now = new Date().getFullYear();

  const row = {
    birth_year: Number.isInteger(year) && year >= 1900 && year <= now ? year : null,
    sex: sex === "male" || sex === "female" ? sex : null,
    pregnant: sex === "female" && form.get("pregnant") === "on",
    chronic_conditions: toList(form.get("chronic_conditions")),
    medications: toList(form.get("medications")),
    allergies: toList(form.get("allergies")),
    share_with_assistant: form.get("share_with_assistant") === "on",
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("health_profiles").update(row).eq("user_id", user.id);
  if (error) return { status: "error", message: "مقدرناش نحفظ. جرّب تاني." };
  revalidatePath("/profile");
  return { status: "ok", message: "اتحفظ ملفك." };
}

export async function clearHealthProfile(): Promise<void> {
  const user = await requireUser("/profile");
  const supabase = await createClient();
  await supabase
    .from("health_profiles")
    .update({
      birth_year: null,
      sex: null,
      pregnant: false,
      chronic_conditions: [],
      medications: [],
      allergies: [],
      share_with_assistant: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  revalidatePath("/profile");
}
