import type { Metadata } from "next";
import { Suspense } from "react";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "الحسابات" };

const ROLE: Record<string, string> = { user: "مستخدم", pharmacist: "صيدلي", admin: "أدمن" };

async function setRole(id: string, form: FormData) {
  "use server";
  const me = await requireStaff("/admin/users");
  if (me.role !== "admin" || me.id === id) return;
  const role = String(form.get("role"));
  if (!(role in ROLE)) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/admin/users");
}

async function Users() {
  const me = await requireStaff("/admin/users");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, display_name, pseudonym, area, role, created_at").order("created_at", { ascending: false }).limit(200);
  return (
    <ul className="grid gap-2">
      {(data ?? []).map((u) => (
        <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <b className="font-medium">{u.display_name || "بدون اسم"}</b>
          <span className="text-sm text-muted">
            {u.area || "—"} · من {formatDay(u.created_at)}
          </span>
          {me.role === "admin" && me.id !== u.id ? (
            <form action={setRole.bind(null, u.id)} className="ms-auto flex gap-2">
              <select name="role" defaultValue={u.role} aria-label="الدور" className="rounded-full border border-line bg-surface px-3 py-1 text-sm">
                {Object.entries(ROLE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button className="rounded-full bg-green px-3 py-1 text-sm text-on-green">حفظ</button>
            </form>
          ) : (
            <span className="ms-auto rounded-full bg-mint px-2.5 py-0.5 text-xs text-green">{ROLE[u.role]}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function UsersPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">الحسابات</h1>
      <p className="text-sm text-muted">الملفات الصحية مش ظاهرة هنا: محدش يشوفها غير أصحابها.</p>
      <Suspense fallback={<p className="text-muted">بنحمّل…</p>}>
        <Users />
      </Suspense>
    </div>
  );
}
