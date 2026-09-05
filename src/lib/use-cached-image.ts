import { useEffect, useState } from "react";
import { posDb } from "@/lib/pos-db";

/** In-memory object URLs for the current session, keyed by remote url. */
const objectUrls = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

async function resolve(url: string): Promise<string | null> {
  const cachedObjectUrl = objectUrls.get(url);
  if (cachedObjectUrl) return cachedObjectUrl;

  const existing = inFlight.get(url);
  if (existing) return existing;

  const task = (async () => {
    try {
      const cached = await posDb.cached_images.get(url);
      if (cached?.blob) {
        const objectUrl = URL.createObjectURL(cached.blob);
        objectUrls.set(url, objectUrl);
        return objectUrl;
      }
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      await posDb.cached_images.put({ url, blob, cached_at: Date.now() });
      const objectUrl = URL.createObjectURL(blob);
      objectUrls.set(url, objectUrl);
      return objectUrl;
    } catch {
      return null;
    } finally {
      inFlight.delete(url);
    }
  })();

  inFlight.set(url, task);
  return task;
}

/**
 * Returns a locally cached (IndexedDB-backed) version of a remote image URL so
 * product photos load instantly and keep working offline.
 */
export function useCachedImage(url: string | null | undefined): string | null {
  const [src, setSrc] = useState<string | null>(() => (url ? (objectUrls.get(url) ?? null) : null));

  useEffect(() => {
    let active = true;
    if (!url) {
      setSrc(null);
      return;
    }
    const immediate = objectUrls.get(url);
    if (immediate) {
      setSrc(immediate);
      return;
    }
    setSrc(null);
    void resolve(url).then((result) => {
      if (active) setSrc(result ?? url);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return src;
}
