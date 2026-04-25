export type TranscriptLine = {
  time: string; // HH:MM:SS
  kind: "speech" | "silent";
  text: string;
};

// Deterministic mock transcript representing roughly the last hour of LSZB tower.
const RAW: Array<[string, "speech" | "silent", string]> = [
  ["14:35:12", "speech", "Bern Tower, Hotel Bravo Charlie Delta Echo, ready for departure runway 14."],
  ["14:35:24", "speech", "Hotel Bravo Charlie Delta Echo, Bern Tower, wind 140 degrees 6 knots, cleared for takeoff runway 14."],
  ["14:35:31", "speech", "Cleared for takeoff runway 14, Hotel Bravo Charlie Delta Echo."],
  ["14:36:02", "silent", "(no transmission)"],
  ["14:36:48", "speech", "Bern Approach, Swiss 1842, descending FL080, inbound POSAS."],
  ["14:36:59", "speech", "Swiss 1842, Bern Approach, descend altitude 6000 feet QNH 1018, expect ILS 14."],
  ["14:37:05", "speech", "Down to 6000 on 1018, ILS 14, Swiss 1842."],
  ["14:37:34", "silent", "(static)"],
  ["14:38:12", "speech", "Hotel Fox Mike, lift off on route Sierra, contact Geneva Information 124.150."],
  ["14:38:21", "speech", "124.150 Geneva, good day, Hotel Fox Mike."],
  ["14:39:02", "silent", ""],
  ["14:39:44", "speech", "Bern Ground, Speedbird 712, request push and start, stand 4."],
  ["14:39:55", "speech", "Speedbird 712, push approved, face north, start-up at your discretion."],
  ["14:40:08", "speech", "Push north, start-up, Speedbird 712."],
  ["14:41:10", "silent", ""],
  ["14:41:55", "speech", "Bern Tower, Cessna Hotel Bravo crossing 27 at Alpha."],
  ["14:42:03", "speech", "Hotel Bravo, cross 27 at Alpha, report vacated."],
  ["14:42:48", "speech", "Vacated, Hotel Bravo."],
  ["14:43:30", "silent", ""],
  ["14:44:11", "speech", "Bern Approach, Easy 4421, level FL120 inbound NEGRA."],
  ["14:44:21", "speech", "Easy 4421, descend FL090, direct DOLPI."],
  ["14:44:28", "speech", "Down to FL090 direct DOLPI, Easy 4421."],
  ["14:45:02", "silent", ""],
  ["14:46:18", "speech", "Hotel Fox Mike now on Geneva, thank you Bern, good day."],
  ["14:47:00", "silent", ""],
  ["14:47:42", "speech", "Bern Tower, Pilatus Hotel Bravo Romeo, ready for departure runway 32."],
  ["14:47:52", "speech", "Hotel Bravo Romeo, line up runway 32 and wait."],
  ["14:48:01", "speech", "Line up 32 and wait, Hotel Bravo Romeo."],
  ["14:48:30", "silent", ""],
  ["14:49:14", "speech", "Hotel Bravo Romeo, wind 320 at 4, cleared for takeoff runway 32."],
  ["14:49:21", "speech", "Cleared for takeoff 32, Hotel Bravo Romeo."],
  ["14:50:00", "silent", ""],
  ["14:51:22", "speech", "Bern Approach, Lufthansa 9CK heavy, request descent."],
  ["14:51:31", "speech", "Lufthansa 9CK, descend FL100, reduce speed 250 knots."],
  ["14:51:38", "speech", "Down to FL100, 250 knots, Lufthansa 9CK heavy."],
  ["14:52:10", "silent", ""],
  ["14:53:48", "speech", "Bern Tower, Hotel Bravo Romeo airborne, request frequency change."],
  ["14:53:55", "speech", "Hotel Bravo Romeo, contact Geneva Info 124.150, good day."],
  ["14:54:00", "speech", "124.150, Hotel Bravo Romeo, good day."],
  ["14:55:00", "silent", ""],
  ["14:56:11", "speech", "Bern Ground, Cessna Hotel Bravo, taxi to general aviation parking."],
  ["14:56:20", "speech", "Hotel Bravo, taxi to GA via Alpha, hold short of 14."],
  ["14:56:27", "speech", "Taxi via Alpha, hold short 14, Hotel Bravo."],
  ["15:01:40", "speech", "Bern Approach, Swiss 1842 established ILS 14."],
  ["15:01:48", "speech", "Swiss 1842, contact Tower 121.150, good day."],
  ["15:02:00", "speech", "121.150, good day, Swiss 1842."],
  ["15:02:35", "speech", "Bern Tower, Swiss 1842, established ILS 14."],
  ["15:02:43", "speech", "Swiss 1842, wind 130 at 5, runway 14, cleared to land."],
  ["15:02:50", "speech", "Cleared to land 14, Swiss 1842."],
  ["15:08:14", "speech", "Bern Approach, Easy 4421, request direct to TRA."],
  ["15:08:22", "speech", "Easy 4421, direct TRA approved, descend 4000."],
  ["15:08:29", "speech", "Direct TRA, down to 4000, Easy 4421."],
  ["15:14:02", "speech", "Bern Tower, Speedbird 712 ready for departure."],
  ["15:14:10", "speech", "Speedbird 712, hold position, traffic on short final."],
  ["15:14:16", "speech", "Holding position, Speedbird 712."],
  ["15:15:47", "speech", "Speedbird 712, line up and wait runway 14."],
  ["15:15:53", "speech", "Line up and wait, Speedbird 712."],
  ["15:16:34", "speech", "Speedbird 712, wind 150 at 7, cleared for takeoff runway 14."],
  ["15:16:40", "speech", "Cleared for takeoff 14, Speedbird 712."],
  ["15:24:02", "speech", "Bern Approach, Lufthansa 9CK heavy, established ILS 14."],
  ["15:24:09", "speech", "Lufthansa 9CK, contact Tower 121.150."],
  ["15:24:14", "speech", "Tower 121.150, Lufthansa 9CK heavy."],
  ["15:25:01", "speech", "Bern Tower, Lufthansa 9CK heavy, established ILS 14."],
  ["15:25:08", "speech", "Lufthansa 9CK heavy, wind 140 at 6, runway 14, cleared to land."],
  ["15:25:14", "speech", "Cleared to land 14, Lufthansa 9CK heavy."],
  ["15:34:40", "speech", "Bern Tower, Hotel Fox Mike requesting taxi for departure."],
  ["15:34:50", "speech", "Hotel Fox Mike, taxi via Alpha to holding point 14, QNH 1018."],
  ["15:34:58", "speech", "Taxi Alpha, holding point 14, QNH 1018, Hotel Fox Mike."],
  ["15:36:02", "speech", "Bern Tower, Hotel Fox Mike, ready for departure runway 14, route Sierra."],
  ["15:36:12", "speech", "Hotel Fox Mike, wind 140 at 5, cleared for takeoff runway 14, route Sierra approved."],
  ["15:36:18", "speech", "Cleared for takeoff 14, route Sierra, Hotel Fox Mike."],
  ["15:37:30", "silent", ""],
  ["15:38:11", "speech", "Hotel Fox Mike airborne, lift off on route Sierra."],
  ["15:38:19", "speech", "Hotel Fox Mike, contact Geneva Information 124.150, good day."],
  ["15:38:25", "speech", "124.150 Geneva, good day, Hotel Fox Mike."],
  ["15:40:00", "silent", ""],
];

export const TRANSCRIPT: TranscriptLine[] = RAW.map(([time, kind, text]) => ({ time, kind, text }));

export const CALLSIGNS = [
  "Hotel Bravo Charlie Delta Echo",
  "Hotel Bravo Romeo",
  "Hotel Bravo",
  "Hotel Fox Mike",
  "Swiss 1842",
  "Speedbird 712",
  "Easy 4421",
  "Lufthansa 9CK",
];

export function highlightCallsigns(text: string): Array<{ text: string; type: "text" | "callsign" }> {
  if (!text) return [{ text, type: "text" }];
  // Sort longest first so longer callsigns match before shorter prefixes.
  const sorted = [...CALLSIGNS].sort((a, b) => b.length - a.length);
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${sorted.map(escape).join("|")})`, "g");
  const parts = text.split(re);
  return parts
    .filter((p) => p !== "")
    .map((p) => ({ text: p, type: CALLSIGNS.includes(p) ? ("callsign" as const) : ("text" as const) }));
}
