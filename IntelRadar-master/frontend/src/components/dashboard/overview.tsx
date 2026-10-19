import {
  Activity,
  BadgeDollarSign,
  Boxes,
  Clock,
  Crosshair,
  Download,
  ExternalLink,
  FileDown,
  Image as ImageIcon,
  Smile,
  Sparkles,
} from "lucide-react";

import { formatScannedAt, type Competitor } from "@/lib/dashboard";
import { downloadCompetitorReport } from "@/lib/report";
import { exportReportPdf } from "@/lib/report-html";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";
import { Panel, PanelBody, PanelHeader, ThreatBadge } from "./primitives";
import { PositioningMap } from "./positioning-map";
import { StatCard } from "./stat-card";
import { ThreatBreakdown } from "./threat-breakdown";

export function Overview({
  competitor,
  competitors,
  onSelectCompetitor,
  onViewCapture,
}: {
  competitor: Competitor;
  competitors: Competitor[];
  onSelectCompetitor: (id: string) => void;
  onViewCapture: () => void;
}) {
  const entryTier = competitor.pricing_tiers?.[0];
  const sentiment = competitor.radar_metrics?.user_sentiment;
  const featureCount = competitor.key_features?.length ?? 0;
  const movementCount = competitor.recent_movements?.length ?? 0;
  const vulnerabilities = competitor.vulnerabilities_to_exploit ?? [];
  const topWeakness = vulnerabilities[0];

  const stats = [
    {
      label: "Entry price",
      value: entryTier?.price ?? "—",
      hint: entryTier?.billing_period || "No pricing tier found",
      icon: BadgeDollarSign,
      tone: "amber" as const,
    },
    {
      label: "User sentiment",
      value: sentiment ?? "—",
      hint: "Out of 100",
      progress: typeof sentiment === "number" ? sentiment : undefined,
      icon: Smile,
      tone: "primary" as const,
    },
    {
      label: "Key features",
      value: featureCount,
      hint: featureCount === 1 ? "Capability mapped" : "Capabilities mapped",
      icon: Boxes,
      tone: "blue" as const,
    },
    {
      label: "Recent moves",
      value: movementCount,
      hint: movementCount === 1 ? "Movement tracked" : "Movements tracked",
      icon: Activity,
      tone: "violet" as const,
    },
  ];

  return (
    <section id="overview" className="scroll-mt-36 space-y-8">
      {/* Hero: identity and the biggest opening on the left, the market map on the right */}
      <div className="relative grid grid-cols-1 items-start gap-8 lg:grid-cols-[5fr_7fr] lg:gap-11">
        <div
          className="dot-grid pointer-events-none absolute -top-8 -left-6 hidden h-72 w-[46%] lg:block"
          aria-hidden="true"
        />

        <Reveal className="relative min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {competitor.category ? (
              <span className="rounded-full bg-secondary px-3 py-1 text-[13px] font-medium text-secondary-foreground">
                {competitor.category}
              </span>
            ) : null}
            <ThreatBadge level={competitor.threat_level} />
          </div>

          <h1 className="font-display text-[clamp(38px,9vw,84px)] leading-[0.92] font-bold tracking-[-0.04em] text-balance break-words">
            {competitor.competitor_name}
          </h1>
          {competitor.tagline ? (
            <p className="mt-4 max-w-[34ch] text-lg leading-snug text-muted-foreground">
              {competitor.tagline}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {competitor.target_url ? (
              <a
                href={competitor.target_url}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 rounded-full bg-card")}
              >
                Visit site
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
            {competitor.live_screenshot_url ? (
              <button
                type="button"
                onClick={onViewCapture}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 rounded-full")}
              >
                <ImageIcon className="size-3.5" aria-hidden="true" />
                View browser capture
              </button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReportPdf(competitor)}
              className="gap-1.5 rounded-full bg-card"
            >
              <FileDown className="size-3.5" aria-hidden="true" />
              Export PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadCompetitorReport(competitor)}
              className="gap-1.5 rounded-full"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Markdown
            </Button>
            <span className="inline-flex items-center gap-1.5 px-2 text-[13px] text-muted-foreground">
              <Clock className="size-3.5" aria-hidden="true" />
              {formatScannedAt(competitor.last_scanned_at)}
            </span>
          </div>

          {topWeakness ? (
            <div className="mt-8 rounded-2xl border border-critical/25 bg-critical/[0.06] p-4 sm:p-5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-critical">
                <Crosshair className="size-4" aria-hidden="true" />
                Biggest opening
              </p>
              <p className="mt-2 font-display text-[1.375rem] leading-snug font-semibold tracking-tight text-balance">
                {topWeakness}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {vulnerabilities.length > 1 ? (
                  <span className="text-muted-foreground">
                    {vulnerabilities.length - 1} more weak{" "}
                    {vulnerabilities.length - 1 === 1 ? "spot" : "spots"} to compete on
                  </span>
                ) : null}
                <a
                  href="#sentiment"
                  className="font-medium text-critical underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  See all weak spots
                </a>
              </div>
            </div>
          ) : null}
        </Reveal>

        <Reveal delay={80} className="min-w-0">
          <PositioningMap
            key={competitor.id}
            competitors={competitors}
            selected={competitor}
            onSelect={onSelectCompetitor}
          />
        </Reveal>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Reveal key={stat.label} delay={120 + i * 40} className="h-full">
            <StatCard
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              progress={stat.progress}
              icon={stat.icon}
              tone={stat.tone}
            />
          </Reveal>
        ))}
      </div>

      {/* Score breakdown + brief */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[5fr_7fr]">
        <Reveal delay={200} className="h-full min-w-0">
          <ThreatBreakdown competitor={competitor} />
        </Reveal>

        <Reveal delay={240} className="h-full min-w-0">
          <Panel className="h-full">
            <PanelHeader
              icon={Sparkles}
              title="Strategic brief"
              description="Summarised from the latest scan."
            />
            <PanelBody>
              <p className="max-w-[68ch] text-[15px] leading-7 text-foreground/90">
                {competitor.strategic_summary || "No summary yet. Run a scan to generate one."}
              </p>
            </PanelBody>
          </Panel>
        </Reveal>
      </div>
    </section>
  );
}
