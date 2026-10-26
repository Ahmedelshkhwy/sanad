import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Field";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "المجتمع" };

async function Posts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, title, body, author_label, created_at, comments(count)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(30);

  if (!data?.length) return <p className="text-muted">مفيش منشورات لسه. ابدأ إنت أول سؤال.</p>;
  return (
    <ul className="grid gap-3">
      {data.map((p) => {
        const count = (p.comments as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
        return (
          <li key={p.id}>
            <Link href={`/community/${p.id}`} className="grid gap-1.5 rounded-2xl border border-line bg-surface p-4 transition hover:border-green-2/50 hover:shadow-card">
              <b className="text-lg font-semibold">{p.title}</b>
              <p className="line-clamp-2 text-muted">{p.body}</p>
              <span className="text-xs text-muted">
                {p.author_label} · {formatDay(p.created_at)} · {count} {count === 1 ? "تعليق" : "تعليقات"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function CommunityPage() {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-10 md:py-14">
      <PageHeader title="أهل البلد بيساعدوا بعض" lead="اسأل، وشارك تجربتك ونصايحك الصحية مع الناس اللي حواليك، باسمك أو باسم مستعار." />
      <div>
        <LinkButton href="/community/new">اكتب منشور</LinkButton>
      </div>
      <Suspense fallback={<p className="text-muted">بنحمّل المنشورات…</p>}>
        <Posts />
      </Suspense>
      <p className="text-xs text-muted">متكتبش بيانات شخصية لحد، ولو شفت معلومة غلط أو مضللة بلّغ عنها.</p>
    </section>
  );
}
