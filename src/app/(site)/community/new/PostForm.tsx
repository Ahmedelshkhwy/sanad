"use client";

import { useActionState } from "react";
import { createPost } from "../actions";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage, TextArea, TextInput } from "@/components/ui/Field";
import { idle, type FormState } from "@/lib/form";

export function PostForm({ pseudonym }: { pseudonym: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPost, idle);
  return (
    <form action={action} className="grid gap-4">
      <Field label="العنوان">
        <TextInput name="title" required minLength={3} maxLength={140} />
      </Field>
      <Field label="المنشور">
        <TextArea name="body" required maxLength={5000} rows={6} />
      </Field>
      {pseudonym ? (
        <label className="flex items-center gap-2.5">
          <input type="checkbox" name="pseudonym" className="size-5 accent-[var(--green)]" />
          <span>انشر باسمي المستعار ({pseudonym})</span>
        </label>
      ) : (
        <p className="text-sm text-muted">عايز تنشر باسم مستعار؟ اكتبه في صفحة حسابك الأول.</p>
      )}
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "بننشر…" : "انشر"}
        </Button>
      </div>
    </form>
  );
}
