# AL Green Design – V0.19.1 CAD CONTROLS

V0.19.1 konzentriert sich auf eine deutlich präzisere CAD-artige Bedienung.

## Auswahl- und Transformationsgriffe

Bei einem einzeln ausgewählten Objekt erscheinen:

- Auswahlrahmen
- vier Skalierungsgriffe
- Rotationsgriff
- Live-Maße
- Live-Drehwinkel

## Mehrfachauswahl

- Shift, Strg oder Cmd + Klick fügt Objekte zur Auswahl hinzu oder entfernt sie.
- Strg/Cmd + A wählt alle Objekte.
- Mehrere Objekte können gemeinsam verschoben werden.

## Gruppierung

- Gruppieren
- Gruppierung lösen
- komplette Gruppe auswählen
- G gruppiert
- Shift+G löst die Gruppierung

## Ausrichten

Mehrfach ausgewählte Objekte können ausgerichtet werden:

- links
- Mitte X
- rechts
- oben
- Mitte Y
- unten

## Duplizieren

- Button Duplizieren
- Strg/Cmd + D

## Verbesserter Fang

- Mittelpunkte und Außenkanten rasten an anderen Objekten ein.
- Blaue Fanglinien zeigen die Ausrichtung.
- Wände rasten mit Endpunkten an andere Wand-Endpunkte.
- Fenster, Türen und Schiebetüren rasten an Wandachsen ein.
- Öffnungen übernehmen die Wanddrehung und speichern die Wand als `parentId`.

Hinweis: Das logische Einsetzen von Fenstern und Türen ist umgesetzt. Ein echtes boolesches Ausschneiden des Wand-Meshes in 3D folgt in einer späteren Architektur-Version.

## Maße und Abstände

Im Eigenschaftenbereich werden angezeigt:

- Breite × Tiefe
- Fläche
- Abstand zum nächstgelegenen Objekt

## Weiter enthalten

- Video → 3D Studio
- Bild als Planhintergrund anwenden
- Bildanalyse
- 2D/3D Split View
- Architektur-Bauteile
- Gelände
- Scan-/LiDAR-Grundlage
