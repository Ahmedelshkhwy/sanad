"use client";

import { useActionState } from "react";
import { saveAccount } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, TextInput } from "@/components/ui/Field";
import { idle, type FormState } from "@/lib/form";

export function AccountForm({ displayName, pseudonym, area }: { displayName: string; pseudonym: string; area: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAccount, idle);
  return (
    <form action={action} className="grid gap-4">
      <Field label="اسمك">
        <TextInput name="display_name" defaultValue={displayName} required maxLength={60} autoComplete="name" />
      </Field>
      <Field label="اسم مستعار للمجتمع" hint="لو كتبته، تقدر تنشر بيه بدل اسمك.">
        <TextInput name="pseudonym" defaultValue={pseudonym} maxLength={40} />
      </Field>
      <Field label="القرية أو المدينة">
        <TextInput name="area" defaultValue={area} maxLength={80} />
      </Field>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "بنحفظ…" : "حفظ"}
        </Button>
      </div>
    </form>
  );
}
