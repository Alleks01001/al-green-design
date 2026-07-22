# AL Green Design Studio 2.1 – Architektur

## Grundprinzip

Studio 2.x trennt Geometrie, Projektzustand, Darstellung und Fachlogik. Die 2D- und 3D-Ansicht lesen dieselben `CadEntity`-Objekte. Dadurch bleibt die Geometrie konsistent und kann später für BIM, Terrain, DXF, PDF und KI verwendet werden.

## Module

- `core/cad/geometry.ts` – Abstände, Mittelpunkte, Grenzen, Verschiebung, Fläche und Volumen
- `core/cad/snap.ts` – Raster-, Endpunkt-, Mittelpunkt- und Zentrumfang
- `types/domain.ts` – versioniertes CAD-/BIM-Datenmodell
- `stores/projectStore.tsx` – zentraler Projektzustand, Command History, Undo/Redo und Persistenz
- `components/cad/CadCanvas.tsx` – interaktive SVG-CAD-Arbeitsfläche
- `components/render/ThreeViewport.tsx` – Three.js-Echtzeitansicht derselben CAD-Objekte
- `components/bim/BimInspector.tsx` – Objektparameter, Layer, Kennzahlen und Verlauf
- `engines/ai/localGardenAI.ts` – kontrollierte lokale Befehl-zu-CAD-Logik
- `engines/cost/costEngine.ts` – BIM-Kostenpositionen
- `data/plants` und `data/materials` – parametrische Bibliotheksdaten

## Datenmodell

Ein `CadEntity` besitzt:

- stabile ID
- fachlichen Typ, etwa Fläche, Mauer, Weg, Pflanze oder Gebäude
- geometrische Form, etwa Rechteck, Linie, Polylinie, Kreis oder Symbol
- Weltkoordinaten in Metern
- Maße, Höhe und Drehung
- Layer- und Materialreferenz
- Sichtbarkeit, Sperrstatus und Metadaten

Linien und Polylinien speichern absolute Weltpunkte. Rechtecke, Kreise und Symbole speichern eine zentrale Position und parametrische Maße.

## Command History

Bearbeitungen werden als benannte Zustandsbefehle gespeichert. Jeder Befehl hält einen vollständigen Projekt-Snapshot vor der Änderung. Das ist für Studio 2.1 bewusst robust und nachvollziehbar. Spätere Versionen können einzelne Geometrie-Deltas speichern, ohne die öffentliche Store-Schnittstelle zu ändern.

## Objektfang

Der Snap-Kern bewertet Kandidaten innerhalb einer zoomabhängigen Toleranz. Objektpunkte haben Vorrang vor Rasterpunkten. Unterstützt werden:

1. Endpunkte
2. Segmentmittelpunkte
3. Objektzentren
4. Raster

## Projektformat

`.algreen` ist eine JSON-Datei mit:

- Anwendungskennung
- Schemaversion
- Speicherzeitpunkt
- vollständigem `ProjectState`

Das Format ist versioniert und wird beim Laden normalisiert.

## Ausbaupfad

- 2.2 BIM Engine
- 2.3 Terrain Engine
- 2.4 Plant Intelligence
- 2.5 Photoreal Render Engine
- 2.6 AI Garden Designer
- 2.7 Dokumentation und Ausschreibung
- 2.8 Zusammenarbeit
- 2.9 professioneller Datenaustausch
- 3.0 integrierte Arbeitsversion
