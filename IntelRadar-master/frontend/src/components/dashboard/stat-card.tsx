"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { CountUp } from "./motion";
import { IconChip, type Tone } from "./primitives";

/**
 * KPI tile: label with a tinted icon, big number, optional 0-100 progress bar,
 * hint. Each tile gets its own tone so the row reads as four different things
 * at a glance rather than four identical boxes.
 */
export function StatCard({
  label,
  value,
  hint,
  progress,
  icon,
  tone = "primary",
  className,
}: {
  label: string;
  value: number | ReactNode;
  hint?: ReactNode;
  /** 0-100. Renders a thin bar under the value. */
  progress?: number;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgb(20_48_58/0.05)] transition-shadow hover:shadow-[0_10px_24px_-14px_rgb(20_48_58/0.28)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon ? <IconChip icon={icon} tone={tone} className="size-8 rounded-lg" /> : null}
      </div>

      <div className="mt-3 font-display text-4xl leading-none font-bold tracking-tight tabular-nums">
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </div>

      {typeof progress === "number" ? (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      ) : null}

      {hint ? <div className="mt-2 text-xs text-muted-foreground">{hint}</div> : null}
    </section>
  );
}
