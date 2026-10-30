import type { FormState } from "@/lib/form";

/** The codes our database functions raise, in words the user understands. */
const MESSAGES: Record<string, string> = {
  forbidden: "مش مسموح لك تعمل ده.",
  not_found: "الطلب ده مش موجود.",
  invalid_input: "البيانات مش كاملة.",
  invalid_transition: "حالة الطلب اتغيّرت. حدّث الصفحة وجرّب تاني.",
  no_providers: "مفيش صيدليات موثّقة بتغطي المنطقة دي. اختار صيدليات بنفسك أو ضيف تغطية.",
  closed: "الطلب ده اتقفل ومبقاش بيستقبل ردود.",
  already_pending: "عندك طلب انضمام لسه بيتراجع.",
  no_account: "مفيش حساب على سَنَد بالرقم ده. خلّيه يسجّل الأول.",
  too_many: "وصلت للحد المسموح النهارده. جرّب تاني بكرة، ولو الموضوع مستعجل كلّم فريق سَنَد.",
};

/** Turns a Supabase error into a form message; unknown errors get the fallback. */
export function dbError(error: { message?: string } | null, fallback: string): FormState {
  return { status: "error", message: (error?.message && MESSAGES[error.message]) || fallback };
}
