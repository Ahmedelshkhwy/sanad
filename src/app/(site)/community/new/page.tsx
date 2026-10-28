import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { PostForm } from "./PostForm";
import { PageHeader } from "@/components/ui/Field";

export const metadata: Metadata = { title: "منشور جديد" };

async function Form({ searchParams }: { searchParams: Promise<{ ask?: string }> }) {
  const ask = (await searchParams).ask === "1";
  const user = await requireUser(ask ? "/community/new?ask=1" : "/community/new");
  return (
    <>
      <PageHeader title={ask ? "اطلب سَنَد" : "منشور جديد"} />
      <div className="rounded-[20px] border border-line bg-surface p-5">
        <PostForm displayName={user.displayName} pseudonym={user.pseudonym} ask={ask} />
      </div>
    </>
  );
}

export default function NewPostPage({ searchParams }: PageProps<"/community/new">) {
  return (
    <section className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <Form searchParams={searchParams as Promise<{ ask?: string }>} />
      </Suspense>
      <p className="text-sm text-muted">المنشورات عامة. متكتبش أرقام تليفونات أو بيانات صحية لحد، ومتنشرش وصفات علاج.</p>
    </section>
  );
}
