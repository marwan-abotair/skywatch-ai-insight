import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, AlertCircle, Radio } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { HEATMAP_COLS, HEATMAP_ROWS, HEATMAP_TOTAL, SEGMENT_SECONDS, formatSegmentTime } from "@/data/heatmap";
import { cn } from "@/lib/utils";

type Props = {
  audioUrl: string;
  enhanced: boolean;
  /** Called once the Web Audio graph is built so the parent can transcribe the live stream. */
  onStreamReady?: (stream: MediaStream | null) => void;
  /** Notifies parent when the audio actually starts/stops playing. */
  onPlayingChange?: (playing: boolean) => void;
  /** When toggled true, attempt to start playback automatically (uses the user-gesture chain). */
  autoPlay?: boolean;
};

type CellStatus = "speech" | "silent" | "pending" | "playing";

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Ring buffer of energy samples → cell status. Index 0 = oldest, last = newest (currently playing).
const SPEECH_THRESHOLD = 0.04; // RMS in [0, ~0.4] for speech; tuned for ATC
const PENDING_THRESHOLD = 0.018;

function energyToStatus(rms: number, isPlayingCell: boolean): CellStatus {
  if (isPlayingCell) return "playing";
  if (rms >= SPEECH_THRESHOLD) return "speech";
  if (rms >= PENDING_THRESHOLD) return "pending";
  return "silent";
}

export function PlayerHeatmap({ audioUrl, enhanced, onStreamReady, onPlayingChange, autoPlay }: Props) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(70);
  const [hover, setHover] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Rolling energy ring (one float per cell). */
  const [energies, setEnergies] = useState<Float32Array>(() => new Float32Array(HEATMAP_TOTAL));
  const [liveStartedAt, setLiveStartedAt] = useState<number | null>(null);
  const [liveSeconds, setLiveSeconds] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Web Audio graph
  const ctxRef = useRef<AudioContext | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSampleAtRef = useRef<number>(0);
  const energyBufRef = useRef<Float32Array>(new Float32Array(HEATMAP_TOTAL));

  /** True for endless live MP3 streams (Icecast). */
  const isLiveStream = !isFinite(duration) || duration === 0;

  // Build the Web Audio graph once per <audio> element.
  const ensureGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || ctxRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(audio);

      // Enhancement chain: Highpass → Peak (presence) → Compressor → Makeup
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 250;
      hp.Q.value = 0.7;

      const peak = ctx.createBiquadFilter();
      peak.type = "peaking";
      peak.frequency.value = 2200;
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

      // Recording tap: a MediaStreamDestination collects whatever the user actually hears.
      const recDest = ctx.createMediaStreamDestination();

      // Analyser for the live heatmap (taps the post-mix signal).
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;

      // Wire up
      src.connect(dry).connect(ctx.destination);
      src.connect(hp);
      hp.connect(peak);
      peak.connect(comp);
      comp.connect(makeup);
      makeup.connect(wet).connect(ctx.destination);
      // Tap both branches into recorder + analyser
      dry.connect(recDest);
      wet.connect(recDest);
      dry.connect(analyser);
      wet.connect(analyser);

      ctxRef.current = ctx;
      dryGainRef.current = dry;
      wetGainRef.current = wet;
      analyserRef.current = analyser;

      onStreamReady?.(recDest.stream);
    } catch (e) {
      console.warn("WebAudio graph init failed", e);
    }
  }, [enhanced, onStreamReady]);

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
    setLiveStartedAt(null);
    setLiveSeconds(0);
    energyBufRef.current = new Float32Array(HEATMAP_TOTAL);
    setEnergies(new Float32Array(HEATMAP_TOTAL));
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  // Notify parent whenever local playing state flips.
  useEffect(() => {
    onPlayingChange?.(playing);
  }, [playing, onPlayingChange]);

  // Live timer (HH:MM:SS since play started). For live-stream display.
  useEffect(() => {
    if (!playing || !liveStartedAt) return;
    const id = setInterval(() => {
      setLiveSeconds(Math.floor((Date.now() - liveStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [playing, liveStartedAt]);

  // Rolling energy heatmap: every SEGMENT_SECONDS, push one cell.
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    const analyser = analyserRef.current;
    if (!analyser) return;

    const buf = new Float32Array(analyser.fftSize);
    let pendingPeak = 0;

    const step = () => {
      analyser.getFloatTimeDomainData(buf);
      // RMS of the chunk
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      // Track the peak RMS within the current segment window
      if (rms > pendingPeak) pendingPeak = rms;

      const now = performance.now();
      if (now - lastSampleAtRef.current >= SEGMENT_SECONDS * 1000) {
        // Shift ring left, push pendingPeak as newest
        const ring = energyBufRef.current;
        ring.copyWithin(0, 1);
        ring[ring.length - 1] = pendingPeak;
        energyBufRef.current = ring;
        // React-friendly snapshot
        setEnergies(new Float32Array(ring));
        pendingPeak = 0;
        lastSampleAtRef.current = now;
      }
      rafRef.current = requestAnimationFrame(step);
    };

    lastSampleAtRef.current = performance.now();
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing]);

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
        if (!liveStartedAt) setLiveStartedAt(Date.now());
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Playback failed";
        setError(msg);
        setPlaying(false);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  // Auto-start when parent flips to live (the user's Go-Live click is the gesture).
  useEffect(() => {
    if (autoPlay && audioRef.current?.paused) {
      void togglePlay();
    }
    if (!autoPlay && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  const seekTo = (sec: number) => {
    if (isLiveStream) return; // No seeking on live streams
    const audio = audioRef.current;
    if (!audio) return;
    const max = duration || 0;
    const clamped = Math.max(0, Math.min(max, sec));
    audio.currentTime = clamped;
    setPos(clamped);
  };

  const playingIndex = HEATMAP_TOTAL - 1; // newest cell = currently playing
  const cellColor = (s: CellStatus) =>
    ({
      speech: "bg-speech/80 hover:bg-speech shadow-[0_0_6px_oklch(0.86_0.22_145/0.55)]",
      silent: "bg-white/5 hover:bg-white/10",
      pending: "bg-pending/70 hover:bg-pending",
      playing: "bg-playing shadow-[0_0_12px_oklch(0.74_0.19_55/0.85)] scale-110",
    })[s];

  const cellStatusAt = (i: number): CellStatus => energyToStatus(energies[i] ?? 0, i === playingIndex);
  const liveTimeLabel = `${Math.floor(liveSeconds / 3600).toString().padStart(2, "0")}:${Math.floor((liveSeconds % 3600) / 60).toString().padStart(2, "0")}:${(liveSeconds % 60).toString().padStart(2, "0")}`;

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
        onEnded={() => {
          setPlaying(false);
          setLiveStartedAt(null);
        }}
        onError={() =>
          setError(
            "Audio could not be loaded. The LiveATC mount may be temporarily down — try another feed.",
          )
        }
      />

      {/* Player header */}
      <div className="flex items-center gap-4 flex-wrap">
        {!isLiveStream && (
          <button
            onClick={() => seekTo(pos - 10)}
            className="h-9 w-9 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
            aria-label="Skip back 10s"
          >
            <SkipBack className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={togglePlay}
          className="h-11 w-11 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:brightness-110 transition shadow-[0_0_18px_oklch(0.86_0.22_145/0.4)]"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
        {!isLiveStream && (
          <button
            onClick={() => seekTo(pos + 10)}
            className="h-9 w-9 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
            aria-label="Skip forward 10s"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        )}

        <div className="font-mono text-xs tabular-nums shrink-0">
          {isLiveStream ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive live-pulse" />
              <span className="text-destructive uppercase tracking-wider">LIVE</span>
              <span className="text-muted-foreground">· running {liveTimeLabel}</span>
            </span>
          ) : (
            <>
              <span className="text-primary">{fmt(pos)}</span>
              <span className="text-muted-foreground opacity-50"> / {fmt(duration)}</span>
            </>
          )}
        </div>

        {/* Progress (only for non-live recordings) */}
        {!isLiveStream && (
          <div className="flex-1 min-w-[140px]">
            <Slider
              value={[pos]}
              min={0}
              max={Math.max(duration, 1)}
              step={1}
              onValueChange={(v) => seekTo(v[0])}
            />
          </div>
        )}
        {isLiveStream && <div className="flex-1 min-w-[140px]" />}

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

      {!error && isLiveStream && playing && energies.every((e) => e < PENDING_THRESHOLD) && (
        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Radio className="h-3.5 w-3.5" />
          Stream is silent right now — LiveATC keeps the channel open between transmissions. This is
          normal.
        </div>
      )}

      {/* Heatmap header */}
      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Activity Heatmap · {HEATMAP_COLS}×{HEATMAP_ROWS} ·{" "}
          <span className={enhanced ? "text-primary" : "text-muted-foreground"}>
            {enhanced ? "ENHANCED" : "RAW"}
          </span>
        </h3>
        <span className="text-[11px] font-mono text-muted-foreground">
          {hover !== null
            ? `seg ${hover.toString().padStart(3, "0")} · ${cellStatusAt(hover)} · rms ${energies[hover]?.toFixed(3) ?? "0.000"}`
            : isLiveStream
              ? `rolling · last ${HEATMAP_TOTAL * SEGMENT_SECONDS}s of audio`
              : `playing seg ${playingIndex.toString().padStart(3, "0")}`}
        </span>
      </div>

      {/* Heatmap grid */}
      <div
        className="mt-3 grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${HEATMAP_COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: HEATMAP_TOTAL }, (_, i) => {
          const status = cellStatusAt(i);
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => {
                if (!isLiveStream && duration > 0) seekTo((i / HEATMAP_TOTAL) * duration);
              }}
              className={cn(
                "h-3.5 rounded-[3px] transition-all duration-150",
                isLiveStream ? "cursor-default" : "cursor-pointer",
                cellColor(status),
              )}
              title={`${formatSegmentTime(i * SEGMENT_SECONDS)} · ${status}`}
              aria-label={`Segment ${i} ${status}`}
            />
          );
        })}
      </div>
    </section>
  );
}
