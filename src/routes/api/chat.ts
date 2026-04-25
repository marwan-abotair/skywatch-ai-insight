import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";

const SYSTEM_PROMPT = `You are SkyWatch, an expert ATC (Air Traffic Control) radio analysis assistant.
You help pilots and aviation enthusiasts make sense of recorded ATC radio communications.

Guidelines:
- Be concise, technically precise, and use professional aviation terminology.
- When the user asks for structured data (departures, arrivals, callsigns, frequencies, timeline events),
  return a clean Markdown table. Prefer the columns: "Time (UTC)", "Callsign", "Details".
- Always reference the actual transcript context the user provides; do not invent transmissions.
- Use 24h UTC timestamps, monospace-friendly formatting.
- Keep prose answers under ~120 words unless the user asks for detail.`;

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

          const { messages, transcript } = (await request.json()) as {
            messages: Array<{ role: "user" | "assistant"; content: string }>;
            transcript?: string;
          };

          const contextMsg = transcript
            ? {
                role: "system" as const,
                content: `Transcript context (last hour, monospace log lines, format "HH:MM:SS  text"):\n\n${transcript}`,
              }
            : null;

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
