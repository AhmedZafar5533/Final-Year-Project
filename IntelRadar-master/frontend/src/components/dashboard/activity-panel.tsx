import { History } from "lucide-react";

import type { Competitor } from "@/lib/dashboard";
import { Reveal } from "./motion";
import { Panel, PanelBody, PanelHeader } from "./primitives";

export function ActivityPanel({ competitor }: { competitor: Competitor }) {
  const movements = competitor.recent_movements ?? [];

  return (
    <Reveal>
      <Panel id="activity" className="scroll-mt-36">
        <PanelHeader
          icon={History}
          tone="violet"
          title="Recent moves"
          description={`Signals detected in ${competitor.competitor_name}'s latest scan.`}
        />
        {movements.length ? (
          <PanelBody>
            <ol>
              {movements.map((move, i) => (
                <li key={i} className="flex gap-3 sm:gap-4">
                  {/* Timeline rail: hollow dots on a hairline */}
                  <div className="flex flex-col items-center">
                    <span
                      className="mt-1.5 size-3 shrink-0 rounded-full border-2 border-primary bg-card ring-4 ring-primary/10"
                      aria-hidden="true"
                    />
                    {i < movements.length - 1 ? (
                      <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 pb-6 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <time className="text-xs font-medium text-muted-foreground tabular-nums">
                        {move.date}
                      </time>
                      {move.type ? (
                        <span className="inline-flex w-fit items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                          {move.type}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm font-semibold">{move.headline}</p>
                    <p className="mt-0.5 max-w-[72ch] text-sm leading-relaxed text-foreground/80">
                      {move.impact}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </PanelBody>
        ) : (
          <PanelBody>
            <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
          </PanelBody>
        )}
      </Panel>
    </Reveal>
  );
}
