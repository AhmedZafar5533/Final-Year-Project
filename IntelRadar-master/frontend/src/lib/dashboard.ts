/**
 * Shared domain types, constants and presentation helpers for the dashboard.
 * Kept free of React so both server and client modules can import it.
 */

declare global {
  interface Window {
    /** Injected by the Tauri desktop shell before the app loads. */
    __INTELRADAR__?: { apiBase?: string; token?: string };
  }
}

/* The desktop shell picks a free port and a per-launch token at runtime, so the
   static frontend reads them from the injected config. In a normal browser it
   falls back to the build-time env/default. */
const runtimeConfig = typeof window !== "undefined" ? window.__INTELRADAR__ : undefined;

export const API_BASE =
  runtimeConfig?.apiBase || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Optional local-engine token. The desktop shell sets one per launch so other
 * local apps or websites cannot drive the backend while it runs. Empty in the
 * normal development flow.
 */
export const API_TOKEN = runtimeConfig?.token || process.env.NEXT_PUBLIC_API_TOKEN || "";

/** fetch() for the local engine, adding the token header when configured. */
export function apiFetch(input: string, init: RequestInit = {}) {
  if (!API_TOKEN) return fetch(input, init);
  const headers = new Headers(init.headers);
  headers.set("X-IntelRadar-Token", API_TOKEN);
  return fetch(input, { ...init, headers });
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface PricingTier {
  plan: string;
  price: string;
  billing_period: string;
  highlights: string[];
}

export interface FeatureItem {
  feature: string;
  category: string;
  maturity: string;
  strategic_edge: string;
}

export interface ComplaintItem {
  issue: string;
  severity: string;
  source: string;
}

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface RadarMetrics {
  feature_depth: number;
  pricing_pressure: number;
  user_sentiment: number;
  execution_velocity: number;
  retention_risk: number;
}

export interface MovementItem {
  date: string;
  type: string;
  headline: string;
  impact: string;
}

/** A dated news item pulled from live search (see ``app/services/news.py``). */
export interface NewsItem {
  title: string;
  url: string;
  source: string;
  published: string;
  summary?: string;
}

/** A detected change between scans (see ``app/services/monitor.py``). */
export interface ChangeItem {
  kind: string;
  severity: string;
  summary: string;
}

export interface Competitor {
  id: string;
  competitor_name: string;
  tagline: string;
  category: string;
  segment?: string;
  threat_level: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | string;
  threat_score: number;
  pricing_tiers: PricingTier[];
  key_features: FeatureItem[];
  customer_complaints: ComplaintItem[];
  swot_analysis: SwotAnalysis;
  radar_metrics: RadarMetrics;
  strategic_summary: string;
  recent_movements: MovementItem[];
  vulnerabilities_to_exploit: string[];
  live_screenshot_url?: string;
  target_url?: string;
  target_video_url?: string;
  last_scanned_at?: string;
  recent_news?: NewsItem[];
  changes?: ChangeItem[];
}

export interface LicenseStatus {
  licensed: boolean;
  bypass: boolean;
  trial_limit: number;
  trial_used: number;
  trial_remaining: number;
  can_scan: boolean;
  license_key_hint: string;
  last_validated_at: string | null;
  offline_grace_days: number;
  store: string;
}

export interface ScanPayload {
  competitor_name: string;
  url?: string;
  video_url?: string;
  engine: Engine;
}

/* ------------------------------------------------------------------ */
/* Scan engines                                                        */
/* ------------------------------------------------------------------ */

export type Engine = "fast" | "live" | "agent";

export interface EngineOption {
  id: Engine;
  label: string;
  description: string;
}

/** Ordered engine list shared by the top bar and the scan dialog. */
export const ENGINES: EngineOption[] = [
  { id: "fast", label: "Fast", description: "Crawler only — fastest, no browser." },
  {
    id: "live",
    label: "Live scan",
    description: "A headless browser scrolls the page and captures a screenshot.",
  },
  {
    id: "agent",
    label: "Agent",
    description: "An AI browser agent navigates pages that need interaction.",
  },
];

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export interface ThreatStyle {
  /** Foreground/text color. */
  text: string;
  /** Solid background used for dots and meters. */
  bar: string;
  /** Soft pill styling: background, text and inset ring. */
  chip: string;
  label: string;
}

export const THREAT_STYLES: Record<string, ThreatStyle> = {
  CRITICAL: {
    text: "text-critical",
    bar: "bg-critical",
    chip: "bg-critical/10 text-critical ring-critical/25",
    label: "Critical",
  },
  HIGH: {
    text: "text-warning",
    bar: "bg-warning",
    chip: "bg-warning/10 text-warning ring-warning/25",
    label: "High",
  },
  MODERATE: {
    text: "text-info",
    bar: "bg-info",
    chip: "bg-info/10 text-info ring-info/25",
    label: "Moderate",
  },
  LOW: {
    text: "text-success",
    bar: "bg-success",
    chip: "bg-success/10 text-success ring-success/25",
    label: "Low",
  },
};

export const METRICS: { key: keyof RadarMetrics; label: string; short: string }[] = [
  { key: "feature_depth", label: "Feature depth", short: "Features" },
  { key: "pricing_pressure", label: "Pricing pressure", short: "Pricing" },
  { key: "user_sentiment", label: "User sentiment", short: "Sentiment" },
  { key: "execution_velocity", label: "Execution speed", short: "Speed" },
  { key: "retention_risk", label: "Retention", short: "Retention" },
];

export const SWOT_SECTIONS = [
  { key: "strengths", title: "Strengths", tone: "text-success", accent: "bg-success" },
  { key: "weaknesses", title: "Weaknesses", tone: "text-warning", accent: "bg-warning" },
  { key: "opportunities", title: "Opportunities", tone: "text-info", accent: "bg-info" },
  { key: "threats", title: "Threats", tone: "text-critical", accent: "bg-critical" },
] as const;

/** Anchor targets for the in-report navigation. */
export const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "changes", label: "Changes" },
  { id: "comparison", label: "Position" },
  { id: "signals", label: "Signals" },
  { id: "sentiment", label: "Sentiment" },
  { id: "swot", label: "SWOT" },
  { id: "pricing", label: "Pricing" },
  { id: "features", label: "Features" },
  { id: "activity", label: "Activity" },
] as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function threatStyle(level?: string): ThreatStyle {
  return THREAT_STYLES[level?.toUpperCase() ?? ""] ?? THREAT_STYLES.LOW;
}

export function severityClass(severity?: string) {
  const s = severity?.toLowerCase();
  if (s === "high" || s === "critical") return "text-critical";
  if (s === "medium" || s === "moderate") return "text-warning";
  return "text-info";
}

export function maturityClass(maturity?: string) {
  const m = maturity?.toLowerCase() ?? "";
  if (m.includes("matur") || m.includes("establish")) return "text-primary";
  if (m.includes("grow") || m.includes("emerg")) return "text-warning";
  return "text-info";
}

export function formatScannedAt(value?: string) {
  if (!value) return "Not scanned yet";
  return new Date(value).toLocaleString();
}

/**
 * Canonical market-segment key. Comparisons only ever group profiles that
 * resolve to the same key, so unrelated products are never placed on one
 * radar. Falls back to the free-text category for older profiles.
 */
export function segmentKey(profile: Pick<Competitor, "segment" | "category">): string {
  const normalize = (value?: string) =>
    value
      ? value
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      : "";
  return normalize(profile.segment) || normalize(profile.category);
}
