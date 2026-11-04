import type { ReactNode } from "react";

export type ShownPhoto = { key: string; url: string; label: string; extra?: ReactNode };

/** Thumbnails that open the full photo in a new tab (links are short-lived). */
export function RequestPhotos({ photos }: { photos: ShownPhoto[] }) {
  if (!photos.length) return null;
  return (
    <ul className="flex flex-wrap gap-3">
      {photos.map((p) => (
        <li key={p.key} className="grid justify-items-start gap-1 text-xs text-muted">
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived storage links */}
            <img src={p.url} alt={p.label} className="size-24 rounded-xl border border-line object-cover" />
          </a>
          <span>{p.label}</span>
          {p.extra}
        </li>
      ))}
    </ul>
  );
}
