"use client";

import { motion, useReducedMotion } from "motion/react";

/** Questions per day for the last 7 days; bars grow in once. */
export function WeekChart({ days }: { days: { label: string; total: number; handoff: number }[] }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...days.map((d) => d.total));
  return (
    <figure className="grid gap-3">
      <div className="flex h-44 items-end gap-2" role="img" aria-label={days.map((d) => `${d.label}: ${d.total} سؤال، ${d.handoff} اتحوّلوا`).join("، ")}>
        {days.map((d, i) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-xs tabular-nums text-muted">{d.total}</span>
            <div className="relative flex w-full max-w-10 flex-1 items-end overflow-hidden rounded-t-lg bg-mint">
              <motion.div
                className="w-full rounded-t-lg bg-green-2"
                initial={reduce ? false : { height: 0 }}
                animate={{ height: `${(d.total / max) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <div className="w-full bg-sun" style={{ height: d.total ? `${(d.handoff / d.total) * 100}%` : 0 }} />
              </motion.div>
            </div>
            <span className="text-xs text-muted">{d.label}</span>
          </div>
        ))}
      </div>
      <figcaption className="flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-green-2" /> أسئلة
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-sun" /> اتحوّلت للصيدلي
        </span>
      </figcaption>
    </figure>
  );
}
