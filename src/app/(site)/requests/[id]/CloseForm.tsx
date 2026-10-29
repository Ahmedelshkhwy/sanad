"use client";

import { useActionState } from "react";
import { closeRequest } from "../actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { idle, type FormState } from "@/lib/form";

export function CloseForm({ requestId, canComplete }: { requestId: string; canComplete: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(closeRequest.bind(null, requestId), idle);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {canComplete && (
        <Button type="submit" name="status" value="completed" disabled={pending} className="!min-h-10 text-sm">
          لقيت الدوا
        </Button>
      )}
      <Button type="submit" name="status" value="cancelled" variant="ghost" disabled={pending} className="!min-h-10 text-sm">
        مبقتش محتاجه
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
