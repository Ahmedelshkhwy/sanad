import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EntryForm, type Entry } from "../EntryForm";
import { deleteEntry } from "../actions";

export const metadata: Metadata = { title: "إجابة" };

async function Edit({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("/admin/kb");
  const { id } = await params;
  if (id === "new") return <EntryForm entry={null} />;
  if (!/^Q\d{3,5}$/.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: e }, { data: variants }] = await Promise.all([
    supabase.from("kb_entries").select("id, question, answer, source, level, approved, notes").eq("id", id).maybeSingle(),
    supabase.from("kb_variants").select("text").eq("entry_id", id),
  ]);
  if (!e) notFound();
  const entry: Entry = {
    ...e,
    alternatives: (variants ?? [])
      .map((v) => v.text)
      .filter((t) => t !== e.question)
      .join("\n"),
  };
  return (
    <div className="grid gap-6">
      <EntryForm entry={entry} />
      <form action={deleteEntry.bind(null, id)} className="border-t border-line pt-4">
        <button type="submit" className="text-sm text-urgent underline underline-offset-4">
          امسح الإجابة دي
        </button>
      </form>
    </div>
  );
}

export default function EntryPage({ params }: PageProps<"/admin/kb/[id]">) {
  return (
    <div className="grid max-w-3xl gap-6">
      <Link href="/admin/kb" className="text-sm text-muted hover:text-ink">
        ← كل الإجابات
      </Link>
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <Edit params={params} />
      </Suspense>
    </div>
  );
}
