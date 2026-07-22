# Build-Validierung V3.1 Professional CAD Alpha 4

## Prüfumfang

- JSON-Prüfung von `package.json` und `package-lock.json`
- strikte TypeScript-Typprüfung
- Next.js-Produktionsbuild
- Starttest von `/`, `/api/version` und `/version`
- Katalogprüfung auf eindeutige IDs, Referenzintegrität und vollständige Konstruktionsaufbauten
- Prüfung der Pflanzenfilter, Bauweisenplatzierung und BIM-Datenfelder
- Prüfung der Versions- und Schemamigration
- Prüfung auf interne oder fremde npm-Registry-URLs

## Ergebnis

- TypeScript: erfolgreich, keine Typfehler
- Next.js 14.2.35 Produktionsbuild: erfolgreich
- 14 statische beziehungsweise dynamische Seiten und API-Routen erfolgreich erzeugt
- Starttest der Produktionsfassung: erfolgreich
- `/`: HTTP 200 und Professional Library im ausgelieferten Inhalt
- `/version`: HTTP 200 und Alpha-4-Funktionen ausgewiesen
- `/api/version`: Paket `3.1.0-alpha.4`, Schema `3.1-alpha.4`, Build `Professional Library · Real Plants · Construction Types · Soils & Materials`
- 155 Bibliotheksdatensätze geladen: 55 Objekte, 33 Bauweisen, 38 Pflanzen und 29 Materialien
- 633 gezielte Katalog-, Referenz- und Strukturprüfungen: erfolgreich
- alle Katalog-IDs eindeutig und alle Material- sowie Layerreferenzen gültig
- JSON-Prüfung: `package.json` und `package-lock.json` gültig
- npm-Registry-Prüfung: nur öffentliche `registry.npmjs.org`-Einträge
