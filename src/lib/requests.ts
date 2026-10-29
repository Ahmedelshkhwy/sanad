export const STATUSES = ["pending_review", "approved", "published", "available", "completed", "rejected", "expired", "cancelled"] as const;
export type RequestStatus = (typeof STATUSES)[number];

/** Statuses that still need someone to act; the rest are final. */
export const OPEN_STATUSES: RequestStatus[] = ["pending_review", "approved", "published", "available"];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending_review: "قيد المراجعة",
  approved: "تمت الموافقة",
  published: "منشور للصيدليات",
  available: "تم تأكيد التوافر",
  completed: "مكتمل",
  rejected: "مرفوض",
  expired: "منتهي",
  cancelled: "ملغي",
};

export const STATUS_TONE: Record<RequestStatus, string> = {
  pending_review: "bg-mint text-green",
  approved: "bg-mint text-green",
  published: "bg-sun-soft text-ink",
  available: "bg-green text-on-green",
  completed: "bg-line text-muted",
  rejected: "bg-urgent-soft text-urgent",
  expired: "bg-line text-muted",
  cancelled: "bg-line text-muted",
};

export function isStatus(s: string): s is RequestStatus {
  return (STATUSES as readonly string[]).includes(s);
}

export function isOpen(s: string) {
  return (OPEN_STATUSES as string[]).includes(s);
}

/** Shown wherever a pharmacy's "available" reply appears. */
export const NOT_A_RESERVATION = "تأكيد التوافر مش حجز: الدوا كان موجود وقت رد الصيدلية، وممكن يخلص قبل ما توصل. كلّمهم الأول.";
