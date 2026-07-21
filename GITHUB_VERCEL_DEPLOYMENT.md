# GitHub- und Vercel-Bereitstellung

## Empfohlener sicherer Weg

1. Dieses ZIP vollständig entpacken.
2. Im lokalen GitHub-Repository alle bisherigen Projektdateien löschen; nur den versteckten Ordner `.git` behalten.
3. Den gesamten Inhalt des entpackten Ordners hineinkopieren.
4. Commit erstellen:

```text
Deploy full consolidated V0.38
```

5. Auf den Branch `main` pushen.
6. Vercel übernimmt den neuen Commit automatisch.

## Vercel-Einstellungen

- Framework Preset: Next.js
- Node.js Version: 20.x
- Root Directory: leer beziehungsweise Repository-Wurzel
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: Standard

## Optionaler externer KI-Modus

Für die serverseitigen OpenAI-Routen kann in Vercel folgende Umgebungsvariable gesetzt werden:

```text
OPENAI_API_KEY=...
```

Die lokale Adaptive Garden Intelligence funktioniert ohne API-Schlüssel.
