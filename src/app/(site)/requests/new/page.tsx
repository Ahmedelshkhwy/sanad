import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { RequestForm } from "./RequestForm";
import { PageHeader } from "@/components/ui/Field";

export const metadata: Metadata = { title: "طلب دوا" };

async function Form() {
  const user = await requireUser("/requests/new");
  return <RequestForm area={user.area ?? ""} />;
}

export default function NewRequestPage() {
  return (
    <section className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10">
      <PageHeader title="مش لاقي دوا؟" lead="سجّل الدوا اللي محتاجه، وهنبلغك أول ما نوصل لحاجة." />
      <div className="rounded-[20px] border border-line bg-surface p-5">
        <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
          <Form />
        </Suspense>
      </div>
      <p className="text-sm text-muted">مش هنقولك إن الدوا موجود غير لما نتأكد، ومش هنقترح بديل علاجي من غير صيدلي. ولو دواك قرّب يخلص، كلّم دكتورك قبل ما توقفه.</p>
    </section>
  );
}
