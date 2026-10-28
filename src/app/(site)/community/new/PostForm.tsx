"use client";

import { useActionState } from "react";
import { createPost } from "../actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, TextArea, TextInput } from "@/components/ui/Field";
import { idle, type FormState } from "@/lib/form";

export function PostForm({ displayName, pseudonym, ask }: { displayName: string; pseudonym: string | null; ask: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPost, idle);
  const options = [
    { value: "name", label: displayName ? `باسمي (${displayName})` : "باسمي" },
    ...(pseudonym ? [{ value: "pseudonym", label: `باسمي المستعار (${pseudonym})` }] : []),
    { value: "anonymous", label: "من غير اسم" },
  ];
  return (
    <form action={action} className="grid gap-4">
      <Field label={ask ? "محتاج إيه؟" : "العنوان"}>
        <TextInput name="title" required minLength={3} maxLength={140} />
      </Field>
      <Field label={ask ? "احكي حالتك" : "المنشور"}>
        <TextArea name="body" required maxLength={5000} rows={6} />
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">تنشر</legend>
        {options.map((o, i) => (
          <label key={o.value} className="flex items-center gap-2.5">
            <input type="radio" name="as" value={o.value} defaultChecked={ask ? o.value === "anonymous" : i === 0} className="size-5 accent-[var(--green)]" />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "بننشر…" : "انشر"}
        </Button>
      </div>
    </form>
  );
}
