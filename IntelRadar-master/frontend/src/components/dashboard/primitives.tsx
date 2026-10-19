"use client";

import type React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { threatStyle } from "@/lib/dashboard";

/** Chart palette slot for the nth rival. The selected competitor is always slot 0. */
export const rivalColor = (index: number) => `var(--chart-${(index % 5) + 1})`;

/** Selected competitor first, everyone else in their original order. */
export function rivalOrder<T extends { id: string }>(list: T[], selectedId?: string): T[] {
  const selected = list.find((c) => c.id === selectedId);
  return selected ? [selected, ...list.filter((c) => c.id !== selected.id)] : list;
}

/* ---------- Icon chips ---------- */

export type Tone = "primary" | "amber" | "coral" | "blue" | "violet" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  amber: "bg-chart-2/15 text-chart-2",
  coral: "bg-chart-3/15 text-chart-3",
  blue: "bg-chart-4/15 text-chart-4",
  violet: "bg-chart-5/15 text-chart-5",
  neutral: "bg-muted text-muted-foreground",
};

/** Small tinted square that carries a section or KPI icon. */
export function IconChip({
  icon: Icon,
  tone = "primary",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn("grid size-9 shrink-0 place-items-center rounded-xl", TONE_CLASS[tone], className)}
      aria-hidden="true"
    >
      <Icon className="size-[18px]" />
    </span>
  );
}

/* ---------- Panels ---------- */

/**
 * Surface used for report widgets: a white card with a hairline border and a
 * two-layer shadow (a tight contact shadow plus a soft, wide one) so panels
 * lift gently off the tinted page.
 */
export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(20_48_58/0.05),0_12px_28px_-16px_rgb(20_48_58/0.14)]",
        className
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  description,
  action,
  icon,
  tone = "primary",
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-4 pt-5 pb-4 sm:px-6 sm:pt-6",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        {icon ? <IconChip icon={icon} tone={tone} /> : null}
        <div className="min-w-0">
          <h2 className="font-display text-lg leading-snug font-bold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 max-w-[62ch] text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="max-w-full min-w-0 overflow-x-auto">{action}</div> : null}
    </header>
  );
}

/**
 * Sits under a PanelHeader, so it carries no top padding.
 *
 * Pass `flush` for content that manages its own padding edge to edge (tables,
 * list rows, grids). It zeroes the body padding at every breakpoint, which a
 * plain `p-0` in `className` cannot do once the base padding becomes
 * responsive.
 */
export function PanelBody({
  className,
  flush = false,
  ...props
}: React.ComponentProps<"div"> & { flush?: boolean }) {
  return (
    <div
      className={cn("flex-1", flush ? "p-0" : "px-4 pb-5 sm:px-6 sm:pb-6", className)}
      {...props}
    />
  );
}

/* ---------- Meter ---------- */

/**
 * Horizontal 0-100 bar. `markers` draws one tick per rival so a single bar
 * shows where the selected competitor sits against the others.
 */
export function Meter({
  value,
  markers,
  className,
  trackClassName,
}: {
  value?: number;
  markers?: { value?: number; className?: string; label?: string }[];
  className?: string;
  trackClassName?: string;
}) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div
      className={cn("relative h-2 w-full rounded-full bg-muted", trackClassName)}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-700 ease-out",
          className
        )}
        style={{ width: `${v}%` }}
      />
      {markers?.map((m, i) =>
        typeof m.value === "number" ? (
          <span
            key={i}
            title={m.label}
            className={cn(
              "absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card",
              m.className
            )}
            style={{ left: `${Math.max(0, Math.min(100, m.value))}%` }}
            aria-hidden="true"
          />
        ) : null
      )}
    </div>
  );
}

/** Pill with a small colored dot, so the level is readable without relying on color. */
export function ThreatBadge({ level, className }: { level?: string; className?: string }) {
  const style = threatStyle(level);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[13px] font-semibold text-foreground",
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.bar)} aria-hidden="true" />
      {style.label}
    </span>
  );
}

/** Small muted heading used above titles. */
export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("text-xs font-medium text-muted-foreground", className)}>{children}</p>;
}

/* ---------- Segmented control ---------- */

export function Segmented({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("inline-flex items-center gap-0.5 rounded-full bg-muted p-1", className)}
      {...props}
    />
  );
}

export function SegmentedItem({
  active,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60",
        active
          ? "bg-card text-foreground shadow-[0_1px_2px_rgb(20_48_58/0.14)] ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}

/** Colored dot reflecting the live state of the intelligence engine. */
export function StatusDot({ status }: { status: "checking" | "online" | "offline" }) {
  const tone =
    status === "online" ? "bg-success" : status === "offline" ? "bg-critical" : "bg-muted-foreground";
  return (
    <span
      className={cn("size-1.5 rounded-full", tone, status === "online" && "status-dot")}
      aria-hidden="true"
    />
  );
}
