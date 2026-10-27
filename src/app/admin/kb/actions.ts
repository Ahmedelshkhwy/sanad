"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { indexMissingVariants, setVariants } from "@/lib/kb";
import { text, type FormState } from "@/lib/form";

export async function saveEntry(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("/admin/kb");
  const question = text(form.get("question"), 300);
  const answer = text(form.get("answer"), 4000);
  if (question.length < 3 || answer.length < 10) return { status: "error", message: "اكتب السؤال والإجابة." };
  const approved = form.get("approved") === "on";
  const row = {
    question,
    answer,
    source: text(form.get("source"), 200),
    level: form.get("level") === "pharmacist" ? "pharmacist" : "normal",
    approved,
    reviewed_at: approved ? new Date().toISOString() : null,
    notes: text(form.get("notes"), 500),
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  let entryId = id;
  if (entryId) {
    const { error } = await supabase.from("kb_entries").update(row).eq("id", entryId);
    if (error) return { status: "error", message: "مقدرناش نحفظ." };
  } else {
    const { data: last } = await supabase.from("kb_entries").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
    const n = last ? Number(String(last.id).replace(/\D/g, "")) + 1 : 1;
    entryId = `Q${String(n).padStart(3, "0")}`;
    const { error } = await supabase.from("kb_entries").insert({ id: entryId, ...row });
    if (error) return { status: "error", message: "مقدرناش نضيف الإجابة." };
  }
  await setVariants(supabase, entryId, question, String(form.get("alternatives") ?? ""));

  // new phrasings need vectors before the assistant can find them
  let indexNote = "";
  try {
    const r = await indexMissingVariants(supabase, 20_000);
    if (r.remaining) indexNote = ` لسه ${r.remaining} صيغة محتاجة فهرسة، دوس «حدّث الفهرس».`;
  } catch {
    indexNote = " الفهرسة ما خلصتش (غالبًا حد الباقة المجانية). دوس «حدّث الفهرس» بعد دقيقة.";
  }
  revalidatePath("/admin/kb");
  if (!id) redirect(`/admin/kb/${entryId}?saved=1`);
  return { status: "ok", message: `اتحفظ.${indexNote}` };
}

export async function rebuildIndex(_prev: FormState): Promise<FormState> {
  await requireStaff("/admin/kb");
  const supabase = await createClient();
  try {
    const r = await indexMissingVariants(supabase);
    return r.remaining
      ? { status: "ok", message: `اتفهرس ${r.done}، وفاضل ${r.remaining}. دوس تاني بعد دقيقة.` }
      : { status: "ok", message: r.done ? `اتفهرس ${r.done} صيغة. الفهرس كامل.` : "الفهرس كامل." };
  } catch (e) {
    return { status: "error", message: `الفهرسة وقفت: ${(e as Error).message}. جرّب تاني بعد دقيقة.` };
  }
}

export async function deleteEntry(id: string): Promise<void> {
  await requireStaff("/admin/kb");
  const supabase = await createClient();
  await supabase.from("kb_entries").delete().eq("id", id);
  revalidatePath("/admin/kb");
  redirect("/admin/kb");
}
