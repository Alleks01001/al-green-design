# V0.35 – Lernhandbuch für Adaptive Garden Intelligence

Die lokale Garden Intelligence ist kein allgemeines Sprachmodell. Sie lernt kontrolliert alles, was für die Gartenplanung wichtig ist: Begriffe, Maße, Materialien, Objektstandards, ganze Arbeitsabläufe, Projektbegriffe und Korrekturen.

## 1. Einen Begriff beibringen

Schreibe:

```text
Merke dir: Chillzone bedeutet Terrasse.
```

Danach funktioniert:

```text
Erstelle eine Chillzone 6 × 4 Meter.
```

Weitere Beispiele:

```text
Merke dir: Sichtschutz bedeutet Hecke.
Merke dir: Sonnenplatz bedeutet Terrasse.
Mit Hauptweg meine ich einen Weg.
```

## 2. Einen ganzen Arbeitsablauf beibringen

Schreibe:

```text
Wenn ich sage Feierabendplatz, erstelle eine Terrasse 5 × 4 Meter aus Naturstein mit einer Pergola.
```

Danach genügt:

```text
Feierabendplatz
```

Der komplette gelernte Ablauf wird ausgeführt.

Weitere Beispiele:

```text
Wenn ich sage Familiengarten, erstelle eine Rasenfläche 10 × 8 Meter und setze drei Bäume an die Nordgrenze.

Lerne Befehl: Poolbereich => Erstelle einen Pool 6 × 3 Meter und eine Terrasse 7 × 4 Meter südlich davon.
```

## 3. Objektstandards beibringen

Schreibe:

```text
Standard für Baum: 3 Meter hoch, 2 Meter breit und 2,5 Meter Abstand.
```

Danach verwendet die Intelligenz diese Werte, wenn du keine anderen Maße angibst.

Weitere Beispiele:

```text
Standard für Terrasse: 6 × 4 Meter, Material Naturstein.
Standard für Zaun: 1,8 Meter hoch.
Standard für Pergola: 4 × 3 Meter, Material Thermoholz.
Standardweg 1,4 Meter breit.
Pflanzabstand standardmäßig 2 Meter.
```

Explizite Angaben im aktuellen Befehl haben immer Vorrang vor gespeicherten Standards.

## 4. Projektbegriffe beibringen

Schreibe:

```text
In diesem Projekt bedeutet Haupthaus das Objekt Wohnhaus.
```

Danach kannst du schreiben:

```text
Erstelle eine Terrasse südlich vom Haupthaus.
```

## 5. Einen Fehler korrigieren

Nachdem ein Befehl falsch ausgeführt wurde, schreibe:

```text
Das war falsch. Stattdessen verschiebe den Pool 2 Meter nach Osten.
```

Die Anwendung stellt den vorherigen Undo-Stand wieder her, führt die korrigierte Anweisung aus und merkt sich die Korrektur für denselben früheren Befehl.

Weitere Formulierungen:

```text
Korrigiere den letzten Befehl: Verschiebe die Pergola 1 Meter nach Norden.
Nicht so. Stattdessen erstelle fünf Sträucher als Reihe.
```

## 6. Wissen anzeigen

```text
Was hast du gelernt?
```

Die Anwendung zeigt die Anzahl und eine Auswahl der gespeicherten Begriffe, Makros, Standards und Korrekturen.

## 7. Einzelnes Wissen vergessen

```text
Vergiss den Begriff Chillzone.
```

Der passende Begriff, das Makro oder der Standard wird aus dem lokalen Speicher entfernt.

## 8. Wissen sichern und übertragen

Im Chatbereich gibt es:

- **Wissen exportieren** – speichert das gelernte Wissen als JSON-Datei.
- **Wissen importieren** – lädt eine zuvor exportierte Wissensdatei.
- **Lernspeicher löschen** – setzt die Intelligenz vollständig zurück.

So kannst du das Wissen sichern oder auf einen anderen Browser übertragen.

## 9. Gute Lehrregeln

Formuliere einen Lernsatz möglichst eindeutig:

- Benenne zuerst den Begriff oder Auslöser.
- Gib Maße immer in Metern an.
- Verwende klare Objektbezeichnungen.
- Lehre einen Standard pro Satz.
- Korrigiere unmittelbar nach einer falschen Ausführung.
- Verwende bei Makros einen kurzen, eindeutigen Auslöser.

## 10. Was die Intelligenz lernen kann

- Synonyme und eigene Namen
- Standardmaße
- Materialien
- Abstände
- Anordnungen wie Reihe, Gruppe, Kreis oder Raster
- komplette Befehlsfolgen
- projektbezogene Objektnamen
- Korrekturen des letzten Befehls
- bevorzugte Arbeitsweisen

Sie trainiert kein universelles Sprachmodell und verändert ihren Programmcode nicht selbst. Das hält die Ausführung lokal, nachvollziehbar und sicher.
