export type Feed = {
  id: string;
  /** LiveATC mount name (path on d.liveatc.net). Doubles as proxy whitelist key. */
  mount: string;
  label: string;
  station: string;
  region: "EU" | "US";
  /** Comma-separated frequencies for display (e.g. "121.905 / 119.350"). */
  frequencies: string;
  /** True for endless live MP3 streams (no duration / no seek). */
  isLive: boolean;
  /** Browser-facing audio URL — points to our same-origin streaming proxy. */
  audioUrl: string;
  /** Optional bbox for the live flight map. */
  bbox?: [number, number, number, number];
};

/**
 * Curated subset of LiveATC mounts. The list is also used as the proxy's
 * SSRF whitelist — DO NOT add a mount here without verifying it on
 * https://www.liveatc.net/ first.
 */
const MOUNTS = [
  {
    id: "lszb-twr",
    mount: "lszb2_del_twr_app",
    label: "LSZB Del / Twr / App / Dep",
    station: "Bern-Belp",
    region: "EU" as const,
    frequencies: "121.905 / 119.350 / 127.325",
    bbox: [46.5, 6.8, 47.4, 8.2] as [number, number, number, number],
  },
  {
    id: "lszb-atis",
    mount: "lszb2_atis",
    label: "LSZB ATIS",
    station: "Bern-Belp",
    region: "EU" as const,
    frequencies: "125.130",
    bbox: [46.5, 6.8, 47.4, 8.2] as [number, number, number, number],
  },
  {
    id: "lszh-twr",
    mount: "lszh_twr",
    label: "LSZH Tower",
    station: "Zürich",
    region: "EU" as const,
    frequencies: "118.100",
    bbox: [47.0, 8.1, 47.9, 9.2] as [number, number, number, number],
  },
  {
    id: "eddf-twr",
    mount: "eddf_twr",
    label: "EDDF Tower",
    station: "Frankfurt",
    region: "EU" as const,
    frequencies: "119.900 / 124.850",
    bbox: [49.7, 8.0, 50.5, 9.3] as [number, number, number, number],
  },
  {
    id: "kjfk-twr",
    mount: "kjfk_twr",
    label: "KJFK Tower",
    station: "New York JFK",
    region: "US" as const,
    frequencies: "119.100 / 123.900",
    bbox: [40.4, -74.3, 41.0, -73.4] as [number, number, number, number],
  },
  {
    id: "klax-twr",
    mount: "klax_twr",
    label: "KLAX Tower",
    station: "Los Angeles",
    region: "US" as const,
    frequencies: "120.950 / 133.900",
    bbox: [33.7, -118.7, 34.3, -117.9] as [number, number, number, number],
  },
] as const;

export const FEEDS: Feed[] = MOUNTS.map((m) => ({
  ...m,
  isLive: true,
  audioUrl: `/api/atc-stream/${m.mount}`,
}));

/** Whitelist of allowed LiveATC mount names. Used by the streaming proxy. */
export const ALLOWED_MOUNTS: ReadonlySet<string> = new Set(MOUNTS.map((m) => m.mount));
