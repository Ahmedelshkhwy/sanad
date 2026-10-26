import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { AccountForm } from "./AccountForm";
import { Icon, type IconName } from "@/components/Icon";
import { PageHeader } from "@/components/ui/Field";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "حسابي" };

const LINKS: { href: string; icon: IconName; label: string }[] = [
  { href: "/profile", icon: "file", label: "ملفي الصحي" },
  { href: "/requests", icon: "pin", label: "طلباتي" },
  { href: "/assistant/history", icon: "chat", label: "أسئلتي للمساعد" },
  { href: "/notifications", icon: "bell", label: "الإشعارات" },
];

async function Account() {
  const user = await requireUser("/account");
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
      <nav aria-label="حسابي" className="grid content-start gap-3">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 transition hover:border-green-2/50 hover:shadow-card"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-mint text-green">
              <Icon name={l.icon} size={20} />
            </span>
            <span className="font-medium">{l.label}</span>
            <Icon name="arrow" size={16} className="ms-auto text-muted" />
          </Link>
        ))}
        <form action="/auth/signout" method="post" className="mt-2">
          <button type="submit" className={buttonClass("ghost", "w-full")}>
            خروج
          </button>
        </form>
      </nav>
      <section aria-labelledby="account-title" className="grid content-start gap-4 rounded-[20px] border border-line bg-surface p-5">
        <h2 id="account-title" className="text-xl font-semibold">
          بياناتك
        </h2>
        {user.email && (
          <p className="text-sm text-muted">
            الإيميل: <span dir="ltr">{user.email}</span>
          </p>
        )}
        <AccountForm displayName={user.displayName} pseudonym={user.pseudonym ?? ""} area={user.area ?? ""} />
      </section>
    </div>
  );
}

export default function AccountPage() {
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 md:py-14">
      <PageHeader title="حسابي" />
      <Suspense fallback={<p className="text-muted">بنحمّل حسابك…</p>}>
        <Account />
      </Suspense>
    </section>
  );
}
