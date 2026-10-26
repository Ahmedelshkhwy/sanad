import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Suspense } from "react";
import { NAV } from "@/lib/nav";
import { LoginLink, UserMenu } from "@/components/UserMenu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-transparent bg-paper/90 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-7 px-4 py-3">
        <Link href="/" aria-label="سَنَد، الرئيسية">
          <Logo />
        </Link>
        <nav aria-label="الأقسام" className="ms-auto hidden md:block">
          <ul className="flex items-center gap-6 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="py-1.5 text-muted transition-colors hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ms-auto flex items-center gap-2 md:ms-0">
          <Suspense fallback={<LoginLink />}>
            <UserMenu />
          </Suspense>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
