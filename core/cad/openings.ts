import { distance, makeId } from "@/core/cad/geometry";
import type { CadEntity, Id, Vec2 } from "@/types/domain";

export type HostedOpeningTemplate = {
  id: Id;
  name: string;
  objectType: string;
  width: number;
  depth: number;
  height: number;
  materialId?: Id;
  classification: string;
  sillHeight?: number;
  color?: string;
};

export function isArchitectureOpening(entity: CadEntity) {
  return entity.kind === "opening" || entity.metadata?.architectureOpening === true;
}

export function isHostedOpening(entity: CadEntity) {
  return isArchitectureOpening(entity) && typeof entity.metadata?.hostWallId === "string";
}

export function wallSegment(wall: CadEntity, segmentIndex: number) {
  if ((wall.shape !== "line" && wall.shape !== "polyline") || wall.points.length < 2) return null;
  const safeIndex = Math.min(wall.points.length - 2, Math.max(0, Math.round(segmentIndex)));
  const start = wall.points[safeIndex];
  const end = wall.points[safeIndex + 1];
  const length = distance(start, end);
  if (length < .001) return null;
  return { start, end, length, index: safeIndex };
}

export function longestWallSegmentIndex(wall: CadEntity) {
  let bestIndex = 0;
  let bestLength = 0;
  for (let index = 0; index < wall.points.length - 1; index += 1) {
    const length = distance(wall.points[index], wall.points[index + 1]);
    if (length > bestLength) {
      bestIndex = index;
      bestLength = length;
    }
  }
  return bestIndex;
}

function clampRatio(ratio: number, openingWidth: number, segmentLength: number) {
  const edge = Math.min(.45, Math.max(.02, openingWidth / Math.max(.01, segmentLength) / 2 + .01));
  return Math.min(1 - edge, Math.max(edge, Number.isFinite(ratio) ? ratio : .5));
}

function pointAtRatio(start: Vec2, end: Vec2, ratio: number): Vec2 {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio
  };
}

export function createHostedOpeningEntity(template: HostedOpeningTemplate, wall: CadEntity, requestedRatio = .5): CadEntity | null {
  const segmentIndex = longestWallSegmentIndex(wall);
  const segment = wallSegment(wall, segmentIndex);
  if (!segment || segment.length < template.width + .1) return null;
  const ratio = clampRatio(requestedRatio, template.width, segment.length);
  const position = pointAtRatio(segment.start, segment.end, ratio);
  const sillHeight = Math.max(0, template.sillHeight ?? 0);
  const wallThickness = Math.max(.06, wall.strokeWidth ?? wall.width);
  const angle = Math.atan2(segment.end.y - segment.start.y, segment.end.x - segment.start.x) * 180 / Math.PI;
  return {
    id: makeId(template.objectType),
    kind: "opening",
    shape: "rectangle",
    name: template.name,
    points: [],
    position,
    width: Math.min(template.width, segment.length - .1),
    depth: wallThickness + .04,
    height: template.height,
    rotation: angle,
    layerId: wall.layerId,
    elevationOffset: (wall.elevationOffset ?? 0) + sillHeight,
    materialId: template.materialId,
    fillColor: template.color,
    strokeColor: "#51212d",
    strokeWidth: .035,
    linePattern: "solid",
    objectDefinitionId: template.id,
    visible: true,
    locked: false,
    metadata: {
      architectureOpening: true,
      objectType: template.objectType,
      classification: template.classification,
      databaseCategory: "Öffnungen",
      hostWallId: wall.id,
      hostSegmentIndex: segment.index,
      hostOffsetRatio: ratio,
      sillHeight,
      hingeSide: "left",
      openAngle: template.objectType === "door" ? 90 : 0,
      databaseVersion: "3.1-alpha.4"
    }
  };
}

export function syncHostedOpenings(entities: CadEntity[]) {
  const byId = new Map(entities.map(entity => [entity.id, entity]));
  return entities.map(entity => {
    if (!isHostedOpening(entity)) return entity;
    const hostWallId = entity.metadata?.hostWallId;
    const wall = typeof hostWallId === "string" ? byId.get(hostWallId) : undefined;
    if (!wall) return entity;
    const segment = wallSegment(wall, Number(entity.metadata?.hostSegmentIndex ?? 0));
    if (!segment) return entity;
    const ratio = clampRatio(Number(entity.metadata?.hostOffsetRatio ?? .5), entity.width, segment.length);
    const sillHeight = Math.max(0, Number(entity.metadata?.sillHeight ?? 0));
    const position = pointAtRatio(segment.start, segment.end, ratio);
    const rotation = Math.atan2(segment.end.y - segment.start.y, segment.end.x - segment.start.x) * 180 / Math.PI;
    return {
      ...entity,
      position,
      rotation,
      depth: Math.max(.06, wall.strokeWidth ?? wall.width) + .04,
      layerId: wall.layerId,
      elevationOffset: (wall.elevationOffset ?? 0) + sillHeight,
      metadata: { ...(entity.metadata ?? {}), hostSegmentIndex: segment.index, hostOffsetRatio: ratio, sillHeight }
    };
  });
}

export function moveHostedOpening(entity: CadEntity, delta: Vec2, entities: CadEntity[]) {
  if (!isHostedOpening(entity)) return entity;
  const hostWallId = entity.metadata?.hostWallId;
  const wall = typeof hostWallId === "string" ? entities.find(item => item.id === hostWallId) : undefined;
  if (!wall) return entity;
  const segment = wallSegment(wall, Number(entity.metadata?.hostSegmentIndex ?? 0));
  if (!segment) return entity;
  const target = { x: entity.position.x + delta.x, y: entity.position.y + delta.y };
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const rawRatio = ((target.x - segment.start.x) * dx + (target.y - segment.start.y) * dy) / Math.max(.0001, dx * dx + dy * dy);
  const ratio = clampRatio(rawRatio, entity.width, segment.length);
  return {
    ...entity,
    metadata: { ...(entity.metadata ?? {}), hostOffsetRatio: ratio }
  };
}

export function hostedOpeningsForSegment(entities: CadEntity[], wallId: string, segmentIndex: number) {
  return entities.filter(entity =>
    isHostedOpening(entity)
    && entity.metadata?.hostWallId === wallId
    && Number(entity.metadata?.hostSegmentIndex ?? 0) === segmentIndex
    && entity.visible
  );
}
