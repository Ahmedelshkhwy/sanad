"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  next: z.string().regex(/^\/[^/\\]/).catch("/"),
});

export async function sendLoginLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: form.get("email"), next: form.get("next") ?? "/" });
  if (!parsed.success) return { status: "error", message: "اكتب إيميل صحيح." };

  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(parsed.data.next)}` },
  });

  if (error) {
    const tooMany = error.status === 429 || /rate|limit/i.test(error.message);
    return {
      status: "error",
      message: tooMany ? "اتبعتلك روابط كتير في وقت قصير. استنى شوية وجرّب تاني." : "مقدرناش نبعت الرابط. جرّب تاني بعد شوية.",
    };
  }
  return { status: "sent", email: parsed.data.email };
}
