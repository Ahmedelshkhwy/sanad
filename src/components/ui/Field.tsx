import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl border-[1.5px] border-line bg-surface px-4 py-2.5 outline-none transition focus:border-green-2 focus:ring-4 focus:ring-green-2/15";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function TextArea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function FormMessage({ state }: { state: { status: string; message?: string } }) {
  if (!state.message) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-urgent" : "text-sm text-green-2"}>
      {state.message}
    </p>
  );
}

export function PageHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="grid gap-2">
      <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] font-bold">{title}</h1>
      {lead && <p className="max-w-[60ch] text-muted">{lead}</p>}
    </div>
  );
}
