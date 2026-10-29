"use client";

import { useActionState } from "react";
import { finishRequest, messageRequest, publishRequest, reviewRequest } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, TextArea, inputClass } from "@/components/ui/Field";
import { RegionSelect } from "@/components/RegionSelect";
import type { RegionOption } from "@/lib/regions";
import { idle, type FormState } from "@/lib/form";

const small = "!min-h-10 text-sm";

export function ReviewForm({
  requestId,
  publicNote,
  region,
  regions,
}: {
  requestId: string;
  publicNote: string;
  region: string | null;
  regions: RegionOption[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(reviewRequest.bind(null, requestId), idle);
  return (
    <form action={action} className="grid gap-2">
      <Field label="المنطقة">
        <RegionSelect options={regions} defaultValue={region} />
      </Field>
      <Field label="اللي هتشوفه الصيدليات" hint="من غير اسم المريض أو رقمه.">
        <TextArea name="public_note" rows={2} maxLength={500} defaultValue={publicNote} />
      </Field>
      <Field label="رسالة للمستخدم" hint="اختياري، ومهم لو هترفض.">
        <TextArea name="note" rows={2} maxLength={1000} />
      </Field>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="approve" disabled={pending} className={small}>
          وافق
        </Button>
        <Button type="submit" name="decision" value="reject" variant="ghost" disabled={pending} className={small}>
          ارفض
        </Button>
      </div>
    </form>
  );
}

export function PublishForm({
  requestId,
  pharmacies,
  first,
}: {
  requestId: string;
  pharmacies: { id: string; name: string; area: string }[];
  first: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(publishRequest.bind(null, requestId), idle);
  return (
    <form action={action} className="grid gap-2">
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">اختار صيدليات بعينها (غير كده هيروح لكل اللي بتغطي المنطقة)</summary>
        <fieldset className="mt-2 grid max-h-48 gap-1 overflow-y-auto rounded-xl border-[1.5px] border-line p-3">
          {pharmacies.map((p) => (
            <label key={p.id} className="flex items-center gap-2">
              <input type="checkbox" name="providers" value={p.id} className="accent-green" />
              {p.name}
              <span className="text-muted">· {p.area}</span>
            </label>
          ))}
        </fieldset>
      </details>
      {first && (
        <label className="flex items-center gap-2 text-sm">
          مدة الطلب
          <select name="days" defaultValue="3" className={`${inputClass} !w-auto !py-1.5`}>
            {[1, 2, 3, 5, 7, 14].map((d) => (
              <option key={d} value={d}>
                {d === 1 ? "يوم" : d === 2 ? "يومين" : `${d} أيام`}
              </option>
            ))}
          </select>
        </label>
      )}
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className={`justify-self-start ${small}`}>
        {pending ? "بننشر…" : first ? "انشر للصيدليات" : "ابعت لصيدليات زيادة"}
      </Button>
    </form>
  );
}

export function FinishForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(finishRequest.bind(null, requestId), idle);
  return (
    <form action={action} className="grid gap-2">
      <TextArea name="note" rows={2} maxLength={1000} aria-label="رسالة للمستخدم" placeholder="رسالة للمستخدم (اختياري)" />
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="status" value="completed" variant="ghost" disabled={pending} className={small}>
          اكتمل
        </Button>
        <Button type="submit" name="status" value="cancelled" variant="ghost" disabled={pending} className={small}>
          إلغاء الطلب
        </Button>
      </div>
    </form>
  );
}

export function MessageForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(messageRequest.bind(null, requestId), idle);
  return (
    <form action={action} className="grid gap-2">
      <TextArea name="note" rows={2} required minLength={2} maxLength={1000} aria-label="رسالة للمستخدم" placeholder="رسالة للمستخدم" />
      <FormMessage state={state} />
      <Button type="submit" variant="ghost" disabled={pending} className={`justify-self-start ${small}`}>
        {pending ? "بنبعت…" : "ابعت للمستخدم"}
      </Button>
    </form>
  );
}
