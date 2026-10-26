/**
 * Fixed safety layer that needs no network: emergency phrases always win.
 * Pharmacist hints are passed to the model, they don't force a handoff on their own.
 */
const URGENT = [
  "وجع في صدري", "ألم في الصدر", "صدري واجعني", "ضيق تنفس", "مش قادر اتنفس", "نفسي مقطوع",
  "إغماء", "اغمى عليه", "فقد الوعي", "نزيف", "تشنجات", "بلع حبوب كتير", "جرعة زيادة", "ابتلع",
  "تسمم", "تورم في الوش", "تورم في الشفايف", "مش قادر يتكلم", "شلل", "انتحار", "عايز أموت",
  "شرب الشراب كله", "شرب الدوا كله", "شرب علبة", "بلع علبة", "خد علبة كاملة",
];

const PHARMACIST_HINTS = [
  "حامل", "الحمل", "رضاعة", "بيرضع", "رضيع", "حديث الولادة", "وارفارين", "سيولة", "غسيل كلوي", "فشل كلوي", "تليف الكبد",
];

/** Folds the common Arabic spelling variants so "اُغمي" and "اغمى" match. */
export function normalizeArabic(s: string): string {
  return s
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

const urgentNorm = URGENT.map(normalizeArabic);
const hintNorm = PHARMACIST_HINTS.map(normalizeArabic);

export function findUrgent(question: string): string | null {
  const q = normalizeArabic(question);
  const i = urgentNorm.findIndex((w) => q.includes(w));
  return i >= 0 ? URGENT[i] : null;
}

export function findPharmacistHint(question: string): string | null {
  const q = normalizeArabic(question);
  const i = hintNorm.findIndex((w) => q.includes(w));
  return i >= 0 ? PHARMACIST_HINTS[i] : null;
}
