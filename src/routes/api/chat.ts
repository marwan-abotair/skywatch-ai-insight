import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";

const SYSTEM_PROMPT = `You are SkyWatch, an expert ATC (Air Traffic Control) radio analysis assistant.

ABSOLUTE RULES — read carefully:
- The transcript provided in the system context is the ONLY source of truth.
- NEVER invent timestamps, callsigns, frequencies or events that are not literally in the transcript.
- If the transcript is empty, the user is asking about live audio you have not received yet.
  Reply truthfully and briefly, e.g.: "No live transmissions have been transcribed yet — turn on Go Live and start the player to begin."
- DO NOT use any prior demo data, prior conversation context, or your training data to invent ATC events.
- If the user asks about a time outside the transcript range, say so explicitly.
- The "source" field tells you the data origin:
    * "live"       → real live-transcribed transmissions, latest tail
    * "live-empty" → live pipeline is active but no transmissions captured yet → answer: nothing received yet
    * "idle"       → live pipeline is OFF → answer: pipeline is offline, ask the user to turn on Go Live

OUTPUT GUIDELINES:
- Concise, technically precise, professional aviation terminology.
- For structured queries (departures, arrivals, callsigns, frequencies, timeline events) return a Markdown
  table with columns "Time (UTC)", "Callsign", "Details".
- 24h UTC timestamps. Keep prose under ~120 words unless asked for detail.`;

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
            source?: "live" | "live-empty" | "idle";
          };

          const sourceLabel =
            source === "live"
              ? "LIVE — real transmissions transcribed in the last few minutes"
              : source === "live-empty"
                ? "LIVE — pipeline active but NO transmissions captured yet"
                : "IDLE — live pipeline is OFF";

          const transcriptBlock = transcript?.trim()
            ? `Transcript context (source: ${sourceLabel}, format "HH:MM:SS  text"):\n\n${transcript}`
            : `Transcript context (source: ${sourceLabel}): <empty — no transmissions to analyze>`;

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
                contextMsg,
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
