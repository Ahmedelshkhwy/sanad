import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { VillageScene } from "@/components/VillageScene";
import { LinkButton } from "@/components/ui/Button";
import { EMERGENCY_NUMBER } from "@/lib/nav";
import { networkPharmacies } from "@/lib/pharmacies";

const SERVICES: { href: string; icon: IconName; title: string; text: string }[] = [
  { href: "/assistant", icon: "pill", title: "المساعد الدوائي", text: "اسأل عن استخدام دوا، آثاره الجانبية، وينفع يتاخد مع إيه." },
  { href: "/requests", icon: "pin", title: "البحث عن دوا", text: "دوا مش لاقيه؟ سجّله وتابع طلبك لحد ما يوصلك رد." },
  { href: "/profile", icon: "file", title: "ملفك الصحي", text: "أدويتك وأمراضك المزمنة والحساسية في مكان واحد، لو حبيت تسجّلهم." },
  { href: "/community", icon: "people", title: "المجتمع", text: "اسأل وشارك نصايح صحية مع أهل بلدك، باسمك أو باسم مستعار." },
];

const TRUST: { icon: IconName; title: string; text: string }[] = [
  { icon: "file", title: "كل إجابة عن دوا معاها مصدرها", text: "من إجابات راجعها صيدلي ومراجع دوائية موثوقة." },
  { icon: "people", title: "الحالات المتخصصة بتروح لصيدلي", text: "اللي محتاج تقييم مش بيجاوبه المساعد لوحده." },
  { icon: "alert", title: "مبيشخّصش ومبيكتبش علاج", text: "ولو في خطر عليك، بيوجّهك للإسعاف على طول." },
];

export default async function HomePage() {
  const pharmacies = await networkPharmacies();
  return (
    <>
      <section className="py-8 md:py-16">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 md:grid-cols-[1.05fr_1fr] md:gap-14">
          <div className="grid min-w-0 gap-5">
            <h1 className="text-[clamp(2.3rem,5.2vw,3.9rem)] font-bold leading-[1.3]">
              صحتك أسهل
              <br />
              لما يكون معاك <em className="not-italic text-green underline decoration-sun/50 decoration-[0.14em] underline-offset-[0.18em]">سَنَد</em>
            </h1>
            <p className="max-w-[40ch] text-[1.18rem] text-muted">
              مكان واحد تفهم فيه دواك، وتدوّر على الدوا اللي مش لاقيه، وتسأل أهل بلدك وتتعلّم منهم.
            </p>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/assistant">
                <Icon name="pill" size={18} />
                اسأل عن دوا
              </LinkButton>
              <LinkButton href="/requests" variant="ghost">
                <Icon name="pin" size={18} />
                مش لاقي دوا
              </LinkButton>
              <LinkButton href="/community/new?ask=1" variant="ghost">
                <Icon name="people" size={18} />
                اطلب سَنَد
              </LinkButton>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted">
              <Icon name="alert" size={18} className="shrink-0 text-urgent" />
              حالة طارئة؟ كلّم الإسعاف على{" "}
              <a href={`tel:${EMERGENCY_NUMBER}`} className="font-display text-lg font-bold text-urgent" dir="ltr">
                {EMERGENCY_NUMBER}
              </a>
            </p>
          </div>
          <VillageScene pharmacies={pharmacies.map((p) => p.name)} />
        </div>
      </section>

      <section className="border-y border-line bg-surface py-14 md:py-20" aria-labelledby="services-title">
        <div className="mx-auto w-full max-w-6xl px-4">
          <Reveal className="grid max-w-xl gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-green-2 before:h-0.5 before:w-5 before:rounded before:bg-sun">الخدمات</span>
            <h2 id="services-title" className="text-[clamp(1.75rem,3.4vw,2.35rem)] font-semibold">
              اللي هتقدر تعمله على سَنَد
            </h2>
          </Reveal>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s, i) => (
              <Reveal key={s.href} delay={i * 0.06}>
                <Link
                  href={s.href}
                  className="group grid h-full gap-2.5 rounded-[20px] border border-line bg-surface p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-green-2/50 hover:shadow-card"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-mint text-green transition-[transform,background-color] duration-300 group-hover:-rotate-6 group-hover:scale-105 group-hover:bg-sun-soft">
                    <Icon name={s.icon} size={26} />
                  </span>
                  <h3 className="text-[1.18rem] font-semibold">{s.title}</h3>
                  <p className="text-[0.92rem] text-muted">{s.text}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-green-2">
                    افتح
                    <Icon name="arrow" size={16} className="transition-transform group-hover:-translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20" aria-labelledby="assistant-title">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 md:grid-cols-[0.85fr_1.3fr] md:gap-16">
          <Reveal className="grid content-start gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-green-2 before:h-0.5 before:w-5 before:rounded before:bg-sun">المساعد الدوائي</span>
            <h2 id="assistant-title" className="text-[clamp(1.75rem,3.4vw,2.35rem)] font-semibold">
              اسأله زي ما بتسأل الصيدلي اللي جنبك
            </h2>
            <p className="max-w-[52ch] text-muted">اكتب اسم الدوا أو المادة الفعالة وسؤالك بكلامك العادي، والمساعد يرد عليك بالعامية.</p>
            <div>
              <LinkButton href="/assistant">ابدأ السؤال</LinkButton>
            </div>
          </Reveal>
          <ul className="grid gap-5 self-center">
            {TRUST.map((t, i) => (
              <Reveal key={t.title} delay={i * 0.06}>
                <li className="grid grid-cols-[44px_1fr] items-start gap-3.5">
                  <span className="grid size-11 place-items-center rounded-xl bg-mint text-green">
                    <Icon name={t.icon} size={22} />
                  </span>
                  <span>
                    <b className="block font-medium">{t.title}</b>
                    <span className="text-muted">{t.text}</span>
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
