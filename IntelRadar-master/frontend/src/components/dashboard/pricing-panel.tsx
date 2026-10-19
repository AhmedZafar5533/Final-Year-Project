import { BadgeDollarSign, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Competitor } from "@/lib/dashboard";
import { Reveal } from "./motion";
import { Panel, PanelBody, PanelHeader } from "./primitives";

export function PricingPanel({ competitor }: { competitor: Competitor }) {
  const tiers = competitor.pricing_tiers ?? [];

  return (
    <Reveal>
      <Panel id="pricing" className="scroll-mt-36">
        <PanelHeader
          icon={BadgeDollarSign}
          tone="amber"
          title="Pricing"
          description={`Plans and packaging for ${competitor.competitor_name}.`}
        />
        {tiers.length ? (
          <PanelBody className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tiers.map((tier, i) => (
              <article
                key={i}
                className={cn(
                  "flex flex-col rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgb(20_48_58/0.3)] sm:p-5",
                  i === 0
                    ? "border-primary/40 bg-primary/[0.06]"
                    : "border-border bg-background/60 hover:border-foreground/20"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{tier.plan}</h3>
                  {i === 0 ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      Entry plan
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-display text-3xl leading-none font-bold tracking-tight tabular-nums sm:text-4xl">
                    {tier.price}
                  </span>
                  {tier.billing_period ? (
                    <span className="text-xs text-muted-foreground">{tier.billing_period}</span>
                  ) : null}
                </p>
                {tier.highlights?.length ? (
                  <ul className="mt-4 space-y-2 border-t border-border pt-4">
                    {tier.highlights.map((h, j) => (
                      <li key={j} className="flex gap-2 text-sm leading-relaxed text-foreground/85">
                        <Check className="mt-1 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                        {h}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                    No inclusions listed.
                  </p>
                )}
              </article>
            ))}
          </PanelBody>
        ) : (
          <PanelBody>
            <p className="text-sm text-muted-foreground">No pricing data found.</p>
          </PanelBody>
        )}
      </Panel>
    </Reveal>
  );
}
