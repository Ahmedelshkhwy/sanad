import type { Metadata } from "next";
import { Chat } from "./Chat";
import { EMERGENCY_NUMBER } from "@/lib/nav";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "المساعد الدوائي" };

export default function AssistantPage() {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-8 md:py-12">
      <div className="grid gap-1.5">
        <h1 className="text-[clamp(1.8rem,4.5vw,2.5rem)] font-bold">اسأل عن دواك</h1>
        <p className="text-muted">بيرد عليك من إجابات راجعها صيدلي، ولو سؤالك محتاج الصيدلي نفسه بيوصّلك بيه.</p>
      </div>
      <Chat />
      <p className="flex items-center gap-2 text-sm text-muted">
        <Icon name="alert" size={18} className="shrink-0 text-urgent" />
        في الطوارئ كلّم الإسعاف
        <a href={`tel:${EMERGENCY_NUMBER}`} className="font-display text-lg font-bold text-urgent" dir="ltr">
          {EMERGENCY_NUMBER}
        </a>
      </p>
      <p className="text-xs text-muted">المعلومات دي للتوعية ومش بديل عن الكشف.</p>
    </section>
  );
}
