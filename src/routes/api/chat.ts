import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";

const SYSTEM_PROMPT = `You are SkyWatch, an expert ATC (Air Traffic Control) radio analysis assistant.
You help pilots and aviation enthusiasts make sense of recorded ATC radio communications.

ABSOLUTE RULES:
- The transcript provided in the system context is the ONLY source of truth.
- NEVER invent timestamps, callsigns, or transmissions that are not literally in the transcript.
- If the transcript is empty or only contains a status note, answer truthfully:
  "No transmissions have been received yet on this live feed." Do not fall back to old or demo data.
- If the user asks about a time outside the transcript range, say so explicitly.
- Each request tells you the data source via the "source" field:
    * "live"       → real live-transcribed transmissions (latest tail)
    * "live-empty" → live pipeline is active but no transmissions captured yet
    * "demo"       → demo mode using sample mock data; you MAY answer but PREFIX your reply with
                     "_(Demo data — turn on Go Live for real transmissions.)_"

OUTPUT GUIDELINES:
- Be concise, technically precise, professional aviation terminology.
- For structured queries (departures, arrivals, callsigns, frequencies, timeline events) return a clean
  Markdown table with columns "Time (UTC)", "Callsign", "Details".
- Use 24h UTC timestamps. Keep prose under ~120 words unless asked for detail.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, content-type",
        };

        try {
          const apiKey = (globalThis as unknown as { process?: { env?: Record<string, string> } })
            .process?.env?.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const { messages, transcript, source } = (await request.json()) as {
            messages: Array<{ role: "user" | "assistant"; content: string }>;
            transcript?: string;
            source?: "live" | "live-empty" | "demo";
          };

          const sourceLabel =
            source === "live"
              ? "LIVE — real transmissions transcribed in the last few minutes"
              : source === "live-empty"
                ? "LIVE — pipeline active, NO transmissions yet"
                : "DEMO — sample mock data, not real-time";

          const transcriptBlock = transcript?.trim()
            ? `Transcript context (source: ${sourceLabel}, format "HH:MM:SS  text"):\n\n${transcript}`
            : `Transcript context (source: ${sourceLabel}): <empty — no transmissions captured>`;

          const contextMsg = { role: "system" as const, content: transcriptBlock };

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              stream: true,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...(contextMsg ? [contextMsg] : []),
                ...messages,
              ],
            }),
          });

          if (!upstream.ok) {
            if (upstream.status === 429) {
              return new Response(
                JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
            if (upstream.status === 402) {
              return new Response(
                JSON.stringify({
                  error: "AI credits exhausted. Add credits in Settings → Workspace → Usage.",
                }),
                { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
            const t = await upstream.text();
            console.error("AI gateway error", upstream.status, t);
            return new Response(JSON.stringify({ error: "AI gateway error" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          return new Response(upstream.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        } catch (e) {
          console.error("chat error", e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
