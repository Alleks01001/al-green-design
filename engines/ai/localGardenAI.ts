import { makeId } from "@/core/cad/geometry";
import { createGardenConcepts, type DesignPriority, type GardenStyle } from "@/engines/ai/gardenDesigner";
import type { CadEntity, ProjectState } from "@/types/domain";

export type GardenAIResult = {
  message: string;
  entities: CadEntity[];
  createdIds: string[];
  terrainPreset?: "flat" | "mound" | "swale";
};

export type GardenRemoteLayout = {
  terrain?: { style?: "flat" | "hilly" | "sunken"; intensity?: number };
  objects?: Array<{
    id?: string;
    type?: string;
    subtype?: string;
    x?: number;
    z?: number;
    scaleX?: number;
    scaleY?: number;
    scaleZ?: number;
    rotation?: number;
  }>;
};

function parseDimensions(text: string, fallbackWidth: number, fallbackDepth: number) {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m)?\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
  if (!match) return { width: fallbackWidth, depth: fallbackDepth };
  return {
    width: Math.max(.2, Number(match[1].replace(",", "."))),
    depth: Math.max(.2, Number(match[2].replace(",", ".")))
  };
}

function parseLength(text: string, fallback: number) {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m|meter)\b/i);
  return Math.max(.2, Number(match?.[1]?.replace(",", ".") ?? fallback));
}

function parsePlantCount(text: string, fallback = 3) {
  const match = text.match(/\b(\d{1,2})\s*(?:bäume|baeume|bäumen|sträucher|straeucher|hortensien|pflanzen|stauden|gräser|graeser|hecken)/i);
  return Math.max(1, Math.min(40, Number(match?.[1] ?? fallback)));
}

function generatedEntity(entity: Omit<CadEntity, "id" | "visible" | "locked">): CadEntity {
  return {
    id: makeId("garden-ai"),
    visible: true,
    locked: false,
    ...entity,
    metadata: { ...(entity.metadata ?? {}), generatedBy: "Garden AI Alpha 7" }
  };
}

function projectFrame(project: ProjectState) {
  const property = project.entities.find(entity => entity.metadata?.objectType === "property-boundary" || entity.name.toLocaleLowerCase("de-DE") === "grundstück");
  return {
    center: property?.position ?? { x: 0, y: 0 },
    width: Math.max(8, property?.width ?? project.terrain.width ?? 20),
    depth: Math.max(8, property?.depth ?? project.terrain.depth ?? 15)
  };
}

function lineEntity(name: string, kind: "wall" | "path", length: number, x: number, y: number, materialId: string, objectType: string, height: number, angleDeg = 0) {
  const angle = angleDeg * Math.PI / 180;
  const halfX = Math.cos(angle) * length / 2;
  const halfY = Math.sin(angle) * length / 2;
  return generatedEntity({
    kind,
    shape: kind === "path" ? "polyline" : "line",
    name,
    points: [{ x: x - halfX, y: y - halfY }, { x: x + halfX, y: y + halfY }],
    position: { x, y },
    width: kind === "path" ? 1.2 : .22,
    depth: length,
    height,
    rotation: angleDeg,
    layerId: kind === "path" ? "layer-paths" : "layer-building",
    materialId,
    strokeWidth: kind === "path" ? 1.2 : .22,
    metadata: { objectType, databaseCategory: objectType === "fence" || objectType === "screen" ? "Zäune & Sichtschutz" : kind === "wall" ? "Mauern" : "Beläge & Wege" }
  });
}

function remoteObjectToEntity(object: NonNullable<GardenRemoteLayout["objects"]>[number], index: number): CadEntity {
  const type = String(object.type ?? object.subtype ?? "surface").toLowerCase();
  const x = Number.isFinite(object.x) ? Number(object.x) : -4 + (index % 5) * 2;
  const y = Number.isFinite(object.z) ? Number(object.z) : -3 + Math.floor(index / 5) * 2;
  const width = Math.max(.2, Number(object.scaleX) || 1.5);
  const depth = Math.max(.2, Number(object.scaleZ) || 1.5);
  const height = Math.max(.05, Number(object.scaleY) || 1);
  const rotation = Number(object.rotation) || 0;
  const name = String(object.subtype || object.type || `KI-Objekt ${index + 1}`);

  if (/tree|baum|shrub|strauch|plant|pflanze|perennial|staude|grass|gras|hedge|hecke/.test(type)) {
    const category = /tree|baum/.test(type) ? "Bäume" : /grass|gras/.test(type) ? "Gräser" : /perennial|staude/.test(type) ? "Stauden" : /hedge|hecke/.test(type) ? "Hecken" : "Sträucher";
    return generatedEntity({ kind: "plant", shape: "symbol", name, points: [], position: { x, y }, width, depth: width, height, rotation, layerId: "layer-planting", fillColor: "#cf8faa", metadata: { databaseCategory: category } });
  }
  if (/wall|mauer|fence|zaun|screen|sichtschutz/.test(type)) {
    const objectType = /fence|zaun/.test(type) ? "fence" : /screen|sichtschutz/.test(type) ? "screen" : "wall";
    return lineEntity(name, "wall", width, x, y, objectType === "wall" ? "mat-natural-stone" : "mat-anthracite-metal", objectType, height, rotation);
  }
  if (/path|weg/.test(type)) return lineEntity(name, "path", Math.max(width, depth), x, y, "mat-paving", "path", Math.min(.12, height), rotation);
  if (/pool|pond|teich|water|wasser/.test(type)) {
    return generatedEntity({ kind: "water", shape: "rectangle", name, points: [], position: { x, y }, width, depth, height: Math.min(.5, height), rotation, layerId: "layer-water", materialId: "mat-water", opacity: .76, metadata: { objectType: /pool/.test(type) ? "pool" : "pond" } });
  }
  if (/building|house|haus|garage/.test(type)) {
    return generatedEntity({ kind: "building", shape: "rectangle", name, points: [], position: { x, y }, width, depth, height: Math.max(2.4, height), rotation, layerId: "layer-building", materialId: "mat-concrete", metadata: { objectType: "building" } });
  }
  if (/pergola|carport|pavilion|bench|bank|table|tisch|chair|stuhl|light|leuchte|rock|stein/.test(type)) {
    const objectType = /carport/.test(type) ? "carport" : /pavilion/.test(type) ? "pavilion" : /pergola/.test(type) ? "pergola" : /bench|bank/.test(type) ? "bench" : /table|tisch/.test(type) ? "table" : /chair|stuhl/.test(type) ? "chair" : /light|leuchte/.test(type) ? "path-light" : "rock";
    return generatedEntity({ kind: "furniture", shape: "rectangle", name, points: [], position: { x, y }, width, depth, height, rotation, layerId: objectType.includes("light") ? "layer-lighting" : "layer-furniture", materialId: objectType === "rock" ? "mat-natural-stone" : "mat-thermowood", metadata: { objectType } });
  }
  return generatedEntity({ kind: "surface", shape: "rectangle", name, points: [], position: { x, y }, width, depth, height: Math.min(.25, height), rotation, layerId: "layer-paths", materialId: /lawn|rasen/.test(type) ? "mat-lawn" : "mat-paving", metadata: { objectType: type } });
}

export function entitiesFromGardenLayout(layout: GardenRemoteLayout, project: ProjectState): GardenAIResult {
  const created = (layout.objects ?? []).slice(0, 80).map(remoteObjectToEntity);
  const terrainPreset = layout.terrain?.style === "hilly" ? "mound" : layout.terrain?.style === "sunken" ? "swale" : layout.terrain?.style === "flat" ? "flat" : undefined;
  return {
    message: `${created.length} CAD-Objekt${created.length === 1 ? "" : "e"} wurden von der Online-KI erzeugt.`,
    entities: [...project.entities, ...created],
    createdIds: created.map(entity => entity.id),
    terrainPreset
  };
}

export function interpretGardenCommand(command: string, project: ProjectState): GardenAIResult {
  const text = command.toLocaleLowerCase("de-DE").trim();
  const frame = projectFrame(project);
  const created: CadEntity[] = [];
  const { center, width: siteWidth, depth: siteDepth } = frame;
  const dimensions = parseDimensions(text, Math.min(6, siteWidth * .35), Math.min(4, siteDepth * .3));

  if (/grundstück|grundstueck|bauplatz/.test(text) && !project.entities.some(entity => entity.metadata?.objectType === "property-boundary" || entity.name === "Grundstück")) {
    created.push(generatedEntity({ kind: "surface", shape: "rectangle", name: "Grundstück", points: [], position: center, width: dimensions.width, depth: dimensions.depth, height: .05, rotation: 0, layerId: "layer-site", materialId: "mat-lawn", opacity: .32, strokeColor: "#355d38", metadata: { objectType: "property-boundary", databaseCategory: "Grundstück" } }));
  }

  if (/terrasse|sitzplatz|patio/.test(text)) {
    created.push(generatedEntity({ kind: "surface", shape: "rectangle", name: "KI-Terrasse", points: [], position: { x: center.x + siteWidth * .2, y: center.y + siteDepth * .18 }, width: dimensions.width, depth: dimensions.depth, height: .16, rotation: 0, layerId: "layer-paths", materialId: /holz|diele/.test(text) ? "mat-thermowood" : /beton/.test(text) ? "mat-concrete" : "mat-natural-stone", metadata: { objectType: "terrace", databaseCategory: "Terrassen" } }));
  }
  if (/rasen|wiese/.test(text)) {
    created.push(generatedEntity({ kind: "surface", shape: "rectangle", name: /wiese/.test(text) ? "Blumenwiese" : "Rasenfläche", points: [], position: { x: center.x - siteWidth * .12, y: center.y - siteDepth * .05 }, width: dimensions.width, depth: dimensions.depth, height: .05, rotation: 0, layerId: "layer-site", materialId: "mat-lawn", metadata: { objectType: "lawn" } }));
  }
  if (/beet|pflanzfläche|pflanzflaeche/.test(text)) {
    created.push(generatedEntity({ kind: "surface", shape: "rectangle", name: "Pflanzbeet", points: [], position: { x: center.x - siteWidth * .28, y: center.y + siteDepth * .22 }, width: dimensions.width, depth: dimensions.depth, height: .08, rotation: 0, layerId: "layer-planting", materialId: "mat-planting-soil", metadata: { objectType: "planting-bed" } }));
  }
  if (/weg|pfad|zufahrt/.test(text)) {
    const length = parseLength(text, Math.min(10, siteWidth * .55));
    created.push(lineEntity("KI-Gartenweg", "path", length, center.x, center.y + siteDepth * .3, /kies|schotter/.test(text) ? "mat-gravel" : "mat-paving", "path", .08, 0));
  }
  if (/mauer|stützwand|stuetzwand/.test(text)) {
    const length = parseLength(text, Math.min(8, siteWidth * .5));
    created.push(lineEntity("KI-Gartenmauer", "wall", length, center.x, center.y - siteDepth * .35, /beton/.test(text) ? "mat-concrete" : "mat-natural-stone", "wall", 1.2));
  }
  if (/zaun|sichtschutz/.test(text)) {
    const length = parseLength(text, Math.min(10, siteWidth * .65));
    created.push(lineEntity(/sichtschutz/.test(text) ? "KI-Sichtschutz" : "KI-Zaun", "wall", length, center.x, center.y - siteDepth * .42, /holz/.test(text) ? "mat-larch" : "mat-anthracite-metal", /sichtschutz/.test(text) ? "screen" : "fence", 1.6));
  }
  if (/pool|schwimmbecken|teich|wasserbecken/.test(text)) {
    const pool = /pool|schwimmbecken/.test(text);
    created.push(generatedEntity({ kind: "water", shape: pool ? "rectangle" : "ellipse", name: pool ? "KI-Pool" : "KI-Teich", points: [], position: { x: center.x - siteWidth * .22, y: center.y + siteDepth * .15 }, width: dimensions.width, depth: dimensions.depth, height: pool ? .35 : .22, rotation: 0, layerId: "layer-water", materialId: "mat-water", opacity: .76, metadata: { objectType: pool ? "pool" : "pond" } }));
  }
  if (/haus|gebäude|gebaeude|garage/.test(text)) {
    created.push(generatedEntity({ kind: "building", shape: "rectangle", name: /garage/.test(text) ? "KI-Garage" : "KI-Gebäude", points: [], position: { x: center.x, y: center.y - siteDepth * .22 }, width: dimensions.width, depth: dimensions.depth, height: 3.1, rotation: 0, layerId: "layer-building", materialId: "mat-concrete", metadata: { objectType: "building" } }));
  }
  if (/pergola|pavillon|carport/.test(text)) {
    const objectType = /carport/.test(text) ? "carport" : /pavillon/.test(text) ? "pavilion" : "pergola";
    created.push(generatedEntity({ kind: "furniture", shape: "rectangle", name: objectType === "carport" ? "KI-Carport" : objectType === "pavilion" ? "KI-Pavillon" : "KI-Pergola", points: [], position: { x: center.x + siteWidth * .24, y: center.y - siteDepth * .16 }, width: dimensions.width, depth: dimensions.depth, height: 2.5, rotation: 0, layerId: "layer-furniture", materialId: "mat-thermowood", metadata: { objectType } }));
  }
  if (/bank|sitzbank|möbel|moebel/.test(text)) {
    created.push(generatedEntity({ kind: "furniture", shape: "rectangle", name: "KI-Sitzbank", points: [], position: { x: center.x + siteWidth * .12, y: center.y + siteDepth * .08 }, width: 1.8, depth: .65, height: .82, rotation: 0, layerId: "layer-furniture", materialId: "mat-thermowood", metadata: { objectType: "bench" } }));
  }

  if (/baum|bäume|baeume|strauch|sträucher|straeucher|hortensie|pflanze|staude|gräser|graeser|hecke/.test(text)) {
    const count = parsePlantCount(text, /bäume|baeume|stauden|pflanzen|gräser|graeser|sträucher|straeucher/.test(text) ? 5 : 1);
    const isTree = /baum|bäume|baeume/.test(text);
    const isGrass = /gräser|graeser/.test(text);
    const isPerennial = /staude/.test(text);
    const isHedge = /hecke/.test(text);
    const isHydrangea = /hortensie/.test(text);
    const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
    for (let index = 0; index < count; index += 1) {
      const plantWidth = isTree ? 3 : isHedge ? 1.2 : isGrass || isPerennial ? .8 : 1.5;
      created.push(generatedEntity({
        kind: "plant", shape: "symbol", name: `${isTree ? "KI-Baum" : isGrass ? "KI-Ziergras" : isPerennial ? "KI-Staude" : isHedge ? "KI-Hecke" : isHydrangea ? "KI-Hortensie" : "KI-Strauch"} ${index + 1}`,
        points: [], position: { x: center.x - siteWidth * .32 + (index % columns) * Math.max(1.2, plantWidth * .8), y: center.y + siteDepth * .34 - Math.floor(index / columns) * Math.max(1.2, plantWidth * .8) },
        width: plantWidth, depth: plantWidth, height: isTree ? 5 : isHedge ? 1.5 : isGrass ? 1.1 : isPerennial ? .8 : 1.6, rotation: 0, layerId: "layer-planting", fillColor: isHydrangea ? "#7895cf" : isPerennial ? "#d38aa7" : "#c9a4b4",
        metadata: { databaseCategory: isTree ? "Bäume" : isGrass ? "Gräser" : isPerennial ? "Stauden" : isHedge ? "Hecken" : "Sträucher", spacing: Math.max(.6, plantWidth * .75) }
      }));
    }
  }

  if (!created.length) {
    const style: GardenStyle = /naturnah|wild|ökologisch|oekologisch/.test(text) ? "natural" : /familie|kinder/.test(text) ? "family" : /pflegeleicht/.test(text) ? "low-maintenance" : "modern";
    const priority: DesignPriority = /biodivers|insekten|bienen|ökologisch|oekologisch/.test(text) ? "biodiversity" : /spiel|kinder/.test(text) ? "play" : /gäste|gaeste|party|essen/.test(text) ? "entertaining" : "relaxation";
    const concept = createGardenConcepts(project, { prompt: command, style, priority, budget: /premium|hochwertig/.test(text) ? "premium" : /günstig|guenstig|sparsam/.test(text) ? "compact" : "balanced", sunny: !/schatten|schattig/.test(text) })[0];
    created.push(...concept.entities.map(entity => ({ ...entity, metadata: { ...(entity.metadata ?? {}), generatedBy: "Garden AI Alpha 7" } })));
  }

  const terrainPreset = /hügel|huegel|modelliert/.test(text) ? "mound" : /mulde|senke|regengarten/.test(text) ? "swale" : /eben|flach/.test(text) ? "flat" : undefined;
  const names = created.slice(0, 4).map(entity => entity.name).join(", ");
  return {
    message: `${created.length} bearbeitbare CAD-Objekt${created.length === 1 ? "" : "e"} wurden erzeugt${names ? `: ${names}${created.length > 4 ? " …" : ""}` : ""}.`,
    entities: [...project.entities, ...created],
    createdIds: created.map(entity => entity.id),
    terrainPreset
  };
}
