import {
  STUDIO_BUILD_LABEL,
  STUDIO_PACKAGE_VERSION,
  STUDIO_SCHEMA_VERSION,
  STUDIO_VERSION
} from "@/core/platform/version";
import { OBJECT_CATALOG } from "@/data/objects/catalog";
import { PLANT_CATALOG } from "@/data/plants/catalog";
import { MATERIAL_CATALOG } from "@/data/materials/catalog";
import { CONSTRUCTION_CATALOG } from "@/data/constructions/catalog";

export default function VersionPage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "40px", maxWidth: "820px", margin: "0 auto" }}>
      <h1>AL Green Design Studio {STUDIO_VERSION}</h1>
      <p><strong>Paketversion:</strong> {STUDIO_PACKAGE_VERSION}</p>
      <p><strong>Projektschema:</strong> {STUDIO_SCHEMA_VERSION}</p>
      <p><strong>Build:</strong> {STUDIO_BUILD_LABEL}</p>
      <h2>V3.1 Professional CAD</h2>
      <ul>
        <li>Objektfang für Raster, Endpunkt, Mittelpunkt, Zentrum und echte Schnittpunkte</li>
        <li>ORTHO-Zeichnen in 0°, 45° und 90° für Linien, Polylinien, Mauern, Wege, Zäune, Hecken und Bemaßungen</li>
        <li>Numerische Transformation von Auswahlmittelpunkt, Gesamtbreite, Gesamttiefe und Drehwinkel</li>
        <li>Gruppieren und Gruppierung aufheben; Alt + Klick bearbeitet ein einzelnes Gruppenobjekt</li>
        <li>Wiederverwendbare Blockdefinitionen inklusive BIM-Daten und dynamischen Verbindungen</li>
        <li>Tastatursteuerung: Strg+A, Strg+D, Strg+G, Strg+Umschalt+G und Pfeiltasten</li>
        <li>Vollständiger Layer-Manager mit Sichtbarkeit, Sperre, Farbe, Deckkraft, Reihenfolge, Isolation und Objektanzahl</li>
        <li>Ausgerichtete, horizontale, vertikale und assoziative Bemaßungen mit Meter-, Zentimeter- und Millimeterdarstellung</li>
        <li>Nicht druckbare Layer werden beim PDF-Planexport automatisch ausgeblendet</li>
        <li>Versatzkopien für Linien, Polylinien, Polygone und flächenbasierte Objekte</li>
        <li>Spiegeln an der horizontalen oder vertikalen Auswahlachse – wahlweise als Kopie</li>
        <li>Rechteckige und polare Anordnungen mit konfigurierbaren Abständen, Winkeln und Zentren</li>
        <li>Gerade Linien bis zu einer gewählten Begrenzungslinie kürzen oder verlängern</li>
        <li>Professional Library mit {PLANT_CATALOG.length} realen Pflanzentaxa und -sorten samt Standort-, Qualitäts- und Ökologiedaten</li>
        <li>{CONSTRUCTION_CATALOG.length} herstellerneutrale Bauweisen für Mauern, Zäune, Beläge, Terrassen, Böden und Einfassungen</li>
        <li>Mehrschichtige CAD/BIM-Aufbauten mit Kosten, Arbeitskosten, CO₂, Lebensdauer und technischer Bezugsbasis</li>
        <li>Fachfilter nach Pflanzenart, Licht, Herkunft, Bauweisen- und Materialkategorie</li>
        <li>Eigenständige Professional-Library-Seite unter <code>/library</code> ohne eingeklemmte Innenansicht</li>
        <li>Explizite Hinzufügen-Schaltflächen mit sichtbarer Erfolgsbestätigung</li>
        <li>Ladesichere lokale Projektspeicherung ohne Überschreiben vorhandener Daten beim Start</li>
        <li>Direkte 3D-Auswahl per Klick und Mehrfachauswahl mit Umschalt, synchron mit 2D und Eigenschaften</li>
        <li>Unterschiedliche 3D-Wuchsformen für Bäume, Sträucher, Hecken, Stauden und Gräser</li>
        <li>Materialgerechte 2D-Farben und PBR-Eigenschaften für Stein, Holz, Beton, Metall, Glas, Böden und Wasser</li>
        <li>3D-Auswahlrahmen sowie erhaltener Orbit und Zoom beim Wechsel der Auswahl</li>
        <li>Eigener Dialog „Neues Projekt“ mit Projektname, Grundstücksmaßen, Flächenvorlagen und optionalem 3D-Gelände</li>
        <li>Maßstäbliche, editierbare Grundstücksfläche samt BIM-Fläche und flachem Geländeraster</li>
        <li>„Zeichnung leeren“ und „Neues Projekt“ sind getrennte, rückgängig machbare Aktionen</li>
        <li>Garden-KI mit Online-Generierung und automatischem lokalen CAD-Fallback ohne stille Fehlschläge</li>
        <li>Freie Beschreibungen können mehrere bearbeitbare Flächen, Pflanzen, Wege, Mauern, Wasser- und Ausstattungsobjekte gemeinsam erzeugen</li>
        <li>Der AI Garden Designer setzt seine erste Variante unmittelbar sichtbar in 2D und 3D ein</li>
      </ul>
      <h2>Weiterhin enthalten</h2>
      <ul>
        <li>Detailwerkzeuge, PDF- und Bildplanimport sowie PDF-Planexport</li>
        <li>Professional Library: {OBJECT_CATALOG.length} Objekte, {CONSTRUCTION_CATALOG.length} Bauweisen, {PLANT_CATALOG.length} Pflanzen und {MATERIAL_CATALOG.length} Materialien</li>
        <li>Video → 3D, Scan/LiDAR, Terrain, BIM, Pflanzenintelligenz, Rendering und Garden AI</li>
        <li>Fixierte Werkzeugleiste und unabhängig scrollbare Seitenbereiche</li>
        <li>Alles-löschen-Funktion mit unmittelbarer Rückgängig-Möglichkeit</li>
      </ul>
      <p>Wenn diese Seite angezeigt wird, läuft die V3.1-Professional-CAD-Codebasis im Vercel-Deployment.</p>
      <p><a href="/">Zum Studio</a></p>
    </main>
  );
}
