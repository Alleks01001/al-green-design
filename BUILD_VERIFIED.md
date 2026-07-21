# Build-Validierung – AL Green Design V0.38

Prüfdatum: 21. Juli 2026

## Erfolgreich ausgeführt

```text
npm ci
npm run typecheck
npm run build
npm start
```

## Ergebnis

- Abhängigkeiten installiert: erfolgreich
- TypeScript-Prüfung: erfolgreich, 0 Fehler
- Next.js-Produktionsbuild: erfolgreich
- Produktionsserver gestartet: erfolgreich
- `/`: HTTP 200
- `/scan`: HTTP 200
- `/video-to-3d`: HTTP 200

## Build-Routen

- `/`
- `/scan`
- `/video-to-3d`
- `/api/assistant`
- `/api/garden`
- `/api/openai`
- `/api/scan/process`
- `/api/video-to-3d/create`
- `/robots.txt`

## Versionen

- Projekt: 0.38.0
- Next.js: 14.2.35
- React: 18.3.1
- Three.js: 0.164.1
- Vercel-Ziel: Node.js 20.x

## npm-Registry

- interne OpenAI-/Artifactory-Adressen: 0
- öffentliche `registry.npmjs.org`-Einträge: 43

## Hinweis zur Testumgebung

Die Installation wurde in einer Node-22-Testumgebung ausgeführt. Das Projekt ist für Vercel bewusst auf Node.js 20.x festgelegt; die Installation meldete deshalb lediglich eine Engine-Warnung, lief jedoch erfolgreich durch.
