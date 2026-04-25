import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function FlightMapDefault(props: Props) {
  return <FlightMap {...props} />;
}
import { Plane, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Aircraft = {
  icao24: string;
  callsign: string;
  origin: string;
  lon: number;
  lat: number;
  altitude: number; // meters
  velocity: number; // m/s
  heading: number; // degrees
  onGround: boolean;
};

type Props = {
  bbox?: [number, number, number, number]; // latMin, lonMin, latMax, lonMax
  station: string;
};

// Build a triangular plane icon rotated to heading
function planeIcon(heading: number, onGround: boolean) {
  const color = onGround ? "oklch(0.74 0.19 55)" : "oklch(0.86 0.22 145)";
  return L.divIcon({
    className: "",
    html: `<div style="transform: rotate(${heading}deg); transform-origin: 50% 50%;">
      <svg viewBox="0 0 24 24" width="22" height="22" style="filter: drop-shadow(0 0 4px ${color});">
        <path d="M12 2 L15 14 L22 16 L22 18 L13 17 L13 22 L15 23 L15 24 L9 24 L9 23 L11 22 L11 17 L2 18 L2 16 L9 14 Z"
          fill="${color}" stroke="oklch(0.18 0.02 240)" stroke-width="0.6"/>
      </svg>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function FitBounds({ bbox }: { bbox: [number, number, number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([
      [bbox[0], bbox[1]],
      [bbox[2], bbox[3]],
    ]);
  }, [map, bbox]);
  return null;
}

const FALLBACK: Aircraft[] = [
  { icao24: "demo01", callsign: "KLM1234", origin: "Netherlands", lon: 4.76, lat: 52.31, altitude: 8500, velocity: 220, heading: 90, onGround: false },
  { icao24: "demo02", callsign: "DLH4XK", origin: "Germany", lon: 5.45, lat: 52.65, altitude: 11200, velocity: 245, heading: 270, onGround: false },
  { icao24: "demo03", callsign: "BAW28C", origin: "United Kingdom", lon: 4.20, lat: 52.10, altitude: 0, velocity: 5, heading: 180, onGround: true },
  { icao24: "demo04", callsign: "AFR1180", origin: "France", lon: 5.10, lat: 53.00, altitude: 9800, velocity: 230, heading: 45, onGround: false },
];

export function FlightMap({ bbox, station }: Props) {
  const fallbackBbox: [number, number, number, number] = bbox ?? [51.0, 3.0, 53.7, 7.5];
  const [aircraft, setAircraft] = useState<Aircraft[]>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [usingDemo, setUsingDemo] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAircraft = useMemo(
    () => async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);
      try {
        const [latMin, lonMin, latMax, lonMax] = fallbackBbox;
        const url = `https://opensky-network.org/api/states/all?lamin=${latMin}&lomin=${lonMin}&lamax=${latMax}&lomax=${lonMax}`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`OpenSky ${res.status}`);
        const data = await res.json();
        const states: any[] = data.states ?? [];
        const list: Aircraft[] = states
          .filter((s) => s[5] != null && s[6] != null)
          .slice(0, 200)
          .map((s) => ({
            icao24: s[0],
            callsign: (s[1] ?? "").trim() || "—",
            origin: s[2] ?? "",
            lon: s[5],
            lat: s[6],
            altitude: s[7] ?? 0,
            velocity: s[9] ?? 0,
            heading: s[10] ?? 0,
            onGround: !!s[8],
          }));
        if (list.length > 0) {
          setAircraft(list);
          setUsingDemo(false);
        } else {
          setAircraft(FALLBACK);
          setUsingDemo(true);
        }
        setLastUpdate(new Date());
      } catch (e: any) {
        if (e.name === "AbortError") return;
        setError("OpenSky API nicht erreichbar (Rate-Limit). Demo-Daten aktiv.");
        setAircraft(FALLBACK);
        setUsingDemo(true);
      } finally {
        setLoading(false);
      }
    },
    [fallbackBbox.join(",")],
  );

  useEffect(() => {
    fetchAircraft();
    const id = setInterval(fetchAircraft, 30_000);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [fetchAircraft]);

  return (
    <section className="glass rounded-xl p-5 lg:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-sm font-mono uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
            <Plane className="h-3.5 w-3.5 text-primary" />
            Live Flight Tracking · {station}
          </h2>
          <p className="text-[11px] font-mono text-muted-foreground mt-1">
            {usingDemo ? (
              <span className="text-pending">DEMO MODE · 4 mock aircraft</span>
            ) : (
              <span className="text-primary">LIVE · {aircraft.length} aircraft via OpenSky Network</span>
            )}
            {lastUpdate && (
              <span className="opacity-60"> · updated {lastUpdate.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchAircraft}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md glass hover:bg-white/5 transition text-xs font-mono disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 text-xs font-mono text-pending">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      <div className="rounded-lg overflow-hidden border border-white/10 h-[500px] relative">
        <MapContainer
          center={[(fallbackBbox[0] + fallbackBbox[2]) / 2, (fallbackBbox[1] + fallbackBbox[3]) / 2]}
          zoom={7}
          style={{ height: "100%", width: "100%", background: "oklch(0.16 0.02 240)" }}
          scrollWheelZoom
        >
          <FitBounds bbox={fallbackBbox} />
          <TileLayer
            attribution='&copy; OpenStreetMap · OpenSky Network'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {aircraft.map((a) => (
            <Marker key={a.icao24} position={[a.lat, a.lon]} icon={planeIcon(a.heading, a.onGround)}>
              <Popup>
                <div style={{ fontFamily: "monospace", fontSize: 11, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.callsign}</div>
                  <div>ICAO24: {a.icao24}</div>
                  <div>Origin: {a.origin || "—"}</div>
                  <div>Alt: {Math.round(a.altitude)} m · {Math.round(a.altitude * 3.281)} ft</div>
                  <div>Speed: {Math.round(a.velocity * 1.944)} kt</div>
                  <div>Heading: {Math.round(a.heading)}°</div>
                  <div>{a.onGround ? "🛬 On Ground" : "✈️ Airborne"}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}
