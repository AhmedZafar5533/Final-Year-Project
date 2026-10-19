"use client";

import { Gauge } from "lucide-react";

import { cn } from "@/lib/utils";
import { METRICS, type Competitor } from "@/lib/dashboard";
import { CountUp } from "./motion";
import { Meter, Panel, PanelBody, PanelHeader, ThreatBadge } from "./primitives";

/* A 270 degree dial. The arc is colored by how dangerous the score is. */
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SWEEP = 0.75;

function scoreTone(score: number) {
  if (score >= 70) return "text-critical";
  if (score >= 40) return "text-warning";
  return "text-success";
}

function ScoreDial({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const track = CIRCUMFERENCE * SWEEP;
  const filled = track * (clamped / 100);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[200px]">
      <svg viewBox="0 0 140 140" className="size-full -rotate-[225deg]" aria-hidden="true">
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${track} ${CIRCUMFERENCE}`}
        />
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          className={cn("transition-[stroke-dasharray] duration-700 ease-out", scoreTone(clamped))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
        <span className="font-display text-5xl leading-none font-bold tracking-tighter tabular-nums">
          <CountUp value={clamped} />
        </span>
        <span className="mt-1 text-xs text-muted-foreground">out of 100</span>
      </div>
    </div>
  );
}

/**
 * The threat score and the signals behind it. A competitor is dangerous where
 * it scores high, so the strongest signals come first.
 */
export function ThreatBreakdown({ competitor }: { competitor: Competitor }) {
  const score = competitor.threat_score ?? 0;
  const rows = METRICS.map((m) => ({
    label: m.label,
    value: competitor.radar_metrics?.[m.key] as number | undefined,
  }))
    .filter((r): r is { label: string; value: number } => typeof r.value === "number")
    .sort((a, b) => b.value - a.value);

  return (
    <Panel className="h-full">
      <PanelHeader
        icon={Gauge}
        tone="coral"
        title="What drives the score"
        description="Strongest signals first, 0 (vulnerable) to 100 (dominant)."
      />
      <PanelBody>
        <ScoreDial score={score} />
        <div className="mt-3 flex justify-center">
          <ThreatBadge level={competitor.threat_level} />
        </div>

        {rows.length ? (
          <ul className="mt-6 space-y-3.5 border-t border-border pt-5">
            {rows.map((r) => (
              <li
                key={r.label}
                className="grid grid-cols-[minmax(0,6rem)_1fr_2rem] items-center gap-2.5 text-sm sm:grid-cols-[8rem_1fr_2rem] sm:gap-3"
              >
                <span className="truncate">{r.label}</span>
                <Meter value={r.value} trackClassName="h-1.5" />
                <span className="text-right font-semibold tabular-nums">{r.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">No signal scores in this scan.</p>
        )}
      </PanelBody>
    </Panel>
  );
}
