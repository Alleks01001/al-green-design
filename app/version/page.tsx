import {
  STUDIO_BUILD_LABEL,
  STUDIO_PACKAGE_VERSION,
  STUDIO_SCHEMA_VERSION,
  STUDIO_VERSION
} from "@/core/platform/version";

export default function VersionPage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "40px", maxWidth: "760px", margin: "0 auto" }}>
      <h1>AL Green Design Studio {STUDIO_VERSION}</h1>
      <p><strong>Paketversion:</strong> {STUDIO_PACKAGE_VERSION}</p>
      <p><strong>Projektschema:</strong> {STUDIO_SCHEMA_VERSION}</p>
      <p><strong>Build:</strong> {STUDIO_BUILD_LABEL}</p>
      <p>Wenn diese Seite angezeigt wird, läuft die neue V3.0-Alpha-Codebasis im Vercel-Produktionsdeployment.</p>
      <p><a href="/">Zum Studio</a></p>
    </main>
  );
}
