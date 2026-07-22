import type { TerrainModel, TerrainPoint } from "@/types/domain";

export type TerrainMetrics = {
  minElevation: number; maxElevation: number; averageElevation: number;
  cutVolume: number; fillVolume: number; netVolume: number;
};

export function createTerrainGrid(width = 20, depth = 16, resolutionX = 9, resolutionZ = 7): TerrainPoint[] {
  const points: TerrainPoint[] = [];
  for (let z = 0; z < resolutionZ; z += 1) {
    for (let x = 0; x < resolutionX; x += 1) {
      const px = -width / 2 + (x / Math.max(1, resolutionX - 1)) * width;
      const pz = -depth / 2 + (z / Math.max(1, resolutionZ - 1)) * depth;
      const elevation = Math.sin(px * 0.22) * 0.28 + Math.cos(pz * 0.25) * 0.18 + (px / width) * 0.55;
      points.push({ id: `terrain-${x}-${z}`, x: px, z: pz, elevation: Number(elevation.toFixed(3)) });
    }
  }
  return points;
}

export function elevationAt(terrain: TerrainModel, x: number, z: number) {
  if (!terrain.enabled || terrain.points.length === 0) return terrain.baseElevation;
  let weightSum = 0;
  let elevationSum = 0;
  for (const point of terrain.points) {
    const d2 = (point.x - x) ** 2 + (point.z - z) ** 2;
    const weight = 1 / Math.max(0.04, d2);
    weightSum += weight;
    elevationSum += (point.elevation + terrain.baseElevation) * weight;
  }
  return elevationSum / Math.max(weightSum, 0.0001);
}

export function terrainMetrics(terrain: TerrainModel): TerrainMetrics {
  if (terrain.points.length === 0) return { minElevation: 0, maxElevation: 0, averageElevation: 0, cutVolume: 0, fillVolume: 0, netVolume: 0 };
  const elevations = terrain.points.map(point => point.elevation + terrain.baseElevation);
  const cellArea = (terrain.width / Math.max(1, terrain.resolutionX - 1)) * (terrain.depth / Math.max(1, terrain.resolutionZ - 1));
  let cutVolume = 0;
  let fillVolume = 0;
  for (const elevation of elevations) {
    const delta = elevation - terrain.cutFillReference;
    if (delta > 0) cutVolume += delta * cellArea;
    else fillVolume += Math.abs(delta) * cellArea;
  }
  cutVolume /= 4;
  fillVolume /= 4;
  return {
    minElevation: Math.min(...elevations), maxElevation: Math.max(...elevations),
    averageElevation: elevations.reduce((sum, value) => sum + value, 0) / elevations.length,
    cutVolume, fillVolume, netVolume: fillVolume - cutVolume
  };
}

export function applyTerrainPreset(terrain: TerrainModel, preset: "flat" | "slope" | "mound" | "swale"): TerrainModel {
  const points = terrain.points.map(point => {
    let elevation = 0;
    if (preset === "slope") elevation = (point.x / Math.max(terrain.width, 1)) * 1.6;
    if (preset === "mound") elevation = Math.max(0, 1.4 - Math.hypot(point.x, point.z) * 0.13);
    if (preset === "swale") elevation = -Math.max(0, 0.9 - Math.abs(point.x) * 0.13) + Math.abs(point.z) * 0.015;
    return { ...point, elevation: Number(elevation.toFixed(3)) };
  });
  return { ...terrain, points };
}
