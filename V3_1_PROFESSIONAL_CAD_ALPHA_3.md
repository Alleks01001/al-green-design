# V3.1 Professional CAD Alpha 3

## Modify Engine

- Versatzkopien für Linien, Polylinien und geschlossene Polygone
- geometrisch korrekter Außen- und Innenversatz geschlossener Flächen
- Versatz von Rechtecken, Kreisen, Ellipsen und symbolischen Objekten über ihre Abmessungen
- Spiegeln an der horizontalen oder vertikalen Achse des Auswahlmittelpunkts
- Spiegeln wahlweise als Kopie oder direkt am ausgewählten Bestand
- rechteckige Anordnung mit bis zu 10 Zeilen und 10 Spalten
- polare Anordnung mit bis zu 48 Elementen, Gesamtwinkel, frei wählbarem Zentrum und optionaler Objektdrehung
- gerade Linien bis zum Schnittpunkt mit einer gewählten Begrenzungslinie kürzen oder verlängern

## Datenintegrität

- alle Modify-Operationen sind über Rückgängig und Wiederholen abgesichert
- Layer, Materialien, Darstellungsattribute und BIM-Eigenschaften werden übernommen
- Gruppen- und Blockinstanz-IDs werden für jede Kopiergruppe konsistent neu vergeben
- assoziative Verbindungen bleiben erhalten, wenn alle verknüpften Objekte gemeinsam kopiert werden
- unvollständige externe Verknüpfungen werden bei Kopien kontrolliert gelöst

## Kompatibilität

- Projekte aus V3.0 sowie V3.1 Alpha 1 und Alpha 2 werden beim Laden auf das Projektschema `3.1-alpha.3` normalisiert.
- bestehende Layer, Objekte, BIM-Daten, Gruppen, Blöcke, Maße und Projektdateien bleiben erhalten.
