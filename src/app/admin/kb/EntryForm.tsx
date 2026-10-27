"use client";

import { useActionState } from "react";
import { rebuildIndex, saveEntry } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, TextArea, TextInput, inputClass } from "@/components/ui/Field";
import { idle, type FormState } from "@/lib/form";

export type Entry = {
  id: string;
  question: string;
  answer: string;
  source: string;
  level: string;
  approved: boolean;
  notes: string;
  alternatives: string;
};

export function EntryForm({ entry }: { entry: Entry | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveEntry.bind(null, entry?.id ?? null), idle);
  return (
    <form action={action} className="grid gap-4">
      <Field label="السؤال">
        <TextInput name="question" required defaultValue={entry?.question} maxLength={300} />
      </Field>
      <Field label="صيغ تانية لنفس السؤال" hint="كل صيغة في سطر. كل ما تكتر، المساعد يلاقي الإجابة أسهل.">
        <TextArea name="alternatives" rows={4} defaultValue={entry?.alternatives} />
      </Field>
      <Field label="الإجابة">
        <TextArea name="answer" required rows={7} defaultValue={entry?.answer} maxLength={4000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="المصدر">
          <TextInput name="source" defaultValue={entry?.source} maxLength={200} />
        </Field>
        <Field label="المستوى">
          <select name="level" defaultValue={entry?.level ?? "normal"} className={inputClass}>
            <option value="normal">عادي</option>
            <option value="pharmacist">محتاج انتباه صيدلي</option>
          </select>
        </Field>
      </div>
      <Field label="ملاحظات داخلية">
        <TextInput name="notes" defaultValue={entry?.notes} maxLength={500} />
      </Field>
      <label className="flex items-center gap-2.5 rounded-xl bg-mint px-4 py-3">
        <input type="checkbox" name="approved" defaultChecked={entry?.approved} className="size-5 accent-[var(--green)]" />
        <span className="font-medium">معتمدة: المساعد يستخدمها</span>
      </label>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "بنحفظ ونفهرس…" : "حفظ"}
        </Button>
      </div>
    </form>
  );
}

export function RebuildButton() {
  const [state, action, pending] = useActionState<FormState, FormData>(rebuildIndex, idle);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <Button type="submit" variant="ghost" disabled={pending} className="!min-h-10 text-sm">
        {pending ? "بنفهرس…" : "حدّث الفهرس"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
