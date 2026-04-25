## Ziel

Aus dem statischen Mock-Dashboard wird eine echte Live-Pipeline:

```
Legal ATC Stream → Browser <audio> + Web-Audio-Filter (Enhanced)
                ↓ MediaRecorder (15s Chunks)
        POST /api/transcribe (Server Function, Gemini Audio Input)
                ↓
        Live-Transkript (state) → TranscriptWindow + Agent-Kontext
```

OpenSky liefert parallel die Live-Flugpositionen für die Map (bereits implementiert).

---

## 1. Audio-Quelle: legale ATC-Streams

**Problem:** LiveATC.net verbietet Re-Streaming und blockt CORS. Wir nutzen stattdessen Streams, die explizit Re-Use erlauben oder volunteer-Feeds mit permissiver Lizenz.

**Konkrete Quellen** (alle CORS-fähig oder über Edge-Proxy mit klarer Lizenz):
- **OpenSky Network ATC samples** – einige Flughäfen haben offene Test-Streams
- **Broadcastify** hat ein paar permissive Aviation-Feeds (mit korrekter Attribution)
- **Fallback:** lange Loops aus archive.org-Recordings (z.B. EHAM, JFK, KLAX), die wir als "Live" simulieren

`src/data/feeds.ts` wird erweitert um:
```ts
type Feed = {
  ...
  liveStreamUrl?: string;    // Icecast/MP3, optional
  loopUrl: string;           // immer vorhanden, archive.org Fallback
  isLiveProxied: boolean;    // true = via /api/stream proxy
};
```

Wenn `liveStreamUrl` gesetzt UND CORS-fähig → direkt im Browser. Sonst → über kurze Edge-Proxy-Route `/api/stream/$feedId` (~25s CPU-Budget pro Request, Browser reconnected automatisch via `<audio>` Tag).

---

## 2. Web-Audio-Filter (bereits da, bleibt)

`PlayerHeatmap.tsx` hat schon Highpass + Peaking + Compressor + Crossfade. Wird unverändert übernommen, nur die Quelle wechselt von statischer MP3 auf Live-URL bzw. Loop.

---

## 3. Live-Transkription via Gemini

### Neue Server-Route `src/routes/api/transcribe.ts`

- `POST` empfängt `multipart/form-data` mit einem ~15s Audio-Chunk (webm/opus, MediaRecorder default)
- ruft Lovable AI Gateway mit `google/gemini-2.5-flash` auf, Audio als base64 inline_data, Prompt: *"Transcribe this ATC radio recording. Output JSON: `{ lines: [{time, speaker, text}] }`. Use UTC timestamps relative to NOW. If silence/unintelligible, return empty array."*
- Tool-Calling für strukturierten Output (siehe knowledge: structured output via tool calling)
- Behandelt 429/402 wie der bestehende `/api/chat` Handler
- CORS-Headers + OPTIONS-Handler

### Neuer Hook `src/hooks/useLiveTranscription.ts`

- Bekommt das `<audio>`-Element bzw. dessen `MediaStream` (via `audio.captureStream()`)
- Startet `MediaRecorder` mit `timeslice = 15000`
- Bei jedem `dataavailable` Event → POST an `/api/transcribe`
- Hängt empfangene Lines an einen `liveTranscript: TranscriptLine[]` State
- Cleanup auf Stop

### Neuer Store `src/stores/liveTranscript.ts`

Einfacher Zustand (entweder Zustand/Jotai oder simpler React Context), damit:
- `TranscriptWindow` die Live-Lines + die Mock-Lines mergen kann
- `AgentChat` die letzten ~30 min an den Chat-Endpoint mitschicken kann (statt der hardcoded `TRANSCRIPT_TEXT`)

---

## 4. UI-Integration

### `TopControlBar`
- "Go Live" Button startet jetzt wirklich:
  - Audio-Element lädt `liveStreamUrl` (oder loop)
  - Hook startet MediaRecorder + Transcription
- Indikator zeigt "● LIVE · transcribing" wenn aktiv

### `TranscriptWindow`
- Zeigt zuerst Live-Lines (farblich abgehoben, neueste oben/unten je nach autoScroll)
- Mock-Lines bleiben als historischer Kontext darunter
- "X new lines" Indikator bei eingehenden Chunks

### `AgentChat`
- Statt `TRANSCRIPT_TEXT` aus dem Mock → liest aus dem LiveTranscript-Store
- System-Prompt-Erweiterung: *"Transcript below contains LIVE ATC from {feed.station}, last update {timestamp}. Answer using only this context."*

---

## 5. Edge-Runtime-Constraints

- Gemini-Call pro Chunk: ~2-3s Latenz, gut innerhalb 30s CPU-Budget
- Audio-Chunks ~15s Opus = ~30-50KB → unproblematisch
- Bei `429` (Rate-Limit) → Toast + Pause der nächsten Chunks für 30s
- Bei `402` (Credits) → klarer Fehlertoast mit Settings-Link

---

## Geänderte / neue Dateien

**Neu:**
- `src/routes/api/transcribe.ts` – Gemini Audio-Input Endpoint
- `src/routes/api/stream.$feedId.ts` – optionaler Edge-Proxy für nicht-CORS Streams
- `src/hooks/useLiveTranscription.ts` – MediaRecorder + Upload-Loop
- `src/stores/liveTranscript.ts` – geteilter State für Transkript + Chat

**Geändert:**
- `src/data/feeds.ts` – neue Felder, geprüfte legale Stream-URLs
- `src/components/PlayerHeatmap.tsx` – Quelle dynamisch, MediaStream rausgeben
- `src/components/TopControlBar.tsx` – Go-Live triggert echte Pipeline
- `src/components/TranscriptWindow.tsx` – Merge Live + Mock
- `src/components/AgentChat.tsx` – Transcript aus Store statt hardcoded
- `src/routes/index.tsx` – State-Wiring

**Unverändert:** Map (OpenSky ist bereits live), Settings, History, ai-coustics (nicht aktiviert).

---

## Nicht enthalten / Limits (ehrlich)

- **Keine perfekte Echtzeit-Transkription.** 15s Chunks = max. ~17s Verzögerung pro Line. Streaming-STT würde dedizierten Provider (Deepgram/Whisper Realtime) brauchen.
- **Kein ai-coustics.** Web-Audio-Filter reicht laut deiner Wahl.
- **LiveATC.net bleibt ausgeschlossen.** Wenn du später eine eigene SDR-URL hast, einfach in Settings eintragen → läuft direkt.
- **Gemini-Genauigkeit bei ATC-Jargon** ist ok, aber nicht so gut wie spezialisierte ATC-STT. Wir können später optional auf OpenAI Whisper umsteigen.