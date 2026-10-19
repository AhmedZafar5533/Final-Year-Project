import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CaptureDialog({
  open,
  onOpenChange,
  src,
  competitorName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | null;
  competitorName?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">Browser capture</DialogTitle>
          <DialogDescription>
            Screenshot taken by the browser agent during the last scan.
          </DialogDescription>
        </DialogHeader>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`Browser capture of ${competitorName ?? "the competitor"}`}
            className="w-full rounded-md border border-border object-contain"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
