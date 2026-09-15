import { makeId, polylineLength } from "@/core/cad/geometry";
import type { CadEntity, ProjectState, Vec2 } from "@/types/domain";

export type GardenStyle = "modern" | "natural" | "family" | "low-maintenance";
export type DesignPriority = "biodiversity" | "relaxation" | "entertaining" | "play";

export type GardenDesignBrief = {
  prompt: string;
  style: GardenStyle;
  priority: DesignPriority;
  budget: "compact" | "balanced" | "premium";
  sunny: boolean;
};

export type GardenConcept = {
  id: string;
  title: string;
  description: string;
  score: number;
  estimatedArea: number;
  estimatedBudget: number;
  entities: CadEntity[];
  highlights: string[];
};

const palettes: Record<GardenStyle, { terrace: string; path: string; planting: string }> = {
  modern: { terrace: "mat-concrete", path: "mat-natural-stone", planting: "Strukturpflanzung" },
  natural: { terrace: "mat-natural-stone", path: "mat-gravel", planting: "Naturnahe Pflanzung" },
  family: { terrace: "mat-paving", path: "mat-natural-stone", planting: "Robuste Familienpflanzung" },
  "low-maintenance": { terrace: "mat-concrete", path: "mat-gravel", planting: "Pflegeleichte Pflanzung" }
};

type DesignFrame = {
  center: Vec2;
  width: number;
  depth: number;
  rotation: number;
  margin: number;
};

type RequestedFeatures = {
  pool: boolean;
  pond: boolean;
  pergola: boolean;
  lawn: boolean;
  bed: boolean;
  hedge: boolean;
  screen: boolean;
  treeCount: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function designFrame(project: ProjectState): DesignFrame {
  const property = project.entities.find(item =>
    item.metadata?.objectType === "property-boundary"
    || item.name.trim().toLocaleLowerCase("de-DE") === "grundstück"
  );
  const width = Math.max(3, Number(property?.width) || Number(project.terrain?.width) || 20);
  const depth = Math.max(3, Number(property?.depth) || Number(project.terrain?.depth) || 15);
  return {
    center: property?.position ?? { x: 0, y: 0 },
    width,
    depth,
    rotation: Number.isFinite(property?.rotation) ? property!.rotation : 0,
    margin: clamp(Math.min(width, depth) * .05, .18, .75)
  };
}

function toWorld(frame: DesignFrame, local: Vec2): Vec2 {
  const radians = frame.rotation * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: frame.center.x + local.x * cos - local.y * sin,
    y: frame.center.y + local.x * sin + local.y * cos
  };
}

function fittedSize(preferred: number, span: number, margin: number) {
  return Math.max(.2, Math.min(preferred, Math.max(.2, span - margin * 2)));
}

function framedPosition(
  frame: DesignFrame,
  normalizedX: number,
  normalizedY: number,
  itemWidth = 0,
  itemDepth = 0
) {
  const maxX = Math.max(0, frame.width / 2 - frame.margin - itemWidth / 2);
  const maxY = Math.max(0, frame.depth / 2 - frame.margin - itemDepth / 2);
  return toWorld(frame, {
    x: clamp(normalizedX, -1, 1) * maxX,
    y: clamp(normalizedY, -1, 1) * maxY
  });
}

function framedPoint(frame: DesignFrame, normalizedX: number, normalizedY: number, inset = 0) {
  const maxX = Math.max(0, frame.width / 2 - frame.margin - inset);
  const maxY = Math.max(0, frame.depth / 2 - frame.margin - inset);
  return toWorld(frame, {
    x: clamp(normalizedX, -1, 1) * maxX,
    y: clamp(normalizedY, -1, 1) * maxY
  });
}

function requestedFeatures(prompt: string): RequestedFeatures {
  const text = prompt.toLocaleLowerCase("de-DE");
  const numberWords: Record<string, number> = {
    ein: 1, eine: 1, einen: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, fuenf: 5,
    sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, zwoelf: 12
  };
  const treeCountMatch = text.match(/\b(\d{1,2}|ein|eine|einen|eins|zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn|elf|zwölf|zwoelf)\s*(?:bäume|baeume|bäumen|baeumen|baum)\b/i);
  const treeRequested = /\b(?:baum|bäume|baeume|bäumen|baeumen)\b/i.test(text);
  const requestedTreeCount = treeCountMatch
    ? Number(treeCountMatch[1]) || numberWords[treeCountMatch[1]] || 3
    : 3;
  return {
    pool: /\b(?:pool|schwimmbecken)\b/i.test(text),
    pond: /\b(?:teich|biotop|wasserbecken|regengarten)\b/i.test(text),
    pergola: /\b(?:pergola|pavillon|laube)\b/i.test(text),
    lawn: /\b(?:rasen|wiese|blumenwiese)\b/i.test(text),
    bed: /\b(?:beet|hochbeet|pflanzfläche|pflanzflaeche)\b/i.test(text),
    hedge: /\b(?:hecke|hecken)\b/i.test(text),
    screen: /\b(?:sichtschutz|zaun|einfriedung)\b/i.test(text),
    treeCount: treeRequested ? clamp(requestedTreeCount, 1, 12) : 0
  };
}

function entity(base: Omit<CadEntity, "id" | "visible" | "locked" | "points" | "rotation"> & Partial<Pick<CadEntity, "points" | "rotation">>): CadEntity {
  return {
    id: makeId("ai"),
    visible: true,
    locked: false,
    points: base.points ?? [],
    rotation: base.rotation ?? 0,
    ...base,
    metadata: { ...(base.metadata ?? {}), generatedBy: "Garden Designer 2.6" }
  };
}

function conceptEntities(project: ProjectState, brief: GardenDesignBrief, variant: number): CadEntity[] {
  const palette = palettes[brief.style];
  const frame = designFrame(project);
  const requested = requestedFeatures(brief.prompt);
  const minimumSpan = Math.min(frame.width, frame.depth);
  const entities: CadEntity[] = [];

  const terraceWidth = fittedSize(Math.min(5.6, frame.width * (.34 + variant * .025)), frame.width, frame.margin);
  const terraceDepth = fittedSize(Math.min(3.8, frame.depth * (.27 + (variant % 2) * .035)), frame.depth, frame.margin);

  entities.push(entity({
    kind: "surface", shape: "rectangle", name: variant === 0 ? "AI-Lounge-Terrasse" : variant === 1 ? "AI-Essplatz" : "AI-Gartenzimmer",
    position: framedPosition(frame, .58 - variant * .13, .62, terraceWidth, terraceDepth), width: terraceWidth, depth: terraceDepth,
    height: 0.16, rotation: frame.rotation, layerId: "layer-paths", materialId: palette.terrace,
    metadata: { conceptVariant: variant + 1, zone: "Aufenthalt" }
  }));

  const pathWidth = clamp(minimumSpan * .075, .32, 1.25);
  const normalizedPath = variant === 1
    ? [{ x: -.88, y: .82 }, { x: -.2, y: .18 }, { x: .55, y: .58 }]
    : variant === 2
      ? [{ x: -.88, y: .82 }, { x: -.48, y: -.12 }, { x: .08, y: .34 }, { x: .55, y: .58 }]
      : [{ x: -.88, y: .82 }, { x: -.15, y: .68 }, { x: .55, y: .58 }];
  const pathPoints = normalizedPath.map(point => framedPoint(frame, point.x, point.y, pathWidth / 2));
  const pathCenter = pathPoints.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  entities.push(entity({
    kind: "path", shape: "polyline", name: "AI-Hauptweg", points: pathPoints,
    position: { x: pathCenter.x / pathPoints.length, y: pathCenter.y / pathPoints.length }, width: pathWidth, depth: polylineLength(pathPoints),
    height: 0.07, rotation: frame.rotation, layerId: "layer-paths", materialId: palette.path,
    metadata: { conceptVariant: variant + 1, zone: "Erschließung" }
  }));

  const plantCount = brief.priority === "biodiversity" ? 9 : brief.style === "low-maintenance" ? 5 : 7;
  const plantName = brief.sunny ? "Sonnenstaude" : "Schattenstaude";
  const plantWidth = clamp(minimumSpan * .09, .34, 1.2);
  for (let index = 0; index < plantCount; index += 1) {
    const angle = (index / plantCount) * Math.PI * 2 + variant * 0.35;
    entities.push(entity({
      kind: "plant", shape: "symbol", name: `${plantName} ${index + 1}`,
      position: framedPosition(frame, Math.cos(angle) * .82, Math.sin(angle) * .82, plantWidth, plantWidth),
      width: plantWidth, depth: plantWidth, height: brief.style === "natural" ? 1.4 : 1.0,
      rotation: frame.rotation, layerId: "layer-planting",
      metadata: { conceptVariant: variant + 1, zone: palette.planting, pollinatorFriendly: brief.priority === "biodiversity" }
    }));
  }

  if (brief.priority === "relaxation" || brief.priority === "entertaining") {
    const furnitureWidth = fittedSize(Math.min(1.8, frame.width * .18), frame.width, frame.margin);
    const furnitureDepth = fittedSize(Math.min(.75, frame.depth * .12), frame.depth, frame.margin);
    entities.push(entity({
      kind: "furniture", shape: "rectangle", name: brief.priority === "relaxation" ? "Ruhebank" : "Outdoor-Tisch",
      position: framedPosition(frame, .5 - variant * .12, .58, furnitureWidth, furnitureDepth), width: furnitureWidth, depth: furnitureDepth, height: 0.75,
      rotation: frame.rotation, layerId: "layer-furniture", materialId: "mat-wood",
      metadata: { conceptVariant: variant + 1, zone: "Ausstattung" }
    }));
  }

  if (brief.priority === "play") {
    const diameter = fittedSize(Math.min(3.2, minimumSpan * .36), minimumSpan, frame.margin);
    entities.push(entity({
      kind: "surface", shape: "circle", name: "Spielzone", position: framedPosition(frame, -.55, -.5, diameter, diameter),
      width: diameter, depth: diameter, radius: diameter / 2, height: 0.08, rotation: frame.rotation, layerId: "layer-site", materialId: "mat-lawn",
      metadata: { conceptVariant: variant + 1, zone: "Spiel" }
    }));
  }

  if (brief.priority === "biodiversity") {
    const diameter = fittedSize(Math.min(2.2, minimumSpan * .24), minimumSpan, frame.margin);
    entities.push(entity({
      kind: "water", shape: "circle", name: "Kleines Biotop", position: framedPosition(frame, -.68 + variant * .12, -.62, diameter, diameter),
      width: diameter, depth: diameter, radius: diameter / 2, height: 0.35, rotation: frame.rotation, layerId: "layer-water", materialId: "mat-water",
      metadata: { conceptVariant: variant + 1, zone: "Ökologie" }
    }));
  }

  if (requested.lawn) {
    const lawnWidth = fittedSize(frame.width * .42, frame.width, frame.margin);
    const lawnDepth = fittedSize(frame.depth * .34, frame.depth, frame.margin);
    entities.push(entity({
      kind: "surface", shape: "rectangle", name: brief.prompt.toLocaleLowerCase("de-DE").includes("wiese") ? "AI-Blumenwiese" : "AI-Rasenfläche",
      position: framedPosition(frame, -.25, -.3, lawnWidth, lawnDepth), width: lawnWidth, depth: lawnDepth,
      height: .04, rotation: frame.rotation, layerId: "layer-site", materialId: "mat-lawn",
      metadata: { conceptVariant: variant + 1, zone: "Grünfläche", requestedByPrompt: true, objectType: "lawn" }
    }));
  }

  if (requested.bed) {
    const bedWidth = fittedSize(Math.min(3.4, frame.width * .3), frame.width, frame.margin);
    const bedDepth = fittedSize(Math.min(1.8, frame.depth * .2), frame.depth, frame.margin);
    entities.push(entity({
      kind: "surface", shape: "ellipse", name: /hochbeet/i.test(brief.prompt) ? "AI-Hochbeet" : "AI-Pflanzbeet",
      position: framedPosition(frame, -.58, .45, bedWidth, bedDepth), width: bedWidth, depth: bedDepth,
      height: /hochbeet/i.test(brief.prompt) ? .75 : .16, rotation: frame.rotation, layerId: "layer-planting", materialId: "mat-planting-soil",
      metadata: { conceptVariant: variant + 1, zone: "Pflanzung", requestedByPrompt: true, objectType: /hochbeet/i.test(brief.prompt) ? "raised-bed" : "planting-bed" }
    }));
  }

  if (requested.pool || requested.pond) {
    const pool = requested.pool;
    const waterWidth = fittedSize(Math.min(pool ? 5 : 3.4, frame.width * (pool ? .34 : .28)), frame.width, frame.margin);
    const waterDepth = fittedSize(Math.min(pool ? 2.8 : 2.6, frame.depth * (pool ? .27 : .25)), frame.depth, frame.margin);
    entities.push(entity({
      kind: "water", shape: pool ? "rectangle" : "ellipse", name: pool ? "AI-Pool" : "AI-Teich",
      position: framedPosition(frame, -.5 + variant * .08, .05, waterWidth, waterDepth), width: waterWidth, depth: waterDepth,
      height: pool ? 1.4 : .35, rotation: frame.rotation, layerId: "layer-water", materialId: "mat-water", opacity: .78,
      metadata: { conceptVariant: variant + 1, zone: "Wasser", requestedByPrompt: true, objectType: pool ? "pool" : "pond" }
    }));
  }

  if (requested.pergola) {
    const pergolaWidth = fittedSize(Math.min(4, frame.width * .3), frame.width, frame.margin);
    const pergolaDepth = fittedSize(Math.min(3.2, frame.depth * .27), frame.depth, frame.margin);
    entities.push(entity({
      kind: "furniture", shape: "rectangle", name: /pavillon/i.test(brief.prompt) ? "AI-Pavillon" : "AI-Pergola",
      position: framedPosition(frame, .56, -.44 + variant * .08, pergolaWidth, pergolaDepth), width: pergolaWidth, depth: pergolaDepth,
      height: 2.5, rotation: frame.rotation, layerId: "layer-furniture", materialId: "mat-thermowood",
      metadata: { conceptVariant: variant + 1, zone: "Aufenthalt", requestedByPrompt: true, objectType: /pavillon/i.test(brief.prompt) ? "pavilion" : "pergola" }
    }));
  }

  if (requested.hedge || requested.screen) {
    const objectType = requested.hedge ? "hedge" : "screen";
    const lineInset = requested.hedge ? .28 : .12;
    const points = [framedPoint(frame, -.82, -.84, lineInset), framedPoint(frame, .82, -.84, lineInset)];
    entities.push(entity({
      kind: "wall", shape: "line", name: requested.hedge ? "AI-Schnitthecke" : "AI-Sichtschutz",
      points, position: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 },
      width: requested.hedge ? .55 : .18, depth: polylineLength(points), height: requested.hedge ? 1.5 : 1.8,
      rotation: frame.rotation, layerId: requested.hedge ? "layer-planting" : "layer-building",
      materialId: requested.hedge ? "mat-lawn" : "mat-thermowood", fillColor: requested.hedge ? "#2f6c3f" : undefined,
      strokeWidth: requested.hedge ? .55 : .18,
      metadata: { conceptVariant: variant + 1, zone: "Einfriedung", requestedByPrompt: true, objectType }
    }));
  }

  if (requested.treeCount > 0) {
    const treeWidth = clamp(minimumSpan * .13, .55, 2.4);
    for (let index = 0; index < requested.treeCount; index += 1) {
      const normalizedX = requested.treeCount === 1 ? 0 : -.72 + (1.44 * index) / (requested.treeCount - 1);
      entities.push(entity({
        kind: "plant", shape: "symbol", name: `AI-Baum ${index + 1}`,
        position: framedPosition(frame, normalizedX, -.66 + variant * .08, treeWidth, treeWidth), width: treeWidth, depth: treeWidth,
        height: 4.5, rotation: frame.rotation, layerId: "layer-planting", fillColor: "#6f9a67",
        metadata: { conceptVariant: variant + 1, zone: "Gehölze", requestedByPrompt: true, objectType: "tree" }
      }));
    }
  }

  return entities.filter(item => !project.layers.find(layer => layer.id === item.layerId)?.locked);
}

export function createGardenConcepts(project: ProjectState, brief: GardenDesignBrief): GardenConcept[] {
  const budgetFactor = brief.budget === "compact" ? 0.75 : brief.budget === "premium" ? 1.45 : 1;
  const names = ["Klare Gartenachse", "Weiche Gartenräume", "Lebendiger Rundweg"];
  return names.map((title, index) => {
    const entities = conceptEntities(project, brief, index);
    const area = entities.reduce((sum, item) => sum + Math.max(0, item.width * item.depth), 0);
    const score = Math.min(98, 82 + index * 3 + (brief.priority === "biodiversity" ? 4 : 0));
    return {
      id: `concept-${index + 1}`,
      title,
      description: `${brief.style === "modern" ? "Geradliniges" : "Räumlich gegliedertes"} Konzept mit Schwerpunkt ${brief.priority}.`,
      score,
      estimatedArea: Math.round(area),
      estimatedBudget: Math.round((area * 72 + entities.length * 95) * budgetFactor / 100) * 100,
      entities,
      highlights: [
        `${entities.filter(item => item.kind === "plant").length} Pflanzpositionen`,
        `${entities.filter(item => item.kind === "surface" || item.kind === "path").length} nutzbare Flächen`,
        `${entities.filter(item => item.metadata?.requestedByPrompt === true).length} Wünsche aus dem Beschreibungstext`,
        brief.priority === "biodiversity" ? "Bestäuberfreundlicher Schwerpunkt" : "Klare Funktionszonen"
      ]
    };
  });
}
