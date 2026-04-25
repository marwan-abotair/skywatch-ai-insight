Das Problem ist klar: Die Live-Transkription funktioniert technisch, aber der Chat startet mit fest eingebauten Demo-Nachrichten aus `AgentChat.tsx`. Dadurch sieht es so aus, als würde der Agent gerade Live-Daten analysieren, obwohl diese erste Antwort nur ein statisches Beispiel mit alten 15:xx-Zeiten ist. Zusätzlich mischt das Transcript-Fenster aktuell Mock-Zeilen und Live-Zeilen, was die Verwirrung verstärkt.

Plan:

1. Demo-Chatverlauf entfernen
   - In `src/components/AgentChat.tsx` wird `INITIAL` durch einen neutralen Startzustand ersetzt.
   - Keine vorgefüllte Frage, kein „uploading 2 files“, keine Hotel-Fox-Mike-Antwort mehr.
   - Stattdessen zeigt der Chat klar: Live einschalten und warten, bis echte Transkriptionen eintreffen.

2. Demo-Fallback im Agent entschärfen
   - Der Agent soll bei Fragen nach „gerade“, „aktuell“, „jetzt“, „letzte 5 Minuten“ nicht mehr automatisch Mock-Daten verwenden.
   - Wenn keine Live-Zeilen vorhanden sind, antwortet er: Es liegen noch keine Live-Transkriptionen vor.
   - Demo-Daten werden nur noch explizit als Demo benutzt, nicht als Antwort auf aktuelle Live-Fragen.

3. Transcript-Fenster live-eindeutig machen
   - Sobald die Live-Pipeline aktiv ist oder Live-Zeilen vorhanden sind, werden die alten Mock-Zeilen ausgeblendet.
   - Dadurch sieht man im Transcript-Fenster nur echte Live-Zeilen während Live-Betrieb.
   - Demo-Zeilen bleiben nur sichtbar, wenn Live aus ist.

4. Sichtbaren Live-Status verbessern
   - In `AgentChat` und `TranscriptWindow` wird deutlicher angezeigt:
     - `LIVE · waiting for audio` wenn Go Live an ist, aber noch nichts transkribiert wurde
     - `LIVE · N transmissions` wenn echte Zeilen im Store sind
     - `DEMO MODE` nur wenn wirklich Demo angezeigt wird

5. Optionaler Schutz gegen stale Live-Daten
   - `lastChunkAt` aus dem Live-Store kann genutzt werden, um alte Live-Daten zu markieren.
   - Wenn die letzte Transkription länger als ca. 2 Minuten her ist, zeigt die UI einen Hinweis, dass der Stream wahrscheinlich nicht mehr aktuell ist.

Technische Details:
- Bearbeiten von `src/components/AgentChat.tsx`
- Bearbeiten von `src/components/TranscriptWindow.tsx`
- Ggf. Nutzung von `lastChunkAt` aus `src/stores/liveTranscript.tsx`, ohne neue Architektur
- Keine Änderung am Transcribe-Backend nötig: `/api/transcribe` liefert bereits echte Live-Zeilen.

Ergebnis:
Der Agent wird nicht mehr mit der alten 15:36/15:40-Demo-Antwort starten und aktuelle Fragen nicht mehr aus Mock-Daten beantworten. Wenn Live-Daten fehlen, sagt er das ehrlich; wenn Live-Daten da sind, nutzt er nur diese.