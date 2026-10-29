"use client";

import { useActionState } from "react";
import { applyProvider, respond, saveMyProvider, sendNote } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, TextInput } from "@/components/ui/Field";
import { RegionChecks, RegionSelect } from "@/components/RegionSelect";
import type { RegionOption } from "@/lib/regions";
import { idle, type FormState } from "@/lib/form";

export function ApplyForm({ regions }: { regions: RegionOption[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(applyProvider, idle);
  return (
    <form action={action} className="grid gap-4">
      <Field label="اسم الصيدلية">
        <TextInput name="name" required maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="المنطقة">
          <RegionSelect options={regions} required />
        </Field>
        <Field label="العنوان">
          <TextInput name="address" maxLength={200} />
        </Field>
        <Field label="تليفون الصيدلية">
          <TextInput name="phone" required inputMode="tel" dir="ltr" maxLength={20} />
        </Field>
        <Field label="واتساب" hint="اختياري. هيظهر لصاحب الطلب لما تأكّد إن الدوا عندك.">
          <TextInput name="whatsapp" inputMode="tel" dir="ltr" maxLength={20} />
        </Field>
        <Field label="رقم ترخيص الصيدلية">
          <TextInput name="license_no" maxLength={60} />
        </Field>
      </div>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "بنبعت…" : "ابعت طلب الانضمام"}
        </Button>
      </div>
    </form>
  );
}

export function RespondForm({ requestId, providerId, response, note }: { requestId: string; providerId: string; response: string | null; note: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(respond.bind(null, requestId, providerId), idle);
  return (
    <form action={action} className="grid gap-2">
      <TextInput name="note" defaultValue={note} maxLength={300} placeholder="ملاحظة لصاحب الطلب (اختياري)، زي السعر أو البديل المتاح" className="!py-2 text-sm" />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="response" value="available" variant={response === "available" ? "primary" : "ghost"} disabled={pending} className="!min-h-10 text-sm">
          متوفر عندي
        </Button>
        <Button type="submit" name="response" value="unavailable" variant="ghost" disabled={pending} className={`!min-h-10 text-sm ${response === "unavailable" ? "!ring-urgent" : ""}`}>
          مش متوفر
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function ProfileForm({
  providerId,
  address,
  phone,
  whatsapp,
  coverage,
  regions,
}: {
  providerId: string;
  address: string;
  phone: string | null;
  whatsapp: string | null;
  coverage: string[];
  regions: RegionOption[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveMyProvider.bind(null, providerId), idle);
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="العنوان">
          <TextInput name="address" defaultValue={address} maxLength={200} />
        </Field>
        <Field label="التليفون">
          <TextInput name="phone" defaultValue={phone ?? ""} inputMode="tel" dir="ltr" maxLength={20} />
        </Field>
        <Field label="واتساب">
          <TextInput name="whatsapp" defaultValue={whatsapp ?? ""} inputMode="tel" dir="ltr" maxLength={20} />
        </Field>
      </div>
      <div className="grid gap-1.5">
        <span className="text-sm font-medium">المناطق اللي بتخدمها</span>
        <RegionChecks options={regions} selected={coverage} />
      </div>
      <FormMessage state={state} />
      <div>
        <Button type="submit" variant="ghost" disabled={pending}>
          احفظ
        </Button>
      </div>
    </form>
  );
}

export function NoteForm({ requestId, providerId }: { requestId: string; providerId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendNote.bind(null, requestId, providerId), idle);
  return (
    <form action={action} className="grid gap-2">
      <TextInput name="note" required minLength={2} maxLength={300} placeholder="سؤال أو ملاحظة لصاحب الطلب" className="!py-2 text-sm" />
      <FormMessage state={state} />
      <Button type="submit" variant="ghost" disabled={pending} className="justify-self-start !min-h-10 text-sm">
        {pending ? "بنبعت…" : "ابعت ملاحظة"}
      </Button>
    </form>
  );
}
