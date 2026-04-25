export type Feed = {
  id: string;
  label: string;
  segments: number;
  station: string;
};

export const FEEDS: Feed[] = [
  { id: "lszb", label: "LSZB Twr/App/Dep", segments: 358, station: "Bern" },
  { id: "lszh", label: "LSZH Tower", segments: 412, station: "Zurich" },
  { id: "eddf", label: "EDDF Approach", segments: 521, station: "Frankfurt" },
  { id: "kjfk", label: "KJFK Tower", segments: 489, station: "New York JFK" },
  { id: "egll", label: "EGLL Heathrow Director", segments: 472, station: "London Heathrow" },
  { id: "lfpg", label: "LFPG Ground/Tower", segments: 366, station: "Paris CDG" },
];
