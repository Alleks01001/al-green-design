# AL Green Design – V0.18 ARCHITECTURE + LIDAR

V0.18 ist der erste größere Architektur-/Scan-Sprung.

## Architektur-Engine

Neu als eigene editierbare Bauteile:

- Bodenplatte
- Außenwand
- Innenwand
- Flachdach
- Satteldach / Dachkörper
- Fenster
- Tür
- Schiebetür
- Balkon
- Geländer
- Stütze
- Carport
- Wintergarten

Jedes Bauteil kann in 2D ausgewählt, verschoben, gedreht, skaliert und in seinen Eigenschaften verändert werden.
Die Bauteile werden auch in 3D dargestellt.

## Split View

- 2D
- 3D
- Split vertikal
- Split horizontal

Damit kann der Plan gleichzeitig in 2D und 3D kontrolliert werden.

## Gelände

- weiche Erhebungen
- Mulden / Senken
- Höhenlinien
- Auftrag / Abtrag
- Objekte folgen der Geländehöhe
- bestehende Terrain-Werkzeuge bleiben erhalten

## KI

Das strukturierte KI-Schema wurde erweitert.
Die KI kann jetzt zusätzlich Architektur-Bauteile liefern:

- building
- floor
- wall
- interior_wall
- roof
- window
- door
- sliding_door
- balcony
- railing
- column
- carport
- winter_garden
- pool
- pergola
- tree
- shrub

## Mobile Scan / LiDAR Grundlage

Neue Route und neue Scan-Seite:

- `/scan`
- Kamera-Vorschau im Browser
- Fotoaufnahme als Fallback
- Erkennung einer nativen iOS-/Android-LiDAR-Bridge
- Scan-Dateiimport für PLY, OBJ, GLB, GLTF, USDZ, JSON und ZIP
- API-Grundlage für Scan-Verarbeitung
- Typen und Bridge-Definitionen

Wichtig:
Ein normaler Browser kann nicht zuverlässig direkt alle nativen LiDAR-Rohdaten eines Telefons auslesen.
Die V0.18 enthält deshalb die Web-Oberfläche und die Bridge-Schnittstelle für eine spätere native iOS-/Android-Scan-App bzw. App-Hülle.

## OpenAI

Für echten OpenAI-Betrieb in Vercel:

```text
OPENAI_API_KEY=dein_key
```

Ohne Key bleibt der lokale Fallback aktiv.
