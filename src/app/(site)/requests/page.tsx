import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { Icon, type IconName } from "@/components/Icon";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Field";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "البحث عن دوا" };

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "send", title: "تسجّل طلبك", text: "اسم الدوا وتركيزه ومنطقتك." },
  { icon: "shield", title: "نراجعه", text: "نتأكد إن البيانات واضحة." },
  { icon: "search", title: "نبعته للصيدليات", text: "الصيدليات الشريكة في منطقتك بتشوفه من غير اسمك." },
  { icon: "bell", title: "يوصلك الرد", text: "إشعار بالصيدلية اللي عندها الدوا وإزاي تكلّمها." },
];

async function MyRequests() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <LinkButton href="/login?next=/requests/new">ادخل وسجّل طلبك</LinkButton>
      </div>
    );
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("help_requests")
    .select("id, medicine_name, strength, area, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-4">
      <div>
        <LinkButton href="/requests/new">
          <Icon name="pin" size={18} />
          طلب جديد
        </LinkButton>
      </div>
      {data?.length ? (
        <ul className="grid gap-3">
          {data.map((r) => (
            <li key={r.id}>
              <Link href={`/requests/${r.id}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 transition hover:border-green-2/50 hover:shadow-card">
                <span className="grid">
                  <b className="font-medium">
                    {r.medicine_name}
                    {r.strength ? ` ${r.strength}` : ""}
                  </b>
                  <span className="text-xs text-muted">
                    {r.area} · {formatDay(r.created_at)}
                  </span>
                </span>
                <span className="ms-auto">
                  <StatusBadge status={r.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">مفيش طلبات لسه.</p>
      )}
    </div>
  );
}

export default function RequestsPage() {
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 md:py-14">
      <PageHeader title="مش لاقي دوا؟ قولنا وإحنا ندوّر معاك" lead="سجّل الدوا اللي محتاجه، وتابع طلبك من مكانك من غير ما تلف على الصيدليات." />
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
            <span className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-full bg-mint text-green">
                <Icon name={s.icon} size={18} />
              </span>
              <span className="font-display text-sm text-muted">{i + 1}</span>
            </span>
            <b className="font-medium">{s.title}</b>
            <span className="text-sm text-muted">{s.text}</span>
          </li>
        ))}
      </ol>
      <section aria-labelledby="mine" className="grid gap-4">
        <h2 id="mine" className="text-xl font-semibold">
          طلباتي
        </h2>
        <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
          <MyRequests />
        </Suspense>
      </section>
    </section>
  );
}
