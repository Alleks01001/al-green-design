# V0.34 – Local Garden Intelligence

Diese Erweiterung ersetzt den API-abhängigen Sofort-Chat im sichtbaren Arbeitsablauf durch einen lokalen deutschen Befehlsinterpreter.

## Ablauf

1. Text eingeben.
2. `Bestätigen & direkt zeichnen` drücken.
3. Die Anweisung wird lokal analysiert.
4. Vor Planänderungen wird automatisch ein Undo-Stand erzeugt.
5. Erkannte Aktionen werden sofort ausgeführt.

## Unterstützte Befehle

- Flächen anlegen: Rasen, Wiese, Beet, Terrasse, Pflaster, Kies, Naturstein, Beton
- Objekte anlegen: Baum, Strauch, Hecke, Pool, Teich, Pergola, Mauer, Zaun, Weg, Treppe, Hochbeet, Bank, Licht, Gebäude und weitere
- Mehrfachobjekte: Reihe, Spalte, Raster, Kreis, lockere Gruppe
- Positionen: Norden, Süden, Osten, Westen, links, rechts, vor, hinter, neben einem vorhandenen Objekt
- Maße: `8 × 5 Meter`, Breite, Länge, Höhe, Abstand und Drehung
- Änderungen: verschieben, vergrößern, verkleinern, Material ändern, umbenennen, duplizieren, löschen
- Verbindungen: Weg, Mauer, Zaun, Bewässerung oder Drainage zwischen zwei vorhandenen Objekten
- Editor: 2D, 3D, Split, Projektprüfung, Undo und Redo

## Lernen

Der Lernspeicher liegt lokal im Browser und wird nicht an einen externen Dienst übertragen.

Beispiele:

- `Merke dir: Chillzone bedeutet Terrasse.`
- `Mit hinter meine ich nördlich.`
- `Standardweg 1,4 Meter breit.`
- `Sichtschutz standardmäßig 1,8 Meter hoch.`
- `Terrassen immer aus Naturstein.`

Gespeichert werden:

- eigene Begriffe und Synonyme
- Standard-Wegbreite
- Standardabstände
- Standardhöhen für Mauer und Zaun
- bevorzugtes Terrassenmaterial

Der Button `Lernspeicher löschen` setzt nur diese lokalen Lernwerte zurück.

## Ohne API

Für den lokalen Zeichenassistenten werden weder `OPENAI_API_KEY` noch API-Guthaben benötigt. Die vorhandenen älteren API-Routen können im Projekt bleiben, werden vom neuen lokalen Arbeitsablauf aber nicht aufgerufen.
