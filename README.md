# AL Green Design V1.0 – Foundation

Modularer Web-Neuaufbau ohne Apple-/iOS-, Xcode-, ARKit- oder native LiDAR-Komponenten.

## Enthalten
- Burgundy-Design und Logo
- modularer Editor Store
- getrennte 2D- und 3D-Komponenten
- Fachtypen für Projekt, Geometrie, Gelände, Gebäude, Pflanzen, Materialien, Wasser, KI und Berichte
- 2D-/3D-/Split-Ansicht
- Three.js-Webszene

## Struktur
```text
app
components/{shell,editor2d,editor3d,panels}
core
domains/{project,geometry,terrain,building,planting,materials,water,ai,reporting}
stores
```

## Installation
```bash
npm install
npm run dev
```

## Build
```bash
npm run typecheck
npm run build
```
