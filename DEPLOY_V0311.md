# Saubere Bereitstellung auf GitHub und Vercel

1. ZIP entpacken.
2. Im lokalen GitHub-Repository alle Projektdateien löschen. Nur den versteckten Ordner `.git` behalten.
3. Den gesamten Inhalt dieses Pakets direkt in das Repository-Hauptverzeichnis kopieren.
4. Kontrollieren, dass `package.json` und `package-lock.json` direkt im Hauptverzeichnis liegen.
5. Commit: `Restore verified V0.31.1 stable`
6. Auf `main` pushen.
7. In Vercel das neue Deployment öffnen.
8. Falls notwendig: Redeploy ohne Build-Cache.

In `package.json` muss stehen:

- Version `0.31.1`
- Node `20.x`
- Next.js `14.2.35`

Im Build darf keine Adresse mit `internal.api.openai.org` oder `applied-caas-gateway1` vorkommen.
