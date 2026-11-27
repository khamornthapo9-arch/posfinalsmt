/**
 * The active shift id for a store, cached in the browser so a sale rung up OFFLINE can still be
 * tagged with the shift it belongs to. The server re-validates the link when the sale syncs (same
 * store, usable by the caller, shift open at the time of the sale), so a stale cache can only cause
 * an unlinked sale, never a sale on the wrong shift.
 */
const key = (storeId: string) => `pos-active-shift:${storeId}`;

export function getCachedShiftId(storeId: string | null | undefined): string | null {
  if (!storeId) return null;
  try {
    return window.localStorage.getItem(key(storeId));
  } catch {
    return null;
  }
}

export function setCachedShiftId(storeId: string, shiftId: string | null): void {
  try {
    if (shiftId) window.localStorage.setItem(key(storeId), shiftId);
    else window.localStorage.removeItem(key(storeId));
  } catch {
    // Storage can be unavailable (private mode); the shift link is then simply not cached.
  }
}
