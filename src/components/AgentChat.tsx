import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Sparkles, Square, AlertCircle } from "lucide-react";
import { TRANSCRIPT } from "@/data/transcript";
import { useLiveTranscript } from "@/stores/liveTranscript";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant" | "system-note"; content: string };

const INITIAL: Msg[] = [
  {
    role: "user",
    content: "Wann ist das Flugzeug abgeflogen, von dem ich gerade abhöre?",
  },
  { role: "system-note", content: "uploading 2 files, analyzing 360 lines…" },
  {
    role: "assistant",
    content: `Basierend auf dem aktuellen Transkript-Kontext (LSZB Tower, letzte Stunde) habe ich diese Departures gefunden:

| Zeit (UTC) | Rufzeichen | Details |
| --- | --- | --- |
| 14:35:31 | Hotel Bravo Charlie Delta Echo | Cleared for takeoff, runway 14, wind 140°/6kt |
| 14:49:21 | Hotel Bravo Romeo | Cleared for takeoff, runway 32, wind 320°/4kt |
| 15:16:40 | Speedbird 712 | Cleared for takeoff, runway 14, wind 150°/7kt |
| 15:36:18 | **Hotel Fox Mike** | Lift off on route Sierra, runway 14, wind 140°/5kt |

Der **Hotel Fox Mike** ist um **15:36:18 UTC** auf der Route Sierra abgeflogen — vermutlich der Flieger, den du gerade hörst.`,
  },
];

const MOCK_TRANSCRIPT_TEXT = TRANSCRIPT.map((l) => `${l.time}  ${l.text}`).join("\n");

export function AgentChat() {
  const { lines: liveLines, status: liveStatus } = useLiveTranscript();
  const [messages, setMessages] = useState<Msg[]>(INITIAL);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setStreaming(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // Strip system-note entries before sending; gateway expects user/assistant only.
      const apiMessages = next
        .filter((m) => m.role !== "system-note")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, transcript: TRANSCRIPT_TEXT }),
        signal: ac.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Failed to start stream" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      // Add empty assistant message we'll fill
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantSoFar = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            buf = "";
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantSoFar += delta;
              const snapshot = assistantSoFar;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: snapshot };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        // user cancelled
      } else {
        setError((e as Error).message);
        setMessages((m) => {
          // Drop trailing empty assistant placeholder if any
          if (m.length && m[m.length - 1].role === "assistant" && m[m.length - 1].content === "") {
            return m.slice(0, -1);
          }
          return m;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  return (
    <section className="glass rounded-xl flex flex-col h-[560px]">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <Sparkles className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold leading-tight">Ask the SkyWatch Agent</h2>
          <p className="text-[11px] font-mono text-muted-foreground leading-tight">
            Context: Last hour · {TRANSCRIPT.length} lines
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
          gemini-3-flash
        </span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => {
          if (m.role === "system-note") {
            return (
              <div key={i} className="flex justify-center animate-fade-in">
                <span className="text-[11px] font-mono text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  {m.content}
                </span>
              </div>
            );
          }
          const isUser = m.role === "user";
          return (
            <div
              key={i}
              className={cn(
                "flex animate-fade-in",
                isUser ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                  isUser
                    ? "bg-info/15 border border-info/30 text-foreground rounded-br-sm"
                    : "glass border-white/10 rounded-bl-sm",
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="prose-chat">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        table: ({ children }) => (
                          <div className="my-2 overflow-x-auto rounded-md border border-white/10">
                            <table className="w-full text-[12px] font-mono">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-white/5 text-muted-foreground uppercase text-[10px] tracking-wider">
                            {children}
                          </thead>
                        ),
                        th: ({ children }) => (
                          <th className="text-left px-2.5 py-1.5 font-medium border-b border-white/10">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-2.5 py-1.5 border-b border-white/5 last:border-0 align-top">
                            {children}
                          </td>
                        ),
                        strong: ({ children }) => (
                          <strong className="text-primary font-semibold">{children}</strong>
                        ),
                        code: ({ children }) => (
                          <code className="px-1 py-0.5 rounded bg-white/10 font-mono text-[12px]">
                            {children}
                          </code>
                        ),
                        ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
                      }}
                    >
                      {m.content || "…"}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 font-mono">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="p-3 border-t border-white/10 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. which callsigns appeared most often?"
          className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 font-mono placeholder:text-muted-foreground/70"
          disabled={streaming}
        />
        {streaming ? (
          <button
            type="button"
            onClick={stop}
            className="h-9 px-3 rounded-md bg-destructive/20 text-destructive border border-destructive/40 hover:bg-destructive/30 inline-flex items-center gap-1.5 text-sm"
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="h-9 w-9 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_oklch(0.86_0.22_145/0.4)]"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </form>
    </section>
  );
}
