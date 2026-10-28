import "server-only";
import { cacheLife, cacheTag } from "next/cache";

export type NetworkPharmacy = { name: string; area: string };

/** Active partner pharmacies for the home page network (names and areas only). */
export async function networkPharmacies(): Promise<NetworkPharmacy[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("pharmacies");
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/network_pharmacies`, {
    method: "POST",
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, "content-type": "application/json" },
    body: "{}",
  }).catch(() => null);
  if (!res?.ok) return [];
  return (await res.json()) as NetworkPharmacy[];
}
