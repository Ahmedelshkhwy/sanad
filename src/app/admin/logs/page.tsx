import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { draftFromLog, rateLog } from "./actions";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "أسئلة المساعد" };

const MODE_LABEL: Record<string, string> = {
  approved: "من إجابة معتمدة",
  general: "من الذكاء الاصطناعي",
  clarify: "سؤال توضيحي",
  handoff: "اتحوّل للصيدلي",
  urgent: "طارئ",
};
const FILTERS = ["handoff", "general", "urgent", "approved"];

async function Logs({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  await requireStaff("/admin/logs");
  const { mode } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("assistant_logs")
    .select("id, question, reply, mode, ref, similarity, needs_pharmacist, reason, rating, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(80);
  if (mode && FILTERS.includes(mode)) q = q.eq("mode", mode);
  const { data } = await q;

  return (
    <div className="grid gap-4">
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="فلترة">
        <a href="/admin/logs" className="rounded-full border border-line px-3 py-1 hover:border-green-2">
          الكل
        </a>
        {FILTERS.map((m) => (
          <a key={m} href={`/admin/logs?mode=${m}`} className="rounded-full border border-line px-3 py-1 hover:border-green-2">
            {MODE_LABEL[m]}
          </a>
        ))}
      </nav>
      {!data?.length ? (
        <p className="text-muted">مفيش أسئلة لسه.</p>
      ) : (
        <ul className="grid gap-3">
          {data.map((l) => (
            <li key={l.id} className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className={`rounded-full px-2 py-0.5 ${l.mode === "urgent" ? "bg-urgent-soft text-urgent" : l.mode === "handoff" ? "bg-sun-soft text-ink" : "bg-mint text-green"}`}>
                  {MODE_LABEL[l.mode] ?? l.mode}
                </span>
                {l.ref && <span dir="ltr">{l.ref}</span>}
                {l.needs_pharmacist && <span>محتاج صيدلي</span>}
                <span>{formatDate(l.created_at)}</span>
                {l.user_id && <span>مستخدم مسجّل</span>}
              </div>
              <b className="font-medium">{l.question}</b>
              <p className="line-clamp-5 whitespace-pre-line text-sm text-muted">{l.reply}</p>
              {l.reason && <p className="text-xs text-muted">{l.reason}</p>}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <form action={rateLog.bind(null, l.id, 1)}>
                  <button className={`rounded-full border px-3 py-1 ${l.rating === 1 ? "border-green bg-green text-on-green" : "border-line"}`}>رد كويس</button>
                </form>
                <form action={rateLog.bind(null, l.id, -1)}>
                  <button className={`rounded-full border px-3 py-1 ${l.rating === -1 ? "border-urgent bg-urgent-soft text-urgent" : "border-line"}`}>رد غلط</button>
                </form>
                {l.mode !== "approved" && l.mode !== "urgent" && (
                  <form action={draftFromLog.bind(null, l.id)}>
                    <button className="rounded-full border border-line px-3 py-1 hover:border-green-2">اكتب له إجابة معتمدة</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LogsPage({ searchParams }: PageProps<"/admin/logs">) {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">أسئلة المساعد</h1>
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <Logs searchParams={searchParams as Promise<{ mode?: string }>} />
      </Suspense>
    </div>
  );
}
