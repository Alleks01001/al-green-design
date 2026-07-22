# Changelog

Zusammengeführt aus den einzelnen Versions-/Feature-Dateien, die zuvor einzeln im Projekt-Root lagen. Reihenfolge folgt der Versionsnummer, aufsteigend.

---

## Version 2.1.0

## Professional CAD Core

Diese Version ersetzt die einfache Foundation-Zeichenfläche durch einen interaktiven CAD-Kern.

### Neu

- neun CAD-Werkzeuge
- Objektfang
- Rastereinstellungen
- Zoom und Pan
- Auswahlfenster und Mehrfachauswahl
- Drag-Move
- automatische Bemaßung
- Command History mit Undo/Redo
- editierbarer Inspector
- Layer 2.0
- `.algreen`-Import und -Export
- lokale Speicherung
- interaktive Pflanzen- und Materialbibliothek
- erweiterte Garden-KI
- 3D-Darstellung für neue Geometrietypen

### Tastatur

- `Strg/Cmd + Z`: Rückgängig
- `Strg/Cmd + Umschalt + Z` oder `Strg/Cmd + Y`: Wiederholen
- `Entfernen`: Auswahl löschen
- `Escape`: Vorgang abbrechen
- `Enter`: Polylinie abschließen

---

## Version 2.2

Professional BIM Engine Foundation mit Kosten-, Mengen-, Wartungs- und CO₂-Daten.

---

## AL Green Design Studio 2.3 – Terrain Engine

## Neu
- Digitales Geländemodell als editierbares Raster
- Höhenpunkte und vier Gelände-Vorlagen
- Basishöhe und Referenzhöhe
- Aushub-/Aufschüttungsbilanz
- Höhenlinienintervall als Projekteinstellung
- echtes trianguliertes 3D-Geländemesh
- CAD-/BIM-Objekte folgen der Geländeoberfläche
- Migration aus älteren Studio-2.x-Projekten

---

## AL Green Design Studio 2.4 – Plant Intelligence

## Neue Funktionen

- erweiterter Pflanzenkatalog mit Standort-, Blüte-, Winterhärte- und Biodiversitätsdaten
- Standortprofil für Licht, Boden, Feuchtigkeit und Winterhärtezone
- automatische Eignungsbewertung je platzierter Pflanze
- Erkennung zu geringer Pflanzabstände
- Biodiversitätskennzahlen: Artenzahl, Anteil heimischer Pflanzen, Bestäuberwert und Wasserindex
- Blühkalender über zwölf Monate
- Wachstumsvorschau von 1 bis 20 Jahren in der 3D-Ansicht
- Verknüpfung platzierter Pflanzen mit parametrischen Katalogdaten
- Migration älterer Studio-2.x-Projektdateien auf Schema 2.4

## Hinweis zur Prüfung

Die Quellstruktur und TypeScript-Syntax wurden kontrolliert. Ein vollständiges `npm ci` und der Produktionsbuild konnten in dieser Laufzeitumgebung nicht abgeschlossen werden, weil die Paketinstallation keine Netzwerkverbindung zum npm-Registry herstellen konnte. Die Version ist deshalb als Release Candidate und nicht als vollständig build-verifiziert gekennzeichnet.

---

## AL Green Design Studio 2.5 – Photoreal Render Engine

Diese Version baut vollständig auf Studio 2.4.1 auf. CAD-Zeichnen, Garden-KI, Bildhintergrund, Video-zu-3D, Scan/LiDAR, BIM, Gelände und Plant Intelligence bleiben erhalten.

## Neu
- Render-Presets: Tageslicht, Goldene Stunde, Bewölkt, Nacht
- Tageszeit und Sonnenrichtung
- Belichtung, Schattenintensität und Atmosphäre
- Renderqualitäten Vorschau, Hoch und Ultra
- dynamische 3D-Hintergrund- und Bodenstimmungen
- 1K/2K/4K-Schattenkarten je Qualitätsstufe
- optionales 3D-Raster
- PNG-Export der aktuellen 3D-Kamera
- ACES-Filmic-Tonemapping und sRGB-Ausgabe
- Projektformat und lokale Speicherung auf Version 2.5 migriert

---

## AL Green Design Studio 2.6 – AI Garden Designer

## Neu
- Drei lokale, deterministische Entwurfsvarianten aus einem Gartenbriefing
- Stile: modern, naturnah, Familiengarten und pflegeleicht
- Schwerpunkte: Erholung, Biodiversität, Gäste und Spiel
- Budgetstufen und Standortlicht
- automatische Funktionszonen, Wege, Terrassen, Pflanzen, Wasser und Ausstattung
- Bewertung, Flächenschätzung und grobe Budgetindikation
- Übernahme als vollständig bearbeitbare CAD-Objekte
- bestehende AI-Entwürfe ersetzen oder Varianten ergänzen

Die vorhandenen Funktionen aus CAD, BIM, Terrain, Plant Intelligence, Rendering, Bild/Plan, Video-3D und Scan bleiben erhalten.

---

## AL Green Design Studio 3.0 Alpha – Stable Platform Foundation

Diese Version beginnt die durchgängige V3-Codebasis und erhält die Funktionen aus 2.1 bis 2.6.

## Neu

- zentrale Event-Bus-Grundlage für entkoppelte Module
- Plugin-/Modulregister mit Status und Fähigkeiten
- Validierung von Modulabhängigkeiten
- manuelle Wiederherstellungspunkte im Browser
- Import älterer lokaler 2.4–2.6-Projekte
- neues Systempanel mit Modul-, Objekt-, Layer- und Änderungsstatus
- Projektschema und Dateiversion `3.0-alpha`
- Paketversion `3.0.0-alpha.1`

## Bestehende Funktionen

CAD, BIM, Terrain, Pflanzenintelligenz, Rendering, AI Garden Designer, Video-zu-3D und Scan bleiben in der Projektbasis enthalten.

## Nächste Schritte

1. einheitliches Command-System für alle Werkzeuge
2. zentraler Layer- und Szenenmanager
3. dokumentierte Plugin-Schnittstellen
4. automatische periodische Snapshots
5. Professional Documentation Engine

---

## V0.33 AI Instant Copilot

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

---

## V0.34 – Local Garden Intelligence

Diese Erweiterung ersetzt den API-abhängigen Sofort-Chat im sichtbaren Arbeitsablauf durch einen lokalen deutschen Befehlsinterpreter.

## Ablauf

1. Text eingeben.
2. `Bestätigen & direkt zeichnen` drücken.
3. Die Anweisung wird lokal analysiert.
4. Vor Planänderungen wird automatisch ein Undo-Stand erzeugt.
5. Erkannte Aktionen werden sofort ausgeführt.

## Unterstützte Befehle

- Flächen anlegen: Rasen, Wiese, Beet, Terrasse, Pflaster, Kies, Naturstein, Beton
- Objekte anlegen: Baum, Strauch, Hecke, Pool, Teich, Pergola, Mauer, Zaun, Weg, Treppe, Hochbeet, Bank, Licht, Gebäude und weitere
- Mehrfachobjekte: Reihe, Spalte, Raster, Kreis, lockere Gruppe
- Positionen: Norden, Süden, Osten, Westen, links, rechts, vor, hinter, neben einem vorhandenen Objekt
- Maße: `8 × 5 Meter`, Breite, Länge, Höhe, Abstand und Drehung
- Änderungen: verschieben, vergrößern, verkleinern, Material ändern, umbenennen, duplizieren, löschen
- Verbindungen: Weg, Mauer, Zaun, Bewässerung oder Drainage zwischen zwei vorhandenen Objekten
- Editor: 2D, 3D, Split, Projektprüfung, Undo und Redo

## Lernen

Der Lernspeicher liegt lokal im Browser und wird nicht an einen externen Dienst übertragen.

Beispiele:

- `Merke dir: Chillzone bedeutet Terrasse.`
- `Mit hinter meine ich nördlich.`
- `Standardweg 1,4 Meter breit.`
- `Sichtschutz standardmäßig 1,8 Meter hoch.`
- `Terrassen immer aus Naturstein.`

Gespeichert werden:

- eigene Begriffe und Synonyme
- Standard-Wegbreite
- Standardabstände
- Standardhöhen für Mauer und Zaun
- bevorzugtes Terrassenmaterial

Der Button `Lernspeicher löschen` setzt nur diese lokalen Lernwerte zurück.

## Ohne API

Für den lokalen Zeichenassistenten werden weder `OPENAI_API_KEY` noch API-Guthaben benötigt. Die vorhandenen älteren API-Routen können im Projekt bleiben, werden vom neuen lokalen Arbeitsablauf aber nicht aufgerufen.

---

## V0.36 – Smart Draw Toolbar

## Werkzeuge

- Pfeil/Auswahl: Objekte markieren
- Bewegen: Objekte, Gruppen, Zonen und Gelände ziehen
- Füllfarben: Farbpalette und freie Farbauswahl
- Formen: Rechteck, Kreis/Ellipse, Dreieck und abgerundete Fläche
- Linie: beliebig viele Punkte setzen und mit „Linie abschließen“ beenden
- Verbinden: Startobjekt und Zielobjekt anklicken; die dynamische Linie folgt den Objekten beim Verschieben

## Bedienung

1. Werkzeug wählen.
2. In den 2D-Plan klicken.
3. Formen werden direkt eingefügt und können danach verschoben, skaliert oder gedreht werden.
4. Bei Linie mehrere Punkte setzen. Doppelklick oder „Linie abschließen“ beendet den Linienzug.
5. Bei Verbinden zuerst Startobjekt, danach Zielobjekt anklicken.

## Tastenkürzel

- S Auswahl
- V Bewegen
- R Rechteck
- O Kreis
- T Dreieck
- L Linie
- C Verbinden
- Escape Werkzeug abbrechen

---

## V0.37 – Extended Studio

Die V0.36-Werkzeugleiste wurde in den bestehenden Bereichen um rund 30 % erweitert.

## Neue Formen

- Fünfeck
- Sechseck
- Stern
- getrennte Breite und Tiefe für alle Formen

## Linien

- durchgezogen
- gestrichelt
- gepunktet
- optionale Kurvendarstellung
- orthogonale 90°-Linien
- Pfeil am Start und/oder Ende
- magnetisches Verbinden mit Objektmittelpunkten, Wandenden und Linienpunkten

## Dynamische Verbindungen

- gerade
- rechtwinklig
- gebogen
- folgen weiterhin automatisch den verbundenen Objekten
- unterstützen Linienart und Pfeilspitzen

## Schnellaktionen

- Stil kopieren und einsetzen
- Auswahl um 15° drehen
- nach vorne oder hinten stellen
- Objekte sperren und entsperren
- letzte Farben erneut verwenden

## Mehrfachauswahl

- horizontal verteilen
- vertikal verteilen
- gleiche Breite
- gleiche Tiefe
- gleiche Gesamtgröße
- bestehende Ausrichtung, Gruppierung und Duplizierung bleiben erhalten

---

## V0.38 – 3D Brand & Premium Interface

## Neue Gestaltung

V0.38 überträgt das freigegebene 3D-Designkonzept in die Anwendung:

- dreidimensionales AL-Green-Design-Logo
- Burgunderrot, Roségold und Kupfer
- räumlicher Hero-/Startbereich
- hochwertiger dunkler Studio-Rahmen
- plastische CAD-Werkzeugleiste
- dreidimensionale Buttons mit Druck- und Hover-Effekt
- neue Topbar-Marke
- 3D-Logo im Präsentationsmodus
- konsistente Schatten, Glanzkanten und Tiefenstaffelung

## Logo

Das Logo verbindet ein stilisiertes Blatt mit einem architektonischen Raster. Es wird als SVG aufgebaut und mit CSS räumlich dargestellt. Dadurch bleibt es scharf, skalierbar und benötigt keine zusätzliche Bibliothek.

## 3D-Designbild

Das freigegebene Designkonzept ist als optimierte WebP-Datei enthalten:

`public/brand/al-green-design-3d-studio.webp`

## Bedienung

Alle bestehenden Funktionen aus V0.37 bleiben erhalten. Die Änderungen betreffen hauptsächlich Erscheinungsbild, räumliche Bedienrückmeldung und Markenführung.

---

## V0.39 – Detailed Scene & Layer Studio

## Was geändert wurde

- Gebäude werden mit Sockel, Fassadenakzent, Fenstern, Tür, Dachflächen und Terrasse dargestellt.
- Pools besitzen Beckenkörper, Randsteine, transparente Wasseroberfläche und Detailmarkierungen.
- Pergolen erhalten Pfosten, umlaufende Träger und einzelne Dachlamellen.
- Bäume bestehen aus Stamm, Ästen und mehreren natürlich verteilten Kronensegmenten.
- Sträucher und Hecken werden aus organischen Pflanzclustern statt aus einzelnen Kugeln oder Quadern erzeugt.
- ACES-Farbwiedergabe, Hemisphärenlicht, Fülllicht, Nebel und weichere Schatten verbessern die räumliche Wirkung.
- Die Layeransicht wurde zu einer professionellen Ebenenverwaltung mit Geschossvorschauen, Höhenangaben, Objektlisten, Sichtbarkeit und Sperre ausgebaut.

## Hinweis zur Bildqualität

Die Darstellung bleibt eine interaktive Web-3D-Szene. Sie wird deutlich detaillierter als die bisherigen Grundkörper, erreicht aber nicht automatisch die Qualität eines vollständig offline gerenderten Architekturfilms. Im Leistungsmodus `Qualität` werden die meisten Details angezeigt.

---

## V0.40 – Photoreal Render Core

## Neu

- Renderprofile Editor, Präsentation und Fotoreal
- prozedurale HDR-ähnliche Umgebungen: Tag, Goldene Stunde, Bewölkt, Nacht
- PMREM-Umgebungsreflexionen für PBR-Materialien
- ACES, Reinhard, Cineon und lineares Tone Mapping
- Belichtungs- und Umgebungsintensität
- weichere 4K-Schattenkarten im Fotoreal-Modus
- Kontakt-Schatten und dezente Bodenreflexionen
- atmosphärische Tiefe
- Architektur-, Gartenweg-, Gesamt- und Vogelperspektive
- einstellbare Kamera-Brennweite
- PNG-Export der aktuellen 3D-Ansicht

Die Funktionen sind vollständig im Browser nutzbar und benötigen keine zusätzliche npm-Abhängigkeit.

---

## AL Green Design Studio 3.0 Alpha.4

## Wiederhergestellt und erweitert

### Detailwerkzeuge

- Freihand, Linie, Polylinie und frei definierbares Polygon
- Rechteck, abgerundete Fläche, Kreis, Ellipse, Dreieck, Fünfeck, Sechseck und Stern
- Fachwerkzeuge für Mauer, Weg, Terrasse, Beet, Treppe, Zaun, Hecke, Pool, Wasserfläche und Bemaßung
- Linienarten durchgezogen, gestrichelt und gepunktet
- Kurvendarstellung, 90°-Linien sowie Pfeile am Start und Ende
- Dynamische Verbindungen zwischen zwei ausgewählten Objekten
- Drehen, Duplizieren, Löschen, Sperren, Sichtbarkeit und Vorder-/Hintergrund
- Ausrichten, horizontal/vertikal verteilen sowie gleiche Breite, Tiefe oder Gesamtgröße
- Stil kopieren und einsetzen
- Füll- und Linienfarbe, Deckkraft, Breite, Tiefe, Höhe und Linienstärke

### Objektdatenbank

- 55 maßstäbliche Garten-, Landschafts- und Architekturobjekte
- 12 Pflanzen und 14 Materialien
- Kategorien: Sitzmöbel, Bauteile, Wasser, Beleuchtung, Freizeit, Ausstattung und Architektur
- Unter anderem Bänke, Tische, Pergolen, Carports, Gartenhäuser, Hochbeete, Zäune, Tore, Mauern, Treppen, Pools, Teiche, Brunnen, Leuchten, Spielgeräte, Griller, Outdoor-Küchen, Wintergärten und Balkone
- BIM-Klassifikation, Preis, CO₂-Wert und Wartungszyklus je Katalogobjekt
- Maßstäbliche 2D-Platzierung und 3D-Darstellung

### Bestehende Funktionen erhalten

- Plan-/Bildimport als CAD-Unterlage
- Video → 3D
- Scan/LiDAR
- Terrain, BIM, Plant Intelligence, Render Engine, Garden Designer und lokaler KI-Chat
- Rückgängig/Wiederholen, lokale Speicherung und `.algreen`-Projektdatei

## Version

- Paket: `3.0.0-alpha.4`
- Projektschema: `3.0-alpha.4`
- Speicher-Migration aus V3 Alpha.3 sowie V2.4–V2.6

---

## AL Green Design Studio 3.0 Alpha.5

## Docked Workspace

- obere Werkzeugleiste bleibt fixiert
- linke Werkzeug- und Bibliotheksspalte scrollt unabhängig
- rechter BIM-Inspector scrollt unabhängig
- die Zeichenplattform füllt immer den verbleibenden Bildschirmbereich
- kein Scrollen der gesamten Desktop-Seite mehr
- 2D/3D-Split nutzt den verfügbaren Bereich dynamisch
- mobile Darstellung bleibt weiterhin scrollbar

