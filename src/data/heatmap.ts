export type HeatCell = {
  index: number;
  status: "speech" | "silent" | "pending" | "playing";
  startSec: number;
};

const COLS = 40;
const ROWS = 10;
export const HEATMAP_TOTAL = COLS * ROWS;
export const HEATMAP_COLS = COLS;
export const HEATMAP_ROWS = ROWS;
export const SEGMENT_SECONDS = 10;

// Mulberry32 PRNG for deterministic output across renders.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateHeatmap(playingIndex: number, seed = 42): HeatCell[] {
  const rand = mulberry32(seed);
  const cells: HeatCell[] = [];
  for (let i = 0; i < HEATMAP_TOTAL; i++) {
    const r = rand();
    let status: HeatCell["status"];
    if (r > 0.78) status = "speech";
    else if (r > 0.74) status = "pending";
    else status = "silent";
    cells.push({ index: i, status, startSec: i * SEGMENT_SECONDS });
  }
  if (playingIndex >= 0 && playingIndex < HEATMAP_TOTAL) {
    cells[playingIndex] = { ...cells[playingIndex], status: "playing" };
  }
  return cells;
}

export function formatSegmentTime(startSec: number): string {
  const m = Math.floor(startSec / 60);
  const s = startSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
