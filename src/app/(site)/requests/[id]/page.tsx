import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { buttonClass } from "@/components/ui/Button";
import { NOT_A_RESERVATION, STATUS_LABEL, isOpen, isStatus } from "@/lib/requests";
import { CloseForm } from "./CloseForm";

type Offer = { provider_name: string; phone: string | null; whatsapp: string | null; address: string; area: string; responded_at: string; note: string };

export const metadata: Metadata = { title: "متابعة الطلب" };

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/requests/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  await supabase.rpc("expire_requests");
  const [{ data: req }, { data: updates }, { data: offerRows }] = await Promise.all([
    supabase.from("help_requests").select("id, medicine_name, strength, area, details, status, created_at, expires_at").eq("id", id).maybeSingle(),
    supabase.from("request_updates").select("id, status, note, kind, source, created_at").eq("request_id", id).order("created_at"),
    supabase.rpc("request_offers", { p_request: id }),
  ]);
  if (!req) notFound();

  const offers = (offerRows ?? []) as Offer[];
  const timeline = [{ id: 0, status: "pending_review", note: "", kind: "status", source: "", created_at: req.created_at }, ...(updates ?? [])];
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
        {req.expires_at && isOpen(req.status) && <p className="text-sm text-muted">الصيدليات بتستقبل الطلب لحد {formatDate(req.expires_at)}</p>}
        {isOpen(req.status) && <CloseForm requestId={req.id} canComplete={req.status === "published" || req.status === "available"} />}
      </div>
      {offers.length > 0 && (
        <section aria-labelledby="offers" className="grid gap-3">
          <h2 id="offers" className="text-xl font-semibold">
            صيدليات عندها الدوا
          </h2>
          <p className="rounded-2xl bg-sun-soft p-4 text-sm">{NOT_A_RESERVATION}</p>
          <ul className="grid gap-3">
            {offers.map((o, i) => (
              <li key={i} className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
                <b className="text-lg font-semibold">{o.provider_name}</b>
                <p className="text-sm text-muted">
                  {[o.address, o.area].filter(Boolean).join("، ")} · أكّدت {formatDate(o.responded_at)}
                </p>
                {o.note && <p className="text-sm">{o.note}</p>}
                <div className="flex flex-wrap gap-2">
                  {o.phone && (
                    <a href={`tel:${o.phone}`} className={buttonClass("ghost", "!min-h-10 text-sm")} dir="ltr">
                      {o.phone}
                    </a>
                  )}
                  {o.whatsapp && (
                    <a href={`https://wa.me/${o.whatsapp}`} target="_blank" rel="noopener" className={buttonClass("whatsapp", "!min-h-10 text-sm")}>
                      واتساب
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ol className="relative grid gap-5 border-s-2 border-line ps-5">
        {timeline.map((u) => (
          <li key={u.id} className="relative grid gap-1">
            <span className="absolute -start-[1.72rem] top-1.5 size-3 rounded-full bg-green-2 ring-4 ring-paper" aria-hidden="true" />
            <b className="font-medium">
              {u.kind === "message" ? `رسالة من ${u.source}` : isStatus(u.status) ? STATUS_LABEL[u.status] : u.status}
            </b>
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
