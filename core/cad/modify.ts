import { distance, entityCenter, polylineLength, rotatePoint } from "./geometry";
import type { CadEntity, Vec2 } from "../../types/domain";

export type MirrorAxis = "horizontal" | "vertical";
export type LineEditMode = "trim" | "extend";

type ParametricIntersection = { point: Vec2; targetT: number; boundaryT: number };

function cross(a: Vec2, b: Vec2) {
  return a.x * b.y - a.y * b.x;
}

export function infiniteLineIntersection(targetStart: Vec2, targetEnd: Vec2, boundaryStart: Vec2, boundaryEnd: Vec2): ParametricIntersection | null {
  const target = { x: targetEnd.x - targetStart.x, y: targetEnd.y - targetStart.y };
  const boundary = { x: boundaryEnd.x - boundaryStart.x, y: boundaryEnd.y - boundaryStart.y };
  const denominator = cross(target, boundary);
  if (Math.abs(denominator) < 1e-9) return null;
  const delta = { x: boundaryStart.x - targetStart.x, y: boundaryStart.y - targetStart.y };
  const targetT = cross(delta, boundary) / denominator;
  const boundaryT = cross(delta, target) / denominator;
  return {
    point: { x: targetStart.x + target.x * targetT, y: targetStart.y + target.y * targetT },
    targetT,
    boundaryT
  };
}

export function trimOrExtendLine(target: CadEntity, boundary: CadEntity, mode: LineEditMode): CadEntity | null {
  if (target.shape !== "line" || boundary.shape !== "line" || target.points.length !== 2 || boundary.points.length !== 2) return null;
  const intersection = infiniteLineIntersection(target.points[0], target.points[1], boundary.points[0], boundary.points[1]);
  if (!intersection || intersection.boundaryT < -1e-9 || intersection.boundaryT > 1 + 1e-9) return null;

  const epsilon = 1e-7;
  const points = [...target.points];
  if (mode === "trim") {
    if (intersection.targetT <= epsilon || intersection.targetT >= 1 - epsilon) return null;
    const startDistance = distance(points[0], intersection.point);
    const endDistance = distance(points[1], intersection.point);
    points[startDistance <= endDistance ? 0 : 1] = intersection.point;
  } else {
    if (intersection.targetT < -epsilon) points[0] = intersection.point;
    else if (intersection.targetT > 1 + epsilon) points[1] = intersection.point;
    else return null;
  }

  return {
    ...target,
    points,
    position: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 },
    depth: distance(points[0], points[1])
  };
}

function unitNormal(start: Vec2, end: Vec2, offset: number): Vec2 | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-9) return null;
  return { x: -dy / length * offset, y: dx / length * offset };
}

function offsetSegment(start: Vec2, end: Vec2, offset: number) {
  const normal = unitNormal(start, end, offset);
  if (!normal) return null;
  return {
    start: { x: start.x + normal.x, y: start.y + normal.y },
    end: { x: end.x + normal.x, y: end.y + normal.y }
  };
}

function signedPolygonArea(points: Vec2[]) {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

export function offsetPolyline(points: Vec2[], offset: number, closed = false): Vec2[] | null {
  if (points.length < 2 || Math.abs(offset) < 1e-9) return null;
  const effectiveOffset = closed && points.length >= 3 && signedPolygonArea(points) > 0 ? -offset : offset;
  const segmentCount = closed ? points.length : points.length - 1;
  const segments = Array.from({ length: segmentCount }, (_, index) => offsetSegment(points[index], points[(index + 1) % points.length], effectiveOffset));
  if (segments.some(segment => !segment)) return null;
  const validSegments = segments as Array<{ start: Vec2; end: Vec2 }>;

  return points.map((point, index) => {
    if (!closed && index === 0) return validSegments[0].start;
    if (!closed && index === points.length - 1) return validSegments.at(-1)!.end;
    const previous = validSegments[(index - 1 + validSegments.length) % validSegments.length];
    const next = validSegments[index % validSegments.length];
    const intersection = infiniteLineIntersection(previous.start, previous.end, next.start, next.end);
    if (!intersection) return { x: (previous.end.x + next.start.x) / 2, y: (previous.end.y + next.start.y) / 2 };
    const miterLength = distance(point, intersection.point);
    if (miterLength > Math.max(Math.abs(offset) * 12, 0.5)) {
      return { x: (previous.end.x + next.start.x) / 2, y: (previous.end.y + next.start.y) / 2 };
    }
    return intersection.point;
  });
}

export function offsetEntity(entity: CadEntity, offset: number): CadEntity | null {
  if (!Number.isFinite(offset) || Math.abs(offset) < 1e-9) return null;
  if (entity.shape === "line" || entity.shape === "polyline" || entity.shape === "polygon") {
    const points = offsetPolyline(entity.points, offset, entity.shape === "polygon");
    if (!points) return null;
    const center = entityCenter({ ...entity, points });
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    return {
      ...entity,
      points,
      position: center,
      width: entity.shape === "polygon" ? Math.max(0.001, Math.max(...xs) - Math.min(...xs)) : entity.width,
      depth: entity.shape === "polygon" ? Math.max(0.001, Math.max(...ys) - Math.min(...ys)) : polylineLength(points)
    };
  }
  const width = entity.width + offset * 2;
  const depth = entity.depth + offset * 2;
  if (width <= 0.001 || depth <= 0.001) return null;
  return {
    ...entity,
    width,
    depth,
    radius: entity.radius === undefined ? undefined : Math.max(0.001, entity.radius + offset)
  };
}

export function mirrorEntity(entity: CadEntity, axis: MirrorAxis, origin: Vec2): CadEntity {
  const mirrorPoint = (point: Vec2): Vec2 => axis === "vertical"
    ? { x: origin.x * 2 - point.x, y: point.y }
    : { x: point.x, y: origin.y * 2 - point.y };
  const rotation = axis === "vertical" ? 180 - entity.rotation : -entity.rotation;
  const normalizedRotation = ((rotation % 360) + 540) % 360 - 180;
  return {
    ...entity,
    position: mirrorPoint(entity.position),
    points: entity.points.map(mirrorPoint),
    rotation: normalizedRotation
  };
}

export function polarTransformEntity(entity: CadEntity, center: Vec2, angleDegrees: number, rotateItems: boolean): CadEntity {
  if (rotateItems) {
    const position = rotatePoint(entity.position, center, angleDegrees);
    return {
      ...entity,
      position,
      points: entity.points.map(point => rotatePoint(point, center, angleDegrees)),
      rotation: entity.rotation + angleDegrees
    };
  }
  const currentCenter = entityCenter(entity);
  const nextCenter = rotatePoint(currentCenter, center, angleDegrees);
  const delta = { x: nextCenter.x - currentCenter.x, y: nextCenter.y - currentCenter.y };
  return {
    ...entity,
    position: { x: entity.position.x + delta.x, y: entity.position.y + delta.y },
    points: entity.points.map(point => ({ x: point.x + delta.x, y: point.y + delta.y }))
  };
}
