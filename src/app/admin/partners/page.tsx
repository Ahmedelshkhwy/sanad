import type { Metadata } from "next";
import { Suspense } from "react";
import { revalidatePath, updateTag } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/form";
import { inputClass } from "@/components/ui/Field";

export const metadata: Metadata = { title: "الصيدليات والجهات" };

const KIND: Record<string, string> = { pharmacy: "صيدلية", clinic: "عيادة", organization: "جهة" };

async function addPartner(form: FormData) {
  "use server";
  await requireStaff("/admin/partners");
  const name = text(form.get("name"), 120);
  if (name.length < 2) return;
  const kind = String(form.get("kind"));
  const supabase = await createClient();
  await supabase.from("partners").insert({
    name,
    kind: kind in KIND ? kind : "pharmacy",
    area: text(form.get("area"), 80),
    phone: text(form.get("phone"), 20) || null,
    notes: text(form.get("notes"), 500),
  });
  updateTag("pharmacies");
  revalidatePath("/admin/partners");
}

async function toggle(id: string, active: boolean) {
  "use server";
  await requireStaff("/admin/partners");
  const supabase = await createClient();
  await supabase.from("partners").update({ active }).eq("id", id);
  updateTag("pharmacies");
  revalidatePath("/admin/partners");
}

async function Partners() {
  await requireStaff("/admin/partners");
  const supabase = await createClient();
  const { data } = await supabase.from("partners").select("id, name, kind, area, phone, active, notes").order("active", { ascending: false }).order("name");
  return (
    <div className="grid gap-6">
      <form action={addPartner} className="grid gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[2fr_1fr_1.2fr_1.2fr_auto] md:items-end">
        <label className="grid gap-1 text-sm">
          الاسم
          <input name="name" required className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm">
          النوع
          <select name="kind" className={inputClass}>
            {Object.entries(KIND).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          المنطقة
          <input name="area" className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm">
          التليفون
          <input name="phone" inputMode="tel" dir="ltr" className={inputClass} />
        </label>
        <button className="rounded-full bg-green px-5 py-2.5 text-on-green">إضافة</button>
      </form>
      {!data?.length ? (
        <p className="text-muted">لسه مفيش جهات متعاونة.</p>
      ) : (
        <ul className="grid gap-2">
          {data.map((p) => (
            <li key={p.id} className={`flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 ${p.active ? "" : "opacity-60"}`}>
              <b className="font-medium">{p.name}</b>
              <span className="text-sm text-muted">
                {KIND[p.kind]} · {p.area || "—"}
              </span>
              {p.phone && (
                <a href={`tel:${p.phone}`} className="text-sm text-green-2" dir="ltr">
                  {p.phone}
                </a>
              )}
              <form action={toggle.bind(null, p.id, !p.active)} className="ms-auto">
                <button className="rounded-full border border-line px-3 py-1 text-sm">{p.active ? "وقّف" : "فعّل"}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PartnersPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">الصيدليات والجهات المتعاونة</h1>
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <Partners />
      </Suspense>
    </div>
  );
}
