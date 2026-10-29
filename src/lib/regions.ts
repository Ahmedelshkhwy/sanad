import "server-only";
import { cacheLife, cacheTag } from "next/cache";

export type Region = { id: string; name: string; kind: "governorate" | "city" | "village"; parent_id: string | null };
export type RegionOption = { id: string; label: string; depth: number };

export const REGION_KIND: Record<Region["kind"], string> = { governorate: "محافظة", city: "مركز أو مدينة", village: "قرية" };

/** Active regions (public data), cached until an admin edits them. */
export async function getRegions(): Promise<Region[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("regions");
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/regions?select=id,name,kind,parent_id&active=eq.true&order=name`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
  }).catch(() => null);
  if (!res?.ok) return [];
  return (await res.json()) as Region[];
}

/** Tree order for a select: each region after its parent, labelled "قرية، مركز". */
export function regionOptions(regions: Region[]): RegionOption[] {
  const byParent = new Map<string | null, Region[]>();
  for (const r of regions) byParent.set(r.parent_id, [...(byParent.get(r.parent_id) ?? []), r]);
  const out: RegionOption[] = [];
  const walk = (parent: string | null, path: string[], depth: number) => {
    for (const r of byParent.get(parent) ?? []) {
      out.push({ id: r.id, label: [r.name, ...path].join("، "), depth });
      if (depth < 6) walk(r.id, [r.name, ...path], depth + 1);
    }
  };
  walk(null, [], 0);
  return out;
}
