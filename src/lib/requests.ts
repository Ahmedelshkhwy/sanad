export const STATUSES = ["new", "reviewing", "searching", "found", "not_found", "closed"] as const;
export type RequestStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  new: "اتسجّل",
  reviewing: "بيتراجع",
  searching: "بندوّر عليه",
  found: "لقيناه",
  not_found: "ملقيناهوش",
  closed: "اتقفل",
};

export const STATUS_TONE: Record<RequestStatus, string> = {
  new: "bg-mint text-green",
  reviewing: "bg-mint text-green",
  searching: "bg-sun-soft text-ink",
  found: "bg-green text-on-green",
  not_found: "bg-urgent-soft text-urgent",
  closed: "bg-line text-muted",
};

export function isStatus(s: string): s is RequestStatus {
  return (STATUSES as readonly string[]).includes(s);
}
