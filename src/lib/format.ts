export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short" });
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "medium" });
}
