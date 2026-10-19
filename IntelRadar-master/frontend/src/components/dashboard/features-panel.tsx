import { Boxes } from "lucide-react";

import { cn } from "@/lib/utils";
import { maturityClass, type Competitor } from "@/lib/dashboard";
import { Reveal } from "./motion";
import { Panel, PanelBody, PanelHeader } from "./primitives";

export function FeaturesPanel({ competitor }: { competitor: Competitor }) {
  const features = competitor.key_features ?? [];

  return (
    <Reveal>
      <Panel id="features" className="scroll-mt-36">
        <PanelHeader
          icon={Boxes}
          tone="blue"
          title="Key features"
          description={`Capability map for ${competitor.competitor_name}, including maturity and strategic relevance.`}
          action={
            features.length ? (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
                {features.length} mapped
              </span>
            ) : null
          }
        />
        {features.length ? (
          <PanelBody className="border-t border-border p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Feature
                    </th>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Maturity
                    </th>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Why it matters
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {features.map((feature, i) => (
                    <tr key={i} className="transition-colors hover:bg-muted/50">
                      <th scope="row" className="px-6 py-4 text-left align-top font-semibold">
                        {feature.feature}
                      </th>
                      <td className="px-6 py-4 align-top">
                        <span className="inline-flex rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground/80">
                          {feature.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold",
                            maturityClass(feature.maturity)
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                          {feature.maturity}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top leading-relaxed text-foreground/80">
                        {feature.strategic_edge}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelBody>
        ) : (
          <PanelBody>
            <p className="text-sm text-muted-foreground">No features recorded.</p>
          </PanelBody>
        )}
      </Panel>
    </Reveal>
  );
}
