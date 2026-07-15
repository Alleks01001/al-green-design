# AL Green Design – V0.21 FLOORS + ROOMS

V0.21 erweitert das Architekturmodul um eine echte Geschoss- und Raumstruktur.

## Geschosse

Standardmäßig vorhanden:

```text
EG      0,00 m
1. OG   3,00 m
Dach    6,00 m
```

Jedes Geschoss besitzt:

- Name
- Höhe ab 0,00 m
- Geschosshöhe
- Sichtbarkeit

## Aktives Geschoss

Neue Architektur-Bauteile werden automatisch dem aktiven Geschoss zugeordnet.

## Geschoss duplizieren

Das aktive Geschoss kann komplett kopiert werden, einschließlich Architektur-Bauteilen und erkannten Räumen.

## Räume automatisch erkennen

Aus geschlossenen Wandzügen werden Raumflächen erkannt.

```text
Wände schließen
→ Räume automatisch erkennen
→ Raumfläche erzeugen
→ m² berechnen
```

Räume besitzen:

- Name
- Geschoss
- Fläche
- Farbe
- Herkunft

## 2D

Räume werden als farbige Polygone mit Name und m² angezeigt.

Wahlweise:

- nur aktives Geschoss
- alle sichtbaren Geschosse

## 3D

Jedes Geschoss wird auf seiner tatsächlichen Höhenlage dargestellt.

Raumflächen erscheinen als transparente Bodenflächen auf dem jeweiligen Geschoss.

## Projektstruktur

Autosave, Browserprojekt und Undo/Redo speichern jetzt zusätzlich:

- Geschosse
- aktives Geschoss
- Räume

## Nächste Version

V0.22: professionelles Gelände mit Höhenpunkten, Interpolation, Höhenlinien und Aushub-/Aufschüttungslogik.
