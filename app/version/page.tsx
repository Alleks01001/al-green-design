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
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "40px", maxWidth: "760px", margin: "0 auto" }}>
      <h1>AL Green Design Studio {STUDIO_VERSION}</h1>
      <p><strong>Paketversion:</strong> {STUDIO_PACKAGE_VERSION}</p>
      <p><strong>Projektschema:</strong> {STUDIO_SCHEMA_VERSION}</p>
      <p><strong>Build:</strong> {STUDIO_BUILD_LABEL}</p>
      <h2>Aktive Wiederherstellungen</h2>
      <ul>
        <li>Detailwerkzeuge: Freihand, Polygon, Dreieck, Fünfeck, Sechseck, Stern, Ellipse, Bemaßung, Weg, Terrasse, Beet, Treppe, Zaun, Hecke, Pool und Wasserfläche</li>
        <li>Bearbeitung: Ausrichten, Verteilen, Größen angleichen, Drehen, Stil kopieren, 90°-Linien, Kurven, dynamische Verbindungen, Sperren und Zeichenreihenfolge</li>
        <li>Objektdatenbank: {OBJECT_CATALOG.length} Objekte, {PLANT_CATALOG.length} Pflanzen und {MATERIAL_CATALOG.length} Materialien</li>
        <li>Plan-/Bildimport, Video → 3D und Scan/LiDAR</li>
      </ul>
      <p>Wenn diese Seite angezeigt wird, läuft die V3.0-Alpha.4-Codebasis im Vercel-Deployment.</p>
      <p><a href="/">Zum Studio</a></p>
    </main>
  );
}
