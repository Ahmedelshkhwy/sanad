import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { PostForm } from "./PostForm";
import { PageHeader } from "@/components/ui/Field";

export const metadata: Metadata = { title: "منشور جديد" };

async function Form() {
  const user = await requireUser("/community/new");
  return <PostForm pseudonym={user.pseudonym} />;
}

export default function NewPostPage() {
  return (
    <section className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
      <PageHeader title="منشور جديد" />
      <div className="rounded-[20px] border border-line bg-surface p-5">
        <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
          <Form />
        </Suspense>
      </div>
      <p className="text-sm text-muted">المنشورات عامة. متكتبش أرقام تليفونات أو بيانات صحية لحد، ومتنشرش وصفات علاج.</p>
    </section>
  );
}
