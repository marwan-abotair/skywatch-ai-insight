export type Session = {
  id: string;
  date: string;
  feed: string;
  duration: string;
  speechSegments: number;
  callsigns: number;
  hasSummary: boolean;
};

export const SESSIONS: Session[] = [
  { id: "s-2025-04-25-1500", date: "2025-04-25 15:00", feed: "LSZB Twr/App/Dep", duration: "01:00:12", speechSegments: 217, callsigns: 14, hasSummary: true },
  { id: "s-2025-04-25-1400", date: "2025-04-25 14:00", feed: "LSZB Twr/App/Dep", duration: "00:58:44", speechSegments: 198, callsigns: 12, hasSummary: true },
  { id: "s-2025-04-24-1700", date: "2025-04-24 17:00", feed: "LSZH Tower", duration: "01:12:09", speechSegments: 312, callsigns: 22, hasSummary: true },
  { id: "s-2025-04-24-0800", date: "2025-04-24 08:00", feed: "EDDF Approach", duration: "00:45:31", speechSegments: 184, callsigns: 19, hasSummary: false },
  { id: "s-2025-04-23-2200", date: "2025-04-23 22:00", feed: "KJFK Tower", duration: "00:30:18", speechSegments: 122, callsigns: 16, hasSummary: true },
  { id: "s-2025-04-23-1100", date: "2025-04-23 11:00", feed: "EGLL Heathrow Director", duration: "01:30:55", speechSegments: 421, callsigns: 27, hasSummary: true },
  { id: "s-2025-04-22-1430", date: "2025-04-22 14:30", feed: "LFPG Ground/Tower", duration: "00:42:09", speechSegments: 156, callsigns: 11, hasSummary: false },
];
