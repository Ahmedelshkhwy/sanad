import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { buttonClass } from "@/components/ui/Button";

export function LoginLink() {
  return (
    <Link href="/login" className={buttonClass("ghost", "!min-h-10 !px-4 text-sm")}>
      دخول
    </Link>
  );
}

/** Reads the session, so it always renders inside a Suspense boundary. */
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return <LoginLink />;
  const name = user.displayName || user.pseudonym || "حسابي";
  return (
    <div className="flex items-center gap-2">
      {user.role !== "user" && (
        <Link href="/admin" className="hidden text-sm text-muted hover:text-ink sm:inline">
          الإدارة
        </Link>
      )}
      <Link href="/account" className={buttonClass("ghost", "!min-h-10 !px-4 text-sm max-w-[9rem] truncate")}>
        {name}
      </Link>
    </div>
  );
}
