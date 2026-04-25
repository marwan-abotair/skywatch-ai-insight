export type Feed = {
  id: string;
  label: string;
  segments: number;
  station: string;
  audioUrl: string;
};

// Free ATC sample recordings (archive.org / public domain)
// Short loops, work as <audio src> with CORS enabled.
const ATC_SAMPLE_1 =
  "https://archive.org/download/atc-sample-recordings/ATC%20-%20JFK%20Tower.mp3";
const ATC_SAMPLE_2 =
  "https://archive.org/download/atc-sample-recordings/ATC%20-%20LAX%20Ground.mp3";
const ATC_SAMPLE_3 =
  "https://archive.org/download/atc-sample-recordings/ATC%20-%20Boston%20Approach.mp3";

export const FEEDS: Feed[] = [
  { id: "kjfk", label: "KJFK Tower", segments: 489, station: "New York JFK", audioUrl: ATC_SAMPLE_1 },
  { id: "klax", label: "KLAX Ground", segments: 412, station: "Los Angeles", audioUrl: ATC_SAMPLE_2 },
  { id: "kbos", label: "KBOS Approach", segments: 358, station: "Boston Logan", audioUrl: ATC_SAMPLE_3 },
  { id: "lszh", label: "LSZH Tower", segments: 412, station: "Zurich", audioUrl: ATC_SAMPLE_1 },
  { id: "eddf", label: "EDDF Approach", segments: 521, station: "Frankfurt", audioUrl: ATC_SAMPLE_2 },
  { id: "egll", label: "EGLL Heathrow Director", segments: 472, station: "London Heathrow", audioUrl: ATC_SAMPLE_3 },
];
