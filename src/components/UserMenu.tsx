import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { buttonClass } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { count } = await supabase.from("provider_members").select("provider_id", { count: "exact", head: true }).eq("user_id", user.id);
  return (
    <div className="flex items-center gap-2">
      {user.role !== "user" && (
        <Link href="/admin" className="hidden text-sm text-muted hover:text-ink sm:inline">
          الإدارة
        </Link>
      )}
      {!!count && (
        <Link href="/portal" className="text-sm text-muted hover:text-ink">
          صيدليتي
        </Link>
      )}
      <Link href="/account" className={buttonClass("ghost", "!min-h-10 !px-4 text-sm max-w-[9rem] truncate")}>
        {name}
      </Link>
    </div>
  );
}
