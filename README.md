# AL Green Design V0.38 – Full Consolidated Project

Dies ist der vollständig zusammengeführte Projektstand aus dem aktuellen GitHub-Repository.

## Enthalten

- V0.31 Complete Studio als funktionale Basis
- lokale und adaptive Garden Intelligence
- Lernspeicher, Makros, Standards, Korrekturen sowie Wissensimport/-export
- Smart Draw Toolbar
- Auswahl, Bewegen, Füllen, Formen, Linien und dynamische Verbindungen
- erweiterte CAD-Funktionen aus V0.37
- 3D-Logo und Premium-Burgunder-Interface aus V0.38
- 2D-, 3D- und Split-Ansichten
- Gelände, Architektur, Pflanzen, Materialien, Wasser und Bewässerung
- Mengen, Kosten, Projektprüfung, Präsentation und Berichte
- Video-zu-3D-Vorbereitung und webbasiertes Scan-/Import-Studio
- optionale serverseitige OpenAI-Routen; die lokale Garden Intelligence funktioniert ohne API-Schlüssel

## Bereinigt

Nicht mehr enthalten sind:

- alte V1.0-Testarchitektur
- doppelte Root-Dateien
- alte Patch- und Diagnosefragmente
- nicht verwendete Demo-Komponenten
- native Apple-/iOS-Quelldateien
- Build-Ausgaben und `node_modules`

## Installation

```bash
npm ci
npm run typecheck
npm run build
npm run dev
```

Danach: `http://localhost:3000`

## Vercel

- Framework: Next.js
- Node.js: 20.x
- Root Directory: Projektwurzel
- Build Command: `npm run build`
- Install Command: `npm ci`

Optional für externe KI-Funktionen:

```text
OPENAI_API_KEY=...
```

Die lokale Garden Intelligence benötigt keinen API-Schlüssel.
