import type { CadEntity, Vec2 } from "@/types/domain";

export const EPSILON = 0.0001;

export function distance(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function roundMetric(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function entityCenter(entity: CadEntity): Vec2 {
  if ((entity.shape === "line" || entity.shape === "polyline") && entity.points.length > 0) {
    const sum = entity.points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
    return { x: sum.x / entity.points.length, y: sum.y / entity.points.length };
  }
  return entity.position;
}

export function entityBounds(entity: CadEntity) {
  if ((entity.shape === "line" || entity.shape === "polyline") && entity.points.length > 0) {
    const xs = entity.points.map(point => point.x);
    const ys = entity.points.map(point => point.y);
    const half = entity.kind === "wall" ? entity.width / 2 : 0.08;
    return {
      minX: Math.min(...xs) - half,
      maxX: Math.max(...xs) + half,
      minY: Math.min(...ys) - half,
      maxY: Math.max(...ys) + half
    };
  }

  const radius = entity.shape === "circle" ? (entity.radius ?? entity.width / 2) : undefined;
  const halfWidth = radius ?? entity.width / 2;
  const halfDepth = radius ?? entity.depth / 2;
  return {
    minX: entity.position.x - halfWidth,
    maxX: entity.position.x + halfWidth,
    minY: entity.position.y - halfDepth,
    maxY: entity.position.y + halfDepth
  };
}

export function boundsIntersect(
  a: { minX: number; maxX: number; minY: number; maxY: number },
  b: { minX: number; maxX: number; minY: number; maxY: number }
) {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

export function translateEntity(entity: CadEntity, delta: Vec2): CadEntity {
  if (entity.shape === "line" || entity.shape === "polyline") {
    return {
      ...entity,
      position: { x: entity.position.x + delta.x, y: entity.position.y + delta.y },
      points: entity.points.map(point => ({ x: point.x + delta.x, y: point.y + delta.y }))
    };
  }
  return {
    ...entity,
    position: { x: entity.position.x + delta.x, y: entity.position.y + delta.y }
  };
}

export function polylineLength(points: Vec2[]) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += distance(points[index - 1], points[index]);
  }
  return length;
}

export function entityArea(entity: CadEntity) {
  if (entity.shape === "circle") {
    const radius = entity.radius ?? entity.width / 2;
    return Math.PI * radius * radius;
  }
  if (entity.shape === "rectangle") return entity.width * entity.depth;
  if (entity.kind === "wall" && entity.points.length >= 2) return polylineLength(entity.points) * entity.width;
  return 0;
}

export function entityVolume(entity: CadEntity) {
  return entityArea(entity) * entity.height;
}

export function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
