import { makeId } from "@/core/cad/geometry";
import type { CadEntity, ProjectState } from "@/types/domain";

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
  const offset = variant * 0.8;
  const entities: CadEntity[] = [];

  entities.push(entity({
    kind: "surface", shape: "rectangle", name: variant === 0 ? "AI-Lounge-Terrasse" : variant === 1 ? "AI-Essplatz" : "AI-Gartenzimmer",
    position: { x: 3.2 - offset, y: 2.6 + offset * 0.35 }, width: 4.8 + variant * 0.4, depth: 3.0 + (variant % 2) * 0.8,
    height: 0.16, layerId: "layer-paths", materialId: palette.terrace,
    metadata: { conceptVariant: variant + 1, zone: "Aufenthalt" }
  }));

  const pathPoints = variant === 1
    ? [{ x: -5.5, y: 3.8 }, { x: -1.2, y: 2.1 }, { x: 3.2, y: 2.6 }]
    : variant === 2
      ? [{ x: -5.5, y: 3.8 }, { x: -2.5, y: 0.5 }, { x: 0.8, y: 2.4 }, { x: 3.2, y: 2.6 }]
      : [{ x: -5.5, y: 3.8 }, { x: -0.8, y: 3.2 }, { x: 3.2, y: 2.6 }];
  entities.push(entity({
    kind: "path", shape: "polyline", name: "AI-Hauptweg", points: pathPoints,
    position: { x: -1.2, y: 2.8 }, width: brief.style === "natural" ? 1.1 : 1.25, depth: 9,
    height: 0.07, layerId: "layer-paths", materialId: palette.path,
    metadata: { conceptVariant: variant + 1, zone: "Erschließung" }
  }));

  const plantCount = brief.priority === "biodiversity" ? 9 : brief.style === "low-maintenance" ? 5 : 7;
  const plantName = brief.sunny ? "Sonnenstaude" : "Schattenstaude";
  for (let index = 0; index < plantCount; index += 1) {
    const angle = (index / plantCount) * Math.PI * 2 + variant * 0.35;
    const radius = 3.1 + (index % 2) * 0.7;
    entities.push(entity({
      kind: "plant", shape: "symbol", name: `${plantName} ${index + 1}`,
      position: { x: Math.cos(angle) * radius - 0.5, y: Math.sin(angle) * radius - 0.4 },
      width: 1.2, depth: 1.2, height: brief.style === "natural" ? 1.4 : 1.0,
      layerId: "layer-planting",
      metadata: { conceptVariant: variant + 1, zone: palette.planting, pollinatorFriendly: brief.priority === "biodiversity" }
    }));
  }

  if (brief.priority === "relaxation" || brief.priority === "entertaining") {
    entities.push(entity({
      kind: "furniture", shape: "rectangle", name: brief.priority === "relaxation" ? "Ruhebank" : "Outdoor-Tisch",
      position: { x: 3.0 - offset, y: 2.6 + offset * 0.35 }, width: 1.8, depth: 0.75, height: 0.75,
      layerId: "layer-paths", materialId: "mat-wood",
      metadata: { conceptVariant: variant + 1, zone: "Ausstattung" }
    }));
  }

  if (brief.priority === "play") {
    entities.push(entity({
      kind: "surface", shape: "circle", name: "Spielzone", position: { x: -2.7, y: -2.2 },
      width: 3.2, depth: 3.2, radius: 1.6, height: 0.08, layerId: "layer-site", materialId: "mat-lawn",
      metadata: { conceptVariant: variant + 1, zone: "Spiel" }
    }));
  }

  if (brief.priority === "biodiversity") {
    entities.push(entity({
      kind: "water", shape: "circle", name: "Kleines Biotop", position: { x: -3.6 + variant * 0.4, y: -2.6 },
      width: 2.2, depth: 2.2, radius: 1.1, height: 0.35, layerId: "layer-water", materialId: "mat-water",
      metadata: { conceptVariant: variant + 1, zone: "Ökologie" }
    }));
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
        brief.priority === "biodiversity" ? "Bestäuberfreundlicher Schwerpunkt" : "Klare Funktionszonen"
      ]
    };
  });
}
