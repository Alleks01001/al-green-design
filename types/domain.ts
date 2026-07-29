export type Id = string;
export type Vec2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };

export type EntityKind =
  | "surface" | "wall" | "path" | "plant" | "water" | "building" | "furniture" | "annotation";
export type CadShape = "rectangle" | "line" | "polyline" | "circle" | "ellipse" | "polygon" | "symbol";
export type CadTool =
  | "select" | "pan" | "move"
  | "line" | "polyline" | "freehand" | "rectangle" | "rounded" | "circle" | "ellipse" | "polygon"
  | "triangle" | "pentagon" | "hexagon" | "star"
  | "wall" | "fence" | "hedge" | "path" | "terrace" | "bed" | "water" | "pool" | "stairs" | "plant" | "dimension";
export type SnapMode = "grid" | "endpoint" | "midpoint" | "center" | "intersection";
export type DimensionMode = "aligned" | "horizontal" | "vertical";
export type DimensionUnit = "m" | "cm" | "mm";
export type DimensionSettings = {
  mode: DimensionMode;
  unit: DimensionUnit;
  decimals: 0 | 1 | 2 | 3;
  textScale: number;
};
export type BimUnit = "m" | "m²" | "m³" | "Stk.";
export type ProjectPhase = "Bestand" | "Abbruch" | "Neubau" | "Optional";
export type MaintenanceCycle = "keine" | "monatlich" | "quartalsweise" | "jährlich" | "mehrjährig";
export type LightRequirement = "sun" | "partial-shade" | "shade";
export type SoilType = "any" | "loam" | "sand" | "clay" | "acidic" | "calcareous";
export type SiteMoisture = "dry" | "fresh" | "moist";

export type LinePattern = "solid" | "dashed" | "dotted";

export type CadEntity = {
  id: Id; kind: EntityKind; shape: CadShape; name: string;
  points: Vec2[]; position: Vec2; width: number; depth: number; height: number;
  radius?: number; rotation: number; layerId: Id; elevationOffset?: number; materialId?: Id;
  fillColor?: string; strokeColor?: string; opacity?: number; strokeWidth?: number;
  linePattern?: LinePattern; arrowStart?: boolean; arrowEnd?: boolean;
  objectDefinitionId?: Id;
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
  cultivar?: string; usage?: string[]; plantingQuality?: string; siteNote?: string;
  droughtTolerance?: 1 | 2 | 3 | 4 | 5; toxicity?: "none" | "mild" | "toxic";
  sourceBasis?: string;
};
export type PlantingSettings = {
  siteLight: LightRequirement; soil: SoilType; moisture: SiteMoisture;
  hardinessZone: number; growthYears: number;
};
export type MaterialDefinition = {
  id: Id; name: string;
  category: "stone" | "wood" | "concrete" | "metal" | "glass" | "fabric" | "paving" | "soil" | "water";
  color: string; roughness: number; metalness: number; pricePerSquareMeter: number;
  specification?: string; priceUnit?: BimUnit; embodiedCarbonKgPerUnit?: number;
  serviceLifeYears?: number; frostResistant?: boolean; waterPermeable?: boolean;
  technicalNote?: string; sourceBasis?: string;
};
export type HistoryEntry = { id: Id; label: string; timestamp: number };
export type BlockDefinition = {
  id: Id;
  name: string;
  createdAt: number;
  entities: CadEntity[];
  bim: BimProperties[];
};
export type RenderPreset = "daylight" | "golden-hour" | "overcast" | "night";
export type RenderQuality = "preview" | "high" | "ultra";
export type RenderSettings = {
  preset: RenderPreset;
  quality: RenderQuality;
  hour: number;
  azimuth: number;
  exposure: number;
  shadowStrength: number;
  ambientStrength: number;
  fogEnabled: boolean;
  fogDensity: number;
  gridVisible3d: boolean;
};

export type PlanReference = {
  dataUrl: string;
  name: string;
  visible: boolean;
  opacity: number;
  width: number;
  depth: number;
  sourceType?: "image" | "pdf";
  sourcePage?: number;
  sourcePageCount?: number;
};

export type ProjectState = {
  schemaVersion: string;
  id: Id; name: string; entities: CadEntity[]; bim: BimProperties[]; layers: Layer[];
  terrain: TerrainModel; plantingSettings: PlantingSettings; renderSettings: RenderSettings; planReference?: PlanReference;
  blockDefinitions: BlockDefinition[]; orthogonalMode: boolean; nudgeStep: number;
  dimensionSettings: DimensionSettings;
  selectedIds: Id[]; activeLayerId: Id; activeTool: CadTool; viewMode: "2d" | "3d" | "front" | "side" | "split";
  gridSize: number; gridVisible: boolean; snapEnabled: boolean; snapModes: SnapMode[]; showDimensions: boolean;
  projectCurrency: "EUR"; vatPercent: number;
};
export type ProjectFile = {
  application: "AL Green Design Studio";
  version: string;
  savedAt: string;
  project: ProjectState;
};
