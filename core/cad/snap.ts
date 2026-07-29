import { distance, midpoint, rotatePoint } from "@/core/cad/geometry";
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

  if (entity.shape === "line" || entity.shape === "polyline" || entity.shape === "polygon") {
    if (include("endpoint")) {
      for (const point of entity.points) result.push({ point, mode: "endpoint" });
    }
    if (include("midpoint")) {
      for (let index = 1; index < entity.points.length; index += 1) {
        result.push({ point: midpoint(entity.points[index - 1], entity.points[index]), mode: "midpoint" });
      }
      if (entity.shape === "polygon" && entity.points.length > 2) {
        result.push({ point: midpoint(entity.points.at(-1)!, entity.points[0]), mode: "midpoint" });
      }
    }
    if (include("center") && entity.points.length > 0) {
      const center = entity.points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
      result.push({ point: { x: center.x / entity.points.length, y: center.y / entity.points.length }, mode: "center" });
    }
  } else {
    if (include("center")) result.push({ point: entity.position, mode: "center" });
    const halfWidth = entity.shape === "circle" ? (entity.radius ?? entity.width / 2) : entity.width / 2;
    const halfDepth = entity.shape === "circle" ? (entity.radius ?? entity.depth / 2) : entity.depth / 2;
    const rotateCandidate = (point: Vec2) => entity.shape === "circle" ? point : rotatePoint(point, entity.position, entity.rotation);
    if (include("endpoint") && entity.shape === "rectangle") {
      const corners = [
        { x: entity.position.x - halfWidth, y: entity.position.y - halfDepth },
        { x: entity.position.x + halfWidth, y: entity.position.y - halfDepth },
        { x: entity.position.x + halfWidth, y: entity.position.y + halfDepth },
        { x: entity.position.x - halfWidth, y: entity.position.y + halfDepth }
      ].map(rotateCandidate);
      result.push(...corners.map(point => ({ point, mode: "endpoint" as SnapMode })));
    }
    if (include("midpoint") && ["rectangle", "circle", "ellipse"].includes(entity.shape)) {
      const quadrants = [
        { x: entity.position.x, y: entity.position.y - halfDepth },
        { x: entity.position.x + halfWidth, y: entity.position.y },
        { x: entity.position.x, y: entity.position.y + halfDepth },
        { x: entity.position.x - halfWidth, y: entity.position.y }
      ].map(rotateCandidate);
      result.push(...quadrants.map(point => ({ point, mode: "midpoint" as SnapMode })));
    }
  }
  return result;
}


function entitySegments(entity: CadEntity): Array<{ start: Vec2; end: Vec2 }> {
  if ((entity.shape === "line" || entity.shape === "polyline" || entity.shape === "polygon") && entity.points.length >= 2) {
    const segments = entity.points.slice(1).map((point, index) => ({ start: entity.points[index], end: point }));
    if (entity.shape === "polygon" && entity.points.length >= 3) {
      segments.push({ start: entity.points.at(-1)!, end: entity.points[0] });
    }
    return segments;
  }
  if (entity.shape === "rectangle") {
    const halfWidth = entity.width / 2;
    const halfDepth = entity.depth / 2;
    const corners = [
      { x: entity.position.x - halfWidth, y: entity.position.y - halfDepth },
      { x: entity.position.x + halfWidth, y: entity.position.y - halfDepth },
      { x: entity.position.x + halfWidth, y: entity.position.y + halfDepth },
      { x: entity.position.x - halfWidth, y: entity.position.y + halfDepth }
    ].map(point => rotatePoint(point, entity.position, entity.rotation));
    return corners.map((start, index) => ({ start, end: corners[(index + 1) % corners.length] }));
  }
  return [];
}

function segmentIntersection(a: { start: Vec2; end: Vec2 }, b: { start: Vec2; end: Vec2 }): Vec2 | null {
  const x1 = a.start.x;
  const y1 = a.start.y;
  const x2 = a.end.x;
  const y2 = a.end.y;
  const x3 = b.start.x;
  const y3 = b.start.y;
  const x4 = b.end.x;
  const y4 = b.end.y;
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denominator) < 1e-9) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null;
  return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
}

export function snapPoint(raw: Vec2, options: SnapOptions): SnapResult {
  if (!options.enabled) return { point: raw, mode: null };

  let best: SnapResult | null = null;
  let bestDistance = options.tolerance;
  const excluded = new Set(options.excludeIds ?? []);

  const eligible = options.entities.filter(entity => entity.visible && !entity.locked && !excluded.has(entity.id));
  for (const entity of eligible) {
    for (const candidate of candidatePoints(entity, options.modes)) {
      const currentDistance = distance(raw, candidate.point);
      if (currentDistance <= bestDistance) {
        bestDistance = currentDistance;
        best = { point: candidate.point, mode: candidate.mode, sourceEntityId: entity.id };
      }
    }
  }

  if (options.modes.includes("intersection")) {
    const segmentSets = eligible.map(entity => ({ entity, segments: entitySegments(entity) })).filter(item => item.segments.length > 0);
    for (let firstIndex = 0; firstIndex < segmentSets.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < segmentSets.length; secondIndex += 1) {
        for (const firstSegment of segmentSets[firstIndex].segments) {
          for (const secondSegment of segmentSets[secondIndex].segments) {
            const point = segmentIntersection(firstSegment, secondSegment);
            if (!point) continue;
            const currentDistance = distance(raw, point);
            if (currentDistance <= bestDistance) {
              bestDistance = currentDistance;
              best = { point, mode: "intersection", sourceEntityId: segmentSets[firstIndex].entity.id };
            }
          }
        }
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
