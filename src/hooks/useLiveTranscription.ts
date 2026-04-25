import { useEffect, useRef } from "react";
import { useLiveTranscript } from "@/stores/liveTranscript";

type Options = {
  /** Whether the live pipeline should be active. */
  enabled: boolean;
  /** A MediaStream of the audio currently playing (from a Web Audio destination). */
  stream: MediaStream | null;
  /** Chunk length in ms. Default 15000. */
  chunkMs?: number;
};

/**
 * Records the provided MediaStream in fixed-length chunks and POSTs each
 * chunk to /api/transcribe. New transcript lines are appended to the global
 * live transcript store.
 *
 * Designed to recover from transient errors and to back off on rate limits.
 */
export function useLiveTranscription({ enabled, stream, chunkMs = 15000 }: Options) {
  const { appendLines, setStatus, setError } = useLiveTranscript();

  // Refs survive re-renders without re-triggering the effect
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const inflightRef = useRef(0);
  const backoffUntilRef = useRef(0);

  useEffect(() => {
    if (!enabled || !stream) {
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("MediaRecorder API not supported in this browser.");
      setStatus("error");
      return;
    }

    let cancelled = false;
    setStatus("starting");
    setError(null);

    // Pick the best supported mime
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    const mime = candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

    let recorder: MediaRecorder;
    try {
      recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32_000 })
        : new MediaRecorder(stream);
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
      return;
    }
    recorderRef.current = recorder;

    const flush = async () => {
      if (cancelled) return;
      const chunks = chunksRef.current;
      chunksRef.current = [];
      if (!chunks.length) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
      if (blob.size < 1500) return; // ignore noise / empty packets

      // Soft cap: at most 2 in-flight requests
      if (inflightRef.current >= 2) return;
      // Honor rate-limit backoff
      if (Date.now() < backoffUntilRef.current) return;

      inflightRef.current += 1;
      try {
        const fd = new FormData();
        fd.append("audio", blob, "chunk.webm");
        const resp = await fetch("/api/transcribe", { method: "POST", body: fd });

        if (resp.status === 429) {
          backoffUntilRef.current = Date.now() + 30_000;
          setStatus("rate-limited");
          setError("Rate limit hit — pausing transcription for 30 s.");
          return;
        }
        if (resp.status === 402) {
          setStatus("error");
          setError("AI credits exhausted.");
          recorder.stop();
          return;
        }
        if (!resp.ok) {
          const j = await resp.json().catch(() => ({}));
          setError(j.error || `Transcription failed (${resp.status})`);
          return;
        }

        const data = (await resp.json()) as {
          lines: Array<{
            id: string;
            time: string;
            speaker?: string;
            text: string;
            kind: "speech" | "silent";
          }>;
        };
        if (data?.lines?.length) {
          appendLines(data.lines);
          setStatus("live");
          setError(null);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        inflightRef.current -= 1;
      }
    };

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      // Flush whenever a slice closes (timeslice cadence)
      flush();
    };
    recorder.onerror = (e: Event) => {
      console.error("MediaRecorder error", e);
      setError("Recorder error");
    };
    recorder.onstart = () => {
      setStatus("live");
    };
    recorder.onstop = () => {
      // Final flush
      void flush();
    };

    try {
      recorder.start(chunkMs);
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
      return;
    }

    return () => {
      cancelled = true;
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        // ignore
      }
      recorderRef.current = null;
      chunksRef.current = [];
      inflightRef.current = 0;
      setStatus("idle");
    };
  }, [enabled, stream, chunkMs, appendLines, setStatus, setError]);
}
