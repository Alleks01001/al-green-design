import { makeId } from "@/core/cad/geometry";
import type { CadEntity, ProjectState } from "@/types/domain";

export type GardenAIResult = {
  message: string;
  entities: CadEntity[];
};

function parseDimensions(text: string, fallbackWidth: number, fallbackDepth: number) {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m)?\s*[x×]\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return { width: fallbackWidth, depth: fallbackDepth };
  return {
    width: Number(match[1].replace(",", ".")),
    depth: Number(match[2].replace(",", "."))
  };
}

function parseCount(text: string, fallback = 1) {
  const number = Number(text.match(/(\d+)/)?.[1] ?? fallback);
  return Math.max(1, Math.min(50, number));
}

export function interpretGardenCommand(command: string, project: ProjectState): GardenAIResult {
  const text = command.toLowerCase();
  const entities = [...project.entities];

  if (text.includes("rasen") || text.includes("terrasse") || text.includes("fläche")) {
    const { width, depth } = parseDimensions(text, 6, 4);
    const isTerrace = text.includes("terrasse") || text.includes("naturstein") || text.includes("pflaster");
    entities.push({
      id: makeId("surface"),
      kind: "surface",
      shape: "rectangle",
      name: isTerrace ? "Terrasse" : text.includes("rasen") ? "Rasenfläche" : "Neue Fläche",
      points: [],
      position: { x: 1.5, y: 1.5 },
      width,
      depth,
      height: isTerrace ? 0.18 : 0.08,
      rotation: 0,
      layerId: isTerrace ? "layer-paths" : "layer-site",
      materialId: isTerrace ? "mat-natural-stone" : "mat-lawn",
      visible: true,
      locked: false,
      metadata: { generatedBy: "Garden AI 2.1" }
    });
    return { message: `${isTerrace ? "Terrasse" : "Fläche"} ${width} × ${depth} m wurde als echtes CAD-Objekt erzeugt.`, entities };
  }

  if (text.includes("baum") || text.includes("bäume") || text.includes("hortensie") || text.includes("pflanze")) {
    const count = parseCount(text);
    const isHydrangea = text.includes("hortensie");
    for (let index = 0; index < count; index += 1) {
      const columns = Math.ceil(Math.sqrt(count));
      entities.push({
        id: makeId("plant"),
        kind: "plant",
        shape: "symbol",
        name: isHydrangea ? `Hortensie ${index + 1}` : `Baum ${index + 1}`,
        points: [],
        position: { x: -4 + (index % columns) * 2, y: -4 + Math.floor(index / columns) * 2 },
        width: isHydrangea ? 1.5 : 2.2,
        depth: isHydrangea ? 1.5 : 2.2,
        height: isHydrangea ? 1.5 : 4,
        rotation: 0,
        layerId: "layer-planting",
        visible: true,
        locked: false,
        metadata: { generatedBy: "Garden AI 2.1", spacing: isHydrangea ? 1.2 : 2.5 }
      });
    }
    return { message: `${count} Pflanzenobjekt${count === 1 ? "" : "e"} wurden parametrisch platziert.`, entities };
  }

  if (text.includes("mauer") || text.includes("wand")) {
    const length = Number(text.match(/(\d+(?:[.,]\d+)?)\s*m/)?.[1]?.replace(",", ".") ?? 6);
    entities.push({
      id: makeId("wall"),
      kind: "wall",
      shape: "line",
      name: text.includes("wand") ? "Außenwand" : "Gartenmauer",
      points: [{ x: -length / 2, y: 0 }, { x: length / 2, y: 0 }],
      position: { x: 0, y: 0 },
      width: 0.25,
      depth: length,
      height: 1.2,
      rotation: 0,
      layerId: "layer-building",
      materialId: "mat-concrete",
      visible: true,
      locked: false,
      metadata: { generatedBy: "Garden AI 2.1" }
    });
    return { message: `Mauer mit ${length} m Länge wurde erzeugt.`, entities };
  }

  if (text.includes("weg")) {
    const length = Number(text.match(/(\d+(?:[.,]\d+)?)\s*m/)?.[1]?.replace(",", ".") ?? 8);
    entities.push({
      id: makeId("path"),
      kind: "path",
      shape: "polyline",
      name: "Gartenweg",
      points: [{ x: -length / 2, y: 3 }, { x: 0, y: 1.5 }, { x: length / 2, y: 3 }],
      position: { x: 0, y: 2.5 },
      width: 1.2,
      depth: length,
      height: 0.08,
      rotation: 0,
      layerId: "layer-paths",
      materialId: "mat-natural-stone",
      visible: true,
      locked: false,
      metadata: { generatedBy: "Garden AI 2.1" }
    });
    return { message: `Gartenweg mit rund ${length} m Verlauf wurde erzeugt.`, entities };
  }

  return {
    message: "Der Befehl wurde verstanden, aber noch keinem sicheren CAD-Werkzeug zugeordnet. Beispiele: „Terrasse 5 x 3 m“, „8 Hortensien“, „Mauer 7 m“.",
    entities
  };
}
