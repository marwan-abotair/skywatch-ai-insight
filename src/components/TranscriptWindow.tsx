import { useMemo, useRef, useState, useEffect } from "react";
import { Search, Pause, Play as PlayIcon, Plane } from "lucide-react";
import { TRANSCRIPT, highlightCallsigns } from "@/data/transcript";
import { cn } from "@/lib/utils";

export function TranscriptWindow() {
  const [query, setQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return TRANSCRIPT;
    const q = query.toLowerCase();
    return TRANSCRIPT.filter((l) => l.text.toLowerCase().includes(q) || l.time.includes(q));
  }, [query]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [autoScroll, filtered.length]);

  return (
    <section className="glass rounded-xl flex flex-col h-[560px]">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <h2 className="text-xs uppercase tracking-[0.2em] font-mono text-muted-foreground">
          Live Transcript
        </h2>
        <span className="text-[10px] font-mono text-primary">{filtered.length} lines</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search transcript…"
              className="pl-7 pr-3 py-1 text-xs font-mono bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 w-44"
            />
          </div>
          <button
            onClick={() => setAutoScroll((v) => !v)}
            className={cn(
              "h-7 w-7 inline-flex items-center justify-center rounded-md border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5 transition",
              autoScroll && "text-primary border-primary/40 bg-primary/10",
            )}
            title={autoScroll ? "Pause auto-scroll" : "Resume auto-scroll"}
          >
            {autoScroll ? <PlayIcon className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto grid-bg font-mono text-[13px] leading-relaxed">
        <div className="px-4 py-3 space-y-1">
          {filtered.map((line, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 px-2 py-1 rounded hover:bg-white/[0.04] transition-colors",
                line.kind === "silent" && "opacity-50",
              )}
            >
              <span className="text-muted-foreground tabular-nums shrink-0 select-all">{line.time}</span>
              <span className="shrink-0 w-5 text-center">
                {line.kind === "speech" ? (
                  <Plane className="inline h-3.5 w-3.5 text-primary" />
                ) : (
                  <span aria-hidden className="text-muted-foreground">·</span>
                )}
              </span>
              <span className={cn("flex-1", line.kind === "silent" && "italic text-muted-foreground")}>
                {highlightCallsigns(line.text).map((part, idx) =>
                  part.type === "callsign" ? (
                    <span
                      key={idx}
                      className="px-1.5 py-px rounded bg-primary/15 text-primary border border-primary/25 mx-px"
                    >
                      {part.text}
                    </span>
                  ) : (
                    <span key={idx}>{part.text}</span>
                  ),
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
