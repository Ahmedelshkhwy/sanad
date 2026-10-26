import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WeekChart } from "./WeekChart";

export const metadata: Metadata = { title: "الإدارة" };

async function Overview() {
  await requireStaff("/admin");
  const supabase = await createClient();
  const since = new Date(Date.now() - 6 * 864e5);
  since.setHours(0, 0, 0, 0);

  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const [openRequests, openReports, drafts, logs] = await Promise.all([
    count(supabase.from("help_requests").select("id", { count: "exact", head: true }).in("status", ["new", "reviewing", "searching"])),
    count(supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open")),
    count(supabase.from("kb_entries").select("id", { count: "exact", head: true }).eq("approved", false)),
    supabase.from("assistant_logs").select("mode, needs_pharmacist, created_at").gte("created_at", since.toISOString()).then((r) => r.data ?? []),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since.getTime() + i * 864e5);
    const key = d.toDateString();
    const rows = logs.filter((l) => new Date(l.created_at).toDateString() === key);
    return {
      label: d.toLocaleDateString("ar-EG", { weekday: "short" }),
      total: rows.length,
      handoff: rows.filter((l) => l.mode === "handoff" || l.mode === "urgent" || l.needs_pharmacist).length,
    };
  });
  const week = logs.length;
  const handoffs = days.reduce((s, d) => s + d.handoff, 0);
  const approved = logs.filter((l) => l.mode === "approved").length;

  const cards = [
    { label: "طلبات دوا مفتوحة", value: openRequests, href: "/admin/requests" },
    { label: "بلاغات مستنية مراجعة", value: openReports, href: "/admin/reports" },
    { label: "إجابات مسودة", value: drafts, href: "/admin/kb?filter=drafts" },
    { label: "أسئلة الأسبوع", value: week, href: "/admin/logs" },
  ];

  return (
    <div className="grid gap-6">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            <Link href={c.href} className="grid gap-1 rounded-2xl border border-line bg-surface p-4 transition hover:border-green-2/50 hover:shadow-card">
              <span className="font-display text-3xl font-bold tabular-nums text-green">{c.value}</span>
              <span className="text-sm text-muted">{c.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-5 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-3">
          <h2 className="font-semibold">أسئلة المساعد آخر ٧ أيام</h2>
          <WeekChart days={days} />
        </div>
        <dl className="grid content-start gap-3 text-sm">
          <div>
            <dt className="text-muted">اتجاوبت من إجابات معتمدة</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{week ? Math.round((approved / week) * 100) : 0}٪</dd>
          </div>
          <div>
            <dt className="text-muted">اتحوّلت للصيدلي</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{handoffs}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">نظرة عامة</h1>
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <Overview />
      </Suspense>
    </div>
  );
}
