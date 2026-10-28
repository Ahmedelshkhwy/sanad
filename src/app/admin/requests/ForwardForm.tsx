"use client";

import { useActionState } from "react";
import { forwardRequest } from "./actions";
import { Button } from "@/components/ui/Button";
import { FormMessage, inputClass } from "@/components/ui/Field";
import { idle, type FormState } from "@/lib/form";

export function ForwardForm({ requestId, current, pharmacies }: { requestId: string; current: string | null; pharmacies: { id: string; name: string; area: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(forwardRequest.bind(null, requestId), idle);
  if (!pharmacies.length) return null;
  return (
    <form action={action} className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <select name="partner_id" defaultValue={current ?? ""} required className={`${inputClass} min-w-0 flex-1`} aria-label="الصيدلية">
          <option value="" disabled>
            حوّل لصيدلية…
          </option>
          {pharmacies.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.area ? ` · ${p.area}` : ""}
            </option>
          ))}
        </select>
        <Button type="submit" variant="ghost" disabled={pending} className="!min-h-10 text-sm">
          {pending ? "بنحوّل…" : "حوّل"}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
