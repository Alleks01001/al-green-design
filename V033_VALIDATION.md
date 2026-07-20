# V0.33 Validierung

## Geprüft

- TypeScript-/TSX-Transpilation aller geänderten Dateien: keine Syntaxdiagnosen
- Klammer-, Parenthesen- und Array-Balance: korrekt
- Sofortausführung nach Absenden: eingebaut
- Zweiter Bestätigungsschritt: entfernt
- Relative Bewegung mit `deltaX` und `deltaY`: eingebaut
- Relative Platzierung an Referenzobjekten: eingebaut
- Mehrfachgenerierung mit Anzahl, Abstand und Anordnung: eingebaut
- Verbindung zwischen vorhandenen Objekten: eingebaut
- Serverseitige Auflösung von Objektname und Objekt-ID: eingebaut
- Regelbasierter Fallback für häufige deutsche Befehle: eingebaut
- Automatischer Undo-Stand vor Planänderungen: vorhanden
- ZIP-Integrität: separat beim Verpacken geprüft

## Build-Hinweis

Das Patch ergänzt keine npm-Abhängigkeit und enthält bewusst keine `package-lock.json`. Ein vollständiges `npm install` war in der Ausführungsumgebung wegen der dort eingerichteten internen npm-Registry nicht möglich. Die geänderten TS-/TSX-Dateien wurden mit dem TypeScript-Compiler syntaktisch transpiliert.
