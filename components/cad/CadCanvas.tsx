"use client";

import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { boundsIntersect, distance, entityBounds, entityCenter, makeId, polylineLength, roundMetric, translateEntity } from "@/core/cad/geometry";
import { formatDimensionValue, resolveDimensionGeometry } from "@/core/cad/dimensions";
import { snapPoint, type SnapResult } from "@/core/cad/snap";
import { MATERIAL_CATALOG } from "@/data/materials/catalog";
import { useProjectStore } from "@/stores/projectStore";
import type { CadEntity, DimensionMode, DimensionUnit, Vec2 } from "@/types/domain";

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 700;
const BASE_SCALE = 42;

const TOOL_HELP: Record<string, string> = {
  select: "Objekte anklicken oder Auswahlfenster ziehen",
  pan: "Zeichenfläche ziehen · Mausrad zum Zoomen",
  move: "Objekt oder Auswahl ziehen",
  line: "Startpunkt und Endpunkt setzen",
  polyline: "Punkte setzen · mit Enter oder Fertig abschließen",
  freehand: "Gedrückt halten und frei zeichnen",
  rectangle: "Zwei gegenüberliegende Ecken setzen",
  rounded: "Zwei Ecken der abgerundeten Fläche setzen",
  circle: "Mittelpunkt und Radius setzen",
  ellipse: "Zwei gegenüberliegende Ecken der Ellipse setzen",
  polygon: "Eckpunkte setzen · mit Enter abschließen",
  triangle: "Mittelpunkt und Größe des Dreiecks setzen",
  pentagon: "Mittelpunkt und Größe des Fünfecks setzen",
  hexagon: "Mittelpunkt und Größe des Sechsecks setzen",
  star: "Mittelpunkt und Größe des Sterns setzen",
  wall: "Startpunkt und Endpunkt der Mauer setzen",
  fence: "Startpunkt und Endpunkt des Zauns setzen",
  hedge: "Startpunkt und Endpunkt der Hecke setzen",
  path: "Startpunkt und Endpunkt des Weges setzen",
  terrace: "Zwei Ecken der Terrasse setzen",
  bed: "Zwei Ecken des Beets setzen",
  water: "Zwei Ecken der Wasserfläche setzen",
  pool: "Zwei Ecken des Pools setzen",
  stairs: "Zwei Ecken des Treppenlaufs setzen",
  plant: "Pflanze mit einem Klick platzieren",
  dimension: "Zwei Messpunkte setzen"
};

type DragState =
  | { type: "pan"; startSvg: Vec2; currentSvg: Vec2; originPan: Vec2 }
  | { type: "move"; startWorld: Vec2; currentWorld: Vec2; ids: string[] }
  | { type: "marquee"; startWorld: Vec2; currentWorld: Vec2 }
  | { type: "freehand"; points: Vec2[] }
  | null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dashArray(pattern: CadEntity["linePattern"], zoom: number) {
  if (pattern === "dashed") return `${9 / zoom} ${6 / zoom}`;
  if (pattern === "dotted") return `${2 / zoom} ${5 / zoom}`;
  return undefined;
}

function colorForEntity(entity: CadEntity) {
  const material = MATERIAL_CATALOG.find(item => item.id === entity.materialId);
  if (material) return material.color;
  if (entity.kind === "building") return "#c9beb5";
  if (entity.kind === "plant") return "#4e8757";
  if (entity.fillColor) return entity.fillColor;
  if (entity.kind === "wall") return "#786e68";
  if (entity.kind === "water") return "#5ca5c6";
  if (entity.name.toLowerCase().includes("terrasse")) return "#b08c67";
  if (entity.kind === "path") return "#bca986";
  return "#8db28b";
}

function regularPolygonPoints(center: Vec2, radius: number, sides: number) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / sides;
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
  });
}

function starPolygonPoints(center: Vec2, radius: number) {
  return Array.from({ length: 10 }, (_, index) => {
    const currentRadius = index % 2 === 0 ? radius : radius * .45;
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    return { x: center.x + Math.cos(angle) * currentRadius, y: center.y + Math.sin(angle) * currentRadius };
  });
}

function smoothPath(points: Vec2[], scale: number, closed = false) {
  if (points.length < 2) return "";
  const scaled = points.map(point => ({ x: point.x * scale, y: point.y * scale }));
  let path = `M ${scaled[0].x} ${scaled[0].y}`;
  for (let index = 1; index < scaled.length; index += 1) {
    const previous = scaled[index - 1];
    const current = scaled[index];
    const mid = { x: (previous.x + current.x) / 2, y: (previous.y + current.y) / 2 };
    if (index === 1) path += ` Q ${previous.x} ${previous.y} ${mid.x} ${mid.y}`;
    else path += ` T ${mid.x} ${mid.y}`;
  }
  const last = scaled.at(-1)!;
  path += ` T ${last.x} ${last.y}`;
  return closed ? `${path} Z` : path;
}

function snapLabel(mode: SnapResult["mode"]) {
  if (mode === "endpoint") return "END";
  if (mode === "midpoint") return "MITTE";
  if (mode === "center") return "ZENTRUM";
  if (mode === "grid") return "RASTER";
  if (mode === "intersection") return "SCHNITT";
  return "";
}

export function CadCanvas() {
  const store = useProjectStore();
  const {
    entities,
    layers,
    selectedIds,
    activeTool,
    activeLayerId,
    gridSize,
    gridVisible,
    snapEnabled,
    snapModes,
    orthogonalMode,
    nudgeStep,
    dimensionSettings,
    showDimensions,
    planReference,
    setSelectedIds,
    toggleSelectedId,
    addEntity,
    moveEntities,
    deleteSelected,
    duplicateSelected,
    groupSelected,
    ungroupSelected,
    undo,
    redo,
    canUndo,
    canRedo
  } = store;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 });
  const [cursorWorld, setCursorWorld] = useState<Vec2>({ x: 0, y: 0 });
  const [currentSnap, setCurrentSnap] = useState<SnapResult>({ point: { x: 0, y: 0 }, mode: null });
  const [draftPoints, setDraftPoints] = useState<Vec2[]>([]);
  const [drag, setDrag] = useState<DragState>(null);

  const layerMap = useMemo(() => new Map(layers.map(layer => [layer.id, layer])), [layers]);
  const visibleEntities = useMemo(
    () => {
      const layerOrder = new Map(layers.map((layer, index) => [layer.id, index]));
      return entities
        .filter(entity => entity.visible && layerMap.get(entity.layerId)?.visible !== false)
        .sort((a, b) => (layerOrder.get(a.layerId) ?? 0) - (layerOrder.get(b.layerId) ?? 0));
    },
    [entities, layerMap, layers]
  );

  const moveDelta = drag?.type === "move"
    ? { x: drag.currentWorld.x - drag.startWorld.x, y: drag.currentWorld.y - drag.startWorld.y }
    : { x: 0, y: 0 };

  const displayedEntities = useMemo(() => {
    if (drag?.type !== "move") return visibleEntities;
    const moving = new Set(drag.ids);
    return visibleEntities.map(entity => moving.has(entity.id) ? translateEntity(entity, moveDelta) : entity);
  }, [drag, moveDelta, visibleEntities]);

  function clientToSvg(event: { clientX: number; clientY: number; currentTarget: SVGSVGElement }) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / Math.max(rect.width, 1)) * VIEW_WIDTH - VIEW_WIDTH / 2,
      y: ((event.clientY - rect.top) / Math.max(rect.height, 1)) * VIEW_HEIGHT - VIEW_HEIGHT / 2
    };
  }

  function svgToWorld(point: Vec2) {
    return {
      x: (point.x - pan.x) / (BASE_SCALE * zoom),
      y: (point.y - pan.y) / (BASE_SCALE * zoom)
    };
  }

  function worldToSvg(point: Vec2) {
    return {
      x: point.x * BASE_SCALE * zoom + pan.x,
      y: point.y * BASE_SCALE * zoom + pan.y
    };
  }

  function getSnapped(raw: Vec2, excludeIds: string[] = []) {
    return snapPoint(raw, {
      enabled: snapEnabled,
      modes: snapModes,
      gridSize,
      tolerance: 12 / (BASE_SCALE * zoom),
      entities: visibleEntities,
      excludeIds
    });
  }

  function constrainToAngle(point: Vec2, origin: Vec2) {
    const length = distance(origin, point);
    if (length < 0.0001) return point;
    const step = Math.PI / 4;
    const angle = Math.round(Math.atan2(point.y - origin.y, point.x - origin.x) / step) * step;
    return { x: origin.x + Math.cos(angle) * length, y: origin.y + Math.sin(angle) * length };
  }

  function getDrawingSnap(raw: Vec2, excludeIds: string[] = []) {
    const snapped = getSnapped(raw, excludeIds);
    const origin = draftPoints.at(-1);
    const supportsOrtho = ["line", "polyline", "polygon", "wall", "fence", "hedge", "path", "dimension"].includes(activeTool);
    if (!orthogonalMode || !origin || !supportsOrtho || (snapped.mode !== null && snapped.mode !== "grid")) return snapped;
    return { ...snapped, point: constrainToAngle(snapped.point, origin), mode: null };
  }

  function idsForEntity(entity: CadEntity, isolate = false) {
    const groupId = typeof entity.metadata?.groupId === "string" ? entity.metadata.groupId : undefined;
    if (!groupId || isolate) return [entity.id];
    return visibleEntities.filter(item => item.metadata?.groupId === groupId).map(item => item.id);
  }

  function pointerWorld(event: ReactPointerEvent<SVGSVGElement>, useSnap = true) {
    const raw = svgToWorld(clientToSvg(event));
    return useSnap ? getSnapped(raw).point : raw;
  }

  function completePolyline() {
    if (draftPoints.length < 2) return;
    const polygon = activeTool === "polygon";
    if (polygon && draftPoints.length < 3) return;
    const id = makeId(polygon ? "polygon" : "polyline");
    const shape = polygon ? "polygon" : "polyline";
    const draftEntity: CadEntity = {
      id,
      kind: polygon ? "surface" : "path",
      shape,
      name: polygon ? "Neues Polygon" : "Neue Polylinie",
      points: draftPoints,
      position: { x: 0, y: 0 },
      width: polygon ? Math.max(...draftPoints.map(point => point.x)) - Math.min(...draftPoints.map(point => point.x)) : 0.18,
      depth: polygon ? Math.max(...draftPoints.map(point => point.y)) - Math.min(...draftPoints.map(point => point.y)) : polylineLength(draftPoints),
      height: polygon ? 0.08 : 0.05,
      rotation: 0,
      layerId: activeLayerId,
      fillColor: polygon ? "#9f7658" : undefined,
      strokeColor: "#5f1526",
      strokeWidth: polygon ? 0.05 : 0.18,
      linePattern: "solid",
      visible: true,
      locked: false
    };
    addEntity({ ...draftEntity, position: entityCenter(draftEntity) }, polygon ? "Polygon erstellt" : "Polylinie erstellt");
    setDraftPoints([]);
  }

  function createFromPoint(point: Vec2) {
    const first = draftPoints[0];

    if (activeTool === "plant") {
      addEntity({
        id: makeId("plant"),
        kind: "plant",
        shape: "symbol",
        name: "Neue Pflanze",
        points: [],
        position: point,
        width: 1.4,
        depth: 1.4,
        height: 2.2,
        rotation: 0,
        layerId: layers.some(layer => layer.id === "layer-planting") ? "layer-planting" : activeLayerId,
        fillColor: "#4e8757",
        visible: true,
        locked: false
      }, "Pflanze platziert");
      return;
    }

    if (activeTool === "polyline" || activeTool === "polygon") {
      setDraftPoints(current => [...current, point]);
      return;
    }

    if (!first) {
      setDraftPoints([point]);
      return;
    }

    if (distance(first, point) < 0.02) return;
    const midpoint = { x: (first.x + point.x) / 2, y: (first.y + point.y) / 2 };
    const segmentLength = distance(first, point);

    if (activeTool === "line" || activeTool === "dimension" || activeTool === "path") {
      const isDimension = activeTool === "dimension";
      const isPath = activeTool === "path";
      addEntity({
        id: makeId(isDimension ? "dimension" : isPath ? "path" : "line"),
        kind: isPath ? "path" : "annotation",
        shape: "line",
        name: isDimension ? `Maß ${roundMetric(segmentLength)} m` : isPath ? "Neuer Weg" : "Neue Linie",
        points: [first, point],
        position: midpoint,
        width: isPath ? 1.2 : .04,
        depth: segmentLength,
        height: isPath ? .08 : .02,
        rotation: 0,
        layerId: isDimension && layers.some(layer => layer.id === "layer-dimensions" && layer.visible && !layer.locked)
          ? "layer-dimensions"
          : isPath && layers.some(layer => layer.id === "layer-paths") ? "layer-paths" : activeLayerId,
        materialId: isPath ? "mat-paving" : undefined,
        strokeColor: isDimension ? "#7b1c31" : isPath ? "#9d9991" : "#5f1526",
        strokeWidth: isPath ? 1.2 : .04,
        linePattern: isDimension ? "dashed" : "solid",
        arrowStart: isDimension,
        arrowEnd: isDimension,
        visible: true,
        locked: false,
        metadata: isDimension ? {
          dimension: true,
          measuredLength: segmentLength,
          dimensionMode: dimensionSettings.mode,
          dimensionUnit: dimensionSettings.unit,
          dimensionDecimals: dimensionSettings.decimals,
          dimensionTextScale: dimensionSettings.textScale
        } : isPath ? { objectType: "path" } : {}
      }, isDimension ? "Bemaßung erstellt" : isPath ? "Weg erstellt" : "Linie erstellt");
    }

    if (["wall", "fence", "hedge"].includes(activeTool)) {
      const objectType = activeTool;
      const isFence = activeTool === "fence";
      const isHedge = activeTool === "hedge";
      addEntity({
        id: makeId(objectType),
        kind: "wall",
        shape: "line",
        name: isFence ? "Neuer Zaun" : isHedge ? "Neue Hecke" : "Neue Mauer",
        points: [first, point],
        position: midpoint,
        width: isFence ? .1 : isHedge ? .55 : .25,
        depth: segmentLength,
        height: isFence ? 1.3 : isHedge ? 1.5 : 1,
        rotation: 0,
        layerId: isHedge && layers.some(layer => layer.id === "layer-planting")
          ? "layer-planting"
          : layers.some(layer => layer.id === "layer-building") ? "layer-building" : activeLayerId,
        materialId: isFence ? "mat-thermowood" : isHedge ? "mat-lawn" : "mat-concrete",
        fillColor: isHedge ? "#2f6c3f" : undefined,
        strokeWidth: isFence ? .1 : isHedge ? .55 : .25,
        visible: true,
        locked: false,
        metadata: { objectType }
      }, isFence ? "Zaun erstellt" : isHedge ? "Hecke erstellt" : "Mauer erstellt");
    }

    if (["rectangle", "rounded", "terrace", "bed", "water", "pool", "stairs", "ellipse"].includes(activeTool)) {
      const width = Math.abs(point.x - first.x);
      const depth = Math.abs(point.y - first.y);
      const isWater = activeTool === "water";
      const isPool = activeTool === "pool";
      const isEllipse = activeTool === "ellipse";
      const isTerrace = activeTool === "terrace";
      const isBed = activeTool === "bed";
      const isStairs = activeTool === "stairs";
      const isRounded = activeTool === "rounded";
      const kind: CadEntity["kind"] = isWater || isPool ? "water" : isStairs ? "building" : "surface";
      const name = isWater ? "Neue Wasserfläche" : isPool ? "Neuer Pool" : isEllipse ? "Neue Ellipse" : isTerrace ? "Neue Terrasse" : isBed ? "Neues Beet" : isStairs ? "Neue Treppe" : isRounded ? "Abgerundete Fläche" : "Neue Fläche";
      const layerId = (isWater || isPool) && layers.some(layer => layer.id === "layer-water")
        ? "layer-water"
        : isBed && layers.some(layer => layer.id === "layer-planting") ? "layer-planting"
          : isTerrace && layers.some(layer => layer.id === "layer-paths") ? "layer-paths"
            : isStairs && layers.some(layer => layer.id === "layer-building") ? "layer-building" : activeLayerId;
      addEntity({
        id: makeId(activeTool),
        kind,
        shape: isEllipse ? "ellipse" : "rectangle",
        name,
        points: [],
        position: midpoint,
        width,
        depth,
        height: isPool ? 1.4 : isStairs ? Math.max(.45, depth * .25) : isWater ? .18 : isTerrace ? .16 : isBed ? .35 : .08,
        rotation: 0,
        layerId,
        materialId: isWater || isPool ? "mat-water" : isTerrace ? "mat-natural-stone" : isBed ? "mat-soil" : isStairs ? "mat-natural-stone" : undefined,
        fillColor: isWater || isPool ? "#4ba7c7" : isBed ? "#6d503d" : isTerrace || isStairs ? "#a88c6a" : "#9f7658",
        opacity: isWater || isPool ? .72 : .78,
        strokeWidth: .05,
        visible: true,
        locked: false,
        metadata: {
          objectType: isPool ? "pool" : isWater ? "water-surface" : isTerrace ? "terrace" : isBed ? "planting-bed" : isStairs ? "stairs" : isRounded ? "rounded-surface" : isEllipse ? "ellipse" : "surface",
          rounded: isRounded
        }
      }, `${name} erstellt`);
    }

    if (["triangle", "pentagon", "hexagon", "star"].includes(activeTool)) {
      const sides = activeTool === "triangle" ? 3 : activeTool === "pentagon" ? 5 : 6;
      const points = activeTool === "star" ? starPolygonPoints(first, segmentLength) : regularPolygonPoints(first, segmentLength, sides);
      const shapeLabel = activeTool === "triangle" ? "Dreieck" : activeTool === "pentagon" ? "Fünfeck" : activeTool === "hexagon" ? "Sechseck" : "Stern";
      addEntity({
        id: makeId(activeTool),
        kind: "surface",
        shape: "polygon",
        name: `Neues ${shapeLabel}`,
        points,
        position: first,
        width: segmentLength * 2,
        depth: segmentLength * 2,
        height: .08,
        rotation: 0,
        layerId: activeLayerId,
        fillColor: "#9f7658",
        strokeColor: "#5f1526",
        opacity: .72,
        strokeWidth: .05,
        linePattern: "solid",
        visible: true,
        locked: false,
        metadata: { shapeKind: activeTool }
      }, `${shapeLabel} erstellt`);
    }

    if (activeTool === "circle") {
      const radius = distance(first, point);
      addEntity({
        id: makeId("circle"),
        kind: "surface",
        shape: "circle",
        name: "Neue Kreisfläche",
        points: [],
        position: first,
        width: radius * 2,
        depth: radius * 2,
        radius,
        height: .08,
        rotation: 0,
        layerId: activeLayerId,
        fillColor: "#9f7658",
        opacity: .68,
        strokeWidth: .05,
        visible: true,
        locked: false
      }, "Kreisfläche erstellt");
    }

    setDraftPoints([]);
  }

  function handleBackgroundPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const svgPoint = clientToSvg(event);
    const rawWorld = svgToWorld(svgPoint);
    const snapped = getDrawingSnap(rawWorld);
    setCursorWorld(snapped.point);
    setCurrentSnap(snapped);

    if (activeTool === "pan" || event.button === 1) {
      setDrag({ type: "pan", startSvg: svgPoint, currentSvg: svgPoint, originPan: pan });
      return;
    }

    if (activeTool === "select") {
      setDrag({ type: "marquee", startWorld: rawWorld, currentWorld: rawWorld });
      return;
    }

    if (activeTool === "freehand") {
      setDrag({ type: "freehand", points: [rawWorld] });
      return;
    }

    if (["line", "polyline", "rectangle", "rounded", "circle", "ellipse", "polygon", "triangle", "pentagon", "hexagon", "star", "wall", "fence", "hedge", "path", "terrace", "bed", "water", "pool", "stairs", "plant", "dimension"].includes(activeTool)) {
      createFromPoint(snapped.point);
    }
  }

  function handleEntityPointerDown(event: ReactPointerEvent<SVGGElement>, entity: CadEntity) {
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    svg?.setPointerCapture(event.pointerId);
    const raw = svg ? svgToWorld(clientToSvg({ clientX: event.clientX, clientY: event.clientY, currentTarget: svg })) : entityCenter(entity);
    const layer = layerMap.get(entity.layerId);
    const isLocked = entity.locked || layer?.locked;

    if (activeTool === "freehand") {
      setDrag({ type: "freehand", points: [raw] });
      return;
    }
    if (["line", "polyline", "rectangle", "rounded", "circle", "ellipse", "polygon", "triangle", "pentagon", "hexagon", "star", "wall", "fence", "hedge", "path", "terrace", "bed", "water", "pool", "stairs", "plant", "dimension"].includes(activeTool)) {
      createFromPoint(getDrawingSnap(raw).point);
      return;
    }

    if (isLocked) return;

    const clickedIds = idsForEntity(entity, event.altKey);
    const modifier = event.shiftKey || event.metaKey || event.ctrlKey;
    let nextSelection = selectedIds;
    if (modifier) {
      const allSelected = clickedIds.every(id => selectedIds.includes(id));
      nextSelection = allSelected
        ? selectedIds.filter(id => !clickedIds.includes(id))
        : Array.from(new Set([...selectedIds, ...clickedIds]));
      setSelectedIds(nextSelection);
    } else if (!clickedIds.every(id => selectedIds.includes(id))) {
      nextSelection = clickedIds;
      setSelectedIds(clickedIds);
    }

    if (activeTool === "move") {
      const ids = nextSelection.length > 0 && nextSelection.some(id => clickedIds.includes(id)) ? nextSelection : clickedIds;
      const start = getSnapped(raw, ids).point;
      setDrag({ type: "move", startWorld: start, currentWorld: start, ids });
    }
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const svgPoint = clientToSvg(event);
    const rawWorld = svgToWorld(svgPoint);
    const snapped = drag?.type === "move"
      ? getSnapped(rawWorld, drag.ids)
      : getDrawingSnap(rawWorld);
    setCursorWorld(snapped.point);
    setCurrentSnap(snapped);

    if (drag?.type === "pan") {
      setDrag({ ...drag, currentSvg: svgPoint });
      setPan({
        x: drag.originPan.x + svgPoint.x - drag.startSvg.x,
        y: drag.originPan.y + svgPoint.y - drag.startSvg.y
      });
    } else if (drag?.type === "move") {
      setDrag({ ...drag, currentWorld: snapped.point });
    } else if (drag?.type === "marquee") {
      setDrag({ ...drag, currentWorld: rawWorld });
    } else if (drag?.type === "freehand") {
      const last = drag.points.at(-1);
      if (!last || distance(last, rawWorld) > 0.06) setDrag({ ...drag, points: [...drag.points, rawWorld] });
    }
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (drag?.type === "freehand" && drag.points.length >= 2) {
      const id = makeId("freehand");
      const draftEntity: CadEntity = {
        id,
        kind: "path",
        shape: "polyline",
        name: "Freihandskizze",
        points: drag.points,
        position: { x: 0, y: 0 },
        width: 0.08,
        depth: polylineLength(drag.points),
        height: 0.02,
        rotation: 0,
        layerId: activeLayerId,
        strokeColor: "#5f1526",
        strokeWidth: 0.08,
        linePattern: "solid",
        visible: true,
        locked: false,
        metadata: { freehand: true }
      };
      addEntity({ ...draftEntity, position: entityCenter(draftEntity) }, "Freihandskizze erstellt");
    }

    if (drag?.type === "move") {
      moveEntities(drag.ids, {
        x: drag.currentWorld.x - drag.startWorld.x,
        y: drag.currentWorld.y - drag.startWorld.y
      });
    }

    if (drag?.type === "marquee") {
      const moved = distance(drag.startWorld, drag.currentWorld);
      if (moved < 0.08) {
        setSelectedIds([]);
      } else {
        const box = {
          minX: Math.min(drag.startWorld.x, drag.currentWorld.x),
          maxX: Math.max(drag.startWorld.x, drag.currentWorld.x),
          minY: Math.min(drag.startWorld.y, drag.currentWorld.y),
          maxY: Math.max(drag.startWorld.y, drag.currentWorld.y)
        };
        const ids = visibleEntities
          .filter(entity => !entity.locked && !layerMap.get(entity.layerId)?.locked && boundsIntersect(entityBounds(entity), box))
          .map(entity => entity.id);
        setSelectedIds(ids);
      }
    }

    setDrag(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    setZoom(current => clamp(current * (event.deltaY < 0 ? 1.12 : 0.89), 0.35, 4.5));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT") return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (modifier && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedIds(visibleEntities.filter(entity => !entity.locked && !layerMap.get(entity.layerId)?.locked).map(entity => entity.id));
      } else if (modifier && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if (modifier && event.key.toLowerCase() === "g") {
        event.preventDefault();
        event.shiftKey ? ungroupSelected() : groupSelected();
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && selectedIds.length > 0) {
        event.preventDefault();
        const factor = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
        const step = nudgeStep * factor;
        const delta = event.key === "ArrowLeft" ? { x: -step, y: 0 }
          : event.key === "ArrowRight" ? { x: step, y: 0 }
            : event.key === "ArrowUp" ? { x: 0, y: -step }
              : { x: 0, y: step };
        moveEntities(selectedIds, delta, "Auswahl per Tastatur verschoben");
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      } else if (event.key === "Escape") {
        setDraftPoints([]);
        setDrag(null);
        setSelectedIds([]);
      } else if (event.key === "Enter" && (activeTool === "polyline" || activeTool === "polygon")) {
        completePolyline();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    setDraftPoints([]);
    setDrag(null);
  }, [activeTool]);

  const previewPoint = currentSnap.point;
  const firstDraft = draftPoints[0];
  const activeLayer = layerMap.get(activeLayerId);
  const dimensionPreviewMidpoint = firstDraft
    ? { x: (firstDraft.x + previewPoint.x) / 2, y: (firstDraft.y + previewPoint.y) / 2 }
    : previewPoint;
  const dimensionPreviewStart = firstDraft && dimensionSettings.mode === "horizontal"
    ? { x: firstDraft.x, y: dimensionPreviewMidpoint.y }
    : firstDraft && dimensionSettings.mode === "vertical" ? { x: dimensionPreviewMidpoint.x, y: firstDraft.y } : firstDraft;
  const dimensionPreviewEnd = firstDraft && dimensionSettings.mode === "horizontal"
    ? { x: previewPoint.x, y: dimensionPreviewMidpoint.y }
    : firstDraft && dimensionSettings.mode === "vertical" ? { x: dimensionPreviewMidpoint.x, y: previewPoint.y } : previewPoint;

  function renderEntity(entity: CadEntity) {
    const selected = selectedIds.includes(entity.id);
    const layer = layerMap.get(entity.layerId);
    const locked = entity.locked || layer?.locked;
    const printable = layer?.printable !== false;
    const baseStroke = entity.strokeColor ?? layer?.color ?? "#5f1526";
    const stroke = selected ? "#ffb84d" : baseStroke;
    const strokeWidth = selected ? 4 / zoom : Math.max(1.2 / zoom, (entity.strokeWidth ?? 0.05) * BASE_SCALE / zoom);
    const fill = colorForEntity(entity);
    const layerOpacity = layer?.opacity ?? 1;
    const baseOpacity = (entity.opacity ?? 1) * layerOpacity;
    const opacity = locked ? Math.min(baseOpacity, .68) : baseOpacity;

    if (entity.metadata?.dimension === true) {
      if (!showDimensions) return null;
      return (
        <CadDimension
          key={entity.id}
          entity={entity}
          zoom={zoom}
          selected={selected}
          locked={Boolean(locked)}
          printable={printable}
          opacity={opacity}
          fallbackColor={baseStroke}
          onPointerDown={event => handleEntityPointerDown(event, entity)}
        />
      );
    }

    if (entity.shape === "line" || entity.shape === "polyline") {
      const points = entity.points.map(point => `${point.x * BASE_SCALE},${point.y * BASE_SCALE}`).join(" ");
      const isCurve = entity.metadata?.curve === true && entity.points.length > 2;
      const curvePath = isCurve ? smoothPath(entity.points, BASE_SCALE) : "";
      const lineWidth = entity.kind === "wall" || entity.kind === "path"
        ? Math.max(5, (entity.strokeWidth ?? entity.width) * BASE_SCALE)
        : Math.max(2, (entity.strokeWidth ?? entity.width) * BASE_SCALE);
      const shared = {
        fill: "none",
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const
      };
      return (
        <g key={entity.id} data-layer-id={entity.layerId} data-layer-printable={printable ? "true" : "false"} onPointerDown={event => handleEntityPointerDown(event, entity)} className={locked ? "cadEntity locked" : "cadEntity"}>
          {isCurve ? (
            <path d={curvePath} {...shared} stroke="transparent" strokeWidth={(lineWidth + 12) / zoom} />
          ) : (
            <polyline points={points} {...shared} stroke="transparent" strokeWidth={(lineWidth + 12) / zoom} />
          )}
          {isCurve ? (
            <path
              d={curvePath}
              {...shared}
              stroke={selected ? "#ffb84d" : entity.kind === "wall" || entity.kind === "path" ? fill : baseStroke}
              strokeWidth={lineWidth / zoom}
              strokeDasharray={dashArray(entity.linePattern, zoom)}
              markerStart={entity.arrowStart ? "url(#cadArrowStart)" : undefined}
              markerEnd={entity.arrowEnd ? "url(#cadArrowEnd)" : undefined}
              opacity={opacity}
            />
          ) : (
            <polyline
              points={points}
              {...shared}
              stroke={selected ? "#ffb84d" : entity.kind === "wall" || entity.kind === "path" ? fill : baseStroke}
              strokeWidth={lineWidth / zoom}
              strokeLinecap={entity.kind === "wall" ? "square" : "round"}
              strokeDasharray={dashArray(entity.linePattern, zoom)}
              markerStart={entity.arrowStart ? "url(#cadArrowStart)" : undefined}
              markerEnd={entity.arrowEnd ? "url(#cadArrowEnd)" : undefined}
              opacity={opacity}
            />
          )}
          {selected && (isCurve
            ? <path d={curvePath} {...shared} stroke="#ffcf77" strokeWidth={2 / zoom} strokeDasharray={`${8 / zoom} ${6 / zoom}`} />
            : <polyline points={points} {...shared} stroke="#ffcf77" strokeWidth={2 / zoom} strokeDasharray={`${8 / zoom} ${6 / zoom}`} />
          )}
          {showDimensions && entity.points.length >= 2 && (
            <DimensionLabel point={entityCenter(entity)} text={`${roundMetric(polylineLength(entity.points))} m`} zoom={zoom} />
          )}
          {selected && entity.points.map((point, index) => (
            <circle key={index} cx={point.x * BASE_SCALE} cy={point.y * BASE_SCALE} r={5 / zoom} fill="#fff5e8" stroke="#7b1c31" strokeWidth={2 / zoom} />
          ))}
        </g>
      );
    }

    if (entity.shape === "polygon") {
      const points = entity.points.map(point => `${point.x * BASE_SCALE},${point.y * BASE_SCALE}`).join(" ");
      return (
        <g key={entity.id} data-layer-id={entity.layerId} data-layer-printable={printable ? "true" : "false"} onPointerDown={event => handleEntityPointerDown(event, entity)} className={locked ? "cadEntity locked" : "cadEntity"}>
          <polygon points={points} fill={fill} fillOpacity={opacity * .72} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dashArray(entity.linePattern, zoom)} />
          <text x={entity.position.x * BASE_SCALE} y={entity.position.y * BASE_SCALE + 4 / zoom} textAnchor="middle" fontSize={12 / zoom} fill="#2f0c16">{entity.name}</text>
          {showDimensions && <DimensionLabel point={entity.position} text={`${roundMetric(entity.width)} × ${roundMetric(entity.depth)} m`} zoom={zoom} />}
          {selected && entity.points.map((point, index) => <circle key={index} cx={point.x * BASE_SCALE} cy={point.y * BASE_SCALE} r={5 / zoom} fill="#fff5e8" stroke="#7b1c31" strokeWidth={2 / zoom} />)}
        </g>
      );
    }

    const x = entity.position.x * BASE_SCALE;
    const y = entity.position.y * BASE_SCALE;
    const width = entity.width * BASE_SCALE;
    const depth = entity.depth * BASE_SCALE;
    const plantCategory = String(entity.metadata?.databaseCategory ?? "").toLowerCase();
    const plantFlower = entity.fillColor ?? "#d8b2c1";

    return (
      <g
        key={entity.id}
        data-layer-id={entity.layerId}
        data-layer-printable={printable ? "true" : "false"}
        transform={`translate(${x} ${y}) rotate(${entity.rotation})`}
        onPointerDown={event => handleEntityPointerDown(event, entity)}
        className={locked ? "cadEntity locked" : "cadEntity"}
      >
        {entity.shape === "circle" ? (
          <circle
            cx={0}
            cy={0}
            r={(entity.radius ?? entity.width / 2) * BASE_SCALE}
            fill={fill}
            fillOpacity={opacity * (entity.kind === "surface" ? .68 : .92)}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray(entity.linePattern, zoom)}
          />
        ) : entity.shape === "ellipse" ? (
          <ellipse
            cx={0}
            cy={0}
            rx={width / 2}
            ry={depth / 2}
            fill={fill}
            fillOpacity={opacity * (entity.kind === "water" ? .72 : .68)}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray(entity.linePattern, zoom)}
          />
        ) : entity.kind === "plant" ? (
          plantCategory.includes("gras") ? (
            <>
              <circle cx={0} cy={0} r={width / 2} fill="#78905d" fillOpacity={opacity * .55} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={`${4 / zoom} ${3 / zoom}`} />
              {Array.from({ length: 10 }, (_, index) => {
                const angle = index / 10 * Math.PI * 2;
                return <line key={index} x1={0} y1={0} x2={Math.cos(angle) * width * .42} y2={Math.sin(angle) * width * .42} stroke="#e7f0d7" strokeWidth={1.4 / zoom} />;
              })}
            </>
          ) : plantCategory.includes("staude") ? (
            <>
              <circle cx={0} cy={0} r={width / 2} fill="#4e8757" fillOpacity={opacity * .34} stroke={stroke} strokeWidth={strokeWidth} />
              {Array.from({ length: 6 }, (_, index) => {
                const angle = index / 6 * Math.PI * 2;
                return <circle key={index} cx={Math.cos(angle) * width * .18} cy={Math.sin(angle) * width * .18} r={width * .15} fill={plantFlower} fillOpacity={opacity * .9} stroke="#fff3ee" strokeWidth={.8 / zoom} />;
              })}
              <circle cx={0} cy={0} r={width * .1} fill="#e3b84d" />
            </>
          ) : plantCategory.includes("strauch") || plantCategory.includes("heck") ? (
            <>
              <circle cx={0} cy={0} r={width / 2} fill="#477848" fillOpacity={opacity * .38} stroke={stroke} strokeWidth={strokeWidth} />
              {[[-.18, -.08], [.18, -.08], [0, .18], [0, 0]].map(([offsetX, offsetY], index) => (
                <circle key={index} cx={width * offsetX} cy={width * offsetY} r={width * .24} fill="#568755" fillOpacity={opacity * .82} stroke="#e7f1df" strokeWidth={.8 / zoom} />
              ))}
            </>
          ) : (
            <>
              <circle cx={0} cy={0} r={width / 2} fill="#477848" fillOpacity={opacity * .78} stroke={stroke} strokeWidth={strokeWidth} />
              <circle cx={0} cy={0} r={width * .3} fill="none" stroke="#eaf5df" strokeWidth={1.5 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`} />
              <path d={`M ${-width * .35} 0 H ${width * .35} M 0 ${-width * .35} V ${width * .35}`} stroke="#eaf5df" strokeWidth={1.2 / zoom} />
            </>
          )
        ) : (
          <rect
            x={-width / 2}
            y={-depth / 2}
            width={width}
            height={depth}
            rx={entity.metadata?.rounded === true ? Math.max(8 / zoom, Math.min(width, depth) * .14) : entity.kind === "surface" || entity.kind === "water" ? 4 / zoom : 1 / zoom}
            fill={fill}
            fillOpacity={opacity * (entity.kind === "surface" || entity.kind === "water" ? .68 : .92)}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray(entity.linePattern, zoom)}
          />
        )}
        <text y={4 / zoom} textAnchor="middle" fontSize={12 / zoom} fill="#2f0c16" className="entityLabel">{entity.name}</text>
        {showDimensions && (
          <DimensionLabel
            point={{ x: 0, y: (entity.shape === "circle" ? entity.width : entity.depth) * BASE_SCALE / 2 + 18 / zoom }}
            text={entity.shape === "circle" ? `Ø ${roundMetric(entity.width)} m` : `${roundMetric(entity.width)} × ${roundMetric(entity.depth)} m`}
            zoom={zoom}
            local
          />
        )}
        {selected && entity.shape !== "circle" && entity.kind !== "plant" && [
          [-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]
        ].map(([handleX, handleY], index) => (
          <rect key={index} x={handleX - 4 / zoom} y={handleY - 4 / zoom} width={8 / zoom} height={8 / zoom} fill="#fff5e8" stroke="#7b1c31" strokeWidth={1.5 / zoom} />
        ))}
      </g>
    );
  }

  const marquee = drag?.type === "marquee" ? {
    x: Math.min(drag.startWorld.x, drag.currentWorld.x) * BASE_SCALE,
    y: Math.min(drag.startWorld.y, drag.currentWorld.y) * BASE_SCALE,
    width: Math.abs(drag.currentWorld.x - drag.startWorld.x) * BASE_SCALE,
    height: Math.abs(drag.currentWorld.y - drag.startWorld.y) * BASE_SCALE
  } : null;

  return (
    <section className="viewportCard cadViewport">
      <div className="viewportTitle">
        <strong>2D CAD PROFESSIONAL · DETAILTOOLS</strong>
        <span>{TOOL_HELP[activeTool]}</span>
      </div>
      <div className="cadHud cadHudRight">
        <span>Zoom {Math.round(zoom * 100)} %</span>
        <span>Layer {activeLayer?.name ?? "–"}</span>
        <span>Höhe {(activeLayer?.elevation ?? 0) >= 0 ? "+" : "−"}{Math.abs(activeLayer?.elevation ?? 0).toFixed(2)} m</span>
      </div>
      {(activeTool === "polyline" || activeTool === "polygon") && draftPoints.length >= 2 && (
        <div className="draftActions">
          <button type="button" disabled={activeTool === "polygon" && draftPoints.length < 3} onClick={completePolyline}>✓ {activeTool === "polygon" ? "Polygon" : "Polylinie"} fertig</button>
          <button type="button" onClick={() => setDraftPoints(current => current.slice(0, -1))}>Punkt zurück</button>
          <button type="button" onClick={() => setDraftPoints([])}>Abbrechen</button>
        </div>
      )}
      <svg
        data-algreen-cad-canvas="true"
        className={`cadCanvas tool-${activeTool}`}
        viewBox={`${-VIEW_WIDTH / 2} ${-VIEW_HEIGHT / 2} ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDrag(null)}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="minorGrid21" width={gridSize * BASE_SCALE} height={gridSize * BASE_SCALE} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize * BASE_SCALE} 0 L 0 0 0 ${gridSize * BASE_SCALE}`} fill="none" stroke="#e9dde0" strokeWidth={0.8 / zoom} />
          </pattern>
          <pattern id="majorGrid21" width={gridSize * BASE_SCALE * 4} height={gridSize * BASE_SCALE * 4} patternUnits="userSpaceOnUse">
            <rect width={gridSize * BASE_SCALE * 4} height={gridSize * BASE_SCALE * 4} fill="url(#minorGrid21)" />
            <path d={`M ${gridSize * BASE_SCALE * 4} 0 L 0 0 0 ${gridSize * BASE_SCALE * 4}`} fill="none" stroke="#cbb6bc" strokeWidth={1.2 / zoom} />
          </pattern>
          <marker id="cadArrowStart" markerWidth="8" markerHeight="8" refX="1.5" refY="4" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M 8 0 L 0 4 L 8 8 z" fill="context-stroke" /></marker>
          <marker id="cadArrowEnd" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 8 4 L 0 8 z" fill="context-stroke" /></marker>
        </defs>
        <rect x={-VIEW_WIDTH / 2} y={-VIEW_HEIGHT / 2} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#f5f1f1" />
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {planReference?.visible && planReference.dataUrl && (
            <image
              href={planReference.dataUrl}
              x={-planReference.width * BASE_SCALE / 2}
              y={-planReference.depth * BASE_SCALE / 2}
              width={planReference.width * BASE_SCALE}
              height={planReference.depth * BASE_SCALE}
              opacity={planReference.opacity}
              preserveAspectRatio="none"
              pointerEvents="none"
            />
          )}
          {gridVisible && <rect x={-3000} y={-3000} width={6000} height={6000} fill="url(#majorGrid21)" />}
          <line x1={-3000} y1={0} x2={3000} y2={0} stroke="#9c6673" strokeWidth={1.2 / zoom} />
          <line x1={0} y1={-3000} x2={0} y2={3000} stroke="#789071" strokeWidth={1.2 / zoom} />
          {displayedEntities.map(renderEntity)}

          {draftPoints.length > 0 && (
            <g className="draftGeometry">
              {(activeTool === "polyline" || activeTool === "polygon") ? (
                <polyline
                  points={[...draftPoints, previewPoint].map(point => `${point.x * BASE_SCALE},${point.y * BASE_SCALE}`).join(" ")}
                  fill={activeTool === "polygon" ? "rgba(159,118,88,.16)" : "none"}
                  stroke="#d4823b"
                  strokeWidth={2.5 / zoom}
                  strokeDasharray={`${8 / zoom} ${5 / zoom}`}
                />
              ) : ["rectangle", "rounded", "terrace", "bed", "water", "pool", "stairs"].includes(activeTool) && firstDraft ? (
                <rect
                  x={Math.min(firstDraft.x, previewPoint.x) * BASE_SCALE}
                  y={Math.min(firstDraft.y, previewPoint.y) * BASE_SCALE}
                  width={Math.abs(previewPoint.x - firstDraft.x) * BASE_SCALE}
                  height={Math.abs(previewPoint.y - firstDraft.y) * BASE_SCALE}
                  rx={activeTool === "rounded" ? 16 / zoom : 2 / zoom}
                  fill={["water", "pool"].includes(activeTool) ? "#4ba7c7" : activeTool === "bed" ? "#6d503d" : "#d7aa72"}
                  fillOpacity={0.22}
                  stroke="#d4823b"
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${8 / zoom} ${5 / zoom}`}
                />
              ) : activeTool === "ellipse" && firstDraft ? (
                <ellipse
                  cx={(firstDraft.x + previewPoint.x) * BASE_SCALE / 2}
                  cy={(firstDraft.y + previewPoint.y) * BASE_SCALE / 2}
                  rx={Math.abs(previewPoint.x - firstDraft.x) * BASE_SCALE / 2}
                  ry={Math.abs(previewPoint.y - firstDraft.y) * BASE_SCALE / 2}
                  fill="#d7aa72"
                  fillOpacity={0.2}
                  stroke="#d4823b"
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${8 / zoom} ${5 / zoom}`}
                />
              ) : ["triangle", "pentagon", "hexagon", "star"].includes(activeTool) && firstDraft ? (
                <polygon
                  points={(activeTool === "star" ? starPolygonPoints(firstDraft, distance(firstDraft, previewPoint)) : regularPolygonPoints(firstDraft, distance(firstDraft, previewPoint), activeTool === "triangle" ? 3 : activeTool === "pentagon" ? 5 : 6)).map(point => `${point.x * BASE_SCALE},${point.y * BASE_SCALE}`).join(" ")}
                  fill="#d7aa72"
                  fillOpacity={0.2}
                  stroke="#d4823b"
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${8 / zoom} ${5 / zoom}`}
                />
              ) : activeTool === "circle" && firstDraft ? (
                <circle
                  cx={firstDraft.x * BASE_SCALE}
                  cy={firstDraft.y * BASE_SCALE}
                  r={distance(firstDraft, previewPoint) * BASE_SCALE}
                  fill="#77adc4"
                  fillOpacity={0.18}
                  stroke="#d4823b"
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${8 / zoom} ${5 / zoom}`}
                />
              ) : firstDraft ? (
                <line
                  x1={(activeTool === "dimension" ? dimensionPreviewStart?.x ?? firstDraft.x : firstDraft.x) * BASE_SCALE}
                  y1={(activeTool === "dimension" ? dimensionPreviewStart?.y ?? firstDraft.y : firstDraft.y) * BASE_SCALE}
                  x2={(activeTool === "dimension" ? dimensionPreviewEnd.x : previewPoint.x) * BASE_SCALE}
                  y2={(activeTool === "dimension" ? dimensionPreviewEnd.y : previewPoint.y) * BASE_SCALE}
                  stroke={activeTool === "hedge" ? "#2f6c3f" : ["wall", "fence"].includes(activeTool) ? "#786e68" : "#d4823b"}
                  strokeWidth={activeTool === "wall" ? Math.max(5, .25 * BASE_SCALE) / zoom : activeTool === "hedge" ? Math.max(6, .55 * BASE_SCALE) / zoom : activeTool === "fence" ? Math.max(4, .1 * BASE_SCALE) / zoom : 2.5 / zoom}
                  strokeDasharray={activeTool === "dimension" ? `${8 / zoom} ${5 / zoom}` : undefined}
                  markerStart={activeTool === "dimension" ? "url(#cadArrowStart)" : undefined}
                  markerEnd={activeTool === "dimension" ? "url(#cadArrowEnd)" : undefined}
                />
              ) : null}
              {draftPoints.map((point, index) => <circle key={index} cx={point.x * BASE_SCALE} cy={point.y * BASE_SCALE} r={4.5 / zoom} fill="#fff" stroke="#d4823b" strokeWidth={2 / zoom} />)}
            </g>
          )}

          {drag?.type === "freehand" && drag.points.length > 1 && (
            <polyline
              points={drag.points.map(point => `${point.x * BASE_SCALE},${point.y * BASE_SCALE}`).join(" ")}
              fill="none"
              stroke="#d4823b"
              strokeWidth={2.5 / zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {marquee && <rect {...marquee} fill="#5b8fb9" fillOpacity={0.14} stroke="#356b93" strokeWidth={1.5 / zoom} strokeDasharray={`${7 / zoom} ${4 / zoom}`} />}

          {currentSnap.mode && !drag && (
            <g transform={`translate(${currentSnap.point.x * BASE_SCALE} ${currentSnap.point.y * BASE_SCALE})`} pointerEvents="none">
              {currentSnap.mode === "endpoint" && <rect x={-5 / zoom} y={-5 / zoom} width={10 / zoom} height={10 / zoom} fill="none" stroke="#ff8b2e" strokeWidth={2 / zoom} />}
              {currentSnap.mode === "midpoint" && <path d={`M 0 ${-7 / zoom} L ${7 / zoom} ${6 / zoom} L ${-7 / zoom} ${6 / zoom} Z`} fill="none" stroke="#ff8b2e" strokeWidth={2 / zoom} />}
              {currentSnap.mode === "center" && <circle r={6 / zoom} fill="none" stroke="#ff8b2e" strokeWidth={2 / zoom} />}
              {currentSnap.mode === "grid" && <path d={`M ${-5 / zoom} 0 H ${5 / zoom} M 0 ${-5 / zoom} V ${5 / zoom}`} stroke="#ff8b2e" strokeWidth={2 / zoom} />}
              {currentSnap.mode === "intersection" && <path d={`M ${-6 / zoom} ${-6 / zoom} L ${6 / zoom} ${6 / zoom} M ${6 / zoom} ${-6 / zoom} L ${-6 / zoom} ${6 / zoom}`} stroke="#ff8b2e" strokeWidth={2 / zoom} />}
              <text x={9 / zoom} y={-9 / zoom} fontSize={9 / zoom} fill="#8c4318">{snapLabel(currentSnap.mode)}</text>
            </g>
          )}
        </g>
      </svg>
      <div className="cadStatusbar">
        <span>X {cursorWorld.x.toFixed(2)} m</span>
        <span>Y {cursorWorld.y.toFixed(2)} m</span>
        <span>{snapEnabled ? `SNAP ${currentSnap.mode?.toUpperCase() ?? "BEREIT"}` : "SNAP AUS"}</span>
        <span>{gridVisible ? `RASTER ${gridSize} m` : "RASTER AUS"}</span>
        <span className={orthogonalMode ? "statusOn" : ""}>{orthogonalMode ? "ORTHO 45°" : "ORTHO AUS"}</span>
        <span>{selectedIds.length} gewählt</span>
        <span className={canUndo ? "statusOn" : ""}>UNDO</span>
        <span className={canRedo ? "statusOn" : ""}>REDO</span>
      </div>
    </section>
  );
}

function DimensionLabel({ point, text, zoom, local = false }: { point: Vec2; text: string; zoom: number; local?: boolean }) {
  const x = local ? point.x : point.x * BASE_SCALE;
  const y = local ? point.y : point.y * BASE_SCALE;
  const width = Math.max(42, text.length * 6.4) / zoom;
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect x={-width / 2} y={-10 / zoom} width={width} height={18 / zoom} rx={5 / zoom} fill="rgba(255,250,246,.92)" stroke="#9a6672" strokeWidth={0.8 / zoom} />
      <text textAnchor="middle" y={3 / zoom} fontSize={10 / zoom} fill="#5f2231">{text}</text>
    </g>
  );
}

function dimensionMode(entity: CadEntity): DimensionMode {
  const value = entity.metadata?.dimensionMode;
  return value === "horizontal" || value === "vertical" ? value : "aligned";
}

function dimensionUnit(entity: CadEntity): DimensionUnit {
  const value = entity.metadata?.dimensionUnit;
  return value === "cm" || value === "mm" ? value : "m";
}

function CadDimension({
  entity,
  zoom,
  selected,
  locked,
  printable,
  opacity,
  fallbackColor,
  onPointerDown
}: {
  entity: CadEntity;
  zoom: number;
  selected: boolean;
  locked: boolean;
  printable: boolean;
  opacity: number;
  fallbackColor: string;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void;
}) {
  const sourceStart = entity.points[0] ?? entity.position;
  const sourceEnd = entity.points[1] ?? entity.position;
  const mode = dimensionMode(entity);
  const geometry = resolveDimensionGeometry(sourceStart, sourceEnd, mode);
  const { lineStart, lineEnd, labelPoint } = geometry;
  const scale = Math.min(2, Math.max(.65, Number(entity.metadata?.dimensionTextScale ?? 1)));
  const color = selected ? "#ffb84d" : fallbackColor;
  const label = formatDimensionValue(geometry.measuredMeters, dimensionUnit(entity), Number(entity.metadata?.dimensionDecimals ?? 2));
  const labelWidth = Math.max(52, label.length * 6.6) * scale / zoom;
  const labelHeight = 20 * scale / zoom;
  const x1 = lineStart.x * BASE_SCALE;
  const y1 = lineStart.y * BASE_SCALE;
  const x2 = lineEnd.x * BASE_SCALE;
  const y2 = lineEnd.y * BASE_SCALE;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const vectorLength = Math.max(1, Math.hypot(dx, dy));
  const normal = { x: -dy / vectorLength, y: dx / vectorLength };
  const tick = 7 / zoom;
  const extensionDash = `${3 / zoom} ${3 / zoom}`;

  return (
    <g
      data-layer-id={entity.layerId}
      data-layer-printable={printable ? "true" : "false"}
      onPointerDown={onPointerDown}
      className={locked ? "cadEntity cadDimension locked" : "cadEntity cadDimension"}
      opacity={opacity}
    >
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={16 / zoom} />
      {mode !== "aligned" && (
        <>
          <line x1={sourceStart.x * BASE_SCALE} y1={sourceStart.y * BASE_SCALE} x2={x1} y2={y1} stroke={color} strokeWidth={1.1 / zoom} strokeDasharray={extensionDash} />
          <line x1={sourceEnd.x * BASE_SCALE} y1={sourceEnd.y * BASE_SCALE} x2={x2} y2={y2} stroke={color} strokeWidth={1.1 / zoom} strokeDasharray={extensionDash} />
        </>
      )}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={(selected ? 2.2 : 1.6) / zoom}
        markerStart="url(#cadArrowStart)"
        markerEnd="url(#cadArrowEnd)"
      />
      <line x1={x1 - normal.x * tick} y1={y1 - normal.y * tick} x2={x1 + normal.x * tick} y2={y1 + normal.y * tick} stroke={color} strokeWidth={1.4 / zoom} />
      <line x1={x2 - normal.x * tick} y1={y2 - normal.y * tick} x2={x2 + normal.x * tick} y2={y2 + normal.y * tick} stroke={color} strokeWidth={1.4 / zoom} />
      <g transform={`translate(${labelPoint.x * BASE_SCALE} ${labelPoint.y * BASE_SCALE})`} pointerEvents="none">
        <rect x={-labelWidth / 2} y={-labelHeight / 2} width={labelWidth} height={labelHeight} rx={4 / zoom} fill="rgba(255,250,246,.96)" stroke={color} strokeWidth={.8 / zoom} />
        <text textAnchor="middle" y={3.5 * scale / zoom} fontSize={10.5 * scale / zoom} fontWeight="700" fill="#5f2231">{label}</text>
      </g>
      {entity.metadata?.associativeDimension === true && (
        <text x={labelPoint.x * BASE_SCALE + labelWidth / 2 + 4 / zoom} y={labelPoint.y * BASE_SCALE - labelHeight / 2} fontSize={8 / zoom} fill="#76545c">A</text>
      )}
    </g>
  );
}
