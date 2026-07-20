# V0.33 AI Instant Copilot

## Neues Verhalten

Der Button **Bestätigen & sofort generieren** ist die Ausführungsbestätigung.

Nach dem Klick:

1. Der Copilot liest den aktuellen Projektzustand und den bisherigen Dialog.
2. Die Anweisung wird in konkrete Projektaktionen übersetzt.
3. Alle passenden Aktionen werden unmittelbar angewendet.
4. Neue oder geänderte Objekte werden ausgewählt.
5. Vor Planänderungen wird automatisch ein Undo-Stand erstellt.

Es gibt keinen zweiten Bestätigungsschritt mehr.

## Unterstützte direkte Anweisungen

- Objekte erstellen, auch mehrfach und angeordnet
- Objekte relativ oder absolut verschieben
- Maße, Höhe, Drehung, Material, Farbe und Namen ändern
- Objekte duplizieren
- Objekte miteinander durch Weg, Mauer, Zaun, Bewässerung oder Drainage verbinden
- Geländeformen und Zonen erstellen oder bearbeiten
- Ansicht umschalten
- Projektprüfung starten
- Objekte löschen; der Button gilt als Bestätigung, Rückgängig bleibt möglich

## Beispiele

- `Setze fünf Bäume als Reihe an die Nordgrenze mit 2,5 Meter Abstand.`
- `Verschiebe den Pool zwei Meter nach Osten.`
- `Mache die Pergola 4 × 3 Meter groß und verwende dunkles Thermoholz.`
- `Platziere eine Sitzbank südlich vom Teich.`
- `Verbinde das Haus und den Pool mit einem 1,2 Meter breiten Natursteinweg.`
- `Gestalte einen modernen Garten mit Pool, Pergola, Sichtschutz und drei Solitärbäumen.`
- `Lösche die markierte Mauer.`

## Vercel

Die vorhandene Variable bleibt erforderlich:

- `OPENAI_API_KEY`

Optional:

- `OPENAI_MODEL=gpt-5.2`

Dieses Patch enthält keine `package-lock.json` und verändert keine npm-Abhängigkeiten.
