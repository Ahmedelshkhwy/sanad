import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RebuildButton } from "./EntryForm";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "الإجابات المعتمدة" };

async function Entries({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  await requireStaff("/admin/kb");
  const { filter, q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("kb_entries").select("id, question, level, approved, updated_at").order("id");
  if (filter === "drafts") query = query.eq("approved", false);
  if (filter === "approved") query = query.eq("approved", true);
  if (q) query = query.ilike("question", `%${q.replace(/[%_]/g, "")}%`);
  const [{ data }, { count: unindexed }] = await Promise.all([
    query,
    supabase.from("kb_variants").select("id", { count: "exact", head: true }).is("embedding", null),
  ]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <LinkButton href="/admin/kb/new" className="!min-h-10 text-sm">
          إجابة جديدة
        </LinkButton>
        <RebuildButton />
        {!!unindexed && <span className="text-sm text-urgent">{unindexed} صيغة مش متفهرسة، والمساعد مش هيلاقيها.</span>}
      </div>
      <form className="flex flex-wrap gap-2 text-sm" role="search">
        <input name="q" defaultValue={q} aria-label="بحث في الأسئلة" className="rounded-full border-[1.5px] border-line bg-surface px-4 py-1.5" />
        <select name="filter" defaultValue={filter ?? ""} aria-label="الحالة" className="rounded-full border-[1.5px] border-line bg-surface px-3 py-1.5">
          <option value="">الكل</option>
          <option value="approved">المعتمدة</option>
          <option value="drafts">المسودات</option>
        </select>
        <button className="rounded-full bg-green px-4 py-1.5 text-on-green">اعرض</button>
      </form>
      <ul className="grid gap-2">
        {(data ?? []).map((e) => (
          <li key={e.id}>
            <Link href={`/admin/kb/${e.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:border-green-2/50">
              <span className="font-display text-sm text-muted" dir="ltr">
                {e.id}
              </span>
              <span className="flex-1">{e.question}</span>
              {e.level === "pharmacist" && <span className="rounded-full bg-sun-soft px-2 py-0.5 text-xs">انتباه صيدلي</span>}
              <span className={`rounded-full px-2 py-0.5 text-xs ${e.approved ? "bg-green text-on-green" : "bg-line text-muted"}`}>{e.approved ? "معتمدة" : "مسودة"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function KbPage({ searchParams }: PageProps<"/admin/kb">) {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">الإجابات المعتمدة</h1>
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <Entries searchParams={searchParams as Promise<{ filter?: string; q?: string }>} />
      </Suspense>
    </div>
  );
}
