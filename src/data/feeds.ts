export type Feed = {
  id: string;
  label: string;
  segments: number;
  station: string;
  audioUrl: string;
  region: "EU" | "US";
  // Optional bbox [latMin, lonMin, latMax, lonMax] for the live map view
  bbox?: [number, number, number, number];
};

// All audio files: Wikimedia Commons, CC-licensed, CORS-enabled.
// Verified URLs via MediaWiki API (April 2026).
export const FEEDS: Feed[] = [
  {
    id: "eham",
    label: "EHAM Schiphol ATIS",
    segments: 358,
    station: "Amsterdam Schiphol",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/8/87/ATIS_Schiphol.ogg",
    region: "EU",
    bbox: [51.0, 3.0, 53.7, 7.5],
  },
  {
    id: "lfpo",
    label: "LFPO Paris-Orly ATIS",
    segments: 412,
    station: "Paris Orly",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Atis_Paris-Orly.ogg",
    region: "EU",
    bbox: [47.5, 1.0, 50.0, 4.5],
  },
  {
    id: "lfbo",
    label: "LFBO Toulouse ATIS",
    segments: 244,
    station: "Toulouse-Blagnac",
    audioUrl: "https://upload.wikimedia.org/wikipedia/commons/2/28/LFBO_atis.ogg",
    region: "EU",
    bbox: [42.5, -0.5, 45.0, 3.5],
  },
  {
    id: "kjfk",
    label: "KJFK NY TRACON",
    segments: 489,
    station: "New York JFK",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/72/New_York_Control_tower_to_NY_TRACON.ogg",
    region: "US",
    bbox: [40.0, -75.0, 41.5, -72.5],
  },
  {
    id: "klga",
    label: "KLGA Flight 1549",
    segments: 521,
    station: "New York LaGuardia",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b5/Flight_1549_FAA_New_York_TRACON_audio_extract.ogg",
    region: "US",
    bbox: [40.5, -74.5, 41.2, -73.5],
  },
  {
    id: "zuuu",
    label: "ZUUU Chengdu ATIS",
    segments: 472,
    station: "Chengdu Shuangliu",
    audioUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/01/ATIS_of_CTU_on_2013-10-12.OGG",
    region: "EU",
    bbox: [29.5, 102.5, 32.0, 105.5],
  },
];
