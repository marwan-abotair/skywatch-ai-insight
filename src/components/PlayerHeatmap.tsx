import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, AlertCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { generateHeatmap, HEATMAP_COLS, HEATMAP_TOTAL, SEGMENT_SECONDS, formatSegmentTime } from "@/data/heatmap";
import { cn } from "@/lib/utils";

type Props = {
  audioUrl: string;
  enhanced: boolean;
  /** Called once the Web Audio graph is built so the parent can transcribe the live stream. */
  onStreamReady?: (stream: MediaStream | null) => void;
};

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function PlayerHeatmap({ audioUrl, enhanced, onStreamReady }: Props) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(70);
  const [hover, setHover] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Web Audio graph
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const highpassRef = useRef<BiquadFilterNode | null>(null);
  const peakRef = useRef<BiquadFilterNode | null>(null);
  const compRef = useRef<DynamicsCompressorNode | null>(null);
  const makeupRef = useRef<GainNode | null>(null);

  // Build the Web Audio graph once per <audio> element.
  const ensureGraph = () => {
    const audio = audioRef.current;
    if (!audio || ctxRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(audio);

      // Enhancement chain: Highpass → Peak (presence) → Compressor → Makeup
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 250;
      hp.Q.value = 0.7;

      const peak = ctx.createBiquadFilter();
      peak.type = "peaking";
      peak.frequency.value = 2200; // speech intelligibility
      peak.Q.value = 1.1;
      peak.gain.value = 6;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -28;
      comp.knee.value = 24;
      comp.ratio.value = 4;
      comp.attack.value = 0.005;
      comp.release.value = 0.18;

      const makeup = ctx.createGain();
      makeup.gain.value = 1.6;

      // Dry / wet gains for instant A/B
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      dry.gain.value = enhanced ? 0 : 1;
      wet.gain.value = enhanced ? 1 : 0;

      // Wire up
      src.connect(dry).connect(ctx.destination);
      src.connect(hp);
      hp.connect(peak);
      peak.connect(comp);
      comp.connect(makeup);
      makeup.connect(wet).connect(ctx.destination);

      ctxRef.current = ctx;
      srcRef.current = src;
      dryGainRef.current = dry;
      wetGainRef.current = wet;
      highpassRef.current = hp;
      peakRef.current = peak;
      compRef.current = comp;
      makeupRef.current = makeup;
    } catch (e) {
      console.warn("WebAudio graph init failed", e);
    }
  };

  // Cross-fade dry/wet when enhanced toggles.
  useEffect(() => {
    const ctx = ctxRef.current;
    const dry = dryGainRef.current;
    const wet = wetGainRef.current;
    if (!ctx || !dry || !wet) return;
    const t = ctx.currentTime;
    const ramp = 0.15;
    dry.gain.cancelScheduledValues(t);
    wet.gain.cancelScheduledValues(t);
    dry.gain.linearRampToValueAtTime(enhanced ? 0 : 1, t + ramp);
    wet.gain.linearRampToValueAtTime(enhanced ? 1 : 0, t + ramp);
  }, [enhanced]);

  // Volume → audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = vol / 100;
  }, [vol]);

  // Reload on audioUrl change
  useEffect(() => {
    setPlaying(false);
    setPos(0);
    setError(null);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    ensureGraph();
    if (ctxRef.current?.state === "suspended") {
      await ctxRef.current.resume();
    }
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Playback failed");
        setPlaying(false);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seekTo = (sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = duration || 0;
    const clamped = Math.max(0, Math.min(max, sec));
    audio.currentTime = clamped;
    setPos(clamped);
  };

  const total = duration > 0 ? duration : HEATMAP_TOTAL * SEGMENT_SECONDS;
  const playingIndex = total > 0 ? Math.floor((pos / total) * HEATMAP_TOTAL) : 0;
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
      {/* Hidden but real audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        crossOrigin="anonymous"
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
        onError={() =>
          setError("Audio konnte nicht geladen werden (CORS / Quelle offline).")
        }
      />

      {/* Player header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => seekTo(pos - 10)}
          className="h-9 w-9 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
          aria-label="Skip back 10s"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={togglePlay}
          className="h-11 w-11 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:brightness-110 transition shadow-[0_0_18px_oklch(0.86_0.22_145/0.4)]"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
        <button
          onClick={() => seekTo(pos + 10)}
          className="h-9 w-9 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
          aria-label="Skip forward 10s"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        <div className="font-mono text-xs text-muted-foreground tabular-nums shrink-0">
          <span className="text-primary">{fmt(pos)}</span>
          <span className="opacity-50"> / {fmt(total)}</span>
        </div>

        {/* Progress */}
        <div className="flex-1 min-w-[140px]">
          <Slider
            value={[pos]}
            min={0}
            max={Math.max(total, 1)}
            step={1}
            onValueChange={(v) => seekTo(v[0])}
          />
        </div>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2 w-36">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider value={[vol]} max={100} step={1} onValueChange={(v) => setVol(v[0])} />
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {/* Heatmap header */}
      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Activity Heatmap · {HEATMAP_TOTAL} segments ·{" "}
          <span className={enhanced ? "text-primary" : "text-muted-foreground"}>
            {enhanced ? "ENHANCED" : "RAW"}
          </span>
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
            onClick={() => {
              if (total > 0) seekTo((c.index / HEATMAP_TOTAL) * total);
            }}
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
