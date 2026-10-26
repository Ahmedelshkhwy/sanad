import Link from "next/link";
import { EMERGENCY_NUMBER } from "@/lib/nav";
import { buttonClass } from "@/components/ui/Button";

/** Phone-only quick access: ask the assistant, find a medicine, call emergency. */
export function MobileDock() {
  return (
    <nav
      aria-label="وصول سريع"
      className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-surface/95 px-4 pt-2.5 backdrop-blur-md pb-[calc(0.6rem+env(safe-area-inset-bottom))] md:hidden"
    >
      <Link href="/assistant" className={buttonClass("primary", "flex-1 !min-h-11 !py-2 text-sm")}>
        اسأل عن دوا
      </Link>
      <Link href="/requests" className={buttonClass("ghost", "flex-1 !min-h-11 !py-2 text-sm")}>
        مش لاقي دوا
      </Link>
      <a
        href={`tel:${EMERGENCY_NUMBER}`}
        aria-label={`رقم الإسعاف ${EMERGENCY_NUMBER}`}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-urgent-soft px-4 font-display text-lg font-bold text-urgent"
      >
        {EMERGENCY_NUMBER}
      </a>
    </nav>
  );
}
