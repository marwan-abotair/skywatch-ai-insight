import { useMemo, useRef, useState, useEffect } from "react";
import { Search, Pause, Play as PlayIcon, Plane, Radio, Power } from "lucide-react";
import { TRANSCRIPT, highlightCallsigns } from "@/data/transcript";
import { useLiveTranscript, type LiveLine } from "@/stores/liveTranscript";
import { cn } from "@/lib/utils";

type DisplayLine = {
  id: string;
  time: string;
  text: string;
  kind: "speech" | "silent";
  speaker?: string;
  source: "live" | "demo";
};

export function TranscriptWindow() {
  const [query, setQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { lines: liveLines, status, lastChunkAt } = useLiveTranscript();

  // Once live mode is active OR any live line has arrived, hide the demo
  // transcript completely. This is the rule that prevents the user from ever
  // seeing the old 15:xx mock data while real transcription is running.
  const liveActive =
    liveLines.length > 0 ||
    status === "live" ||
    status === "starting" ||
    status === "rate-limited";

  const displayLines = useMemo<DisplayLine[]>(() => {
    if (liveActive) {
      return liveLines.map((l: LiveLine) => ({
        id: l.id,
        time: l.time,
        text: l.text,
        kind: l.kind,
        speaker: l.speaker,
        source: "live",
      }));
    }
    return TRANSCRIPT.map((l, i) => ({
      id: `demo-${i}`,
      time: l.time,
      text: l.text,
      kind: l.kind,
      source: "demo",
    }));
  }, [liveActive, liveLines]);

  const filtered = useMemo(() => {
    if (!query.trim()) return displayLines;
    const q = query.toLowerCase();
    return displayLines.filter(
      (l) =>
        l.text.toLowerCase().includes(q) ||
        l.time.includes(q) ||
        (l.speaker?.toLowerCase().includes(q) ?? false),
    );
  }, [query, displayLines]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [autoScroll, filtered.length]);

  const isStale =
    !!lastChunkAt && Date.now() - lastChunkAt > 120_000 && liveLines.length > 0;

  return (
    <section className="glass rounded-xl flex flex-col h-[560px]">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-wrap">
        <h2 className="text-xs uppercase tracking-[0.2em] font-mono text-muted-foreground">
          {liveActive ? "Live Transcript" : "Demo Transcript"}
        </h2>
        <span className="text-[10px] font-mono text-primary">{filtered.length} lines</span>

        {liveActive ? (
          liveLines.length > 0 ? (
            <span className="text-[10px] font-mono inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary">
              <Radio className="h-2.5 w-2.5" /> LIVE · {liveLines.length}
            </span>
          ) : (
            <span className="text-[10px] font-mono inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary">
              <Radio className="h-2.5 w-2.5" /> waiting for audio…
            </span>
          )
        ) : (
          <span className="text-[10px] font-mono inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
            <Power className="h-2.5 w-2.5" /> demo · turn on Go Live
          </span>
        )}

        {status === "rate-limited" && (
          <span className="text-[10px] font-mono text-pending px-1.5 py-0.5 rounded bg-pending/10 border border-pending/30">
            rate-limited
          </span>
        )}

        {isStale && (
          <span className="text-[10px] font-mono text-pending px-1.5 py-0.5 rounded bg-pending/10 border border-pending/30">
            stale &gt;2 min
          </span>
        )}

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
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 text-muted-foreground">
            <Radio className="h-8 w-8 mb-3 text-primary/60" />
            <p className="text-sm font-mono">
              Live pipeline ready — waiting for the first transmission.
            </p>
            <p className="text-xs mt-1 opacity-70">
              Press play in the audio player. Lines arrive every ~15 s.
            </p>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-1">
            {filtered.map((line) => (
              <div
                key={line.id}
                className={cn(
                  "flex items-start gap-3 px-2 py-1 rounded hover:bg-white/[0.04] transition-colors",
                  line.kind === "silent" && "opacity-50",
                  line.source === "live" && "bg-primary/[0.04] border-l-2 border-primary/40 pl-3",
                )}
              >
                <span className="text-muted-foreground tabular-nums shrink-0 select-all">{line.time}</span>
                <span className="shrink-0 w-5 text-center">
                  {line.kind === "speech" ? (
                    line.source === "live" ? (
                      <Radio className="inline h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Plane className="inline h-3.5 w-3.5 text-primary" />
                    )
                  ) : (
                    <span aria-hidden className="text-muted-foreground">·</span>
                  )}
                </span>
                <span className={cn("flex-1", line.kind === "silent" && "italic text-muted-foreground")}>
                  {line.speaker && (
                    <span className="mr-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {line.speaker}:
                    </span>
                  )}
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
        )}
      </div>
    </section>
  );
}
