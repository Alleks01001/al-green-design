# V0.36 Validierung

## Geprüft

- TypeScript-/TSX-Syntaxprüfung der geänderten Dateien: erfolgreich
- Klammer- und Strukturprüfung: erfolgreich
- ZIP-Integrität: wird bei der Paketerstellung geprüft
- keine `package.json`
- keine `package-lock.json`
- keine neue npm-Abhängigkeit

## Funktionsumfang

- Auswahlwerkzeug
- Bewegungswerkzeug
- Farbpalette und freie Farbauswahl
- Deckkraft
- Rechteck, Ellipse/Kreis, Dreieck und abgerundete Form
- freie Linienzüge mit mehreren Punkten
- automatisches Fangen an Objektmittelpunkten, Wandenden und Linienpunkten
- dynamisches Verbinden zweier Objekte
- verbundene Linie folgt beim Verschieben der Objekte
- Skalieren und Drehen eingefügter Formen über vorhandene Griffe
- Tastenkürzel S, V, R, O, T, L, C und Escape

## Build-Hinweis

Ein vollständiger neuer Next.js-Produktionsbuild wurde in dieser Laufzeit nicht abgeschlossen, weil die npm-Paketquelle während `npm install` nicht erreichbar war. Das Patch ändert keine Abhängigkeiten. Die geänderten TSX-Dateien wurden mit dem TypeScript-Compiler syntaktisch geprüft.
