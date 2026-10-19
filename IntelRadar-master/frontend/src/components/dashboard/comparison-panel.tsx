import { ArrowDown, ArrowUp, GitCompareArrows, Minus } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { METRICS, type Competitor } from "@/lib/dashboard";
import { CountUp, Reveal } from "./motion";
import { Meter, Panel, PanelBody, PanelHeader } from "./primitives";

/* Rivals get the same colors on the bars and on the radar: saffron, then coral.
   The selected competitor is always the primary (persian green). */
const RIVAL_TICKS = ["bg-chart-2", "bg-chart-3"];

export function ComparisonPanel({
  selected,
  comparisonList,
}: {
  selected: Competitor;
  comparisonList: Competitor[];
}) {
  const others = comparisonList.filter((c) => c.id !== selected.id);

  /* Series keys are simple slugs so competitor names with spaces never break
     the chart's CSS variables. */
  const chartConfig = Object.fromEntries(
    comparisonList.map((c, i) => [
      `s${i}`,
      { label: c.competitor_name, color: `var(--chart-${i + 1})` },
    ])
  ) as ChartConfig;

  const radarChartData = METRICS.map((m) => ({
    metric: m.label,
    ...Object.fromEntries(
      comparisonList.map((c, i) => [`s${i}`, c.radar_metrics?.[m.key] || 50])
    ),
  }));

  return (
    <Reveal>
      <Panel id="comparison" className="scroll-mt-36">
        <PanelHeader
          icon={GitCompareArrows}
          tone="blue"
          title="Competitive position"
          description={
            others.length
              ? `Compared on five signals with ${others
                  .map((o) => o.competitor_name)
                  .join(" and ")} — same market segment.`
              : `Five signals scored from 0 (vulnerable) to 100 (dominant). No other ${
                  selected.segment || selected.category || "same-market"
                } competitor is tracked yet, so this shows ${selected.competitor_name} on its own.`
          }
        />
        <PanelBody className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-10">
          {/* Metric breakdown */}
          <div className="flex flex-col gap-6">
            {others.length > 0 ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {selected.competitor_name}
                </li>
                {others.map((o, i) => (
                  <li key={o.id} className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "size-2.5 shrink-0 rounded-full",
                        RIVAL_TICKS[i] ?? "bg-muted-foreground"
                      )}
                      aria-hidden="true"
                    />
                    {o.competitor_name}
                  </li>
                ))}
              </ul>
            ) : null}

            {METRICS.map((m) => {
              const value = selected.radar_metrics?.[m.key];
              /* How far the selected competitor sits from the rivals' average. */
              const rivalValues = others
                .map((o) => o.radar_metrics?.[m.key])
                .filter((v): v is number => typeof v === "number");
              const delta =
                typeof value === "number" && rivalValues.length
                  ? Math.round(value - rivalValues.reduce((a, b) => a + b, 0) / rivalValues.length)
                  : null;
              const DeltaIcon = delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
              /* Ahead of rivals means more dangerous; behind means an opening. */
              const deltaTone =
                delta === null || delta === 0
                  ? "bg-muted text-muted-foreground"
                  : delta > 0
                    ? "bg-critical/10 text-critical"
                    : "bg-success/10 text-success";
              return (
                <div key={m.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {m.label}
                      {delta !== null ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                            deltaTone
                          )}
                        >
                          <DeltaIcon className="size-3" aria-hidden="true" />
                          {Math.abs(delta)} vs rivals
                        </span>
                      ) : null}
                    </span>
                    <span className="font-display text-2xl leading-none font-bold tabular-nums">
                      {typeof value === "number" ? <CountUp value={value} /> : "–"}
                    </span>
                  </div>
                  <div className="my-2.5">
                    <Meter
                      value={value}
                      markers={others.map((o, i) => ({
                        value: o.radar_metrics?.[m.key],
                        className: RIVAL_TICKS[i],
                        label: `${o.competitor_name} ${o.radar_metrics?.[m.key] ?? "–"}`,
                      }))}
                    />
                  </div>
                  {others.length > 0 ? (
                    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                      {others.map((o, i) => (
                        <span key={o.id} className="inline-flex items-center gap-1.5">
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              RIVAL_TICKS[i] ?? "bg-muted-foreground"
                            )}
                            aria-hidden="true"
                          />
                          {o.competitor_name}{" "}
                          <span className="font-semibold text-foreground">
                            {o.radar_metrics?.[m.key] ?? "–"}
                          </span>
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Radar */}
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square w-full max-w-[320px] sm:max-w-[420px]"
          >
            <RadarChart data={radarChartData}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12.5 }} />
              <PolarGrid stroke="var(--border)" />
              {comparisonList.map((c, i) => (
                <Radar
                  key={c.id}
                  dataKey={`s${i}`}
                  stroke={`var(--color-s${i})`}
                  fill={`var(--color-s${i})`}
                  fillOpacity={i === 0 ? 0.22 : 0.08}
                  strokeWidth={i === 0 ? 2.5 : 1.75}
                  animationDuration={900}
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </RadarChart>
          </ChartContainer>
        </PanelBody>
      </Panel>
    </Reveal>
  );
}
