"use client";

import { useState } from "react";
import { Loader2, Radar } from "lucide-react";

import { ENGINES, type Engine, type ScanPayload } from "@/lib/dashboard";
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
import { IconChip, Segmented, SegmentedItem } from "./primitives";

export function ScanDialog({
  open,
  onOpenChange,
  engine,
  onSelectEngine,
  scanning,
  scanStep,
  scanError,
  onRun,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engine: Engine;
  onSelectEngine: (engine: Engine) => void;
  scanning: boolean;
  scanStep: string;
  scanError: string | null;
  onRun: (payload: ScanPayload) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!scanning) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <ScanForm
          engine={engine}
          onSelectEngine={onSelectEngine}
          scanning={scanning}
          scanStep={scanStep}
          scanError={scanError}
          onRun={onRun}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Lives inside the dialog content, which unmounts once closed, so the form
 * always starts empty without needing a reset effect.
 */
function ScanForm({
  engine,
  onSelectEngine,
  scanning,
  scanStep,
  scanError,
  onRun,
  onClose,
}: {
  engine: Engine;
  onSelectEngine: (engine: Engine) => void;
  scanning: boolean;
  scanStep: string;
  scanError: string | null;
  onRun: (payload: ScanPayload) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [video, setVideo] = useState("");

  const engineHint = ENGINES.find((e) => e.id === engine)?.description;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || scanning) return;
    onRun({
      competitor_name: name.trim(),
      url: url || undefined,
      video_url: video || undefined,
      engine,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 font-display text-[1.6rem] font-bold tracking-tight">
          <IconChip icon={Radar} />
          New competitor scan
        </DialogTitle>
        <DialogDescription>{engineHint}</DialogDescription>
      </DialogHeader>

      <Segmented className="w-full" role="group" aria-label="Scan engine">
        {ENGINES.map((option) => (
          <SegmentedItem
            key={option.id}
            active={engine === option.id}
            onClick={() => onSelectEngine(option.id)}
            disabled={scanning}
            className="flex-1"
          >
            {option.label}
          </SegmentedItem>
        ))}
      </Segmented>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="scan-name">Competitor name</Label>
          <Input
            id="scan-name"
            placeholder="Supabase, Figma…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={scanning}
            className="h-11"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="scan-url">
            Website URL <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="scan-url"
            type="url"
            placeholder="https://supabase.com/pricing"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={scanning}
            className="h-11"
          />
          {!url.trim() ? (
            <p className="text-[13px] text-muted-foreground">
              A URL makes the scan far richer — without one the profile is inferred from the name
              alone.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="scan-video">
            YouTube review URL <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="scan-video"
            type="url"
            placeholder="https://www.youtube.com/watch?v="
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            disabled={scanning}
            className="h-11"
          />
        </div>
      </div>

      {scanning ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3.5 text-sm font-semibold"
        >
          <Loader2 className="size-5 animate-spin text-primary" />
          <span>{scanStep}</span>
        </div>
      ) : null}

      {scanError ? (
        <p
          role="alert"
          className="rounded-lg border border-critical/30 bg-critical/10 px-4 py-3.5 text-sm text-critical"
        >
          {scanError}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={scanning}>
          Cancel
        </Button>
        <Button type="submit" disabled={scanning || !name.trim()}>
          {scanning ? "Scanning…" : "Run scan"}
        </Button>
      </DialogFooter>
    </form>
  );
}
