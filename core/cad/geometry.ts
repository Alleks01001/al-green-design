import type { CadEntity, Vec2 } from "../../types/domain";

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
  if ((entity.shape === "line" || entity.shape === "polyline" || entity.shape === "polygon") && entity.points.length > 0) {
    const sum = entity.points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
    return { x: sum.x / entity.points.length, y: sum.y / entity.points.length };
  }
  return entity.position;
}

export function entityBounds(entity: CadEntity) {
  if ((entity.shape === "line" || entity.shape === "polyline" || entity.shape === "polygon") && entity.points.length > 0) {
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
  if (radius !== undefined) {
    return {
      minX: entity.position.x - radius,
      maxX: entity.position.x + radius,
      minY: entity.position.y - radius,
      maxY: entity.position.y + radius
    };
  }

  const halfWidth = entity.width / 2;
  const halfDepth = entity.depth / 2;
  const angle = entity.rotation * Math.PI / 180;
  if (entity.shape === "ellipse") {
    const projectedHalfWidth = Math.sqrt((halfWidth * Math.cos(angle)) ** 2 + (halfDepth * Math.sin(angle)) ** 2);
    const projectedHalfDepth = Math.sqrt((halfWidth * Math.sin(angle)) ** 2 + (halfDepth * Math.cos(angle)) ** 2);
    return {
      minX: entity.position.x - projectedHalfWidth,
      maxX: entity.position.x + projectedHalfWidth,
      minY: entity.position.y - projectedHalfDepth,
      maxY: entity.position.y + projectedHalfDepth
    };
  }

  const corners = [
    { x: entity.position.x - halfWidth, y: entity.position.y - halfDepth },
    { x: entity.position.x + halfWidth, y: entity.position.y - halfDepth },
    { x: entity.position.x + halfWidth, y: entity.position.y + halfDepth },
    { x: entity.position.x - halfWidth, y: entity.position.y + halfDepth }
  ].map(point => rotatePoint(point, entity.position, entity.rotation));
  return {
    minX: Math.min(...corners.map(point => point.x)),
    maxX: Math.max(...corners.map(point => point.x)),
    minY: Math.min(...corners.map(point => point.y)),
    maxY: Math.max(...corners.map(point => point.y))
  };
}

export function boundsIntersect(
  a: { minX: number; maxX: number; minY: number; maxY: number },
  b: { minX: number; maxX: number; minY: number; maxY: number }
) {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

export function translateEntity(entity: CadEntity, delta: Vec2): CadEntity {
  if (entity.shape === "line" || entity.shape === "polyline" || entity.shape === "polygon") {
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
  if (entity.shape === "ellipse") return Math.PI * (entity.width / 2) * (entity.depth / 2);
  if (entity.shape === "polygon" && entity.points.length >= 3) {
    let twiceArea = 0;
    for (let index = 0; index < entity.points.length; index += 1) {
      const current = entity.points[index];
      const next = entity.points[(index + 1) % entity.points.length];
      twiceArea += current.x * next.y - next.x * current.y;
    }
    return Math.abs(twiceArea) / 2;
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

export function entitiesBounds(entities: CadEntity[]) {
  if (entities.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  const bounds = entities.map(entityBounds);
  return {
    minX: Math.min(...bounds.map(item => item.minX)),
    maxX: Math.max(...bounds.map(item => item.maxX)),
    minY: Math.min(...bounds.map(item => item.minY)),
    maxY: Math.max(...bounds.map(item => item.maxY))
  };
}

export function rotatePoint(point: Vec2, center: Vec2, angleDegrees: number): Vec2 {
  const angle = angleDegrees * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

export function transformEntityAround(
  entity: CadEntity,
  center: Vec2,
  options: { translate?: Vec2; scaleX?: number; scaleY?: number; rotationDegrees?: number }
): CadEntity {
  const translate = options.translate ?? { x: 0, y: 0 };
  const scaleX = Number.isFinite(options.scaleX) ? options.scaleX! : 1;
  const scaleY = Number.isFinite(options.scaleY) ? options.scaleY! : 1;
  const rotationDegrees = options.rotationDegrees ?? 0;

  const transformPoint = (point: Vec2) => {
    const scaled = {
      x: center.x + (point.x - center.x) * scaleX,
      y: center.y + (point.y - center.y) * scaleY
    };
    const rotated = rotatePoint(scaled, center, rotationDegrees);
    return { x: rotated.x + translate.x, y: rotated.y + translate.y };
  };

  const transformedPosition = transformPoint(entity.position);
  const transformedPoints = entity.points.map(transformPoint);
  const averageScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;

  return {
    ...entity,
    position: transformedPosition,
    points: transformedPoints,
    width: Math.max(0.001, entity.width * Math.abs(scaleX)),
    depth: Math.max(0.001, entity.depth * Math.abs(scaleY)),
    radius: entity.radius === undefined ? undefined : Math.max(0.001, entity.radius * averageScale),
    rotation: entity.rotation + rotationDegrees
  };
}
