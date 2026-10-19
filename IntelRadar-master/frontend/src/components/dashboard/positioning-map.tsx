"use client";

import { useState } from "react";
import { Radar } from "lucide-react";
import {
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { cn } from "@/lib/utils";
import { METRICS, type Competitor } from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader, Segmented, SegmentedItem, rivalColor, rivalOrder } from "./primitives";

/* Two views, each pairing two of the five signals. */
const VIEW_PAIRS: [number, number][] = [
  [0, 1],
  [2, 3],
];

const AXIS_TICKS = [0, 25, 50, 75, 100];
const shorten = (name: string, max = 20) => (name.length > max ? `${name.slice(0, max - 1)}…` : name);

type Point = {
  id: string;
  name: string;
  x: number;
  y: number;
  threat: number;
  color: string;
};

function PositioningTooltip({
  active,
  payload,
  xLabel,
  yLabel,
}: Partial<TooltipContentProps<number, string>> & { xLabel: string; yLabel: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as Point | undefined;
  if (!p) return null;

  return (
    <div className="min-w-40 rounded-xl border border-border bg-popover px-3 py-2.5 text-xs shadow-[0_12px_28px_-12px_rgb(20_48_58/0.35)]">
      <p className="flex items-center gap-1.5 font-semibold text-popover-foreground">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
        {p.name}
      </p>
      <dl className="mt-1.5 space-y-1">
        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <dt>{xLabel}</dt>
          <dd className="font-semibold text-foreground tabular-nums">{p.x}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <dt>{yLabel}</dt>
          <dd className="font-semibold text-foreground tabular-nums">{p.y}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border pt-1 text-muted-foreground">
          <dt>Threat score</dt>
          <dd className="font-semibold text-foreground tabular-nums">{p.threat}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Every tracked competitor plotted on two of the five signals, built on
 * Recharts so it scales cleanly from a handful of rivals to a few dozen:
 * bubbles never carry a permanent label (that is what made the map unreadable
 * once several competitors were tracked), hovering or focusing a bubble
 * raises it and fills in the readout bar, and the full roster lives in a
 * wrapping legend underneath that stays usable at any count.
 *
 * Remount with `key={selected.id}` so the readout starts on the selection.
 */
export function PositioningMap({
  competitors,
  selected,
  onSelect,
}: {
  competitors: Competitor[];
  selected: Competitor;
  onSelect: (id: string) => void;
}) {
  const views = VIEW_PAIRS.filter(([, y]) => METRICS[y]).map(([x, y]) => ({
    x: METRICS[x],
    y: METRICS[y],
  }));
  const [viewIndex, setViewIndex] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  const view = views[viewIndex] ?? views[0];
  const ordered = rivalOrder(competitors, selected.id);

  const points: Point[] = view
    ? ordered
        .map((c, i) => ({
          id: c.id,
          name: c.competitor_name,
          threat: c.threat_score ?? 0,
          color: rivalColor(i),
          x: c.radar_metrics?.[view.x.key] as number | undefined,
          y: c.radar_metrics?.[view.y.key] as number | undefined,
        }))
        .filter(
          (p): p is Point => typeof p.x === "number" && typeof p.y === "number"
        )
    : [];

  const active = points.find((p) => p.id === activeId) ?? points.find((p) => p.id === selected.id);
  const hidden = ordered.length - points.length;

  const renderPoint = (props: unknown) => {
    const { cx, cy, payload } = props as { cx?: number; cy?: number; payload: Point };
    if (typeof cx !== "number" || typeof cy !== "number") return null;

    const isActive = payload.id === active?.id;
    const isSelected = payload.id === selected.id;
    const r = 8 + Math.sqrt(Math.max(payload.threat, 0)) * 1.5;

    return (
      <g
        key={payload.id}
        role="button"
        tabIndex={0}
        aria-label={`${payload.name}, threat ${payload.threat}`}
        aria-pressed={isActive}
        className="cursor-pointer outline-none"
        onMouseEnter={() => setActiveId(payload.id)}
        onFocus={() => setActiveId(payload.id)}
        onClick={() => setActiveId(payload.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActiveId(payload.id);
          }
        }}
      >
        {isSelected ? (
          <circle
            cx={cx}
            cy={cy}
            r={r + 5}
            fill="none"
            stroke={payload.color}
            strokeWidth={1.5}
            strokeDasharray="2 4"
            opacity={0.6}
          />
        ) : null}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={payload.color}
          fillOpacity={isActive ? 0.55 : 0.2}
          stroke={payload.color}
          strokeWidth={isActive ? 2.5 : 1.5}
        />
      </g>
    );
  };

  return (
    <Panel>
      <PanelHeader
        icon={Radar}
        title="Where each rival stands"
        description="Bubble size is threat score. Hover, focus or pick a rival below for its numbers."
        action={
          views.length > 1 ? (
            <Segmented role="group" aria-label="Map axes">
              {views.map((v, i) => (
                <SegmentedItem key={i} active={i === viewIndex} onClick={() => setViewIndex(i)}>
                  {v.x.label} / {v.y.label}
                </SegmentedItem>
              ))}
            </Segmented>
          ) : null
        }
      />
      <PanelBody className="space-y-4">
        {view && points.length ? (
          <>
            <div className="h-70 w-full sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                  <ReferenceArea
                    x1={50}
                    x2={100}
                    y1={50}
                    y2={100}
                    fill="var(--primary)"
                    fillOpacity={0.06}
                    stroke="none"
                  />
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" />
                  <ReferenceLine x={50} stroke="var(--border)" strokeDasharray="2 4" />
                  <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="2 4" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[0, 100]}
                    ticks={AXIS_TICKS}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    label={{
                      value: view.x.label,
                      position: "insideBottom",
                      offset: -6,
                      fontSize: 12,
                      fill: "var(--muted-foreground)",
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={[0, 100]}
                    ticks={AXIS_TICKS}
                    width={34}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    label={{
                      value: view.y.label,
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 12,
                      fill: "var(--muted-foreground)",
                    }}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
                    content={<PositioningTooltip xLabel={view.x.label} yLabel={view.y.label} />}
                  />
                  <Scatter data={points} shape={renderPoint} isAnimationActive animationDuration={600} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {active ? (
              <div
                aria-live="polite"
                className="flex min-h-11 flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm"
              >
                <b className="flex items-center gap-1.5" style={{ color: active.color }}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: active.color }} aria-hidden="true" />
                  {active.name}
                </b>
                <span className="text-muted-foreground">
                  Threat{" "}
                  <span className="font-semibold text-foreground tabular-nums">{active.threat}</span>
                </span>
                <span className="text-muted-foreground">
                  {view.x.label} <span className="font-semibold text-foreground tabular-nums">{active.x}</span>
                </span>
                <span className="text-muted-foreground">
                  {view.y.label} <span className="font-semibold text-foreground tabular-nums">{active.y}</span>
                </span>
                {active.id !== selected.id ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto rounded-full"
                    onClick={() => onSelect(active.id)}
                  >
                    Open profile
                  </Button>
                ) : null}
              </div>
            ) : null}

            {/* Full roster as a wrapping legend. Works whether there are two
                competitors or two dozen, unlike inline chart labels. */}
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
              {points.map((p) => {
                const isActive = p.id === active?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveId(p.id)}
                    onMouseEnter={() => setActiveId(p.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      isActive
                        ? "border-border bg-card text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color }}
                      aria-hidden="true"
                    />
                    <span className="max-w-35 truncate">{shorten(p.name)}</span>
                    <span className="font-semibold text-foreground tabular-nums">{p.threat}</span>
                  </button>
                );
              })}
            </div>

            {hidden > 0 ? (
              <p className="text-xs text-muted-foreground">
                {hidden} tracked {hidden === 1 ? "competitor has" : "competitors have"} no signal
                scores yet and {hidden === 1 ? "is" : "are"} not plotted.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Run a scan to score {selected.competitor_name} on the five signals and place it on the
            map.
          </p>
        )}
      </PanelBody>
    </Panel>
  );
}
