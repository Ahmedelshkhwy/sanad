import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto grid w-full max-w-md flex-1 content-center gap-4 px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">الصفحة دي مش موجودة</h1>
      <p className="text-muted">يمكن الرابط اتغيّر أو المحتوى اتمسح.</p>
      <div>
        <Link href="/" className={buttonClass("primary")}>
          الرئيسية
        </Link>
      </div>
    </main>
  );
}
