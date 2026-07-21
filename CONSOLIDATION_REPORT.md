# Konsolidierungsbericht V0.38

## Ausgangslage

Das GitHub-ZIP enthielt den sichtbaren V0.38-Stand, aber zusätzlich alte V1.0-Testmodule, doppelte Root-Dateien, Diagnoseprotokolle, native iOS-Dateien und eine `package.json`, die nicht zur `package-lock.json` passte.

## Durchgeführte Bereinigung

- nur der aktive Next.js-App-Router und die tatsächlich verwendeten Komponenten übernommen
- V1.0-Teststruktur entfernt
- doppelte Dateien außerhalb von `app/` und `components/` entfernt
- native Swift-/iOS-Dateien entfernt
- `package.json` und `package-lock.json` auf V0.38.0 synchronisiert
- ungenutzte npm-Abhängigkeiten entfernt
- Node.js für Vercel auf 20.x fixiert
- Next.js-Buildfehler werden nicht mehr pauschal ignoriert

## Verbleibende Hauptmodule

- `components/LandscapePlatform.tsx`
- `components/BrandLogo3D.tsx`
- `lib/ai/localGardenIntelligence.ts`
- `components/scan/ScanStudio.tsx`
- `components/video3d/VideoTo3DStudio.tsx`
- API-Routen unter `app/api/`
