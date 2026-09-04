import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin proxy for the backend API.
 * Users on networks where the backend domain is blocked (e.g. some ISPs in
 * Myanmar) can still reach auth/data because all traffic goes through this app.
 */

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
]);

async function proxy({ request, params }: { request: Request; params: { _splat?: string } }) {
  const base = process.env["SUPABASE_URL"];
  if (!base) return new Response("Backend not configured", { status: 500 });

  const incoming = new URL(request.url);
  const target = new URL(`${base.replace(/\/$/, "")}/${params._splat ?? ""}`);
  target.search = incoming.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  if (!headers.has("apikey") && process.env["SUPABASE_PUBLISHABLE_KEY"]) {
    headers.set("apikey", process.env["SUPABASE_PUBLISHABLE_KEY"]!);
  }

  const method = request.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers,
    ...(method === "GET" || method === "HEAD" ? {} : { body: await request.arrayBuffer() }),
  };

  const upstream = await fetch(target.toString(), init);

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "content-encoding") {
      responseHeaders.set(key, value);
    }
  });
  responseHeaders.set("access-control-allow-origin", "*");

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

function options() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "access-control-allow-headers": "*",
    },
  });
}

export const Route = createFileRoute("/api/public/sb/$")({
  server: {
    handlers: {
      GET: proxy,
      POST: proxy,
      PUT: proxy,
      PATCH: proxy,
      DELETE: proxy,
      OPTIONS: options,
    },
  },
});
