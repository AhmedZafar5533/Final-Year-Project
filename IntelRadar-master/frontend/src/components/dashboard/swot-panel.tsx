import { LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";
import { SWOT_SECTIONS, type Competitor } from "@/lib/dashboard";
import { Reveal } from "./motion";
import { Panel, PanelBody, PanelHeader } from "./primitives";

export function SwotPanel({ competitor }: { competitor: Competitor }) {
  return (
    <Reveal>
      <Panel id="swot" className="scroll-mt-36">
        <PanelHeader
          icon={LayoutGrid}
          tone="blue"
          title="Strengths & weaknesses"
          description={`SWOT analysis for ${competitor.competitor_name}.`}
        />
        <PanelBody flush className="border-t border-border">
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {SWOT_SECTIONS.map((section) => {
              const items = competitor.swot_analysis?.[section.key] ?? [];
              return (
                <div key={section.key} className="relative bg-card p-4 sm:p-6">
                  {/* Each quadrant carries its own color on a short top rule */}
                  <span
                    className={cn("absolute inset-x-0 top-0 h-0.5", section.accent)}
                    aria-hidden="true"
                  />
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <span className={section.tone}>{section.title}</span>
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                      {items.length}
                    </span>
                  </h3>
                  {items.length ? (
                    <ul className="mt-3 space-y-2.5">
                      {items.map((item, i) => (
                        <li
                          key={i}
                          className="flex gap-2.5 text-sm leading-relaxed text-foreground/90"
                        >
                          <span
                            className={cn("mt-2 size-1.5 shrink-0 rounded-full", section.accent)}
                            aria-hidden="true"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Nothing recorded.</p>
                  )}
                </div>
              );
            })}
          </div>
        </PanelBody>
      </Panel>
    </Reveal>
  );
}
