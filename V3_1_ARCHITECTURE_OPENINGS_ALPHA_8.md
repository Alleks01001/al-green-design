# V3.1 Architecture Openings Alpha 8

## Architektur-Bauteilkern

- Neuer eigener Arbeitsbereich „Türen, Fenster & Öffnungen“ direkt im Studio.
- Enthalten sind Haustür, Innentür, Hebeschiebetür, Standardfenster, bodentiefes Fenster, Garagentor und freier Durchgang.
- Das bisherige Werkzeug „Mauer“ heißt jetzt eindeutig „Wand/Mauer“.
- Bauteile können zusätzlich über die große Professional Library unter der Kategorie „Öffnungen“ eingesetzt werden.

## Wandkopplung

- Zuerst wird eine gezeichnete Wand, Mauer oder ein Zaun ausgewählt.
- Die Einsetzposition wird von 5 % bis 95 % entlang des längsten Wandsegments festgelegt.
- Zu breite Bauteile werden abgewiesen, statt außerhalb der Wand erzeugt zu werden.
- Ist die Wand für das gewählte Bauteil zu niedrig, wird sie automatisch auf eine passende Höhe angehoben.
- Beim Verschieben, Drehen oder Ändern der Wand folgen alle gekoppelten Öffnungen automatisch.
- Eine Öffnung kann in 2D entlang ihrer Wand verschoben werden, verlässt die Wand dabei aber nicht.
- Wird die Host-Wand gelöscht, werden ihre nicht gesperrten Öffnungen und BIM-Datensätze ebenfalls sauber entfernt.

## 2D und Eigenschaften

- Türen erhalten ein CAD-Symbol mit Anschlag, Türblatt und Öffnungsbogen.
- Fenster, Schiebetüren, Tore und Durchgänge besitzen eigene lesbare 2D-Symbole.
- Im Eigenschaften-Inspektor sind Wandposition, Brüstungshöhe, Breite und Bauteilhöhe editierbar.
- Bei Türen sind zusätzlich Anschlag links/rechts und Öffnungswinkel von 0° bis 120° einstellbar.
- Unterkante und Oberkante werden aus Ebene, Wandhöhe und Brüstungshöhe berechnet.

## Echte 3D-Wandaussparung

- Der Wandkörper wird an jeder Öffnung in seitliche, untere und obere Wandteile zerlegt.
- Türen und Durchgänge bleiben unten frei.
- Fenster behalten Wandmaterial unterhalb der Brüstung und oberhalb des Fensters.
- Türen, Fenster, Schiebetüren und Tore besitzen eigene einfache 3D-Modelle mit Rahmen, Füllung oder Verglasung.
- Mehrere Öffnungen auf demselben Wandsegment werden gemeinsam berücksichtigt.
- Zäune und Sichtschutz werden im Bereich eines gekoppelten Tores unterbrochen.

## Ansichten und Speicherung

- 2D, 3D, Frontansicht, Seitenansicht und Eigenschaften verwenden dieselbe Auswahl.
- Front- und Seitenansicht zeigen Öffnungen mit korrekter Unter- und Oberkante.
- Wandkopplung, Position, Brüstung, Anschlag und Öffnungswinkel werden lokal und in `.algreen` gespeichert.
- Projektschema bleibt rückwärtskompatibel bei `3.1-alpha.4`.

## Version

- Paketversion: `3.1.0-alpha.8`
- Projektschema: `3.1-alpha.4`
