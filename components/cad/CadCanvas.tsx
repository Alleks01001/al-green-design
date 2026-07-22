"use client";

import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { boundsIntersect, distance, entityBounds, entityCenter, makeId, polylineLength, roundMetric, translateEntity } from "@/core/cad/geometry";
import { snapPoint, type SnapResult } from "@/core/cad/snap";
import { useProjectStore } from "@/stores/projectStore";
import type { CadEntity, Vec2 } from "@/types/domain";

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 700;
const BASE_SCALE = 42;

const TOOL_HELP: Record<string, string> = {
  select: "Objekte anklicken oder Auswahlfenster ziehen",
  pan: "Zeichenfläche ziehen · Mausrad zum Zoomen",
  move: "Objekt oder Auswahl ziehen",
  line: "Startpunkt und Endpunkt setzen",
  polyline: "Punkte setzen · mit Enter oder Fertig abschließen",
  rectangle: "Zwei gegenüberliegende Ecken setzen",
  circle: "Mittelpunkt und Radius setzen",
  wall: "Startpunkt und Endpunkt der Mauer setzen",
  plant: "Pflanze mit einem Klick platzieren"
};

type DragState =
  | { type: "pan"; startSvg: Vec2; currentSvg: Vec2; originPan: Vec2 }
  | { type: "move"; startWorld: Vec2; currentWorld: Vec2; ids: string[] }
  | { type: "marquee"; startWorld: Vec2; currentWorld: Vec2 }
  | null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function colorForEntity(entity: CadEntity) {
  if (entity.kind === "building") return "#c9beb5";
  if (entity.kind === "plant") return "#4e8757";
  if (entity.kind === "wall") return "#786e68";
  if (entity.kind === "water") return "#5ca5c6";
  if (entity.name.toLowerCase().includes("terrasse")) return "#b08c67";
  if (entity.kind === "path") return "#bca986";
  return "#8db28b";
}

function snapLabel(mode: SnapResult["mode"]) {
  if (mode === "endpoint") return "END";
  if (mode === "midpoint") return "MITTE";
  if (mode === "center") return "ZENTRUM";
  if (mode === "grid") return "RASTER";
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
    showDimensions,
    setSelectedIds,
    toggleSelectedId,
    addEntity,
    moveEntities,
    deleteSelected,
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
    () => entities.filter(entity => entity.visible && layerMap.get(entity.layerId)?.visible !== false),
    [entities, layerMap]
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

  function pointerWorld(event: ReactPointerEvent<SVGSVGElement>, useSnap = true) {
    const raw = svgToWorld(clientToSvg(event));
    return useSnap ? getSnapped(raw).point : raw;
  }

  function completePolyline() {
    if (draftPoints.length < 2) return;
    const id = makeId("polyline");
    addEntity({
      id,
      kind: "path",
      shape: "polyline",
      name: "Neue Polylinie",
      points: draftPoints,
      position: entityCenter({
        id,
        kind: "path",
        shape: "polyline",
        name: "",
        points: draftPoints,
        position: { x: 0, y: 0 },
        width: 0.18,
        depth: 0,
        height: 0.05,
        rotation: 0,
        layerId: activeLayerId,
        visible: true,
        locked: false
      }),
      width: 0.18,
      depth: polylineLength(draftPoints),
      height: 0.05,
      rotation: 0,
      layerId: activeLayerId,
      visible: true,
      locked: false
    }, "Polylinie erstellt");
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
        visible: true,
        locked: false
      }, "Pflanze platziert");
      return;
    }

    if (activeTool === "polyline") {
      setDraftPoints(current => [...current, point]);
      return;
    }

    if (!first) {
      setDraftPoints([point]);
      return;
    }

    if (distance(first, point) < 0.02) return;

    if (activeTool === "line") {
      addEntity({
        id: makeId("line"),
        kind: "annotation",
        shape: "line",
        name: "Neue Linie",
        points: [first, point],
        position: { x: (first.x + point.x) / 2, y: (first.y + point.y) / 2 },
        width: 0.04,
        depth: distance(first, point),
        height: 0.02,
        rotation: 0,
        layerId: activeLayerId,
        visible: true,
        locked: false
      }, "Linie erstellt");
    }

    if (activeTool === "wall") {
      addEntity({
        id: makeId("wall"),
        kind: "wall",
        shape: "line",
        name: "Neue Mauer",
        points: [first, point],
        position: { x: (first.x + point.x) / 2, y: (first.y + point.y) / 2 },
        width: 0.25,
        depth: distance(first, point),
        height: 1,
        rotation: 0,
        layerId: activeLayerId,
        materialId: "mat-concrete",
        visible: true,
        locked: false
      }, "Mauer erstellt");
    }

    if (activeTool === "rectangle") {
      const width = Math.abs(point.x - first.x);
      const depth = Math.abs(point.y - first.y);
      addEntity({
        id: makeId("surface"),
        kind: "surface",
        shape: "rectangle",
        name: "Neue Fläche",
        points: [],
        position: { x: (first.x + point.x) / 2, y: (first.y + point.y) / 2 },
        width,
        depth,
        height: 0.08,
        rotation: 0,
        layerId: activeLayerId,
        visible: true,
        locked: false
      }, "Rechteckfläche erstellt");
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
        height: 0.08,
        rotation: 0,
        layerId: activeLayerId,
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
    const snapped = getSnapped(rawWorld);
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

    if (["line", "polyline", "rectangle", "circle", "wall", "plant"].includes(activeTool)) {
      createFromPoint(snapped.point);
    }
  }

  function handleEntityPointerDown(event: ReactPointerEvent<SVGGElement>, entity: CadEntity) {
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    svg?.setPointerCapture(event.pointerId);
    const raw = svg ? svgToWorld(clientToSvg({ ...event, currentTarget: svg })) : entityCenter(entity);
    const layer = layerMap.get(entity.layerId);
    const isLocked = entity.locked || layer?.locked;
    if (isLocked) return;

    if (event.shiftKey || event.metaKey || event.ctrlKey) toggleSelectedId(entity.id);
    else if (!selectedIds.includes(entity.id)) setSelectedIds([entity.id]);

    if (activeTool === "move") {
      const ids = selectedIds.includes(entity.id) ? selectedIds : [entity.id];
      const start = getSnapped(raw, ids).point;
      setDrag({ type: "move", startWorld: start, currentWorld: start, ids });
    }
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const svgPoint = clientToSvg(event);
    const rawWorld = svgToWorld(svgPoint);
    const snapped = getSnapped(rawWorld, drag?.type === "move" ? drag.ids : []);
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
    }
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
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
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      } else if (event.key === "Escape") {
        setDraftPoints([]);
        setDrag(null);
        setSelectedIds([]);
      } else if (event.key === "Enter" && activeTool === "polyline") {
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

  function renderEntity(entity: CadEntity) {
    const selected = selectedIds.includes(entity.id);
    const layer = layerMap.get(entity.layerId);
    const locked = entity.locked || layer?.locked;
    const stroke = selected ? "#ffb84d" : layer?.color ?? "#5f1526";
    const strokeWidth = selected ? 4 / zoom : 2 / zoom;
    const fill = colorForEntity(entity);

    if (entity.shape === "line" || entity.shape === "polyline") {
      const points = entity.points.map(point => `${point.x * BASE_SCALE},${point.y * BASE_SCALE}`).join(" ");
      const wallWidth = entity.kind === "wall" ? Math.max(5, entity.width * BASE_SCALE) : Math.max(2, entity.width * BASE_SCALE);
      return (
        <g key={entity.id} onPointerDown={event => handleEntityPointerDown(event, entity)} className={locked ? "cadEntity locked" : "cadEntity"}>
          <polyline
            points={points}
            fill="none"
            stroke="transparent"
            strokeWidth={(wallWidth + 12) / zoom}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={points}
            fill="none"
            stroke={entity.kind === "wall" ? fill : stroke}
            strokeWidth={wallWidth / zoom}
            strokeLinecap={entity.kind === "wall" ? "square" : "round"}
            strokeLinejoin="round"
            opacity={locked ? 0.68 : 1}
          />
          {selected && <polyline points={points} fill="none" stroke="#ffcf77" strokeWidth={2 / zoom} strokeDasharray={`${8 / zoom} ${6 / zoom}`} />}
          {showDimensions && entity.points.length >= 2 && (
            <DimensionLabel point={entityCenter(entity)} text={`${roundMetric(polylineLength(entity.points))} m`} zoom={zoom} />
          )}
          {selected && entity.points.map((point, index) => (
            <circle key={index} cx={point.x * BASE_SCALE} cy={point.y * BASE_SCALE} r={5 / zoom} fill="#fff5e8" stroke="#7b1c31" strokeWidth={2 / zoom} />
          ))}
        </g>
      );
    }

    const x = entity.position.x * BASE_SCALE;
    const y = entity.position.y * BASE_SCALE;
    const width = entity.width * BASE_SCALE;
    const depth = entity.depth * BASE_SCALE;

    return (
      <g
        key={entity.id}
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
            fillOpacity={entity.kind === "surface" ? 0.68 : 0.92}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        ) : entity.kind === "plant" ? (
          <>
            <circle cx={0} cy={0} r={width / 2} fill={fill} fillOpacity={0.78} stroke={stroke} strokeWidth={strokeWidth} />
            <circle cx={0} cy={0} r={width * 0.28} fill="none" stroke="#eaf5df" strokeWidth={1.5 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`} />
            <path d={`M ${-width * 0.34} 0 H ${width * 0.34} M 0 ${-width * 0.34} V ${width * 0.34}`} stroke="#eaf5df" strokeWidth={1.2 / zoom} />
          </>
        ) : (
          <rect
            x={-width / 2}
            y={-depth / 2}
            width={width}
            height={depth}
            rx={entity.kind === "surface" ? 4 / zoom : 1 / zoom}
            fill={fill}
            fillOpacity={entity.kind === "surface" ? 0.68 : 0.92}
            stroke={stroke}
            strokeWidth={strokeWidth}
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
        <strong>2D CAD CORE 2.1</strong>
        <span>{TOOL_HELP[activeTool]}</span>
      </div>
      <div className="cadHud cadHudRight">
        <span>Zoom {Math.round(zoom * 100)} %</span>
        <span>Layer {activeLayer?.name ?? "–"}</span>
      </div>
      {activeTool === "polyline" && draftPoints.length >= 2 && (
        <div className="draftActions">
          <button type="button" onClick={completePolyline}>✓ Polylinie fertig</button>
          <button type="button" onClick={() => setDraftPoints([])}>Abbrechen</button>
        </div>
      )}
      <svg
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
        </defs>
        <rect x={-VIEW_WIDTH / 2} y={-VIEW_HEIGHT / 2} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#f5f1f1" />
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {gridVisible && <rect x={-3000} y={-3000} width={6000} height={6000} fill="url(#majorGrid21)" />}
          <line x1={-3000} y1={0} x2={3000} y2={0} stroke="#9c6673" strokeWidth={1.2 / zoom} />
          <line x1={0} y1={-3000} x2={0} y2={3000} stroke="#789071" strokeWidth={1.2 / zoom} />
          {displayedEntities.map(renderEntity)}

          {draftPoints.length > 0 && (
            <g className="draftGeometry">
              {activeTool === "polyline" ? (
                <polyline
                  points={[...draftPoints, previewPoint].map(point => `${point.x * BASE_SCALE},${point.y * BASE_SCALE}`).join(" ")}
                  fill="none"
                  stroke="#d4823b"
                  strokeWidth={2.5 / zoom}
                  strokeDasharray={`${8 / zoom} ${5 / zoom}`}
                />
              ) : activeTool === "rectangle" && firstDraft ? (
                <rect
                  x={Math.min(firstDraft.x, previewPoint.x) * BASE_SCALE}
                  y={Math.min(firstDraft.y, previewPoint.y) * BASE_SCALE}
                  width={Math.abs(previewPoint.x - firstDraft.x) * BASE_SCALE}
                  height={Math.abs(previewPoint.y - firstDraft.y) * BASE_SCALE}
                  fill="#d7aa72"
                  fillOpacity={0.22}
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
                  x1={firstDraft.x * BASE_SCALE}
                  y1={firstDraft.y * BASE_SCALE}
                  x2={previewPoint.x * BASE_SCALE}
                  y2={previewPoint.y * BASE_SCALE}
                  stroke={activeTool === "wall" ? "#786e68" : "#d4823b"}
                  strokeWidth={activeTool === "wall" ? Math.max(5, 0.25 * BASE_SCALE) / zoom : 2.5 / zoom}
                  strokeDasharray={activeTool === "wall" ? undefined : `${8 / zoom} ${5 / zoom}`}
                />
              ) : null}
              {draftPoints.map((point, index) => <circle key={index} cx={point.x * BASE_SCALE} cy={point.y * BASE_SCALE} r={4.5 / zoom} fill="#fff" stroke="#d4823b" strokeWidth={2 / zoom} />)}
            </g>
          )}

          {marquee && <rect {...marquee} fill="#5b8fb9" fillOpacity={0.14} stroke="#356b93" strokeWidth={1.5 / zoom} strokeDasharray={`${7 / zoom} ${4 / zoom}`} />}

          {currentSnap.mode && !drag && (
            <g transform={`translate(${currentSnap.point.x * BASE_SCALE} ${currentSnap.point.y * BASE_SCALE})`} pointerEvents="none">
              {currentSnap.mode === "endpoint" && <rect x={-5 / zoom} y={-5 / zoom} width={10 / zoom} height={10 / zoom} fill="none" stroke="#ff8b2e" strokeWidth={2 / zoom} />}
              {currentSnap.mode === "midpoint" && <path d={`M 0 ${-7 / zoom} L ${7 / zoom} ${6 / zoom} L ${-7 / zoom} ${6 / zoom} Z`} fill="none" stroke="#ff8b2e" strokeWidth={2 / zoom} />}
              {currentSnap.mode === "center" && <circle r={6 / zoom} fill="none" stroke="#ff8b2e" strokeWidth={2 / zoom} />}
              {currentSnap.mode === "grid" && <path d={`M ${-5 / zoom} 0 H ${5 / zoom} M 0 ${-5 / zoom} V ${5 / zoom}`} stroke="#ff8b2e" strokeWidth={2 / zoom} />}
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
