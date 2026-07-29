"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useMemo } from "react";
import { elevationAt } from "@/engines/terrain/terrainEngine";
import { useProjectStore } from "@/stores/projectStore";
import type { CadEntity } from "@/types/domain";

type ElevationDirection = "front" | "side";

const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 720;
const MARGIN_X = 72;
const MARGIN_Y = 62;

function objectColor(entity: CadEntity) {
  if (entity.fillColor) return entity.fillColor;
  if (entity.kind === "plant") return "#4e7d4f";
  if (entity.kind === "water") return "#56a6c4";
  if (entity.kind === "building") return "#d4cbc3";
  if (entity.kind === "wall") return "#97877b";
  if (entity.kind === "path" || /terrasse/i.test(entity.name)) return "#b08c68";
  if (entity.kind === "furniture") return "#896650";
  return "#88a481";
}

function horizontalExtent(entity: CadEntity, direction: ElevationDirection) {
  if ((entity.shape === "line" || entity.shape === "polyline" || entity.shape === "polygon") && entity.points.length > 0) {
    const values = entity.points.map(point => direction === "front" ? point.x : point.y);
    return { min: Math.min(...values), max: Math.max(...values) };
  }
  const angle = entity.rotation * Math.PI / 180;
  const half = direction === "front"
    ? Math.abs(Math.cos(angle)) * entity.width / 2 + Math.abs(Math.sin(angle)) * entity.depth / 2
    : Math.abs(Math.sin(angle)) * entity.width / 2 + Math.abs(Math.cos(angle)) * entity.depth / 2;
  const center = direction === "front" ? entity.position.x : entity.position.y;
  return { min: center - Math.max(.03, half), max: center + Math.max(.03, half) };
}

function formatElevation(value: number) {
  const normalized = Math.abs(value) < .0005 ? 0 : value;
  return `${normalized >= 0 ? "+" : "−"}${Math.abs(normalized).toFixed(2)} m`;
}

export function ElevationViewport({ direction }: { direction: ElevationDirection }) {
  const store = useProjectStore();
  const { entities, layers, terrain, selectedIds, setSelectedIds, activeLayerId } = store;
  const layerMap = useMemo(() => new Map(layers.map(layer => [layer.id, layer])), [layers]);
  const visibleEntities = useMemo(
    () => entities.filter(entity => entity.visible && entity.kind !== "annotation" && layerMap.get(entity.layerId)?.visible !== false),
    [entities, layerMap]
  );

  const terrainHalfSpan = direction === "front" ? terrain.width / 2 : terrain.depth / 2;
  const extents = visibleEntities.map(entity => horizontalExtent(entity, direction));
  const minHorizontal = Math.min(-terrainHalfSpan, ...extents.map(extent => extent.min), -5);
  const maxHorizontal = Math.max(terrainHalfSpan, ...extents.map(extent => extent.max), 5);
  const terrainProfile = Array.from({ length: 81 }, (_, index) => {
    const horizontal = minHorizontal + (index / 80) * (maxHorizontal - minHorizontal);
    const x = direction === "front" ? horizontal : 0;
    const z = direction === "side" ? horizontal : 0;
    return { horizontal, elevation: elevationAt(terrain, x, z) };
  });

  const objectElevations = visibleEntities.flatMap(entity => {
    const layerElevation = layerMap.get(entity.layerId)?.elevation ?? 0;
    const base = elevationAt(terrain, entity.position.x, entity.position.y) + layerElevation + (entity.elevationOffset ?? 0);
    return [base, base + Math.max(.04, entity.height)];
  });
  const referenceElevations = layers.filter(layer => layer.visible).map(layer => terrain.baseElevation + layer.elevation);
  const minElevation = Math.min(0, ...terrainProfile.map(point => point.elevation), ...objectElevations, ...referenceElevations) - .6;
  const maxElevation = Math.max(3, ...terrainProfile.map(point => point.elevation), ...objectElevations, ...referenceElevations) + .8;
  const horizontalSpan = Math.max(1, maxHorizontal - minHorizontal);
  const verticalSpan = Math.max(1, maxElevation - minElevation);
  const scale = Math.min((VIEW_WIDTH - MARGIN_X * 2) / horizontalSpan, (VIEW_HEIGHT - MARGIN_Y * 2) / verticalSpan);
  const drawingWidth = horizontalSpan * scale;
  const drawingHeight = verticalSpan * scale;
  const originX = (VIEW_WIDTH - drawingWidth) / 2;
  const originY = (VIEW_HEIGHT - drawingHeight) / 2;
  const mapX = (value: number) => originX + (value - minHorizontal) * scale;
  const mapY = (value: number) => originY + drawingHeight - (value - minElevation) * scale;
  const terrainPath = terrainProfile.map((point, index) => `${index === 0 ? "M" : "L"} ${mapX(point.horizontal)} ${mapY(point.elevation)}`).join(" ");
  const terrainFill = `${terrainPath} L ${mapX(maxHorizontal)} ${mapY(minElevation)} L ${mapX(minHorizontal)} ${mapY(minElevation)} Z`;
  const meterStart = Math.ceil(minElevation);
  const meterEnd = Math.floor(maxElevation);
  const meterLines = Array.from({ length: Math.max(0, meterEnd - meterStart + 1) }, (_, index) => meterStart + index);

  const levelGroups = Array.from(
    layers.filter(layer => layer.visible).reduce((groups, layer) => {
      const key = layer.elevation.toFixed(3);
      const existing = groups.get(key) ?? { elevation: layer.elevation, names: [] as string[], active: false };
      existing.names.push(layer.name);
      existing.active ||= layer.id === activeLayerId;
      groups.set(key, existing);
      return groups;
    }, new Map<string, { elevation: number; names: string[]; active: boolean }>())
  ).map(([, group]) => group);

  function selectEntity(event: ReactMouseEvent<SVGGElement>, id: string) {
    event.stopPropagation();
    if (event.shiftKey) {
      setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(selectedId => selectedId !== id) : [...selectedIds, id]);
    } else {
      setSelectedIds([id]);
    }
  }

  return (
    <section className="viewportCard elevationCard">
      <div className="viewportTitle">
        <strong>{direction === "front" ? "FRONTANSICHT" : "SEITENANSICHT"} · HÖHENEBENEN</strong>
        <span>Objekte anklicken · Umschalt für Mehrfachauswahl · gleiche Maßstäbe X/Z</span>
      </div>
      <div className="elevationBadge">
        <strong>{layerMap.get(activeLayerId)?.name ?? "Keine Ebene"}</strong>
        <span>{formatElevation(layerMap.get(activeLayerId)?.elevation ?? 0)}</span>
      </div>
      <svg
        className="elevationViewport"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={direction === "front" ? "Frontansicht des Projekts" : "Seitenansicht des Projekts"}
        onClick={() => setSelectedIds([])}
      >
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#f6f1ef" />
        <g className="elevationGrid">
          {meterLines.map(meter => (
            <g key={meter}>
              <line x1={originX} y1={mapY(meter)} x2={originX + drawingWidth} y2={mapY(meter)} />
              <text x={originX - 10} y={mapY(meter) + 4} textAnchor="end">{formatElevation(meter)}</text>
            </g>
          ))}
        </g>
        <path d={terrainFill} fill="#dbe5d5" />
        <path d={terrainPath} fill="none" stroke="#557451" strokeWidth="3" />
        <g className="elevationLevels">
          {levelGroups.map(level => {
            const absoluteElevation = terrain.baseElevation + level.elevation;
            const names = level.names.length > 2 ? `${level.names[0]} +${level.names.length - 1}` : level.names.join(" · ");
            return (
              <g key={`${level.elevation}:${names}`} className={level.active ? "active" : ""}>
                <line x1={originX} y1={mapY(absoluteElevation)} x2={originX + drawingWidth} y2={mapY(absoluteElevation)} />
                <text x={originX + 8} y={mapY(absoluteElevation) - 7}>{names} · {formatElevation(level.elevation)}</text>
              </g>
            );
          })}
        </g>
        <g className="elevationObjects">
          {visibleEntities.map(entity => {
            const extent = horizontalExtent(entity, direction);
            const layer = layerMap.get(entity.layerId);
            const base = elevationAt(terrain, entity.position.x, entity.position.y) + (layer?.elevation ?? 0) + (entity.elevationOffset ?? 0);
            const top = base + Math.max(.04, entity.height);
            const x = mapX(extent.min);
            const width = Math.max(3, mapX(extent.max) - x);
            const y = mapY(top);
            const height = Math.max(3, mapY(base) - y);
            const selected = selectedIds.includes(entity.id);
            const color = objectColor(entity);
            if (entity.kind === "plant") {
              const centerX = x + width / 2;
              const crownHeight = Math.max(height * .58, 8);
              return (
                <g key={entity.id} className={selected ? "selected" : ""} onClick={event => selectEntity(event, entity.id)}>
                  <line className="plantTrunk" x1={centerX} y1={mapY(base)} x2={centerX} y2={y + crownHeight * .72} />
                  <ellipse className="plantCrown" cx={centerX} cy={y + crownHeight / 2} rx={Math.max(7, width / 2)} ry={crownHeight / 2} fill={color} />
                  <text x={centerX} y={y - 7} textAnchor="middle">{entity.name}</text>
                </g>
              );
            }
            return (
              <g key={entity.id} className={selected ? "selected" : ""} onClick={event => selectEntity(event, entity.id)}>
                <rect x={x} y={y} width={width} height={height} rx={Math.min(5, height / 3)} fill={color} fillOpacity={entity.opacity ?? .9} />
                {(selected || width > 64) && <text x={x + width / 2} y={Math.max(originY + 12, y - 7)} textAnchor="middle">{entity.name}</text>}
              </g>
            );
          })}
        </g>
        <line className="elevationDatum" x1={originX} y1={mapY(0)} x2={originX + drawingWidth} y2={mapY(0)} />
        <text className="elevationAxisLabel" x={originX + drawingWidth} y={originY + drawingHeight + 28} textAnchor="end">
          {direction === "front" ? "Breite X" : "Tiefe Y"} · {horizontalSpan.toFixed(1)} m
        </text>
      </svg>
    </section>
  );
}
