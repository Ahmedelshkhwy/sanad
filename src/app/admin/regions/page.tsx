import type { Metadata } from "next";
import { Suspense } from "react";
import { revalidatePath, updateTag } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/form";
import { REGION_KIND, getRegions, regionOptions, type Region } from "@/lib/regions";
import { RegionSelect } from "@/components/RegionSelect";
import { inputClass } from "@/components/ui/Field";

export const metadata: Metadata = { title: "المناطق" };

async function addRegion(form: FormData) {
  "use server";
  await requireStaff("/admin/regions");
  const name = text(form.get("name"), 80);
  const kind = String(form.get("kind"));
  const parent = String(form.get("region_id") ?? "");
  if (name.length < 2) return;
  const supabase = await createClient();
  await supabase.from("regions").insert({
    name,
    kind: kind in REGION_KIND ? kind : "village",
    parent_id: /^[0-9a-f-]{36}$/.test(parent) ? parent : null,
  });
  updateTag("regions");
  revalidatePath("/admin/regions");
}

async function Regions() {
  await requireStaff("/admin/regions");
  const regions = await getRegions();
  const options = regionOptions(regions);
  const byId = new Map<string, Region>(regions.map((r) => [r.id, r]));
  return (
    <div className="grid gap-6">
      <form action={addRegion} className="grid gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[1.5fr_1fr_1.5fr_auto] md:items-end">
        <label className="grid gap-1 text-sm">
          الاسم
          <input name="name" required maxLength={80} className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm">
          النوع
          <select name="kind" defaultValue="village" className={inputClass}>
            {Object.entries(REGION_KIND).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          تابعة لـ
          <RegionSelect options={options} placeholder="ولا حاجة (محافظة)" />
        </label>
        <button className="rounded-full bg-green px-5 py-2.5 text-on-green">إضافة</button>
      </form>
      <ul className="grid gap-1">
        {options.map((o) => (
          <li key={o.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2" style={{ marginInlineStart: `${o.depth * 1.5}rem` }}>
            <b className="font-medium">{byId.get(o.id)?.name}</b>
            <span className="text-sm text-muted">{REGION_KIND[byId.get(o.id)!.kind]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RegionsPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">المناطق</h1>
      <p className="max-w-[60ch] text-muted">الصيدلية اللي بتغطي مركز بيوصلها طلبات كل القرى اللي تحته.</p>
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <Regions />
      </Suspense>
    </div>
  );
}
