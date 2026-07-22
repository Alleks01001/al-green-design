import {
  STUDIO_BUILD_LABEL,
  STUDIO_PACKAGE_VERSION,
  STUDIO_SCHEMA_VERSION,
  STUDIO_VERSION
} from "@/core/platform/version";
import { OBJECT_CATALOG } from "@/data/objects/catalog";
import { PLANT_CATALOG } from "@/data/plants/catalog";
import { MATERIAL_CATALOG } from "@/data/materials/catalog";

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
      </ul>
      <h2>Weiterhin enthalten</h2>
      <ul>
        <li>Detailwerkzeuge, PDF- und Bildplanimport sowie PDF-Planexport</li>
        <li>Objektdatenbank: {OBJECT_CATALOG.length} Objekte, {PLANT_CATALOG.length} Pflanzen und {MATERIAL_CATALOG.length} Materialien</li>
        <li>Video → 3D, Scan/LiDAR, Terrain, BIM, Pflanzenintelligenz, Rendering und Garden AI</li>
        <li>Fixierte Werkzeugleiste und unabhängig scrollbare Seitenbereiche</li>
        <li>Alles-löschen-Funktion mit unmittelbarer Rückgängig-Möglichkeit</li>
      </ul>
      <p>Wenn diese Seite angezeigt wird, läuft die V3.1-Professional-CAD-Codebasis im Vercel-Deployment.</p>
      <p><a href="/">Zum Studio</a></p>
    </main>
  );
}
