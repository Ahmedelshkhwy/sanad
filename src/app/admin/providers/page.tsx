import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KIND, PROVIDER_STATUS } from "@/lib/providers";
import { getRegions, regionOptions } from "@/lib/regions";
import { formatDay } from "@/lib/format";
import { toggleProvider } from "./actions";
import { AddProviderForm, EditProviderForm, MemberForm, StatusForm } from "./ProviderForms";

export const metadata: Metadata = { title: "الصيدليات" };

type Member = { provider_id: string; role: string; profiles: { display_name: string; phone: string | null } | null };

async function Providers() {
  await requireStaff("/admin/providers");
  const supabase = await createClient();
  const [{ data }, { data: coverage }, { data: memberRows }, regions] = await Promise.all([
    supabase
      .from("providers")
      .select("id, name, kind, area, region_id, address, phone, whatsapp, license_no, status, active, created_at")
      .order("status")
      .order("name"),
    supabase.from("provider_regions").select("provider_id, region_id"),
    supabase.from("provider_members").select("provider_id, role, profiles(display_name, phone)"),
    getRegions().then(regionOptions),
  ]);
  const members = (memberRows ?? []) as unknown as Member[];
  const label = new Map(regions.map((r) => [r.id, r.label]));
  // applications waiting for a decision first
  const rows = [...(data ?? [])].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));

  return (
    <div className="grid gap-6">
      <AddProviderForm regions={regions} />
      {!rows.length ? (
        <p className="text-muted">لسه مفيش صيدليات.</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((p) => {
            const st = PROVIDER_STATUS[p.status];
            const cov = (coverage ?? []).filter((c) => c.provider_id === p.id).map((c) => c.region_id);
            const team = members.filter((m) => m.provider_id === p.id);
            return (
              <li key={p.id} className={`grid gap-3 rounded-2xl border border-line bg-surface p-4 ${p.active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-lg font-semibold">{p.name}</b>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st?.tone ?? ""}`}>{st?.label ?? p.status}</span>
                  <span className="text-sm text-muted">
                    {KIND[p.kind] ?? p.kind} · {(p.region_id && label.get(p.region_id)) || p.area || "—"} · من {formatDay(p.created_at)}
                  </span>
                  <form action={toggleProvider.bind(null, p.id, !p.active)} className="ms-auto">
                    <button className="rounded-full border border-line px-3 py-1 text-sm">{p.active ? "إخفاء" : "إظهار"}</button>
                  </form>
                </div>
                {p.license_no && <p className="text-sm text-muted">رقم الترخيص: {p.license_no}</p>}
                <StatusForm providerId={p.id} status={p.status} />
                <details className="grid gap-3">
                  <summary className="cursor-pointer text-sm">
                    البيانات والتغطية ({cov.map((id) => label.get(id)).filter(Boolean).join("، ") || "مفيش"}) · الأعضاء ({team.length})
                  </summary>
                  <div className="mt-3 grid gap-4">
                    <EditProviderForm providerId={p.id} address={p.address} phone={p.phone} whatsapp={p.whatsapp} coverage={cov} regions={regions} />
                    {team.length > 0 && (
                      <ul className="grid gap-1 text-sm">
                        {team.map((m, i) => (
                          <li key={i}>
                            {m.profiles?.display_name || "حساب"} <span dir="ltr">{m.profiles?.phone ? `+${m.profiles.phone}` : ""}</span>
                            <span className="text-muted"> · {m.role === "owner" ? "صاحب الصيدلية" : "بيشتغل فيها"}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <MemberForm providerId={p.id} />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ProvidersPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">الصيدليات ومقدّمي الخدمة</h1>
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <Providers />
      </Suspense>
    </div>
  );
}
