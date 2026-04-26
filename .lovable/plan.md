## ATC Audio Intelligence Dashboard

Hochmodernes "Mission-Critical" Dashboard im Dark Mode mit Glassmorphism, Neon-Grün-Akzent (ai-coustics Style) und Monospace für Daten/Transkripte. Audio + Transkripte sind aktuell Mock-Daten, der SkyWatch AI-Agent antwortet aber **echt** über das Lovable AI Gateway auf Basis der angezeigten Transkripte. Echte LiveATC-Streams + Whisper-Transkription folgen in einem späteren Schritt.

### Design-System
- **Hintergrund**: Tiefes Anthrazit/Schiefergrau, subtile Noise-/Grid-Overlay
- **Akzent**: Neon-Grün (ai-coustics) für Speech, aktive States, Enhanced-Glow
- **Status-Farben**: Speech (neon-grün), Silent (grau), Pending (gelb/amber), Playing (orange), Live (rot pulsierend → grün live)
- **Glassmorphism**: `backdrop-blur` + halbtransparente Panels mit feinen Rändern (1px border, low-opacity)
- **Typo**: Inter/Geist Sans für UI, JetBrains Mono für Transkripte, Zeitstempel und Tabellen
- **Animationen**: Pulsierender Live-Button, Glow-Transition beim Enhanced-Toggle, Fade-in für Chat-Nachrichten

### Routen
- `/` – Haupt-Dashboard
- `/history` – Liste vergangener Sessions/Recordings (Mock)
- `/settings` – Feed-Verwaltung, Audio-Defaults, AI-Modell-Auswahl

Gemeinsame Sticky-Sidebar / Top-Nav mit Logo "LiveATC AI-Analyzer" und Routen-Links.

### Dashboard-Layout (`/`)

**1. Top Control Bar (sticky, glass)**
- Links: Logo "LiveATC AI-Analyzer" mit kleinem Radar-Icon
- Feed-Dropdown: "LSZB Twr/App/Dep (358 seg)" + weitere Demo-Feeds (LSZH, EDDF, KJFK …)
- Mitte: Toggle "Raw Audio ↔ Enhanced (ai-coustics)" – Enhanced-Modus glüht neon-grün, kleiner Equalizer-Indikator
- "Go Live" Button: rot pulsierend (inactive) → grün solid mit Live-Dot (active)
- Rechts: Legende (Speech / Silent / Pending / Playing) als kleine farbige Quadrate mit Labels

**2. Audio Player + Activity Heatmap**
- Glass-Card mit modernem Player: Play/Pause, Skip ±10s, Fortschrittsbalken (klickbar), Zeitanzeige (Mono), Lautstärke-Slider
- Darunter Activity Heatmap: ~40×10 Grid abgerundeter Quadrate
  - Deterministisch generiert mit realistischer Verteilung (~70% silent, ~25% speech, einige pending, 1 playing)
  - Hover zeigt Tooltip mit Segment-Zeit + Status
  - Klick auf Segment springt im Player zu dieser Position

**3. Split-Screen unten (2 Spalten, gleich hoch, scrollbar)**

*Linke Spalte – Live Transcript Window*
- Terminal-/Log-Look mit dezentem Grid-Hintergrund
- Jede Zeile: `15:37:30` (Mono, gedimmt) + Status-Icon (🚫 silent, ✈️ speech) + Transkript-Text
- Callsigns wie "Hotel Bravo", "Swiss 123", "Speedbird" werden als Pills/farbig hervorgehoben (neon-grün auf dunklem Hintergrund)
- Auto-scroll-to-bottom Toggle, Pause-Button beim Hover
- Suchleiste oben zum Filtern der Transkripte

*Rechte Spalte – AI Agent Interface*
- Header: "Ask the SkyWatch Agent" + Sub: "Context: Last hour · 360 lines"
- Chat-Verlauf:
  - User-Bubbles rechts, akzent-blau
  - Agent-Bubbles links, glass-grau, Markdown + Tabellen-Rendering (Tailwind-Tabelle mit Sticky-Header, Mono-Zellen)
  - System-Hinweise zentriert klein grau (z.B. "uploading 2 files, analyzing 360 lines…")
- **Funktional**: Edge Function `chat` ruft Lovable AI Gateway (`google/gemini-3-flash-preview`) mit SSE-Streaming auf. Aktuelles Transkript wird als Kontext mitgesendet. System-Prompt: "Du bist SkyWatch, ein ATC-Funk-Analyse-Assistent. Antworte präzise, nutze Markdown-Tabellen für strukturierte Daten (Spalten: Zeit (UTC), Rufzeichen, Details)."
- Demo-Erstkonversation vorgefüllt (User-Frage + System-Status + Agent-Tabellenantwort mit "Hotel Fox – Lift off on route Sierra…")
- Token-by-Token Streaming-Rendering, Stop-Button, Fehler-Toasts für 429/402
- Eingabefeld unten mit Placeholder "e.g. which callsigns appeared most often?", Senden-Button (Icon + Enter)

### History-Seite (`/history`)
- Tabelle/Liste vergangener Sessions: Datum, Feed, Dauer, Anzahl Speech-Segmente, Anzahl Callsigns
- Jede Zeile klickbar (führt aktuell zurück zum Dashboard mit dieser Session – Mock)
- Filter: Datum, Feed, nur mit AI-Zusammenfassung

### Settings-Seite (`/settings`)
- Feed-Management: Liste der konfigurierten Feeds, Add/Remove (Mock-Persistenz im LocalStorage)
- Audio: Standard-Lautstärke, Auto-Enhanced-Toggle Default, Auto-Play
- AI-Agent: Modellwahl (Flash / Pro), Kontextfenster (letzte 15 Min / 1 h / komplette Session), System-Prompt-Editor (advanced)

### Technik & Backend
- **Lovable Cloud** wird aktiviert für Edge Function + Secret-Verwaltung
- Edge Function `chat` (SSE-Streaming, CORS, 429/402 Handling) wie im Standard-Pattern – nutzt `LOVABLE_API_KEY`
- Mock-Transkripte als TypeScript-Modul (`src/data/mockTranscript.ts`), 360 Zeilen, realistische ATC-Phrasen mit Callsigns
- Mock-Heatmap deterministisch aus Seed in `src/lib/heatmap.ts`
- Settings persistieren via `localStorage`, History als statisches Mock-Array
- Lucide-Icons: `Radio`, `Plane`, `Mic`, `MicOff`, `Play`, `Pause`, `Volume2`, `Send`, `Sparkles`, `Activity`, `Settings`, `History`, `Search`

### Späterer Ausbau (nicht in diesem Schritt)
- Echte LiveATC-Stream-Anbindung (Backend-Proxy + HLS)
- Whisper-basierte Echtzeit-Transkription
- ai-coustics Audio-Enhancement (echte API)
- Speicherung von Sessions in Lovable Cloud DB statt LocalStorage