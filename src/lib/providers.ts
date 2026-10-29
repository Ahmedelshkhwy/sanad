export const KIND: Record<string, string> = { pharmacy: "صيدلية", clinic: "عيادة", lab: "معمل", radiology: "مركز أشعة", organization: "جهة" };

export const PROVIDER_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "بيتراجع", tone: "bg-sun-soft text-ink" },
  verified: { label: "موثّق", tone: "bg-green text-on-green" },
  suspended: { label: "موقوف", tone: "bg-urgent-soft text-urgent" },
  rejected: { label: "مرفوض", tone: "bg-line text-muted" },
};
