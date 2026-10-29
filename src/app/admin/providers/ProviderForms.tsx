"use client";

import { useActionState } from "react";
import { addMember, addProvider, saveProvider, setProviderStatus } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, TextInput, inputClass } from "@/components/ui/Field";
import { RegionChecks, RegionSelect } from "@/components/RegionSelect";
import { KIND } from "@/lib/providers";
import type { RegionOption } from "@/lib/regions";
import { idle, type FormState } from "@/lib/form";

const small = "!min-h-10 text-sm";

export function AddProviderForm({ regions }: { regions: RegionOption[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addProvider, idle);
  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-3">
      <Field label="الاسم">
        <TextInput name="name" required maxLength={120} />
      </Field>
      <Field label="النوع">
        <select name="kind" className={inputClass}>
          {Object.entries(KIND).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="المنطقة">
        <RegionSelect options={regions} />
      </Field>
      <Field label="العنوان">
        <TextInput name="address" maxLength={200} />
      </Field>
      <Field label="التليفون">
        <TextInput name="phone" inputMode="tel" dir="ltr" maxLength={20} />
      </Field>
      <Field label="واتساب">
        <TextInput name="whatsapp" inputMode="tel" dir="ltr" maxLength={20} />
      </Field>
      <div className="flex items-center gap-3 md:col-span-3">
        <Button type="submit" disabled={pending} className={small}>
          إضافة
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function StatusForm({ providerId, status }: { providerId: string; status: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setProviderStatus.bind(null, providerId), idle);
  const next = status === "verified" ? [["suspended", "وقّف الحساب"]] : status === "suspended" ? [["verified", "رجّعه"]] : [["verified", "وثّق"], ["rejected", "ارفض"]];
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <TextInput name="note" maxLength={300} placeholder="ملاحظة (اختياري)" className="!w-auto flex-1 !py-1.5 text-sm" />
      {next.map(([value, label]) => (
        <Button key={value} type="submit" name="status" value={value} variant={value === "verified" ? "primary" : "ghost"} disabled={pending} className={small}>
          {label}
        </Button>
      ))}
      <FormMessage state={state} />
    </form>
  );
}

export function EditProviderForm({
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
  const [state, action, pending] = useActionState<FormState, FormData>(saveProvider.bind(null, providerId), idle);
  return (
    <form action={action} className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <TextInput name="address" defaultValue={address} maxLength={200} placeholder="العنوان" aria-label="العنوان" />
        <TextInput name="phone" defaultValue={phone ?? ""} inputMode="tel" dir="ltr" maxLength={20} placeholder="التليفون" aria-label="التليفون" />
        <TextInput name="whatsapp" defaultValue={whatsapp ?? ""} inputMode="tel" dir="ltr" maxLength={20} placeholder="واتساب" aria-label="واتساب" />
      </div>
      <span className="text-sm font-medium">المناطق اللي بتغطيها</span>
      <RegionChecks options={regions} selected={coverage} />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} variant="ghost" className={`justify-self-start ${small}`}>
        احفظ
      </Button>
    </form>
  );
}

export function MemberForm({ providerId }: { providerId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addMember.bind(null, providerId), idle);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <TextInput name="phone" required inputMode="tel" dir="ltr" maxLength={20} placeholder="رقم موبايل حسابه على سَنَد" className="!w-auto flex-1 !py-1.5 text-sm" />
      <select name="role" className={`${inputClass} !w-auto !py-1.5 text-sm`} aria-label="الدور">
        <option value="owner">صاحب الصيدلية</option>
        <option value="staff">بيشتغل فيها</option>
      </select>
      <Button type="submit" variant="ghost" disabled={pending} className={small}>
        ضيف عضو
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
