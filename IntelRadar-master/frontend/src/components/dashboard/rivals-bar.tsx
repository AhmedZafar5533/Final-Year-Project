import { cn } from "@/lib/utils";
import type { Competitor } from "@/lib/dashboard";
import { rivalColor, rivalOrder } from "./primitives";

/**
 * Tracked competitors as a row of pills under the header. Each dot uses the
 * same color the competitor has on the positioning map, and the threat score
 * sits in its own small tag so the numbers line up across pills.
 */
export function RivalsBar({
  competitors,
  selectedId,
  onSelect,
}: {
  competitors: Competitor[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (competitors.length === 0) return null;
  const ordered = rivalOrder(competitors, selectedId);

  return (
    <nav aria-label="Tracked competitors" className="mb-6 flex flex-wrap gap-2 sm:mb-8">
      {competitors.map((comp) => {
        const active = comp.id === selectedId;
        const color = rivalColor(ordered.findIndex((c) => c.id === comp.id));
        return (
          <button
            key={comp.id}
            type="button"
            onClick={() => onSelect(comp.id)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-full border py-1.5 pr-1.5 pl-3.5 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "border-border bg-card text-foreground shadow-[0_1px_2px_rgb(20_48_58/0.08),0_6px_16px_-8px_rgb(20_48_58/0.2)]"
                : "border-transparent bg-card/50 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground"
            )}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="max-w-[9.5rem] truncate">{comp.competitor_name}</span>
            <span
              className={cn(
                "min-w-7 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums",
                active ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
              )}
            >
              {comp.threat_score ?? "–"}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
