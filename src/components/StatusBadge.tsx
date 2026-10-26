import { STATUS_LABEL, STATUS_TONE, isStatus } from "@/lib/requests";

export function StatusBadge({ status }: { status: string }) {
  if (!isStatus(status)) return null;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}
