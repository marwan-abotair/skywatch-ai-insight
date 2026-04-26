export type Feed = {
  id: string;
  label: string;
  segments: number;
  station: string;
  audioUrl: string;
};

// Real ATC recordings hosted on archive.org (CORS-enabled, public-domain user uploads).
// LiveATC.net itself blocks direct browser playback (Cloudflare bot challenge) and forbids
// re-streaming via TOS, so we use these dedicated archive.org ATC recordings instead.
const ATC_MMMX_TWR =
  "https://archive.org/download/audio-atc-torre-control-aicm-21-julio-2025-1300-utc/MMMX1-Twr-Jul-21-2025-1300Z.mp3";
const ATC_EIDW =
  "https://archive.org/download/dublinatc101023/DUBLIN.mp3";
const ATC_EPWA_APP =
  "https://archive.org/download/epwa-app-may-26-2023-1500-z/EPWA-App-May-26-2023-1500Z.mp3";

export const FEEDS: Feed[] = [
  { id: "mmmx", label: "MMMX Tower", segments: 489, station: "Mexico City AICM", audioUrl: ATC_MMMX_TWR },
  { id: "eidw", label: "EIDW Tower", segments: 412, station: "Dublin International", audioUrl: ATC_EIDW },
  { id: "epwa", label: "EPWA Approach", segments: 358, station: "Warsaw Chopin", audioUrl: ATC_EPWA_APP },
  { id: "mmmx-2", label: "MMMX Tower · Replay", segments: 412, station: "Mexico City AICM", audioUrl: ATC_MMMX_TWR },
  { id: "eidw-2", label: "EIDW Tower · Replay", segments: 521, station: "Dublin International", audioUrl: ATC_EIDW },
  { id: "epwa-2", label: "EPWA Approach · Replay", segments: 472, station: "Warsaw Chopin", audioUrl: ATC_EPWA_APP },
];
