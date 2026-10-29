import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_STATUS } from "@/lib/providers";
import { getRegions, regionOptions } from "@/lib/regions";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/Field";
import { ApplyForm, NoteForm, ProfileForm, RespondForm } from "./PortalForms";

export const metadata: Metadata = { title: "بوابة الصيدليات" };

type Provider = { id: string; name: string; status: string; address: string; phone: string | null; whatsapp: string | null };
type Membership = { role: string; providers: Provider | null };
type InboxItem = {
  request_id: string;
  medicine_name: string | null;
  strength: string | null;
  area: string;
  public_note: string;
  status: string;
  published_at: string;
  expires_at: string | null;
  response: string | null;
  responded_at: string | null;
  note: string;
};

const STATUS_NOTE: Record<string, string> = {
  pending: "طلب الانضمام وصلنا وبيتراجع. هيوصلك إشعار أول ما الحساب يتوثّق، وبعدها هتبدأ توصلك طلبات الدوا.",
  suspended: "الحساب ده موقوف دلوقتي ومش بيستقبل طلبات. كلّم فريق سَنَد.",
  rejected: "طلب الانضمام اترفض. كلّم فريق سَنَد لو محتاج تعرف السبب.",
};

function Inbox({ items, providerId }: { items: InboxItem[]; providerId: string }) {
  if (!items.length) return <p className="text-muted">مفيش طلبات لسه.</p>;
  return (
    <ul className="grid gap-3">
      {items.map((r) => {
        const open = r.status === "published" || r.status === "available";
        return (
          <li key={r.request_id} className={`grid gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[1.2fr_1fr] ${open ? "" : "opacity-60"}`}>
            <div className="grid content-start gap-1">
              <b className="text-lg font-semibold">
                {r.medicine_name}
                {r.strength ? ` ${r.strength}` : ""}
              </b>
              <p className="text-sm text-muted">
                {r.area} · وصل {formatDate(r.published_at)}
                {open && r.expires_at && ` · ينتهي ${formatDate(r.expires_at)}`}
              </p>
              {r.public_note && <p className="whitespace-pre-line text-sm">{r.public_note}</p>}
            </div>
            {open ? (
              <div className="grid content-start gap-3">
                <RespondForm requestId={r.request_id} providerId={providerId} response={r.response} note={r.note} />
                <details className="text-sm">
                  <summary className="cursor-pointer">ابعت ملاحظة لصاحب الطلب</summary>
                  <div className="mt-2">
                    <NoteForm requestId={r.request_id} providerId={providerId} />
                  </div>
                </details>
              </div>
            ) : (
              <p className="text-sm text-muted">
                الطلب اتقفل
                {r.response && ` · ردك: ${r.response === "available" ? "متوفر" : "مش متوفر"}`}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

async function Portal({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const user = await requireUser("/portal");
  const { p } = await searchParams;
  const supabase = await createClient();
  const [{ data: rows }, regions] = await Promise.all([
    supabase.from("provider_members").select("role, providers(id, name, status, address, phone, whatsapp)").eq("user_id", user.id),
    getRegions().then(regionOptions),
  ]);
  const memberships = ((rows ?? []) as unknown as Membership[]).filter((m) => m.providers);

  if (!memberships.length) {
    return (
      <div className="grid gap-4 rounded-[20px] border border-line bg-surface p-5">
        <h2 className="text-xl font-semibold">سجّل صيدليتك</h2>
        <ApplyForm regions={regions} />
      </div>
    );
  }

  const current = memberships.find((m) => m.providers!.id === p) ?? memberships[0];
  const provider = current.providers!;
  const status = PROVIDER_STATUS[provider.status];

  let inbox: InboxItem[] = [];
  let coverage: string[] = [];
  if (provider.status === "verified") {
    await supabase.rpc("expire_requests");
    const [{ data }, { data: cov }] = await Promise.all([
      supabase.rpc("provider_inbox", { p_provider: provider.id }),
      supabase.from("provider_regions").select("region_id").eq("provider_id", provider.id),
    ]);
    inbox = (data ?? []) as InboxItem[];
    coverage = (cov ?? []).map((c) => c.region_id);
  }
  const waiting = inbox.filter((r) => (r.status === "published" || r.status === "available") && !r.response).length;

  return (
    <div className="grid gap-6">
      {memberships.length > 1 && (
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="صيدلياتك">
          {memberships.map((m) => (
            <Link
              key={m.providers!.id}
              href={`/portal?p=${m.providers!.id}`}
              className={`rounded-full border px-3 py-1 ${m.providers!.id === provider.id ? "border-green-2" : "border-line"}`}
            >
              {m.providers!.name}
            </Link>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">{provider.name}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status?.tone ?? ""}`}>{status?.label ?? provider.status}</span>
      </div>
      {STATUS_NOTE[provider.status] && <p className="rounded-2xl bg-sun-soft p-4">{STATUS_NOTE[provider.status]}</p>}
      {provider.status === "verified" && (
        <>
          <section aria-labelledby="inbox" className="grid gap-3">
            <h3 id="inbox" className="text-xl font-semibold">
              طلبات الدوا {waiting > 0 && <span className="text-base font-normal text-muted">· {waiting} مستني ردك</span>}
            </h3>
            <p className="text-sm text-muted">ردك "متوفر" بيبعت لصاحب الطلب إشعار باسم الصيدلية، ويظهر له تليفونها عشان يكلّمكم. ولو الدوا خلص، غيّر ردك.</p>
            <Inbox items={inbox} providerId={provider.id} />
          </section>
          {current.role === "owner" && (
            <section aria-labelledby="profile" className="grid gap-3 rounded-[20px] border border-line bg-surface p-5">
              <h3 id="profile" className="text-xl font-semibold">
                بيانات الصيدلية
              </h3>
              <ProfileForm providerId={provider.id} address={provider.address} phone={provider.phone} whatsapp={provider.whatsapp} coverage={coverage} regions={regions} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function PortalPage({ searchParams }: PageProps<"/portal">) {
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10">
      <PageHeader title="بوابة الصيدليات" />
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <Portal searchParams={searchParams as Promise<{ p?: string }>} />
      </Suspense>
    </section>
  );
}
