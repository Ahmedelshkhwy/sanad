import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteOwnPost } from "../actions";
import { CommentForm, ReportButton } from "./Interactions";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "منشور" };

async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [user, { data: post }, { data: comments }] = await Promise.all([
    getCurrentUser(),
    supabase.from("posts").select("id, author_id, author_label, title, body, created_at, status").eq("id", id).maybeSingle(),
    supabase.from("comments").select("id, author_label, body, created_at").eq("post_id", id).eq("status", "published").order("created_at"),
  ]);
  if (!post) notFound();
  const mine = user?.id === post.author_id;

  return (
    <article className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-[clamp(1.6rem,4vw,2.2rem)] font-bold">{post.title}</h1>
        <p className="text-sm text-muted">
          {post.author_label} · <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        </p>
        {post.status === "hidden" && <p className="rounded-lg bg-sun-soft px-3 py-2 text-sm">المنشور ده مخفي ومش ظاهر للناس.</p>}
      </header>
      <p className="whitespace-pre-line text-[1.05rem]">{post.body}</p>
      <div className="flex flex-wrap items-center gap-4">
        {user && !mine && <ReportButton postId={post.id} />}
        {mine && (
          <form action={deleteOwnPost.bind(null, post.id)}>
            <button type="submit" className="text-sm text-urgent underline underline-offset-4">
              امسح المنشور
            </button>
          </form>
        )}
      </div>

      <section aria-labelledby="comments" className="grid gap-4 border-t border-line pt-6">
        <h2 id="comments" className="text-xl font-semibold">
          التعليقات
        </h2>
        {comments?.length ? (
          <ul className="grid gap-3">
            {comments.map((c) => (
              <li key={c.id} className="grid gap-1 rounded-2xl border border-line bg-surface p-4">
                <p className="whitespace-pre-line">{c.body}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span>
                    {c.author_label} · {formatDate(c.created_at)}
                  </span>
                  {user && <ReportButton postId={post.id} commentId={c.id} />}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">مفيش تعليقات لسه.</p>
        )}
        {user ? (
          <CommentForm postId={post.id} pseudonym={user.pseudonym} />
        ) : (
          <p>
            <Link href={`/login?next=/community/${post.id}`} className="text-green-2 underline underline-offset-4">
              ادخل عشان تعلّق
            </Link>
          </p>
        )}
      </section>
    </article>
  );
}

export default function PostPage({ params }: PageProps<"/community/[id]">) {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-10">
      <Suspense fallback={<p className="text-muted">بنحمّل المنشور…</p>}>
        <Post params={params} />
      </Suspense>
    </section>
  );
}
