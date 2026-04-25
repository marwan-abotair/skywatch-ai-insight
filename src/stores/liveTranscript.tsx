import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type LiveLine = {
  id: string;
  /** Wall-clock UTC time HH:MM:SS */
  time: string;
  /** Best-effort speaker label, e.g. "TWR" or "Hotel Fox Mike". May be empty. */
  speaker?: string;
  /** Transcribed text. */
  text: string;
  /** "speech" for actual transmissions, "silent" for empty / noise chunks. */
  kind: "speech" | "silent";
  /** Optional model confidence 0..1 if returned. */
  confidence?: number;
};

type LiveStatus = "idle" | "starting" | "live" | "error" | "rate-limited";

type Ctx = {
  lines: LiveLine[];
  status: LiveStatus;
  error: string | null;
  lastChunkAt: number | null;
  appendLines: (next: LiveLine[]) => void;
  clear: () => void;
  setStatus: (s: LiveStatus) => void;
  setError: (e: string | null) => void;
};

const LiveTranscriptCtx = createContext<Ctx | null>(null);

export function LiveTranscriptProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<LiveLine[]>([]);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastChunkAt, setLastChunkAt] = useState<number | null>(null);

  const appendLines = useCallback((next: LiveLine[]) => {
    if (!next.length) return;
    setLastChunkAt(Date.now());
    setLines((prev) => {
      // Cap memory at last 500 lines (~8 hrs of light traffic).
      const merged = [...prev, ...next];
      return merged.length > 500 ? merged.slice(merged.length - 500) : merged;
    });
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setError(null);
    setLastChunkAt(null);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ lines, status, error, lastChunkAt, appendLines, clear, setStatus, setError }),
    [lines, status, error, lastChunkAt, appendLines, clear],
  );

  return <LiveTranscriptCtx.Provider value={value}>{children}</LiveTranscriptCtx.Provider>;
}

export function useLiveTranscript() {
  const ctx = useContext(LiveTranscriptCtx);
  if (!ctx) throw new Error("useLiveTranscript must be used inside LiveTranscriptProvider");
  return ctx;
}
