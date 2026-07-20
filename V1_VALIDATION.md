# V1.0.1 – geprüfte Foundation

## Korrektur

Die ursprüngliche Foundation verwendete Next.js 14.2.3. Diese Version wurde auf die gepatchte Version 14.2.35 aktualisiert.

## Tatsächlich ausgeführte Prüfungen

- `npm install --no-audit --no-fund` – erfolgreich
- `npm run typecheck` – erfolgreich
- `npm run build` – erfolgreich
- `npm start` – erfolgreich
- HTTP-Aufruf der Startseite – `200 OK`
- ZIP-Integritätsprüfung – erfolgreich

## Build-Ergebnis

- Next.js: 14.2.35
- Projektversion: 1.0.1
- Startseite: statisch vorgerendert
- TypeScript: keine Fehler
- Produktions-Build: erfolgreich

## Lokal starten

```bash
npm install
npm run dev
```

## Produktionsprüfung

```bash
npm run typecheck
npm run build
npm start
```
