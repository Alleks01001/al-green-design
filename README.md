
# AL Green Design – V0.13.4 Move 3D OpenAI

Diese Version erweitert V0.13.3 um echte Verschiebung von Gebäuden in 2D und 3D sowie eine OpenAI-vorbereitete Chat-Oberfläche.

## Neu in V0.13.4
- Gebäude in 2D verschiebbar per Drag
- Gebäude in 3D verschiebbar per Drag auf dem Gelände
- Auswahl von Objekten in 2D und 3D
- OpenAI-Chat-Bereich mit Modellauswahl
- vorbereitete Modelleingabe für verschiedene OpenAI-Modelle
- lokaler KI-Fallback bleibt enthalten

## Hinweise zum Chat
- Standardmäßig funktioniert der lokale KI-Fallback direkt.
- Die OpenAI-Anbindung ist als UI und Code-Struktur vorbereitet.
- Für echten API-Betrieb musst du später selbst einen API-Key und eine Serverroute ergänzen.

## Struktur
Direkt im Ordner liegen:
- .gitignore
- app/
- components/
- next.config.mjs
- next-env.d.ts
- package.json
- README.md
- tsconfig.json
