# AL Green Design – V0.19.2.1 STABLE FRAME EXTRACTION

Diese Version behebt gezielt die unzuverlässige Frame-Extraktion im Video → 3D Studio.

## Neuer Ablauf der Frame-Extraktion

```text
Video-Upload
→ separates unsichtbares Extraktions-Video
→ loadedmetadata abwarten
→ loadeddata abwarten
→ robuste Seek-Vorgänge
→ dargestellten Videoframe abwarten
→ Canvas-Frame erzeugen
```

## Stabilitätsverbesserungen

- eigener Video-Player nur für die Extraktion
- funktioniert unabhängig von der Position des sichtbaren Video-Players
- Seek-Timeout
- bis zu 3 automatische Wiederholungsversuche pro Frame
- requestVideoFrameCallback, wenn der Browser es unterstützt
- erste und letzte 4 % des Videos werden nicht verwendet
- maximale Frame-Breite 720 px
- JPEG-Qualität 0,8
- maximal 24 Frames pro Durchlauf
- einzelne fehlerhafte Frames werden übersprungen
- klare Fehlermeldung, wenn kein Frame gelesen werden kann

## Empfohlener Test

```text
12 Frames
→ Frames extrahieren
→ Frame auswählen
→ 3D-Modell erzeugen
→ In Projekt übernehmen
```
