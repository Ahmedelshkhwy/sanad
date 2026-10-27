import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "البلاغات" };

const REASON: Record<string, string> = {
  misinformation: "معلومة غلط أو مضللة",
  personal_data: "بيانات شخصية",
  abuse: "إساءة",
  other: "حاجة تانية",
};

async function resolve(id: number, hide: boolean, postId: string | null, commentId: string | null) {
  "use server";
  await requireStaff("/admin/reports");
  const supabase = await createClient();
  if (hide) {
    if (commentId) await supabase.from("comments").update({ status: "hidden" }).eq("id", commentId);
    else if (postId) await supabase.from("posts").update({ status: "hidden" }).eq("id", postId);
  }
  await supabase.from("reports").update({ status: hide ? "resolved" : "dismissed" }).eq("id", id);
  revalidatePath("/admin/reports");
}

async function Reports() {
  await requireStaff("/admin/reports");
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, reason, details, created_at, post_id, comment_id, posts(title, body), comments(body, post_id)")
    .eq("status", "open")
    .order("created_at");

  if (!data?.length) return <p className="text-muted">مفيش بلاغات مفتوحة.</p>;
  return (
    <ul className="grid gap-3">
      {data.map((r) => {
        const post = r.posts as unknown as { title: string; body: string } | null;
        const comment = r.comments as unknown as { body: string; post_id: string } | null;
        const postId = r.post_id ?? comment?.post_id ?? null;
        return (
          <li key={r.id} className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap gap-2 text-xs text-muted">
              <span className="rounded-full bg-sun-soft px-2 py-0.5 text-ink">{REASON[r.reason] ?? r.reason}</span>
              <span>{comment ? "تعليق" : "منشور"}</span>
              <span>{formatDate(r.created_at)}</span>
            </div>
            <p className="whitespace-pre-line">{comment?.body ?? (post ? `${post.title}\n${post.body}` : "المحتوى اتمسح")}</p>
            {r.details && <p className="text-sm text-muted">{r.details}</p>}
            <div className="flex flex-wrap gap-2 text-sm">
              <form action={resolve.bind(null, r.id, true, r.post_id, r.comment_id)}>
                <button className="rounded-full bg-urgent px-3 py-1 text-white">اخفي المحتوى</button>
              </form>
              <form action={resolve.bind(null, r.id, false, null, null)}>
                <button className="rounded-full border border-line px-3 py-1">البلاغ مش في محله</button>
              </form>
              {postId && (
                <Link href={`/community/${postId}`} className="rounded-full border border-line px-3 py-1">
                  افتح المنشور
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function ReportsPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">البلاغات</h1>
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <Reports />
      </Suspense>
    </div>
  );
}
