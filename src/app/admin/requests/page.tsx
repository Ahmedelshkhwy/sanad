import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUSES, STATUS_LABEL } from "@/lib/requests";
import { formatDate } from "@/lib/format";
import { UpdateForm } from "./UpdateForm";

export const metadata: Metadata = { title: "طلبات الدوا" };

async function Requests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff("/admin/requests");
  const { status } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("help_requests")
    .select("id, medicine_name, strength, area, details, contact_phone, status, created_at, profiles(display_name)")
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
                <UpdateForm requestId={r.id} current={r.status} />
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
