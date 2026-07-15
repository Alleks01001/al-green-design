# AL Green Design – V0.19 VIDEO TO 3D + PRECISION

## Behoben: Bild wird wirklich angewendet

Nach dem Upload gibt es jetzt getrennte Aktionen:

- **Als Planhintergrund anwenden** – das Bild erscheint tatsächlich im 2D-Plan.
- **Bildanalyse anwenden** – erzeugt Terrainformen und Zonen und zeigt das Bild als Referenz.
- Transparenz einstellbar.
- Seitenverhältnis behalten oder Planfläche füllen.
- Hintergrund ausblenden, ohne den Upload zu verlieren.

## Behoben: präzises Verschieben

### 2D

- echte SVG-Koordinaten über `getScreenCTM().inverse()`
- kein Versatz durch unterschiedliche Seitenverhältnisse
- Drag-Offset bleibt erhalten: Objekte springen nicht mehr unter den Cursor
- Pointer Events für Maus und Touch
- Raster: 1 cm, 5 cm, 10 cm, 25 cm, 50 cm, 1 m
- Alt beim Ziehen: Raster temporär umgehen
- Pfeiltasten: 10 cm
- Alt + Pfeiltaste: 5 cm
- Shift + Pfeiltaste: 1 cm

### 3D

- Drag-Offset bleibt erhalten
- kein Sprung beim Start
- Zustand wird erst beim Loslassen endgültig aktualisiert
- Live-Koordinaten während der Bewegung

## VIDEO → 3D Studio

Neue Seite:

```text
/video-to-3d
```

Funktionen:

- Video hochladen
- 6–48 Frames extrahieren
- Frame-Vorschau
- schnelle 3D-Tiefen-/Reliefvorschau direkt im Browser
- Orbit-/Zoom-Ansicht
- Präzisions-Rekonstruktionsauftrag vorbereiten

### Technische Trennung

Die schnelle 3D-Vorschau ist eine bildbasierte Tiefen-/Reliefschätzung.
Eine präzise Mehrbild-Photogrammetrie benötigt einen separaten 3D-Worker:

```text
Kamerapositionen
→ Punktwolke
→ dichte Rekonstruktion
→ Mesh
→ Textur
→ GLB
```

Die API-Grundlage ist unter `/api/video-to-3d/create` enthalten.
