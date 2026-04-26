import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { ALLOWED_MOUNTS } from "@/data/feeds";

/**
 * Streaming proxy for LiveATC.net MP3 mounts.
 *
 * Why this exists:
 *  - LiveATC streams are HTTP-only (mixed-content blocked on HTTPS).
 *  - They emit no CORS headers, so the browser cannot route them through
 *    WebAudio for transcription.
 *  - This route makes the stream same-origin, with proper CORS + content-type.
 *
 * Security:
 *  - The mount path is validated against an explicit whitelist (ALLOWED_MOUNTS)
 *    to prevent SSRF / arbitrary-URL fetches.
 *
 * Legal:
 *  - For personal monitoring only. Public re-streaming requires permission
 *    from LiveATC.net.
 */
export const Route = createFileRoute("/api/atc-stream/$mount")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Range, Content-Type",
          },
        }),

      GET: async ({ params, request }) => {
        const mount = params.mount;

        if (!ALLOWED_MOUNTS.has(mount)) {
          return new Response(
            JSON.stringify({ error: "Unknown mount" }),
            {
              status: 404,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }

        const upstreamUrl = `http://d.liveatc.net/${mount}`;

        try {
          const range = request.headers.get("range") ?? undefined;

          // 25 s upstream timeout — Cloudflare workers cap CPU at 30 s per req.
          const ctrl = new AbortController();
          const timeout = setTimeout(() => ctrl.abort(), 25_000);

          const upstream = await fetch(upstreamUrl, {
            method: "GET",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              Accept: "audio/mpeg, */*",
              ...(range ? { Range: range } : {}),
            },
            signal: ctrl.signal,
          });

          clearTimeout(timeout);

          if (!upstream.ok || !upstream.body) {
            return new Response(
              JSON.stringify({
                error: `Upstream LiveATC mount returned ${upstream.status}. The feed may be down.`,
              }),
              {
                status: 502,
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              },
            );
          }

          return new Response(upstream.body, {
            status: upstream.status,
            headers: {
              "Content-Type":
                upstream.headers.get("content-type") ?? "audio/mpeg",
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Expose-Headers": "Content-Length, Content-Range",
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          const status = msg.includes("aborted") ? 504 : 502;
          return new Response(
            JSON.stringify({ error: `Stream proxy failed: ${msg}` }),
            {
              status,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      },
    },
  },
});
