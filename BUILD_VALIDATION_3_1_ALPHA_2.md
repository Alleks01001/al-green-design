# Build-Validierung V3.1 Professional CAD Alpha 2

## Prüfumfang

- JSON-Prüfung von `package.json` und `package-lock.json`
- strikte TypeScript-Typprüfung
- Next.js-Produktionsbuild
- Prüfung der Versionswerte für Paket, Projektschema und `/version`
- Prüfung der Layer-Befehle und Projektnormalisierung
- Prüfung der Maßmodi, Einheitenumrechnung und Genauigkeit
- Prüfung, dass nicht druckbare Layer im PDF-Klon entfernt werden
- Prüfung auf interne oder fremde npm-Registry-URLs

## Ergebnis

- TypeScript: erfolgreich, keine Typfehler
- Next.js 14.2.35 Produktionsbuild: erfolgreich
- statische und dynamische Routen: erfolgreich erzeugt
- Starttest der Produktionsfassung: erfolgreich
- `/`: HTTP 200
- `/api/version`: Paket `3.1.0-alpha.2`, Schema `3.1-alpha.2`
- `/version`: neue Layer- und Bemaßungsfunktionen ausgewiesen
- 25 gezielte Funktions- und Strukturprüfungen: erfolgreich
- npm-Registry-Prüfung: nur öffentliche `registry.npmjs.org`-Einträge
