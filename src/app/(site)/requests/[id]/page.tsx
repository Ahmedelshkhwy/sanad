import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { STATUS_LABEL, isStatus } from "@/lib/requests";

export const metadata: Metadata = { title: "متابعة الطلب" };

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/requests/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: req }, { data: updates }] = await Promise.all([
    supabase.from("help_requests").select("id, medicine_name, strength, area, details, status, created_at").eq("id", id).maybeSingle(),
    supabase.from("request_updates").select("id, status, note, created_at").eq("request_id", id).order("created_at"),
  ]);
  if (!req) notFound();

  const timeline = [{ id: 0, status: "new", note: "", created_at: req.created_at }, ...(updates ?? [])];
  return (
    <div className="grid gap-6">
      <div className="grid gap-2 rounded-[20px] border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">
            {req.medicine_name}
            {req.strength ? ` ${req.strength}` : ""}
          </h1>
          <StatusBadge status={req.status} />
        </div>
        <p className="text-muted">{req.area}</p>
        {req.details && <p className="whitespace-pre-line">{req.details}</p>}
      </div>
      <ol className="relative grid gap-5 border-s-2 border-line ps-5">
        {timeline.map((u) => (
          <li key={u.id} className="relative grid gap-1">
            <span className="absolute -start-[1.72rem] top-1.5 size-3 rounded-full bg-green-2 ring-4 ring-paper" aria-hidden="true" />
            <b className="font-medium">{isStatus(u.status) ? STATUS_LABEL[u.status] : u.status}</b>
            {u.note && <p className="whitespace-pre-line text-muted">{u.note}</p>}
            <time className="text-xs text-muted" dateTime={u.created_at}>
              {formatDate(u.created_at)}
            </time>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function RequestPage({ params }: PageProps<"/requests/[id]">) {
  return (
    <section className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
      <Suspense fallback={<p className="text-muted">بنحمّل الطلب…</p>}>
        <Detail params={params} />
      </Suspense>
    </section>
  );
}
