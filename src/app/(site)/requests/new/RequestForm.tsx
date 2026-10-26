"use client";

import { useActionState } from "react";
import { createRequest } from "../actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, TextArea, TextInput } from "@/components/ui/Field";
import { idle, type FormState } from "@/lib/form";

export function RequestForm({ area }: { area: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createRequest, idle);
  return (
    <form action={action} className="grid gap-4">
      <Field label="اسم الدوا أو المادة الفعالة" hint="زي اللي مكتوب على العلبة أو الروشتة.">
        <TextInput name="medicine_name" required maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="التركيز" hint="لو تعرفه، زي ٥٠ ميكروجرام.">
          <TextInput name="strength" maxLength={60} />
        </Field>
        <Field label="القرية أو المدينة">
          <TextInput name="area" required maxLength={80} defaultValue={area} />
        </Field>
      </div>
      <Field label="رقم موبايل للتواصل" hint="اختياري. هيظهر للصيدلي بس.">
        <div className="flex gap-1.5" dir="ltr">
          <span className="grid place-items-center rounded-xl border-[1.5px] border-line px-3 text-muted">+20</span>
          <TextInput name="contact_phone" inputMode="tel" maxLength={14} autoComplete="tel-national" className="text-left" />
        </div>
      </Field>
      <Field label="تفاصيل تانية">
        <TextArea name="details" maxLength={1000} />
      </Field>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "بنسجّل الطلب…" : "سجّل الطلب"}
        </Button>
      </div>
    </form>
  );
}
