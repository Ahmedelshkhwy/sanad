import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HealthForm, type Health } from "./HealthForm";
import { clearHealthProfile } from "./actions";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/ui/Field";

export const metadata: Metadata = { title: "ملفي الصحي" };

async function Profile() {
  const user = await requireUser("/profile");
  const supabase = await createClient();
  const { data } = await supabase
    .from("health_profiles")
    .select("birth_year, sex, pregnant, chronic_conditions, medications, allergies, share_with_assistant")
    .eq("user_id", user.id)
    .single();

  const health: Health = data ?? {
    birth_year: null,
    sex: null,
    pregnant: false,
    chronic_conditions: [],
    medications: [],
    allergies: [],
    share_with_assistant: false,
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:gap-10">
      <section className="rounded-[20px] border border-line bg-surface p-5">
        <HealthForm health={health} />
      </section>
      <aside className="grid content-start gap-4">
        <div className="grid gap-2 rounded-[20px] bg-green p-5 text-on-green">
          <b className="flex items-center gap-2 font-medium">
            <Icon name="lock" size={20} />
            ملفك خاص بيك
          </b>
          <p className="text-sm opacity-90">محدش يشوفه غيرك، ومش بيظهر في المجتمع أو منشوراتك. كل الخانات اختيارية.</p>
        </div>
        <form action={clearHealthProfile}>
          <button type="submit" className="text-sm text-urgent underline underline-offset-4">
            امسح كل بيانات الملف
          </button>
        </form>
      </aside>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 md:py-14">
      <PageHeader title="ملفي الصحي" lead="سجّل اللي تحب من أمراضك وأدويتك والحساسية، عشان المساعد ينبهك لو دوا مش مناسب ليك." />
      <Suspense fallback={<p className="text-muted">بنحمّل ملفك…</p>}>
        <Profile />
      </Suspense>
    </section>
  );
}
