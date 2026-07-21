# V0.38 Mixed-Repository Hotfix

## Behobener Vercel-Fehler

Im GitHub-Hauptverzeichnis liegt eine alte Datei `LandscapePlatform.tsx`,
die CSS statt TypeScript enthält. Außerdem befinden sich dort alte V1- und
Testdateien.

Dieser Hotfix:

- überschreibt alle gültigen V0.38-Projektdateien;
- synchronisiert `package.json` und `package-lock.json`;
- beschränkt die TypeScript-Prüfung auf die echten App-Dateien;
- ignoriert alte Root-, V1-, Demo- und iOS-Reste.

## Tatsächlich geprüft

Der Hotfix wurde über den vorhandenen gemischten GitHub-Stand gelegt und danach
mit folgenden Befehlen geprüft:

```bash
npm ci
npm run typecheck
npm run build
```

Alle Prüfungen waren erfolgreich.
