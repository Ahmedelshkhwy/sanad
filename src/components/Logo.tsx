export function LogoMark({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="var(--green)" />
      <path
        d="M11 25.5c0-6 4-10.5 9-10.5s9 4.5 9 10.5"
        fill="none"
        stroke="var(--on-green)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="20" cy="12" r="3.3" fill="var(--sun)" />
      <path d="M15 30h10" stroke="var(--on-green)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ withTagline = true }: { withTagline?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-none">
        <b className="block font-display text-[1.45rem] font-bold text-green">سَنَد</b>
        {withTagline && <small className="block text-[0.72rem] text-muted mt-1">الصحة المجتمعية</small>}
      </span>
    </span>
  );
}
