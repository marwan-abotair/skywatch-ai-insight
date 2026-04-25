import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { generateHeatmap, HEATMAP_COLS, HEATMAP_TOTAL, SEGMENT_SECONDS, formatSegmentTime } from "@/data/heatmap";
import { cn } from "@/lib/utils";

const TOTAL = HEATMAP_TOTAL * SEGMENT_SECONDS;

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function PlayerHeatmap() {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(143 * SEGMENT_SECONDS); // start somewhere with playing cell
  const [vol, setVol] = useState(70);
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setPos((p) => (p + 1 >= TOTAL ? 0 : p + 1));
    }, 1000);
    ref.current = id;
    return () => window.clearInterval(id);
  }, [playing]);

  const playingIndex = Math.floor(pos / SEGMENT_SECONDS);
  const cells = generateHeatmap(playingIndex);

  const cellColor = (s: string) =>
    ({
      speech: "bg-speech/80 hover:bg-speech shadow-[0_0_6px_oklch(0.86_0.22_145/0.55)]",
      silent: "bg-white/5 hover:bg-white/10",
      pending: "bg-pending/70 hover:bg-pending",
      playing: "bg-playing shadow-[0_0_12px_oklch(0.74_0.19_55/0.85)] scale-110",
    })[s] ?? "bg-white/5";

  return (
    <section className="glass rounded-xl p-5 lg:p-6">
      {/* Player header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => setPlaying(false)}
          className="h-9 w-9 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
          aria-label="Skip back"
          onClickCapture={() => setPos((p) => Math.max(0, p - 10))}
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={() => setPlaying((v) => !v)}
          className="h-11 w-11 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:brightness-110 transition shadow-[0_0_18px_oklch(0.86_0.22_145/0.4)]"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
        <button
          onClick={() => setPos((p) => Math.min(TOTAL - 1, p + 10))}
          className="h-9 w-9 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
          aria-label="Skip forward"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        <div className="font-mono text-xs text-muted-foreground tabular-nums shrink-0">
          <span className="text-primary">{fmt(pos)}</span>
          <span className="opacity-50"> / {fmt(TOTAL)}</span>
        </div>

        {/* Progress */}
        <div className="flex-1 min-w-[140px]">
          <Slider
            value={[pos]}
            min={0}
            max={TOTAL - 1}
            step={1}
            onValueChange={(v) => setPos(v[0])}
          />
        </div>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2 w-36">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider value={[vol]} max={100} step={1} onValueChange={(v) => setVol(v[0])} />
        </div>
      </div>

      {/* Heatmap header */}
      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Activity Heatmap · {HEATMAP_TOTAL} segments
        </h3>
        <span className="text-[11px] font-mono text-muted-foreground">
          {hover !== null
            ? `seg ${hover.toString().padStart(3, "0")} · ${formatSegmentTime(cells[hover].startSec)} · ${cells[hover].status}`
            : `playing seg ${playingIndex.toString().padStart(3, "0")}`}
        </span>
      </div>

      {/* Heatmap grid */}
      <div
        className="mt-3 grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${HEATMAP_COLS}, minmax(0, 1fr))` }}
      >
        {cells.map((c) => (
          <button
            key={c.index}
            type="button"
            onMouseEnter={() => setHover(c.index)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setPos(c.startSec)}
            className={cn(
              "h-3.5 rounded-[3px] transition-all duration-150 cursor-pointer",
              cellColor(c.status),
            )}
            title={`${formatSegmentTime(c.startSec)} · ${c.status}`}
            aria-label={`Segment ${c.index} ${c.status}`}
          />
        ))}
      </div>
    </section>
  );
}
