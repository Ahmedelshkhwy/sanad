import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "user" | "pharmacist" | "admin";

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string;
  pseudonym: string | null;
  area: string | null;
  phone: string | null;
  role: Role;
};

/** The signed-in user, or null. Verifies the token (getClaims) before trusting it. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, pseudonym, area, role, phone")
    .eq("id", claims.sub)
    .single();

  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    displayName: profile?.display_name ?? "",
    pseudonym: profile?.pseudonym ?? null,
    area: profile?.area ?? null,
    phone: profile?.phone ?? null,
    role: (profile?.role as Role | undefined) ?? "user",
  };
}

/** For pages that need an account: sends visitors to the login page and back. */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireStaff(next: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (user.role === "user") redirect("/");
  return user;
}
