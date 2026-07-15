# AL Green Design – V0.20 ARCHITECTURE CORE

V0.20 führt ein stärkeres Architektur-Grundsystem ein.

## Wände als Linienzug zeichnen

```text
Startpunkt klicken
→ Endpunkt klicken
→ Wand entsteht
```

Im Kettenmodus wird der Endpunkt automatisch zum Startpunkt der nächsten Wand.

Wand-Endpunkte rasten an bestehenden Wand-Endpunkten ein.

## Fenster und Türen als Wandöffnungen

Unterstützt:

- Fenster
- Türen
- Schiebetüren

Beim Koppeln an eine Wand werden gespeichert:

- `parentId`
- Position entlang der Wand (`hostOffset`)
- Brüstungshöhe (`sillHeight`)
- Wanddrehung

Wenn die Wand bewegt, gedreht oder in der Länge geändert wird, folgen gekoppelte Öffnungen automatisch.

## 2D

Gekoppelte Öffnungen schneiden die Wanddarstellung sichtbar aus.

## 3D

Wände werden um Öffnungen herum aus Wandsegmenten aufgebaut:

```text
linkes Wandstück
Brüstungsstück
oberes Wandstück
rechtes Wandstück
```

Dadurch entsteht eine sichtbare geometrische Öffnung im Wandkörper.

## Architekturübersicht

- Anzahl Wände
- gesamte Wandlänge
- Anzahl Öffnungen
- Anzahl gekoppelter Öffnungen

## Weiter enthalten

- V0.19.3 Stabilität & UX
- Autosave
- Projektversionen
- Undo / Redo
- Copy / Cut / Paste
- stabile Frame-Extraktion
- Video → 3D → Projekt
- GLB-/OBJ-Export
- CAD-Griffe
- Mehrfachauswahl
- Gruppierung
- 2D/3D/Split View

## Nächste Version

V0.21: Geschosse, Räume und Gebäudestruktur.
