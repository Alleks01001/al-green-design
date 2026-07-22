# AL Green Design Studio 3.1 Professional CAD Alpha

Professionelle Garten-, Landschafts- und Außenanlagenplanung mit CAD, BIM, Terrain, Pflanzenintelligenz, Rendering, KI-Designer, Planimport, Video → 3D und Scan/LiDAR.

## V3.1 Professional CAD Alpha 5

Diese Version erweitert die stabile V3.0-Codebasis um:

- Objektfang für Raster, Endpunkt, Mittelpunkt, Zentrum und Schnittpunkt
- ORTHO-Zeichnen in 0°, 45° und 90°
- numerische Transformation von Position, Gesamtbreite, Gesamttiefe und Rotation
- Gruppen mit Gruppenwahl und Alt-Klick für Einzelbearbeitung
- wiederverwendbare Blockdefinitionen inklusive BIM-Daten
- Tastaturbefehle für Auswahl, Duplizieren, Gruppen und schrittweises Verschieben
- vollständiger Layer-Manager mit Sichtbarkeit, Sperre, PDF-Druck, Farbe, Deckkraft, Reihenfolge und Isolation
- Auswahl direkt auf einen anderen Layer verschieben sowie neue leere Layer erstellen und löschen
- ausgerichtete, horizontale und vertikale Bemaßungen mit wählbarer Einheit, Genauigkeit und Textgröße
- assoziative Bemaßungen zwischen zwei Objekten, die deren Verschiebung automatisch folgen
- nicht druckbare Layer werden beim PDF-Planexport ausgelassen
- Versatzkopien für Linien, Polylinien, Polygone, Rechtecke, Kreise und Ellipsen
- Spiegeln um die horizontale oder vertikale Auswahlachse, optional als Kopie
- rechteckige Anordnungen bis 10 × 10 und polare Anordnungen bis 48 Elemente
- Kürzen und Verlängern gerader Linien bis zu einer gewählten Begrenzung
- Material-, Layer-, Gruppen-, Block- und BIM-Daten bleiben bei Modify-Kopien erhalten
- Professional Library mit 55 maßstäblichen Objekten
- 38 reale Pflanzenarten und -sorten mit botanischem Namen, Wuchs, Standort, Abstand, Pflanzqualität und Ökologiedaten
- 33 herstellerneutrale Bauweisen für Mauern, Zäune, Beläge, Terrassen, Bodenaufbauten und Einfassungen
- 29 Materialien und Substrate mit technischer Spezifikation, Lebensdauer und Planungspreis
- mehrschichtige Aufbauten werden gemeinsam mit Kosten, Arbeitskosten, CO₂ und Quellenbasis als CAD/BIM-Daten platziert
- Suche und Fachfilter nach Kategorie, Lichtbedarf und heimischer Herkunft
- stabiler Datenbank-Startbereich im Studio statt eines eingeklemmten Innenfensters
- eigenständige, bildschirmfüllende Professional Library unter `/library`
- direkte Einstiege zu Pflanzen, Bauweisen, Objekten und Materialien
- explizite Schaltfläche „Zum Projekt hinzufügen“ mit sichtbarer Erfolgsbestätigung
- ladesichere Projektspeicherung: vorhandene lokale Daten werden beim Start nicht mehr überschrieben
- direkte Auswahl von Pflanzen, Mauern, Böden und Objekten in der 3D-Ansicht
- Mehrfachauswahl in 3D mit Umschalt und synchronisierte Eigenschaften
- eigene 3D-Wuchsformen für Bäume, Sträucher, Hecken, Stauden und Gräser
- materialgerechte 2D-Farben sowie PBR-Darstellung für Stein, Holz, Beton, Metall, Glas, Böden und Wasser
- Orbit und Zoom bleiben beim Ändern der Auswahl erhalten
- weiterhin PDF-Planimport, PDF-Planexport und leerer Projektneustart
- fixierte obere Werkzeugleiste und unabhängig scrollbare Seitenbereiche

- Version: `3.1.0-alpha.5`
- Projektschema: `3.1-alpha.4`
- Node.js: `24.x`
- Start lokal: `npm install` und `npm run dev`
- Produktionsprüfung: `/version`
