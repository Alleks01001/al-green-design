# AL Green Design Studio 3.0 Alpha – Version Display Hotfix

Version: `3.0.0-alpha.2`

Behoben:

- Das alte, fest eingetragene Branding „Studio 2.1“ wurde durch „Studio 3.0 Alpha“ ersetzt.
- Die Versionsnummer wird zusätzlich dauerhaft in der oberen Werkzeugleiste angezeigt.
- Das System- und Wiederherstellungspanel ist beim ersten Start geöffnet.
- Unter `/version` steht eine sichtbare Deployment-Prüfseite bereit.
- Unter `/api/version` steht eine technische Versionsprüfung bereit.

Wichtig für GitHub/Vercel:

1. ZIP lokal entpacken.
2. Den **Inhalt** des entpackten Ordners in das Stammverzeichnis des GitHub-Repositories hochladen.
3. Nicht die ZIP-Datei selbst hochladen.
4. Keine zusätzliche Unterordnerebene wie `AL_Green_Design_Studio_3_0.../` im Repository erzeugen.
5. Prüfen, dass `app`, `components`, `core`, `stores`, `package.json` und `tsconfig.json` direkt im Repository-Stamm liegen.
