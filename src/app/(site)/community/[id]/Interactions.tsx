"use client";

import { useActionState, useRef, useEffect } from "react";
import { addComment, reportContent } from "../actions";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextArea, inputClass } from "@/components/ui/Field";
import { idle, type FormState } from "@/lib/form";

export function CommentForm({ postId, pseudonym }: { postId: string; pseudonym: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addComment.bind(null, postId), idle);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "ok") formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="grid gap-3">
      <label htmlFor="comment" className="text-sm font-medium">
        تعليقك
      </label>
      <TextArea id="comment" name="body" required maxLength={2000} />
      {pseudonym && (
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" name="pseudonym" className="size-4 accent-[var(--green)]" />
          باسمي المستعار ({pseudonym})
        </label>
      )}
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "بنضيف…" : "علّق"}
        </Button>
      </div>
    </form>
  );
}

export function ReportButton({ postId, commentId }: { postId: string; commentId?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reportContent, idle);
  if (state.status === "ok") return <span className="text-xs text-green-2">{state.message}</span>;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted hover:text-ink">بلّغ</summary>
      <form action={action} className="mt-2 grid gap-2 rounded-xl border border-line bg-surface p-3">
        <input type="hidden" name="post_id" value={postId} />
        {commentId && <input type="hidden" name="comment_id" value={commentId} />}
        <select name="reason" required defaultValue="" className={inputClass} aria-label="سبب البلاغ">
          <option value="" disabled>
            السبب
          </option>
          <option value="misinformation">معلومة غلط أو مضللة</option>
          <option value="personal_data">بيانات شخصية لحد</option>
          <option value="abuse">إساءة</option>
          <option value="other">حاجة تانية</option>
        </select>
        <FormMessage state={state} />
        <Button type="submit" variant="ghost" disabled={pending} className="justify-self-start !min-h-9 text-sm">
          ابعت البلاغ
        </Button>
      </form>
    </details>
  );
}
