# AL Green Design – V0.25 PLANT GROWTH TIMELINE

V0.25 erweitert die Pflanzenplanung um zeitliche Entwicklung.

## Entwicklungsjahre

Direkt wählbar:

```text
Jahr 0
Jahr 1
Jahr 3
Jahr 5
Jahr 10
Jahr 15
Jahr 20
```

Zusätzlich steht ein freier Schieberegler von 0 bis 30 Jahren zur Verfügung.

## Wachstumskurve

Die Entwicklung wird aus folgenden Daten abgeleitet:

- Pflanzgröße beim Setzen
- Endhöhe
- Endbreite
- Wachstumsgeschwindigkeit
- Pflanzenkategorie
- Entwicklungsjahr

Die Endgröße wird über eine nichtlineare Wachstumskurve angenähert.

## Entwicklungsphasen

```text
Pflanzung
Jungpflanze
Aufbauphase
Fast ausgewachsen
Ausgewachsen
```

## 2D

Konkrete Pflanzenarten verändern ihre dargestellte Größe entsprechend dem Entwicklungsjahr.

Optional kann die Endgröße als gestrichelter Umriss eingeblendet werden.

## 3D

Bäume, Sträucher, Stauden und Gräser verändern ihre Höhe und Breite abhängig vom Entwicklungsjahr.

## Pflanzenobjekt

Zusätzlich einstellbar:

- Pflanzhöhe
- Pflanzbreite

Angezeigt werden:

- Entwicklungsphase
- Größe im gewählten Jahr
- Endgröße

## Vergleich

Zwei Jahre können miteinander verglichen werden, zum Beispiel:

```text
Jahr 0
gegen
Jahr 10
```

## Projektübersicht

- Anzahl konkreter Pflanzen
- durchschnittlicher Entwicklungsstand
- Verteilung auf Entwicklungsphasen

## Nächste Version

V0.26: Sonnen- und Schattenanalyse.
