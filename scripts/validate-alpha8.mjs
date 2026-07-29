import { spawn } from "node:child_process";
import { readFile, readFileSync } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const Module = require("node:module");
const originalResolveFilename = Module._resolveFilename;

require.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    },
    fileName: filename
  }).outputText;
  module._compile(output, filename);
};
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const target = path.resolve(process.cwd(), `${request.slice(2)}.ts`);
    return originalResolveFilename.call(this, target, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const {
  createHostedOpeningEntity,
  hostedOpeningsForSegment,
  isHostedOpening,
  moveHostedOpening,
  syncHostedOpenings
} = require(path.resolve("core/cad/openings.ts"));

const port = 3128;
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

function runOpeningEngineChecks() {
  const wall = {
    id: "wall-test",
    kind: "wall",
    shape: "line",
    name: "Testwand",
    points: [{ x: -5, y: 0 }, { x: 5, y: 0 }],
    position: { x: 0, y: 0 },
    width: .25,
    depth: 10,
    height: 3,
    rotation: 0,
    layerId: "layer-building",
    elevationOffset: .3,
    strokeWidth: .25,
    visible: true,
    locked: false,
    metadata: { objectType: "wall" }
  };
  const template = {
    id: "door-test",
    name: "Testtür",
    objectType: "door",
    width: 1,
    depth: .18,
    height: 2.1,
    materialId: "mat-thermowood",
    classification: "AGD-TEST",
    sillHeight: 0
  };
  const door = createHostedOpeningEntity(template, wall, .3);
  assert(door && isHostedOpening(door), "Tür wurde nicht als gekoppelte Öffnung erzeugt");
  assert(Math.abs(door.position.x + 2) < .001, "Wandposition 30% wurde geometrisch falsch berechnet");
  assert(door.metadata.hostWallId === wall.id, "Host-Wand wurde nicht gespeichert");
  assert(door.metadata.openAngle === 90, "Standard-Öffnungswinkel der Tür fehlt");
  assert(Math.abs(door.elevationOffset - .3) < .001, "Wandhöhe wurde nicht auf die Tür übertragen");

  const movedWall = {
    ...wall,
    points: wall.points.map(point => ({ x: point.x + 2, y: point.y + 1 })),
    position: { x: 2, y: 1 },
    elevationOffset: .45
  };
  const syncedDoor = syncHostedOpenings([movedWall, door])[1];
  assert(Math.abs(syncedDoor.position.x) < .001 && Math.abs(syncedDoor.position.y - 1) < .001, "Tür folgt einer verschobenen Wand nicht");
  assert(Math.abs(syncedDoor.elevationOffset - .45) < .001, "Tür folgt der Wandhöhe nicht");

  const shiftedDoor = moveHostedOpening(syncedDoor, { x: 2, y: 4 }, [movedWall, syncedDoor]);
  const resyncedDoor = syncHostedOpenings([movedWall, shiftedDoor])[1];
  assert(Math.abs(Number(resyncedDoor.metadata.hostOffsetRatio) - .5) < .001, "Tür lässt sich nicht entlang der Wand verschieben");
  assert(Math.abs(resyncedDoor.position.y - 1) < .001, "Tür hat beim Verschieben die Wand verlassen");
  assert(hostedOpeningsForSegment([movedWall, resyncedDoor], wall.id, 0).length === 1, "Öffnung wird dem Wandsegment nicht zugeordnet");
  assert(createHostedOpeningEntity({ ...template, width: 12 }, wall, .5) === null, "Zu breite Öffnung wird nicht abgewiesen");
}

async function run() {
  runOpeningEngineChecks();
  await waitForServer();
  const [studioResponse, versionResponse, libraryResponse, apiVersionResponse, emptyAiResponse, fallbackAiResponse] = await Promise.all([
    fetch(`${baseUrl}/`),
    fetch(`${baseUrl}/version`),
    fetch(`${baseUrl}/library?tab=objects`),
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
    [studio.includes("Türen, Fenster &amp; Öffnungen") || studio.includes("Türen, Fenster & Öffnungen"), "Architekturpanel fehlt im Studio"],
    [studio.includes("Wand/Mauer"), "Wandwerkzeug fehlt im Studio"],
    [studio.includes("Position auf der Wand"), "Wandposition fehlt im Architekturpanel"],
    [versionResponse.status === 200 && version.includes("3.1.0-alpha.8"), "Versionsseite ist nicht Alpha 8"],
    [version.includes("3D-Wandaussparungen"), "Alpha-8-Funktionen fehlen auf der Versionsseite"],
    [libraryResponse.status === 200 && library.includes("Haustür 1,10 m"), "Architekturbauteile fehlen in der Library"],
    [library.includes("In gewählte Wand einsetzen"), "Wandgebundene Library-Aktion fehlt"],
    [apiVersion.packageVersion === "3.1.0-alpha.8", "Versions-API meldet nicht Alpha 8"],
    [apiVersion.schemaVersion === "3.1-alpha.4", "Projektschema wurde unerwartet verändert"],
    [emptyAiResponse.status === 400 && emptyAi.fallback === true, "Leere KI-Eingabe wird nicht korrekt abgewiesen"],
    [fallbackAiResponse.status === 200 && fallbackAi.fallback === true, "Lokaler KI-Fallback wird ohne API-Schlüssel nicht gemeldet"]
  ];

  const sourceFiles = {
    domain: await readFileAsync("types/domain.ts", "utf8"),
    openings: await readFileAsync("core/cad/openings.ts", "utf8"),
    store: await readFileAsync("stores/projectStore.tsx", "utf8"),
    studio: await readFileAsync("components/layout/StudioShell.tsx", "utf8"),
    architecture: await readFileAsync("components/architecture/ArchitectureOpeningsPanel.tsx", "utf8"),
    cad: await readFileAsync("components/cad/CadCanvas.tsx", "utf8"),
    three: await readFileAsync("components/render/ThreeViewport.tsx", "utf8"),
    elevation: await readFileAsync("components/render/ElevationViewport.tsx", "utf8"),
    inspector: await readFileAsync("components/bim/BimInspector.tsx", "utf8"),
    library: await readFileAsync("components/library/LibraryPanel.tsx", "utf8"),
    catalog: await readFileAsync("data/objects/catalog.ts", "utf8")
  };
  const sourceChecks = [
    [sourceFiles.domain.includes('"opening"'), "Öffnungstyp fehlt im Projektdatenmodell"],
    [sourceFiles.openings.includes("createHostedOpeningEntity") && sourceFiles.openings.includes("syncHostedOpenings"), "Wandkopplungs-Engine fehlt"],
    [sourceFiles.store.includes("moveHostedOpening") && sourceFiles.store.includes("removedIds.has(hostWallId)"), "Verschieben oder Kaskadenlöschen fehlt"],
    [sourceFiles.studio.includes("ArchitectureOpeningsPanel"), "Architekturpanel ist nicht eingebunden"],
    [sourceFiles.architecture.includes("schneidet die Wand in 3D"), "Echte Wandöffnung wird im Panel nicht bestätigt"],
    [sourceFiles.cad.includes("architectureOpening2d") && sourceFiles.cad.includes("openAngle"), "2D-Tür-/Fenstersymbole fehlen"],
    [sourceFiles.three.includes("addWallPiece") && sourceFiles.three.includes("hostedOpeningsForSegment"), "3D-Wandaufteilung fehlt"],
    [sourceFiles.three.includes('objectType === "window"') && sourceFiles.three.includes('objectType === "door"'), "3D-Bauteilmodelle fehlen"],
    [sourceFiles.elevation.includes("elevationOpening"), "Front-/Seitenansicht kennt Öffnungen nicht"],
    [sourceFiles.inspector.includes("Brüstungshöhe") && sourceFiles.inspector.includes("Öffnungswinkel"), "Öffnungseigenschaften fehlen"],
    [sourceFiles.library.includes("createHostedOpeningEntity") && sourceFiles.library.includes("In gewählte Wand einsetzen"), "Library-Wandkopplung fehlt"],
    [(sourceFiles.catalog.match(/hostRequired:|true, [.]?[0-9]/g) ?? []).length >= 7 && sourceFiles.catalog.includes("Freier Durchgang"), "Architekturkatalog ist unvollständig"]
  ];

  for (const [condition, message] of [...endpointChecks, ...sourceChecks]) assert(condition, message);
  console.log(`Alpha 8: 10 Geometrie-, ${endpointChecks.length} Produktions- und ${sourceChecks.length} Strukturprüfungen erfolgreich.`);
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
