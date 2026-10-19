"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";

import { API_BASE, apiFetch, type LicenseStatus } from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type SettingsPayload = {
  gemini_api_key_set: boolean;
  gemini_api_key_hint: string;
  gemini_model: string;
  monitor_enabled: boolean;
  monitor_interval_minutes: number;
  alert_urls: string[];
  data_dir: string;
  settings_file: string;
  /** Absent on older backends; the dialog then hides licensing. */
  license?: LicenseStatus;
};

type Validation = { valid: boolean; detail: string };

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro", "gemini-2.0-flash"];

/**
 * In-app configuration for the local engine: Gemini key, model, monitoring and
 * alerts. Everything is persisted by the backend in the user-data directory, so
 * no `.env` editing or restart is needed.
 */
export function SettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [monitorEnabled, setMonitorEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState("360");
  const [alertUrls, setAlertUrls] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<Validation | null>(null);

  const [licenseKey, setLicenseKey] = useState("");
  const [licenseBusy, setLicenseBusy] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [licenseNotice, setLicenseNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setLoading(true);
    setLoadError(null);
    setSaved(false);
    setSaveError(null);
    setValidation(null);
    setApiKey("");
    setLicenseKey("");
    setLicenseError(null);
    setLicenseNotice(null);

    apiFetch(`${API_BASE}/api/settings`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "This backend is too old for settings. Restart it to load the latest build."
              : `Could not load settings (${res.status}).`
          );
        }
        return (await res.json()) as SettingsPayload;
      })
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
        setModel(data.gemini_model);
        setMonitorEnabled(data.monitor_enabled);
        setIntervalMinutes(String(data.monitor_interval_minutes));
        setAlertUrls(data.alert_urls.join(", "));
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleValidate = async () => {
    setValidating(true);
    setValidation(null);
    try {
      const res = await apiFetch(`${API_BASE}/api/settings/validate-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey.trim() || undefined }),
      });
      setValidation((await res.json()) as Validation);
    } catch {
      setValidation({ valid: false, detail: "Could not reach the local engine." });
    } finally {
      setValidating(false);
    }
  };

  const handleLicense = async (action: "activate" | "refresh" | "remove") => {
    setLicenseBusy(true);
    setLicenseError(null);
    setLicenseNotice(null);

    try {
      let response: Response;
      if (action === "activate") {
        const key = licenseKey.trim();
        if (!key) throw new Error("Enter a license key.");
        response = await apiFetch(`${API_BASE}/api/license/activate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ license_key: key }),
        });
      } else if (action === "refresh") {
        response = await apiFetch(`${API_BASE}/api/license/refresh`, { method: "POST" });
      } else {
        response = await apiFetch(`${API_BASE}/api/license`, { method: "DELETE" });
      }

      const data = (await response.json().catch(() => null)) as LicenseStatus | { detail?: string } | null;
      if (!response.ok) {
        throw new Error(
          (data as { detail?: string } | null)?.detail ?? `License request failed (${response.status}).`
        );
      }

      setSettings((current) =>
        current ? { ...current, license: data as LicenseStatus } : current
      );

      if (action === "activate") {
        setLicenseKey("");
        setLicenseNotice("License activated — unlimited scans unlocked.");
        onSaved?.();
      } else if (action === "refresh") {
        setLicenseNotice("License re-checked.");
      } else {
        setLicenseNotice("License key removed.");
        onSaved?.();
      }
    } catch (error: unknown) {
      setLicenseError(error instanceof Error ? error.message : "License request failed.");
    } finally {
      setLicenseBusy(false);
    }
  };

  const handleSave = async () => {
    const minutes = Number(intervalMinutes);
    if (!Number.isFinite(minutes) || minutes < 15 || minutes > 10080) {
      setSaveError("Rescan interval must be between 15 and 10,080 minutes (7 days).");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      const body: Record<string, unknown> = {
        gemini_model: model.trim(),
        monitor_enabled: monitorEnabled,
        monitor_interval_minutes: Math.round(minutes),
        alert_urls: alertUrls
          .split(",")
          .map((url) => url.trim())
          .filter(Boolean),
      };
      // Blank means "keep the current key".
      if (apiKey.trim()) body.gemini_api_key = apiKey.trim();

      const res = await apiFetch(`${API_BASE}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail ?? `Could not save settings (${res.status}).`);
      }

      const data = (await res.json()) as SettingsPayload;
      setSettings(data);
      setApiKey("");
      setSaved(true);
      onSaved?.();
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold tracking-tight">
            Settings
          </DialogTitle>
          <DialogDescription>
            Connect the analysis engine and control background monitoring. Saved to your user
            data folder — no restart needed.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading settings…
          </div>
        ) : loadError ? (
          <p
            role="alert"
            className="rounded-xl border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical"
          >
            {loadError}
          </p>
        ) : (
          <div className="space-y-6">
            {/* License */}
            {settings?.license ? (
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">License</h3>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {settings?.license?.licensed
                      ? "Licensed for unlimited scans."
                      : settings?.license?.bypass
                        ? "Development mode: licensing is bypassed."
                        : `${settings?.license?.trial_remaining ?? 0} of ${
                            settings?.license?.trial_limit ?? 0
                          } free scans left.`}
                  </p>
                </div>
                {settings?.license ? (
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      settings.license.licensed
                        ? "bg-success/10 text-success"
                        : settings.license.can_scan
                          ? "bg-warning/10 text-warning"
                          : "bg-critical/10 text-critical"
                    }`}
                  >
                    {settings.license.licensed ? <BadgeCheck className="size-3" /> : null}
                    {settings.license.licensed
                      ? "Licensed"
                      : settings.license.can_scan
                        ? "Trial"
                        : "Trial ended"}
                  </span>
                ) : null}
              </div>

              {settings?.license && !settings.license.licensed ? (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      aria-label="License key"
                      placeholder="License key from your purchase email"
                      value={licenseKey}
                      onChange={(event) => {
                        setLicenseKey(event.target.value);
                        setLicenseError(null);
                      }}
                      disabled={licenseBusy}
                      className="h-10"
                    />
                    <Button
                      type="button"
                      onClick={() => handleLicense("activate")}
                      disabled={licenseBusy || !licenseKey.trim()}
                      className="shrink-0 rounded-full"
                    >
                      {licenseBusy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Activate
                    </Button>
                  </div>
                  {settings.license.license_key_hint ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Saved key {settings.license.license_key_hint}</span>
                      <button
                        type="button"
                        onClick={() => handleLicense("refresh")}
                        disabled={licenseBusy}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Re-check
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLicense("remove")}
                        disabled={licenseBusy}
                        className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                  {!settings.license.can_scan ? (
                    <p className="text-[13px] font-medium text-critical">
                      The free trial has ended. Activate a license key to run more scans.
                    </p>
                  ) : null}
                </>
              ) : settings?.license?.licensed ? (
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>Key {settings.license.license_key_hint}</span>
                  <button
                    type="button"
                    onClick={() => handleLicense("refresh")}
                    disabled={licenseBusy}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Re-check
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLicense("remove")}
                    disabled={licenseBusy}
                    className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : null}

              {licenseError ? (
                <p role="alert" className="text-[13px] font-medium text-critical">
                  {licenseError}
                </p>
              ) : null}
              {licenseNotice ? (
                <p role="status" className="text-[13px] font-medium text-success">
                  {licenseNotice}
                </p>
              ) : null}
            </section>
            ) : null}

            {/* Analysis */}
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Analysis engine</h3>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Scans use your Google Gemini API key. It stays on this device.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-key">
                  Gemini API key
                  {settings?.gemini_api_key_set ? (
                    <span className="font-normal text-muted-foreground">
                      configured {settings.gemini_api_key_hint}
                    </span>
                  ) : null}
                </Label>
                <Input
                  id="settings-key"
                  type="password"
                  autoComplete="off"
                  placeholder={
                    settings?.gemini_api_key_set
                      ? "Leave blank to keep the current key"
                      : "AIza…"
                  }
                  value={apiKey}
                  onChange={(event) => {
                    setApiKey(event.target.value);
                    setValidation(null);
                  }}
                  className="h-10"
                />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleValidate}
                    disabled={validating || (!apiKey.trim() && !settings?.gemini_api_key_set)}
                    className="rounded-full"
                  >
                    {validating ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Test key
                  </Button>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Get a free key
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                  {validation ? (
                    <span
                      className={
                        validation.valid
                          ? "inline-flex items-center gap-1.5 text-xs font-medium text-success"
                          : "inline-flex items-center gap-1.5 text-xs font-medium text-critical"
                      }
                    >
                      {validation.valid ? (
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      ) : (
                        <XCircle className="size-3.5" aria-hidden="true" />
                      )}
                      {validation.valid ? "Key works" : validation.detail}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-model">Analysis model</Label>
                <Input
                  id="settings-model"
                  list="settings-models"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="h-10"
                />
                <datalist id="settings-models">
                  {MODELS.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <p className="text-[13px] text-muted-foreground">
                  Flash models are cheapest; Pro is the most thorough.
                </p>
              </div>
            </section>

            {/* Monitoring */}
            <section className="space-y-3 border-t border-border pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">Scheduled rescans</h3>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    Rescan every tracked competitor and record what changed.
                  </p>
                </div>
                <Switch
                  checked={monitorEnabled}
                  onCheckedChange={setMonitorEnabled}
                  aria-label="Enable scheduled rescans"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="settings-interval">Interval (minutes)</Label>
                  <Input
                    id="settings-interval"
                    type="number"
                    min={15}
                    max={10080}
                    value={intervalMinutes}
                    onChange={(event) => setIntervalMinutes(event.target.value)}
                    disabled={!monitorEnabled}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="settings-alerts">Alert URLs</Label>
                  <Input
                    id="settings-alerts"
                    placeholder="discord://…, mailto://…"
                    value={alertUrls}
                    onChange={(event) => setAlertUrls(event.target.value)}
                    disabled={!monitorEnabled}
                    className="h-10"
                  />
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground">
                Optional Apprise URLs (Discord, Slack, email) separated by commas.
                {settings?.license && !settings.license.licensed
                  ? " Scheduled rescans require an active license."
                  : null}
              </p>
            </section>

            {/* Storage */}
            {settings ? (
              <section className="space-y-2 border-t border-border pt-5">
                <h3 className="text-sm font-semibold">Storage</h3>
                <p className="text-[13px] text-muted-foreground">
                  Profiles and captures are stored in your user data folder.
                </p>
                <code className="block truncate rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {settings.data_dir}
                </code>
              </section>
            ) : null}

            {saveError ? (
              <p
                role="alert"
                className="rounded-xl border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical"
              >
                {saveError}
              </p>
            ) : null}
            {saved ? (
              <p
                role="status"
                className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success"
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Settings saved.
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading || !!loadError}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
