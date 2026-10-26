import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "الدخول" };

export default function LoginPage() {
  return (
    <section className="mx-auto grid w-full max-w-md gap-6 px-4 py-12 md:py-20">
      <div className="grid gap-2">
        <h1 className="text-3xl font-bold">ادخل على سَنَد</h1>
        <p className="text-muted">عشان تسجّل ملفك الصحي، وتتابع طلباتك، وتشارك في المجتمع.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </section>
  );
}
