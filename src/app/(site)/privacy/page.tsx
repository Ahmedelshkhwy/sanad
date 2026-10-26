import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/Field";

export const metadata: Metadata = { title: "الخصوصية" };

const SECTIONS = [
  {
    title: "بنجمع إيه",
    items: [
      "إيميلك واسمك، وأي اسم مستعار أو منطقة بتكتبها في حسابك.",
      "ملفك الصحي: بس اللي إنت تختار تكتبه، وكل خاناته اختيارية.",
      "أسئلتك للمساعد وردوده، عشان الصيدلي يراجع جودة الإجابات.",
      "طلبات الدوا والمنشورات والتعليقات اللي بتكتبها.",
    ],
  },
  {
    title: "مين بيشوف بياناتك",
    items: [
      "ملفك الصحي محدش يشوفه غيرك، ومش بيظهر في المجتمع.",
      "المساعد بيستخدم ملفك الصحي بس لو إنت فعّلت ده من صفحة الملف.",
      "طلبات الدوا وأسئلة المساعد بيشوفها الصيدلي المسؤول عشان يرد ويتابع.",
      "المنشورات والتعليقات عامة، بالاسم اللي تختاره.",
      "لو بعت رقمك عشان الصيدلي يكلمك، الرقم بيتبعت للصيدلي مباشرة ومش بيتخزن عندنا.",
    ],
  },
  {
    title: "حقوقك",
    items: [
      "تعدّل بياناتك أو تمسحها في أي وقت من حسابك وملفك الصحي.",
      "تمسح منشوراتك.",
      "تطلب حذف حسابك بالكامل بالتواصل مع الصيدلي على واتساب.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-10">
      <PageHeader title="الخصوصية" lead="بنجمع أقل بيانات محتاجينها لكل خدمة، وبنفصل بياناتك الصحية عن أي حاجة عامة." />
      {SECTIONS.map((s) => (
        <div key={s.title} className="grid gap-3">
          <h2 className="text-xl font-semibold">{s.title}</h2>
          <ul className="grid list-disc gap-1.5 ps-5 text-muted">
            {s.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
