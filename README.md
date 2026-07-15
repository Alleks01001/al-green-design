# AL Green Design – V0.19.2 MODEL PIPELINE

Diese Version schließt die Lücke zwischen **Video → 3D** und dem Hauptprojekt.

## Neuer kompletter Ablauf

```text
Video hochladen
→ Frames extrahieren
→ Frame auswählen
→ 3D-Modell erzeugen
→ In Projekt übernehmen
→ Hauptprojekt öffnet sich
→ Modell erscheint in der 3D-Szene
```

## Video-3D-Studio

Neue Funktionen:

- Modellbreite in Metern festlegen
- Tiefenstärke festlegen
- 3D-Modell erzeugen
- **In Projekt übernehmen**
- **GLB exportieren**
- **OBJ exportieren**

## Direkte Projektübernahme

Das erzeugte Video-3D-Modell wird im Browser-Projektspeicher abgelegt und danach automatisch in der Hauptanwendung geladen.

Im Bereich **3D-Szene** können importierte Modelle ausgewählt werden.

Einstellbar:

- Name
- Position X
- Höhe Y
- Position Z
- Drehung Y
- Maßstab
- Transparenz
- Sichtbarkeit
- Duplizieren
- Löschen
- Zurücksetzen

## Projekt speichern

Browser-Projekte speichern jetzt auch importierte Video-3D-Modelle.

## Export

### GLB

Enthält die erzeugte 3D-Geometrie und ist für moderne 3D-Programme geeignet.

### OBJ

Enthält die Geometrie. Die direkte Übernahme in AL Green Design behält die Fototextur zuverlässig im Browserprojekt.

## Wichtige technische Einordnung

Das aktuelle Video-3D-Modell ist weiterhin die schnelle bildbasierte Relief-/Tiefenrekonstruktion aus einem ausgewählten Videoframe.

Eine präzise Rekonstruktion eines vollständigen Gartens aus allen Videoframes benötigt weiterhin einen externen Photogrammetrie-Worker:

```text
Video
→ Kamerapositionen
→ Punktwolke
→ dichte Rekonstruktion
→ Mesh
→ Textur
→ GLB
```

Die vorbereitete Pipeline dafür bleibt enthalten.
