import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Field";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "الإشعارات" };

async function markAllRead() {
  "use server";
  const user = await requireUser("/notifications");
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/notifications");
}

async function List() {
  const user = await requireUser("/notifications");
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data?.length) return <p className="text-muted">مفيش إشعارات.</p>;
  const unread = data.some((n) => !n.read_at);
  return (
    <div className="grid gap-4">
      {unread && (
        <form action={markAllRead}>
          <button type="submit" className="text-sm text-green-2 underline underline-offset-4">
            علّم الكل كمقروء
          </button>
        </form>
      )}
      <ul className="grid gap-3">
        {data.map((n) => {
          const body = (
            <>
              <span className="flex items-center gap-2">
                {!n.read_at && <span className="size-2 rounded-full bg-sun" aria-label="جديد" />}
                <b className="font-medium">{n.title}</b>
              </span>
              {n.body && <span className="text-sm text-muted">{n.body}</span>}
              <time className="text-xs text-muted" dateTime={n.created_at}>
                {formatDate(n.created_at)}
              </time>
            </>
          );
          return (
            <li key={n.id}>
              {n.link ? (
                <Link href={n.link} className="grid gap-1 rounded-2xl border border-line bg-surface p-4 transition hover:border-green-2/50">
                  {body}
                </Link>
              ) : (
                <div className="grid gap-1 rounded-2xl border border-line bg-surface p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <section className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
      <PageHeader title="الإشعارات" />
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <List />
      </Suspense>
    </section>
  );
}
