import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";

const TRANSCRIBE_PROMPT = `You are a professional ATC (Air Traffic Control) radio transcriber.
Listen to the audio chunk and extract every distinct radio transmission.
Rules:
- Only return what you actually hear. Do NOT invent calls if the chunk is silent or unintelligible.
- Use proper aviation phrasing and full callsigns when audible (e.g. "Lufthansa 4XK", "Speedbird 712").
- Mark the speaker as "TWR" / "GND" / "APP" if it's the controller, otherwise the aircraft callsign.
- "kind" = "speech" if there is at least one transmission, otherwise "silent".
- "text" should be the exact transcription, no commentary.
- If only static / cockpit noise, return a single line with kind="silent" and empty text.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

function nowHHMMSS(): string {
  const d = new Date();
  return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
    .map((n) => n.toString().padStart(2, "0"))
    .join(":");
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        try {
          const apiKey = (globalThis as unknown as { process?: { env?: Record<string, string> } })
            .process?.env?.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          const form = await request.formData();
          const file = form.get("audio");
          if (!(file instanceof File)) {
            return new Response(
              JSON.stringify({ error: "Missing 'audio' file in form-data" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          // Reject huge uploads (>2 MB ~ 30 s opus). Protects worker CPU/mem.
          if (file.size > 2_000_000) {
            return new Response(
              JSON.stringify({ error: "Audio chunk too large (>2 MB)" }),
              { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          const buf = await file.arrayBuffer();
          // base64 encode
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode.apply(
              null,
              Array.from(bytes.subarray(i, i + 0x8000)),
            );
          }
          const b64 = btoa(binary);
          const mime = file.type || "audio/webm";

          // Structured-output via tool calling
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: TRANSCRIBE_PROMPT },
                {
                  role: "user",
                  content: [
                    {
                      type: "input_audio",
                      input_audio: { data: b64, format: mime.replace("audio/", "") },
                    },
                    { type: "text", text: "Transcribe this ATC audio chunk now." },
                  ],
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "emit_transcript",
                    description: "Return the structured transcript of the audio chunk.",
                    parameters: {
                      type: "object",
                      properties: {
                        lines: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              speaker: { type: "string", description: "Callsign or controller code; empty if unknown." },
                              text: { type: "string", description: "Exact transcription. Empty if silent." },
                              kind: { type: "string", enum: ["speech", "silent"] },
                            },
                            required: ["speaker", "text", "kind"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["lines"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "emit_transcript" } },
            }),
          });

          if (!upstream.ok) {
            if (upstream.status === 429) {
              return new Response(
                JSON.stringify({ error: "Rate limit reached. Backing off." }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
            if (upstream.status === 402) {
              return new Response(
                JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
                { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
            const t = await upstream.text();
            console.error("transcribe gateway error", upstream.status, t);
            return new Response(
              JSON.stringify({ error: "AI gateway error" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          const data = await upstream.json();
          const call = data?.choices?.[0]?.message?.tool_calls?.[0];
          let lines: Array<{ speaker: string; text: string; kind: "speech" | "silent" }> = [];
          if (call?.function?.arguments) {
            try {
              const parsed = JSON.parse(call.function.arguments);
              if (Array.isArray(parsed?.lines)) lines = parsed.lines;
            } catch (e) {
              console.error("failed to parse tool args", e);
            }
          }

          // Stamp wall-clock time + ids server-side so client doesn't drift.
          const t = nowHHMMSS();
          const stamped = lines
            .filter((l) => l && (l.kind === "speech" || l.kind === "silent"))
            .map((l, i) => ({
              id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
              time: t,
              speaker: l.speaker || "",
              text: (l.text || "").trim(),
              kind: l.kind,
            }));

          return new Response(JSON.stringify({ lines: stamped }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("transcribe error", e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
