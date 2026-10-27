"use client";

import { useActionState } from "react";
import { changePin } from "./pin-actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { PinInput } from "@/components/ui/PinInput";
import { idle, type FormState } from "@/lib/form";

export function PinForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePin, idle);
  return (
    <form action={action} className="grid gap-4">
      <PinInput name="current" label="الرقم السري الحالي" />
      <PinInput name="pin" label="الرقم السري الجديد" />
      <PinInput name="pin_confirm" label="اكتب الجديد تاني" />
      <FormMessage state={state} />
      <div>
        <Button type="submit" variant="ghost" disabled={pending}>
          {pending ? "بنغيّر…" : "غيّر الرقم السري"}
        </Button>
      </div>
    </form>
  );
}
