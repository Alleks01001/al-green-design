import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const port = 3127;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

let serverOutput = "";
server.stdout.on("data", chunk => { serverOutput += chunk; });
server.stderr.on("data", chunk => { serverOutput += chunk; });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/version`);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Produktionsserver nicht erreichbar.\n${serverOutput}`);
}

async function run() {
  await waitForServer();
  const [studioResponse, versionResponse, libraryResponse, apiVersionResponse, emptyAiResponse, fallbackAiResponse] = await Promise.all([
    fetch(`${baseUrl}/`),
    fetch(`${baseUrl}/version`),
    fetch(`${baseUrl}/library`),
    fetch(`${baseUrl}/api/version`),
    fetch(`${baseUrl}/api/garden`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "" }) }),
    fetch(`${baseUrl}/api/garden`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "Terrasse mit Pool und drei Bäumen" }) })
  ]);
  const [studio, version, library, apiVersion, emptyAi, fallbackAi] = await Promise.all([
    studioResponse.text(),
    versionResponse.text(),
    libraryResponse.text(),
    apiVersionResponse.json(),
    emptyAiResponse.json(),
    fallbackAiResponse.json()
  ]);

  const endpointChecks = [
    [studioResponse.status === 200, "Studio liefert nicht HTTP 200"],
    [studio.includes("Neues Projekt"), "Projektassistent fehlt im Studio"],
    [studio.includes("Front") && studio.includes("Seite"), "Front-/Seitenumschaltung fehlt im Studio"],
    [studio.includes("Ebenen") && studio.includes("Höhe Z"), "Ebenen-Manager fehlt im Studio"],
    [versionResponse.status === 200 && version.includes("3.1.0-alpha.7"), "Versionsseite ist nicht Alpha 7"],
    [version.includes("Front- und Seitenansicht"), "Alpha-7-Funktionen fehlen auf der Versionsseite"],
    [libraryResponse.status === 200 && library.includes("Professional Library"), "Professional Library ist nicht erreichbar"],
    [apiVersion.packageVersion === "3.1.0-alpha.7", "Versions-API meldet nicht Alpha 7"],
    [emptyAiResponse.status === 400 && emptyAi.fallback === true, "Leere KI-Eingabe wird nicht korrekt abgewiesen"],
    [fallbackAiResponse.status === 200 && fallbackAi.fallback === true, "Lokaler KI-Fallback wird ohne API-Schlüssel nicht gemeldet"]
  ];

  const sourceFiles = {
    domain: await readFile("types/domain.ts", "utf8"),
    store: await readFile("stores/projectStore.tsx", "utf8"),
    studio: await readFile("components/layout/StudioShell.tsx", "utf8"),
    elevation: await readFile("components/render/ElevationViewport.tsx", "utf8"),
    three: await readFile("components/render/ThreeViewport.tsx", "utf8"),
    inspector: await readFile("components/bim/BimInspector.tsx", "utf8"),
    levels: await readFile("components/cad/LayerDimensionPanel.tsx", "utf8")
  };
  const sourceChecks = [
    [sourceFiles.domain.includes('"front" | "side"'), "Ansichtsmodi fehlen im Projekttyp"],
    [sourceFiles.domain.includes("elevationOffset?: number"), "Objekt-Z-Versatz fehlt im Projekttyp"],
    [sourceFiles.store.includes("Math.min(200, Math.max(-50"), "Höhenwerte werden nicht begrenzt"],
    [sourceFiles.store.includes('commit("Ebene erstellt"'), "Ebenenerstellung fehlt im Store"],
    [sourceFiles.studio.includes('direction="front"') && sourceFiles.studio.includes('direction="side"'), "Orthografische Ansichten sind nicht eingebunden"],
    [sourceFiles.elevation.includes("terrainProfile") && sourceFiles.elevation.includes("elevationLevels"), "Geländeprofil oder Ebenenlinien fehlen"],
    [sourceFiles.elevation.includes("selectEntity") && sourceFiles.elevation.includes("shiftKey"), "Auswahlsynchronisierung fehlt in der Höhenansicht"],
    [sourceFiles.three.includes("layerElevation") && sourceFiles.three.includes("elevationOffset"), "3D berücksichtigt Ebenen oder Z-Versatz nicht"],
    [sourceFiles.inspector.includes("Z-Versatz") && sourceFiles.inspector.includes("Konstruktionshöhe"), "Z-Höhen fehlen im Objektinspektor"],
    [sourceFiles.levels.includes("Terrasse +0,45") && sourceFiles.levels.includes("Pool −1,20"), "Ebenenvorlagen fehlen"]
  ];

  for (const [condition, message] of [...endpointChecks, ...sourceChecks]) assert(condition, message);
  console.log(`Alpha 7: ${endpointChecks.length} Produktions- und ${sourceChecks.length} Strukturprüfungen erfolgreich.`);
}

try {
  await run();
} finally {
  server.kill("SIGTERM");
  await new Promise(resolve => {
    if (server.exitCode !== null) resolve();
    else {
      server.once("exit", resolve);
      setTimeout(resolve, 2000);
    }
  });
}
