"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { sendLoginLink, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const failed = params.get("error") === "link";
  const [state, action, pending] = useActionState<LoginState, FormData>(sendLoginLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div role="status" className="grid gap-2 rounded-2xl border border-line bg-surface p-5">
        <b className="font-medium">بعتنالك رابط الدخول</b>
        <p className="text-muted">
          افتح الإيميل اللي وصل على <span dir="ltr">{state.email}</span> ودوس على الرابط من نفس الجهاز ده. لو مش لاقيه، بص في الرسائل المزعجة.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      {failed && (
        <p role="alert" className="rounded-xl bg-urgent-soft px-4 py-2.5 text-sm">
          الرابط ده انتهى أو اتستخدم قبل كده. اطلب رابط جديد.
        </p>
      )}
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">الإيميل</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          className="rounded-xl border-[1.5px] border-line bg-surface px-4 py-3 text-start outline-none transition focus:border-green-2 focus:ring-4 focus:ring-green-2/15"
        />
      </label>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-urgent">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "بنبعت الرابط…" : "ابعتلي رابط الدخول"}
      </Button>
      <p className="text-sm text-muted">مفيش كلمة سر. هيوصلك رابط على الإيميل، ولو أول مرة هيتعملك حساب.</p>
    </form>
  );
}
