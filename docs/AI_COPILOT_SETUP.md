# AL Green Design V0.32 – AI Copilot einrichten

## Was neu ist

Der neue AI Copilot ist kein einfacher Schlüsselwort-Generator mehr. Er erhält bei jeder Nachricht:

- den bisherigen Chatverlauf,
- Projektdaten und Budget,
- alle Geländeformen,
- Zonen,
- Objekte mit IDs, Positionen und Maßen,
- aktuelle Auswahl und Ansicht,
- vorhandene Prüfergebnisse.

Er kann beraten und strukturierte Projektaktionen auslösen:

- Objekte hinzufügen, verschieben, skalieren, drehen, umbenennen und materialisieren,
- Objekte nach Bestätigung löschen,
- Geländeformen und Zonen hinzufügen oder ändern,
- Projektangaben ändern,
- 2D-/3D-Ansicht umschalten,
- die Projektprüfung starten.

## Vercel

1. Projekt in Vercel öffnen.
2. **Settings → Environment Variables** öffnen.
3. Neue Variable anlegen:
   - Name: `OPENAI_API_KEY`
   - Value: dein API-Schlüssel
   - Environment: Production, Preview und Development
4. Optional:
   - Name: `OPENAI_MODEL`
   - Value: `gpt-5.2`
5. Danach ein neues Deployment auslösen.

Der API-Schlüssel darf niemals in eine Client-Datei oder in GitHub geschrieben werden.

## Bedienbeispiele

- `Verschiebe den Pool zwei Meter nach Osten.`
- `Mache die Pergola 4 x 3 Meter groß und verwende dunkles Thermoholz.`
- `Setze drei Bäume als Sichtschutz an die Nordgrenze.`
- `Welche Probleme siehst du im aktuellen Plan?`
- `Lösche die alte Mauer.` – dafür fragt der Copilot vor der Ausführung nach Bestätigung.
- `Wechsle in die geteilte 2D-/3D-Ansicht.`

## Sicherheit

- Sichere Aktionen können automatisch ausgeführt werden.
- Löschaktionen werden nur nach Bestätigung ausgeführt.
- Vor Planänderungen wird ein Undo-Snapshot angelegt.
- Der Chatverlauf wird lokal im Browser gespeichert.
