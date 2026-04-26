## Ziel

Das UI ist bereits vollständig (Dark-Aviation-Dashboard, Heatmap-Grid, Transkript-Log, KI-Chat mit Markdown-Tabellen, Raw/Enhanced-Toggle, Legende). Das echte Problem: die Audio-Quellen in `src/data/feeds.ts` sind statische Wikimedia-OGGs aus 2009–2013 → seit 2 Stunden dieselbe Stimme, keine neuen Transkriptionen möglich.

Die hochgeladene `atc-ai-master.zip` enthält ein funktionierendes Python-Referenzprojekt mit `feeds.json` (echte LiveATC-Mounts wie `http://d.liveatc.net/lszb2_del_twr_app`, `lszb2_atis`, `lszb2_app_dep` …). Diese Mounts liefern Live-MP3-Streams, sind aber:
- **HTTP only** (Mixed-Content-Block im HTTPS-Preview),
- **CORS-frei** (Browser kann sie nicht direkt in WebAudio routen → Transkription bricht).

Lösung: ein eigener TanStack-Server-Proxy hängt sich an den Upstream-Mount und pipet den MP3-Stream mit korrekten CORS- und Content-Type-Headern an den Browser.

## Umsetzung

### 1. Server-Route `src/routes/api/atc-stream.$mount.ts`
- GET-Handler, der `mount` aus den Params nimmt (whitelist-validiert gegen die Feed-Liste, um SSRF auszuschließen).
- `fetch("http://d.liveatc.net/<mount>")` mit `User-Agent: Mozilla/5.0 ...` (LiveATC blockt sonst).
- Response.body als ReadableStream zurückgeben mit Headern:
  `Content-Type: audio/mpeg`, `Cache-Control: no-store`, `Access-Control-Allow-Origin: *`.
- Fehlerfälle (Mount down, 404, Timeout) sauber an den Client melden, damit `PlayerHeatmap` das `error`-Overlay zeigt.
- Mount-Whitelist als Konstante im File (oder importiert aus `src/data/feeds.ts`), damit niemand den Proxy für beliebige URLs missbraucht.

### 2. `src/data/feeds.ts` neu befüllen
- Kuratiertes Subset aus `feeds.json` der ZIP, Format an bestehendes `Feed`-Type angepasst (id, label, station, region, bbox).
- `audioUrl` zeigt jetzt auf `/api/atc-stream/<mount>` statt auf Wikimedia.
- Vorgeschlagene Erst-Auswahl (gleich Mix EU/US, alle aktive Mounts):
  - `lszb2_del_twr_app` – LSZB Bern Del/Twr/App/Dep (passt zur bisherigen Demo)
  - `lszb2_atis` – LSZB ATIS (loopt, gut für Test)
  - `kjfk_twr` – KJFK Tower (sehr aktiv)
  - `klax_twr` – KLAX Tower
  - `eddf_twr` – EDDF Frankfurt Tower
  - `lszh_twr` – LSZH Zürich Tower
- `segments` aus dem alten File wird zu einer rein optischen Größe (Live-Stream hat keine feste Dauer) – `PlayerHeatmap` wird daher in Schritt 3 angepasst.

### 3. `PlayerHeatmap.tsx` für Endlos-Streams ertüchtigen
- Wenn `audio.duration === Infinity` (Live-Stream): Slider/Position-Anzeige ausblenden bzw. durch „LIVE · läuft seit X" ersetzen, Heatmap rollt nur vorwärts (kein Seek).
- `seekTo` für Live-Streams deaktivieren.
- Skip-Buttons ausblenden, wenn Live.
- Heatmap-Cells werden über die letzten N Sekunden Audio-Energie (vom bestehenden Web-Audio-Graph via AnalyserNode) live gefüllt, statt aus statischen Mock-Segmenten – so passt das Grid-Visual zur tatsächlichen Sprach/Stille-Verteilung des Live-Streams.

### 4. UI-Hinweise / Status
- `TopControlBar.tsx`: Feed-Dropdown zeigt zusätzlich den Mount-Namen + Frequenz (aus `feeds.json` übernommen, z.B. „LSZB Del/Twr/App – 121.905 / 119.350").
- Klarer Hinweis im Player, falls der Stream gerade `silent` ist (LiveATC sendet bei keinem Funk lautlos weiter, das ist normal und kein Fehler).

### 5. Was NICHT Teil dieses Plans ist
- Kein neues UI-Re-Design – das aktuelle erfüllt deinen Brief bereits 1:1.
- Kein Port des Python-Backends (`agent.py`, `transcribe.py` aus der ZIP). Die Web-App nutzt weiterhin `/api/transcribe` (Lovable AI Gateway, Gemini), nur die Audio-Quelle ändert sich.
- Kein Aktivieren von ai-coustics-Enhancement serverseitig – der bestehende clientseitige WebAudio-Filter („Enhanced"-Toggle) bleibt als Light-Variante.

## Rechtlicher Hinweis
LiveATC.net erlaubt persönliches Anhören; ein öffentlicher Re-Stream / kommerzielle Nutzung ist nicht gedeckt. Diese Proxy-Route ist für deinen persönlichen Test gedacht; vor einem öffentlichen Publish solltest du LiveATC um Erlaubnis fragen oder auf VATSIM/eigene SDR-Quellen wechseln.

## Geänderte / neue Dateien
- **NEU** `src/routes/api/atc-stream.$mount.ts` – Streaming-Proxy mit Whitelist
- `src/data/feeds.ts` – echte Mounts statt Wikimedia
- `src/components/PlayerHeatmap.tsx` – Live-Stream-Modus (kein Seek, AnalyserNode-Heatmap)
- `src/components/TopControlBar.tsx` – Frequenz im Dropdown anzeigen

Nach Approval setze ich das in einem Rutsch um, du musst danach nur einmal „Go Live" + Play drücken und solltest innerhalb von ~15 s den ersten echten LSZB-Funkspruch im Transcript sehen.
