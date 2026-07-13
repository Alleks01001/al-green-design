# AL Green Design – V0.14 MAX

Diese Version fasst die bisherigen Funktionen zusammen und verbessert die Bedienung.

## Wichtigste Verbesserungen V0.14

### 2D-Editor
- Gebäude verschiebbar
- Pool verschiebbar
- Pergola verschiebbar
- Mauern verschiebbar
- Stufen verschiebbar
- Bäume, Sträucher und Hecken verschiebbar
- Erhebungen und Mulden verschiebbar
- Pflanzzonen und Belagszonen verschiebbar

### 3D-Viewer
- Gebäude und Gartenobjekte in 3D auswählbar
- Gebäude und Gartenobjekte in 3D verschiebbar
- Objekte bleiben automatisch auf der verformten Geländehöhe
- bessere 3D-Kanten/Lesbarkeit

### KI / OpenAI
- OpenAI-API-Route vorbereitet
- API-Key über OPENAI_API_KEY
- Modell kann im UI frei gewählt werden
- lokaler Fallback bleibt aktiv, falls kein API-Key vorhanden ist
- KI-Chat erzeugt weiterhin Gelände, Gebäude, Zonen und Gartenobjekte

### Architektur / Garten
- Gebäude/Haus
- Glashaus
- Hütte
- Turm
- Pavillon
- Atelier
- Pool
- Pergola
- Mauer
- Stufen
- Baum
- Strauch
- Hecke
- Pflanzzonen
- Belagszonen
- weiches 3D-Gelände

## OpenAI-Backend

Die Datei `app/api/openai/route.ts` ist vorbereitet.

Für echten Betrieb in Vercel:

```text
OPENAI_API_KEY=dein_key
```

Danach kann die App serverseitig die OpenAI-Route nutzen.

## Struktur

Direkt im Ordner liegen:

```text
.gitignore
app
components
next.config.mjs
next-env.d.ts
package.json
README.md
tsconfig.json
```
