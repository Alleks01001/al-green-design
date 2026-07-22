import { distance, midpoint } from "@/core/cad/geometry";
import type { CadEntity, SnapMode, Vec2 } from "@/types/domain";

export type SnapResult = {
  point: Vec2;
  mode: SnapMode | null;
  sourceEntityId?: string;
};

export type SnapOptions = {
  enabled: boolean;
  modes: SnapMode[];
  gridSize: number;
  tolerance: number;
  entities: CadEntity[];
  excludeIds?: string[];
};

function candidatePoints(entity: CadEntity, modes: SnapMode[]) {
  const result: Array<{ point: Vec2; mode: SnapMode }> = [];
  const include = (mode: SnapMode) => modes.includes(mode);

  if (entity.shape === "line" || entity.shape === "polyline") {
    if (include("endpoint")) {
      for (const point of entity.points) result.push({ point, mode: "endpoint" });
    }
    if (include("midpoint")) {
      for (let index = 1; index < entity.points.length; index += 1) {
        result.push({ point: midpoint(entity.points[index - 1], entity.points[index]), mode: "midpoint" });
      }
    }
    if (include("center") && entity.points.length > 0) {
      const center = entity.points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
      result.push({ point: { x: center.x / entity.points.length, y: center.y / entity.points.length }, mode: "center" });
    }
  } else {
    if (include("center")) result.push({ point: entity.position, mode: "center" });
    if (include("endpoint") && entity.shape === "rectangle") {
      const halfWidth = entity.width / 2;
      const halfDepth = entity.depth / 2;
      result.push(
        { point: { x: entity.position.x - halfWidth, y: entity.position.y - halfDepth }, mode: "endpoint" },
        { point: { x: entity.position.x + halfWidth, y: entity.position.y - halfDepth }, mode: "endpoint" },
        { point: { x: entity.position.x + halfWidth, y: entity.position.y + halfDepth }, mode: "endpoint" },
        { point: { x: entity.position.x - halfWidth, y: entity.position.y + halfDepth }, mode: "endpoint" }
      );
    }
    if (include("midpoint") && entity.shape === "rectangle") {
      const halfWidth = entity.width / 2;
      const halfDepth = entity.depth / 2;
      result.push(
        { point: { x: entity.position.x, y: entity.position.y - halfDepth }, mode: "midpoint" },
        { point: { x: entity.position.x + halfWidth, y: entity.position.y }, mode: "midpoint" },
        { point: { x: entity.position.x, y: entity.position.y + halfDepth }, mode: "midpoint" },
        { point: { x: entity.position.x - halfWidth, y: entity.position.y }, mode: "midpoint" }
      );
    }
  }
  return result;
}

export function snapPoint(raw: Vec2, options: SnapOptions): SnapResult {
  if (!options.enabled) return { point: raw, mode: null };

  let best: SnapResult | null = null;
  let bestDistance = options.tolerance;
  const excluded = new Set(options.excludeIds ?? []);

  for (const entity of options.entities) {
    if (!entity.visible || entity.locked || excluded.has(entity.id)) continue;
    for (const candidate of candidatePoints(entity, options.modes)) {
      const currentDistance = distance(raw, candidate.point);
      if (currentDistance <= bestDistance) {
        bestDistance = currentDistance;
        best = { point: candidate.point, mode: candidate.mode, sourceEntityId: entity.id };
      }
    }
  }

  if (best) return best;

  if (options.modes.includes("grid") && options.gridSize > 0) {
    return {
      point: {
        x: Math.round(raw.x / options.gridSize) * options.gridSize,
        y: Math.round(raw.y / options.gridSize) * options.gridSize
      },
      mode: "grid"
    };
  }

  return { point: raw, mode: null };
}
