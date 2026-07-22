export type Id = string;
export type Vec2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };

export type EntityKind =
  | "surface" | "wall" | "path" | "plant" | "water" | "building" | "furniture" | "annotation";
export type CadShape = "rectangle" | "line" | "polyline" | "circle" | "symbol";
export type CadTool = "select" | "pan" | "move" | "line" | "polyline" | "rectangle" | "circle" | "wall" | "plant";
export type SnapMode = "grid" | "endpoint" | "midpoint" | "center";
export type BimUnit = "m" | "m²" | "m³" | "Stk.";
export type ProjectPhase = "Bestand" | "Abbruch" | "Neubau" | "Optional";
export type MaintenanceCycle = "keine" | "monatlich" | "quartalsweise" | "jährlich" | "mehrjährig";
export type LightRequirement = "sun" | "partial-shade" | "shade";
export type SoilType = "any" | "loam" | "sand" | "clay" | "acidic" | "calcareous";
export type SiteMoisture = "dry" | "fresh" | "moist";

export type CadEntity = {
  id: Id; kind: EntityKind; shape: CadShape; name: string;
  points: Vec2[]; position: Vec2; width: number; depth: number; height: number;
  radius?: number; rotation: number; layerId: Id; materialId?: Id;
  visible: boolean; locked: boolean; metadata?: Record<string, string | number | boolean>;
};

export type BimProperties = {
  entityId: Id; category: string; classification: string; phase: ProjectPhase;
  manufacturer?: string; model?: string; articleNumber?: string; unit: BimUnit;
  quantity: number; wastePercent: number; unitPrice: number; laborUnitPrice: number;
  carbonKgPerUnit: number; lifespanYears?: number; maintenanceCycle: MaintenanceCycle;
  warrantyYears?: number; supplier?: string; notes?: string;
  custom: Record<string, string | number | boolean>;
};

export type TerrainPoint = { id: Id; x: number; z: number; elevation: number };
export type TerrainModel = {
  enabled: boolean; width: number; depth: number; resolutionX: number; resolutionZ: number;
  baseElevation: number; contourInterval: number; points: TerrainPoint[]; cutFillReference: number;
};

export type Layer = {
  id: Id; name: string; color: string; visible: boolean; locked: boolean;
  printable: boolean; opacity: number; elevation: number;
};
export type PlantDefinition = {
  id: Id; commonName: string; botanicalName: string;
  category: "tree" | "shrub" | "hedge" | "perennial" | "grass";
  matureHeight: number; matureWidth: number; spacing: number;
  light: LightRequirement; waterNeed: 1 | 2 | 3 | 4 | 5;
  soil: SoilType[]; moisture: SiteMoisture[]; hardinessZoneMin: number; hardinessZoneMax: number;
  bloomMonths: number[]; flowerColor: string; evergreen: boolean; native: boolean;
  pollinatorValue: 1 | 2 | 3 | 4 | 5; growthRate: "slow" | "medium" | "fast";
};
export type PlantingSettings = {
  siteLight: LightRequirement; soil: SoilType; moisture: SiteMoisture;
  hardinessZone: number; growthYears: number;
};
export type MaterialDefinition = {
  id: Id; name: string;
  category: "stone" | "wood" | "concrete" | "metal" | "glass" | "paving" | "soil" | "water";
  color: string; roughness: number; metalness: number; pricePerSquareMeter: number;
};
export type HistoryEntry = { id: Id; label: string; timestamp: number };

export type ProjectState = {
  schemaVersion: "2.4";
  id: Id; name: string; entities: CadEntity[]; bim: BimProperties[]; layers: Layer[];
  terrain: TerrainModel; plantingSettings: PlantingSettings;
  selectedIds: Id[]; activeLayerId: Id; activeTool: CadTool; viewMode: "2d" | "3d" | "split";
  gridSize: number; gridVisible: boolean; snapEnabled: boolean; snapModes: SnapMode[]; showDimensions: boolean;
  projectCurrency: "EUR"; vatPercent: number;
};
export type ProjectFile = {
  application: "AL Green Design Studio";
  version: "2.4";
  savedAt: string;
  project: ProjectState;
};
