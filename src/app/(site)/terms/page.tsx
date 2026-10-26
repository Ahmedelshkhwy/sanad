import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/Field";
import { EMERGENCY_NUMBER } from "@/lib/nav";

export const metadata: Metadata = { title: "الشروط" };

const TERMS = [
  "سَنَد خدمة توعية مجانية، ومش بديل عن الكشف عند دكتور أو استشارة الصيدلي.",
  "المساعد الدوائي مبيشخّصش أمراض ومبيكتبش علاج. لو في خطر على حياتك، كلّم الإسعاف على " + EMERGENCY_NUMBER + " فورًا.",
  "خدمة البحث عن دوا بتحاول تساعدك، لكن منقدرش نضمن توافر الدوا قبل ما نتأكد منه.",
  "متغيّرش ولا توقّف أي دوا بروشتة من غير ما تكلّم دكتورك.",
  "في المجتمع: متنشرش بيانات شخصية لحد، ولا معلومات مضللة، ولا وصفات علاج. المحتوى المخالف بيتشال.",
  "الحساب شخصي، وإنت مسؤول عن اللي بتكتبه منه.",
];

export default function TermsPage() {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-10">
      <PageHeader title="شروط الاستخدام" />
      <ol className="grid list-decimal gap-2.5 ps-5">
        {TERMS.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
    </section>
  );
}
