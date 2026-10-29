import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { OPEN_STATUSES, STATUSES, STATUS_LABEL, isStatus } from "@/lib/requests";
import { getRegions, regionOptions } from "@/lib/regions";
import { formatDate } from "@/lib/format";
import { FinishForm, MessageForm, PublishForm, ReviewForm } from "./RequestForms";

export const metadata: Metadata = { title: "طلبات الدوا" };

type Target = {
  request_id: string;
  seen_at: string | null;
  response: "available" | "unavailable" | null;
  responded_at: string | null;
  note: string;
  providers: { name: string } | null;
};

function Replies({ targets }: { targets: Target[] }) {
  if (!targets.length) return null;
  const yes = targets.filter((t) => t.response === "available").length;
  const answered = targets.filter((t) => t.response).length;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer">
        ردود الصيدليات: {answered} من {targets.length}
        {yes ? ` · ${yes} عندها الدوا` : ""}
      </summary>
      <ul className="mt-2 grid gap-1">
        {targets.map((t, i) => (
          <li key={i} className="flex flex-wrap gap-x-2">
            <b className="font-medium">{t.providers?.name}</b>
            <span className={t.response === "available" ? "text-green-2" : "text-muted"}>
              {t.response === "available" ? "متوفر" : t.response === "unavailable" ? "مش متوفر" : t.seen_at ? "شافه ولسه مردّش" : "لسه مشافوش"}
            </span>
            {t.responded_at && <span className="text-muted">{formatDate(t.responded_at)}</span>}
            {t.note && <span className="w-full text-muted">{t.note}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

async function Requests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff("/admin/requests");
  const { status } = await searchParams;
  const supabase = await createClient();
  await supabase.rpc("expire_requests");

  let q = supabase
    .from("help_requests")
    .select("id, medicine_name, strength, area, region_id, details, public_note, contact_phone, status, created_at, expires_at, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  q = status && isStatus(status) ? q.eq("status", status) : q.in("status", OPEN_STATUSES);
  const [{ data }, { data: pharmacies }, regions] = await Promise.all([
    q,
    supabase.from("providers").select("id, name, area").eq("kind", "pharmacy").eq("status", "verified").eq("active", true).order("name"),
    getRegions().then(regionOptions),
  ]);
  const ids = (data ?? []).map((r) => r.id);
  const { data: targetRows } = ids.length
    ? await supabase.from("request_targets").select("request_id, seen_at, response, responded_at, note, providers(name)").in("request_id", ids)
    : { data: [] };
  const targets = (targetRows ?? []) as unknown as Target[];

  return (
    <div className="grid gap-4">
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="فلترة">
        <a href="/admin/requests" className={`rounded-full border px-3 py-1 hover:border-green-2 ${!status ? "border-green-2" : "border-line"}`}>
          المفتوحة
        </a>
        {STATUSES.map((s) => (
          <a key={s} href={`/admin/requests?status=${s}`} className={`rounded-full border px-3 py-1 hover:border-green-2 ${status === s ? "border-green-2" : "border-line"}`}>
            {STATUS_LABEL[s]}
          </a>
        ))}
      </nav>
      {!data?.length ? (
        <p className="text-muted">مفيش طلبات هنا.</p>
      ) : (
        <ul className="grid gap-3">
          {data.map((r) => {
            const owner = (r.profiles as unknown as { display_name: string } | null)?.display_name;
            const mine = targets.filter((t) => t.request_id === r.id);
            const label = `${r.medicine_name ?? ""}${r.strength ? ` ${r.strength}` : ""}`;
            return (
              <li key={r.id} className="grid gap-3 rounded-2xl border border-line bg-surface p-4 lg:grid-cols-[1.3fr_1fr]">
                <div className="grid content-start gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-lg font-semibold">{label}</b>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {r.area} · {owner || "مستخدم"} · {formatDate(r.created_at)}
                    {r.expires_at && ` · ينتهي ${formatDate(r.expires_at)}`}
                  </p>
                  {r.details && <p className="whitespace-pre-line text-sm">{r.details}</p>}
                  {r.public_note && <p className="text-sm text-muted">للصيدليات: {r.public_note}</p>}
                  {r.contact_phone && (
                    <a href={`https://wa.me/${r.contact_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="text-sm text-green-2 underline underline-offset-4" dir="ltr">
                      {r.contact_phone}
                    </a>
                  )}
                  <Replies targets={mine} />
                </div>
                <div className="grid content-start gap-4">
                  {r.status === "pending_review" && <ReviewForm requestId={r.id} publicNote={r.public_note || label} region={r.region_id} regions={regions} />}
                  {["approved", "published", "available"].includes(r.status) && (
                    <PublishForm requestId={r.id} pharmacies={pharmacies ?? []} first={r.status === "approved"} />
                  )}
                  {["published", "available"].includes(r.status) && <FinishForm requestId={r.id} />}
                  <details className="text-sm">
                    <summary className="cursor-pointer">رسالة للمستخدم</summary>
                    <div className="mt-2">
                      <MessageForm requestId={r.id} />
                    </div>
                  </details>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AdminRequestsPage({ searchParams }: PageProps<"/admin/requests">) {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">طلبات الدوا</h1>
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <Requests searchParams={searchParams as Promise<{ status?: string }>} />
      </Suspense>
    </div>
  );
}
