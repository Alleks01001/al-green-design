# Build-Validierung V0.40

## Tatsächlich ausgeführt

- `npm ci` – erfolgreich
- `npm run typecheck` – erfolgreich, 0 TypeScript-Fehler
- `npm run build` – erfolgreich
- `npm start -- -p 3100` – erfolgreich
- HTTP-Test der Startseite – `200 OK`

## Umgebung

- Next.js 14.2.35
- React 18.3.1
- Three.js 0.164.1
- Projektversion 0.40.0

## Build-Routen

- `/`
- `/scan`
- `/video-to-3d`
- `/api/assistant`
- `/api/garden`
- `/api/openai`
- `/api/scan/process`
- `/api/video-to-3d/create`

## V0.40-Prüfpunkte

- Renderprofile Editor, Präsentation und Fotoreal
- prozedurale Umgebungsreflexionen über PMREM
- vier Tone-Mapping-Verfahren
- Belichtung, Umgebungsstärke, Brennweite und Haze
- Kontakt-Schatten und Bodenreflexionen
- Architektur-, Gartenweg-, Orbit- und Top-Kamera
- PNG-Export der 3D-Ansicht
