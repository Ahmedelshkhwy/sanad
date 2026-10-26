"use client";

import { useActionState, useState } from "react";
import { saveHealthProfile } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, TextArea, TextInput, inputClass } from "@/components/ui/Field";
import { idle, type FormState } from "@/lib/form";

export type Health = {
  birth_year: number | null;
  sex: string | null;
  pregnant: boolean;
  chronic_conditions: string[];
  medications: string[];
  allergies: string[];
  share_with_assistant: boolean;
};

export function HealthForm({ health }: { health: Health }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveHealthProfile, idle);
  const [sex, setSex] = useState(health.sex ?? "");

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="سنة الميلاد">
          <TextInput name="birth_year" type="number" inputMode="numeric" min={1900} max={new Date().getFullYear()} defaultValue={health.birth_year ?? ""} dir="ltr" />
        </Field>
        <Field label="النوع">
          <select name="sex" value={sex} onChange={(e) => setSex(e.target.value)} className={inputClass}>
            <option value="">مش عايز أحدد</option>
            <option value="female">أنثى</option>
            <option value="male">ذكر</option>
          </select>
        </Field>
      </div>
      {sex === "female" && (
        <label className="flex items-center gap-2.5">
          <input type="checkbox" name="pregnant" defaultChecked={health.pregnant} className="size-5 accent-[var(--green)]" />
          <span>حامل دلوقتي</span>
        </label>
      )}
      <Field label="الأمراض المزمنة" hint="كل واحد في سطر، زي: ضغط، سكر، غدة.">
        <TextArea name="chronic_conditions" defaultValue={health.chronic_conditions.join("\n")} />
      </Field>
      <Field label="الأدوية اللي بتاخدها" hint="اسم الدوا والتركيز لو تعرفه، كل دوا في سطر.">
        <TextArea name="medications" defaultValue={health.medications.join("\n")} />
      </Field>
      <Field label="حساسية من أدوية">
        <TextArea name="allergies" defaultValue={health.allergies.join("\n")} rows={2} />
      </Field>
      <label className="flex items-start gap-2.5 rounded-xl bg-mint px-4 py-3">
        <input type="checkbox" name="share_with_assistant" defaultChecked={health.share_with_assistant} className="mt-1 size-5 shrink-0 accent-[var(--green)]" />
        <span>
          <b className="block font-medium">المساعد الدوائي يستخدم ملفي</b>
          <span className="text-sm text-muted">عشان ينبهك لو دوا مش مناسب مع أمراضك أو أدويتك. تقدر تقفلها في أي وقت.</span>
        </span>
      </label>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "بنحفظ…" : "حفظ الملف"}
        </Button>
      </div>
    </form>
  );
}
