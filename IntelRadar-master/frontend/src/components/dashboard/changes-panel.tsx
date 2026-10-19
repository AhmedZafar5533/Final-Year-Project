import { CircleCheck, GitCompareArrows } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Competitor } from "@/lib/dashboard";
import { Reveal } from "./motion";
import { Panel, PanelBody, PanelHeader } from "./primitives";

const SEVERITY_PILL: Record<string, string> = {
  high: "bg-critical/10 text-critical",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
};

export function ChangesPanel({ competitor }: { competitor: Competitor }) {
  const changes = competitor.changes ?? [];

  return (
    <Reveal>
      <Panel id="changes" className="scroll-mt-36">
        <PanelHeader
          icon={GitCompareArrows}
          tone="violet"
          title="Changes since last scan"
          description={
            changes.length
              ? `${changes.length} signal${changes.length === 1 ? "" : "s"} moved.`
              : `No drift detected for ${competitor.competitor_name} yet.`
          }
        />
        <PanelBody>
          {changes.length ? (
            <ul className="divide-y divide-border">
              {changes.map((change, i) => (
                <li key={i} className="flex items-start gap-3 py-3 text-sm first:pt-0 last:pb-0">
                  <span
                    className={cn(
                      "mt-px inline-flex w-20 shrink-0 items-center justify-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold capitalize sm:w-[5.25rem]",
                      SEVERITY_PILL[change.severity] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {change.severity}
                  </span>
                  <span className="min-w-0 leading-relaxed text-foreground/90">{change.summary}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                This is the baseline scan. Future scans will report pricing, feature, threat
                and news changes here.
              </p>
            </div>
          )}
        </PanelBody>
      </Panel>
    </Reveal>
  );
}
