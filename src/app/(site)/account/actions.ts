"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { text, type FormState } from "@/lib/form";

export async function saveAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/account");
  const displayName = text(form.get("display_name"), 60);
  const pseudonym = text(form.get("pseudonym"), 40) || null;
  const area = text(form.get("area"), 80) || null;
  if (!displayName) return { status: "error", message: "اكتب اسمك." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: displayName, pseudonym, area }).eq("id", user.id);
  if (error) return { status: "error", message: "مقدرناش نحفظ. جرّب تاني." };
  revalidatePath("/", "layout");
  return { status: "ok", message: "اتحفظ." };
}
