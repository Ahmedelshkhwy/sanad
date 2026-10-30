import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CONTACT, EMERGENCY_NUMBER, NAV } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface pb-28 pt-10 text-sm md:pb-8">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" aria-label="سَنَد، الرئيسية">
            <Logo />
          </Link>
          <p className="mt-3 max-w-[40ch] text-muted">
            منصة صحية مجانية بتبدأ من قريتنا. سَنَد بيساعدك تفهم، لكن مش بديل عن الدكتور أو الصيدلي.
          </p>
          <p className="mt-4 inline-flex items-center gap-3 rounded-xl bg-urgent-soft px-4 py-2">
            في الطوارئ كلّم الإسعاف
            <a href={`tel:${EMERGENCY_NUMBER}`} className="font-display text-xl font-bold text-urgent" dir="ltr">
              {EMERGENCY_NUMBER}
            </a>
          </p>
        </div>
        <div>
          <h4 className="mb-2 font-medium">الخدمات</h4>
          <ul className="grid gap-1.5 text-muted">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 font-medium">تواصل معانا</h4>
          <ul className="grid gap-1.5 text-muted">
            <li>
              <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener" className="hover:text-ink">
                واتساب <span dir="ltr">+{CONTACT.whatsapp}</span>
              </a>
            </li>
            <li>
              <a href={`tel:+${CONTACT.whatsapp}`} className="hover:text-ink">
                اتصل بينا
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className="break-all hover:text-ink" dir="ltr">
                {CONTACT.email}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-2 font-medium">عن سَنَد</h4>
          <ul className="grid gap-1.5 text-muted">
            <li>
              <Link href="/privacy" className="hover:text-ink">
                الخصوصية
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-ink">
                الشروط
              </Link>
            </li>
            <li>
              <Link href="/portal" className="hover:text-ink">
                بوابة الصيدليات
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-8 w-full max-w-6xl border-t border-line px-4 pt-4 text-xs text-muted">© ٢٠٢٦ سَنَد</div>
    </footer>
  );
}
