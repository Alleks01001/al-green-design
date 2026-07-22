import { distance } from "./geometry";
import type { DimensionMode, DimensionUnit, Vec2 } from "../../types/domain";

export type DimensionGeometry = {
  sourceStart: Vec2;
  sourceEnd: Vec2;
  lineStart: Vec2;
  lineEnd: Vec2;
  labelPoint: Vec2;
  measuredMeters: number;
};

export function resolveDimensionGeometry(sourceStart: Vec2, sourceEnd: Vec2, mode: DimensionMode): DimensionGeometry {
  const midpoint = { x: (sourceStart.x + sourceEnd.x) / 2, y: (sourceStart.y + sourceEnd.y) / 2 };
  const lineStart = mode === "horizontal"
    ? { x: sourceStart.x, y: midpoint.y }
    : mode === "vertical" ? { x: midpoint.x, y: sourceStart.y } : sourceStart;
  const lineEnd = mode === "horizontal"
    ? { x: sourceEnd.x, y: midpoint.y }
    : mode === "vertical" ? { x: midpoint.x, y: sourceEnd.y } : sourceEnd;
  const measuredMeters = mode === "horizontal"
    ? Math.abs(sourceEnd.x - sourceStart.x)
    : mode === "vertical" ? Math.abs(sourceEnd.y - sourceStart.y) : distance(sourceStart, sourceEnd);
  return {
    sourceStart,
    sourceEnd,
    lineStart,
    lineEnd,
    labelPoint: { x: (lineStart.x + lineEnd.x) / 2, y: (lineStart.y + lineEnd.y) / 2 },
    measuredMeters
  };
}

export function formatDimensionValue(lengthMeters: number, unit: DimensionUnit, decimals: number) {
  const precision = Math.min(3, Math.max(0, Math.round(decimals)));
  const factor = unit === "mm" ? 1000 : unit === "cm" ? 100 : 1;
  return `${(lengthMeters * factor).toFixed(precision)} ${unit}`;
}
