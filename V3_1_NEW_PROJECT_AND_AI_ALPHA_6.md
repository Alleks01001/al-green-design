# V3.1 New Project & Reliable Garden AI Alpha 6

## Neues Projekt

- Der neue grüne Befehl „＋ Neues Projekt“ öffnet einen eigenen Projektassistenten.
- Eingaben: Projektname, Grundstücksbreite, Grundstückstiefe sowie Vorlagen 15 × 10 m, 20 × 15 m und 30 × 20 m.
- „Grundstück anlegen“ erzeugt eine maßstäbliche, editierbare Fläche und einen BIM-Datensatz mit der korrekten Quadratmeterzahl.
- „3D-Gelände aktivieren“ erzeugt ein flaches, an die Grundstücksmaße angepasstes Geländeraster.
- Das neue Projekt startet in 2D, das Grundstück ist ausgewählt und kann direkt weiterbearbeitet werden.
- „Zeichnung leeren“ leert nur das aktuelle Projekt. „Neues Projekt“ erzeugt dagegen eine neue Projekt-ID mit neuem Namen und neuen Maßen.
- Beide Aktionen behalten einen Rückgängig-Stand des vorherigen Projekts.

## Garden-KI

- Das sichtbare Garden-KI-Feld ist jetzt wirklich an `/api/garden` angebunden.
- Bei vorhandenem `OPENAI_API_KEY` wird die Online-KI verwendet.
- Ohne Schlüssel, bei Netzwerkfehlern oder bei einer unbrauchbaren Online-Antwort greift automatisch der lokale CAD-Generator ein.
- Freie Beschreibungen erzeugen deshalb immer sichtbare, ausgewählte und bearbeitbare CAD-Objekte.
- Mehrere Elemente einer Beschreibung werden gemeinsam erzeugt, beispielsweise Pool, fünf Bäume, Pergola und Weg.
- Unterstützt werden unter anderem Grundstück, Terrasse, Rasen, Beet, Weg, Mauer, Zaun, Sichtschutz, Pool, Teich, Gebäude, Pergola, Carport, Sitzbank, Bäume, Sträucher, Hecken, Stauden und Gräser.
- Lade-, Online-, Lokal- und Fehlerstatus werden deutlich angezeigt.
- Strg/Cmd + Enter startet die Generierung ebenfalls.
- Der AI Garden Designer setzt seine erste Variante beim Erzeugen sofort in 2D und 3D ein.

## Kompatibilität

- Vollseitenbibliothek, lokale Speicherung und interaktive 3D-Auswahl bleiben erhalten.
- Projektschema bleibt `3.1-alpha.4`.
- Paketversion: `3.1.0-alpha.6`.
