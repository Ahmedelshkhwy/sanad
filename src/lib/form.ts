export type FormState = { status: "idle" | "ok" | "error"; message?: string };

export const idle: FormState = { status: "idle" };

/** "a، b\nc" -> ["a", "b", "c"]: one item per line or comma, trimmed, no blanks, capped. */
export function toList(value: FormDataEntryValue | null, max = 20): string[] {
  return String(value ?? "")
    .split(/[\n,،؛;]+/)
    .map((s) => s.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, max);
}

export function text(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}
