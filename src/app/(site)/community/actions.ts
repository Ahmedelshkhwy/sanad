"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { text, type FormState } from "@/lib/form";

function labelFor(user: CurrentUser, usePseudonym: boolean) {
  if (usePseudonym && user.pseudonym) return user.pseudonym;
  return user.displayName || user.pseudonym || "واحد من أهل البلد";
}

export async function createPost(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/community/new");
  const title = text(form.get("title"), 140);
  const body = text(form.get("body"), 5000);
  if (title.length < 3) return { status: "error", message: "اكتب عنوان أوضح." };
  if (!body) return { status: "error", message: "اكتب اللي عايز تقوله." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, author_label: labelFor(user, form.get("pseudonym") === "on"), title, body })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: "مقدرناش ننشر. جرّب تاني." };
  revalidatePath("/community");
  redirect(`/community/${data.id}`);
}

export async function addComment(postId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(`/community/${postId}`);
  const body = text(form.get("body"), 2000);
  if (!body) return { status: "error", message: "اكتب تعليقك." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: user.id, author_label: labelFor(user, form.get("pseudonym") === "on"), body });
  if (error) return { status: "error", message: "مقدرناش نضيف التعليق." };
  revalidatePath(`/community/${postId}`);
  return { status: "ok" };
}

const REASONS = ["misinformation", "personal_data", "abuse", "other"] as const;

export async function reportContent(_prev: FormState, form: FormData): Promise<FormState> {
  const postId = text(form.get("post_id"), 40) || null;
  const commentId = text(form.get("comment_id"), 40) || null;
  const user = await requireUser(postId ? `/community/${postId}` : "/community");
  const reason = String(form.get("reason"));
  if (!(REASONS as readonly string[]).includes(reason)) return { status: "error", message: "اختار سبب البلاغ." };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    post_id: commentId ? null : postId,
    comment_id: commentId,
    reason,
    details: text(form.get("details"), 500),
  });
  if (error) return { status: "error", message: "مقدرناش نسجّل البلاغ." };
  return { status: "ok", message: "شكرًا، البلاغ وصل وهيتراجع." };
}

export async function deleteOwnPost(postId: string): Promise<void> {
  await requireUser(`/community/${postId}`);
  const supabase = await createClient();
  await supabase.from("posts").delete().eq("id", postId);
  revalidatePath("/community");
  redirect("/community");
}
