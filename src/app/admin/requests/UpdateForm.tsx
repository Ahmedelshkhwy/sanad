"use client";

import { useActionState } from "react";
import { updateRequest } from "./actions";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextArea, inputClass } from "@/components/ui/Field";
import { STATUSES, STATUS_LABEL } from "@/lib/requests";
import { idle, type FormState } from "@/lib/form";

export function UpdateForm({ requestId, current }: { requestId: string; current: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateRequest.bind(null, requestId), idle);
  return (
    <form action={action} className="grid gap-2">
      <select name="status" defaultValue={current} className={inputClass} aria-label="الحالة">
        {STATUSES.filter((s) => s !== "new").map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <TextArea name="note" rows={2} maxLength={1000} aria-label="رسالة للمستخدم" />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="justify-self-start !min-h-10 text-sm">
        {pending ? "بنبعت…" : "حدّث وبلّغ المستخدم"}
      </Button>
    </form>
  );
}
