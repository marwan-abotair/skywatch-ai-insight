## Problem

Die Live-Pipeline (MediaRecorder → `/api/transcribe` → Gemini → Store) ist bereits implementiert und an `TranscriptWindow` und `AgentChat` angeschlossen. ABER: Der Agent bekommt im Request **zuerst den kompletten Mock-Transcript** und erst danach (falls überhaupt vorhanden) Live-Zeilen — gekappt auf die letzten 200 Zeilen. Da der Mock allein schon ~80 Zeilen hat und die Live-Pipeline meist 0 Zeilen liefert (weil Audio nicht abgespielt wird oder "Go Live" aus ist), antwortet das Modell dauerhaft mit dem Mock-Inhalt ("Daten enden 15:40 UTC").

Zusätzlich gibt es keine deutliche UI-Anzeige, **warum** keine Live-Zeilen kommen (Player nicht gestartet? Go Live aus? Stream nicht ready? Rate-Limit?).

## Geplante Änderungen

### 1. `src/components/AgentChat.tsx` — Live als primäre Quelle

- Wenn `liveLines.length > 0`, sende **NUR** die Live-Zeilen als `transcript` an `/api/chat` (kein Mock-Mix mehr).
- Wenn `liveLines.length === 0` UND `liveStatus !== "idle"`, sende leeren Transcript + Hinweis "live pipeline aktiv, aber noch keine Transmissions empfangen" — der Agent soll dann ehrlich sagen "noch kein Funkverkehr empfangen", statt Mock-Daten zu erfinden.
- Nur wenn Pipeline komplett `idle` (User noch nie auf Go Live), Mock als Demo-Quelle verwenden.
- Header-Hinweis erweitern: zeigt klar "LIVE · X Transmissions" oder "LIVE · warte auf Funkverkehr…" oder "DEMO MODE (Mock)".

### 2. `src/routes/api/chat.ts` — System-Prompt schärfen

- Im System-Prompt explizit machen: "Du erhältst den AKTUELL empfangenen Funkverkehr. Wenn der Transcript leer ist oder nur einen Hinweis enthält, sag ehrlich 'noch keine Transmissions empfangen'. Erfinde KEINE Zeiten oder Rufzeichen."
- Optional: Quellen-Marker mitgeben (`source: "live"` vs `"demo"`), damit das Modell antwortet entsprechend.

### 3. `src/components/TopControlBar.tsx` — Hinweis-Pille

- Wenn `isLive=true` aber Player ist pausiert oder kein Stream da, eine kleine Warn-Pille zeigen: "▶ Press play to start transcription".
- Dafür `playing`-Status aus `PlayerHeatmap` nach oben heben (kleiner Refactor: `onPlayingChange?: (playing: boolean) => void` Prop hinzufügen) und in der Bar als Pille anzeigen.

### 4. `src/components/PlayerHeatmap.tsx` — Auto-Play bei "Go Live"

- Neuer Prop `autoPlay?: boolean`. Wenn `autoPlay=true` (kommt von `isLive` aus dem Dashboard), versucht der Player nach `ensureGraph()` automatisch `play()` aufzurufen. Browser-Autoplay-Policy: das funktioniert nur, weil der User vorher den Go-Live-Button geklickt hat (User-Gesture-Kette bleibt erhalten).
- Reduziert die "warum passiert nichts"-Verwirrung dramatisch.

### 5. `src/routes/index.tsx` — Verkabelung

- `playing` State im Dashboard halten, `onPlayingChange` an `PlayerHeatmap` durchreichen, `isPlaying` in die `TopControlBar` weitergeben.
- `autoPlay={isLive}` an `PlayerHeatmap`.

## Was NICHT geändert wird

- Die Transcribe-API (`/api/transcribe`), der Hook (`useLiveTranscription`) und der Store funktionieren bereits korrekt.
- Audio-Quellen in `feeds.ts` bleiben (Wikimedia ATIS-Aufnahmen sind legal & CORS-konform und liefern echtes ATC-Audio, das Gemini transkribieren kann).
- Keine Änderung an Map oder anderen Tabs.

## Erwartetes Verhalten nach Fix

1. User klickt **Go Live** → Pille "▶ Press play…" erscheint kurz, Player startet automatisch.
2. Nach ~15 s erste Chunk-Transkription → erste Live-Zeile erscheint im Transcript-Fenster (mit Radio-Icon, blauer Akzent).
3. User fragt Agent "was läuft gerade?" → Agent antwortet basierend auf den **echten** Live-Zeilen und sagt ehrlich "noch keine Transmissions" wenn der Stream gerade still ist.
4. Mock wird nur noch im Demo-Modus (Go Live aus, noch nie geklickt) verwendet.
