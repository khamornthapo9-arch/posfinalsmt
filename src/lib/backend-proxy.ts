/**
 * Routes all backend (auth/database/storage) calls through this app's own
 * domain, so users on networks that block the backend domain — no VPN needed —
 * can still sign up, sign in and sync.
 *
 * It patches window.fetch once: any request to the backend origin is rewritten
 * to `/api/public/sb/<path>` on the current origin. If the proxy itself fails,
 * the original direct request is retried as a fallback.
 */
const BACKEND_URL = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? "";

let installed = false;

export function installBackendProxy() {
  if (installed || typeof window === "undefined" || !BACKEND_URL) return;
  installed = true;

  let backendOrigin: string;
  try {
    backendOrigin = new URL(BACKEND_URL).origin;
  } catch {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (!url.startsWith(backendOrigin)) return originalFetch(input, init);

    const rest = url.slice(backendOrigin.length).replace(/^\//, "");
    const proxied = `${window.location.origin}/api/public/sb/${rest}`;

    try {
      const request =
        typeof input === "string" || input instanceof URL
          ? proxied
          : new Request(proxied, input as Request);
      return await originalFetch(request, init);
    } catch {
      /* fall through to direct request */
    }

    return originalFetch(input, init);
  };
}
