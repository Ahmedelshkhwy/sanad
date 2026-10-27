"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { setVariants } from "@/lib/kb";

export async function rateLog(id: number, rating: 1 | -1): Promise<void> {
  await requireStaff("/admin/logs");
  const supabase = await createClient();
  await supabase.from("assistant_logs").update({ rating }).eq("id", id);
  revalidatePath("/admin/logs");
}

/** Turns a real question into an unapproved draft so the pharmacist can write the answer. */
export async function draftFromLog(id: number): Promise<void> {
  await requireStaff("/admin/logs");
  const supabase = await createClient();
  const { data: log } = await supabase.from("assistant_logs").select("question, reply, mode").eq("id", id).single();
  if (!log) return;
  const { data: last } = await supabase.from("kb_entries").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
  const n = last ? Number(String(last.id).replace(/\D/g, "")) + 1 : 1;
  const entryId = `Q${String(n).padStart(3, "0")}`;
  const answer = log.mode === "general" || log.mode === "approved" ? log.reply : "";
  await supabase.from("kb_entries").insert({
    id: entryId,
    question: log.question,
    answer: answer || "اكتب الإجابة هنا قبل الاعتماد.",
    approved: false,
    notes: "اتعملت من سؤال حقيقي في سجل المساعد",
  });
  await setVariants(supabase, entryId, log.question, "");
  redirect(`/admin/kb/${entryId}`);
}
