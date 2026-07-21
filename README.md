# AL Green Design V0.40 – Photoreal Render Core

Vollständiges Next.js-Projekt für Garten-, Gelände- und Landschaftsplanung mit 2D-/3D-Studio, lokaler Garden Intelligence, detaillierter Ebenenverwaltung und erweitertem Echtzeit-Rendering.

## Neu in V0.40

- Editor-, Präsentations- und Fotoreal-Profil
- prozedurale Tag-, Golden-Hour-, Wolken- und Nachtumgebung
- PBR-Umgebungsreflexionen
- ACES, Reinhard, Cineon und Linear Tone Mapping
- 4K-Schattenkarten im Fotoreal-Profil
- Kontakt-Schatten und Bodenreflexionen
- Kamera-Presets und einstellbare Brennweite
- PNG-Export der aktuellen 3D-Ansicht

## Lokal starten

```bash
npm ci
npm run dev
```

## Produktionsprüfung

```bash
npm run typecheck
npm run build
npm start
```

Die ausgeführte Validierung ist in `BUILD_VERIFIED_V040.md` dokumentiert.
