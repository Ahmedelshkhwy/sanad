import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/requests", label: "طلبات الدوا" },
  { href: "/admin/logs", label: "أسئلة المساعد" },
  { href: "/admin/kb", label: "الإجابات المعتمدة" },
  { href: "/admin/reports", label: "البلاغات" },
  { href: "/admin/providers", label: "الصيدليات" },
  { href: "/admin/regions", label: "المناطق" },
  { href: "/admin/users", label: "الحسابات" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/" aria-label="سَنَد، الرئيسية">
            <Logo withTagline={false} />
          </Link>
          <span className="rounded-full bg-mint px-3 py-0.5 text-xs font-medium text-green">الإدارة</span>
          <div className="ms-auto">
            <ThemeToggle />
          </div>
        </div>
        <nav aria-label="أقسام الإدارة" className="mx-auto w-full max-w-7xl overflow-x-auto px-4">
          <ul className="flex gap-1 pb-2 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block whitespace-nowrap rounded-full px-3 py-1.5 text-muted transition hover:bg-mint hover:text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
