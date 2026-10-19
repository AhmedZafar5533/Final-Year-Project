"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, Menu, Moon, Plus, Radar, RefreshCw, Settings2, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { ENGINES, SECTIONS, type Engine } from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
import { useScrolled, type BackendStatus } from "./hooks";
import { Segmented, SegmentedItem, StatusDot } from "./primitives";

const STATUS_COPY: Record<BackendStatus, string> = {
  checking: "Connecting…",
  online: "Engine online",
  offline: "Engine offline",
};

/* Dark mode is a class on <html>. This reads it without an effect and lets the
   toggle below flip it and remember the choice. */
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const getDark = () => document.documentElement.classList.contains("dark");

function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, getDark, () => false);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("intelradar-theme", next ? "dark" : "light");
    } catch {
      /* storage can be blocked; the toggle still works for this visit */
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className="rounded-full"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

/**
 * Phones get a compact "section picker" instead of the tab strip: nine pills
 * wrap to two or three rows in a sticky header, which eats the top of the
 * screen and makes the report feel cramped. One tap opens the full list in a
 * two-column menu, and the trigger always shows where the reader currently is.
 */
function MobileSectionPicker({ activeSection }: { activeSection: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = SECTIONS.find((section) => section.id === activeSection) ?? SECTIONS[0];

  // Close on outside pointer-down, Escape or scroll, like any other menu.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-section-menu"
        aria-haspopup="true"
        aria-label="Jump to report section"
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Menu className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">Section</span>
        <span className="ml-auto flex min-w-0 items-center gap-1.5">
          <span className="truncate font-semibold text-foreground">{current.label}</span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </span>
      </button>

      {open ? (
        <div
          id="mobile-section-menu"
          className="absolute inset-x-0 top-full z-40 mt-1.5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-popover p-1.5 shadow-[0_16px_32px_-16px_rgb(20_48_58/0.35)]"
        >
          {SECTIONS.map((section) => {
            const active = section.id === activeSection;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setOpen(false)}
                aria-current={active ? "location" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {section.label}
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Two-tier app header. The top row is brand and actions, always a single
 * line. Report sections live in their own row underneath: a compact picker on
 * phones, and a wrapping strip of pills from tablets up, so every section
 * stays one glance or one tap away without sideways scrolling.
 */
export function Topbar({
  engine,
  onSelectEngine,
  onRefresh,
  refreshing,
  onNewScan,
  onOpenSettings,
  activeSection,
  status,
  showSections,
}: {
  engine: Engine;
  onSelectEngine: (engine: Engine) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  onNewScan: () => void;
  onOpenSettings: () => void;
  activeSection: string;
  status: BackendStatus;
  /** Hide the section links while there is no competitor to report on. */
  showSections: boolean;
}) {
  const scrolled = useScrolled();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl transition-[border-color,box-shadow] duration-300",
        scrolled
          ? "border-border shadow-[0_8px_24px_-16px_rgb(20_48_58/0.28)]"
          : "border-transparent"
      )}
    >
      <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10 xl:px-14">
        {/* Row 1: brand + actions, always one line */}
        <div className="flex items-center gap-3 py-2.5 sm:gap-4 sm:py-3">
          <a
            href="#overview"
            className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="grid size-8 place-items-center rounded-[10px] bg-primary text-primary-foreground shadow-[0_2px_8px_-2px_color-mix(in_oklab,var(--primary)_60%,transparent)]">
              <Radar className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="hidden font-display text-xl font-bold tracking-tight min-[380px]:inline">
              IntelRadar
            </span>
          </a>

          <span className="flex-1" />

          <div className="flex shrink-0 items-center gap-2.5">
            <p className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs whitespace-nowrap text-muted-foreground xl:flex">
              <StatusDot status={status} />
              {STATUS_COPY[status]}
            </p>

            <Segmented className="hidden sm:inline-flex" role="group" aria-label="Scan engine">
              {ENGINES.map((option) => (
                <SegmentedItem
                  key={option.id}
                  active={engine === option.id}
                  onClick={() => onSelectEngine(option.id)}
                >
                  {option.label}
                </SegmentedItem>
              ))}
            </Segmented>

            <div className="flex items-center gap-0.5">
              <ThemeToggle />

              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSettings}
                aria-label="Open settings"
                title="Settings"
                className="rounded-full"
              >
                <Settings2 className="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                aria-label="Refresh data"
                title="Refresh data"
                className="hidden rounded-full sm:inline-flex"
              >
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
              </Button>
            </div>

            <Button
              onClick={onNewScan}
              className="shrink-0 gap-1.5 rounded-full whitespace-nowrap shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">New scan</span>
              <span className="sm:hidden">Scan</span>
            </Button>
          </div>
        </div>

        {/* Row 2: section navigation. Picker on phones, wrapping pills above. */}
        {showSections ? (
          <>
            <div className="pb-2.5 sm:hidden">
              <MobileSectionPicker activeSection={activeSection} />
            </div>
            <nav
              aria-label="Report sections"
              className="hidden flex-wrap items-center gap-x-0.5 gap-y-1 pb-2.5 sm:flex sm:gap-x-1 sm:pb-3"
            >
            {SECTIONS.map((section) => {
              const active = section.id === activeSection;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  aria-current={active ? "location" : undefined}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3 sm:py-1.5 sm:text-[13px]",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {section.label}
                </a>
              );
            })}
            </nav>
          </>
        ) : null}
      </div>
    </header>
  );
}
