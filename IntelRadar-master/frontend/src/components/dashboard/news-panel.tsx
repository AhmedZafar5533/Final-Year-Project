import { ArrowUpRight, Newspaper } from "lucide-react";

import type { Competitor } from "@/lib/dashboard";
import { Reveal } from "./motion";
import { Panel, PanelBody, PanelHeader } from "./primitives";

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NewsPanel({ competitor }: { competitor: Competitor }) {
  const items = competitor.recent_news ?? [];

  return (
    <Reveal>
      <Panel id="signals" className="scroll-mt-36">
        <PanelHeader
          icon={Newspaper}
          tone="blue"
          title="Recent signals"
          description={`Latest news mentioning ${competitor.competitor_name}, newest first.`}
        />
        {items.length ? (
          <PanelBody flush className="border-t border-border">
            <ul className="divide-y divide-border">
              {items.map((item, i) => (
                <li key={i}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-primary/[0.04] focus-visible:bg-primary/[0.04] focus-visible:outline-none sm:gap-4 sm:px-6"
                  >
                    <time className="hidden w-24 shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums sm:block">
                      {formatDate(item.published)}
                    </time>
                    <div className="min-w-0 flex-1">
                      <time className="mb-1 block text-[11px] text-muted-foreground tabular-nums sm:hidden">
                        {formatDate(item.published)}
                      </time>
                      <p className="text-sm leading-snug font-medium group-hover:text-primary">
                        {item.title}
                      </p>
                      {item.source ? (
                        <span className="mt-1.5 inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {item.source}
                        </span>
                      ) : null}
                    </div>
                    <ArrowUpRight
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </PanelBody>
        ) : (
          <PanelBody>
            <p className="text-sm text-muted-foreground">No recent news found.</p>
          </PanelBody>
        )}
      </Panel>
    </Reveal>
  );
}
