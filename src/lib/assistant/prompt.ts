export type KbMatch = { id: string; question: string; answer: string; source: string; level: string; similarity: number };

/** A published doctor consultation from an open dataset: background, not an approved answer. */
export type RefMatch = { id: string; title: string; question: string; answer: string; topic: string; similarity: number };

export type HealthContext = {
  age: number | null;
  sex: string | null;
  pregnant: boolean;
  conditions: string[];
  medications: string[];
  allergies: string[];
};

export type Mode = "approved" | "clarify" | "general" | "pharmacist";

/** The model starts its reply with this line, then writes the answer. */
export const CONTROL_RE = /^\s*<<\s*mode:(approved|clarify|general|pharmacist)\s+ref:(\d+)\s+pharmacist:(yes|no)\s*>>[ \t]*\n?/;

export function buildPrompt(opts: {
  question: string;
  refs: KbMatch[];
  consultations?: RefMatch[];
  health: HealthContext | null;
  allowClarify: boolean;
  allowGeneral: boolean;
  hint: string | null;
}): string {
  const refs = opts.refs.length
    ? opts.refs.map((r, i) => `[${i + 1}] سؤال: ${r.question}\nإجابة معتمدة: ${r.answer}`).join("\n\n")
    : "(مفيش)";

  const consultations = (opts.consultations ?? [])
    .map((c) => `- سؤال: ${c.title}\n  رد الطبيب: ${c.answer.slice(0, 900)}`)
    .join("\n");

  const health = opts.health
    ? [
        opts.health.age ? `السن: ${opts.health.age} سنة` : "",
        opts.health.sex ? `النوع: ${opts.health.sex === "female" ? "أنثى" : "ذكر"}${opts.health.pregnant ? "، حامل" : ""}` : "",
        opts.health.conditions.length ? `أمراض مزمنة: ${opts.health.conditions.join("، ")}` : "",
        opts.health.medications.length ? `أدوية حالية: ${opts.health.medications.join("، ")}` : "",
        opts.health.allergies.length ? `حساسية من: ${opts.health.allergies.join("، ")}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return [
    "إنت مساعد صيدلي في منصة سَنَد الصحية المجانية لقرية مصرية. بترد بالعامية المصرية البسيطة، رد عملي ومختصر، نص عادي من غير علامات تنسيق، وكل نقطة في سطر لوحدها بتبدأ بشرطة -.",
    "",
    "أول سطر في ردك لازم يكون بالشكل ده بالظبط وبعده الرد:",
    "<<mode:MODE ref:N pharmacist:yes|no>>",
    "",
    "MODE واحد من:",
    "- approved: لو واحدة من \"المعلومات المعتمدة\" بتجاوب على نفس الموضوع اللي المستخدم بيسأل عنه (نفس الدوا أو نفس الحالة). N = رقمها، واكتب الرد منها بصياغتك ومتضيفش جرعات أو أدوية مش موجودة فيها. كلمة مشتركة بس (زي \"جفاف\" في جفاف الشعر مقابل جفاف الجسم) مش كفاية.",
    opts.allowClarify
      ? "- clarify: بس لو المقصود مش مفهوم خالص (مفيش دوا ولا عرض ولا حالة واضحة). اكتب من سؤال لتلاتة قصيرين، كل سؤال في سطر بيبدأ بشرطة. لو الموضوع مفهوم حتى لو عام، متختارش clarify."
      : "",
    opts.allowGeneral
      ? "- general: لو مفيش معلومة معتمدة مناسبة والسؤال مفهوم، جاوب من معرفتك الطبية الموثوقة، واستعين بـ\"استشارات أطباء منشورة\" لو فيها حاجة على نفس الموضوع. N = 0."
      : "",
    "- pharmacist: لو مينفعش تجاوب. N = 0 ومتكتبش رد.",
    "",
    "طريقة الرد:",
    "- خاطب المستخدم بصيغة المذكر العامة، إلا لو كلامه أو بياناته بيوضحوا إنه أنثى.",
    "- اتصرف واحسم في الحالات البسيطة: قول يعمل إيه بالظبط، والأدوية اللي بتتباع من غير روشتة المناسبة بالمادة الفعالة، والجرعة المعتادة للكبار زي المكتوبة على العلبة.",
    "- للأطفال: الباراسيتامول والإيبوبروفين جرعتهم بالوزن حسب النشرة. لو الوزن مش معروف، اطلب يراجع الوزن على النشرة.",
    "- قول علامات الخطر اللي تستدعي دكتور في سطر واحد في الآخر. لو فيه خطر دلوقتي (ألم صدر، ضيق نفس، نزيف شديد، إغماء، تشنجات، جرعة زيادة) قول يكلم الإسعاف 123 فورًا.",
    "- متختمش كل رد بنصيحة إنه يكلم الصيدلي. الرد لازم يفيد لوحده.",
    "- متشخّصش أمراض، ومتقترحش أدوية بروشتة (زي المضادات الحيوية والكورتيزون وأدوية الضغط والسكر) كعلاج.",
    health ? "- خد في اعتبارك بيانات المستخدم الصحية تحت، ونبّهه لو الدوا اللي بيسأل عنه ممكن يتعارض مع أدويته أو أمراضه أو حساسيته." : "",
    "",
    "pharmacist = yes بس لو: حامل أو مرضعة بتسأل عن دوا، أو طفل أقل من ٣ شهور، أو مرض مزمن في الكلى أو الكبد مع دوا جديد، أو تداخل بين أدوية مزمنة كتير، أو أعراض مستمرة أو بتزيد، أو محتاج دوا بروشتة. غير كده no.",
    opts.hint ? `ملحوظة: الرسالة فيها كلمة "${opts.hint}"، خد بالك منها.` : "",
    "",
    "المعلومات المعتمدة:",
    refs,
    consultations ? `\nاستشارات أطباء منشورة (مرجع للمعلومة بس، مش إجابات معتمدة، وقواعد الرد فوق أهم منها):\n${consultations}` : "",
    health ? `\nبيانات المستخدم الصحية (شاركها بموافقته):\n${health}` : "",
    "",
    `رسالة المستخدم: ${opts.question}`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}
