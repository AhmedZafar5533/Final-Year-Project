import { Globe, MessageSquareWarning, Swords } from "lucide-react";

import { cn } from "@/lib/utils";
import { severityClass, type Competitor } from "@/lib/dashboard";
import { Reveal } from "./motion";
import { Panel, PanelBody, PanelHeader } from "./primitives";

export function SentimentPanel({ competitor }: { competitor: Competitor }) {
  const vulnerabilities = competitor.vulnerabilities_to_exploit ?? [];
  const complaints = competitor.customer_complaints ?? [];

  /* Count complaints per severity so the header can show the mix at a glance. */
  const mix = complaints.reduce<Record<string, number>>((acc, c) => {
    const key = (c.severity ?? "unknown").toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section id="sentiment" className="grid scroll-mt-36 grid-cols-1 gap-6 lg:grid-cols-2">
      <Reveal className="h-full min-w-0">
        <Panel className="h-full">
          <PanelHeader
            icon={Swords}
            tone="coral"
            title="How to compete"
            description="Weak spots worth attacking in your positioning and sales."
          />
          <PanelBody>
            {vulnerabilities.length ? (
              <ol className="space-y-2.5">
                {vulnerabilities.map((vuln, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm leading-relaxed"
                  >
                    <span
                      className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-critical/10 text-[11px] font-bold text-critical tabular-nums"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className="text-foreground/90">{vuln}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No weak spots found in this scan.</p>
            )}
          </PanelBody>
        </Panel>
      </Reveal>

      <Reveal delay={60} className="h-full min-w-0">
        <Panel className="h-full">
          <PanelHeader
            icon={MessageSquareWarning}
            tone="amber"
            title="What customers complain about"
            description="Recurring issues, most severe first."
            action={
              complaints.length ? (
                <ul className="flex flex-wrap justify-end gap-1.5">
                  {Object.entries(mix).map(([severity, count]) => (
                    <li
                      key={severity}
                      className={cn(
                        "rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold capitalize tabular-nums",
                        severityClass(severity)
                      )}
                    >
                      {count} {severity}
                    </li>
                  ))}
                </ul>
              ) : null
            }
          />
          <PanelBody>
            {complaints.length ? (
              <ul className="divide-y divide-border">
                {complaints.map((c, i) => (
                  <li key={i} className="py-4 first:pt-0 last:pb-0">
                    <p className="text-sm leading-relaxed">{c.issue}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 font-semibold capitalize",
                          severityClass(c.severity)
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                        {c.severity} severity
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Globe className="size-3" aria-hidden="true" />
                        {c.source}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No customer complaints found.</p>
            )}
          </PanelBody>
        </Panel>
      </Reveal>
    </section>
  );
}
