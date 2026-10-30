import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginChooser } from "./LoginChooser";

async function SignedIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [user, { next }] = await Promise.all([getCurrentUser(), searchParams]);
  if (user) redirect(next && /^\/[^/\\]/.test(next) && !next.startsWith("/login") ? next : "/");
  return null;
}

export const metadata: Metadata = { title: "الدخول" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <section className="mx-auto grid w-full max-w-md gap-6 px-4 py-12 md:py-20">
      <div className="grid gap-2">
        <h1 className="text-3xl font-bold">ادخل على سَنَد</h1>
        <p className="text-muted">عشان تسجّل ملفك الصحي، وتتابع طلباتك، وتشارك في المجتمع.</p>
      </div>
      <Suspense>
        <SignedIn searchParams={searchParams as Promise<{ next?: string }>} />
        <LoginChooser />
      </Suspense>
    </section>
  );
}
