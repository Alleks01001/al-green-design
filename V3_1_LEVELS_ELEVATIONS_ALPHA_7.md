# V3.1 Levels & Elevations Alpha 7

## Echte Höhenebenen

- Ebenen können frei benannt und von −50,00 m bis +200,00 m angelegt werden.
- Die Höhenvorlagen erzeugen direkt Terrasse +0,45 m, Erdgeschoss +0,30 m, 1. Obergeschoss +3,20 m oder Pool −1,20 m.
- Die Höhe jeder vorhandenen Ebene ist direkt im Ebenen-Manager editierbar.
- Es wird immer auf der aktiven, sichtbaren und ungesperrten Ebene gezeichnet.
- Ebenenhöhe, Sichtbarkeit, Sperre, PDF-Druck, Farbe, Deckkraft und Reihenfolge werden in `.algreen` und lokal gespeichert.
- Ältere Projekte erhalten beim Laden automatisch sichere Höhenwerte; das Projektschema bleibt `3.1-alpha.4`.

## Objektbezogene Höhe

- Jedes Objekt besitzt zusätzlich zur Ebenenhöhe einen frei editierbaren Z-Versatz.
- Der Eigenschaften-Inspektor zeigt Ebene, Z-Versatz und resultierende Konstruktionshöhe gemeinsam an.
- Bauteilhöhe und Z-Position bleiben unabhängig voneinander bearbeitbar.
- Der Z-Versatz eignet sich unter anderem für abgesenkte Pools, Stufen, Hochbeete, Podeste und später für Fenster oder Türen.

## Höhenrichtige 3D-Darstellung

- Pflanzen, Mauern, Zäune, Hecken, Linien, Flächen, Gebäude und Bibliotheksobjekte werden auf Gelände plus Ebenenhöhe plus Z-Versatz platziert.
- Die Auswahl bleibt zwischen 2D, 3D, Frontansicht, Seitenansicht und Eigenschaften synchron.
- Vorhandene Geländeformen und das interaktive 3D-Orbit bleiben erhalten.

## Front- und Seitenansicht

- Neue Ansichtsmodi „Front“ und „Seite“ stehen direkt oben im Studio bereit.
- Beide Ansichten zeigen Geländeprofil, Meter-Höhenraster, Nullniveau und alle sichtbaren Ebenenlinien.
- Objekte werden maßstäblich mit ihrer tatsächlichen Unter- und Oberkante dargestellt.
- Klick wählt ein Objekt; Umschalt + Klick erweitert die Auswahl.
- Die aktive Ebene und ihre Höhe sind jederzeit sichtbar.

## Version

- Paketversion: `3.1.0-alpha.7`
- Projektschema: `3.1-alpha.4`
