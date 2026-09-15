import { readFileSync } from "node:fs";
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

const { createGardenConcepts } = require(path.resolve("engines/ai/gardenDesigner.ts"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function projectWithProperty({ center, width, depth, rotation }) {
  return {
    entities: [{
      id: "property-test",
      kind: "surface",
      shape: "rectangle",
      name: "Grundstück",
      points: [],
      position: center,
      width,
      depth,
      height: .05,
      rotation,
      layerId: "layer-site",
      visible: true,
      locked: false,
      metadata: { objectType: "property-boundary" }
    }],
    layers: [
      { id: "layer-site", locked: false },
      { id: "layer-paths", locked: false },
      { id: "layer-planting", locked: false },
      { id: "layer-water", locked: false },
      { id: "layer-furniture", locked: false },
      { id: "layer-building", locked: false }
    ],
    terrain: { width, depth }
  };
}

function toLocal(point, frame) {
  const radians = -frame.rotation * Math.PI / 180;
  const dx = point.x - frame.center.x;
  const dy = point.y - frame.center.y;
  return {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians)
  };
}

function assertInsideProperty(entity, frame) {
  const tolerance = .0001;
  if (entity.points.length > 0) {
    const inset = (entity.kind === "wall" || entity.kind === "path") ? entity.width / 2 : 0;
    for (const point of entity.points) {
      const local = toLocal(point, frame);
      assert(Math.abs(local.x) + inset <= frame.width / 2 + tolerance, `${entity.name} liegt horizontal außerhalb des Grundstücks`);
      assert(Math.abs(local.y) + inset <= frame.depth / 2 + tolerance, `${entity.name} liegt vertikal außerhalb des Grundstücks`);
    }
    return;
  }

  const local = toLocal(entity.position, frame);
  const halfWidth = entity.shape === "circle" ? (entity.radius ?? entity.width / 2) : entity.width / 2;
  const halfDepth = entity.shape === "circle" ? (entity.radius ?? entity.depth / 2) : entity.depth / 2;
  assert(Math.abs(local.x) + halfWidth <= frame.width / 2 + tolerance, `${entity.name} liegt horizontal außerhalb des Grundstücks`);
  assert(Math.abs(local.y) + halfDepth <= frame.depth / 2 + tolerance, `${entity.name} liegt vertikal außerhalb des Grundstücks`);
}

const frame = { center: { x: 12, y: -8 }, width: 3, depth: 3, rotation: 27 };
const project = projectWithProperty(frame);
const concepts = createGardenConcepts(project, {
  prompt: "Pflegeleichter Garten mit Pool, Pergola, Sichtschutz, Hochbeet, Rasen und vier Bäumen",
  style: "low-maintenance",
  priority: "relaxation",
  budget: "balanced",
  sunny: true
});

assert(concepts.length === 3, "Der Garden Designer erzeugt nicht genau drei Varianten");
for (const concept of concepts) {
  assert(concept.entities.length > 0, `${concept.title} enthält keine CAD-Objekte`);
  for (const entity of concept.entities) assertInsideProperty(entity, frame);
  const requested = concept.entities.filter(entity => entity.metadata?.requestedByPrompt === true);
  assert(requested.some(entity => entity.metadata?.objectType === "pool"), `${concept.title} berücksichtigt den gewünschten Pool nicht`);
  assert(requested.some(entity => entity.metadata?.objectType === "pergola"), `${concept.title} berücksichtigt die gewünschte Pergola nicht`);
  assert(requested.some(entity => entity.metadata?.objectType === "screen"), `${concept.title} berücksichtigt den gewünschten Sichtschutz nicht`);
  assert(requested.some(entity => entity.metadata?.objectType === "raised-bed"), `${concept.title} berücksichtigt das gewünschte Hochbeet nicht`);
  assert(requested.some(entity => entity.metadata?.objectType === "lawn"), `${concept.title} berücksichtigt die gewünschte Rasenfläche nicht`);
  assert(requested.filter(entity => entity.metadata?.objectType === "tree").length === 4, `${concept.title} berücksichtigt die gewünschte Baumanzahl nicht`);
  assert(concept.highlights.some(item => item.includes("Wünsche aus dem Beschreibungstext")), `${concept.title} weist die umgesetzten Textwünsche nicht aus`);
}

const terrainProject = {
  ...projectWithProperty({ center: { x: 0, y: 0 }, width: 18, depth: 12, rotation: 0 }),
  entities: [],
  terrain: { width: 18, depth: 12 }
};
const terrainConcepts = createGardenConcepts(terrainProject, {
  prompt: "Naturnaher Garten mit Teich und Hecke",
  style: "natural",
  priority: "biodiversity",
  budget: "compact",
  sunny: false
});
assert(terrainConcepts.every(concept => concept.entities.some(entity => entity.metadata?.objectType === "pond")), "Die Gelände-Ausweichfläche berücksichtigt den Teich nicht");
assert(terrainConcepts.every(concept => concept.entities.some(entity => entity.metadata?.objectType === "hedge")), "Die Gelände-Ausweichfläche berücksichtigt die Hecke nicht");

console.log(`${concepts.length + terrainConcepts.length} Garden-Designer-Varianten: Textwünsche und Grundstücksgrenzen erfolgreich geprüft.`);
