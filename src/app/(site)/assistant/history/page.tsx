import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Field";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "أسئلتي للمساعد" };

async function History() {
  const user = await requireUser("/assistant/history");
  const supabase = await createClient();
  const { data } = await supabase
    .from("assistant_logs")
    .select("id, question, reply, mode, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data?.length) {
    return (
      <p className="text-muted">
        لسه مسألتش المساعد. <Link href="/assistant" className="text-green-2 underline underline-offset-4">اسأل دلوقتي</Link>
      </p>
    );
  }
  return (
    <ol className="grid gap-3">
      {data.map((row) => (
        <li key={row.id} className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <b className="font-medium">{row.question}</b>
            <time className="text-xs text-muted" dateTime={row.created_at}>
              {formatDate(row.created_at)}
            </time>
          </div>
          <p className="line-clamp-4 whitespace-pre-line text-sm text-muted">{row.reply}</p>
        </li>
      ))}
    </ol>
  );
}

export default function HistoryPage() {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-10">
      <PageHeader title="أسئلتي للمساعد" />
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <History />
      </Suspense>
    </section>
  );
}
