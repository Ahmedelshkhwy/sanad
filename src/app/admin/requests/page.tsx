import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUSES, STATUS_LABEL } from "@/lib/requests";
import { formatDate } from "@/lib/format";
import { UpdateForm } from "./UpdateForm";
import { ForwardForm } from "./ForwardForm";

type Pharmacy = { id: string; name: string; area: string; phone: string | null };

/** wa.me wants digits with the country code; local Egyptian numbers start with 0. */
function waNumber(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("0") ? `20${d.slice(1)}` : d;
}

function pharmacyMessage(r: { medicine_name: string | null; strength: string | null; area: string; details: string }) {
  return [`طلب دوا من سَنَد: ${r.medicine_name ?? ""}${r.strength ? ` ${r.strength}` : ""}`, `المنطقة: ${r.area}`, r.details, "متوفر عندكم؟"]
    .filter(Boolean)
    .join("\n");
}

export const metadata: Metadata = { title: "طلبات الدوا" };

async function Requests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff("/admin/requests");
  const { status } = await searchParams;
  const supabase = await createClient();
  const { data: partners } = await supabase.from("partners").select("id, name, area, phone").eq("kind", "pharmacy").eq("active", true).order("name");
  const pharmacies = (partners ?? []) as Pharmacy[];
  let q = supabase
    .from("help_requests")
    .select("id, medicine_name, strength, area, details, contact_phone, status, created_at, partner_id, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  q = status && (STATUSES as readonly string[]).includes(status) ? q.eq("status", status) : q.in("status", ["new", "reviewing", "searching"]);
  const { data } = await q;

  return (
    <div className="grid gap-4">
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="فلترة">
        <a href="/admin/requests" className="rounded-full border border-line px-3 py-1 hover:border-green-2">
          المفتوحة
        </a>
        {STATUSES.map((s) => (
          <a key={s} href={`/admin/requests?status=${s}`} className="rounded-full border border-line px-3 py-1 hover:border-green-2">
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
            const pharmacy = pharmacies.find((p) => p.id === r.partner_id);
            return (
              <li key={r.id} className="grid gap-3 rounded-2xl border border-line bg-surface p-4 lg:grid-cols-[1.3fr_1fr]">
                <div className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-lg font-semibold">
                      {r.medicine_name}
                      {r.strength ? ` ${r.strength}` : ""}
                    </b>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {r.area} · {owner || "مستخدم"} · {formatDate(r.created_at)}
                  </p>
                  {r.details && <p className="whitespace-pre-line text-sm">{r.details}</p>}
                  {r.contact_phone && (
                    <a href={`https://wa.me/${r.contact_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="text-sm text-green-2 underline underline-offset-4" dir="ltr">
                      {r.contact_phone}
                    </a>
                  )}
                </div>
                <div className="grid content-start gap-3">
                  <ForwardForm requestId={r.id} current={r.partner_id} pharmacies={pharmacies} />
                  {pharmacy && (
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted">محوّل لـ {pharmacy.name}</span>
                      {pharmacy.phone && (
                        <a
                          href={`https://wa.me/${waNumber(pharmacy.phone)}?text=${encodeURIComponent(pharmacyMessage(r))}`}
                          target="_blank"
                          rel="noopener"
                          className="text-green-2 underline underline-offset-4"
                        >
                          ابعتله على واتساب
                        </a>
                      )}
                    </p>
                  )}
                  <UpdateForm requestId={r.id} current={r.status} />
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
