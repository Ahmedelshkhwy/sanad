"use client";

import { useActionState } from "react";
import { resetPin } from "./actions";
import { idle, type FormState } from "@/lib/form";

export function ResetPin({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPin.bind(null, userId), idle);
  if (state.status === "ok") {
    return (
      <span className="rounded-lg bg-sun-soft px-3 py-1 text-sm" role="status">
        {state.message}
      </span>
    );
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <button disabled={pending} className="rounded-full border border-line px-3 py-1 text-sm hover:border-green-2">
        {pending ? "…" : "رقم سري جديد"}
      </button>
      {state.status === "error" && <span className="text-xs text-urgent">{state.message}</span>}
    </form>
  );
}
