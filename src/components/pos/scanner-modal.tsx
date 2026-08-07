import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function ScannerModal({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}) {
  const containerId = "pos-qr-reader";
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            onScan(decoded.trim());
          },
          () => {},
        );
      } catch {
        /* camera unavailable */
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        void scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, [open, onScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Scan product code</h2>
          <button onClick={onClose} aria-label="Close scanner" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div id={containerId} className="overflow-hidden rounded-lg bg-muted" />
        <p className="mt-3 text-xs text-muted-foreground">
          Point the camera at a product QR code or barcode. Allow camera access if prompted.
        </p>
      </div>
    </div>
  );
}
