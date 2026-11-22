import { useCallback, useEffect, useState } from "react";

export type ProductViewMode = "grid" | "list";

const STORAGE_KEY = "pos-register-product-view";

/**
 * The cashier's chosen catalog layout. `null` means "never chose": the register then picks
 * grid when items have photos and list otherwise. Read in an effect (not during render) so
 * server and first client render match.
 */
export function useProductViewMode() {
  const [mode, setMode] = useState<ProductViewMode | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "grid" || saved === "list") setMode(saved);
    } catch {
      /* storage blocked: keep the automatic choice */
    }
  }, []);

  const update = useCallback((next: ProductViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return [mode, update] as const;
}
