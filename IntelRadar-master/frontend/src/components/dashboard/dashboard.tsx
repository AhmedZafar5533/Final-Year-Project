"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, ScanLine, Search, Sparkles } from "lucide-react";

import {
  API_BASE,
  SECTIONS,
  apiFetch,
  segmentKey,
  type Competitor,
  type Engine,
  type LicenseStatus,
  type ScanPayload,
} from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityPanel } from "./activity-panel";
import { CaptureDialog } from "./capture-dialog";
import { ChangesPanel } from "./changes-panel";
import { ComparisonPanel } from "./comparison-panel";
import { FeaturesPanel } from "./features-panel";
import { useBackendHealth } from "./hooks";
import { Reveal } from "./motion";
import { NewsPanel } from "./news-panel";
import { Overview } from "./overview";
import { PricingPanel } from "./pricing-panel";
import { IconChip } from "./primitives";
import { RivalsBar } from "./rivals-bar";
import { ScanDialog } from "./scan-dialog";
import { SentimentPanel } from "./sentiment-panel";
import { SettingsDialog } from "./settings-dialog";
import { SwotPanel } from "./swot-panel";
import { Topbar } from "./topbar";

const SECTION_IDS = SECTIONS.map((s) => s.id);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Highlights the report section currently in view: the last section whose top
 * has passed the sticky header (slightly below the anchor landing offset).
 *
 * `enabled` gates the setup on the report actually being rendered: competitors
 * arrive from a fetch after mount, so without it the listener runs against an
 * empty page and never finds a section.
 */
function useActiveSection(ids: readonly string[], enabled: boolean) {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    if (!enabled) return;

    const HEADER_OFFSET = 160; // sticky header + a little breathing room
    let frame = 0;

    const update = () => {
      frame = 0;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= HEADER_OFFSET) {
          current = id;
        }
      }
      setActive(current);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ids, enabled]);

  return active;
}

/** Restores the saved theme (set by the toggle in the top bar). */
function useSavedTheme() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem("intelradar-theme");
      if (saved) document.documentElement.classList.toggle("dark", saved === "dark");
    } catch {
      /* storage can be blocked; fall back to the light theme */
    }
  }, []);
}

export function Dashboard() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [engine, setEngine] = useState<Engine>("fast");

  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [license, setLicense] = useState<LicenseStatus | null>(null);

  const activeSection = useActiveSection(SECTION_IDS, competitors.length > 0);
  const status = useBackendHealth();
  useSavedTheme();

  const applyCompetitors = useCallback((data: Competitor[]) => {
    setCompetitors(data);
    setSelectedCompId((current) => current || (data.length > 0 ? data[0].id : ""));
  }, []);

  const loadCompetitors = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/competitors`);
      if (res.ok) {
        applyCompetitors(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch competitors", err);
    } finally {
      setLoading(false);
    }
  }, [applyCompetitors]);

  const refreshLicense = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/license`);
      if (res.ok) setLicense((await res.json()) as LicenseStatus);
    } catch {
      /* offline: keep the last known state */
    }
  }, []);

  // First-run onboarding: until a Gemini key is configured, open Settings so
  // the user can run their first scan without editing any files. The same
  // request also tells us whether the trial still allows scans.
  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API_BASE}/api/settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.license) setLicense(data.license as LicenseStatus);
        if (!data.gemini_api_key_set) setSettingsOpen(true);
      })
      .catch(() => {
        /* older backends or offline: the gear button still opens Settings */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // When the trial is used up, send the user to Settings (where they can
  // activate a key) instead of opening a scan that the backend will reject.
  const openNewScan = () => {
    if (license && !license.can_scan) {
      setSettingsOpen(true);
      return;
    }
    setScanOpen(true);
  };

  // Initial load. State is only updated inside async callbacks, never during the
  // effect body itself.
  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API_BASE}/api/competitors`)
      .then((res) => (res.ok ? (res.json() as Promise<Competitor[]>) : Promise.resolve(null)))
      .then((data) => {
        if (!cancelled && data) applyCompetitors(data);
      })
      .catch((err) => console.error("Failed to fetch competitors", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyCompetitors]);

  const selected = competitors.find((c) => c.id === selectedCompId) || competitors[0];

  const comparisonList = useMemo(() => {
    if (!selected) return [];
    // Only compare like-for-like: same market segment (or same category for
    // profiles captured before segments existed). An empty key never matches
    // another empty key, so two uncategorised profiles are not compared.
    const key = segmentKey(selected);
    const peers = key
      ? competitors.filter((c) => c.id !== selected.id && segmentKey(c) === key)
      : [];
    return [selected, ...peers.slice(0, 2)];
  }, [selected, competitors]);

  const handleRefresh = () => {
    setLoading(true);
    void loadCompetitors();
  };

  const handleRunScan = async (payload: ScanPayload) => {
    setScanning(true);
    setScanError(null);
    setScanStep("Starting scan…");

    try {
      if (engine === "agent") {
        setScanStep("Dispatching the AI browser agent…");
        await sleep(700);
        setScanStep("Navigating the site and extracting pages…");
      } else if (engine === "live") {
        setScanStep("Crawling the site with the browser agent…");
        await sleep(700);
        if (payload.video_url) {
          setScanStep("Downloading and transcribing the video…");
          await sleep(600);
        }
        setScanStep("Analyzing findings with Gemini…");
      } else {
        setScanStep("Extracting page content…");
        await sleep(500);
        if (payload.video_url) {
          setScanStep("Transcribing review audio…");
          await sleep(500);
        }
        setScanStep("Building the SWOT and pricing analysis…");
        await sleep(500);
      }

      const res = await apiFetch(`${API_BASE}/api/scan/autonomous`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newComp: Competitor = await res.json();
        await loadCompetitors();
        setSelectedCompId(newComp.id);
        setScanOpen(false);
      } else {
        const body = await res.json().catch(() => null);
        setScanError(
          body?.detail ??
            "The scan finished with a warning. Check the backend logs for details."
        );
      }
    } catch (err) {
      console.error("Scan error", err);
      setScanError("Could not reach the backend. Make sure it is running on port 8000.");
    } finally {
      setScanning(false);
      setScanStep("");
    }
  };

  return (
    <div className="bg-atmosphere min-h-screen w-full overflow-x-clip">
      <Topbar
        engine={engine}
        onSelectEngine={setEngine}
        onRefresh={handleRefresh}
        refreshing={loading}
        onNewScan={openNewScan}
        onOpenSettings={() => setSettingsOpen(true)}
        activeSection={activeSection}
        status={status}
        showSections={!!selected}
      />

      <main className="mx-auto w-full max-w-[1680px] px-4 pt-6 pb-20 sm:px-6 sm:pt-8 md:pt-10 lg:px-10 xl:px-14">
        {loading && !selected ? (
          <DashboardSkeleton />
        ) : !selected ? (
          <EmptyState onNewScan={openNewScan} />
        ) : (
          <>
            <RivalsBar
              competitors={competitors}
              selectedId={selected.id}
              onSelect={setSelectedCompId}
            />
            <div className="space-y-8">
              <Overview
                competitor={selected}
                competitors={competitors}
                onSelectCompetitor={setSelectedCompId}
                onViewCapture={() =>
                  selected.live_screenshot_url &&
                  setPreviewScreenshot(`${API_BASE}${selected.live_screenshot_url}`)
                }
              />
              <ChangesPanel competitor={selected} />
              <ComparisonPanel selected={selected} comparisonList={comparisonList} />
              <NewsPanel competitor={selected} />
              <SentimentPanel competitor={selected} />
              <SwotPanel competitor={selected} />
              <PricingPanel competitor={selected} />
              <FeaturesPanel competitor={selected} />
              <ActivityPanel competitor={selected} />
            </div>
          </>
        )}
      </main>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={refreshLicense}
      />

      <ScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        engine={engine}
        onSelectEngine={setEngine}
        scanning={scanning}
        scanStep={scanStep}
        scanError={scanError}
        onRun={handleRunScan}
      />

      <CaptureDialog
        open={!!previewScreenshot}
        onOpenChange={(open) => {
          if (!open) setPreviewScreenshot(null);
        }}
        src={previewScreenshot}
        competitorName={selected?.competitor_name}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-full" />
        ))}
      </div>
      <div className="grid gap-10 lg:grid-cols-[5fr_7fr]">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-16 w-72" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl sm:h-[440px]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[5fr_7fr]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

const EMPTY_STEPS = [
  { icon: Search, title: "Name a competitor", body: "Add its website and a review video if you have them." },
  { icon: ScanLine, title: "Run the scan", body: "The crawler and browser agent collect pricing, features and customer sentiment." },
  { icon: Sparkles, title: "Read the weak spots", body: "Gemini turns it into a SWOT, five scored signals and ways to compete." },
];

/** Concentric rings with one slow sweep. Decorative, and the sweep stops under reduced motion. */
function RadarGlyph() {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[340px] text-primary"
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 200" className="size-full">
        {[92, 68, 44, 20].map((r) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.2}
          />
        ))}
        <line x1="8" y1="100" x2="192" y2="100" stroke="currentColor" strokeOpacity={0.2} />
        <line x1="100" y1="8" x2="100" y2="192" stroke="currentColor" strokeOpacity={0.2} />
        <circle cx="134" cy="62" r="5" className="fill-chart-3" />
        <circle cx="68" cy="130" r="4" className="fill-chart-2" />
        <circle cx="120" cy="140" r="3.5" className="fill-chart-4" />
      </svg>
      <div
        className="absolute inset-[4%] rounded-full motion-safe:animate-spin [animation-duration:8s]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, transparent 290deg, color-mix(in oklab, var(--primary) 30%, transparent) 360deg)",
        }}
      />
    </div>
  );
}

function EmptyState({ onNewScan }: { onNewScan: () => void }) {
  return (
    <Reveal className="mx-auto max-w-5xl pt-6">
      <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h1 className="font-display text-[clamp(38px,5.5vw,64px)] leading-[0.98] font-bold tracking-[-0.035em] text-balance">
            Find out where your competitors are weak
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            IntelRadar starts empty. Every profile comes from a real scan, so run one to see a
            competitor&apos;s pricing, complaints and the openings you can use.
          </p>
          <div className="mt-7">
            <Button
              onClick={onNewScan}
              size="lg"
              className="gap-2 rounded-full shadow-[0_6px_18px_-6px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
            >
              <Database className="size-4" />
              Run your first scan
            </Button>
          </div>
        </div>
        <RadarGlyph />
      </div>

      <ol className="mt-14 grid gap-4 sm:grid-cols-3">
        {EMPTY_STEPS.map((step, i) => (
          <li
            key={step.title}
            className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgb(20_48_58/0.05)]"
          >
            <div className="flex items-center gap-3">
              <IconChip icon={step.icon} className="size-8 rounded-lg" />
              <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                Step {i + 1}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}
