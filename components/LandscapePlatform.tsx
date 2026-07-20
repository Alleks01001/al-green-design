
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ImportedReliefModel, IMPORTED_MODEL_STORAGE_KEY } from '@/types/importedModel';

type ViewMode = '2d' | '3d' | 'splitVertical' | 'splitHorizontal';
type Tab = 'dashboard' | 'project' | 'chat' | 'image' | 'video3d' | 'terrain' | 'hardscape' | 'architecture' | 'building' | 'scan' | 'library' | 'materials' | 'layers' | 'costs' | 'analysis' | 'water' | 'climate' | 'agents' | 'scene' | 'reports' | 'export';
type Tool = 'select' | 'terrain' | 'gardenWall' | 'mound' | 'depression' | 'plantZone' | 'hardscape' | 'building' | 'pool' | 'pond' | 'pergola' | 'wall' | 'fence' | 'gate' | 'stairs' | 'path' | 'tree' | 'shrub' | 'hedge' | 'planter' | 'bench' | 'light' | 'firepit' | 'rock' | 'irrigation' | 'drainage' | 'floor' | 'interiorWall' | 'roof' | 'window' | 'door' | 'slidingDoor' | 'balcony' | 'railing' | 'column' | 'carport' | 'winterGarden';

type ElevationPoint = {
  id: number;
  x: number;
  y: number;
  elevation: number;
  kind: 'existing' | 'proposed';
  name: string;
};

type TerrainAnalysis = {
  cutVolume: number;
  fillVolume: number;
  netVolume: number;
  minExisting: number;
  maxExisting: number;
  minProposed: number;
  maxProposed: number;
  sampleCount: number;
};

type PlantCategory = 'tree' | 'shrub' | 'hedge' | 'perennial' | 'grass';
type PlantLight = 'Sonne' | 'Halbschatten' | 'Schatten';
type PlantWater = 1 | 2 | 3 | 4 | 5;

type PlantSpecies = {
  id: string;
  botanicalName: string;
  commonName: string;
  category: PlantCategory;
  objectType: 'tree' | 'shrub' | 'hedge';
  matureHeight: number;
  matureWidth: number;
  recommendedSpacing: number;
  growthRate: 'langsam' | 'mittel' | 'schnell';
  evergreen: boolean;
  bloomMonths: number[];
  bloomColor: string;
  foliageColor: string;
  light: PlantLight[];
  waterNeed: PlantWater;
  soil: string[];
  hardinessMin: number;
  hardinessMax: number;
  unitCost: number;
  plantForm: 'round' | 'columnar' | 'multiStem' | 'hedge' | 'perennial' | 'grass';
  notes: string;
};

type PlantCheck = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  objectIds: number[];
  title: string;
  message: string;
};


type PerformanceMode = 'auto' | 'quality' | 'balanced' | 'fast';

type SunHoursCell = {
  x: number;
  y: number;
  width: number;
  height: number;
  sunHours: number;
  sampleCount: number;
};

type FlowVectorCell = {
  x: number;
  y: number;
  toX: number;
  toY: number;
  slopePercent: number;
};

type LowPointCell = {
  x: number;
  y: number;
  z: number;
  catchmentScore: number;
};

type RetentionCell = {
  x: number;
  y: number;
  width: number;
  height: number;
  depthPotential: number;
};

type IrrigationZone = {
  id: string;
  name: string;
  color: string;
  emitterType: 'sprinkler' | 'drip';
  targetPressureBar: number;
  maxFlowLMin: number;
  enabled: boolean;
};

type IrrigationCheck = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  objectIds: number[];
};

type MaterialCategory =
  | 'stone'
  | 'wood'
  | 'concrete'
  | 'metal'
  | 'glass'
  | 'plaster'
  | 'paving'
  | 'gravel'
  | 'soil'
  | 'water';

type SurfaceLayer = {
  id: string;
  name: string;
  thicknessMm: number;
  materialId: string;
};

type MaterialDefinition = {
  id: string;
  name: string;
  category: MaterialCategory;
  baseColor: string;
  roughness: number;
  metalness: number;
  opacity: number;
  texturePattern: 'none' | 'stone' | 'wood' | 'concrete' | 'brick' | 'gravel' | 'planks' | 'water';
  textureScale: number;
  unitCostM2: number;
  description: string;
  recommendedFor: GardenObjectType[];
};

type PlanningPriority = 'design' | 'budget' | 'maintenance' | 'ecology' | 'family';

type PlanningBrief = {
  style: 'modern' | 'natural' | 'mediterranean' | 'minimal' | 'family';
  budget: number;
  priority: PlanningPriority;
  needsPool: boolean;
  needsTerrace: boolean;
  needsPergola: boolean;
  needsPlayArea: boolean;
  needsPrivacy: boolean;
  needsLowMaintenance: boolean;
  needsBiodiversity: boolean;
  targetPlantCount: number;
  notes: string;
};

type PlanningVariant = {
  id: string;
  name: string;
  concept: string;
  score: number;
  objects: GardenObject[];
  zones: Zone[];
  terrainBlobs: TerrainBlob[];
};

type AuditSeverity = 'info' | 'warning' | 'critical';

type ProjectAuditIssue = {
  id: string;
  severity: AuditSeverity;
  category: 'geometry' | 'terrain' | 'planting' | 'water' | 'sun' | 'materials' | 'budget' | 'architecture';
  title: string;
  message: string;
  objectIds: number[];
  fixable: boolean;
};

type ProjectAudit = {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  issues: ProjectAuditIssue[];
  strengths: string[];
  recommendations: string[];
  categoryScores: Record<string,number>;
};

type QuantityLine = {
  id: string;
  category: string;
  name: string;
  unit: 'Stk.' | 'm²' | 'm³' | 'lfm';
  quantity: number;
  unitPrice: number;
  total: number;
};

type PresentationPreset = 'overview' | 'day' | 'night' | 'growth10';
type Season = 'Frühling' | 'Sommer' | 'Herbst' | 'Winter';




type SelectedKind = 'terrain' | 'zone' | 'object' | 'room' | null;
type MoveStart = { id: number; x: number; y: number };
type Drag2D =
  | { mode: 'move'; kind: Exclude<SelectedKind, null>; id: number; pointerId: number; offsetX: number; offsetY: number; startPointerX: number; startPointerY: number; groupStart: MoveStart[] }
  | { mode: 'scale'; kind: 'object'; id: number; pointerId: number; startWidth: number; startDepth: number; startX: number; startY: number; rotation: number }
  | { mode: 'rotate'; kind: 'object'; id: number; pointerId: number; centerX: number; centerY: number; startAngle: number; startRotation: number }
  | null;

type EditorSnapshot = {
  terrainBlobs: TerrainBlob[];
  elevationPoints: ElevationPoint[];
  irrigationZones?: IrrigationZone[];
  zones: Zone[];
  objects: GardenObject[];
  rooms: Room[];
  levels: BuildingLevel[];
  activeLevel: number;
  importedModels: ImportedReliefModel[];
  projectInfo: ProjectInfo;
  createdAt: string;
  label: string;
};

type ContextMenuState = {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  targetKind: SelectedKind;
  targetId: number | null;
} | null;

type ProjectInfo = {
  name: string;
  location: string;
  budget: number;
  area: number;
};

type BuildingLevel = {
  id: number;
  name: string;
  elevation: number;
  height: number;
  visible: boolean;
};

type Room = {
  id: number;
  name: string;
  level: number;
  points: { x: number; y: number }[];
  area: number;
  color: string;
  source: 'auto' | 'manual';
};

type ChatEngine = 'local' | 'openai';

type AiChatRole = 'user' | 'assistant';

type AiChatMessage = {
  id: string;
  role: AiChatRole;
  content: string;
  createdAt: string;
  actionCount?: number;
};

type AiProjectActionType =
  | 'add_object' | 'update_object' | 'delete_object'
  | 'add_terrain' | 'update_terrain' | 'delete_terrain'
  | 'add_zone' | 'update_zone' | 'delete_zone'
  | 'update_project' | 'set_view' | 'select_object' | 'run_audit';

type AiProjectAction = {
  id: string;
  action: AiProjectActionType;
  targetId: number | null;
  objectType: GardenObjectType | null;
  zoneKind: Zone['kind'] | null;
  name: string | null;
  x: number | null;
  y: number | null;
  width: number | null;
  depth: number | null;
  height: number | null;
  rotation: number | null;
  radius: number | null;
  softness: number | null;
  color: string | null;
  material: string | null;
  note: string | null;
  budget: number | null;
  area: number | null;
  location: string | null;
  view: ViewMode | null;
  destructive: boolean;
  reason: string;
};

type TerrainBlob = {
  id: number;
  name: string;
  x: number;
  y: number;
  radius: number;
  height: number;
  softness: number;
  source: string;
};

type Zone = {
  id: number;
  kind: 'plantZone' | 'hardscape';
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  color: string;
};

type GardenObjectType = 'building' | 'pool' | 'pond' | 'pergola' | 'wall' | 'gardenWall' | 'fence' | 'gate' | 'stairs' | 'path' | 'tree' | 'shrub' | 'hedge' | 'planter' | 'bench' | 'light' | 'firepit' | 'rock' | 'irrigation' | 'drainage' | 'floor' | 'interiorWall' | 'roof' | 'window' | 'door' | 'slidingDoor' | 'balcony' | 'railing' | 'column' | 'carport' | 'winterGarden';

type GardenObject = {
  id: number;
  type: GardenObjectType;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  color: string;
  note?: string;
  material?: string;
  unitCost?: number;
  waterNeed?: number;
  lightNeed?: string;
  level?: number;
  thickness?: number;
  parentId?: number;
  subtype?: string;
  groupId?: string;
  hostOffset?: number;
  sillHeight?: number;
  wallNodeStart?: string;
  wallNodeEnd?: string;
  points?: { x:number; y:number }[];
  pathWidth?: number;
  curve?: boolean;
  startElevation?: number;
  endElevation?: number;
  stepCount?: number;
  riserHeight?: number;
  treadDepth?: number;
  foundationDepth?: number;
  capHeight?: number;
  speciesId?: string;
  botanicalName?: string;
  plantCategory?: PlantCategory;
  matureHeight?: number;
  matureWidth?: number;
  recommendedSpacing?: number;
  growthRate?: 'langsam' | 'mittel' | 'schnell';
  evergreen?: boolean;
  bloomMonths?: number[];
  bloomColor?: string;
  soilNeeds?: string[];
  hardinessMin?: number;
  hardinessMax?: number;
  plantForm?: PlantSpecies['plantForm'];
  siteLight?: PlantLight;
  plantingYear?: number;
  installationHeight?: number;
  installationWidth?: number;
  irrigationZoneId?: string;
  emitterType?: 'sprinkler' | 'drip';
  irrigationRadius?: number;
  irrigationArc?: number;
  irrigationFlowLMin?: number;
  pipeDiameterMm?: number;
  autoRouted?: boolean;
  sourceObjectId?: number;
  materialId?: string;
  textureScale?: number;
  roughnessOverride?: number;
  metalnessOverride?: number;
  surfaceLayers?: SurfaceLayer[];
};

const MATERIAL_LIBRARY: MaterialDefinition[] = [
  {id:'stone-gneiss',name:'Naturstein Gneis',category:'stone',baseColor:'#8b8178',roughness:0.9,metalness:0,opacity:1,texturePattern:'stone',textureScale:1.2,unitCostM2:135,description:'Lebendige Natursteinoberfläche für Wege, Mauern und Terrassen.',recommendedFor:['path','gardenWall','wall','stairs','floor']},
  {id:'stone-limestone',name:'Kalkstein hell',category:'stone',baseColor:'#d6c9b5',roughness:0.82,metalness:0,opacity:1,texturePattern:'stone',textureScale:1.4,unitCostM2:150,description:'Helle, elegante Natursteinoberfläche.',recommendedFor:['path','gardenWall','stairs','floor']},
  {id:'paving-anthracite',name:'Pflaster Anthrazit',category:'paving',baseColor:'#4b5563',roughness:0.86,metalness:0,opacity:1,texturePattern:'brick',textureScale:0.9,unitCostM2:92,description:'Modernes dunkles Betonpflaster.',recommendedFor:['path','floor']},
  {id:'paving-brick-red',name:'Ziegelpflaster Weinrot',category:'paving',baseColor:'#7f1d1d',roughness:0.88,metalness:0,opacity:1,texturePattern:'brick',textureScale:0.8,unitCostM2:108,description:'Warmtoniges Ziegelpflaster passend zum Burgundy-Branding.',recommendedFor:['path','floor']},
  {id:'gravel-light',name:'Kies hell',category:'gravel',baseColor:'#c9c2b8',roughness:1,metalness:0,opacity:1,texturePattern:'gravel',textureScale:0.55,unitCostM2:48,description:'Helle lose Kiesoberfläche.',recommendedFor:['path','floor']},
  {id:'gravel-dark',name:'Splitt Basalt',category:'gravel',baseColor:'#4a4a4a',roughness:1,metalness:0,opacity:1,texturePattern:'gravel',textureScale:0.5,unitCostM2:54,description:'Dunkler Basaltsplitt.',recommendedFor:['path','floor']},
  {id:'wood-larch',name:'Lärche natur',category:'wood',baseColor:'#a87345',roughness:0.72,metalness:0,opacity:1,texturePattern:'wood',textureScale:1.3,unitCostM2:115,description:'Natürliche Holzoberfläche für Terrassen und Pergolen.',recommendedFor:['floor','pergola','bench','fence','gate']},
  {id:'wood-thermo',name:'Thermoholz dunkel',category:'wood',baseColor:'#5b3a29',roughness:0.68,metalness:0,opacity:1,texturePattern:'planks',textureScale:1.1,unitCostM2:145,description:'Dunkles thermisch behandeltes Holz.',recommendedFor:['floor','pergola','bench','fence']},
  {id:'concrete-fairface',name:'Sichtbeton',category:'concrete',baseColor:'#a7a7a2',roughness:0.78,metalness:0,opacity:1,texturePattern:'concrete',textureScale:1.7,unitCostM2:125,description:'Ruhige moderne Sichtbetonoberfläche.',recommendedFor:['wall','gardenWall','floor','stairs','column']},
  {id:'concrete-warm',name:'Beton warmgrau',category:'concrete',baseColor:'#b7afa6',roughness:0.8,metalness:0,opacity:1,texturePattern:'concrete',textureScale:1.5,unitCostM2:98,description:'Warmer Betonfarbton für moderne Außenräume.',recommendedFor:['path','floor','gardenWall','stairs']},
  {id:'plaster-white',name:'Putz Weiß',category:'plaster',baseColor:'#f3f0ea',roughness:0.93,metalness:0,opacity:1,texturePattern:'concrete',textureScale:2.4,unitCostM2:52,description:'Feinkörniger heller Fassadenputz.',recommendedFor:['wall','interiorWall','building']},
  {id:'plaster-burgundy',name:'Putz Burgundy Akzent',category:'plaster',baseColor:'#7f1d1d',roughness:0.9,metalness:0,opacity:1,texturePattern:'concrete',textureScale:2.2,unitCostM2:68,description:'Weinroter Akzentputz passend zum Markenauftritt.',recommendedFor:['wall','building']},
  {id:'metal-anthracite',name:'Aluminium Anthrazit',category:'metal',baseColor:'#30343b',roughness:0.35,metalness:0.72,opacity:1,texturePattern:'none',textureScale:1,unitCostM2:190,description:'Pulverbeschichtetes Metall für Rahmen, Geländer und Pergolen.',recommendedFor:['railing','pergola','window','slidingDoor','gate','fence','column']},
  {id:'metal-burgundy',name:'Metall Weinrot',category:'metal',baseColor:'#6b1024',roughness:0.4,metalness:0.65,opacity:1,texturePattern:'none',textureScale:1,unitCostM2:205,description:'Dunkles Burgundy-Metall als charakteristischer Akzent.',recommendedFor:['railing','pergola','gate','fence']},
  {id:'glass-clear',name:'Glas klar',category:'glass',baseColor:'#bde8f4',roughness:0.08,metalness:0.05,opacity:0.34,texturePattern:'none',textureScale:1,unitCostM2:265,description:'Transparentes Architekturglas.',recommendedFor:['window','slidingDoor','winterGarden','railing']},
  {id:'soil-dark',name:'Humoser Oberboden',category:'soil',baseColor:'#4b3527',roughness:1,metalness:0,opacity:1,texturePattern:'gravel',textureScale:0.42,unitCostM2:24,description:'Dunkler humoser Boden für Pflanzflächen.',recommendedFor:['planter']},
  {id:'water-deep',name:'Wasser tiefblau',category:'water',baseColor:'#0f6f8f',roughness:0.16,metalness:0.05,opacity:0.72,texturePattern:'water',textureScale:1.8,unitCostM2:0,description:'Transparente Wasseroberfläche.',recommendedFor:['pool','pond']}
];

const proceduralTextureCache = new Map<string,THREE.CanvasTexture>();

const PLANT_CATALOG: PlantSpecies[] = [
  {id:'acer-palmatum',botanicalName:'Acer palmatum',commonName:'Japanischer Fächerahorn',category:'tree',objectType:'tree',matureHeight:5,matureWidth:4,recommendedSpacing:3.5,growthRate:'langsam',evergreen:false,bloomMonths:[4,5],bloomColor:'rot',foliageColor:'#b91c1c',light:['Halbschatten','Sonne'],waterNeed:3,soil:['humos','durchlässig','frisch'],hardinessMin:5,hardinessMax:9,unitCost:190,plantForm:'multiStem',notes:'Geschützter Standort; Staunässe und starke Mittagshitze vermeiden.'},
  {id:'acer-campestre',botanicalName:'Acer campestre',commonName:'Feldahorn',category:'tree',objectType:'tree',matureHeight:12,matureWidth:8,recommendedSpacing:6,growthRate:'mittel',evergreen:false,bloomMonths:[4,5],bloomColor:'gelbgrün',foliageColor:'#4d7c0f',light:['Sonne','Halbschatten'],waterNeed:2,soil:['anpassungsfähig','durchlässig'],hardinessMin:4,hardinessMax:8,unitCost:145,plantForm:'round',notes:'Robuster heimischer Baum und gut schnittverträglich.'},
  {id:'amelanchier-lamarckii',botanicalName:'Amelanchier lamarckii',commonName:'Kupfer-Felsenbirne',category:'tree',objectType:'tree',matureHeight:6,matureWidth:4.5,recommendedSpacing:4,growthRate:'mittel',evergreen:false,bloomMonths:[4],bloomColor:'weiß',foliageColor:'#15803d',light:['Sonne','Halbschatten'],waterNeed:2,soil:['humos','durchlässig'],hardinessMin:4,hardinessMax:8,unitCost:170,plantForm:'multiStem',notes:'Mehrstämmiger Kleinbaum mit Blüte, Früchten und Herbstfärbung.'},
  {id:'betula-utilis',botanicalName:'Betula utilis var. jacquemontii',commonName:'Himalaya-Birke',category:'tree',objectType:'tree',matureHeight:12,matureWidth:6,recommendedSpacing:5,growthRate:'mittel',evergreen:false,bloomMonths:[4,5],bloomColor:'gelbgrün',foliageColor:'#65a30d',light:['Sonne','Halbschatten'],waterNeed:3,soil:['frisch','durchlässig'],hardinessMin:4,hardinessMax:8,unitCost:210,plantForm:'columnar',notes:'Auffällige weiße Rinde; ausreichend Bodenfeuchte vorsehen.'},
  {id:'prunus-serrulata-kanzan',botanicalName:'Prunus serrulata Kanzan',commonName:'Japanische Nelkenkirsche',category:'tree',objectType:'tree',matureHeight:8,matureWidth:6,recommendedSpacing:5,growthRate:'mittel',evergreen:false,bloomMonths:[4,5],bloomColor:'rosa',foliageColor:'#15803d',light:['Sonne'],waterNeed:2,soil:['nährstoffreich','durchlässig'],hardinessMin:5,hardinessMax:8,unitCost:185,plantForm:'round',notes:'Starker Frühlingsaspekt; ausreichend Raum für die Krone vorsehen.'},
  {id:'hydrangea-limelight',botanicalName:'Hydrangea paniculata Limelight',commonName:'Rispenhortensie Limelight',category:'shrub',objectType:'shrub',matureHeight:2.2,matureWidth:2,recommendedSpacing:1.7,growthRate:'mittel',evergreen:false,bloomMonths:[7,8,9,10],bloomColor:'weißgrün',foliageColor:'#22c55e',light:['Sonne','Halbschatten'],waterNeed:4,soil:['humos','frisch'],hardinessMin:4,hardinessMax:8,unitCost:42,plantForm:'round',notes:'Lange Blüte; bei Sonne auf ausreichende Wasserversorgung achten.'},
  {id:'cornus-alba',botanicalName:'Cornus alba Sibirica',commonName:'Sibirischer Hartriegel',category:'shrub',objectType:'shrub',matureHeight:3,matureWidth:3,recommendedSpacing:2.2,growthRate:'schnell',evergreen:false,bloomMonths:[5,6],bloomColor:'weiß',foliageColor:'#16a34a',light:['Sonne','Halbschatten'],waterNeed:3,soil:['frisch','feucht','anpassungsfähig'],hardinessMin:3,hardinessMax:8,unitCost:26,plantForm:'round',notes:'Rote Wintertriebe; Rückschnitt fördert die Rindenfärbung.'},
  {id:'spiraea-japonica',botanicalName:'Spiraea japonica',commonName:'Japanischer Spierstrauch',category:'shrub',objectType:'shrub',matureHeight:1,matureWidth:1.2,recommendedSpacing:0.9,growthRate:'mittel',evergreen:false,bloomMonths:[6,7,8],bloomColor:'rosa',foliageColor:'#22c55e',light:['Sonne','Halbschatten'],waterNeed:2,soil:['anpassungsfähig','durchlässig'],hardinessMin:4,hardinessMax:8,unitCost:18,plantForm:'round',notes:'Kompakter, robuster Blütenstrauch.'},
  {id:'taxus-baccata',botanicalName:'Taxus baccata',commonName:'Europäische Eibe',category:'hedge',objectType:'hedge',matureHeight:5,matureWidth:2.5,recommendedSpacing:0.6,growthRate:'langsam',evergreen:true,bloomMonths:[3,4],bloomColor:'unscheinbar',foliageColor:'#14532d',light:['Sonne','Halbschatten','Schatten'],waterNeed:2,soil:['durchlässig','humos','kalkverträglich'],hardinessMin:5,hardinessMax:8,unitCost:48,plantForm:'hedge',notes:'Sehr schnittverträglich; Pflanzenteile sind überwiegend giftig.'},
  {id:'carpinus-betulus',botanicalName:'Carpinus betulus',commonName:'Hainbuche',category:'hedge',objectType:'hedge',matureHeight:5,matureWidth:2.5,recommendedSpacing:0.5,growthRate:'mittel',evergreen:false,bloomMonths:[4,5],bloomColor:'gelbgrün',foliageColor:'#3f6212',light:['Sonne','Halbschatten'],waterNeed:2,soil:['anpassungsfähig','frisch'],hardinessMin:4,hardinessMax:8,unitCost:22,plantForm:'hedge',notes:'Heimische robuste Heckenpflanze.'},
  {id:'prunus-laurocerasus-etna',botanicalName:'Prunus laurocerasus Etna',commonName:'Kirschlorbeer Etna',category:'hedge',objectType:'hedge',matureHeight:2.5,matureWidth:2,recommendedSpacing:0.8,growthRate:'mittel',evergreen:true,bloomMonths:[5],bloomColor:'weiß',foliageColor:'#166534',light:['Sonne','Halbschatten','Schatten'],waterNeed:2,soil:['humos','durchlässig'],hardinessMin:6,hardinessMax:9,unitCost:30,plantForm:'hedge',notes:'Immergrüner Sichtschutz; für naturnahe Konzepte Alternativen prüfen.'},
  {id:'lavandula-angustifolia',botanicalName:'Lavandula angustifolia',commonName:'Echter Lavendel',category:'perennial',objectType:'shrub',matureHeight:0.6,matureWidth:0.7,recommendedSpacing:0.45,growthRate:'mittel',evergreen:true,bloomMonths:[6,7,8],bloomColor:'violett',foliageColor:'#6b7280',light:['Sonne'],waterNeed:1,soil:['trocken','durchlässig','mager'],hardinessMin:5,hardinessMax:9,unitCost:8,plantForm:'perennial',notes:'Volle Sonne und sehr gute Drainage.'},
  {id:'salvia-caradonna',botanicalName:'Salvia nemorosa Caradonna',commonName:'Steppen-Salbei Caradonna',category:'perennial',objectType:'shrub',matureHeight:0.7,matureWidth:0.5,recommendedSpacing:0.4,growthRate:'mittel',evergreen:false,bloomMonths:[6,7,8],bloomColor:'violettblau',foliageColor:'#3f6212',light:['Sonne'],waterNeed:1,soil:['durchlässig','trocken bis frisch'],hardinessMin:4,hardinessMax:8,unitCost:7,plantForm:'perennial',notes:'Lange Blüte und guter Insektenwert.'},
  {id:'echinacea-purpurea',botanicalName:'Echinacea purpurea',commonName:'Purpur-Sonnenhut',category:'perennial',objectType:'shrub',matureHeight:1,matureWidth:0.6,recommendedSpacing:0.45,growthRate:'mittel',evergreen:false,bloomMonths:[7,8,9],bloomColor:'purpurrosa',foliageColor:'#4d7c0f',light:['Sonne'],waterNeed:2,soil:['durchlässig','frisch'],hardinessMin:4,hardinessMax:8,unitCost:9,plantForm:'perennial',notes:'Markante Sommerblüte; Staunässe vermeiden.'},
  {id:'nepeta-faassenii',botanicalName:'Nepeta × faassenii',commonName:'Katzenminze',category:'perennial',objectType:'shrub',matureHeight:0.5,matureWidth:0.7,recommendedSpacing:0.45,growthRate:'schnell',evergreen:false,bloomMonths:[5,6,7,8,9],bloomColor:'blauviolett',foliageColor:'#64748b',light:['Sonne'],waterNeed:1,soil:['trocken','durchlässig'],hardinessMin:4,hardinessMax:9,unitCost:7,plantForm:'perennial',notes:'Lange Blüte und trockenheitsverträglich.'},
  {id:'miscanthus-gracillimus',botanicalName:'Miscanthus sinensis Gracillimus',commonName:'Chinaschilf Gracillimus',category:'grass',objectType:'shrub',matureHeight:1.8,matureWidth:1.2,recommendedSpacing:1,growthRate:'mittel',evergreen:false,bloomMonths:[9,10],bloomColor:'silbrig',foliageColor:'#84a98c',light:['Sonne'],waterNeed:2,soil:['frisch','durchlässig'],hardinessMin:5,hardinessMax:9,unitCost:18,plantForm:'grass',notes:'Hoher strukturgebender Horst; Rückschnitt im Frühjahr.'},
  {id:'pennisetum-hameln',botanicalName:'Pennisetum alopecuroides Hameln',commonName:'Lampenputzergras Hameln',category:'grass',objectType:'shrub',matureHeight:0.9,matureWidth:0.8,recommendedSpacing:0.65,growthRate:'mittel',evergreen:false,bloomMonths:[8,9,10],bloomColor:'beige',foliageColor:'#84a98c',light:['Sonne'],waterNeed:2,soil:['durchlässig','frisch'],hardinessMin:5,hardinessMax:9,unitCost:14,plantForm:'grass',notes:'Kompaktes Ziergras mit markanten Blütenständen.'},
  {id:'calamagrostis-karl-foerster',botanicalName:'Calamagrostis × acutiflora Karl Foerster',commonName:'Reitgras Karl Foerster',category:'grass',objectType:'shrub',matureHeight:1.8,matureWidth:0.7,recommendedSpacing:0.6,growthRate:'mittel',evergreen:false,bloomMonths:[6,7,8],bloomColor:'goldbraun',foliageColor:'#65a30d',light:['Sonne','Halbschatten'],waterNeed:2,soil:['anpassungsfähig','frisch'],hardinessMin:4,hardinessMax:8,unitCost:15,plantForm:'grass',notes:'Straffer aufrechter Wuchs für moderne Pflanzungen.'},
  {id:'hakonechloa-macra',botanicalName:'Hakonechloa macra',commonName:'Japanisches Berggras',category:'grass',objectType:'shrub',matureHeight:0.5,matureWidth:0.8,recommendedSpacing:0.6,growthRate:'langsam',evergreen:false,bloomMonths:[8,9],bloomColor:'unscheinbar',foliageColor:'#a3e635',light:['Halbschatten','Schatten'],waterNeed:3,soil:['humos','frisch'],hardinessMin:5,hardinessMax:9,unitCost:16,plantForm:'grass',notes:'Für halbschattige bis schattige, frische Standorte.'}
];

const SCALE = 50;
const VIEWBOX = { x: -12, y: -8, width: 24, height: 16 };

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function degToRad(v: number) { return v * Math.PI / 180; }

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function worldFromClient(svg: SVGSVGElement | null, clientX: number, clientY: number) {
  if (!svg) return { x: 0, y: 0 };
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const local = point.matrixTransform(ctm.inverse());
  return { x: local.x / SCALE, y: local.y / SCALE };
}

function worldFromEvent(svg: SVGSVGElement | null, e: React.MouseEvent<SVGSVGElement>) {
  return worldFromClient(svg, e.clientX, e.clientY);
}

function terrainHeightAt(x: number, y: number, blobs: TerrainBlob[]) {
  return blobs.reduce((sum, b) => {
    const dx = x - b.x;
    const dy = y - b.y;
    const d2 = dx * dx + dy * dy;
    const sigma = Math.max(0.2, b.radius * b.softness);
    const influence = Math.exp(-d2 / (2 * sigma * sigma));
    return sum + b.height * influence;
  }, 0);
}

function idwTerrainHeight(
  x: number,
  y: number,
  points: ElevationPoint[],
  fallbackBlobs: TerrainBlob[],
  power = 2
) {
  if (!points.length) return terrainHeightAt(x, y, fallbackBlobs);

  let numerator = 0;
  let denominator = 0;

  for (const point of points) {
    const distance = Math.hypot(x - point.x, y - point.y);
    if (distance < 0.001) return point.elevation;
    const weight = 1 / Math.pow(distance, power);
    numerator += point.elevation * weight;
    denominator += weight;
  }

  return denominator > 0 ? numerator / denominator : terrainHeightAt(x, y, fallbackBlobs);
}

function terrainSurfaceHeight(
  x: number,
  y: number,
  points: ElevationPoint[],
  fallbackBlobs: TerrainBlob[],
  kind: 'existing' | 'proposed'
) {
  const filtered = points.filter(point => point.kind === kind);
  return idwTerrainHeight(x, y, filtered, fallbackBlobs);
}

function createContourSegments(
  points: ElevationPoint[],
  fallbackBlobs: TerrainBlob[],
  interval: number,
  kind: 'existing' | 'proposed',
  bounds = { minX: -10, maxX: 10, minY: -6.5, maxY: 6.5 },
  resolution = 34
) {
  const filtered = points.filter(point => point.kind === kind);
  if (!filtered.length && !fallbackBlobs.length) return [];

  const grid: number[][] = [];
  let minH = Infinity;
  let maxH = -Infinity;

  for (let gy = 0; gy <= resolution; gy++) {
    const row: number[] = [];
    const y = bounds.minY + (gy / resolution) * (bounds.maxY - bounds.minY);
    for (let gx = 0; gx <= resolution; gx++) {
      const x = bounds.minX + (gx / resolution) * (bounds.maxX - bounds.minX);
      const h = terrainSurfaceHeight(x, y, points, fallbackBlobs, kind);
      row.push(h);
      minH = Math.min(minH, h);
      maxH = Math.max(maxH, h);
    }
    grid.push(row);
  }

  const safeInterval = Math.max(0.05, interval);
  const levels: number[] = [];
  let level = Math.ceil(minH / safeInterval) * safeInterval;

  while (level <= maxH + 0.0001 && levels.length < 100) {
    levels.push(Number(level.toFixed(4)));
    level += safeInterval;
  }

  const segments: { level:number; x1:number; y1:number; x2:number; y2:number }[] = [];
  const edgePairs = [[0,1],[1,2],[2,3],[3,0]] as const;

  for (const contourLevel of levels) {
    for (let gy = 0; gy < resolution; gy++) {
      for (let gx = 0; gx < resolution; gx++) {
        const x0 = bounds.minX + (gx / resolution) * (bounds.maxX - bounds.minX);
        const x1 = bounds.minX + ((gx + 1) / resolution) * (bounds.maxX - bounds.minX);
        const y0 = bounds.minY + (gy / resolution) * (bounds.maxY - bounds.minY);
        const y1 = bounds.minY + ((gy + 1) / resolution) * (bounds.maxY - bounds.minY);

        const corners = [
          { x:x0, y:y0, h:grid[gy][gx] },
          { x:x1, y:y0, h:grid[gy][gx+1] },
          { x:x1, y:y1, h:grid[gy+1][gx+1] },
          { x:x0, y:y1, h:grid[gy+1][gx] }
        ];

        const hits: {x:number;y:number}[] = [];

        for (const [aIndex,bIndex] of edgePairs) {
          const a = corners[aIndex];
          const b = corners[bIndex];
          const da = a.h - contourLevel;
          const db = b.h - contourLevel;

          if ((da === 0 && db === 0) || da * db > 0) continue;
          const denominator = b.h - a.h;
          if (Math.abs(denominator) < 0.000001) continue;

          const t = clamp((contourLevel - a.h) / denominator, 0, 1);
          hits.push({
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t
          });
        }

        if (hits.length >= 2) {
          segments.push({
            level: contourLevel,
            x1: hits[0].x,
            y1: hits[0].y,
            x2: hits[1].x,
            y2: hits[1].y
          });
        }

        if (hits.length >= 4) {
          segments.push({
            level: contourLevel,
            x1: hits[2].x,
            y1: hits[2].y,
            x2: hits[3].x,
            y2: hits[3].y
          });
        }
      }
    }
  }

  return segments;
}

function calculateCutFill(
  points: ElevationPoint[],
  fallbackBlobs: TerrainBlob[],
  bounds = { minX: -10, maxX: 10, minY: -6.5, maxY: 6.5 },
  resolution = 42
): TerrainAnalysis {
  const existing = points.filter(point => point.kind === 'existing');
  const proposed = points.filter(point => point.kind === 'proposed');

  if (!existing.length && !fallbackBlobs.length) {
    return {
      cutVolume:0,
      fillVolume:0,
      netVolume:0,
      minExisting:0,
      maxExisting:0,
      minProposed:0,
      maxProposed:0,
      sampleCount:0
    };
  }

  const dx = (bounds.maxX - bounds.minX) / resolution;
  const dy = (bounds.maxY - bounds.minY) / resolution;
  const cellArea = dx * dy;

  let cut = 0;
  let fill = 0;
  let minExisting = Infinity;
  let maxExisting = -Infinity;
  let minProposed = Infinity;
  let maxProposed = -Infinity;
  let sampleCount = 0;

  for (let gy = 0; gy < resolution; gy++) {
    const y = bounds.minY + (gy + 0.5) * dy;

    for (let gx = 0; gx < resolution; gx++) {
      const x = bounds.minX + (gx + 0.5) * dx;
      const existingH = terrainSurfaceHeight(x, y, points, fallbackBlobs, 'existing');
      const proposedH = proposed.length
        ? terrainSurfaceHeight(x, y, points, fallbackBlobs, 'proposed')
        : existingH;

      const diff = proposedH - existingH;
      if (diff > 0) fill += diff * cellArea;
      else cut += Math.abs(diff) * cellArea;

      minExisting = Math.min(minExisting, existingH);
      maxExisting = Math.max(maxExisting, existingH);
      minProposed = Math.min(minProposed, proposedH);
      maxProposed = Math.max(maxProposed, proposedH);
      sampleCount++;
    }
  }

  return {
    cutVolume:Number(cut.toFixed(2)),
    fillVolume:Number(fill.toFixed(2)),
    netVolume:Number((fill-cut).toFixed(2)),
    minExisting:Number(minExisting.toFixed(2)),
    maxExisting:Number(maxExisting.toFixed(2)),
    minProposed:Number(minProposed.toFixed(2)),
    maxProposed:Number(maxProposed.toFixed(2)),
    sampleCount
  };
}


function terrainStats(blobs: TerrainBlob[]) {
  const positive = blobs.filter(b => b.height > 0).reduce((s, b) => s + Math.PI * b.radius * b.radius * Math.abs(b.height) * 0.45, 0);
  const negative = blobs.filter(b => b.height < 0).reduce((s, b) => s + Math.PI * b.radius * b.radius * Math.abs(b.height) * 0.45, 0);
  return { fill: positive, cut: negative, net: positive - negative };
}

function objectHit(p: {x:number;y:number}, obj: GardenObject) {
  const halfW = obj.width / 2;
  const halfD = obj.depth / 2;
  return p.x >= obj.x - halfW && p.x <= obj.x + halfW && p.y >= obj.y - halfD && p.y <= obj.y + halfD;
}

function rotatePoint(x: number, y: number, degrees: number) {
  const r = degToRad(degrees);
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
}

function objectLocalPoint(obj: GardenObject, worldX: number, worldY: number) {
  const dx = worldX - obj.x;
  const dy = worldY - obj.y;
  return rotatePoint(dx, dy, -obj.rotation);
}

function objectWorldPoint(obj: GardenObject, localX: number, localY: number) {
  const p = rotatePoint(localX, localY, obj.rotation);
  return { x: obj.x + p.x, y: obj.y + p.y };
}

function wallEndpoints(obj: GardenObject) {
  const a = objectWorldPoint(obj, -obj.width / 2, 0);
  const b = objectWorldPoint(obj, obj.width / 2, 0);
  return [a, b] as const;
}

function distance2D(a: {x:number;y:number}, b: {x:number;y:number}) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}



function dayOfYear(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86400000);
}

function approximateSolarPosition(
  dateIso: string,
  localHour: number,
  latitudeDeg: number
) {
  const date = new Date(`${dateIso}T12:00:00`);
  const n = Math.max(1, dayOfYear(date));
  const lat = degToRad(clamp(latitudeDeg, -66, 66));
  const declination = degToRad(23.44) * Math.sin((2 * Math.PI * (284 + n)) / 365);
  const hourAngle = degToRad((localHour - 12) * 15);

  const sinElevation =
    Math.sin(lat) * Math.sin(declination) +
    Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);

  const elevation = Math.asin(clamp(sinElevation, -1, 1));

  const azimuthRaw = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat)
  );

  const azimuth = (azimuthRaw * 180 / Math.PI + 180 + 360) % 360;

  return {
    azimuth: Number(azimuth.toFixed(2)),
    elevation: Number((elevation * 180 / Math.PI).toFixed(2))
  };
}

function shadowVectorFromSun(
  sunAzimuthDeg: number,
  sunElevationDeg: number,
  objectHeight: number
) {
  const elevation = degToRad(Math.max(1, sunElevationDeg));
  const azimuth = degToRad(sunAzimuthDeg);
  const length = Math.min(80, Math.max(0, objectHeight / Math.tan(elevation)));

  return {
    x: -Math.sin(azimuth) * length,
    y: Math.cos(azimuth) * length,
    length
  };
}

function rotatedRectangleCorners(
  centerX: number,
  centerY: number,
  width: number,
  depth: number,
  rotationDeg: number
) {
  const rotation = degToRad(rotationDeg);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const halfW = width / 2;
  const halfD = depth / 2;

  return [
    {x:-halfW,y:-halfD},
    {x: halfW,y:-halfD},
    {x: halfW,y: halfD},
    {x:-halfW,y: halfD}
  ].map(point => ({
    x:centerX + point.x * cos - point.y * sin,
    y:centerY + point.x * sin + point.y * cos
  }));
}

function cross2D(
  origin: {x:number;y:number},
  a: {x:number;y:number},
  b: {x:number;y:number}
) {
  return (a.x-origin.x)*(b.y-origin.y) - (a.y-origin.y)*(b.x-origin.x);
}

function convexHull(points: {x:number;y:number}[]) {
  if (points.length <= 3) return [...points];

  const sorted = [...points].sort((a,b)=>a.x===b.x?a.y-b.y:a.x-b.x);
  const lower: {x:number;y:number}[] = [];
  const upper: {x:number;y:number}[] = [];

  for (const point of sorted) {
    while (lower.length >= 2 && cross2D(lower[lower.length-2], lower[lower.length-1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  for (let i=sorted.length-1;i>=0;i--) {
    const point = sorted[i];
    while (upper.length >= 2 && cross2D(upper[upper.length-2], upper[upper.length-1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return [...lower,...upper];
}



function estimateSurfaceMode(elevationPoints: ElevationPoint[]) {
  return elevationPoints.some(point=>point.kind==='proposed') ? 'proposed' as const : 'existing' as const;
}

function sampleTerrainGridForFlow(
  terrainBlobs: TerrainBlob[],
  elevationPoints: ElevationPoint[],
  columns: number,
  rows: number,
  bounds = {minX:-10,maxX:10,minY:-6.5,maxY:6.5}
) {
  const width = (bounds.maxX - bounds.minX) / columns;
  const height = (bounds.maxY - bounds.minY) / rows;
  const surfaceMode = estimateSurfaceMode(elevationPoints);

  const cells = Array.from({length: rows}, (_, row) =>
    Array.from({length: columns}, (_, col) => {
      const x = bounds.minX + (col + 0.5) * width;
      const y = bounds.minY + (row + 0.5) * height;
      const z = terrainSurfaceHeight(x, y, elevationPoints, terrainBlobs, surfaceMode);
      return { row, col, x, y, z, width, height };
    })
  );

  return {cells, width, height, bounds};
}

function analyzeWaterFlowGrid(
  terrainBlobs: TerrainBlob[],
  elevationPoints: ElevationPoint[],
  columns: number,
  rows: number
) {
  const sampled = sampleTerrainGridForFlow(terrainBlobs, elevationPoints, columns, rows);
  const {cells, width, height} = sampled;
  const flowVectors: FlowVectorCell[] = [];
  const lowPoints: LowPointCell[] = [];
  const retentionCells: RetentionCell[] = [];
  let slopeSum = 0;
  let slopeCount = 0;

  const dirs = [
    [-1,-1],[-1,0],[-1,1],
    [0,-1],         [0,1],
    [1,-1],[1,0],[1,1]
  ];

  for (let row=0; row<rows; row++) {
    for (let col=0; col<columns; col++) {
      const current = cells[row][col];
      let bestNeighbor: (typeof current) | null = null;
      let maxDrop = 0;
      let lowerNeighbors = 0;

      for (const [dRow,dCol] of dirs) {
        const neighbor = cells[row + dRow]?.[col + dCol];
        if (!neighbor) continue;

        const dx = neighbor.x - current.x;
        const dy = neighbor.y - current.y;
        const distance = Math.max(0.01, Math.hypot(dx, dy));
        const drop = current.z - neighbor.z;

        if (drop > 0) {
          lowerNeighbors++;
          const slopePercent = (drop / distance) * 100;
          slopeSum += slopePercent;
          slopeCount++;
          if (drop > maxDrop) {
            maxDrop = drop;
            bestNeighbor = neighbor;
          }
        }
      }

      if (bestNeighbor) {
        const distance = Math.max(0.01, Math.hypot(bestNeighbor.x-current.x, bestNeighbor.y-current.y));
        flowVectors.push({
          x: current.x,
          y: current.y,
          toX: bestNeighbor.x,
          toY: bestNeighbor.y,
          slopePercent: Number(((current.z - bestNeighbor.z) / distance * 100).toFixed(2))
        });
      } else {
        const catchmentScore = Number((1 + lowerNeighbors * 0.1).toFixed(2));
        lowPoints.push({
          x: current.x,
          y: current.y,
          z: Number(current.z.toFixed(2)),
          catchmentScore
        });
        retentionCells.push({
          x: current.x - width/2,
          y: current.y - height/2,
          width,
          height,
          depthPotential: Number((0.12 + Math.abs(current.z % 0.45)).toFixed(2))
        });
      }
    }
  }

  const avgSlope = slopeCount ? slopeSum / slopeCount : 0;

  return {
    flowVectors,
    lowPoints,
    retentionCells,
    avgSlope,
    maxSlope: flowVectors.length ? Math.max(...flowVectors.map(v=>v.slopePercent)) : 0,
    bounds: sampled.bounds
  };
}





function objectBounds2D(obj: GardenObject) {
  const halfW=Math.max(0.05,obj.width/2);
  const halfD=Math.max(0.05,obj.depth/2);
  return {
    minX:obj.x-halfW,
    maxX:obj.x+halfW,
    minY:obj.y-halfD,
    maxY:obj.y+halfD
  };
}

function boundsOverlapArea(a: ReturnType<typeof objectBounds2D>, b: ReturnType<typeof objectBounds2D>) {
  const width=Math.max(0,Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX));
  const depth=Math.max(0,Math.min(a.maxY,b.maxY)-Math.max(a.minY,b.minY));
  return width*depth;
}

function estimateObjectCost(obj: GardenObject) {
  const unit=Number(obj.unitCost || 0);
  if(obj.type==='tree' || obj.type==='shrub' || obj.type==='hedge') return unit;
  if(obj.type==='wall' || obj.type==='interiorWall' || obj.type==='gardenWall') return Math.max(0.1,obj.width)*Math.max(0.1,obj.height)*unit;
  if(obj.type==='path' || obj.type==='floor' || obj.type==='pool' || obj.type==='pond') return Math.max(0.1,obj.width)*Math.max(0.1,obj.depth)*unit;
  return unit*Math.max(1,obj.width*obj.depth*0.25);
}


function quantityLineForObject(obj: GardenObject): QuantityLine {
  const polyline = obj.points?.length ? absolutePolyline(obj) : [];
  const polylineLengthValue = polyline.length >= 2 ? polylineLength(polyline) : 0;
  const unitPrice = Math.max(0, Number(obj.unitCost || 0));

  if (['tree','shrub','hedge','bench','light','firepit','rock','planter','pergola','pool','pond','building','carport','winterGarden'].includes(obj.type)) {
    return {
      id:`object-${obj.id}`,
      category: ['tree','shrub','hedge'].includes(obj.type) ? 'Pflanzen' : ['pool','pond'].includes(obj.type) ? 'Wasser' : ['building','carport','winterGarden','pergola'].includes(obj.type) ? 'Baukörper' : 'Ausstattung',
      name:obj.name,
      unit:'Stk.',
      quantity:1,
      unitPrice,
      total:estimateObjectCost(obj)
    };
  }

  if (obj.type==='path') {
    const quantity = polylineLengthValue > 0
      ? polylineLengthValue * Math.max(0.1,obj.pathWidth || obj.width)
      : Math.max(0.1,obj.width*obj.depth);
    return {id:`object-${obj.id}`,category:'Wege & Flächen',name:obj.name,unit:'m²',quantity,unitPrice,total:quantity*unitPrice};
  }

  if (obj.type==='floor') {
    const quantity=Math.max(0.1,obj.width*obj.depth);
    return {id:`object-${obj.id}`,category:'Wege & Flächen',name:obj.name,unit:'m²',quantity,unitPrice,total:quantity*unitPrice};
  }

  if (['wall','interiorWall','gardenWall','fence','gate','railing'].includes(obj.type)) {
    const quantity=polylineLengthValue > 0 ? polylineLengthValue : Math.max(0.1,obj.width);
    return {id:`object-${obj.id}`,category:'Mauern & Einfassungen',name:obj.name,unit:'lfm',quantity,unitPrice,total:estimateObjectCost(obj)};
  }

  if (obj.type==='stairs') {
    const quantity=Math.max(1,obj.stepCount || 1);
    return {id:`object-${obj.id}`,category:'Treppen',name:obj.name,unit:'Stk.',quantity,unitPrice,total:estimateObjectCost(obj)};
  }

  if (obj.type==='irrigation' || obj.type==='drainage') {
    if (polylineLengthValue > 0) {
      return {id:`object-${obj.id}`,category:'Technik',name:obj.name,unit:'lfm',quantity:polylineLengthValue,unitPrice,total:polylineLengthValue*unitPrice};
    }
    return {id:`object-${obj.id}`,category:'Technik',name:obj.name,unit:'Stk.',quantity:1,unitPrice,total:Math.max(unitPrice,estimateObjectCost(obj))};
  }

  const quantity=Math.max(0.1,obj.width*obj.depth);
  return {id:`object-${obj.id}`,category:'Sonstiges',name:obj.name,unit:'m²',quantity,unitPrice,total:estimateObjectCost(obj)};
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replaceAll('"','""')}"`;
}

function formatEuro(value:number) {
  return value.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
}
function auditGrade(score:number):ProjectAudit['grade'] {
  if(score>=90)return 'A';
  if(score>=78)return 'B';
  if(score>=65)return 'C';
  if(score>=50)return 'D';
  return 'E';
}

function planningStyleFromText(text:string):PlanningBrief['style'] {
  const lower=text.toLowerCase();
  if(lower.includes('mediterran'))return 'mediterranean';
  if(lower.includes('naturnah') || lower.includes('natur'))return 'natural';
  if(lower.includes('minimal'))return 'minimal';
  if(lower.includes('famil'))return 'family';
  return 'modern';
}

function planningPriorityFromText(text:string):PlanningPriority {
  const lower=text.toLowerCase();
  if(lower.includes('günstig') || lower.includes('budget') || lower.includes('kosten'))return 'budget';
  if(lower.includes('pflegeleicht') || lower.includes('wenig pflege'))return 'maintenance';
  if(lower.includes('ökologisch') || lower.includes('biodivers') || lower.includes('insekten'))return 'ecology';
  if(lower.includes('kind') || lower.includes('famil'))return 'family';
  return 'design';
}

function materialDefinitionById(id?: string) {
  return MATERIAL_LIBRARY.find(material=>material.id===id) || null;
}

function defaultMaterialIdForObject(obj: Pick<GardenObject,'type'|'material'>) {
  const materialName=(obj.material || '').toLowerCase();

  if (obj.type==='pool' || obj.type==='pond') return 'water-deep';
  if (obj.type==='window' || obj.type==='slidingDoor' || obj.type==='winterGarden') return 'glass-clear';
  if (obj.type==='railing' || obj.type==='gate') return 'metal-anthracite';
  if (obj.type==='pergola') return materialName.includes('holz') ? 'wood-larch' : 'metal-anthracite';
  if (obj.type==='path') {
    if (materialName.includes('kies') || materialName.includes('splitt')) return 'gravel-light';
    if (materialName.includes('ziegel')) return 'paving-brick-red';
    if (materialName.includes('beton')) return 'concrete-warm';
    return 'stone-gneiss';
  }
  if (obj.type==='gardenWall') return materialName.includes('beton') ? 'concrete-fairface' : 'stone-gneiss';
  if (obj.type==='floor') return materialName.includes('holz') ? 'wood-larch' : 'concrete-warm';
  if (obj.type==='wall' || obj.type==='interiorWall' || obj.type==='building') return 'plaster-white';
  if (obj.type==='stairs' || obj.type==='column') return 'concrete-fairface';
  if (obj.type==='fence') return materialName.includes('holz') ? 'wood-larch' : 'metal-anthracite';
  return undefined;
}

function ensureObjectMaterial(obj: GardenObject) {
  const materialId=obj.materialId || defaultMaterialIdForObject(obj);
  return materialId ? {...obj,materialId} : obj;
}

function proceduralTextureForMaterial(
  definition: MaterialDefinition,
  repeatScale = definition.textureScale
) {
  if (definition.texturePattern==='none') return null;

  const cacheKey=`${definition.id}:${repeatScale.toFixed(2)}`;
  const cached=proceduralTextureCache.get(cacheKey);
  if(cached) return cached;

  const canvas=document.createElement('canvas');
  canvas.width=128;
  canvas.height=128;
  const ctx=canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle=definition.baseColor;
  ctx.fillRect(0,0,128,128);

  const random=(seed:number)=>{
    const value=Math.sin(seed*12.9898)*43758.5453;
    return value-Math.floor(value);
  };

  if (definition.texturePattern==='stone') {
    for(let i=0;i<90;i++){
      const value=Math.round(80+random(i)*80);
      ctx.fillStyle=`rgba(${value},${Math.max(0,value-5)},${Math.max(0,value-10)},${0.06+random(i+4)*0.12})`;
      ctx.beginPath();
      ctx.arc(random(i+1)*128,random(i+2)*128,1+random(i+3)*5,0,Math.PI*2);
      ctx.fill();
    }
  }

  if (definition.texturePattern==='concrete') {
    for(let i=0;i<420;i++){
      const alpha=0.025+random(i+2)*0.07;
      ctx.fillStyle=random(i)>0.5?`rgba(255,255,255,${alpha})`:`rgba(20,20,20,${alpha})`;
      ctx.fillRect(random(i+1)*128,random(i+3)*128,1,1);
    }
  }

  if (definition.texturePattern==='wood' || definition.texturePattern==='planks') {
    ctx.strokeStyle='rgba(70,35,18,.26)';
    ctx.lineWidth=1;
    for(let y=8;y<128;y+=10){
      ctx.beginPath();
      for(let x=0;x<=128;x+=8){
        const offset=Math.sin((x+y)*0.11)*2.4;
        if(x===0)ctx.moveTo(x,y+offset);else ctx.lineTo(x,y+offset);
      }
      ctx.stroke();
    }
    if(definition.texturePattern==='planks'){
      ctx.strokeStyle='rgba(35,20,12,.35)';
      for(let x=0;x<128;x+=32){
        ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,128);ctx.stroke();
      }
    }
  }

  if (definition.texturePattern==='brick') {
    ctx.strokeStyle='rgba(255,255,255,.24)';
    ctx.lineWidth=2;
    for(let y=0;y<=128;y+=24){
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(128,y);ctx.stroke();
      const offset=(Math.floor(y/24)%2)*20;
      for(let x=offset;x<=128;x+=40){
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+24);ctx.stroke();
      }
    }
  }

  if (definition.texturePattern==='gravel') {
    for(let i=0;i<260;i++){
      const light=Math.round(125+random(i)*90);
      ctx.fillStyle=`rgba(${light},${Math.max(0,light-7)},${Math.max(0,light-14)},${0.18+random(i+5)*0.35})`;
      ctx.beginPath();
      ctx.ellipse(random(i+1)*128,random(i+2)*128,1+random(i+3)*2.6,1+random(i+4)*1.7,random(i+6)*Math.PI,0,Math.PI*2);
      ctx.fill();
    }
  }

  if (definition.texturePattern==='water') {
    ctx.strokeStyle='rgba(255,255,255,.18)';
    for(let y=8;y<128;y+=12){
      ctx.beginPath();
      for(let x=0;x<=128;x+=6){
        const wave=Math.sin(x*0.13+y*0.04)*2.2;
        if(x===0)ctx.moveTo(x,y+wave);else ctx.lineTo(x,y+wave);
      }
      ctx.stroke();
    }
  }

  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=THREE.RepeatWrapping;
  texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(Math.max(0.2,repeatScale),Math.max(0.2,repeatScale));
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.needsUpdate=true;
  proceduralTextureCache.set(cacheKey,texture);
  return texture;
}

function threeMaterialForObject(
  obj: GardenObject,
  fallbackColor?: string | number,
  overrides?: Partial<THREE.MeshStandardMaterialParameters>
) {
  const definition=materialDefinitionById(obj.materialId || defaultMaterialIdForObject(obj));
  const baseColor=definition?.baseColor || obj.color || fallbackColor || '#9ca3af';
  const texture=definition ? proceduralTextureForMaterial(definition,obj.textureScale || definition.textureScale) : null;

  const material=new THREE.MeshStandardMaterial({
    color:baseColor as THREE.ColorRepresentation,
    roughness:obj.roughnessOverride ?? definition?.roughness ?? 0.82,
    metalness:obj.metalnessOverride ?? definition?.metalness ?? 0,
    transparent:(definition?.opacity ?? 1)<0.999,
    opacity:definition?.opacity ?? 1,
    map:texture || undefined,
    side:THREE.DoubleSide,
    ...overrides
  });

  if(definition?.category==='glass') material.depthWrite=false;
  return material;
}

function defaultSurfaceLayersForMaterial(materialId:string):SurfaceLayer[] {
  const definition=materialDefinitionById(materialId);
  if(!definition) return [];

  if(definition.category==='paving' || definition.category==='stone'){
    return [
      {id:`${materialId}-surface`,name:'Oberbelag',thicknessMm:50,materialId},
      {id:`${materialId}-bedding`,name:'Bettung',thicknessMm:40,materialId:'gravel-light'},
      {id:`${materialId}-base`,name:'Tragschicht',thicknessMm:180,materialId:'gravel-dark'}
    ];
  }

  if(definition.category==='wood'){
    return [
      {id:`${materialId}-surface`,name:'Holzbelag',thicknessMm:28,materialId},
      {id:`${materialId}-sub`,name:'Unterkonstruktion',thicknessMm:80,materialId:'wood-thermo'}
    ];
  }

  if(definition.category==='concrete'){
    return [
      {id:`${materialId}-surface`,name:'Betonbauteil',thicknessMm:160,materialId},
      {id:`${materialId}-base`,name:'Frostschutz',thicknessMm:200,materialId:'gravel-dark'}
    ];
  }

  return [{id:`${materialId}-surface`,name:'Oberfläche',thicknessMm:20,materialId}];
}

function circleOverlapArea(radiusA: number, radiusB: number, distance: number) {
  if (distance >= radiusA + radiusB) return 0;
  if (distance <= Math.abs(radiusA - radiusB)) {
    const r = Math.min(radiusA, radiusB);
    return Math.PI * r * r;
  }

  const a = radiusA * radiusA * Math.acos(
    clamp((distance * distance + radiusA * radiusA - radiusB * radiusB) / (2 * distance * radiusA), -1, 1)
  );
  const b = radiusB * radiusB * Math.acos(
    clamp((distance * distance + radiusB * radiusB - radiusA * radiusA) / (2 * distance * radiusB), -1, 1)
  );
  const c = 0.5 * Math.sqrt(
    Math.max(
      0,
      (-distance + radiusA + radiusB) *
      (distance + radiusA - radiusB) *
      (distance - radiusA + radiusB) *
      (distance + radiusA + radiusB)
    )
  );

  return a + b - c;
}

function irrigationCoverageArea(obj: GardenObject) {
  const radius = Math.max(0.1, obj.irrigationRadius || 2.5);
  const arc = clamp(obj.irrigationArc || 360, 15, 360);
  return Math.PI * radius * radius * (arc / 360);
}

function irrigationArcPath(
  centerX: number,
  centerY: number,
  radius: number,
  arcDegrees: number,
  rotationDegrees: number
) {
  const arc = clamp(arcDegrees, 15, 360);
  if (arc >= 359.9) return '';

  const start = degToRad(rotationDegrees - arc/2);
  const end = degToRad(rotationDegrees + arc/2);
  const x1 = centerX + Math.cos(start) * radius;
  const y1 = centerY + Math.sin(start) * radius;
  const x2 = centerX + Math.cos(end) * radius;
  const y2 = centerY + Math.sin(end) * radius;
  const largeArc = arc > 180 ? 1 : 0;

  return [
    `M ${centerX*SCALE} ${centerY*SCALE}`,
    `L ${x1*SCALE} ${y1*SCALE}`,
    `A ${radius*SCALE} ${radius*SCALE} 0 ${largeArc} 1 ${x2*SCALE} ${y2*SCALE}`,
    'Z'
  ].join(' ');
}

function nearestPointOnPolyline(
  point: {x:number;y:number},
  polyline: {x:number;y:number}[]
) {
  if (!polyline.length) return point;
  let best = {x:polyline[0].x,y:polyline[0].y,distance:Infinity};

  for (let i=1;i<polyline.length;i++) {
    const a = polyline[i-1];
    const b = polyline[i];
    const dx = b.x-a.x;
    const dy = b.y-a.y;
    const lengthSq = dx*dx+dy*dy || 1;
    const t = clamp(((point.x-a.x)*dx+(point.y-a.y)*dy)/lengthSq,0,1);
    const projected = {x:a.x+dx*t,y:a.y+dy*t};
    const distance = Math.hypot(projected.x-point.x,projected.y-point.y);

    if (distance<best.distance) best={...projected,distance};
  }

  return {x:best.x,y:best.y};
}

function simpleOrthogonalRoute(
  start: {x:number;y:number},
  end: {x:number;y:number},
  preferHorizontalFirst = true
) {
  if (preferHorizontalFirst) {
    return [start,{x:end.x,y:start.y},end];
  }
  return [start,{x:start.x,y:end.y},end];
}

function flowDirectionLabel(vector: FlowVectorCell) {
  const angle = (Math.atan2(vector.toY - vector.y, vector.toX - vector.x) * 180 / Math.PI + 360) % 360;
  if (angle >= 337.5 || angle < 22.5) return 'Ost';
  if (angle < 67.5) return 'Nordost';
  if (angle < 112.5) return 'Nord';
  if (angle < 157.5) return 'Nordwest';
  if (angle < 202.5) return 'West';
  if (angle < 247.5) return 'Südwest';
  if (angle < 292.5) return 'Süd';
  return 'Südost';
}

function pointInPolygon(
  point: {x:number;y:number},
  polygon: {x:number;y:number}[]
) {
  let inside = false;

  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects =
      ((a.y > point.y) !== (b.y > point.y)) &&
      (point.x < (b.x-a.x)*(point.y-a.y)/((b.y-a.y) || 0.000001)+a.x);

    if (intersects) inside = !inside;
  }

  return inside;
}

function objectShadowHeight(
  obj: GardenObject,
  growthYear: number
) {
  if (obj.speciesId && ['tree','shrub','hedge'].includes(obj.type)) {
    return currentPlantDimensions(obj,growthYear).height;
  }

  if (obj.type === 'wall' || obj.type === 'interiorWall' || obj.type === 'gardenWall') {
    return Math.max(0.2,obj.height);
  }

  if (obj.type === 'pergola') return Math.max(2.2,obj.height);
  if (obj.type === 'building') return Math.max(2.8,obj.height);
  if (obj.type === 'roof') return Math.max(1,obj.height);

  return Math.max(0.2,obj.height || 0);
}

function isShadowBlocker(obj: GardenObject) {
  return [
    'building','wall','interiorWall','gardenWall','roof',
    'pergola','carport','winterGarden','tree','shrub','hedge'
  ].includes(obj.type);
}

function shadowFootprintForObject(
  obj: GardenObject,
  sunAzimuth: number,
  sunElevation: number,
  growthYear: number
) {
  if (sunElevation <= 1 || !isShadowBlocker(obj)) return [];

  const height = objectShadowHeight(obj,growthYear);
  const vector = shadowVectorFromSun(sunAzimuth,sunElevation,height);

  let width = Math.max(0.15,obj.width);
  let depth = Math.max(0.15,obj.depth);

  if (obj.speciesId && ['tree','shrub'].includes(obj.type)) {
    const dimensions = currentPlantDimensions(obj,growthYear);
    width = Math.max(0.2,dimensions.width);
    depth = width;
  }

  if (obj.type === 'wall' || obj.type === 'interiorWall') {
    depth = Math.max(0.08,obj.thickness || obj.depth);
  }

  if (obj.type === 'gardenWall') {
    depth = Math.max(0.1,obj.thickness || obj.depth);
  }

  const base = rotatedRectangleCorners(
    obj.x,
    obj.y,
    width,
    depth,
    obj.rotation || 0
  );

  const shifted = base.map(point=>({
    x:point.x+vector.x,
    y:point.y+vector.y
  }));

  return convexHull([...base,...shifted]);
}

function growthRatePerYear(rate: 'langsam' | 'mittel' | 'schnell' | undefined) {
  if (rate === 'langsam') return 0.08;
  if (rate === 'schnell') return 0.22;
  return 0.14;
}

function plantGrowthProgress(
  years: number,
  growthRate: 'langsam' | 'mittel' | 'schnell' | undefined,
  category: PlantCategory | undefined
) {
  if (years <= 0) return 0;

  const annual = growthRatePerYear(growthRate);
  const categoryFactor =
    category === 'tree' ? 0.78 :
    category === 'hedge' ? 1.12 :
    category === 'grass' ? 1.5 :
    category === 'perennial' ? 1.8 :
    1.0;

  return clamp(1 - Math.exp(-annual * categoryFactor * years), 0, 1);
}

function currentPlantDimensions(obj: GardenObject, years: number) {
  const matureHeight = Math.max(obj.matureHeight || obj.height || 1, 0.1);
  const matureWidth = Math.max(obj.matureWidth || obj.width || 1, 0.1);

  const installationHeight = Math.max(
    obj.installationHeight ?? Math.min(obj.height || matureHeight * 0.35, matureHeight),
    0.1
  );
  const installationWidth = Math.max(
    obj.installationWidth ?? Math.min(obj.width || matureWidth * 0.35, matureWidth),
    0.1
  );

  const progress = plantGrowthProgress(years, obj.growthRate, obj.plantCategory);

  return {
    progress,
    height: Math.min(
      matureHeight,
      installationHeight + (matureHeight - installationHeight) * progress
    ),
    width: Math.min(
      matureWidth,
      installationWidth + (matureWidth - installationWidth) * progress
    )
  };
}

function growthStageLabel(progress: number) {
  if (progress < 0.12) return 'Pflanzung';
  if (progress < 0.35) return 'Jungpflanze';
  if (progress < 0.68) return 'Aufbauphase';
  if (progress < 0.9) return 'Fast ausgewachsen';
  return 'Ausgewachsen';
}

function polylineLength(points: {x:number;y:number}[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance2D(points[i-1], points[i]);
  return total;
}

function polylineCenter(points: {x:number;y:number}[]) {
  if (!points.length) return {x:0,y:0};
  const minX = Math.min(...points.map(point=>point.x));
  const maxX = Math.max(...points.map(point=>point.x));
  const minY = Math.min(...points.map(point=>point.y));
  const maxY = Math.max(...points.map(point=>point.y));
  return {x:(minX+maxX)/2,y:(minY+maxY)/2};
}

function relativePolyline(points: {x:number;y:number}[], center: {x:number;y:number}) {
  return points.map(point=>({x:point.x-center.x,y:point.y-center.y}));
}

function absolutePolyline(obj: GardenObject) {
  return (obj.points || []).map(point=>({x:obj.x+point.x,y:obj.y+point.y}));
}

function svgPathForPolyline(points: {x:number;y:number}[], curve = false) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x*SCALE} ${points[0].y*SCALE}`;
  if (!curve || points.length < 3) {
    return points.map((point,index)=>`${index===0?'M':'L'} ${point.x*SCALE} ${point.y*SCALE}`).join(' ');
  }

  let d = `M ${points[0].x*SCALE} ${points[0].y*SCALE}`;
  for (let i=1;i<points.length-1;i++) {
    const current = points[i];
    const next = points[i+1];
    const mid = {x:(current.x+next.x)/2,y:(current.y+next.y)/2};
    d += ` Q ${current.x*SCALE} ${current.y*SCALE} ${mid.x*SCALE} ${mid.y*SCALE}`;
  }
  const last = points[points.length-1];
  d += ` L ${last.x*SCALE} ${last.y*SCALE}`;
  return d;
}

function stairMetrics(
  run: number,
  rise: number,
  preferredRiser = 0.16
) {
  const absRise = Math.abs(rise);
  const count = Math.max(1, Math.round(absRise / Math.max(0.08, preferredRiser)));
  const riser = absRise / count;
  const tread = run / count;
  return { count, riser, tread };
}

function buildLinearSegment3D(
  group: THREE.Group,
  start: {x:number;y:number},
  end: {x:number;y:number},
  width: number,
  height: number,
  yPosition: number,
  material: THREE.Material
) {
  const dx = end.x - start.x;
  const dz = end.y - start.y;
  const length = Math.hypot(dx,dz);
  if (length < 0.01) return;

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(length, height, width),
    material
  );

  mesh.position.set(
    (start.x+end.x)/2,
    yPosition,
    (start.y+end.y)/2
  );

  mesh.rotation.y = -Math.atan2(dz,dx);
  group.add(mesh);
}

function polygonArea(points: {x:number;y:number}[]) {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function polygonCentroid(points: {x:number;y:number}[]) {
  if (!points.length) return { x: 0, y: 0 };
  let signed = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    signed += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }

  if (Math.abs(signed) < 0.000001) {
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length
    };
  }

  return { x: cx / (3 * signed), y: cy / (3 * signed) };
}

function levelElevationFor(levels: BuildingLevel[], levelId: number) {
  return levels.find(level => level.id === levelId)?.elevation ?? levelId * 3;
}

function isLevelBoundObject(obj: GardenObject) {
  return ['floor','wall','interiorWall','roof','window','door','slidingDoor','balcony','railing','column','carport','winterGarden'].includes(obj.type);
}

function roomCycleKey(points: {x:number;y:number}[]) {
  const tokens = points.map(p => `${p.x.toFixed(3)},${p.y.toFixed(3)}`);
  const variants: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    variants.push([...tokens.slice(i), ...tokens.slice(0, i)].join('|'));
  }

  const reversed = [...tokens].reverse();
  for (let i = 0; i < reversed.length; i++) {
    variants.push([...reversed.slice(i), ...reversed.slice(0, i)].join('|'));
  }

  return variants.sort()[0] || '';
}

function detectClosedRoomPolygons(walls: GardenObject[], tolerance = 0.16) {
  type Node = { key: string; x: number; y: number };
  type Edge = { id: number; a: string; b: string };

  const nodeMap = new Map<string, Node>();
  const edges: Edge[] = [];

  const nodeFor = (point: {x:number;y:number}) => {
    const qx = Math.round(point.x / tolerance) * tolerance;
    const qy = Math.round(point.y / tolerance) * tolerance;
    const key = `${qx.toFixed(4)},${qy.toFixed(4)}`;
    if (!nodeMap.has(key)) nodeMap.set(key, { key, x: qx, y: qy });
    return key;
  };

  walls.forEach(wall => {
    const [start, end] = wallEndpoints(wall);
    const a = nodeFor(start);
    const b = nodeFor(end);
    if (a !== b) edges.push({ id: wall.id, a, b });
  });

  const adjacency = new Map<string, { node: string; edgeId: number }[]>();
  edges.forEach(edge => {
    adjacency.set(edge.a, [...(adjacency.get(edge.a) || []), { node: edge.b, edgeId: edge.id }]);
    adjacency.set(edge.b, [...(adjacency.get(edge.b) || []), { node: edge.a, edgeId: edge.id }]);
  });

  const found = new Map<string, {x:number;y:number}[]>();
  const maxDepth = Math.min(18, Math.max(6, edges.length + 1));

  const dfs = (
    start: string,
    current: string,
    pathNodes: string[],
    usedEdges: Set<number>
  ) => {
    if (pathNodes.length > maxDepth) return;

    for (const next of adjacency.get(current) || []) {
      if (usedEdges.has(next.edgeId)) continue;

      if (next.node === start && pathNodes.length >= 3) {
        const points = pathNodes
          .map(key => nodeMap.get(key))
          .filter(Boolean)
          .map(node => ({ x: node!.x, y: node!.y }));

        const area = polygonArea(points);
        if (area >= 1 && area <= 1500) {
          const key = roomCycleKey(points);
          if (key && !found.has(key)) found.set(key, points);
        }
        continue;
      }

      if (pathNodes.includes(next.node)) continue;

      const nextUsed = new Set(usedEdges);
      nextUsed.add(next.edgeId);
      dfs(start, next.node, [...pathNodes, next.node], nextUsed);
    }
  };

  [...nodeMap.keys()].forEach(start => dfs(start, start, [start], new Set()));

  return [...found.values()]
    .sort((a, b) => polygonArea(a) - polygonArea(b))
    .slice(0, 40);
}

function isWallObject(obj: GardenObject) {
  return obj.type === 'wall' || obj.type === 'interiorWall';
}

function isOpeningObject(obj: GardenObject) {
  return obj.type === 'window' || obj.type === 'door' || obj.type === 'slidingDoor';
}

function openingSill(obj: GardenObject) {
  if (obj.type === 'window') return obj.sillHeight ?? 0.9;
  return obj.sillHeight ?? 0;
}

function wallOpeningOffset(wall: GardenObject, opening: GardenObject) {
  if (typeof opening.hostOffset === 'number') return opening.hostOffset;
  return objectLocalPoint(wall, opening.x, opening.y).x;
}

function addWallSegment3D(
  group: THREE.Group,
  wall: GardenObject,
  centerX: number,
  width: number,
  centerY: number,
  height: number,
  material: THREE.Material,
  edgeColor: number
) {
  if (width <= 0.015 || height <= 0.015) return;
  const thickness = Math.max(wall.thickness || wall.depth, 0.08);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, thickness),
    material
  );
  mesh.position.set(centerX, centerY, 0);
  group.add(mesh);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color: edgeColor })
  );
  mesh.add(edges);
}

function buildWallWithOpenings3D(
  group: THREE.Group,
  wall: GardenObject,
  openings: GardenObject[],
  selected: boolean,
  baseElevation = 0
) {
  const material = threeMaterialForObject(wall,wall.color);
  const edgeColor = selected ? 0xf59e0b : (wall.type === 'interiorWall' ? 0x94a3b8 : 0x475569);
  const baseY = baseElevation;
  const wallHeight = Math.max(0.2, wall.height);
  const half = wall.width / 2;

  const normalized = openings
    .map(opening => {
      const sill = clamp(openingSill(opening), 0, wallHeight);
      const height = clamp(opening.height, 0.1, Math.max(0.1, wallHeight - sill));
      const offset = clamp(
        wallOpeningOffset(wall, opening),
        -half + opening.width / 2,
        half - opening.width / 2
      );
      return {
        opening,
        sill,
        height,
        start: clamp(offset - opening.width / 2, -half, half),
        end: clamp(offset + opening.width / 2, -half, half)
      };
    })
    .filter(item => item.end - item.start > 0.02)
    .sort((a, b) => a.start - b.start);

  let cursor = -half;

  normalized.forEach(item => {
    const leftWidth = item.start - cursor;
    if (leftWidth > 0.015) {
      addWallSegment3D(group, wall, cursor + leftWidth / 2, leftWidth, baseY + wallHeight / 2, wallHeight, material, edgeColor);
    }

    if (item.sill > 0.015) {
      addWallSegment3D(group, wall, (item.start + item.end) / 2, item.end - item.start, baseY + item.sill / 2, item.sill, material, edgeColor);
    }

    const topStart = item.sill + item.height;
    const topHeight = wallHeight - topStart;
    if (topHeight > 0.015) {
      addWallSegment3D(group, wall, (item.start + item.end) / 2, item.end - item.start, baseY + topStart + topHeight / 2, topHeight, material, edgeColor);
    }

    cursor = Math.max(cursor, item.end);
  });

  const tailWidth = half - cursor;
  if (tailWidth > 0.015) {
    addWallSegment3D(group, wall, cursor + tailWidth / 2, tailWidth, baseY + wallHeight / 2, wallHeight, material, edgeColor);
  }

  if (!normalized.length) {
    addWallSegment3D(group, wall, 0, wall.width, baseY + wallHeight / 2, wallHeight, material, edgeColor);
  }
}

export default function LandscapePlatform() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [tab, setTab] = useState<Tab>('architecture');
  const [view, setView] = useState<ViewMode>('2d');
  const [tool, setTool] = useState<Tool>('select');
  const [status, setStatus] = useState('Bereit: V0.32 AI COPILOT – Objekte, Gelände und Zonen sind in 2D verschiebbar; Objekte auch in 3D.');
  const [chat, setChat] = useState('Erstelle ein sanftes Gelände mit zwei Hügeln, einer Terrasse im Süden und einem modernen Glashaus im Norden.');
  const [chatEngine, setChatEngine] = useState<ChatEngine>('local');
  const [openAiModel, setOpenAiModel] = useState('gpt-4o');
  const [openAiNote, setOpenAiNote] = useState('OpenAI vorbereitet. Für echten Live-Betrieb OPENAI_API_KEY in Vercel setzen.');
  const [openAiLastAnswer, setOpenAiLastAnswer] = useState('');
  const [copilotMessages, setCopilotMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hallo! Ich bin dein AL Green Design Copilot. Du kannst mich beraten lassen oder den aktuellen Plan direkt ändern, zum Beispiel: „Verschiebe den Pool zwei Meter nach Osten“, „Setze drei Bäume als Sichtschutz im Norden“ oder „Prüfe das Projekt auf Planungsfehler“.',
      createdAt: new Date().toISOString()
    }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [copilotError, setCopilotError] = useState('');
  const [copilotModel, setCopilotModel] = useState('gpt-5.2');
  const [copilotAutoApply, setCopilotAutoApply] = useState(true);
  const [copilotSuggestions, setCopilotSuggestions] = useState<string[]>([]);
  const [pendingCopilotActions, setPendingCopilotActions] = useState<AiProjectAction[]>([]);
  const [copilotReady, setCopilotReady] = useState(false);
  const copilotEndRef = useRef<HTMLDivElement | null>(null);
  const [image, setImage] = useState<{ name: string; dataUrl: string; width: number; height: number } | null>(null);
  const [imageApplied, setImageApplied] = useState(false);
  const [imageOpacity, setImageOpacity] = useState(0.32);
  const [imageFit, setImageFit] = useState<'stretch' | 'contain'>('contain');
  const [importedModels, setImportedModels] = useState<ImportedReliefModel[]>([]);
  const [selectedImportedModelId, setSelectedImportedModelId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('al-green-v032-copilot-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setCopilotMessages(parsed.slice(-40));
      }
    } catch {
      // Ein beschädigter lokaler Verlauf darf den Editor nicht blockieren.
    } finally {
      setCopilotReady(true);
    }
  }, []);

  useEffect(() => {
    if (!copilotReady) return;
    localStorage.setItem('al-green-v032-copilot-history', JSON.stringify(copilotMessages.slice(-40)));
    copilotEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [copilotMessages, copilotReady]);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({ name: 'Gartenprojekt', location: 'Wien', budget: 25000, area: 400 });
  const [levels, setLevels] = useState<BuildingLevel[]>([
    { id: 0, name: 'EG', elevation: 0, height: 2.8, visible: true },
    { id: 1, name: '1. OG', elevation: 3.0, height: 2.8, visible: true },
    { id: 2, name: 'Dach', elevation: 6.0, height: 1.5, visible: true }
  ]);
  const [activeLevel, setActiveLevel] = useState(0);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(0.5);
  const [nightMode, setNightMode] = useState(false);
  const [growthYear, setGrowthYear] = useState<number>(0);
  const [growthTimelineMode, setGrowthTimelineMode] = useState<'year'|'compare'>('year');
  const [growthCompareYearA, setGrowthCompareYearA] = useState(0);
  const [growthCompareYearB, setGrowthCompareYearB] = useState(10);
  const [showMaturePlantOutline, setShowMaturePlantOutline] = useState(true);
  const [season, setSeason] = useState<Season>('Sommer');
  const [sunAzimuth, setSunAzimuth] = useState(135);
  const [sunElevation, setSunElevation] = useState(42);
  const [sunAutoPosition, setSunAutoPosition] = useState(true);
  const [sunAnalysisDate, setSunAnalysisDate] = useState('2026-06-21');
  const [sunAnalysisHour, setSunAnalysisHour] = useState(14);
  const [sunLatitude, setSunLatitude] = useState(48.2);
  const [showShadowOverlay2D, setShowShadowOverlay2D] = useState(true);
  const [showSunHoursHeatmap, setShowSunHoursHeatmap] = useState(false);
  const [sunHoursGrid, setSunHoursGrid] = useState<SunHoursCell[]>([]);
  const [sunAnalysisBusy, setSunAnalysisBusy] = useState(false);
  const [enable3DShadows, setEnable3DShadows] = useState(true);
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('auto');
  const [showFlowOverlay2D, setShowFlowOverlay2D] = useState(true);
  const [showLowPoints2D, setShowLowPoints2D] = useState(true);
  const [showRetentionOverlay2D, setShowRetentionOverlay2D] = useState(false);
  const [waterAnalysisBusy, setWaterAnalysisBusy] = useState(false);
  const [flowVectors, setFlowVectors] = useState<FlowVectorCell[]>([]);
  const [lowPoints, setLowPoints] = useState<LowPointCell[]>([]);
  const [retentionCells, setRetentionCells] = useState<RetentionCell[]>([]);
  const [runoffAverageSlope, setRunoffAverageSlope] = useState(0);
  const [runoffMaxSlope, setRunoffMaxSlope] = useState(0);
  const [irrigationZones, setIrrigationZones] = useState<IrrigationZone[]>([
    {id:'zone-lawn',name:'Rasen',color:'#be123c',emitterType:'sprinkler',targetPressureBar:2.8,maxFlowLMin:32,enabled:true},
    {id:'zone-beds',name:'Beete',color:'#9f1239',emitterType:'drip',targetPressureBar:1.8,maxFlowLMin:18,enabled:true}
  ]);
  const [activeIrrigationZoneId, setActiveIrrigationZoneId] = useState('zone-lawn');
  const [defaultSprinklerRadius, setDefaultSprinklerRadius] = useState(4);
  const [defaultSprinklerArc, setDefaultSprinklerArc] = useState(360);
  const [defaultSprinklerFlow, setDefaultSprinklerFlow] = useState(8);
  const [defaultDripRadius, setDefaultDripRadius] = useState(1.1);
  const [showIrrigationCoverage2D, setShowIrrigationCoverage2D] = useState(true);
  const [showIrrigationPipes2D, setShowIrrigationPipes2D] = useState(true);
  const [irrigationSourcePoint, setIrrigationSourcePoint] = useState<{x:number;y:number}>({x:-8.5,y:5.2});
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<'all'|MaterialCategory>('all');
  const [selectedMaterialId, setSelectedMaterialId] = useState('stone-gneiss');
  const [planningBrief, setPlanningBrief] = useState<PlanningBrief>({
    style:'modern',
    budget:projectInfo.budget,
    priority:'design',
    needsPool:false,
    needsTerrace:true,
    needsPergola:true,
    needsPlayArea:false,
    needsPrivacy:true,
    needsLowMaintenance:false,
    needsBiodiversity:true,
    targetPlantCount:12,
    notes:''
  });
  const [planningVariants, setPlanningVariants] = useState<PlanningVariant[]>([]);
  const [selectedPlanningVariantId, setSelectedPlanningVariantId] = useState<string | null>(null);
  const [planningQuestions, setPlanningQuestions] = useState<string[]>([]);
  const [projectAudit, setProjectAudit] = useState<ProjectAudit | null>(null);
  const [auditBusy, setAuditBusy] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationPreset, setPresentationPreset] = useState<PresentationPreset>('overview');
  const [presentationCaption, setPresentationCaption] = useState('Gesamtübersicht');
  const presentationReturnRef = useRef<{view:ViewMode;nightMode:boolean;growthYear:number;season:Season} | null>(null);
  const [showContours, setShowContours] = useState(true);
  const [showGrid3D, setShowGrid3D] = useState(true);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'walk' | 'top'>('orbit');
  const [layers, setLayers] = useState({ terrain: true, zones: true, buildings: true, plants: true, water: true, structures: true, lighting: true, utilities: true, furniture: true });
  const [lockedLayers, setLockedLayers] = useState({ terrain: false, zones: false, buildings: false, plants: false, water: false, structures: false, lighting: false, utilities: false, furniture: false });
  const [history, setHistory] = useState<any[]>([]);
  const [future, setFuture] = useState<any[]>([]);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const [drag2D, setDrag2D] = useState<Drag2D>(null);

  const [terrainBlobs, setTerrainBlobs] = useState<TerrainBlob[]>([
    { id: 1, name: 'Hügel Nord', x: -3.5, y: -1.2, radius: 2.4, height: 0.85, softness: 1.35, source: 'Start' },
    { id: 2, name: 'Hügel Süd', x: 2.8, y: 2.2, radius: 1.9, height: 0.55, softness: 1.2, source: 'Start' },
    { id: 3, name: 'Mulde Mitte', x: 1.0, y: -2.8, radius: 1.8, height: -0.45, softness: 1.4, source: 'Start' }
  ]);
  const [elevationPoints, setElevationPoints] = useState<ElevationPoint[]>([
    { id: 9001, x: -8, y: -5, elevation: 0.00, kind: 'existing', name: 'Bestand P1' },
    { id: 9002, x: 8, y: -5, elevation: 0.35, kind: 'existing', name: 'Bestand P2' },
    { id: 9003, x: -8, y: 5, elevation: 0.75, kind: 'existing', name: 'Bestand P3' },
    { id: 9004, x: 8, y: 5, elevation: 1.10, kind: 'existing', name: 'Bestand P4' }
  ]);
  const [activeTerrainSurface, setActiveTerrainSurface] = useState<'existing'|'proposed'>('existing');
  const [newElevationValue, setNewElevationValue] = useState(0);
  const [contourInterval, setContourInterval] = useState(0.25);
  const [showTerrainContours2D, setShowTerrainContours2D] = useState(true);
  const [terrainSculptMode, setTerrainSculptMode] = useState<'point'|'plateau'|'slope'>('point');
  const [plateauRadius, setPlateauRadius] = useState(2.5);
  const [plateauElevation, setPlateauElevation] = useState(0.5);
  const [hardscapeDraftPoints, setHardscapeDraftPoints] = useState<{x:number;y:number}[]>([]);
  const [hardscapeDraftType, setHardscapeDraftType] = useState<'path'|'gardenWall'>('path');
  const [smartPathWidth, setSmartPathWidth] = useState(1.2);
  const [smartPathCurve, setSmartPathCurve] = useState(true);
  const [smartPathMaterial, setSmartPathMaterial] = useState('Naturstein');
  const [gardenWallThickness, setGardenWallThickness] = useState(0.28);
  const [gardenWallHeight, setGardenWallHeight] = useState(1.0);
  const [gardenWallFoundation, setGardenWallFoundation] = useState(0.5);
  const [stairDraftStart, setStairDraftStart] = useState<{x:number;y:number} | null>(null);
  const [smartStairWidth, setSmartStairWidth] = useState(1.4);
  const [preferredRiserHeight, setPreferredRiserHeight] = useState(0.16);
  const [manualStairRise, setManualStairRise] = useState(0.75);
  const [plantSearch, setPlantSearch] = useState('');
  const [plantCategoryFilter, setPlantCategoryFilter] = useState<'all'|PlantCategory>('all');
  const [plantLightFilter, setPlantLightFilter] = useState<'all'|PlantLight>('all');
  const [plantWaterFilter, setPlantWaterFilter] = useState<'all'|PlantWater>('all');
  const [selectedPlantSpeciesId, setSelectedPlantSpeciesId] = useState<string | null>(null);
  const [projectHardinessZone, setProjectHardinessZone] = useState(7);
  const [defaultPlantSiteLight, setDefaultPlantSiteLight] = useState<PlantLight>('Sonne');

  const [zones, setZones] = useState<Zone[]>([
    { id: 101, kind: 'hardscape', name: 'Terrasse', x: -5.4, y: 3.0, width: 4.2, depth: 2.4, color: '#b8b0a2' },
    { id: 102, kind: 'plantZone', name: 'Pflanzzone', x: 4.5, y: -2.6, width: 4.0, depth: 2.2, color: '#a7f3d0' }
  ]);

  const [objects, setObjects] = useState<GardenObject[]>([
    { id: 201, type: 'building', name: 'Gartenhaus', x: -1.5, y: 2.4, width: 3.5, depth: 2.8, height: 2.7, rotation: 0, color: '#d6c4a7' },
    { id: 202, type: 'pergola', name: 'Pergola', x: -5.0, y: 0.2, width: 3.0, depth: 2.2, height: 2.6, rotation: 0, color: '#8b5e3c' },
    { id: 203, type: 'pool', name: 'Pool', x: 4.8, y: 2.8, width: 4.2, depth: 2.4, height: 1.3, rotation: 0, color: '#38bdf8' },
    { id: 204, type: 'tree', name: 'Baum', x: 4.2, y: -0.5, width: 1.4, depth: 1.4, height: 3.8, rotation: 0, color: '#16a34a' },
    { id: 205, type: 'shrub', name: 'Strauch', x: 5.6, y: -1.7, width: 1.0, depth: 1.0, height: 1.0, rotation: 0, color: '#22c55e' },
    { id: 206, type: 'hedge', name: 'Hecke', x: 0.0, y: -4.5, width: 4.0, depth: 0.6, height: 1.5, rotation: 0, color: '#15803d' },
    { id: 207, type: 'wall', name: 'Mauer', x: -0.6, y: -3.2, width: 3.0, depth: 0.25, height: 1.0, rotation: 15, color: '#9ca3af' },
    { id: 208, type: 'stairs', name: 'Stufen', x: -2.5, y: -2.0, width: 2.2, depth: 1.4, height: 0.9, rotation: 0, color: '#c8b6a6' },
    { id: 209, type: 'path', name: 'Gartenweg', x: 0.5, y: 3.9, width: 5.5, depth: 1.0, height: 0.08, rotation: -8, color: '#d6c7ad', material: 'Kies', unitCost: 95 },
    { id: 210, type: 'light', name: 'Wegeleuchte', x: 1.5, y: 3.2, width: 0.25, depth: 0.25, height: 0.9, rotation: 0, color: '#f59e0b', unitCost: 185 },
    { id: 211, type: 'bench', name: 'Sitzbank', x: -4.6, y: 3.4, width: 1.8, depth: 0.65, height: 0.85, rotation: 0, color: '#8b5e3c', unitCost: 380 },
    { id: 212, type: 'pond', name: 'Gartenteich', x: 5.0, y: -3.8, width: 3.2, depth: 2.2, height: 0.35, rotation: 0, color: '#0ea5e9', unitCost: 240 },
    { id: 220, type: 'floor', name: 'Haus Bodenplatte', x: -1.5, y: 2.4, width: 4.8, depth: 4.0, height: 0.18, rotation: 0, color: '#d1d5db', material: 'Stahlbeton', level: 0, thickness: 0.18, parentId: 201 },
    { id: 221, type: 'wall', name: 'Außenwand Süd', x: -1.5, y: 4.35, width: 4.8, depth: 0.22, height: 2.8, rotation: 0, color: '#f8fafc', material: 'Putz', level: 0, thickness: 0.22, parentId: 201 },
    { id: 222, type: 'wall', name: 'Außenwand Nord', x: -1.5, y: 0.45, width: 4.8, depth: 0.22, height: 2.8, rotation: 0, color: '#f8fafc', material: 'Putz', level: 0, thickness: 0.22, parentId: 201 },
    { id: 223, type: 'wall', name: 'Außenwand West', x: -3.8, y: 2.4, width: 4.0, depth: 0.22, height: 2.8, rotation: 90, color: '#f8fafc', material: 'Putz', level: 0, thickness: 0.22, parentId: 201 },
    { id: 224, type: 'wall', name: 'Außenwand Ost', x: 0.8, y: 2.4, width: 4.0, depth: 0.22, height: 2.8, rotation: 90, color: '#f8fafc', material: 'Putz', level: 0, thickness: 0.22, parentId: 201 },
    { id: 225, type: 'interiorWall', name: 'Innenwand', x: -1.5, y: 2.4, width: 3.2, depth: 0.14, height: 2.7, rotation: 90, color: '#e5e7eb', material: 'Trockenbau', level: 0, thickness: 0.14, parentId: 201 },
    { id: 226, type: 'window', name: 'Panoramafenster', x: -0.8, y: 4.23, width: 2.0, depth: 0.10, height: 1.5, rotation: 0, color: '#7dd3fc', material: 'Glas', level: 0, parentId: 201 },
    { id: 227, type: 'door', name: 'Eingangstür', x: -2.8, y: 0.56, width: 1.0, depth: 0.12, height: 2.1, rotation: 0, color: '#92400e', material: 'Holz', level: 0, parentId: 201 },
    { id: 228, type: 'slidingDoor', name: 'Terrassen-Schiebetür', x: -2.2, y: 4.23, width: 2.6, depth: 0.12, height: 2.35, rotation: 0, color: '#bae6fd', material: 'Glas/Aluminium', level: 0, parentId: 201 },
    { id: 229, type: 'roof', name: 'Satteldach', x: -1.5, y: 2.4, width: 5.2, depth: 4.4, height: 1.2, rotation: 0, color: '#7c2d12', material: 'Dachziegel', level: 1, subtype: 'gable', parentId: 201 },
    { id: 230, type: 'balcony', name: 'Balkon', x: -1.5, y: 4.9, width: 3.5, depth: 1.4, height: 0.18, rotation: 0, color: '#94a3b8', material: 'Beton/Holz', level: 1, parentId: 201 },
    { id: 231, type: 'railing', name: 'Balkongeländer', x: -1.5, y: 5.55, width: 3.5, depth: 0.10, height: 1.05, rotation: 0, color: '#64748b', material: 'Glas/Metall', level: 1, parentId: 201 },
    { id: 232, type: 'column', name: 'Terrassenstütze', x: -3.0, y: 5.0, width: 0.28, depth: 0.28, height: 2.8, rotation: 0, color: '#cbd5e1', material: 'Stahl', level: 0, parentId: 201 }
  ]);

  const [selectedKind, setSelectedKind] = useState<SelectedKind>('object');
  const [selectedId, setSelectedId] = useState<number | null>(201);
  const [selectedObjectIds, setSelectedObjectIds] = useState<number[]>([201]);
  const [snapGuides, setSnapGuides] = useState<{x?:number;y?:number} | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [autosaveState, setAutosaveState] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [versionSnapshots, setVersionSnapshots] = useState<EditorSnapshot[]>([]);
  const editorClipboardRef = useRef<GardenObject[]>([]);
  const [wallDraftStart, setWallDraftStart] = useState<{x:number;y:number} | null>(null);
  const [wallChainMode, setWallChainMode] = useState(true);

  const selectedBlob = selectedKind === 'terrain' ? terrainBlobs.find(b => b.id === selectedId) || null : null;
  const selectedZone = selectedKind === 'zone' ? zones.find(z => z.id === selectedId) || null : null;
  const selectedObject = selectedKind === 'object' ? objects.find(o => o.id === selectedId) || null : null;
  const selectedObjects = objects.filter(o => selectedObjectIds.includes(o.id));
  const selectedImportedModel = importedModels.find(model => model.id === selectedImportedModelId) || null;
  const selectedRoom = rooms.find(room => room.id === selectedRoomId) || null;

  const visibleObjectsForPlan = objects.filter(obj => {
    if (!isLevelBoundObject(obj)) return true;
    const levelId = obj.level ?? 0;
    if (showAllLevels) return levels.find(level => level.id === levelId)?.visible !== false;
    return levelId === activeLevel;
  });

  const visibleRoomsForPlan = rooms.filter(room => {
    if (showAllLevels) return levels.find(level => level.id === room.level)?.visible !== false;
    return room.level === activeLevel;
  });

  const architectureStats = useMemo(() => {
    const walls = objects.filter(isWallObject);
    const openings = objects.filter(isOpeningObject);
    const hosted = openings.filter(opening => opening.parentId && walls.some(wall => wall.id === opening.parentId));
    return {
      wallCount: walls.length,
      totalWallLength: walls.reduce((sum, wall) => sum + wall.width, 0),
      openingCount: openings.length,
      hostedOpeningCount: hosted.length
    };
  }, [objects]);

  const wallTransformSignature = objects
    .filter(isWallObject)
    .map(wall => `${wall.id}:${wall.x.toFixed(4)}:${wall.y.toFixed(4)}:${wall.width.toFixed(4)}:${wall.rotation.toFixed(4)}`)
    .join('|');

  const nearestObjectInfo = useMemo(() => {
    if (!selectedObject) return null;
    const others = objects.filter(o => o.id !== selectedObject.id);
    if (!others.length) return null;
    return others.map(o => ({ object:o, distance:Math.hypot(o.x-selectedObject.x,o.y-selectedObject.y) })).sort((a,b)=>a.distance-b.distance)[0] || null;
  }, [objects, selectedObject]);


  useEffect(() => {
    try {
      const raw = localStorage.getItem(IMPORTED_MODEL_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const models = Array.isArray(parsed) ? parsed : [];
      setImportedModels(models);

      const requestedId = localStorage.getItem('al-green-v0192-open-imported-model');
      if (requestedId && models.some((model: ImportedReliefModel) => model.id === requestedId)) {
        setSelectedImportedModelId(requestedId);
        setView('3d');
        setTab('scene');
        setStatus('Das Video-3D-Modell wurde in das Projekt übernommen und ist in der 3D-Szene sichtbar.');
        localStorage.removeItem('al-green-v0192-open-imported-model');
      }
    } catch {
      setStatus('Importierte 3D-Modelle konnten nicht aus dem Browser-Speicher gelesen werden.');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(IMPORTED_MODEL_STORAGE_KEY, JSON.stringify(importedModels));
    } catch {
      // Browser-Speicher kann bei sehr großen Bildern voll sein.
    }
  }, [importedModels]);

  function updateImportedModel(id: string, patch: Partial<ImportedReliefModel>) {
    setImportedModels(current => current.map(model => model.id === id ? { ...model, ...patch } : model));
  }

  function deleteImportedModel(id: string) {
    setImportedModels(current => current.filter(model => model.id !== id));
    if (selectedImportedModelId === id) setSelectedImportedModelId(null);
    setStatus('Importiertes 3D-Modell gelöscht.');
  }

  function duplicateImportedModel(id: string) {
    const source = importedModels.find(model => model.id === id);
    if (!source) return;
    const copy: ImportedReliefModel = {
      ...source,
      id: `imported-model-${Date.now()}`,
      name: `${source.name} Kopie`,
      x: source.x + 0.5,
      z: source.z + 0.5,
      createdAt: new Date().toISOString()
    };
    setImportedModels(current => [...current, copy]);
    setSelectedImportedModelId(copy.id);
    setStatus('Importiertes 3D-Modell dupliziert.');
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('al-green-v0193-versions');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setVersionSnapshots(parsed);
    } catch {
      setVersionSnapshots([]);
    }
  }, []);

  useEffect(() => {
    if (!autosaveEnabled) return;
    const timer = window.setTimeout(() => {
      try {
        setAutosaveState('saving');
        localStorage.setItem('al-green-v0193-autosave', JSON.stringify({
          projectInfo,
          terrainBlobs,
          elevationPoints,
          irrigationZones,
          zones,
          objects,
          rooms,
          levels,
          activeLevel,
          importedModels,
          layers,
          gridSize,
          snapEnabled,
          savedAt: new Date().toISOString()
        }));
        setAutosaveState('saved');
        window.setTimeout(() => setAutosaveState('idle'), 1200);
      } catch {
        setAutosaveState('error');
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [autosaveEnabled, projectInfo, terrainBlobs, elevationPoints, irrigationZones, zones, objects, rooms, levels, activeLevel, importedModels, layers, gridSize, snapEnabled]);

  function restoreAutosave() {
    try {
      const raw = localStorage.getItem('al-green-v0193-autosave');
      if (!raw) { setStatus('Kein Autosave vorhanden.'); return; }
      const data = JSON.parse(raw);
      snapshot();
      if (data.projectInfo) setProjectInfo(data.projectInfo);
      if (Array.isArray(data.terrainBlobs)) setTerrainBlobs(data.terrainBlobs);
      if (Array.isArray(data.elevationPoints)) setElevationPoints(data.elevationPoints);
      if (Array.isArray(data.irrigationZones) && data.irrigationZones.length) setIrrigationZones(data.irrigationZones);
      if (Array.isArray(data.zones)) setZones(data.zones);
      if (Array.isArray(data.objects)) setObjects(data.objects);
      if (Array.isArray(data.rooms)) setRooms(data.rooms);
      if (Array.isArray(data.levels) && data.levels.length) setLevels(data.levels);
      if (typeof data.activeLevel === 'number') setActiveLevel(data.activeLevel);
      if (Array.isArray(data.importedModels)) setImportedModels(data.importedModels);
      if (data.layers) setLayers(data.layers);
      if (typeof data.gridSize === 'number') setGridSize(data.gridSize);
      if (typeof data.snapEnabled === 'boolean') setSnapEnabled(data.snapEnabled);
      setStatus('Autosave wiederhergestellt.');
    } catch {
      setStatus('Autosave konnte nicht geladen werden.');
    }
  }

  useEffect(() => {
    setObjects(current => {
      let changed = false;

      const next = current.map(obj => {
        if (!isOpeningObject(obj) || !obj.parentId) return obj;

        const wall = current.find(candidate => candidate.id === obj.parentId && isWallObject(candidate));
        if (!wall) return obj;

        const rawOffset = typeof obj.hostOffset === 'number'
          ? obj.hostOffset
          : objectLocalPoint(wall, obj.x, obj.y).x;

        const offset = clamp(rawOffset, -wall.width/2 + obj.width/2, wall.width/2 - obj.width/2);
        const world = objectWorldPoint(wall, offset, 0);

        if (
          Math.abs(world.x - obj.x) > 0.0001 ||
          Math.abs(world.y - obj.y) > 0.0001 ||
          Math.abs(wall.rotation - obj.rotation) > 0.0001 ||
          Math.abs(offset - (obj.hostOffset ?? offset)) > 0.0001
        ) {
          changed = true;
          return { ...obj, x: world.x, y: world.y, rotation: wall.rotation, hostOffset: offset };
        }

        return obj;
      });

      return changed ? next : current;
    });
  }, [wallTransformSignature]);

  const terrainAnalysis = useMemo(
    () => calculateCutFill(elevationPoints, terrainBlobs),
    [elevationPoints, terrainBlobs]
  );

  const contourSegments2D = useMemo(
    () => createContourSegments(
      elevationPoints,
      terrainBlobs,
      contourInterval,
      activeTerrainSurface
    ),
    [elevationPoints, terrainBlobs, contourInterval, activeTerrainSurface]
  );

  const stats = useMemo(() => terrainStats(terrainBlobs), [terrainBlobs]);

  const quantityLines = useMemo<QuantityLine[]>(() => {
    const lines=objects.map(quantityLineForObject);

    if(terrainAnalysis.cutVolume>0){
      lines.push({id:'terrain-cut',category:'Erdarbeiten',name:'Aushub / Abtrag',unit:'m³',quantity:terrainAnalysis.cutVolume,unitPrice:48,total:terrainAnalysis.cutVolume*48});
    }
    if(terrainAnalysis.fillVolume>0){
      lines.push({id:'terrain-fill',category:'Erdarbeiten',name:'Aufschüttung / Auftrag',unit:'m³',quantity:terrainAnalysis.fillVolume,unitPrice:48,total:terrainAnalysis.fillVolume*48});
    }

    return lines;
  }, [objects,terrainAnalysis.cutVolume,terrainAnalysis.fillVolume]);

  const costGroups = useMemo(() => {
    const groups=new Map<string,{category:string;total:number;lines:number}>();
    quantityLines.forEach(line=>{
      const current=groups.get(line.category) || {category:line.category,total:0,lines:0};
      current.total+=line.total;
      current.lines+=1;
      groups.set(line.category,current);
    });
    return [...groups.values()].sort((a,b)=>b.total-a.total);
  }, [quantityLines]);

  const projectGrandTotal = useMemo(
    () => quantityLines.reduce((sum,line)=>sum+line.total,0),
    [quantityLines]
  );

  const budgetDifference = projectInfo.budget-projectGrandTotal;
  const budgetUsagePercent = projectInfo.budget>0 ? projectGrandTotal/projectInfo.budget*100 : 0;

  const filteredMaterialLibrary = useMemo(() => {
    const query=materialSearch.trim().toLowerCase();
    return MATERIAL_LIBRARY.filter(material => {
      const matchesSearch=!query
        || material.name.toLowerCase().includes(query)
        || material.description.toLowerCase().includes(query);
      const matchesCategory=materialCategoryFilter==='all' || material.category===materialCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [materialSearch,materialCategoryFilter]);

  const materialUsageStats = useMemo(() => {
    return MATERIAL_LIBRARY.map(material => ({
      material,
      count:objects.filter(object=>(object.materialId || defaultMaterialIdForObject(object))===material.id).length
    })).filter(item=>item.count>0);
  }, [objects]);

  const irrigationEmitters = useMemo(
    () => objects.filter(object=>object.type==='irrigation' && object.emitterType),
    [objects]
  );

  const irrigationPipes = useMemo(
    () => objects.filter(object=>object.type==='irrigation' && object.points?.length && !object.emitterType),
    [objects]
  );

  const irrigationChecks = useMemo((): IrrigationCheck[] => {
    const checks: IrrigationCheck[] = [];

    irrigationEmitters.forEach(emitter => {
      const zone = irrigationZones.find(item=>item.id===emitter.irrigationZoneId);
      if (!zone) {
        checks.push({
          id:`zone-${emitter.id}`,
          severity:'warning',
          title:'Bewässerungszone fehlt',
          message:`${emitter.name} ist keiner gültigen Zone zugeordnet.`,
          objectIds:[emitter.id]
        });
      }
    });

    for (let i=0;i<irrigationEmitters.length;i++) {
      const a = irrigationEmitters[i];
      if (a.emitterType!=='sprinkler') continue;
      const radiusA = Math.max(0.1,a.irrigationRadius || 2.5);

      for (let j=i+1;j<irrigationEmitters.length;j++) {
        const b = irrigationEmitters[j];
        if (b.emitterType!=='sprinkler') continue;
        if (a.irrigationZoneId!==b.irrigationZoneId) continue;

        const radiusB = Math.max(0.1,b.irrigationRadius || 2.5);
        const distance = Math.hypot(a.x-b.x,a.y-b.y);
        const overlap = circleOverlapArea(radiusA,radiusB,distance);
        const smaller = Math.PI*Math.min(radiusA,radiusB)**2;
        const ratio = smaller ? overlap/smaller : 0;

        if (distance>radiusA+radiusB*1.15) {
          checks.push({
            id:`gap-${a.id}-${b.id}`,
            severity:'warning',
            title:'Mögliche Bewässerungslücke',
            message:`${a.name} und ${b.name} liegen ${distance.toFixed(2)} m auseinander. Reichweiten überdecken sich kaum.`,
            objectIds:[a.id,b.id]
          });
        } else if (ratio>0.72) {
          checks.push({
            id:`overlap-${a.id}-${b.id}`,
            severity:'info',
            title:'Starke Regnerüberlappung',
            message:`${a.name} und ${b.name} überdecken sich stark. Durchfluss und Laufzeit prüfen.`,
            objectIds:[a.id,b.id]
          });
        }
      }
    }

    irrigationZones.forEach(zone => {
      const zoneObjects = irrigationEmitters.filter(object=>object.irrigationZoneId===zone.id);
      const totalFlow = zoneObjects.reduce((sum,object)=>sum+(object.irrigationFlowLMin || 0),0);

      if (totalFlow>zone.maxFlowLMin) {
        checks.push({
          id:`flow-${zone.id}`,
          severity:'critical',
          title:'Zonendurchfluss zu hoch',
          message:`${zone.name}: ${totalFlow.toFixed(1)} l/min geplant, maximal ${zone.maxFlowLMin.toFixed(1)} l/min hinterlegt.`,
          objectIds:zoneObjects.map(object=>object.id)
        });
      }
    });

    return checks;
  }, [irrigationEmitters,irrigationZones]);

  const irrigationZoneStats = useMemo(() => {
    return irrigationZones.map(zone => {
      const emitters = irrigationEmitters.filter(object=>object.irrigationZoneId===zone.id);
      return {
        zone,
        count:emitters.length,
        flow:emitters.reduce((sum,object)=>sum+(object.irrigationFlowLMin || 0),0),
        coverage:emitters.reduce((sum,object)=>sum+irrigationCoverageArea(object),0)
      };
    });
  }, [irrigationZones,irrigationEmitters]);

  const dominantRunoffDirection = useMemo(() => {
    if (!flowVectors.length) return '—';
    const buckets = flowVectors.reduce((acc, vector) => {
      const label = flowDirectionLabel(vector);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string,number>);
    const entry = (Object.entries(buckets) as [string,number][]).sort((a,b)=>b[1]-a[1])[0];
    return entry?.[0] || '—';
  }, [flowVectors]);

  const retentionVolumeEstimate = useMemo(
    () => retentionCells.reduce((sum,cell)=>sum + cell.width * cell.height * cell.depthPotential, 0),
    [retentionCells]
  );

  const currentSolarPosition = useMemo(
    () => approximateSolarPosition(sunAnalysisDate,sunAnalysisHour,sunLatitude),
    [sunAnalysisDate,sunAnalysisHour,sunLatitude]
  );

  useEffect(() => {
    if (!sunAutoPosition) return;
    setSunAzimuth(currentSolarPosition.azimuth);
    setSunElevation(Math.max(1,currentSolarPosition.elevation));
  }, [sunAutoPosition,currentSolarPosition]);

  const currentShadowPolygons = useMemo(() => {
    if (!showShadowOverlay2D || sunElevation <= 1) return [];

    return objects
      .filter(isShadowBlocker)
      .map(object=>({
        id:object.id,
        name:object.name,
        polygon:shadowFootprintForObject(
          object,
          sunAzimuth,
          sunElevation,
          growthYear
        )
      }))
      .filter(item=>item.polygon.length>=3);
  }, [objects,sunAzimuth,sunElevation,growthYear,showShadowOverlay2D]);

  const sunHoursSummary = useMemo(() => {
    if (!sunHoursGrid.length) return {average:0,min:0,max:0};
    const values=sunHoursGrid.map(cell=>cell.sunHours);
    return {
      average:values.reduce((sum,value)=>sum+value,0)/values.length,
      min:Math.min(...values),
      max:Math.max(...values)
    };
  }, [sunHoursGrid]);

  const projectPlants = useMemo(
    () => objects.filter(object=>['tree','shrub','hedge'].includes(object.type) && object.speciesId),
    [objects]
  );

  const averagePlantGrowthProgress = useMemo(() => {
    if (!projectPlants.length) return 0;
    return projectPlants.reduce(
      (sum,plant)=>sum+currentPlantDimensions(plant,growthYear).progress,
      0
    ) / projectPlants.length;
  }, [projectPlants,growthYear]);

  const plantGrowthSummary = useMemo(() => {
    return projectPlants.reduce((summary,plant) => {
      const stage=growthStageLabel(currentPlantDimensions(plant,growthYear).progress);
      summary[stage]=(summary[stage]||0)+1;
      return summary;
    }, {} as Record<string,number>);
  }, [projectPlants,growthYear]);

  const filteredPlantCatalog = useMemo(() => {
    const query=plantSearch.trim().toLowerCase();

    return PLANT_CATALOG.filter(species => {
      const matchesSearch=!query
        || species.commonName.toLowerCase().includes(query)
        || species.botanicalName.toLowerCase().includes(query);
      const matchesCategory=plantCategoryFilter==='all' || species.category===plantCategoryFilter;
      const matchesLight=plantLightFilter==='all' || species.light.includes(plantLightFilter);
      const matchesWater=plantWaterFilter==='all' || species.waterNeed===plantWaterFilter;
      return matchesSearch && matchesCategory && matchesLight && matchesWater;
    });
  }, [plantSearch,plantCategoryFilter,plantLightFilter,plantWaterFilter]);

  const plantChecks = useMemo(
    () => plantChecksForProject(),
    [objects,projectHardinessZone]
  );

  const criticalPlantChecks=plantChecks.filter(check=>check.severity==='critical').length;
  const warningPlantChecks=plantChecks.filter(check=>check.severity==='warning').length;

  const metrics = useMemo(() => {
    const greenArea = zones.filter(z => z.kind === 'plantZone').reduce((s, z) => s + z.width * z.depth, 0);
    const hardArea = zones.filter(z => z.kind === 'hardscape').reduce((s, z) => s + z.width * z.depth, 0) + objects.filter(o => ['building','pool','pergola','stairs'].includes(o.type)).reduce((s, o) => s + o.width * o.depth, 0);
    const plantCount = objects.filter(o => ['tree','shrub','hedge'].includes(o.type)).length;
    const sealed = clamp(Math.round(hardArea / Math.max(1, hardArea + greenArea) * 100), 0, 100);
    const biodiversity = clamp(Math.round(45 + greenArea * 1.4 + plantCount * 4 - sealed * 0.2), 0, 100);
    return { greenArea, hardArea, plantCount, sealed, biodiversity };
  }, [zones, objects]);


  function createEditorSnapshot(label = 'Arbeitsstand'): EditorSnapshot {
    return {
      terrainBlobs: structuredClone(terrainBlobs),
      elevationPoints: structuredClone(elevationPoints),
      irrigationZones: structuredClone(irrigationZones),
      zones: structuredClone(zones),
      objects: structuredClone(objects),
      rooms: structuredClone(rooms),
      levels: structuredClone(levels),
      activeLevel,
      importedModels: structuredClone(importedModels),
      projectInfo: structuredClone(projectInfo),
      createdAt: new Date().toISOString(),
      label
    };
  }

  function snapshot() {
    setUndoStack(current => [...current.slice(-49), JSON.stringify(createEditorSnapshot('Undo'))]);
    setRedoStack([]);
  }

  function restoreEditorSnapshot(data: EditorSnapshot) {
    setTerrainBlobs(data.terrainBlobs || []);
    setElevationPoints(data.elevationPoints || []);
    if (data.irrigationZones?.length) setIrrigationZones(data.irrigationZones);
    setZones(data.zones || []);
    setObjects(data.objects || []);
    setRooms(data.rooms || []);
    if (data.levels?.length) setLevels(data.levels);
    if (typeof data.activeLevel === 'number') setActiveLevel(data.activeLevel);
    setImportedModels(data.importedModels || []);
    if (data.projectInfo) setProjectInfo(data.projectInfo);
  }

  function createNamedVersion() {
    const label = `Version ${versionSnapshots.length + 1}`;
    const next = [createEditorSnapshot(label), ...versionSnapshots].slice(0, 20);
    setVersionSnapshots(next);
    localStorage.setItem('al-green-v0193-versions', JSON.stringify(next));
    setStatus(`${label} gespeichert.`);
  }

  function restoreNamedVersion(index: number) {
    const version = versionSnapshots[index];
    if (!version) return;
    snapshot();
    restoreEditorSnapshot(version);
    setStatus(`${version.label} wiederhergestellt.`);
  }

  function deleteNamedVersion(index: number) {
    const next = versionSnapshots.filter((_, i) => i !== index);
    setVersionSnapshots(next);
    localStorage.setItem('al-green-v0193-versions', JSON.stringify(next));
  }

  function undo() {
    setUndoStack(current => {
      if (!current.length) return current;
      const previous = current[current.length - 1];
      setRedoStack(redo => [...redo.slice(-49), JSON.stringify(createEditorSnapshot('Redo'))]);
      try {
        restoreEditorSnapshot(JSON.parse(previous));
        setStatus('Rückgängig.');
      } catch {
        setStatus('Undo-Stand konnte nicht wiederhergestellt werden.');
      }
      return current.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack(current => {
      if (!current.length) return current;
      const nextState = current[current.length - 1];
      setUndoStack(undo => [...undo.slice(-49), JSON.stringify(createEditorSnapshot('Undo'))]);
      try {
        restoreEditorSnapshot(JSON.parse(nextState));
        setStatus('Wiederholt.');
      } catch {
        setStatus('Redo-Stand konnte nicht wiederhergestellt werden.');
      }
      return current.slice(0, -1);
    });
  }

  function snapValue(value: number, bypass = false) {
    if (!snapEnabled || bypass) return Number(value.toFixed(4));
    return Number((Math.round(value / gridSize) * gridSize).toFixed(4));
  }

  function nudgeSelected(dx: number, dy: number) {
    if (selectedKind === 'object' && selectedId !== null) {
      const ids=selectedObjectIds.length?selectedObjectIds:[selectedId];
      setObjects(v=>v.map(o=>ids.includes(o.id)?{...o,x:snapValue(o.x+dx,true),y:snapValue(o.y+dy,true)}:o));
    }
    if (selectedKind === 'zone' && selectedId !== null) setZones(v=>v.map(z=>z.id===selectedId?{...z,x:snapValue(z.x+dx,true),y:snapValue(z.y+dy,true)}:z));
    if (selectedKind === 'terrain' && selectedId !== null) setTerrainBlobs(v=>v.map(b=>b.id===selectedId?{...b,x:snapValue(b.x+dx,true),y:snapValue(b.y+dy,true)}:b));
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT','TEXTAREA','SELECT'].includes(target.tagName)) {
        if (event.key === 'Escape') target.blur();
        return;
      }

      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (mod && key === 'z' && !event.shiftKey) { event.preventDefault(); undo(); return; }
      if ((mod && key === 'y') || (mod && event.shiftKey && key === 'z')) { event.preventDefault(); redo(); return; }
      if (mod && key === 'c') { event.preventDefault(); copySelectedObjects(); return; }
      if (mod && key === 'x') { event.preventDefault(); cutSelectedObjects(); return; }
      if (mod && key === 'v') { event.preventDefault(); pasteObjects(); return; }
      if (mod && key === 'a') {
        event.preventDefault();
        setSelectedKind('object');
        setSelectedObjectIds(objects.map(o => o.id));
        setSelectedId(objects[0]?.id ?? null);
        setStatus('Alle Objekte ausgewählt.');
        return;
      }
      if (mod && key === 'd') { event.preventDefault(); duplicateSelected(); return; }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedKind && selectedId !== null) {
          event.preventDefault();
          deleteSelection();
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setDrag2D(null);
        setSnapGuides(null);
        setContextMenu(null);
        setWallDraftStart(null);
        setHardscapeDraftPoints([]);
        setStairDraftStart(null);
        setSelectedObjectIds([]);
        setSelectedKind(null);
        setSelectedId(null);
        setStatus('Aktion abgebrochen.');
        return;
      }

      if (key === 'g' && !event.shiftKey) { event.preventDefault(); groupSelected(); return; }
      if (key === 'g' && event.shiftKey) { event.preventDefault(); ungroupSelected(); return; }

      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const step = event.shiftKey ? 0.01 : event.altKey ? 0.05 : 0.1;
      if (event.key === 'ArrowLeft') nudgeSelected(-step,0);
      if (event.key === 'ArrowRight') nudgeSelected(step,0);
      if (event.key === 'ArrowUp') nudgeSelected(0,-step);
      if (event.key === 'ArrowDown') nudgeSelected(0,step);
    };

    const onPointerDown = () => closeContextMenu();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [selectedId, selectedKind, selectedObjectIds, objects, zones, terrainBlobs, importedModels, projectInfo, gridSize, snapEnabled]);

  function objectLayer(obj: GardenObject) {
    if (['building','floor','wall','interiorWall','roof','window','door','slidingDoor','balcony','railing','column','carport','winterGarden'].includes(obj.type)) return 'buildings';
    if (['tree','shrub','hedge'].includes(obj.type) || obj.speciesId) return 'plants';
    if (['pool','pond'].includes(obj.type)) return 'water';
    if (obj.type === 'light') return 'lighting';
    if (['irrigation','drainage'].includes(obj.type)) return 'utilities';
    if (['bench','planter','firepit','rock'].includes(obj.type)) return 'furniture';
    return 'structures';
  }

  function saveBrowserProject() {
    localStorage.setItem('al-green-v028-project', JSON.stringify({ projectInfo, terrainBlobs, elevationPoints, irrigationZones, zones, objects, rooms, levels, activeLevel, importedModels, layers, gridSize, snapEnabled }));
    setStatus('Projekt im Browser gespeichert.');
  }

  function loadBrowserProject() {
    const raw = localStorage.getItem('al-green-v028-project') || localStorage.getItem('al-green-v022-project') || localStorage.getItem('al-green-v021-project') || localStorage.getItem('al-green-v0192-project') || localStorage.getItem('al-green-v019-project');
    if (!raw) { setStatus('Kein gespeichertes Browserprojekt gefunden.'); return; }
    try {
      const data = JSON.parse(raw);
      snapshot();
      if (data.projectInfo) setProjectInfo(data.projectInfo);
      if (data.terrainBlobs) setTerrainBlobs(data.terrainBlobs);
      if (Array.isArray(data.elevationPoints)) setElevationPoints(data.elevationPoints);
      if (Array.isArray(data.irrigationZones) && data.irrigationZones.length) setIrrigationZones(data.irrigationZones);
      if (data.zones) setZones(data.zones);
      if (data.objects) setObjects(data.objects);
      if (Array.isArray(data.rooms)) setRooms(data.rooms);
      if (Array.isArray(data.levels) && data.levels.length) setLevels(data.levels);
      if (typeof data.activeLevel === 'number') setActiveLevel(data.activeLevel);
      if (Array.isArray(data.importedModels)) setImportedModels(data.importedModels);
      if (data.layers) setLayers(data.layers);
      if (data.gridSize) setGridSize(data.gridSize);
      if (typeof data.snapEnabled === 'boolean') setSnapEnabled(data.snapEnabled);
      setStatus('Browserprojekt geladen.');
    } catch { setStatus('Gespeichertes Projekt konnte nicht gelesen werden.'); }
  }

  function deleteSelection() {
    if (!selectedKind || selectedId === null) return;
    snapshot();
    if (selectedKind === 'terrain') setTerrainBlobs(v => v.filter(b => b.id !== selectedId));
    if (selectedKind === 'zone') setZones(v => v.filter(z => z.id !== selectedId));
    if (selectedKind === 'room') {
      setRooms(v => v.filter(room => room.id !== selectedId));
      setSelectedRoomId(null);
    }
    if (selectedKind === 'object') {
      const ids = selectedObjectIds.length ? selectedObjectIds : [selectedId];
      setObjects(v => v.filter(o => !ids.includes(o.id)));
      setSelectedObjectIds([]);
    }
    setSelection(null, null, 'Auswahl gelöscht.');
  }

  function setSelection(kind: SelectedKind, id: number | null, message?: string) {
    setSelectedKind(kind);
    setSelectedId(id);
    if (kind !== 'object') setSelectedObjectIds([]);
    if (kind !== 'room') setSelectedRoomId(null);
    if (kind === 'room' && id !== null) setSelectedRoomId(id);
    if (kind === 'object' && id !== null) setSelectedObjectIds([id]);
    if (message) setStatus(message);
  }

  function selectObject(id: number, additive = false) {
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    setSelectedKind('object');
    setSelectedId(id);
    if (additive) {
      setSelectedObjectIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current,id]);
      setStatus(`${obj.name}: Mehrfachauswahl geändert.`);
    } else {
      setSelectedObjectIds([id]);
      setStatus(`${obj.name} ausgewählt.`);
    }
  }

  function snapObjectToScene(obj: GardenObject, rawX: number, rawY: number) {
    let x = rawX;
    let y = rawY;
    let rotation = obj.rotation;
    let parentId = obj.parentId;
    let hostOffset = obj.hostOffset;
    let guideX: number | undefined;
    let guideY: number | undefined;
    const tolerance = Math.max(0.08, Math.min(gridSize * 0.6, 0.22));

    for (const other of objects) {
      if (other.id === obj.id) continue;
      const xTargets = [other.x, other.x-other.width/2, other.x+other.width/2];
      const yTargets = [other.y, other.y-other.depth/2, other.y+other.depth/2];
      const ownX = [x, x-obj.width/2, x+obj.width/2];
      const ownY = [y, y-obj.depth/2, y+obj.depth/2];
      for (const target of xTargets) for (const current of ownX) if (Math.abs(current-target)<=tolerance) { x += target-current; guideX=target; }
      for (const target of yTargets) for (const current of ownY) if (Math.abs(current-target)<=tolerance) { y += target-current; guideY=target; }
    }

  if (['window','door','slidingDoor'].includes(obj.type)) {
      let best: { wall:GardenObject; distance:number; localX:number } | null = null;
      for (const wall of objects.filter(o => ['wall','interiorWall'].includes(o.type))) {
        const local = objectLocalPoint(wall,x,y);
        const within = Math.abs(local.x) <= wall.width/2 + 0.25;
        const distance = Math.abs(local.y);
        if (within && distance <= 0.45 && (!best || distance < best.distance)) best = {wall,distance,localX:clamp(local.x,-wall.width/2+obj.width/2,wall.width/2-obj.width/2)};
      }
      if (best) {
        const snapped = objectWorldPoint(best.wall,best.localX,0);
        x = snapped.x;
        y = snapped.y;
        rotation = best.wall.rotation;
        parentId = best.wall.id;
        hostOffset = best.localX;
      }
    }

    if (['wall','interiorWall'].includes(obj.type)) {
      const moved = {...obj,x,y};
      let bestDelta: {dx:number;dy:number;d:number} | null = null;
      for (const other of objects.filter(o=>o.id!==obj.id && ['wall','interiorWall'].includes(o.type))) {
        for (const a of wallEndpoints(moved)) for (const b of wallEndpoints(other)) {
          const d = distance2D(a,b);
          if (d<=0.28 && (!bestDelta || d<bestDelta.d)) bestDelta={dx:b.x-a.x,dy:b.y-a.y,d};
        }
      }
      if (bestDelta) { x += bestDelta.dx; y += bestDelta.dy; }
    }

    setSnapGuides(guideX!==undefined || guideY!==undefined ? {x:guideX,y:guideY} : null);
    return {x,y,rotation,parentId,hostOffset};
  }

  function alignSelected(mode: 'left'|'centerX'|'right'|'top'|'centerY'|'bottom') {
    if (selectedObjectIds.length < 2) return;
    snapshot();
    const list = objects.filter(o=>selectedObjectIds.includes(o.id));
    const minX=Math.min(...list.map(o=>o.x-o.width/2)); const maxX=Math.max(...list.map(o=>o.x+o.width/2));
    const minY=Math.min(...list.map(o=>o.y-o.depth/2)); const maxY=Math.max(...list.map(o=>o.y+o.depth/2));
    const centerX=(minX+maxX)/2; const centerY=(minY+maxY)/2;
    setObjects(current=>current.map(o=>{
      if (!selectedObjectIds.includes(o.id)) return o;
      if (mode==='left') return {...o,x:minX+o.width/2};
      if (mode==='centerX') return {...o,x:centerX};
      if (mode==='right') return {...o,x:maxX-o.width/2};
      if (mode==='top') return {...o,y:minY+o.depth/2};
      if (mode==='centerY') return {...o,y:centerY};
      return {...o,y:maxY-o.depth/2};
    }));
    setStatus(`${selectedObjectIds.length} Objekte ausgerichtet.`);
  }

  function groupSelected() {
    if (selectedObjectIds.length<2) return;
    const groupId=`group-${Date.now()}`;
    snapshot();
    setObjects(current=>current.map(o=>selectedObjectIds.includes(o.id)?{...o,groupId}:o));
    setStatus(`${selectedObjectIds.length} Objekte gruppiert.`);
  }

  function ungroupSelected() {
    if (!selectedObjectIds.length) return;
    snapshot();
    setObjects(current=>current.map(o=>selectedObjectIds.includes(o.id)?{...o,groupId:undefined}:o));
    setStatus('Gruppierung aufgehoben.');
  }

  function selectGroupOf(id:number) {
    const obj=objects.find(o=>o.id===id);
    if (!obj?.groupId) return;
    const ids=objects.filter(o=>o.groupId===obj.groupId).map(o=>o.id);
    setSelectedKind('object'); setSelectedId(id); setSelectedObjectIds(ids); setStatus(`Gruppe mit ${ids.length} Objekten ausgewählt.`);
  }

  function duplicateSelected() {
    if (!selectedObjectIds.length) return;
    snapshot();
    const now=Date.now();
    const copies=objects.filter(o=>selectedObjectIds.includes(o.id)).map((o,index)=>({...o,id:now+index+1,x:o.x+0.35,y:o.y+0.35,name:`${o.name} Kopie`,groupId:undefined}));
    setObjects(current=>[...current,...copies]);
    setSelectedObjectIds(copies.map(o=>o.id)); setSelectedId(copies[0]?.id ?? null); setSelectedKind('object');
    setStatus(`${copies.length} Objekt(e) dupliziert.`);
  }

  function connectSelectedWall() {
    if (!selectedObject || !['wall','interiorWall'].includes(selectedObject.type)) return;
    const others=objects.filter(o=>o.id!==selectedObject.id && ['wall','interiorWall'].includes(o.type));
    if (!others.length) return;
    let best:{dx:number;dy:number;distance:number}|null=null;
    for (const own of wallEndpoints(selectedObject)) for (const other of others) for (const target of wallEndpoints(other)) {
      const d=distance2D(own,target);
      if (!best || d<best.distance) best={dx:target.x-own.x,dy:target.y-own.y,distance:d};
    }
    if (!best) return;
    snapshot();
    setObjects(current=>current.map(o=>o.id===selectedObject.id?{...o,x:o.x+best!.dx,y:o.y+best!.dy}:o));
    setStatus(`Wand-Endpunkt verbunden · ${best.distance.toFixed(2)} m korrigiert.`);
  }

  function copySelectedObjects() {
    if (!selectedObjectIds.length) return;
    editorClipboardRef.current = structuredClone(objects.filter(o => selectedObjectIds.includes(o.id)));
    setStatus(`${editorClipboardRef.current.length} Objekt(e) kopiert.`);
  }

  function pasteObjects(targetX?: number, targetY?: number) {
    const source = editorClipboardRef.current;
    if (!source.length) return;
    snapshot();
    const minX = Math.min(...source.map(o => o.x));
    const minY = Math.min(...source.map(o => o.y));
    const offsetX = targetX !== undefined ? targetX - minX : 0.4;
    const offsetY = targetY !== undefined ? targetY - minY : 0.4;
    const base = Date.now();
    const copies = source.map((o, index) => ({
      ...structuredClone(o),
      id: base + index + 1,
      x: o.x + offsetX,
      y: o.y + offsetY,
      name: `${o.name} Kopie`,
      groupId: undefined
    }));
    setObjects(current => [...current, ...copies]);
    setSelectedKind('object');
    setSelectedId(copies[0]?.id ?? null);
    setSelectedObjectIds(copies.map(o => o.id));
    setStatus(`${copies.length} Objekt(e) eingefügt.`);
  }

  function cutSelectedObjects() {
    copySelectedObjects();
    deleteSelection();
  }

  function handleContextMenu(e: React.MouseEvent<SVGSVGElement>) {
    e.preventDefault();
    const p = worldFromClient(svgRef.current, e.clientX, e.clientY);
    const hit = [...objects].reverse().find(obj => objectHit(p, obj));
    if (hit) {
      selectObject(hit.id, false);
      setContextMenu({ x: e.clientX, y: e.clientY, worldX: p.x, worldY: p.y, targetKind: 'object', targetId: hit.id });
    } else {
      setContextMenu({ x: e.clientX, y: e.clientY, worldX: p.x, worldY: p.y, targetKind: null, targetId: null });
    }
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  function snapPointToWallEndpoints(point: {x:number;y:number}, tolerance = 0.28) {
    let best = { ...point };
    let bestDistance = tolerance;

    objects.filter(isWallObject).forEach(wall => {
      wallEndpoints(wall).forEach(endpoint => {
        const distance = distance2D(point, endpoint);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x: endpoint.x, y: endpoint.y };
        }
      });
    });

    return best;
  }

  function createWallFromPoints(
    type: 'wall' | 'interiorWall',
    start: {x:number;y:number},
    end: {x:number;y:number}
  ) {
    const length = distance2D(start, end);
    if (length < 0.15) {
      setStatus('Wand ist zu kurz. Zweiten Punkt weiter entfernt setzen.');
      return null;
    }

    snapshot();

    const id = Date.now();
    const rotation = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
    const exterior = type === 'wall';

    const wall: GardenObject = {
      id,
      type,
      name: exterior ? 'Neue Außenwand' : 'Neue Innenwand',
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
      width: length,
      depth: exterior ? 0.22 : 0.14,
      thickness: exterior ? 0.22 : 0.14,
      height: exterior ? 2.8 : 2.7,
      rotation,
      color: exterior ? '#f8fafc' : '#e5e7eb',
      material: exterior ? 'Mauerwerk / Putz' : 'Innenwand',
      unitCost: exterior ? 260 : 120,
      level: activeLevel,
      note: '',
      wallNodeStart: `node-${Math.round(start.x*1000)}-${Math.round(start.y*1000)}`,
      wallNodeEnd: `node-${Math.round(end.x*1000)}-${Math.round(end.y*1000)}`
    };

    setObjects(current => [...current, wall]);
    setSelectedKind('object');
    setSelectedId(id);
    setSelectedObjectIds([id]);
    setStatus(`${wall.name} erstellt · ${length.toFixed(2)} m.`);
    return wall;
  }

  function attachOpeningToNearestWall(openingId: number) {
    const opening = objects.find(obj => obj.id === openingId && isOpeningObject(obj));
    if (!opening) return;

    let best: { wall: GardenObject; distance: number; localX: number } | null = null;

    objects.filter(isWallObject).forEach(wall => {
      const local = objectLocalPoint(wall, opening.x, opening.y);
      const within = Math.abs(local.x) <= wall.width / 2 + 0.5;
      const distance = Math.abs(local.y);
      if (within && (!best || distance < best.distance)) {
        best = {
          wall,
          distance,
          localX: clamp(local.x, -wall.width/2 + opening.width/2, wall.width/2 - opening.width/2)
        };
      }
    });

    if (!best) {
      setStatus('Keine geeignete Wand gefunden.');
      return;
    }

    snapshot();
    const world = objectWorldPoint(best.wall, best.localX, 0);

    setObjects(current => current.map(obj =>
      obj.id === opening.id
        ? {
            ...obj,
            x: world.x,
            y: world.y,
            rotation: best!.wall.rotation,
            parentId: best!.wall.id,
            hostOffset: best!.localX,
            sillHeight: obj.type === 'window' ? (obj.sillHeight ?? 0.9) : 0
          }
        : obj
    ));

    setStatus(`${opening.name} an ${best.wall.name} gekoppelt.`);
  }

  function detachOpening(openingId: number) {
    snapshot();
    setObjects(current => current.map(obj =>
      obj.id === openingId
        ? { ...obj, parentId: undefined, hostOffset: undefined }
        : obj
    ));
    setStatus('Öffnung von Wand gelöst.');
  }

  function updateHostedOpeningOffset(openingId: number, nextOffset: number) {
    setObjects(current => {
      const opening = current.find(obj => obj.id === openingId);
      if (!opening?.parentId) return current;
      const wall = current.find(obj => obj.id === opening.parentId && isWallObject(obj));
      if (!wall) return current;

      const offset = clamp(nextOffset, -wall.width/2 + opening.width/2, wall.width/2 - opening.width/2);
      const world = objectWorldPoint(wall, offset, 0);

      return current.map(obj =>
        obj.id === openingId
          ? { ...obj, x: world.x, y: world.y, rotation: wall.rotation, hostOffset: offset }
          : obj
      );
    });
  }

  function addElevationPoint(
    x: number,
    y: number,
    elevation = newElevationValue,
    kind: 'existing'|'proposed' = activeTerrainSurface
  ) {
    snapshot();
    const id = Date.now();
    const point: ElevationPoint = {
      id,
      x,
      y,
      elevation,
      kind,
      name: `${kind==='existing'?'Bestand':'Planung'} P${elevationPoints.filter(point=>point.kind===kind).length+1}`
    };

    setElevationPoints(current=>[...current,point]);
    setStatus(`${point.name} gesetzt · ${elevation.toFixed(2)} m.`);
  }

  function updateElevationPoint(id: number, patch: Partial<ElevationPoint>) {
    setElevationPoints(current=>current.map(point=>point.id===id?{...point,...patch}:point));
  }

  function deleteElevationPoint(id: number) {
    snapshot();
    setElevationPoints(current=>current.filter(point=>point.id!==id));
    setStatus('Höhenpunkt gelöscht.');
  }

  function copyExistingToProposed() {
    snapshot();
    const proposed = elevationPoints
      .filter(point=>point.kind==='existing')
      .map((point,index)=>({
        ...structuredClone(point),
        id:Date.now()+index+1,
        kind:'proposed' as const,
        name:`Planung P${index+1}`
      }));

    setElevationPoints(current=>[
      ...current.filter(point=>point.kind!=='proposed'),
      ...proposed
    ]);

    setActiveTerrainSurface('proposed');
    setStatus(`${proposed.length} Bestandshöhen in Planung übernommen.`);
  }

  function createPlateauAt(x: number, y: number) {
    snapshot();
    const count = 12;
    const base = Date.now();
    const points: ElevationPoint[] = [];

    points.push({
      id:base,
      x,
      y,
      elevation:plateauElevation,
      kind:'proposed',
      name:'Plateau Zentrum'
    });

    for (let i=0;i<count;i++) {
      const angle=(i/count)*Math.PI*2;
      points.push({
        id:base+i+1,
        x:x+Math.cos(angle)*plateauRadius,
        y:y+Math.sin(angle)*plateauRadius,
        elevation:plateauElevation,
        kind:'proposed',
        name:`Plateau Rand ${i+1}`
      });
    }

    setElevationPoints(current=>[...current,...points]);
    setActiveTerrainSurface('proposed');
    setStatus(`Plateau mit Ø ${(plateauRadius*2).toFixed(1)} m auf ${plateauElevation.toFixed(2)} m angelegt.`);
  }

  function calculateCurrentSlope() {
    const proposed = elevationPoints.filter(point=>point.kind==='proposed');
    if (proposed.length < 2) {
      setStatus('Für eine Neigung mindestens zwei Planungshöhenpunkte setzen.');
      return;
    }

    const sorted=[...proposed].sort((a,b)=>a.x-b.x || a.y-b.y);
    const first=sorted[0];
    const last=sorted[sorted.length-1];
    const distance=Math.max(0.01,distance2D(first,last));
    const slope=((last.elevation-first.elevation)/distance)*100;

    setStatus(`Planungsgefälle zwischen äußersten Punkten: ${slope.toFixed(2)} % über ${distance.toFixed(2)} m.`);
  }

  function resetHardscapeDraft() {
    setHardscapeDraftPoints([]);
    setStairDraftStart(null);
  }

  function addHardscapeDraftPoint(point: {x:number;y:number}) {
    setHardscapeDraftPoints(current=>[...current,point]);
    setStatus(`${hardscapeDraftType==='path'?'Weg':'Gartenmauer'}: Punkt ${hardscapeDraftPoints.length+1} gesetzt.`);
  }

  function undoHardscapeDraftPoint() {
    setHardscapeDraftPoints(current=>current.slice(0,-1));
    setStatus('Letzten Linienpunkt entfernt.');
  }

  function finalizeHardscapePolyline() {
    if (hardscapeDraftPoints.length < 2) {
      setStatus('Mindestens zwei Punkte erforderlich.');
      return;
    }

    snapshot();

    const center = polylineCenter(hardscapeDraftPoints);
    const relative = relativePolyline(hardscapeDraftPoints,center);
    const length = polylineLength(hardscapeDraftPoints);
    const xs = hardscapeDraftPoints.map(point=>point.x);
    const ys = hardscapeDraftPoints.map(point=>point.y);
    const boundsWidth = Math.max(0.2,Math.max(...xs)-Math.min(...xs));
    const boundsDepth = Math.max(0.2,Math.max(...ys)-Math.min(...ys));
    const id = Date.now();

    const start = hardscapeDraftPoints[0];
    const end = hardscapeDraftPoints[hardscapeDraftPoints.length-1];
    const surfaceKind = elevationPoints.some(point=>point.kind==='proposed') ? 'proposed' : 'existing';
    const startElevation = terrainSurfaceHeight(start.x,start.y,elevationPoints,terrainBlobs,surfaceKind);
    const endElevation = terrainSurfaceHeight(end.x,end.y,elevationPoints,terrainBlobs,surfaceKind);

    const object: GardenObject = hardscapeDraftType==='path'
      ? {
          id,
          type:'path',
          name:'Intelligenter Weg',
          x:center.x,
          y:center.y,
          width:boundsWidth,
          depth:boundsDepth,
          height:0.08,
          rotation:0,
          color:'#cbbba0',
          material:smartPathMaterial,
          materialId:smartPathMaterial.includes('Kies')?'gravel-light':smartPathMaterial.includes('Beton')?'concrete-warm':smartPathMaterial.includes('Ziegel')?'paving-brick-red':smartPathMaterial.includes('Holz')?'wood-larch':'stone-gneiss',
          unitCost:95,
          points:relative,
          pathWidth:smartPathWidth,
          curve:smartPathCurve,
          startElevation,
          endElevation,
          note:`Länge ${length.toFixed(2)} m`
        }
      : {
          id,
          type:'gardenWall',
          name:'Gartenmauer',
          x:center.x,
          y:center.y,
          width:boundsWidth,
          depth:boundsDepth,
          height:gardenWallHeight,
          rotation:0,
          color:'#9ca3af',
          material:'Naturstein / Beton',
          materialId:'stone-gneiss',
          unitCost:340,
          points:relative,
          thickness:gardenWallThickness,
          foundationDepth:gardenWallFoundation,
          capHeight:0.08,
          startElevation,
          endElevation,
          note:`Länge ${length.toFixed(2)} m`
        };

    setObjects(current=>[...current,object]);
    setSelectedKind('object');
    setSelectedId(id);
    setSelectedObjectIds([id]);
    setHardscapeDraftPoints([]);
    setStatus(`${object.name} erstellt · ${length.toFixed(2)} m.`);
  }

  function createSmartStairs(start: {x:number;y:number}, end: {x:number;y:number}) {
    const run = distance2D(start,end);
    if (run < 0.4) {
      setStatus('Treppenlauf ist zu kurz.');
      return;
    }

    const surfaceKind = elevationPoints.some(point=>point.kind==='proposed') ? 'proposed' : 'existing';
    let startElevation = terrainSurfaceHeight(start.x,start.y,elevationPoints,terrainBlobs,surfaceKind);
    let endElevation = terrainSurfaceHeight(end.x,end.y,elevationPoints,terrainBlobs,surfaceKind);

    if (Math.abs(endElevation-startElevation) < 0.08) {
      endElevation = startElevation + manualStairRise;
    }

    // Für eine saubere Darstellung wird intern immer vom tieferen zum höheren Punkt aufgebaut.
    let lowerPoint = start;
    let upperPoint = end;
    let lowerElevation = startElevation;
    let upperElevation = endElevation;

    if (startElevation > endElevation) {
      lowerPoint = end;
      upperPoint = start;
      lowerElevation = endElevation;
      upperElevation = startElevation;
    }

    const rise = upperElevation-lowerElevation;
    const metrics = stairMetrics(run,rise,preferredRiserHeight);
    const center = {
      x:(lowerPoint.x+upperPoint.x)/2,
      y:(lowerPoint.y+upperPoint.y)/2
    };

    snapshot();
    const id = Date.now();

    const object: GardenObject = {
      id,
      type:'stairs',
      name:'Intelligente Treppe',
      x:center.x,
      y:center.y,
      width:smartStairWidth,
      depth:run,
      height:rise,
      rotation:0,
      color:'#c8b6a6',
      material:'Naturstein',
      unitCost:420,
      points:relativePolyline([lowerPoint,upperPoint],center),
      startElevation:lowerElevation,
      endElevation:upperElevation,
      stepCount:metrics.count,
      riserHeight:metrics.riser,
      treadDepth:metrics.tread,
      note:`${metrics.count} Stufen · ${metrics.riser.toFixed(3)} m Steigung`
    };

    setObjects(current=>[...current,object]);
    setSelectedKind('object');
    setSelectedId(id);
    setSelectedObjectIds([id]);
    setStairDraftStart(null);
    setStatus(`${metrics.count} Stufen berechnet · Steigung ${metrics.riser.toFixed(3)} m · Auftritt ${metrics.tread.toFixed(3)} m.`);
  }


  function syncPlanningBriefFromPrompt() {
    const text=chat.trim();
    const lower=text.toLowerCase();

    const next:PlanningBrief={
      ...planningBrief,
      style:planningStyleFromText(text),
      budget:projectInfo.budget,
      priority:planningPriorityFromText(text),
      needsPool:lower.includes('pool') || lower.includes('schwimm'),
      needsTerrace:lower.includes('terrasse') || !lower.includes('keine terrasse'),
      needsPergola:lower.includes('pergola') || lower.includes('beschattung'),
      needsPlayArea:lower.includes('spiel') || lower.includes('kind'),
      needsPrivacy:lower.includes('sichtschutz') || lower.includes('privat'),
      needsLowMaintenance:lower.includes('pflegeleicht') || lower.includes('wenig pflege'),
      needsBiodiversity:lower.includes('biodivers') || lower.includes('insekten') || lower.includes('naturnah'),
      targetPlantCount:lower.includes('wenig pflanzen')?6:lower.includes('viele pflanzen')?22:12,
      notes:text
    };

    const questions:string[]=[];
    if(!text)questions.push('Welche Stilrichtung soll das Projekt haben?');
    if(!/(pool|schwimm|teich)/.test(lower))questions.push('Ist ein Wasserobjekt wie Pool oder Teich gewünscht?');
    if(!/(terrasse|sitzplatz|pergola)/.test(lower))questions.push('Welche Aufenthaltsbereiche sollen vorgesehen werden?');
    if(!/(pflege|wartung)/.test(lower))questions.push('Wie wichtig ist ein geringer Pflegeaufwand?');
    if(!/(budget|€|euro|kosten)/.test(lower))questions.push(`Soll mit dem hinterlegten Budget von ${projectInfo.budget.toLocaleString('de-DE')} € geplant werden?`);

    setPlanningBrief(next);
    setPlanningQuestions(questions.slice(0,5));
    setStatus(`Planungsbrief aus Beschreibung abgeleitet · ${questions.length} offene Frage(n).`);
  }

  function createLocalPlanningVariants() {
    const brief=planningBrief;
    const base=Date.now();

    const makeObjects=(variant:'A'|'B'|'C')=>{
      const objs:GardenObject[]=[];
      const terraceMaterial=variant==='B'?'wood-larch':variant==='C'?'paving-brick-red':'stone-gneiss';

      if(brief.needsTerrace){
        objs.push({
          id:base+(variant.charCodeAt(0))*100+1,
          type:'floor',
          name:`Variante ${variant} Terrasse`,
          x:variant==='B'?-2.5:variant==='C'?2.8:0,
          y:3.6,
          width:variant==='B'?5.2:6,
          depth:variant==='C'?2.8:3.4,
          height:0.12,
          rotation:0,
          color:materialDefinitionById(terraceMaterial)?.baseColor || '#b7afa6',
          material:materialDefinitionById(terraceMaterial)?.name,
          materialId:terraceMaterial,
          unitCost:110,
          surfaceLayers:defaultSurfaceLayersForMaterial(terraceMaterial)
        });
      }

      if(brief.needsPergola){
        objs.push({
          id:base+(variant.charCodeAt(0))*100+2,
          type:'pergola',
          name:`Variante ${variant} Pergola`,
          x:variant==='C'?3.2:-3,
          y:3.4,
          width:3.2,
          depth:2.6,
          height:2.7,
          rotation:variant==='B'?12:0,
          color:'#30343b',
          material:'Aluminium Anthrazit',
          materialId:'metal-anthracite',
          unitCost:420
        });
      }

      if(brief.needsPool){
        objs.push({
          id:base+(variant.charCodeAt(0))*100+3,
          type:'pool',
          name:`Variante ${variant} Pool`,
          x:variant==='A'?4.3:variant==='B'?3.8:-4.2,
          y:variant==='C'?1.0:0.6,
          width:variant==='B'?5.5:4.8,
          depth:2.6,
          height:1.35,
          rotation:variant==='B'?8:0,
          color:'#0f6f8f',
          material:'Wasser tiefblau',
          materialId:'water-deep',
          unitCost:1250
        });
      }

      if(brief.needsPrivacy){
        objs.push({
          id:base+(variant.charCodeAt(0))*100+4,
          type:'hedge',
          name:`Variante ${variant} Sichtschutz`,
          x:0,
          y:-5.1,
          width:variant==='C'?9:12,
          depth:0.7,
          height:1.8,
          rotation:0,
          color:'#14532d',
          material:'Pflanze',
          unitCost:48
        });
      }

      const plantCount=Math.max(4,Math.round(brief.targetPlantCount*(variant==='B'?0.8:variant==='C'?1.25:1)));
      for(let i=0;i<plantCount;i++){
        const angle=(i/plantCount)*Math.PI*2;
        const radius=variant==='C'?5.1:4.5;
        const tree=i%5===0;
        objs.push({
          id:base+(variant.charCodeAt(0))*100+20+i,
          type:tree?'tree':'shrub',
          name:tree?`Variante ${variant} Solitärbaum`:`Variante ${variant} Pflanzung`,
          x:Number((Math.cos(angle)*radius+(variant==='B'?0.8:0)).toFixed(2)),
          y:Number((Math.sin(angle)*radius*0.68-(variant==='C'?0.4:0)).toFixed(2)),
          width:tree?1.8:0.9,
          depth:tree?1.8:0.9,
          height:tree?4.2:1.1,
          rotation:0,
          color:tree?'#4d7c0f':'#22c55e',
          material:'Pflanze',
          unitCost:tree?165:28
        });
      }

      if(brief.needsPlayArea){
        objs.push({
          id:base+(variant.charCodeAt(0))*100+90,
          type:'planter',
          name:`Variante ${variant} flexible Familienfläche`,
          x:-4.6,
          y:1.8,
          width:3.2,
          depth:3,
          height:0.12,
          rotation:0,
          color:'#d9c7a8',
          material:'Rasen / Spielbereich',
          unitCost:55
        });
      }

      return objs.map(ensureObjectMaterial);
    };

    const makeZones=(variant:'A'|'B'|'C'):Zone[]=>[
      {id:base+variant.charCodeAt(0)*1000+1,kind:'hardscape',name:`Variante ${variant} Aufenthaltszone`,x:variant==='C'?2.5:0,y:3.3,width:7,depth:3.7,color:'#ead7dc'},
      {id:base+variant.charCodeAt(0)*1000+2,kind:'plantZone',name:`Variante ${variant} Pflanzzone`,x:variant==='B'?-3.8:3.8,y:-1.8,width:variant==='C'?6:4.4,depth:4,color:'#d1fae5'}
    ];

    const makeTerrain=(variant:'A'|'B'|'C'):TerrainBlob[]=>{
      if(variant==='A')return [{id:base+11001,name:'Sanfte Modellierung',x:-2.5,y:-1.5,radius:3.2,height:0.28,softness:1.7,source:'AI Planner'}];
      if(variant==='B')return [{id:base+12001,name:'Klare Ebene',x:2.5,y:1.2,radius:4,height:0.12,softness:1.9,source:'AI Planner'}];
      return [
        {id:base+13001,name:'Naturnahe Mulde',x:2,y:-1.8,radius:2.8,height:-0.32,softness:1.8,source:'AI Planner'},
        {id:base+13002,name:'Sanfte Erhebung',x:-3.2,y:1.4,radius:2.6,height:0.36,softness:1.7,source:'AI Planner'}
      ];
    };

    const variants:PlanningVariant[]=[
      {id:`A-${base}`,name:'Variante A · Ausgewogen',concept:'Klare Zonierung, ausgewogene Kosten und gute Nutzbarkeit.',score:88,objects:makeObjects('A'),zones:makeZones('A'),terrainBlobs:makeTerrain('A')},
      {id:`B-${base}`,name:'Variante B · Budget & Pflege',concept:'Reduzierte Elemente, klare Geometrie und geringerer Pflegeaufwand.',score:brief.priority==='budget'||brief.needsLowMaintenance?93:84,objects:makeObjects('B'),zones:makeZones('B'),terrainBlobs:makeTerrain('B')},
      {id:`C-${base}`,name:'Variante C · Natur & Erlebnis',concept:'Mehr Pflanzung, weichere Geländemodellierung und höhere ökologische Vielfalt.',score:brief.priority==='ecology'||brief.needsBiodiversity?94:86,objects:makeObjects('C'),zones:makeZones('C'),terrainBlobs:makeTerrain('C')}
    ];

    setPlanningVariants(variants);
    setSelectedPlanningVariantId(variants.sort((a,b)=>b.score-a.score)[0].id);
    setStatus('Drei Planungsvarianten erzeugt.');
  }

  function applyPlanningVariant(variantId:string) {
    const variant=planningVariants.find(item=>item.id===variantId);
    if(!variant)return;

    snapshot();
    setObjects(variant.objects);
    setZones(variant.zones);
    setTerrainBlobs(variant.terrainBlobs);
    setSelectedPlanningVariantId(variant.id);
    setView('splitVertical');
    setSelection('object',variant.objects[0]?.id || null,`${variant.name} übernommen.`);
  }

  function runProjectAudit() {
    if(auditBusy)return;
    setAuditBusy(true);
    setStatus('Projektprüfung läuft …');

    window.setTimeout(()=>{
      try{
        const issues:ProjectAuditIssue[]=[];
        const strengths:string[]=[];
        const recommendations:string[]=[];
        const categoryScores:Record<string,number>={
          geometry:100,terrain:100,planting:100,water:100,sun:100,materials:100,budget:100,architecture:100
        };

        // Geometry collisions
        for(let i=0;i<objects.length;i++){
          const a=objects[i];
          if(['tree','shrub','hedge','irrigation','light','drainage'].includes(a.type))continue;
          for(let j=i+1;j<objects.length;j++){
            const b=objects[j];
            if(['tree','shrub','hedge','irrigation','light','drainage'].includes(b.type))continue;
            if(a.parentId===b.id || b.parentId===a.id)continue;
            const overlap=boundsOverlapArea(objectBounds2D(a),objectBounds2D(b));
            if(overlap>Math.min(a.width*a.depth,b.width*b.depth)*0.28){
              issues.push({
                id:`collision-${a.id}-${b.id}`,severity:'warning',category:'geometry',
                title:'Geometrische Überschneidung',
                message:`${a.name} und ${b.name} überschneiden sich deutlich.`,
                objectIds:[a.id,b.id],fixable:true
              });
              categoryScores.geometry-=6;
            }
          }
        }

        // Site bounds
        objects.forEach(object=>{
          const bounds=objectBounds2D(object);
          if(bounds.minX<-10 || bounds.maxX>10 || bounds.minY<-6.5 || bounds.maxY>6.5){
            issues.push({
              id:`bounds-${object.id}`,severity:'warning',category:'geometry',
              title:'Objekt außerhalb der Planfläche',
              message:`${object.name} ragt über die definierte Planfläche hinaus.`,
              objectIds:[object.id],fixable:true
            });
            categoryScores.geometry-=5;
          }
        });

        // Terrain/drainage
        if(!elevationPoints.length && !terrainBlobs.length){
          issues.push({id:'terrain-empty',severity:'warning',category:'terrain',title:'Gelände nicht definiert',message:'Es sind keine Höhenpunkte oder Geländemodellierungen vorhanden.',objectIds:[],fixable:false});
          categoryScores.terrain-=20;
        }else{
          strengths.push('Geländemodellierung ist vorhanden.');
        }

        if(lowPoints.length>0 && !objects.some(object=>object.type==='drainage')){
          issues.push({id:'drainage-lowpoints',severity:'warning',category:'water',title:'Tiefpunkte ohne Entwässerung',message:`${lowPoints.length} Tiefpunkte erkannt, aber keine Drainage eingeplant.`,objectIds:[],fixable:true});
          categoryScores.water-=18;
        }

        // Planting
        const concretePlants=objects.filter(object=>object.speciesId);
        if(concretePlants.length>=6)strengths.push('Konkrete Pflanzenarten sind im Projekt hinterlegt.');
        if(objects.filter(object=>['tree','shrub','hedge'].includes(object.type)).length<4){
          issues.push({id:'planting-low',severity:'info',category:'planting',title:'Geringe Bepflanzungsdichte',message:'Für Mikroklima und räumliche Wirkung könnten zusätzliche Pflanzflächen sinnvoll sein.',objectIds:[],fixable:false});
          categoryScores.planting-=12;
        }

        plantChecks.forEach(check=>{
          issues.push({
            id:`plant-${check.id}`,
            severity:check.severity,
            category:'planting',
            title:check.title,
            message:check.message,
            objectIds:check.objectIds,
            fixable:false
          });
          categoryScores.planting-=check.severity==='critical'?8:4;
        });

        // Irrigation
        irrigationChecks.forEach(check=>{
          issues.push({
            id:`irrigation-${check.id}`,
            severity:check.severity,
            category:'water',
            title:check.title,
            message:check.message,
            objectIds:check.objectIds,
            fixable:false
          });
          categoryScores.water-=check.severity==='critical'?10:5;
        });

        // Materials
        const materialized=objects.filter(object=>object.materialId || defaultMaterialIdForObject(object));
        if(objects.length && materialized.length/objects.length<0.45){
          issues.push({id:'materials-low',severity:'info',category:'materials',title:'Materialkonzept unvollständig',message:'Weniger als die Hälfte der Objekte besitzt ein definiertes Bibliotheksmaterial.',objectIds:[],fixable:true});
          categoryScores.materials-=15;
        }else if(objects.length){
          strengths.push('Materialkonzept ist weitgehend definiert.');
        }

        // Budget
        const estimated=objects.reduce((sum,object)=>sum+estimateObjectCost(object),0);
        if(projectInfo.budget>0 && estimated>projectInfo.budget*1.15){
          issues.push({id:'budget-over',severity:'critical',category:'budget',title:'Budget voraussichtlich überschritten',message:`Grobe Objektkosten ${estimated.toLocaleString('de-DE',{maximumFractionDigits:0})} € liegen über dem Budget von ${projectInfo.budget.toLocaleString('de-DE')} €.`,objectIds:[],fixable:true});
          categoryScores.budget-=28;
        }else if(projectInfo.budget>0){
          strengths.push('Grobe Objektkosten liegen im hinterlegten Budgetrahmen.');
        }

        // Architecture
        const walls=objects.filter(isWallObject);
        if(objects.some(object=>object.type==='building') && walls.length<4){
          issues.push({id:'architecture-shell',severity:'warning',category:'architecture',title:'Gebäude noch nicht konstruktiv ausgearbeitet',message:'Ein Gebäudekörper ist vorhanden, aber weniger als vier Wandobjekte sind definiert.',objectIds:[],fixable:false});
          categoryScores.architecture-=18;
        }

        // Sun
        if(sunHoursGrid.length){
          if(sunHoursSummary.average<4){
            issues.push({id:'sun-low',severity:'info',category:'sun',title:'Geringe mittlere Besonnung',message:`Die berechnete mittlere Besonnung liegt bei ${sunHoursSummary.average.toFixed(1)} h.`,objectIds:[],fixable:false});
            categoryScores.sun-=10;
          }else{
            strengths.push('Besonnung ist analysiert und im Mittel ausreichend.');
          }
        }else{
          recommendations.push('Sonnenstundenanalyse ausführen, bevor Terrasse, Pool und Pflanzflächen finalisiert werden.');
          categoryScores.sun-=8;
        }

        Object.keys(categoryScores).forEach(key=>{
          categoryScores[key]=clamp(categoryScores[key],0,100);
        });

        const score=Math.round(
          Object.values(categoryScores).reduce((sum,value)=>sum+value,0) /
          Object.values(categoryScores).length
        );

        if(!issues.some(issue=>issue.severity==='critical'))strengths.push('Keine kritischen geometrischen oder technischen Konflikte erkannt.');
        if(!objects.length)recommendations.push('Mit einer Planungsvariante oder einem ersten Grundlayout beginnen.');
        if(!flowVectors.length)recommendations.push('Fließanalyse durchführen, um Entwässerung und Tiefpunkte zu überprüfen.');
        if(concretePlants.length<4)recommendations.push('Konkrete Pflanzenarten aus der Bibliothek zuordnen.');
        if(materialized.length<Math.max(1,objects.length*0.7))recommendations.push('Materialbibliothek konsequent auf Hauptoberflächen anwenden.');

        const audit:ProjectAudit={
          score,
          grade:auditGrade(score),
          issues,
          strengths,
          recommendations,
          categoryScores
        };

        setProjectAudit(audit);
        setStatus(`Projektprüfung abgeschlossen · ${score}/100 · Note ${audit.grade}.`);
      }finally{
        setAuditBusy(false);
      }
    },30);
  }

  function applySafeAuditFixes() {
    if(!projectAudit)return;
    snapshot();

    setObjects(current=>current.map(object=>{
      let next=ensureObjectMaterial(object);

      const bounds=objectBounds2D(next);
      if(bounds.minX<-10)next={...next,x:next.x+(-10-bounds.minX)};
      if(bounds.maxX>10)next={...next,x:next.x-(bounds.maxX-10)};
      if(bounds.minY<-6.5)next={...next,y:next.y+(-6.5-bounds.minY)};
      if(bounds.maxY>6.5)next={...next,y:next.y-(bounds.maxY-6.5)};

      return next;
    }));

    if(lowPoints.length && !objects.some(object=>object.type==='drainage')){
      const base=Date.now();
      setObjects(current=>[
        ...current,
        ...lowPoints.slice(0,3).map((point,index):GardenObject=>({
          id:base+index+1,
          type:'drainage',
          name:`Auto-Drainage ${index+1}`,
          x:point.x,
          y:point.y,
          width:1.2,
          depth:0.18,
          height:0.08,
          rotation:0,
          color:'#475569',
          material:'Drainage',
          unitCost:45
        }))
      ]);
    }

    setStatus('Sichere Optimierungen angewendet: Materialzuordnung, Begrenzung und optionale Drainagepunkte.');
  }

  function applyMaterialToObject(objectId:number, materialId:string) {
    const definition=materialDefinitionById(materialId);
    if(!definition) return;

    snapshot();
    setObjects(current=>current.map(object=>{
      if(object.id!==objectId) return object;
      return {
        ...object,
        materialId,
        material:definition.name,
        color:definition.baseColor,
        textureScale:definition.textureScale,
        roughnessOverride:undefined,
        metalnessOverride:undefined,
        surfaceLayers:object.surfaceLayers?.length
          ? object.surfaceLayers.map((layer,index)=>index===0?{...layer,materialId}:layer)
          : defaultSurfaceLayersForMaterial(materialId)
      };
    }));

    setSelectedMaterialId(materialId);
    setStatus(`${definition.name} auf Objekt angewendet.`);
  }

  function applyMaterialToSelectedObjects(materialId:string) {
    if(!selectedObjectIds.length) {
      setStatus('Zuerst mindestens ein Objekt auswählen.');
      return;
    }

    const definition=materialDefinitionById(materialId);
    if(!definition) return;

    snapshot();
    setObjects(current=>current.map(object=>selectedObjectIds.includes(object.id)
      ? {
          ...object,
          materialId,
          material:definition.name,
          color:definition.baseColor,
          textureScale:definition.textureScale,
          surfaceLayers:object.surfaceLayers?.length
            ? object.surfaceLayers.map((layer,index)=>index===0?{...layer,materialId}:layer)
            : defaultSurfaceLayersForMaterial(materialId)
        }
      : object
    ));

    setSelectedMaterialId(materialId);
    setStatus(`${definition.name} auf ${selectedObjectIds.length} Objekt(e) angewendet.`);
  }

  function addSurfaceLayer(objectId:number) {
    const layer:SurfaceLayer={
      id:`layer-${Date.now()}`,
      name:'Neue Schicht',
      thicknessMm:50,
      materialId:selectedMaterialId
    };

    setObjects(current=>current.map(object=>object.id===objectId
      ? {...object,surfaceLayers:[...(object.surfaceLayers || []),layer]}
      : object
    ));
  }

  function updateSurfaceLayer(objectId:number, layerId:string, patch:Partial<SurfaceLayer>) {
    setObjects(current=>current.map(object=>object.id===objectId
      ? {...object,surfaceLayers:(object.surfaceLayers || []).map(layer=>layer.id===layerId?{...layer,...patch}:layer)}
      : object
    ));
  }

  function deleteSurfaceLayer(objectId:number, layerId:string) {
    setObjects(current=>current.map(object=>object.id===objectId
      ? {...object,surfaceLayers:(object.surfaceLayers || []).filter(layer=>layer.id!==layerId)}
      : object
    ));
  }

  function addIrrigationZone() {
    const id=`zone-${Date.now()}`;
    const zone:IrrigationZone={
      id,
      name:`Zone ${irrigationZones.length+1}`,
      color:'#be123c',
      emitterType:'sprinkler',
      targetPressureBar:2.5,
      maxFlowLMin:24,
      enabled:true
    };
    setIrrigationZones(current=>[...current,zone]);
    setActiveIrrigationZoneId(id);
    setStatus(`${zone.name} angelegt.`);
  }

  function updateIrrigationZone(id:string, patch:Partial<IrrigationZone>) {
    setIrrigationZones(current=>current.map(zone=>zone.id===id?{...zone,...patch}:zone));
  }

  function deleteIrrigationZone(id:string) {
    if (irrigationZones.length<=1) {
      setStatus('Mindestens eine Bewässerungszone muss bestehen bleiben.');
      return;
    }
    snapshot();
    setIrrigationZones(current=>current.filter(zone=>zone.id!==id));
    setObjects(current=>current.map(object=>object.irrigationZoneId===id?{...object,irrigationZoneId:undefined}:object));
    const next=irrigationZones.find(zone=>zone.id!==id);
    if (next) setActiveIrrigationZoneId(next.id);
    setStatus('Bewässerungszone gelöscht.');
  }

  function createIrrigationEmitter(
    x:number,
    y:number,
    emitterType:'sprinkler'|'drip'
  ) {
    snapshot();
    const zone=irrigationZones.find(item=>item.id===activeIrrigationZoneId) || irrigationZones[0];
    const id=Date.now();
    const radius=emitterType==='sprinkler'?defaultSprinklerRadius:defaultDripRadius;

    const object:GardenObject={
      id,
      type:'irrigation',
      name:emitterType==='sprinkler'?'Regner':'Tropfpunkt',
      x,
      y,
      width:0.28,
      depth:0.28,
      height:0.18,
      rotation:0,
      color:zone?.color || '#be123c',
      material:'Bewässerung',
      unitCost:emitterType==='sprinkler'?55:14,
      irrigationZoneId:zone?.id,
      emitterType,
      irrigationRadius:radius,
      irrigationArc:emitterType==='sprinkler'?defaultSprinklerArc:360,
      irrigationFlowLMin:emitterType==='sprinkler'?defaultSprinklerFlow:2,
      pipeDiameterMm:20,
      note:''
    };

    setObjects(current=>[...current,object]);
    setSelectedKind('object');
    setSelectedId(id);
    setSelectedObjectIds([id]);
    setStatus(`${object.name} in ${zone?.name || 'Bewässerungszone'} gesetzt.`);
  }

  function autoRouteIrrigationPipes() {
    const emitters=objects.filter(object=>object.type==='irrigation' && object.emitterType);
    if (!emitters.length) {
      setStatus('Keine Regner oder Tropfpunkte vorhanden.');
      return;
    }

    snapshot();

    const routed:GardenObject[]=[];
    const base=Date.now();

    irrigationZones.forEach((zone,zoneIndex)=>{
      const zoneEmitters=emitters.filter(object=>object.irrigationZoneId===zone.id);
      if (!zoneEmitters.length) return;

      const sorted=[...zoneEmitters].sort(
        (a,b)=>Math.hypot(a.x-irrigationSourcePoint.x,a.y-irrigationSourcePoint.y)
             -Math.hypot(b.x-irrigationSourcePoint.x,b.y-irrigationSourcePoint.y)
      );

      let previous=irrigationSourcePoint;

      sorted.forEach((emitter,index)=>{
        const points=simpleOrthogonalRoute(previous,{x:emitter.x,y:emitter.y},index%2===0);
        const center=polylineCenter(points);
        routed.push({
          id:base+zoneIndex*1000+index+1,
          type:'irrigation',
          name:`Leitung ${zone.name} ${index+1}`,
          x:center.x,
          y:center.y,
          width:Math.max(0.2,Math.abs(points[points.length-1].x-points[0].x)),
          depth:Math.max(0.2,Math.abs(points[points.length-1].y-points[0].y)),
          height:0.05,
          rotation:0,
          color:zone.color,
          material:'PE-Leitung',
          unitCost:8,
          points:relativePolyline(points,center),
          pipeDiameterMm:20,
          irrigationZoneId:zone.id,
          autoRouted:true,
          sourceObjectId:emitter.id,
          note:'Automatisch geroutete Bewässerungsleitung'
        });
        previous={x:emitter.x,y:emitter.y};
      });
    });

    setObjects(current=>[
      ...current.filter(object=>!(object.type==='irrigation' && object.autoRouted && object.points?.length)),
      ...routed
    ]);

    setStatus(`${routed.length} Bewässerungsleitungen automatisch erstellt.`);
  }

  function clearAutoRoutedIrrigationPipes() {
    snapshot();
    setObjects(current=>current.filter(object=>!(object.type==='irrigation' && object.autoRouted && object.points?.length)));
    setStatus('Automatisch erzeugte Bewässerungsleitungen entfernt.');
  }

  function runWaterFlowAnalysis() {
    if (waterAnalysisBusy) return;

    setWaterAnalysisBusy(true);
    setStatus('Abfluss- und Entwässerungsanalyse wird berechnet …');

    window.setTimeout(() => {
      try {
        const resolvedMode: PerformanceMode =
          performanceMode==='auto'
            ? (objects.length>80?'fast':objects.length>35?'balanced':'quality')
            : performanceMode;

        const columns = resolvedMode==='quality' ? 22 : resolvedMode==='fast' ? 12 : 16;
        const rows = resolvedMode==='quality' ? 14 : resolvedMode==='fast' ? 8 : 10;

        const result = analyzeWaterFlowGrid(
          terrainBlobs,
          elevationPoints,
          columns,
          rows
        );

        setFlowVectors(result.flowVectors);
        setLowPoints(result.lowPoints);
        setRetentionCells(result.retentionCells);
        setRunoffAverageSlope(result.avgSlope);
        setRunoffMaxSlope(result.maxSlope);
        setShowFlowOverlay2D(true);
        setShowLowPoints2D(true);
        setStatus(`Abflussanalyse fertig · ${result.flowVectors.length} Fließvektoren · ${result.lowPoints.length} Tiefpunkte.`);
      } catch (error) {
        setStatus(`Abflussanalyse fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setWaterAnalysisBusy(false);
      }
    }, 30);
  }

  function clearWaterFlowAnalysis() {
    setFlowVectors([]);
    setLowPoints([]);
    setRetentionCells([]);
    setRunoffAverageSlope(0);
    setRunoffMaxSlope(0);
    setStatus('Abflussanalyse ausgeblendet.');
  }

  function runSunHoursAnalysis() {
    if (sunAnalysisBusy) return;

    setSunAnalysisBusy(true);
    setStatus('Sonnenstunden werden berechnet …');

    window.setTimeout(() => {
      try {
        const resolvedMode: PerformanceMode =
          performanceMode==='auto'
            ? (objects.length>80?'fast':objects.length>35?'balanced':'quality')
            : performanceMode;

        const columns = resolvedMode==='quality' ? 22 : resolvedMode==='fast' ? 10 : 16;
        const rows = resolvedMode==='quality' ? 14 : resolvedMode==='fast' ? 7 : 10;
        const bounds = {minX:-10,maxX:10,minY:-6.5,maxY:6.5};
        const cellWidth=(bounds.maxX-bounds.minX)/columns;
        const cellHeight=(bounds.maxY-bounds.minY)/rows;
        const sampleHours=[8,9,10,11,12,13,14,15,16,17,18];
        const blockers=objects.filter(isShadowBlocker);
        const cells: SunHoursCell[]=[];

        for(let row=0;row<rows;row++){
          for(let col=0;col<columns;col++){
            const x=bounds.minX+(col+0.5)*cellWidth;
            const y=bounds.minY+(row+0.5)*cellHeight;
            let sunny=0;
            let validSamples=0;

            for(const hour of sampleHours){
              const solar=approximateSolarPosition(sunAnalysisDate,hour,sunLatitude);
              if(solar.elevation<=1) continue;
              validSamples++;

              let shaded=false;
              for(const blocker of blockers){
                const polygon=shadowFootprintForObject(
                  blocker,
                  solar.azimuth,
                  solar.elevation,
                  growthYear
                );
                if(polygon.length>=3 && pointInPolygon({x,y},polygon)){
                  shaded=true;
                  break;
                }
              }

              if(!shaded) sunny++;
            }

            cells.push({
              x:bounds.minX+col*cellWidth,
              y:bounds.minY+row*cellHeight,
              width:cellWidth,
              height:cellHeight,
              sunHours:sunny,
              sampleCount:validSamples
            });
          }
        }

        setSunHoursGrid(cells);
        setShowSunHoursHeatmap(true);
        setStatus(`Sonnenstundenanalyse fertig · ${cells.length} Rasterfelder.`);
      } catch (error) {
        setStatus(`Sonnenstundenanalyse fehlgeschlagen: ${error instanceof Error?error.message:String(error)}`);
      } finally {
        setSunAnalysisBusy(false);
      }
    },30);
  }

  function clearSunHoursAnalysis() {
    setSunHoursGrid([]);
    setShowSunHoursHeatmap(false);
    setStatus('Sonnenstunden-Raster ausgeblendet.');
  }

  function speciesForObject(obj: GardenObject) {
    return obj.speciesId ? PLANT_CATALOG.find(species=>species.id===obj.speciesId) || null : null;
  }

  function choosePlantSpecies(species: PlantSpecies) {
    setSelectedPlantSpeciesId(species.id);
    setTool(species.objectType);
    setTab('library');
    setStatus(`${species.commonName} gewählt. Jetzt im 2D-Plan platzieren.`);
  }

  function applySpeciesToPlant(object: GardenObject, species: PlantSpecies): GardenObject {
    const width = species.category==='hedge'
      ? Math.max(2.5, species.recommendedSpacing*4)
      : Math.max(0.3,species.matureWidth*0.45);

    const depth = species.category==='hedge'
      ? Math.max(0.5,species.matureWidth*0.35)
      : width;

    return {
      ...object,
      type:species.objectType,
      name:species.commonName,
      speciesId:species.id,
      botanicalName:species.botanicalName,
      plantCategory:species.category,
      width:Number(width.toFixed(2)),
      depth:Number(depth.toFixed(2)),
      height:Number(Math.max(0.3,species.matureHeight*0.45).toFixed(2)),
      matureHeight:species.matureHeight,
      matureWidth:species.matureWidth,
      recommendedSpacing:species.recommendedSpacing,
      growthRate:species.growthRate,
      evergreen:species.evergreen,
      bloomMonths:species.bloomMonths,
      bloomColor:species.bloomColor,
      soilNeeds:species.soil,
      hardinessMin:species.hardinessMin,
      hardinessMax:species.hardinessMax,
      plantForm:species.plantForm,
      color:species.foliageColor,
      material:'Pflanze',
      unitCost:species.unitCost,
      waterNeed:species.waterNeed,
      lightNeed:species.light.join('/'),
      siteLight:defaultPlantSiteLight,
      subtype:species.category,
      plantingYear:0,
      installationHeight:Number(Math.max(0.2,species.matureHeight*0.28).toFixed(2)),
      installationWidth:Number(Math.max(0.2,species.matureWidth*0.24).toFixed(2))
    };
  }

  function replacePlantSpecies(objectId: number, species: PlantSpecies) {
    snapshot();
    setObjects(current=>current.map(object=>object.id===objectId?applySpeciesToPlant(object,species):object));
    setStatus(`Pflanzenart auf ${species.commonName} geändert.`);
  }

  function plantChecksForProject(): PlantCheck[] {
    const plants = objects.filter(object=>['tree','shrub','hedge'].includes(object.type) && object.speciesId);
    const checks: PlantCheck[] = [];

    for (let i=0;i<plants.length;i++) {
      const plant=plants[i];
      const species=speciesForObject(plant);
      if (!species) continue;

      if (projectHardinessZone<species.hardinessMin || projectHardinessZone>species.hardinessMax) {
        checks.push({
          id:`hardiness-${plant.id}`,
          severity:'critical',
          objectIds:[plant.id],
          title:'Winterhärte prüfen',
          message:`${plant.name}: Projektzone ${projectHardinessZone} liegt außerhalb der hinterlegten Planungszone ${species.hardinessMin}–${species.hardinessMax}.`
        });
      }

      if (plant.siteLight && !species.light.includes(plant.siteLight)) {
        checks.push({
          id:`light-${plant.id}`,
          severity:'warning',
          objectIds:[plant.id],
          title:'Lichtbedarf passt nicht',
          message:`${plant.name}: Standort „${plant.siteLight}“ passt nicht zu ${species.light.join(', ')}.`
        });
      }

      if (species.waterNeed>=4) {
        const irrigation=objects.filter(object=>object.type==='irrigation');
        const nearest=irrigation.length
          ? Math.min(...irrigation.map(line=>Math.hypot(line.x-plant.x,line.y-plant.y)))
          : Infinity;

        if (nearest>4) {
          checks.push({
            id:`water-${plant.id}`,
            severity:'warning',
            objectIds:[plant.id],
            title:'Wasserversorgung prüfen',
            message:`${plant.name} hat hohen Wasserbedarf; keine Bewässerung im Umkreis von 4 m erkannt.`
          });
        }
      }

      for (let j=i+1;j<plants.length;j++) {
        const other=plants[j];
        const otherSpecies=speciesForObject(other);
        if (!otherSpecies) continue;

        const actualDistance=Math.hypot(other.x-plant.x,other.y-plant.y);
        const required=Math.max(species.recommendedSpacing,otherSpecies.recommendedSpacing);

        if (actualDistance<required*0.72) {
          checks.push({
            id:`spacing-${plant.id}-${other.id}`,
            severity:actualDistance<required*0.45?'critical':'warning',
            objectIds:[plant.id,other.id],
            title:'Pflanzabstand zu gering',
            message:`${plant.name} ↔ ${other.name}: ${actualDistance.toFixed(2)} m vorhanden, ca. ${required.toFixed(2)} m empfohlen.`
          });
        }
      }

      if (species.matureHeight>=8 && objects.some(object=>(object.type==='building'||object.type==='wall') && Math.hypot(object.x-plant.x,object.y-plant.y)<2.5)) {
        checks.push({
          id:`height-${plant.id}`,
          severity:'info',
          objectIds:[plant.id],
          title:'Endhöhe nahe Baukörper',
          message:`${plant.name} erreicht laut Bibliothek etwa ${species.matureHeight.toFixed(1)} m. Abstand zu Baukörpern prüfen.`
        });
      }
    }

    return checks;
  }

  function addBuildingLevel() {
    snapshot();
    const sorted = [...levels].sort((a,b)=>a.elevation-b.elevation);
    const highest = sorted[sorted.length - 1];
    const id = Math.max(...levels.map(level=>level.id), -1) + 1;
    const elevation = highest ? highest.elevation + highest.height + 0.2 : 0;

    const level: BuildingLevel = {
      id,
      name: `${id}. OG`,
      elevation: Number(elevation.toFixed(2)),
      height: 2.8,
      visible: true
    };

    setLevels(current => [...current, level].sort((a,b)=>a.elevation-b.elevation));
    setActiveLevel(id);
    setStatus(`${level.name} angelegt.`);
  }

  function updateBuildingLevel(id: number, patch: Partial<BuildingLevel>) {
    setLevels(current => current.map(level => level.id===id ? {...level,...patch} : level));
  }

  function deleteBuildingLevel(id: number) {
    if (id === 0) {
      setStatus('Das Erdgeschoss kann nicht gelöscht werden.');
      return;
    }

    snapshot();
    setObjects(current => current.filter(obj => (obj.level ?? 0) !== id));
    setRooms(current => current.filter(room => room.level !== id));
    setLevels(current => current.filter(level => level.id !== id));

    if (activeLevel === id) setActiveLevel(0);
    setStatus('Geschoss samt zugehörigen Bauteilen gelöscht.');
  }

  function duplicateActiveBuildingLevel() {
    const sourceLevel = levels.find(level => level.id===activeLevel);
    if (!sourceLevel) return;

    snapshot();

    const newId = Math.max(...levels.map(level=>level.id), -1) + 1;
    const newElevation = Math.max(...levels.map(level=>level.elevation + level.height)) + 0.2;
    const sourceObjects = objects.filter(obj => isLevelBoundObject(obj) && (obj.level ?? 0)===activeLevel);
    const idMap = new Map<number,number>();
    const base = Date.now();

    sourceObjects.forEach((obj,index)=>idMap.set(obj.id,base+index+1));

    const copies = sourceObjects.map(obj => ({
      ...structuredClone(obj),
      id: idMap.get(obj.id)!,
      name: `${obj.name} · Kopie`,
      level: newId,
      parentId: obj.parentId && idMap.has(obj.parentId) ? idMap.get(obj.parentId) : obj.parentId
    }));

    const roomCopies = rooms
      .filter(room=>room.level===activeLevel)
      .map((room,index)=>({
        ...structuredClone(room),
        id: base + sourceObjects.length + index + 1,
        level: newId,
        name: `${room.name} · Kopie`
      }));

    setLevels(current => [...current,{
      id:newId,
      name:`${sourceLevel.name} Kopie`,
      elevation:Number(newElevation.toFixed(2)),
      height:sourceLevel.height,
      visible:true
    }].sort((a,b)=>a.elevation-b.elevation));

    setObjects(current=>[...current,...copies]);
    setRooms(current=>[...current,...roomCopies]);
    setActiveLevel(newId);
    setStatus(`${sourceLevel.name} mit ${copies.length} Bauteilen dupliziert.`);
  }

  function detectRoomsOnActiveLevel() {
    const walls = objects.filter(obj => isWallObject(obj) && (obj.level ?? 0)===activeLevel);
    if (walls.length < 3) {
      setStatus('Für die Raumerkennung werden mindestens drei Wände benötigt.');
      return;
    }

    const polygons = detectClosedRoomPolygons(walls);
    if (!polygons.length) {
      setStatus('Kein geschlossener Raum erkannt. Prüfe die Wand-Endpunkte.');
      return;
    }

    snapshot();

    const existingNames = rooms.filter(room=>room.level===activeLevel).map(room=>room.name);
    const now = Date.now();

    const detected = polygons.map((points,index): Room => ({
      id: now + index + 1,
      name: existingNames[index] || `Raum ${index + 1}`,
      level: activeLevel,
      points,
      area: Number(polygonArea(points).toFixed(2)),
      color: ['#dbeafe','#dcfce7','#fef3c7','#fce7f3','#ede9fe'][index % 5],
      source: 'auto'
    }));

    setRooms(current => [
      ...current.filter(room => !(room.level===activeLevel && room.source==='auto')),
      ...detected
    ]);
    setSelectedRoomId(detected[0]?.id ?? null);
    if (detected[0]) setSelection('room', detected[0].id, `${detected.length} Raum/Räume erkannt.`);
    setStatus(`${detected.length} geschlossene Raumfläche(n) erkannt.`);
  }

  function renameRoom(id: number, name: string) {
    setRooms(current=>current.map(room=>room.id===id?{...room,name}:room));
  }

  function deleteRoom(id: number) {
    snapshot();
    setRooms(current=>current.filter(room=>room.id!==id));
    if (selectedRoomId===id) {
      setSelectedRoomId(null);
      setSelectedKind(null);
      setSelectedId(null);
    }
    setStatus('Raum gelöscht.');
  }

  function addObject(type: GardenObjectType, x: number, y: number) {
    snapshot();
    const id = Date.now();
    const presets: Record<GardenObjectType, Partial<GardenObject>> = {
      building: { name: 'Neues Gebäude', width: 4.0, depth: 3.0, height: 3.2, color: '#d6c4a7', material: 'Putz/Holz', unitCost: 650 },
      pool: { name: 'Neuer Pool', width: 4.2, depth: 2.4, height: 1.3, color: '#38bdf8', material: 'Poolbecken', unitCost: 900 },
      pond: { name: 'Neuer Gartenteich', width: 3.6, depth: 2.6, height: 0.45, color: '#0ea5e9', material: 'Teichfolie', unitCost: 240 },
      pergola: { name: 'Neue Pergola', width: 3.0, depth: 2.4, height: 2.6, color: '#8b5e3c', material: 'Holz', unitCost: 480 },
      wall: { name: 'Neue Mauer', width: 3.0, depth: 0.25, height: 1.0, color: '#9ca3af', material: 'Beton/Stein', unitCost: 260 },
      gardenWall: { name: 'Neue Gartenmauer', width: 3.0, depth: 0.28, height: 1.0, color: '#9ca3af', material: 'Naturstein/Beton', unitCost: 340, thickness: 0.28, foundationDepth: 0.5 },
      fence: { name: 'Neuer Zaun', width: 4.0, depth: 0.12, height: 1.4, color: '#7c5c3e', material: 'Holz/Metall', unitCost: 120 },
      gate: { name: 'Neues Tor', width: 2.5, depth: 0.18, height: 1.6, color: '#475569', material: 'Metall', unitCost: 650 },
      stairs: { name: 'Neue Stufen', width: 2.2, depth: 1.4, height: 0.9, color: '#c8b6a6', material: 'Naturstein', unitCost: 380 },
      path: { name: 'Neuer Weg', width: 4.0, depth: 1.1, height: 0.08, color: '#d6c7ad', material: 'Kies/Pflaster', unitCost: 95 },
      tree: { name: 'Neuer Baum', width: 1.4, depth: 1.4, height: 4.0, color: '#16a34a', material: 'Pflanze', unitCost: 320, waterNeed: 2, lightNeed: 'Sonne/Halbschatten' },
      shrub: { name: 'Neuer Strauch', width: 1.0, depth: 1.0, height: 1.2, color: '#22c55e', material: 'Pflanze', unitCost: 65, waterNeed: 2, lightNeed: 'Sonne/Halbschatten' },
      hedge: { name: 'Neue Hecke', width: 3.5, depth: 0.6, height: 1.5, color: '#15803d', material: 'Pflanze', unitCost: 180, waterNeed: 2, lightNeed: 'Sonne/Halbschatten' },
      planter: { name: 'Neues Hochbeet', width: 2.0, depth: 1.0, height: 0.7, color: '#92400e', material: 'Holz/Metall', unitCost: 420 },
      bench: { name: 'Neue Sitzbank', width: 1.8, depth: 0.65, height: 0.85, color: '#8b5e3c', material: 'Holz', unitCost: 380 },
      light: { name: 'Neue Leuchte', width: 0.25, depth: 0.25, height: 0.9, color: '#f59e0b', material: 'Metall/LED', unitCost: 185 },
      firepit: { name: 'Neue Feuerstelle', width: 1.4, depth: 1.4, height: 0.35, color: '#b45309', material: 'Stahl/Stein', unitCost: 750 },
      rock: { name: 'Neuer Felsen', width: 1.4, depth: 1.0, height: 0.7, color: '#78716c', material: 'Naturstein', unitCost: 240 },
      irrigation: { name: 'Bewässerungsleitung', width: 4.0, depth: 0.12, height: 0.08, color: '#2563eb', material: 'PE-Rohr', unitCost: 18 },
      drainage: { name: 'Drainageleitung', width: 4.0, depth: 0.16, height: 0.10, color: '#0f766e', material: 'Drainagerohr', unitCost: 32 },
      floor: { name: 'Bodenplatte', width: 5.5, depth: 4.5, height: 0.18, color: '#d1d5db', material: 'Stahlbeton', unitCost: 180, level: 0, thickness: 0.18 },
      interiorWall: { name: 'Innenwand', width: 3.0, depth: 0.14, height: 2.7, color: '#e5e7eb', material: 'Trockenbau/Mauerwerk', unitCost: 120, level: 0, thickness: 0.14 },
      roof: { name: 'Dach', width: 5.8, depth: 4.8, height: 0.55, color: '#7c2d12', material: 'Dachdeckung', unitCost: 240, level: 1, subtype: 'gable' },
      window: { name: 'Fenster', width: 1.4, depth: 0.10, height: 1.3, color: '#7dd3fc', material: 'Glas/Aluminium', unitCost: 780, level: 0, thickness: 0.10, sillHeight: 0.9 },
      door: { name: 'Tür', width: 1.0, depth: 0.12, height: 2.1, color: '#92400e', material: 'Holz/Metall', unitCost: 950, level: 0, thickness: 0.12, sillHeight: 0 },
      slidingDoor: { name: 'Schiebetür', width: 2.8, depth: 0.12, height: 2.4, color: '#bae6fd', material: 'Glas/Aluminium', unitCost: 2800, level: 0, thickness: 0.12, sillHeight: 0 },
      balcony: { name: 'Balkon', width: 3.5, depth: 1.8, height: 0.18, color: '#94a3b8', material: 'Beton/Holz', unitCost: 650, level: 1 },
      railing: { name: 'Geländer', width: 3.0, depth: 0.10, height: 1.05, color: '#64748b', material: 'Glas/Metall', unitCost: 320, level: 1 },
      column: { name: 'Stütze', width: 0.28, depth: 0.28, height: 2.8, color: '#cbd5e1', material: 'Stahl/Beton/Holz', unitCost: 420, level: 0 },
      carport: { name: 'Carport', width: 5.5, depth: 3.2, height: 2.7, color: '#a16207', material: 'Holz/Stahl', unitCost: 520, level: 0 },
      winterGarden: { name: 'Wintergarten', width: 4.0, depth: 3.0, height: 2.8, color: '#dbeafe', material: 'Glas/Aluminium', unitCost: 1100, level: 0 }
    };
    const preset = presets[type] as any;
    const draftObject = { id, type, x, y, rotation: 0, note: '', ...preset } as GardenObject;
    let obj: GardenObject = {
      ...draftObject,
      level: isLevelBoundObject(draftObject) ? activeLevel : preset.level
    };

    if (['tree','shrub','hedge'].includes(type) && selectedPlantSpeciesId) {
      const species=PLANT_CATALOG.find(item=>item.id===selectedPlantSpeciesId);
      if (species && species.objectType===type) obj=applySpeciesToPlant(obj,species);
    }

    obj=ensureObjectMaterial(obj);
    if(obj.materialId && !obj.surfaceLayers?.length && ['path','floor','stairs','gardenWall'].includes(obj.type)){
      obj={...obj,surfaceLayers:defaultSurfaceLayersForMaterial(obj.materialId)};
    }
    setObjects(v => [...v, obj]);
    setSelection('object', id, `${obj.name} gesetzt.`);
  }

  function handleCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    const rawPoint = worldFromEvent(svgRef.current, e);
    const p = snapPointToWallEndpoints(rawPoint);

    if (tab === 'water' && tool === 'irrigation') {
      const activeZone=irrigationZones.find(zone=>zone.id===activeIrrigationZoneId);
      createIrrigationEmitter(p.x,p.y,activeZone?.emitterType || 'sprinkler');
      return;
    }

    if (tab === 'hardscape' && (tool === 'path' || tool === 'gardenWall')) {
      setHardscapeDraftType(tool);
      addHardscapeDraftPoint(p);
      return;
    }

    if (tab === 'hardscape' && tool === 'stairs') {
      if (!stairDraftStart) {
        setStairDraftStart(p);
        setStatus('Treppe: unteren oder ersten Punkt gesetzt. Zweiten Punkt klicken.');
      } else {
        createSmartStairs(stairDraftStart,p);
      }
      return;
    }

    if (tab === 'terrain' && tool === 'terrain') {
      if (terrainSculptMode === 'point') {
        addElevationPoint(p.x, p.y);
      } else if (terrainSculptMode === 'plateau') {
        createPlateauAt(p.x, p.y);
      } else {
        addElevationPoint(p.x, p.y, newElevationValue, 'proposed');
        setStatus('Planungs-Höhenpunkt für Gefälle gesetzt.');
      }
      return;
    }

    if (tool === 'wall' || tool === 'interiorWall') {
      if (!wallDraftStart) {
        setWallDraftStart(p);
        setStatus(`${tool === 'wall' ? 'Außenwand' : 'Innenwand'}: Startpunkt gesetzt. Zweiten Punkt klicken.`);
        return;
      }

      const wall = createWallFromPoints(tool, wallDraftStart, p);
      if (wallChainMode && wall) {
        setWallDraftStart(p);
        setStatus(`${wall.name} erstellt. Kettenmodus: nächsten Endpunkt klicken.`);
      } else {
        setWallDraftStart(null);
      }
      return;
    }

    if (tool === 'select') {
      const hit = [...objects].reverse().find(obj => objectHit(p, obj));
      if (hit) {
        selectObject(hit.id, e.shiftKey || e.metaKey || e.ctrlKey);
        return;
      }
      setSelectedObjectIds([]); setSelection(null,null,'Auswahl aufgehoben.');
      return;
    }
    if (tool === 'mound' || tool === 'depression') {
      snapshot();
      const id = Date.now();
      const blob: TerrainBlob = {
        id, name: tool === 'mound' ? 'Neue Erhebung' : 'Neue Mulde', x: p.x, y: p.y,
        radius: tool === 'mound' ? 2.1 : 1.8, height: tool === 'mound' ? 0.55 : -0.45, softness: 1.35, source: 'Manuell'
      };
      setTerrainBlobs(v => [...v, blob]);
      setSelection('terrain', id, `${blob.name} gesetzt.`);
      return;
    }
    if (tool === 'plantZone' || tool === 'hardscape') {
      snapshot();
      const id = Date.now();
      const zone: Zone = { id, kind: tool, name: tool === 'plantZone' ? 'Neue Pflanzzone' : 'Neue Belagsfläche', x: p.x, y: p.y, width: 3.4, depth: 2.0, color: tool === 'plantZone' ? '#a7f3d0' : '#b8b0a2' };
      setZones(v => [...v, zone]);
      setSelection('zone', id, `${zone.name} gesetzt.`);
      return;
    }
    addObject(tool as GardenObjectType, p.x, p.y);
  }

  function start2DDrag(e: React.PointerEvent<SVGGElement>, kind: Exclude<SelectedKind, null>, id: number, currentX: number, currentY: number, label: string) {
    if (tool !== 'select') return;
    e.stopPropagation();
    const p=worldFromClient(svgRef.current,e.clientX,e.clientY);
    svgRef.current?.setPointerCapture?.(e.pointerId);
    const obj=objects.find(o=>o.id===id);
    let ids=kind==='object' && selectedObjectIds.includes(id) ? selectedObjectIds : [id];
    if (kind==='object' && obj?.groupId && !e.shiftKey && !e.ctrlKey && !e.metaKey) ids=objects.filter(o=>o.groupId===obj.groupId).map(o=>o.id);
    const groupStart=kind==='object'?objects.filter(o=>ids.includes(o.id)).map(o=>({id:o.id,x:o.x,y:o.y})):[];
    setDrag2D({mode:'move',kind,id,pointerId:e.pointerId,offsetX:currentX-p.x,offsetY:currentY-p.y,startPointerX:p.x,startPointerY:p.y,groupStart});
    if (kind==='object') { setSelectedKind('object'); setSelectedId(id); setSelectedObjectIds(ids); }
    else setSelection(kind,id,`${label} wird verschoben.`);
    setStatus(`${label} wird verschoben.`);
  }

  function startScaleObject(e: React.PointerEvent<SVGCircleElement>, obj: GardenObject) {
    e.stopPropagation();
    svgRef.current?.setPointerCapture?.(e.pointerId);
    setDrag2D({mode:'scale',kind:'object',id:obj.id,pointerId:e.pointerId,startWidth:obj.width,startDepth:obj.depth,startX:obj.x,startY:obj.y,rotation:obj.rotation});
    setStatus('Skalieren: Ecke ziehen. Alt um Raster zu umgehen.');
  }

  function startRotateObject(e: React.PointerEvent<SVGCircleElement>, obj: GardenObject) {
    e.stopPropagation();
    const p=worldFromClient(svgRef.current,e.clientX,e.clientY);
    svgRef.current?.setPointerCapture?.(e.pointerId);
    const startAngle=Math.atan2(p.y-obj.y,p.x-obj.x)*180/Math.PI;
    setDrag2D({mode:'rotate',kind:'object',id:obj.id,pointerId:e.pointerId,centerX:obj.x,centerY:obj.y,startAngle,startRotation:obj.rotation});
    setStatus('Drehen: Griff bewegen. Shift rastet auf 15° ein.');
  }

  function handleSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag2D || drag2D.pointerId!==e.pointerId) return;
    const p=worldFromClient(svgRef.current,e.clientX,e.clientY);
    if (drag2D.mode==='move') {
      const targetX=clamp(p.x+drag2D.offsetX,VIEWBOX.x,VIEWBOX.x+VIEWBOX.width);
      const targetY=clamp(p.y+drag2D.offsetY,VIEWBOX.y,VIEWBOX.y+VIEWBOX.height);
      const baseX=snapValue(targetX,e.altKey); const baseY=snapValue(targetY,e.altKey);
      if (drag2D.kind==='object') {
        const primary=objects.find(o=>o.id===drag2D.id); if (!primary) return;
        const snapped=e.altKey?{x:baseX,y:baseY,rotation:primary.rotation,parentId:primary.parentId,hostOffset:primary.hostOffset}:snapObjectToScene(primary,baseX,baseY);
        const primaryStart=drag2D.groupStart.find(item=>item.id===drag2D.id); if (!primaryStart) return;
        const dx=snapped.x-primaryStart.x; const dy=snapped.y-primaryStart.y;
        setObjects(current=>current.map(o=>{
          const start=drag2D.groupStart.find(item=>item.id===o.id); if (!start) return o;
          if (o.id===drag2D.id) return {...o,x:snapped.x,y:snapped.y,rotation:snapped.rotation,parentId:snapped.parentId,hostOffset:snapped.hostOffset};
          return {...o,x:start.x+dx,y:start.y+dy};
        }));
        setStatus(`Position X ${snapped.x.toFixed(2)} m · Y ${snapped.y.toFixed(2)} m${snapped.parentId?' · an Wand gekoppelt':''}`);
      }
      if (drag2D.kind==='terrain') setTerrainBlobs(v=>v.map(b=>b.id===drag2D.id?{...b,x:baseX,y:baseY}:b));
      if (drag2D.kind==='zone') setZones(v=>v.map(z=>z.id===drag2D.id?{...z,x:baseX,y:baseY}:z));
      return;
    }
    const obj=objects.find(o=>o.id===drag2D.id); if (!obj) return;
    if (drag2D.mode==='scale') {
      const local=objectLocalPoint(obj,p.x,p.y);
      let width=Math.max(0.1,Math.abs(local.x)*2); let depth=Math.max(0.08,Math.abs(local.y)*2);
      if (!e.altKey && snapEnabled) { width=Math.max(0.1,snapValue(width)); depth=Math.max(0.08,snapValue(depth)); }
      setObjects(current=>current.map(o=>o.id===obj.id?{...o,width,depth}:o));
      setStatus(`Größe ${width.toFixed(2)} × ${depth.toFixed(2)} m`);
    }
    if (drag2D.mode==='rotate') {
      const angle=Math.atan2(p.y-drag2D.centerY,p.x-drag2D.centerX)*180/Math.PI;
      let rotation=drag2D.startRotation+(angle-drag2D.startAngle);
      if (e.shiftKey) rotation=Math.round(rotation/15)*15;
      rotation=((rotation%360)+360)%360;
      setObjects(current=>current.map(o=>o.id===obj.id?{...o,rotation}:o));
      setStatus(`Drehung ${rotation.toFixed(1)}°`);
    }
  }

  function handleSvgPointerUp(e?: React.PointerEvent<SVGSVGElement>) {
    if (drag2D) setStatus('Bearbeitung abgeschlossen.');
    if (e && drag2D?.pointerId===e.pointerId) { try { svgRef.current?.releasePointerCapture?.(e.pointerId); } catch {} }
    setDrag2D(null); setSnapGuides(null);
  }

  function uploadImage(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () => {
        setImage({ name: file.name, dataUrl, width: img.width, height: img.height });
        setImageApplied(false);
        setStatus('Bild hochgeladen. Wähle jetzt: als Planhintergrund anwenden oder Bildanalyse anwenden.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function applyImageAsPlanBackground() {
    if (!image) { setStatus('Bitte zuerst ein Bild hochladen.'); return; }
    setImageApplied(true);
    setView('2d');
    setStatus('Bild wurde als 2D-Planhintergrund angewendet.');
  }

  function removeAppliedImage() {
    setImageApplied(false);
    setStatus('Bildhintergrund ausgeblendet. Das Bild bleibt für Analysen verfügbar.');
  }

  function analyzeImageToSoftTerrain() {
    if (!image) { setStatus('Bitte zuerst ein Bild hochladen.'); return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = 96, h = 64;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const blobs: TerrainBlob[] = [];
      const newZones: Zone[] = [];
      let id = Date.now();
      const cellsX = 8, cellsY = 6, cellW = Math.floor(w / cellsX), cellH = Math.floor(h / cellsY);
      for (let gy = 0; gy < cellsY; gy++) {
        for (let gx = 0; gx < cellsX; gx++) {
          let r = 0, g = 0, b = 0, count = 0;
          for (let yy = gy * cellH; yy < (gy + 1) * cellH; yy += 2) {
            for (let xx = gx * cellW; xx < (gx + 1) * cellW; xx += 2) {
              const idx = (yy * w + xx) * 4;
              r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; count++;
            }
          }
          r /= count; g /= count; b /= count;
          const brightness = (r + g + b) / 3;
          const worldX = -10 + gx * 2.8;
          const worldY = -6 + gy * 2.3;
          if (brightness > 175) blobs.push({ id:id++, name:'KI Erhebung', x:worldX, y:worldY, radius:1.7, height:0.22 + (brightness - 175) / 255 * 0.45, softness:1.55, source:'Bildanalyse' });
          else if (brightness < 95) blobs.push({ id:id++, name:'KI Senke', x:worldX, y:worldY, radius:1.6, height:-(0.18 + (95 - brightness) / 255 * 0.38), softness:1.65, source:'Bildanalyse' });
          if (g > r * 1.08 && g > b * 1.04) newZones.push({ id:id++, kind:'plantZone', name:'KI Pflanzzone', x:worldX, y:worldY, width:2.4, depth:1.8, color:'#a7f3d0' });
          else if (brightness > 160 && Math.abs(r - g) < 35 && Math.abs(r - b) < 45) newZones.push({ id:id++, kind:'hardscape', name:'KI Belagszone', x:worldX, y:worldY, width:2.2, depth:1.6, color:'#d8c8a8' });
        }
      }
      snapshot();
      setTerrainBlobs(blobs.length ? blobs : terrainBlobs);
      if (newZones.length) setZones(newZones.slice(0, 18));
      setImageApplied(true);
      setView('2d');
      setSelection('terrain', blobs[0]?.id ?? null, `Bildanalyse angewendet: ${blobs.length} Terrain-Formen und ${newZones.length} Zonen erzeugt.`);
    };
    img.src = image.dataUrl;
  }


  function applyStructuredGardenLayout(layout: any) {
    if (!layout || !layout.terrain || !Array.isArray(layout.objects)) {
      setOpenAiLastAnswer('OpenAI hat kein gültiges GardenSchema geliefert. Lokaler Fallback aktiv.');
      return false;
    }

    const base = Date.now();
    const style = String(layout.terrain.style || 'flat');
    const intensity = Math.max(0.1, Math.min(2.5, Number(layout.terrain.intensity || 1)));

    const nextBlobs: TerrainBlob[] = [];
    if (style === 'hilly') {
      nextBlobs.push(
        { id: base + 1, name: 'OpenAI Hügel 1', x: -3.5, y: -1.8, radius: 2.4, height: 0.65 * intensity, softness: 1.55, source: 'OpenAI JSON' },
        { id: base + 2, name: 'OpenAI Hügel 2', x: 3.5, y: 1.6, radius: 2.1, height: 0.45 * intensity, softness: 1.45, source: 'OpenAI JSON' }
      );
    } else if (style === 'sunken') {
      nextBlobs.push(
        { id: base + 1, name: 'OpenAI Senke', x: 0, y: -1.2, radius: 2.6, height: -0.55 * intensity, softness: 1.65, source: 'OpenAI JSON' }
      );
    } else {
      nextBlobs.push(
        { id: base + 1, name: 'OpenAI sanfte Modellierung', x: -1.5, y: -1.0, radius: 3.0, height: 0.18 * intensity, softness: 1.8, source: 'OpenAI JSON' }
      );
    }

    const nextObjects: GardenObject[] = layout.objects.map((item: any, index: number) => {
      const type = String(item.type || 'tree');
      const x = Math.max(-10, Math.min(10, Number(item.x || 0)));
      const y = Math.max(-7, Math.min(7, Number(item.z || 0)));
      const scaleX = Math.max(0.4, Number(item.scaleX || 1));
      const scaleY = Math.max(0.4, Number(item.scaleY || 1));
      const scaleZ = Math.max(0.4, Number(item.scaleZ || 1));
      const rotation = Number(item.rotation || 0);

      if (type === 'modern_house') {
        return { id: base + 100 + index, type: 'building', name: 'OpenAI Modernes Haus', x, y, width: 4 * scaleX, depth: 4 * scaleZ, height: 3 * scaleY, rotation, color: '#ffffff' };
      }
      if (type === 'glass_house') {
        return { id: base + 100 + index, type: 'building', name: 'OpenAI Glashaus', x, y, width: 2.8 * scaleX, depth: 3.4 * scaleZ, height: 2.6 * scaleY, rotation, color: '#e0f2fe' };
      }
      if (type === 'pool') {
        return { id: base + 100 + index, type: 'pool', name: 'OpenAI Pool', x, y, width: 4 * scaleX, depth: 2.4 * scaleZ, height: 1.2 * scaleY, rotation, color: '#38bdf8' };
      }
      if (type === 'pergola') {
        return { id: base + 100 + index, type: 'pergola', name: 'OpenAI Pergola', x, y, width: 3 * scaleX, depth: 2.4 * scaleZ, height: 2.6 * scaleY, rotation, color: '#8b5e3c' };
      }
      if (type === 'floor') return { id: base + 100 + index, type: 'floor', name: 'OpenAI Bodenplatte', x, y, width: 4.5 * scaleX, depth: 4 * scaleZ, height: 0.18 * scaleY, rotation, color: '#d1d5db', material: 'Stahlbeton', level: 0, thickness: 0.18 };
      if (type === 'wall') return { id: base + 100 + index, type: 'wall', name: 'OpenAI Außenwand', x, y, width: 4 * scaleX, depth: 0.22, height: 2.8 * scaleY, rotation, color: '#f8fafc', material: 'Putz', level: 0, thickness: 0.22 };
      if (type === 'interior_wall') return { id: base + 100 + index, type: 'interiorWall', name: 'OpenAI Innenwand', x, y, width: 3 * scaleX, depth: 0.14, height: 2.7 * scaleY, rotation, color: '#e5e7eb', material: 'Trockenbau', level: 0, thickness: 0.14 };
      if (type === 'roof') return { id: base + 100 + index, type: 'roof', name: 'OpenAI Dach', x, y, width: 5 * scaleX, depth: 4.5 * scaleZ, height: 1.0 * scaleY, rotation, color: '#7c2d12', material: 'Dachdeckung', level: 1, subtype: String(item.subtype || 'gable') };
      if (type === 'window') return { id: base + 100 + index, type: 'window', name: 'OpenAI Fenster', x, y, width: 1.4 * scaleX, depth: 0.1, height: 1.3 * scaleY, rotation, color: '#7dd3fc', material: 'Glas' };
      if (type === 'door') return { id: base + 100 + index, type: 'door', name: 'OpenAI Tür', x, y, width: 1.0 * scaleX, depth: 0.12, height: 2.1 * scaleY, rotation, color: '#92400e', material: 'Holz/Metall' };
      if (type === 'sliding_door') return { id: base + 100 + index, type: 'slidingDoor', name: 'OpenAI Schiebetür', x, y, width: 2.8 * scaleX, depth: 0.12, height: 2.4 * scaleY, rotation, color: '#bae6fd', material: 'Glas/Aluminium' };
      if (type === 'balcony') return { id: base + 100 + index, type: 'balcony', name: 'OpenAI Balkon', x, y, width: 3.5 * scaleX, depth: 1.6 * scaleZ, height: 0.18, rotation, color: '#94a3b8', level: 1 };
      if (type === 'railing') return { id: base + 100 + index, type: 'railing', name: 'OpenAI Geländer', x, y, width: 3 * scaleX, depth: 0.1, height: 1.05 * scaleY, rotation, color: '#64748b', level: 1 };
      if (type === 'column') return { id: base + 100 + index, type: 'column', name: 'OpenAI Stütze', x, y, width: 0.28 * scaleX, depth: 0.28 * scaleZ, height: 2.8 * scaleY, rotation, color: '#cbd5e1' };
      if (type === 'carport') return { id: base + 100 + index, type: 'carport', name: 'OpenAI Carport', x, y, width: 5.5 * scaleX, depth: 3.2 * scaleZ, height: 2.7 * scaleY, rotation, color: '#a16207' };
      if (type === 'winter_garden') return { id: base + 100 + index, type: 'winterGarden', name: 'OpenAI Wintergarten', x, y, width: 4 * scaleX, depth: 3 * scaleZ, height: 2.8 * scaleY, rotation, color: '#dbeafe' };
      if (type === 'shrub') {
        return { id: base + 100 + index, type: 'shrub', name: 'OpenAI Strauch', x, y, width: 1.0 * scaleX, depth: 1.0 * scaleZ, height: 1.1 * scaleY, rotation, color: '#22c55e' };
      }
      return { id: base + 100 + index, type: 'tree', name: 'OpenAI Baum', x, y, width: 1.4 * scaleX, depth: 1.4 * scaleZ, height: 3.8 * scaleY, rotation, color: '#16a34a' };
    });

    const nextZones: Zone[] = [
      { id: base + 500, kind: 'plantZone', name: 'OpenAI Pflanzzone', x: 4.5, y: -2.4, width: 4.5, depth: 2.8, color: '#a7f3d0' },
      { id: base + 501, kind: 'hardscape', name: 'OpenAI Belagszone', x: -4.8, y: 3.2, width: 4.2, depth: 2.6, color: '#b8b0a2' }
    ];

    setTerrainBlobs(nextBlobs);
    setZones(nextZones);
    setObjects(nextObjects);
    setSelection('object', nextObjects[0]?.id ?? null, `OpenAI JSON-Schema übernommen: ${nextBlobs.length} Terrain-Formen und ${nextObjects.length} Objekte.`);
    setOpenAiLastAnswer(JSON.stringify(layout, null, 2).slice(0, 1500));
    return true;
  }

  function copilotProjectContext() {
    return {
      project: projectInfo,
      editor: {
        view,
        activeLevel,
        selectedKind,
        selectedId,
        selectedObjectIds,
        gridSize,
        snapEnabled,
        season,
        growthYear
      },
      metrics,
      terrain: terrainBlobs.map(item => ({
        id:item.id,name:item.name,x:item.x,y:item.y,radius:item.radius,height:item.height,softness:item.softness
      })),
      zones: zones.map(item => ({
        id:item.id,kind:item.kind,name:item.name,x:item.x,y:item.y,width:item.width,depth:item.depth
      })),
      objects: objects.map(item => ({
        id:item.id,type:item.type,name:item.name,x:item.x,y:item.y,width:item.width,depth:item.depth,
        height:item.height,rotation:item.rotation,material:item.material || null,level:item.level ?? null,
        note:item.note || null
      })),
      audit: projectAudit ? {
        score:projectAudit.score,
        grade:projectAudit.grade,
        issues:projectAudit.issues.slice(0,12).map(issue=>({severity:issue.severity,title:issue.title,message:issue.message}))
      } : null
    };
  }

  function copilotObjectPreset(type: GardenObjectType): Partial<GardenObject> {
    const presets: Record<GardenObjectType, Partial<GardenObject>> = {
      building:{name:'KI Gebäude',width:4,depth:3.5,height:3.2,color:'#d6c4a7',material:'Putz/Holz',unitCost:650},
      pool:{name:'KI Pool',width:4.2,depth:2.4,height:1.3,color:'#38bdf8',material:'Poolbecken',unitCost:900},
      pond:{name:'KI Gartenteich',width:3.5,depth:2.5,height:0.45,color:'#0ea5e9',material:'Teichfolie',unitCost:240},
      pergola:{name:'KI Pergola',width:3,depth:2.4,height:2.6,color:'#8b5e3c',material:'Holz',unitCost:480},
      wall:{name:'KI Mauer',width:3,depth:0.25,height:1,color:'#9ca3af',material:'Beton/Stein',unitCost:260},
      gardenWall:{name:'KI Gartenmauer',width:3,depth:0.28,height:1,color:'#9ca3af',material:'Naturstein',unitCost:340,thickness:0.28},
      fence:{name:'KI Zaun',width:4,depth:0.12,height:1.4,color:'#7c5c3e',material:'Holz/Metall',unitCost:120},
      gate:{name:'KI Tor',width:2.5,depth:0.18,height:1.6,color:'#475569',material:'Metall',unitCost:650},
      stairs:{name:'KI Stufen',width:2.2,depth:1.4,height:0.9,color:'#c8b6a6',material:'Naturstein',unitCost:380},
      path:{name:'KI Weg',width:4,depth:1.1,height:0.08,color:'#d6c7ad',material:'Kies/Pflaster',unitCost:95},
      tree:{name:'KI Baum',width:1.4,depth:1.4,height:4,color:'#16a34a',material:'Pflanze',unitCost:320,waterNeed:2,lightNeed:'Sonne/Halbschatten'},
      shrub:{name:'KI Strauch',width:1,depth:1,height:1.2,color:'#22c55e',material:'Pflanze',unitCost:65,waterNeed:2,lightNeed:'Sonne/Halbschatten'},
      hedge:{name:'KI Hecke',width:3.5,depth:0.6,height:1.5,color:'#15803d',material:'Pflanze',unitCost:180,waterNeed:2,lightNeed:'Sonne/Halbschatten'},
      planter:{name:'KI Hochbeet',width:2,depth:1,height:0.7,color:'#92400e',material:'Holz/Metall',unitCost:420},
      bench:{name:'KI Sitzbank',width:1.8,depth:0.65,height:0.85,color:'#8b5e3c',material:'Holz',unitCost:380},
      light:{name:'KI Leuchte',width:0.25,depth:0.25,height:0.9,color:'#f59e0b',material:'Metall/LED',unitCost:185},
      firepit:{name:'KI Feuerstelle',width:1.4,depth:1.4,height:0.35,color:'#b45309',material:'Stahl/Stein',unitCost:750},
      rock:{name:'KI Felsen',width:1.4,depth:1,height:0.7,color:'#78716c',material:'Naturstein',unitCost:240},
      irrigation:{name:'KI Bewässerung',width:4,depth:0.12,height:0.08,color:'#2563eb',material:'PE-Rohr',unitCost:18},
      drainage:{name:'KI Drainage',width:4,depth:0.16,height:0.1,color:'#0f766e',material:'Drainagerohr',unitCost:32},
      floor:{name:'KI Bodenplatte',width:5.5,depth:4.5,height:0.18,color:'#d1d5db',material:'Stahlbeton',unitCost:180,level:activeLevel,thickness:0.18},
      interiorWall:{name:'KI Innenwand',width:3,depth:0.14,height:2.7,color:'#e5e7eb',material:'Trockenbau',unitCost:120,level:activeLevel,thickness:0.14},
      roof:{name:'KI Dach',width:5.8,depth:4.8,height:0.55,color:'#7c2d12',material:'Dachdeckung',unitCost:240,level:activeLevel,subtype:'gable'},
      window:{name:'KI Fenster',width:1.4,depth:0.1,height:1.3,color:'#7dd3fc',material:'Glas/Aluminium',unitCost:780,level:activeLevel,sillHeight:0.9},
      door:{name:'KI Tür',width:1,depth:0.12,height:2.1,color:'#92400e',material:'Holz/Metall',unitCost:950,level:activeLevel,sillHeight:0},
      slidingDoor:{name:'KI Schiebetür',width:2.8,depth:0.12,height:2.4,color:'#bae6fd',material:'Glas/Aluminium',unitCost:2800,level:activeLevel,sillHeight:0},
      balcony:{name:'KI Balkon',width:3.5,depth:1.8,height:0.18,color:'#94a3b8',material:'Beton/Holz',unitCost:650,level:activeLevel},
      railing:{name:'KI Geländer',width:3,depth:0.1,height:1.05,color:'#64748b',material:'Glas/Metall',unitCost:320,level:activeLevel},
      column:{name:'KI Stütze',width:0.28,depth:0.28,height:2.8,color:'#cbd5e1',material:'Stahl/Beton/Holz',unitCost:420,level:activeLevel},
      carport:{name:'KI Carport',width:5.5,depth:3.2,height:2.7,color:'#a16207',material:'Holz/Stahl',unitCost:520,level:activeLevel},
      winterGarden:{name:'KI Wintergarten',width:4,depth:3,height:2.8,color:'#dbeafe',material:'Glas/Aluminium',unitCost:1100,level:activeLevel}
    };
    return presets[type];
  }

  function applyCopilotActions(actions: AiProjectAction[], confirmed = false) {
    const executable = actions.filter(action => confirmed || !action.destructive);
    if (!executable.length) return;

    const changesPlan = executable.some(action => !['set_view','select_object','run_audit'].includes(action.action));
    if (changesPlan) snapshot();

    let nextObjects = [...objects];
    let nextTerrain = [...terrainBlobs];
    let nextZones = [...zones];
    let nextProject = {...projectInfo};
    let objectsChanged = false;
    let terrainChanged = false;
    let zonesChanged = false;
    let projectChanged = false;
    let shouldAudit = false;
    let nextSelectedId: number | null = null;
    const base = Date.now();

    executable.forEach((action,index) => {
      if (action.action === 'add_object' && action.objectType) {
        const preset = copilotObjectPreset(action.objectType);
        const draft: GardenObject = ensureObjectMaterial({
          id: base + index + 1,
          type: action.objectType,
          name: action.name || String(preset.name || 'KI Objekt'),
          x: action.x ?? 0,
          y: action.y ?? 0,
          width: Math.max(0.05, action.width ?? Number(preset.width || 1)),
          depth: Math.max(0.05, action.depth ?? Number(preset.depth || 1)),
          height: Math.max(0.02, action.height ?? Number(preset.height || 1)),
          rotation: action.rotation ?? 0,
          color: action.color || String(preset.color || '#94a3b8'),
          material: action.material || String(preset.material || ''),
          note: action.note || action.reason,
          unitCost: preset.unitCost,
          level: isLevelBoundObject({type:action.objectType} as GardenObject) ? activeLevel : preset.level,
          thickness: preset.thickness,
          sillHeight: preset.sillHeight,
          subtype: preset.subtype,
          waterNeed: preset.waterNeed,
          lightNeed: preset.lightNeed
        });
        nextObjects.push(draft);
        nextSelectedId = draft.id;
        objectsChanged = true;
      }

      if (action.action === 'update_object' && action.targetId != null) {
        nextObjects = nextObjects.map(item => {
          if (item.id !== action.targetId) return item;
          const update: Partial<GardenObject> = {};
          if (action.name != null) update.name = action.name;
          if (action.x != null) update.x = action.x;
          if (action.y != null) update.y = action.y;
          if (action.width != null) update.width = Math.max(0.05, action.width);
          if (action.depth != null) update.depth = Math.max(0.05, action.depth);
          if (action.height != null) update.height = Math.max(0.02, action.height);
          if (action.rotation != null) update.rotation = action.rotation;
          if (action.color != null) update.color = action.color;
          if (action.material != null) update.material = action.material;
          if (action.note != null) update.note = action.note;
          return ensureObjectMaterial({...item,...update});
        });
        nextSelectedId = action.targetId;
        objectsChanged = true;
      }

      if (action.action === 'delete_object' && action.targetId != null) {
        nextObjects = nextObjects.filter(item => item.id !== action.targetId && item.parentId !== action.targetId);
        objectsChanged = true;
      }

      if (action.action === 'add_terrain') {
        const item: TerrainBlob = {
          id: base + 1000 + index,
          name: action.name || 'KI Geländeform',
          x: action.x ?? 0,
          y: action.y ?? 0,
          radius: Math.max(0.25, action.radius ?? 2),
          height: action.height ?? 0.5,
          softness: clamp(action.softness ?? 1.4, 0.25, 4),
          source: 'AI Copilot'
        };
        nextTerrain.push(item);
        terrainChanged = true;
      }

      if (action.action === 'update_terrain' && action.targetId != null) {
        nextTerrain = nextTerrain.map(item => item.id === action.targetId ? {
          ...item,
          name: action.name ?? item.name,
          x: action.x ?? item.x,
          y: action.y ?? item.y,
          radius: Math.max(0.25, action.radius ?? item.radius),
          height: action.height ?? item.height,
          softness: clamp(action.softness ?? item.softness, 0.25, 4)
        } : item);
        terrainChanged = true;
      }

      if (action.action === 'delete_terrain' && action.targetId != null) {
        nextTerrain = nextTerrain.filter(item => item.id !== action.targetId);
        terrainChanged = true;
      }

      if (action.action === 'add_zone' && action.zoneKind) {
        nextZones.push({
          id: base + 2000 + index,
          kind: action.zoneKind,
          name: action.name || (action.zoneKind === 'plantZone' ? 'KI Pflanzzone' : 'KI Belagszone'),
          x: action.x ?? 0,
          y: action.y ?? 0,
          width: Math.max(0.1, action.width ?? 3),
          depth: Math.max(0.1, action.depth ?? 2),
          color: action.color || (action.zoneKind === 'plantZone' ? '#a7f3d0' : '#b8b0a2')
        });
        zonesChanged = true;
      }

      if (action.action === 'update_zone' && action.targetId != null) {
        nextZones = nextZones.map(item => item.id === action.targetId ? {
          ...item,
          name: action.name ?? item.name,
          kind: action.zoneKind ?? item.kind,
          x: action.x ?? item.x,
          y: action.y ?? item.y,
          width: Math.max(0.1, action.width ?? item.width),
          depth: Math.max(0.1, action.depth ?? item.depth),
          color: action.color ?? item.color
        } : item);
        zonesChanged = true;
      }

      if (action.action === 'delete_zone' && action.targetId != null) {
        nextZones = nextZones.filter(item => item.id !== action.targetId);
        zonesChanged = true;
      }

      if (action.action === 'update_project') {
        nextProject = {
          ...nextProject,
          name: action.name ?? nextProject.name,
          location: action.location ?? nextProject.location,
          budget: action.budget ?? nextProject.budget,
          area: action.area ?? nextProject.area
        };
        projectChanged = true;
      }

      if (action.action === 'set_view' && action.view) setView(action.view);
      if (action.action === 'select_object' && action.targetId != null) nextSelectedId = action.targetId;
      if (action.action === 'run_audit') shouldAudit = true;
    });

    if (objectsChanged) setObjects(nextObjects);
    if (terrainChanged) setTerrainBlobs(nextTerrain);
    if (zonesChanged) setZones(nextZones);
    if (projectChanged) setProjectInfo(nextProject);

    if (nextSelectedId != null && nextObjects.some(item => item.id === nextSelectedId)) {
      setSelectedKind('object');
      setSelectedId(nextSelectedId);
      setSelectedObjectIds([nextSelectedId]);
    }

    if (shouldAudit) setTimeout(() => runProjectAudit(), 0);
    setStatus(`AI Copilot: ${executable.length} Aktion${executable.length === 1 ? '' : 'en'} ausgeführt.`);
  }

  async function sendCopilotMessage(textOverride?: string) {
    const text = String(textOverride ?? copilotInput).trim();
    if (!text || copilotBusy) return;

    const userMessage: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };
    const nextMessages = [...copilotMessages, userMessage].slice(-40);
    setCopilotMessages(nextMessages);
    setCopilotInput('');
    setCopilotError('');
    setCopilotBusy(true);
    setPendingCopilotActions([]);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          model: copilotModel,
          messages: nextMessages.map(message => ({role:message.role,content:message.content})),
          project: copilotProjectContext()
        })
      });
      const data = await response.json();
      if (!data?.ok) throw new Error(String(data?.message || 'Die KI konnte nicht antworten.'));

      const result = data.result || {};
      const actions = (Array.isArray(result.actions) ? result.actions : []) as AiProjectAction[];
      const safeActions = actions.filter(action => !action.destructive);
      const protectedActions = actions.filter(action => action.destructive);
      const assistantMessage: AiChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: String(result.reply || 'Ich habe die Anfrage ausgewertet.'),
        createdAt: new Date().toISOString(),
        actionCount: actions.length
      };
      setCopilotMessages(current => [...current,assistantMessage].slice(-40));
      setCopilotSuggestions(Array.isArray(result.suggestions) ? result.suggestions.slice(0,4) : []);

      if (copilotAutoApply && safeActions.length) applyCopilotActions(safeActions);
      if (!copilotAutoApply && actions.length) setPendingCopilotActions(actions);
      else if (protectedActions.length) setPendingCopilotActions(protectedActions);

      if (result.requiresConfirmation && protectedActions.length) {
        setStatus(String(result.confirmationQuestion || 'Der AI Copilot wartet auf deine Bestätigung.'));
      } else if (!actions.length) {
        setStatus('AI Copilot hat geantwortet.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCopilotError(message);
      setCopilotMessages(current => [...current,{
        id:`assistant-error-${Date.now()}`,
        role:'assistant',
        content:`Ich konnte die Anfrage nicht ausführen: ${message}`,
        createdAt:new Date().toISOString()
      }].slice(-40));
    } finally {
      setCopilotBusy(false);
    }
  }

  function confirmPendingCopilotActions() {
    applyCopilotActions(pendingCopilotActions, true);
    setPendingCopilotActions([]);
    setCopilotMessages(current => [...current,{
      id:`assistant-confirmed-${Date.now()}`,
      role:'assistant',
      content:'Die bestätigten Änderungen wurden im Projekt ausgeführt. Du kannst sie über Rückgängig wieder zurücknehmen.',
      createdAt:new Date().toISOString()
    }].slice(-40));
  }

  function clearCopilotHistory() {
    setCopilotMessages([{
      id:`welcome-${Date.now()}`,
      role:'assistant',
      content:'Der Chat wurde geleert. Ich kenne weiterhin den aktuellen Projektzustand und kann direkt damit weiterarbeiten.',
      createdAt:new Date().toISOString()
    }]);
    setCopilotSuggestions([]);
    setPendingCopilotActions([]);
    setCopilotError('');
  }

  async function generateFromChat() {
    const text = chat.toLowerCase();
    const base = Date.now();
    const generatedBlobs: TerrainBlob[] = [];
    const generatedZones: Zone[] = [];
    const generatedObjects: GardenObject[] = [];

    if (chatEngine === 'openai') {
      setOpenAiNote(`OpenAI-Modus gewählt: ${openAiModel}. Anfrage an /api/openai wird versucht.`);
      try {
        const res = await fetch('/api/garden', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: chat, model: openAiModel })
        });
        const data = await res.json();
        if (data?.ok && data?.layout && applyStructuredGardenLayout(data.layout)) {
          setOpenAiNote('OpenAI-JSON-Schema erhalten und direkt als Gartenlayout übernommen.');
          return;
        } else {
          setOpenAiLastAnswer(String(data?.error || data?.message || 'Kein gültiges OpenAI-Layout. Lokaler Fallback aktiv.'));
          setOpenAiNote('OpenAI nicht verfügbar, kein API-Key gesetzt oder kein gültiges JSON. Lokaler Fallback aktiv.');
        }
      } catch (err) {
        setOpenAiLastAnswer('OpenAI-Anfrage fehlgeschlagen. Lokaler Fallback aktiv.');
        setOpenAiNote('OpenAI-Anfrage fehlgeschlagen. Lokaler Fallback aktiv.');
      }
    }

    if (text.includes('zwei erhebungen') || text.includes('zwei hügel') || text.includes('hügel') || text.includes('erhebung')) {
      generatedBlobs.push(
        { id: base + 1, name: 'KI Hügel Nord', x: -3.8, y: -2.5, radius: 2.8, height: 1.1, softness: 1.55, source: chatEngine === 'openai' ? `OpenAI ${openAiModel}` : 'KI-Chat' },
        { id: base + 2, name: 'KI Hügel Süd', x: 4.0, y: 2.0, radius: 2.2, height: 0.75, softness: 1.45, source: chatEngine === 'openai' ? `OpenAI ${openAiModel}` : 'KI-Chat' }
      );
    }
    if (text.includes('mulde') || text.includes('senke') || text.includes('teich')) {
      generatedBlobs.push({
        id: base + 3, name: text.includes('teich') ? 'KI Teich-Senke' : 'KI Senke Mitte',
        x: 0.5, y: -1.8, radius: 2.0, height: -0.6, softness: 1.65, source: chatEngine === 'openai' ? `OpenAI ${openAiModel}` : 'KI-Chat'
      });
    }
    if (text.includes('sanft') || text.includes('weich')) {
      generatedBlobs.forEach(b => { b.softness = Math.max(b.softness, 1.7); });
    }
    if (text.includes('pflegeleicht') || text.includes('garten') || text.includes('pflanz')) {
      generatedZones.push({ id: base + 101, kind: 'plantZone', name: 'KI pflegeleichte Gartenzone', x: 4.5, y: -2.0, width: 5.0, depth: 3.0, color: '#a7f3d0' });
    }
    if (text.includes('terrasse') || text.includes('sitzplatz') || text.includes('belag')) {
      let tx = -4.0; let ty = 2.5;
      if (text.includes('süden') || text.includes('süd')) { tx = 2.0; ty = 4.0; }
      if (text.includes('norden') || text.includes('nord')) { tx = -2.0; ty = -4.0; }
      generatedZones.push({ id: base + 102, kind: 'hardscape', name: text.includes('terrasse') ? 'KI Terrasse' : 'KI Sitzplatz', x: tx, y: ty, width: 4.5, depth: 3.0, color: '#b8b0a2' });
    }

    if (text.includes('haus') || text.includes('gebäude') || text.includes('glashaus') || text.includes('hütte') || text.includes('turm') || text.includes('pavillon') || text.includes('atelier')) {
      let bx = 0.0, by = 0.0, bw = 4.0, bd = 5.0, bh = 3.5, bcolor = '#f8fafc', bname = 'KI Gebäude';
      if (text.includes('norden') || text.includes('nord')) { bx = -2.0; by = -3.5; }
      if (text.includes('süden') || text.includes('süd')) { bx = 3.0; by = 3.5; }
      if (text.includes('osten') || text.includes('ost')) { bx = 5.2; by = 0.0; }
      if (text.includes('westen') || text.includes('west')) { bx = -5.2; by = 0.0; }
      if (text.includes('glashaus')) { bname = 'KI Glashaus'; bw = 2.8; bd = 3.6; bh = 2.8; bcolor = '#e0f2fe'; }
      else if (text.includes('turm')) { bname = 'KI Aussichtsturm'; bw = 2.0; bd = 2.0; bh = 8.0; bcolor = '#cbd5e1'; }
      else if (text.includes('hütte')) { bname = 'KI Gartenhütte'; bw = 2.4; bd = 2.2; bh = 2.6; bcolor = '#78350f'; }
      else if (text.includes('pavillon')) { bname = 'KI Pavillon'; bw = 3.4; bd = 3.4; bh = 2.8; bcolor = '#d6c4a7'; }
      else if (text.includes('atelier')) { bname = 'KI Gartenatelier'; bw = 4.0; bd = 3.2; bh = 3.0; bcolor = '#f1f5f9'; }
      else if (text.includes('modern')) { bname = 'KI Modernes Haus'; bw = 5.0; bd = 6.0; bh = 4.2; bcolor = '#ffffff'; }
      generatedObjects.push({ id: base + 201, type: 'building', name: bname, x: bx, y: by, width: bw, depth: bd, height: bh, rotation: text.includes('schräg') ? 20 : 15, color: bcolor });
    }
    if (text.includes('pool') || text.includes('schwimm')) generatedObjects.push({ id: base + 202, type: 'pool', name: 'KI Pool', x: 4.8, y: 2.8, width: 4.0, depth: 2.4, height: 1.3, rotation: 0, color: '#38bdf8' });
    if (text.includes('pergola')) generatedObjects.push({ id: base + 203, type: 'pergola', name: 'KI Pergola', x: -5.2, y: 0.0, width: 3.0, depth: 2.2, height: 2.6, rotation: 0, color: '#8b5e3c' });
    if (text.includes('mauer') || text.includes('wand')) generatedObjects.push({ id: base + 204, type: 'wall', name: 'KI Mauer', x: -0.6, y: -3.2, width: 3.5, depth: 0.25, height: 1.0, rotation: 15, color: '#9ca3af' });
    if (text.includes('treppe') || text.includes('stufen')) generatedObjects.push({ id: base + 205, type: 'stairs', name: 'KI Stufen', x: -2.5, y: -2.0, width: 2.2, depth: 1.4, height: 0.9, rotation: 0, color: '#c8b6a6' });
    if (text.includes('baum') || text.includes('bäume')) generatedObjects.push({ id: base + 206, type: 'tree', name: 'KI Baum', x: 4.0, y: 0.0, width: 1.4, depth: 1.4, height: 4.0, rotation: 0, color: '#16a34a' });
    if (text.includes('strauch') || text.includes('sträucher')) generatedObjects.push({ id: base + 207, type: 'shrub', name: 'KI Strauch', x: 5.4, y: -1.5, width: 1.0, depth: 1.0, height: 1.2, rotation: 0, color: '#22c55e' });
    if (text.includes('hecke')) generatedObjects.push({ id: base + 208, type: 'hedge', name: 'KI Hecke', x: 0.0, y: -4.5, width: 4.5, depth: 0.6, height: 1.5, rotation: 0, color: '#15803d' });

    if (generatedBlobs.length === 0) generatedBlobs.push({ id: base + 1, name: 'KI Standard-Hügel', x: -2.0, y: -1.0, radius: 2.2, height: 0.6, softness: 1.55, source: chatEngine === 'openai' ? `OpenAI ${openAiModel}` : 'KI-Chat' });
    if (generatedObjects.length === 0 && (text.includes('architektur') || text.includes('bauwerk'))) generatedObjects.push({ id: base + 209, type: 'building', name: 'Architektur-Kubus', x: -1.0, y: 1.0, width: 4.0, depth: 4.0, height: 3.5, rotation: 0, color: '#f1f5f9' });

    setTerrainBlobs(generatedBlobs);
    if (generatedZones.length) setZones(generatedZones);
    if (generatedObjects.length) setObjects(generatedObjects);
    setSelection('terrain', generatedBlobs[0]?.id ?? null, `${chatEngine === 'openai' ? `OpenAI ${openAiModel}` : 'Lokale KI'} interpretiert: ${generatedBlobs.length} Terrain-Formen, ${generatedZones.length} Zonen und ${generatedObjects.length} Architektur-/Gartenobjekte.`);
  }

  function exportQuantityCsv() {
    const rows=[
      ['Kategorie','Position','Einheit','Menge','Einheitspreis EUR','Gesamt EUR'],
      ...quantityLines.map(line=>[
        line.category,
        line.name,
        line.unit,
        line.quantity.toFixed(2),
        line.unitPrice.toFixed(2),
        line.total.toFixed(2)
      ])
    ];
    const csv=rows.map(row=>row.map(csvCell).join(';')).join('\n');
    download('al-green-design-v032-mengen-kosten.csv',csv,'text/csv;charset=utf-8');
    setStatus('Mengen- und Kostenliste exportiert.');
  }

  function buildPrintableReportHtml() {
    const auditHtml=projectAudit
      ? `<section><h2>Projektprüfung</h2><div class="score"><strong>${projectAudit.score}/100</strong><span>Note ${projectAudit.grade}</span></div><h3>Hinweise</h3><ul>${projectAudit.issues.slice(0,20).map(issue=>`<li><strong>${issue.title}</strong> – ${issue.message}</li>`).join('')}</ul><h3>Empfehlungen</h3><ol>${projectAudit.recommendations.map(item=>`<li>${item}</li>`).join('')}</ol></section>`
      : '<section><h2>Projektprüfung</h2><p>Noch keine automatische Projektprüfung ausgeführt.</p></section>';

    const quantityRows=quantityLines.map(line=>`
      <tr>
        <td>${line.category}</td>
        <td>${line.name}</td>
        <td>${line.unit}</td>
        <td class="num">${line.quantity.toFixed(2)}</td>
        <td class="num">${formatEuro(line.unitPrice)}</td>
        <td class="num">${formatEuro(line.total)}</td>
      </tr>`).join('');

    const costRows=costGroups.map(group=>`<tr><td>${group.category}</td><td class="num">${formatEuro(group.total)}</td></tr>`).join('');

    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${projectInfo.name} – AL Green Design Bericht</title><style>
      @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#32101a;margin:0;background:#fff}header{border-bottom:4px solid #881337;padding-bottom:16px;margin-bottom:24px}.brand{display:flex;align-items:center;gap:14px}.logo{width:54px;height:54px;border-radius:16px;background:linear-gradient(135deg,#7f1d1d,#be123c);color:#fff;display:grid;place-items:center;font-weight:900;font-size:22px}.brand h1{margin:0;color:#5f0f22}.brand p{margin:4px 0 0;color:#9f3952}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.card,.score{padding:12px;border:1px solid #ead7dc;border-radius:12px;background:#fff7f7}.card small{display:block;color:#9f3952}.card strong{display:block;margin-top:4px}h2{margin-top:28px;color:#6b1024;border-bottom:1px solid #ead7dc;padding-bottom:7px}h3{color:#7f1d1d}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border-bottom:1px solid #ead7dc;padding:7px;text-align:left}th{background:#fff1f2;color:#6b1024}.num{text-align:right}.total{font-size:20px;color:#7f1d1d}.footer{margin-top:30px;padding-top:10px;border-top:1px solid #ead7dc;font-size:10px;color:#9f3952}@media print{button{display:none}.card,.score{break-inside:avoid}table{break-inside:auto}tr{break-inside:avoid}}
    </style></head><body>
      <header><div class="brand"><div class="logo">AL</div><div><h1>AL Green Design</h1><p>Landscape Architecture Studio · Projektbericht V0.31</p></div></div></header>
      <section><h2>Projekt</h2><div class="meta"><div class="card"><small>Name</small><strong>${projectInfo.name}</strong></div><div class="card"><small>Standort</small><strong>${projectInfo.location || '—'}</strong></div><div class="card"><small>Projektfläche</small><strong>${projectInfo.area.toFixed(0)} m²</strong></div><div class="card"><small>Budget</small><strong>${formatEuro(projectInfo.budget)}</strong></div></div></section>
      <section><h2>Kostenübersicht</h2><table><thead><tr><th>Kategorie</th><th class="num">Summe</th></tr></thead><tbody>${costRows}</tbody></table><p class="total"><strong>Gesamtschätzung: ${formatEuro(projectGrandTotal)}</strong></p><p>Budgetdifferenz: <strong>${formatEuro(budgetDifference)}</strong></p></section>
      <section><h2>Mengen und Positionen</h2><table><thead><tr><th>Kategorie</th><th>Position</th><th>Einheit</th><th class="num">Menge</th><th class="num">EP</th><th class="num">Gesamt</th></tr></thead><tbody>${quantityRows}</tbody></table></section>
      <section><h2>Gelände</h2><div class="meta"><div class="card"><small>Aushub</small><strong>${terrainAnalysis.cutVolume.toFixed(1)} m³</strong></div><div class="card"><small>Aufschüttung</small><strong>${terrainAnalysis.fillVolume.toFixed(1)} m³</strong></div><div class="card"><small>Bilanz</small><strong>${terrainAnalysis.netVolume.toFixed(1)} m³</strong></div><div class="card"><small>Höhenpunkte</small><strong>${elevationPoints.length}</strong></div></div></section>
      <section><h2>Planungskennzahlen</h2><div class="meta"><div class="card"><small>Objekte</small><strong>${objects.length}</strong></div><div class="card"><small>Pflanzen</small><strong>${objects.filter(o=>['tree','shrub','hedge'].includes(o.type)).length}</strong></div><div class="card"><small>Materialien verwendet</small><strong>${materialUsageStats.length}</strong></div><div class="card"><small>Bewässerungszonen</small><strong>${irrigationZones.length}</strong></div></div></section>
      ${auditHtml}
      <div class="footer">Automatisch erzeugter Planungsbericht. Mengen, Kosten, Pflanzen- und Geländewerte sind Planungsansätze und vor Ausführung fachlich zu prüfen.</div>
    </body></html>`;
  }

  function exportHtmlReport() {
    download('al-green-design-v032-projektbericht.html',buildPrintableReportHtml(),'text/html;charset=utf-8');
    setStatus('HTML-Projektbericht exportiert.');
  }

  function openPrintableReport() {
    const popup=window.open('','_blank','noopener,noreferrer');
    if(!popup){
      setStatus('Druckansicht konnte nicht geöffnet werden. Pop-up-Freigabe prüfen.');
      return;
    }
    popup.document.open();
    popup.document.write(buildPrintableReportHtml());
    popup.document.close();
    popup.focus();
    window.setTimeout(()=>popup.print(),300);
    setStatus('Druckansicht geöffnet. Im Druckdialog kann als PDF gespeichert werden.');
  }

  function startPresentation(preset:PresentationPreset='overview') {
    if(!presentationMode){
      presentationReturnRef.current={view,nightMode,growthYear,season};
    }

    setPresentationMode(true);
    setPresentationPreset(preset);
    setView('3d');
    setSelectedKind(null);
    setSelectedId(null);
    setSelectedObjectIds([]);

    if(preset==='day'){
      setNightMode(false);
      setGrowthYear(3);
      setSeason('Sommer');
      setPresentationCaption('Tagansicht · Sommer · Jahr 3');
    }else if(preset==='night'){
      setNightMode(true);
      setPresentationCaption('Nachtansicht mit Beleuchtung');
    }else if(preset==='growth10'){
      setNightMode(false);
      setGrowthYear(10);
      setSeason('Sommer');
      setPresentationCaption('Vegetationsentwicklung · Jahr 10');
    }else{
      setNightMode(false);
      setPresentationCaption('Gesamtübersicht');
    }
  }

  function exitPresentation() {
    const previous=presentationReturnRef.current;
    setPresentationMode(false);
    if(previous){
      setView(previous.view);
      setNightMode(previous.nightMode);
      setGrowthYear(previous.growthYear);
      setSeason(previous.season);
    }
    presentationReturnRef.current=null;
  }

  function exportCsvReport() {
    const rows = [
      ['Kategorie','Name','Typ','X','Y','Breite','Tiefe','Höhe','Material','Kostenansatz'],
      ...objects.map(o=>['Objekt',o.name,o.type,o.x,o.y,o.width,o.depth,o.height,o.material||'',Number(o.unitCost||0)]),
      ...zones.map(z=>['Zone',z.name,z.kind,z.x,z.y,z.width,z.depth,0,'',0]),
      ...terrainBlobs.map(b=>['Gelände',b.name,b.height>=0?'Erhebung':'Senke',b.x,b.y,b.radius*2,b.radius*2,b.height,'Erde',48])
    ];
    const csv = rows.map(row=>row.map(cell=>`"${String(cell).replaceAll('"','""')}"`).join(';')).join('\n');
    download('al-green-design-v032-objektbericht.csv', csv, 'text/csv;charset=utf-8');
    setStatus('CSV-Bericht exportiert.');
  }

  function exportProject() {
    download('al-green-design-v032-complete-studio.algreen', JSON.stringify({
      version:'0.32.0',
      projectInfo,
      terrainBlobs,
      elevationPoints,
      irrigationZones,
      zones,
      objects,
      rooms,
      levels,
      activeLevel,
      importedModels,
      layers,
      lockedLayers,
      gridSize,
      snapEnabled,
      imageName:image?.name ?? null,
      chatEngine,
      openAiModel,
      planningBrief,
      projectAudit,
      quantityLines,
      projectGrandTotal
    }, null, 2), 'application/json');
    setStatus('V0.31-Projekt vollständig exportiert.');
  }


  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === 'Escape' && presentationMode) {
        exitPresentation();
        return;
      }
      if (['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelection();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return (
    <section className={`platform ${presentationMode?'presentationMode':''}`}>
      <aside className="panel">
        <div className="brandBlock">
          <div className="brandLogo" aria-hidden="true">
            <span className="brandLeaf"></span>
            <span className="brandGrid"></span>
          </div>
          <div>
            <strong>AL Green Design</strong>
            <span>Landscape Architecture Studio</span>
          </div>
        </div>
        <h2>Module</h2>
        <div className="grid2">
          {([
            ['dashboard','Dashboard'],['project','Projekt'],['chat','KI-Chat'],['image','Bild/KI'],['video3d','Video → 3D'],['terrain','Terrain'],['hardscape','Wege/Mauern/Treppen'],['architecture','Architektur'],['building','Bauteile'],['scan','Scan/LiDAR'],['library','Bibliothek'],['materials','Materialien'],['layers','Layer'],['costs','Kosten'],['analysis','Analyse'],['water','Wasser'],['climate','Klima/Sonne'],['agents','KI-Agenten'],['scene','3D-Szene'],['reports','Berichte'],['export','Export']
          ] as [Tab,string][]).map(([id,label]) => <button key={id} className={`tab ${tab===id?'active':''}`} onClick={()=>setTab(id)}>{label}</button>)}
        </div>
        <hr />


        {tab === 'dashboard' && (
          <>
            <h2>PRO STUDIO Dashboard</h2>
            <div className="kpis">
              <div className="kpi"><small>Projekt</small><strong>{projectInfo.name}</strong></div>
              <div className="kpi"><small>Budget</small><strong>{projectInfo.budget.toFixed(0)} €</strong></div>
              <div className="kpi"><small>Objekte</small><strong>{objects.length}</strong></div>
              <div className="kpi"><small>Terrain</small><strong>{terrainBlobs.length}</strong></div>
            </div>
            <div className="grid2" style={{marginTop:10}}>
              <button className="btn" onClick={undo}>Undo</button>
              <button className="btn" onClick={redo}>Redo</button>
              <button className="btn primary" onClick={saveBrowserProject}>Speichern</button>
              <button className="btn blue" onClick={loadBrowserProject}>Laden</button>
            </div>
          </>
        )}

        {tab === 'project' && (
          <>
            <h2>Projektverwaltung</h2>
            <div className="form">
              <label>Projektname<input value={projectInfo.name} onChange={e=>setProjectInfo({...projectInfo,name:e.target.value})}/></label>
              <label>Standort<input value={projectInfo.location} onChange={e=>setProjectInfo({...projectInfo,location:e.target.value})}/></label>
              <label>Budget €<input type="number" value={projectInfo.budget} onChange={e=>setProjectInfo({...projectInfo,budget:Number(e.target.value)})}/></label>
              <label>Fläche m²<input type="number" value={projectInfo.area} onChange={e=>setProjectInfo({...projectInfo,area:Number(e.target.value)})}/></label>
              <label>Raster<select value={gridSize} onChange={e=>setGridSize(Number(e.target.value))}><option value="0.1">0,1 m</option><option value="0.25">0,25 m</option><option value="0.5">0,5 m</option><option value="1">1 m</option></select></label>
              <label><input type="checkbox" checked={snapEnabled} onChange={e=>setSnapEnabled(e.target.checked)}/> Fangfunktion aktiv</label>
            </div>
            <div className="cadSelectionPanel" style={{marginTop:12}}>
              <h2>Stabilität & Versionen</h2>
              <div className="grid2">
                <button className="btn primary" onClick={createNamedVersion}>Version speichern</button>
                <button className="btn" onClick={restoreAutosave}>Autosave laden</button>
              </div>
              <div className="versionList" style={{marginTop:8}}>
                {versionSnapshots.map((version,index)=>(
                  <div className="item versionItem" key={`${version.createdAt}-${index}`}>
                    <strong>{version.label}</strong>
                    <span>{new Date(version.createdAt).toLocaleString()}</span>
                    <div className="grid2" style={{marginTop:6}}>
                      <button className="btn blue" onClick={()=>restoreNamedVersion(index)}>Laden</button>
                      <button className="btn danger" onClick={()=>deleteNamedVersion(index)}>Löschen</button>
                    </div>
                  </div>
                ))}
                {!versionSnapshots.length && <div className="hint">Noch keine manuelle Version gespeichert.</div>}
              </div>
            </div>

          </>
        )}

        {tab === 'chat' && (
          <>
            <h2>AI Copilot</h2>
            <div className="copilotShell">
              <div className="copilotToolbar">
                <div>
                  <strong>Projektbewusster Chat</strong>
                  <span>berät, versteht Rückfragen und kann den Plan direkt ändern</span>
                </div>
                <label>Modell
                  <input value={copilotModel} onChange={e=>setCopilotModel(e.target.value)} placeholder="gpt-5.2" />
                </label>
                <label className="copilotToggle">
                  <input type="checkbox" checked={copilotAutoApply} onChange={e=>setCopilotAutoApply(e.target.checked)} />
                  Sichere Aktionen direkt anwenden
                </label>
                <button className="btn" onClick={clearCopilotHistory}>Chat leeren</button>
              </div>

              <div className="copilotMessages" aria-live="polite">
                {copilotMessages.map(message=>(
                  <article key={message.id} className={`copilotMessage ${message.role}`}>
                    <div className="copilotAvatar">{message.role==='assistant'?'AI':'Du'}</div>
                    <div className="copilotBubble">
                      <strong>{message.role==='assistant'?'AL Green Copilot':'Du'}</strong>
                      <p>{message.content}</p>
                      {typeof message.actionCount==='number' && message.actionCount>0 && (
                        <span className="copilotActionBadge">{message.actionCount} geplante Aktion{message.actionCount===1?'':'en'}</span>
                      )}
                    </div>
                  </article>
                ))}
                {copilotBusy && (
                  <article className="copilotMessage assistant">
                    <div className="copilotAvatar">AI</div>
                    <div className="copilotBubble copilotThinking"><strong>AL Green Copilot</strong><p>Ich analysiere den Dialog und den aktuellen Plan …</p></div>
                  </article>
                )}
                <div ref={copilotEndRef}/>
              </div>

              {copilotError && <div className="copilotError">{copilotError}</div>}

              {pendingCopilotActions.length>0 && (
                <div className="copilotConfirmation">
                  <strong>{pendingCopilotActions.some(action=>action.destructive)?'Bestätigung erforderlich':'Aktionen bereit'}</strong>
                  <p>{pendingCopilotActions.some(action=>action.destructive)
                    ? 'Diese Änderung löscht oder ersetzt Projektbestandteile. Bitte zuerst kontrollieren.'
                    : 'Die automatische Anwendung ist deaktiviert. Du kannst die geplanten Änderungen jetzt übernehmen.'}</p>
                  <div className="copilotActionList">
                    {pendingCopilotActions.map(action=><span key={action.id}>{action.reason}</span>)}
                  </div>
                  <div className="grid2">
                    <button className="btn primary" onClick={confirmPendingCopilotActions}>Änderungen ausführen</button>
                    <button className="btn danger" onClick={()=>setPendingCopilotActions([])}>Verwerfen</button>
                  </div>
                </div>
              )}

              {copilotSuggestions.length>0 && (
                <div className="copilotSuggestions">
                  {copilotSuggestions.map((suggestion,index)=>(
                    <button key={`${suggestion}-${index}`} onClick={()=>sendCopilotMessage(suggestion)} disabled={copilotBusy}>{suggestion}</button>
                  ))}
                </div>
              )}

              <form className="copilotComposer" onSubmit={e=>{e.preventDefault();void sendCopilotMessage();}}>
                <textarea
                  value={copilotInput}
                  onChange={e=>setCopilotInput(e.target.value)}
                  onKeyDown={e=>{
                    if(e.key==='Enter' && !e.shiftKey){
                      e.preventDefault();
                      void sendCopilotMessage();
                    }
                  }}
                  placeholder="Schreibe wie in ChatGPT, z. B.: Verschiebe die Pergola nach Süden, mache sie 4 × 3 Meter groß und verwende dunkles Thermoholz."
                  disabled={copilotBusy}
                />
                <button className="btn primary copilotSend" type="submit" disabled={copilotBusy || !copilotInput.trim()}>
                  {copilotBusy?'Denke …':'Senden'}
                </button>
              </form>
              <div className="hint">Der API-Schlüssel bleibt serverseitig. Löschaktionen werden niemals ohne Bestätigung ausgeführt. Jede Änderung kann mit Rückgängig zurückgenommen werden.</div>
            </div>

            <h2 style={{marginTop:18}}>AI Planning Studio</h2>

            <label>Projektbeschreibung
              <textarea className="full" value={chat} onChange={e=>setChat(e.target.value)} placeholder="Beispiel: Moderner pflegeleichter Garten mit Terrasse, Pergola, Sichtschutz, Pool und naturnaher Bepflanzung."/>
            </label>

            <div className="grid2">
              <button className="btn primary" onClick={syncPlanningBriefFromPrompt}>1. Planungsbrief analysieren</button>
              <button className="btn blue" onClick={createLocalPlanningVariants}>2. Varianten A/B/C erzeugen</button>
            </div>

            <div className="planningBriefPanel">
              <h3>Planungsbrief</h3>
              <div className="grid2">
                <label>Stil<select value={planningBrief.style} onChange={e=>setPlanningBrief({...planningBrief,style:e.target.value as PlanningBrief['style']})}>
                  <option value="modern">Modern</option>
                  <option value="natural">Naturnah</option>
                  <option value="mediterranean">Mediterran</option>
                  <option value="minimal">Minimal</option>
                  <option value="family">Familie</option>
                </select></label>
                <label>Priorität<select value={planningBrief.priority} onChange={e=>setPlanningBrief({...planningBrief,priority:e.target.value as PlanningPriority})}>
                  <option value="design">Design</option>
                  <option value="budget">Budget</option>
                  <option value="maintenance">Pflege</option>
                  <option value="ecology">Ökologie</option>
                  <option value="family">Familie</option>
                </select></label>
                <label>Budget<input type="number" step="1000" value={planningBrief.budget} onChange={e=>setPlanningBrief({...planningBrief,budget:Number(e.target.value)})}/></label>
                <label>Ziel Pflanzenanzahl<input type="number" min="0" step="1" value={planningBrief.targetPlantCount} onChange={e=>setPlanningBrief({...planningBrief,targetPlantCount:Number(e.target.value)})}/></label>
              </div>

              <div className="planningFlags">
                {([
                  ['needsPool','Pool'],
                  ['needsTerrace','Terrasse'],
                  ['needsPergola','Pergola'],
                  ['needsPlayArea','Familien-/Spielfläche'],
                  ['needsPrivacy','Sichtschutz'],
                  ['needsLowMaintenance','Pflegeleicht'],
                  ['needsBiodiversity','Biodiversität']
                ] as [keyof PlanningBrief,string][]).map(([key,label])=>(
                  <label key={String(key)}>
                    <input
                      type="checkbox"
                      checked={Boolean(planningBrief[key])}
                      onChange={e=>setPlanningBrief({...planningBrief,[key]:e.target.checked})}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {planningQuestions.length>0 && (
              <div className="planningQuestions">
                <h3>Offene Planungsfragen</h3>
                {planningQuestions.map((question,index)=><div className="item" key={index}><strong>{index+1}.</strong><span>{question}</span></div>)}
              </div>
            )}

            <div className="planningVariantList">
              {planningVariants.map(variant=>(
                <article key={variant.id} className={`planningVariantCard ${selectedPlanningVariantId===variant.id?'active':''}`}>
                  <button className="planningVariantHeader" onClick={()=>setSelectedPlanningVariantId(variant.id)}>
                    <strong>{variant.name}</strong>
                    <span>{variant.score}/100</span>
                  </button>
                  <p>{variant.concept}</p>
                  <div className="materialTags">
                    <span>{variant.objects.length} Objekte</span>
                    <span>{variant.zones.length} Zonen</span>
                    <span>{variant.terrainBlobs.length} Geländeformen</span>
                  </div>
                  <button className="btn primary" onClick={()=>applyPlanningVariant(variant.id)}>Variante übernehmen</button>
                </article>
              ))}
            </div>

            <details className="legacyAiPanel">
              <summary>Schnellentwurf / bestehende KI-Engine</summary>
              <label>Chat-Engine
                <select value={chatEngine} onChange={e=>setChatEngine(e.target.value as ChatEngine)}>
                  <option value="local">Lokale KI</option>
                  <option value="openai">OpenAI vorbereitet</option>
                </select>
              </label>
              <label>Modell
                <input value={openAiModel} onChange={e=>setOpenAiModel(e.target.value)} placeholder="Modellname"/>
              </label>
              <button className="btn" onClick={generateFromChat}>Schnellentwurf generieren</button>
              <div className="hint">{openAiNote}</div>
              {openAiLastAnswer && <div className="hint">JSON-Schema: {openAiLastAnswer}</div>}
            </details>
          </>
        )}


        {tab === 'image' && (
          <>
            <h2>Bild anwenden und analysieren</h2>
            <label className="file">Bild hochladen<input type="file" accept="image/*" onChange={e=>uploadImage(e.target.files?.[0] ?? null)} /></label>
            <div className="grid2" style={{marginTop:8}}>
              <button className="btn primary" disabled={!image} onClick={applyImageAsPlanBackground}>Als Planhintergrund anwenden</button>
              <button className="btn blue" disabled={!image} onClick={analyzeImageToSoftTerrain}>Bildanalyse anwenden</button>
              <button className="btn" disabled={!imageApplied} onClick={removeAppliedImage}>Hintergrund ausblenden</button>
            </div>
            <label style={{marginTop:10}}>Bildtransparenz<input type="range" min="0.05" max="1" step="0.05" value={imageOpacity} onChange={e=>setImageOpacity(Number(e.target.value))}/><span>{Math.round(imageOpacity*100)}%</span></label>
            <label>Einpassung<select value={imageFit} onChange={e=>setImageFit(e.target.value as 'stretch'|'contain')}><option value="contain">Seitenverhältnis behalten</option><option value="stretch">Planfläche füllen</option></select></label>
            <div className="preview">{image ? <img src={image.dataUrl} alt="Upload" /> : <span className="small">Noch kein Bild geladen</span>}</div>
            <div className="hint" style={{marginTop:8}}>Planhintergrund anwenden zeigt das Foto tatsächlich im 2D-Plan. Bildanalyse anwenden erzeugt zusätzlich Terrainformen und Zonen.</div>
          </>
        )}

        {tab === 'video3d' && (
          <>
            <h2>VIDEO → 3D</h2>
            <div className="list">
              <div className="item"><strong>Video laden</strong><span>Frames direkt im Browser extrahieren.</span></div>
              <div className="item"><strong>3D-Modell erzeugen</strong><span>Tiefenrelief aus einem Videoframe.</span></div>
              <div className="item"><strong>Direkt übernehmen</strong><span>Das erzeugte Modell erscheint anschließend in deiner Haupt-3D-Szene.</span></div>
              <div className="item"><strong>Export</strong><span>GLB und OBJ direkt herunterladen.</span></div>
            </div>
            <a className="btn primary" style={{display:'block',marginTop:10,textAlign:'center',textDecoration:'none'}} href="/video-to-3d">VIDEO → 3D Studio öffnen</a>
          </>
        )}

        {tab === 'terrain' && (
          <>
            <h2>Professionelles Gelände</h2>

            <div className="kpis">
              <div className="kpi"><small>Aushub</small><strong>{terrainAnalysis.cutVolume.toFixed(1)} m³</strong></div>
              <div className="kpi"><small>Aufschüttung</small><strong>{terrainAnalysis.fillVolume.toFixed(1)} m³</strong></div>
              <div className="kpi"><small>Bilanz</small><strong>{terrainAnalysis.netVolume.toFixed(1)} m³</strong></div>
            </div>

            <label style={{marginTop:10}}>
              Geländeoberfläche
              <select value={activeTerrainSurface} onChange={e=>setActiveTerrainSurface(e.target.value as 'existing'|'proposed')}>
                <option value="existing">Bestand</option>
                <option value="proposed">Planung</option>
              </select>
            </label>

            <div className="grid3">
              <button className={`tool ${terrainSculptMode==='point'?'active':''}`} onClick={()=>{setTerrainSculptMode('point');setTool('terrain');}}>Höhenpunkt</button>
              <button className={`tool ${terrainSculptMode==='plateau'?'active':''}`} onClick={()=>{setTerrainSculptMode('plateau');setTool('terrain');setActiveTerrainSurface('proposed');}}>Plateau</button>
              <button className={`tool ${terrainSculptMode==='slope'?'active':''}`} onClick={()=>{setTerrainSculptMode('slope');setTool('terrain');setActiveTerrainSurface('proposed');}}>Gefälle</button>
            </div>

            <label>
              Höhe neuer Punkt
              <input type="number" step="0.05" value={newElevationValue} onChange={e=>setNewElevationValue(Number(e.target.value))}/>
            </label>

            {terrainSculptMode==='plateau' && (
              <div className="grid2">
                <label>Plateau-Radius<input type="number" min="0.5" step="0.25" value={plateauRadius} onChange={e=>setPlateauRadius(Number(e.target.value))}/></label>
                <label>Plateau-Höhe<input type="number" step="0.05" value={plateauElevation} onChange={e=>setPlateauElevation(Number(e.target.value))}/></label>
              </div>
            )}

            <div className="grid2">
              <button className="btn blue" onClick={copyExistingToProposed}>Bestand → Planung kopieren</button>
              <button className="btn" onClick={calculateCurrentSlope}>Gefälle berechnen</button>
            </div>

            <label style={{marginTop:10}}>
              Höhenlinien-Abstand
              <input type="number" min="0.05" step="0.05" value={contourInterval} onChange={e=>setContourInterval(Math.max(0.05,Number(e.target.value)||0.25))}/>
            </label>

            <label>
              <input type="checkbox" checked={showTerrainContours2D} onChange={e=>setShowTerrainContours2D(e.target.checked)}/>
              Höhenlinien im 2D-Plan anzeigen
            </label>

            <div className="terrainRangeInfo">
              <div className="item"><strong>Bestand</strong><span>{terrainAnalysis.minExisting.toFixed(2)} bis {terrainAnalysis.maxExisting.toFixed(2)} m</span></div>
              <div className="item"><strong>Planung</strong><span>{terrainAnalysis.minProposed.toFixed(2)} bis {terrainAnalysis.maxProposed.toFixed(2)} m</span></div>
            </div>

            <h2 style={{marginTop:14}}>Höhenpunkte</h2>

            <div className="elevationPointList">
              {elevationPoints
                .filter(point=>point.kind===activeTerrainSurface)
                .map(point=>(
                  <div className="elevationPointCard" key={point.id}>
                    <input value={point.name} onChange={e=>updateElevationPoint(point.id,{name:e.target.value})}/>
                    <div className="grid3">
                      <label>X<input type="number" step="0.1" value={point.x} onChange={e=>updateElevationPoint(point.id,{x:Number(e.target.value)})}/></label>
                      <label>Y<input type="number" step="0.1" value={point.y} onChange={e=>updateElevationPoint(point.id,{y:Number(e.target.value)})}/></label>
                      <label>Höhe<input type="number" step="0.05" value={point.elevation} onChange={e=>updateElevationPoint(point.id,{elevation:Number(e.target.value)})}/></label>
                    </div>
                    <button className="btn danger" onClick={()=>deleteElevationPoint(point.id)}>Löschen</button>
                  </div>
                ))}
            </div>

            <div className="hint" style={{marginTop:10}}>
              Höhenpunkte werden per IDW interpoliert. Aushub und Aufschüttung werden über ein regelmäßiges Raster näherungsweise in m³ berechnet.
            </div>
          </>
        )}

        {tab === 'hardscape' && (
          <>
            <h2>Intelligente Wege, Mauern und Treppen</h2>

            <div className="grid2">
              <button className={`tool ${tool==='path'?'active':''}`} onClick={()=>{setTool('path');setHardscapeDraftType('path');setStairDraftStart(null);}}>Weg als Linienzug</button>
              <button className={`tool ${tool==='gardenWall'?'active':''}`} onClick={()=>{setTool('gardenWall');setHardscapeDraftType('gardenWall');setStairDraftStart(null);}}>Gartenmauer als Linienzug</button>
              <button className={`tool ${tool==='stairs'?'active':''}`} onClick={()=>{setTool('stairs');setHardscapeDraftPoints([]);}}>Treppe zwischen zwei Punkten</button>
              <button className={`tool ${tool==='select'?'active':''}`} onClick={()=>{setTool('select');resetHardscapeDraft();}}>Auswählen</button>
            </div>

            {(tool==='path' || tool==='gardenWall') && (
              <div className="hardscapeDraftPanel">
                <div className="item">
                  <strong>{tool==='path'?'Weg':'Gartenmauer'} · Linienzug</strong>
                  <span>{hardscapeDraftPoints.length} Punkte · {polylineLength(hardscapeDraftPoints).toFixed(2)} m</span>
                </div>

                <div className="grid3">
                  <button className="btn" disabled={!hardscapeDraftPoints.length} onClick={undoHardscapeDraftPoint}>Punkt zurück</button>
                  <button className="btn primary" disabled={hardscapeDraftPoints.length<2} onClick={finalizeHardscapePolyline}>Linie abschließen</button>
                  <button className="btn danger" disabled={!hardscapeDraftPoints.length} onClick={()=>setHardscapeDraftPoints([])}>Abbrechen</button>
                </div>
              </div>
            )}

            {tool==='path' && (
              <div className="form">
                <label>Wegbreite<input type="number" min="0.3" step="0.1" value={smartPathWidth} onChange={e=>setSmartPathWidth(Math.max(0.3,Number(e.target.value)||1.2))}/></label>
                <label>Material<select value={smartPathMaterial} onChange={e=>setSmartPathMaterial(e.target.value)}>
                  <option>Naturstein</option>
                  <option>Pflaster</option>
                  <option>Kies</option>
                  <option>Beton</option>
                  <option>Ziegel</option>
                  <option>Holz</option>
                </select></label>
                <label><input type="checkbox" checked={smartPathCurve} onChange={e=>setSmartPathCurve(e.target.checked)}/> Linienzug optisch glätten</label>
              </div>
            )}

            {tool==='gardenWall' && (
              <div className="form">
                <label>Mauerhöhe<input type="number" min="0.2" step="0.05" value={gardenWallHeight} onChange={e=>setGardenWallHeight(Math.max(0.2,Number(e.target.value)||1))}/></label>
                <label>Mauerdicke<input type="number" min="0.1" step="0.02" value={gardenWallThickness} onChange={e=>setGardenWallThickness(Math.max(0.1,Number(e.target.value)||0.28))}/></label>
                <label>Fundamenttiefe<input type="number" min="0" step="0.05" value={gardenWallFoundation} onChange={e=>setGardenWallFoundation(Math.max(0,Number(e.target.value)||0))}/></label>
              </div>
            )}

            {tool==='stairs' && (
              <div className="form">
                <label>Treppenbreite<input type="number" min="0.5" step="0.1" value={smartStairWidth} onChange={e=>setSmartStairWidth(Math.max(0.5,Number(e.target.value)||1.4))}/></label>
                <label>Gewünschte Steigung<input type="number" min="0.08" max="0.25" step="0.005" value={preferredRiserHeight} onChange={e=>setPreferredRiserHeight(Math.max(0.08,Number(e.target.value)||0.16))}/></label>
                <label>Manuelle Höhendifferenz bei flachem Gelände<input type="number" min="0.1" step="0.05" value={manualStairRise} onChange={e=>setManualStairRise(Math.max(0.1,Number(e.target.value)||0.75))}/></label>

                {stairDraftStart && (
                  <div className="item">
                    <strong>Treppen-Startpunkt gesetzt</strong>
                    <span>X {stairDraftStart.x.toFixed(2)} · Y {stairDraftStart.y.toFixed(2)}</span>
                    <button className="btn danger" onClick={()=>setStairDraftStart(null)}>Abbrechen</button>
                  </div>
                )}
              </div>
            )}

            <div className="hint" style={{marginTop:10}}>
              Weg/Mauer: beliebig viele Punkte setzen und anschließend „Linie abschließen“. Treppe: zwei Punkte setzen; Höhen, Stufenzahl, Steigung und Auftritt werden automatisch berechnet.
            </div>
          </>
        )}

        {tab === 'architecture' && (
          <>
            <h2>Architektur · Wände und Öffnungen</h2>

            <div className="kpis">
              <div className="kpi"><small>Wände</small><strong>{architectureStats.wallCount}</strong></div>
              <div className="kpi"><small>Wandlänge</small><strong>{architectureStats.totalWallLength.toFixed(1)} m</strong></div>
              <div className="kpi"><small>Öffnungen</small><strong>{architectureStats.hostedOpeningCount}/{architectureStats.openingCount}</strong></div>
            </div>

            <div className="grid2" style={{marginTop:10}}>
              {([
                ['wall','Außenwand zeichnen'],
                ['interiorWall','Innenwand zeichnen'],
                ['window','Fenster'],
                ['door','Tür'],
                ['slidingDoor','Schiebetür'],
                ['select','Auswählen']
              ] as [Tool,string][]).map(([id,label]) => (
                <button
                  key={id}
                  className={`tool ${tool===id?'active':''}`}
                  onClick={()=>{
                    setTool(id);
                    if (id!=='wall' && id!=='interiorWall') setWallDraftStart(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <label style={{marginTop:10}}>
              <input
                type="checkbox"
                checked={wallChainMode}
                onChange={e=>setWallChainMode(e.target.checked)}
              />
              Wände als zusammenhängenden Linienzug weiterzeichnen
            </label>

            {wallDraftStart && (
              <div className="item architectureDraftInfo">
                <strong>Wand-Startpunkt aktiv</strong>
                <span>X {wallDraftStart.x.toFixed(2)} m · Y {wallDraftStart.y.toFixed(2)} m</span>
                <button className="btn" onClick={()=>setWallDraftStart(null)}>Zeichnen abbrechen</button>
              </div>
            )}

            <div className="hint" style={{marginTop:10}}>
              Wand: Startpunkt klicken → Endpunkt klicken. Endpunkte rasten an bestehende Wandenden. Im Kettenmodus beginnt die nächste Wand automatisch am letzten Endpunkt.
            </div>

            <div className="hint" style={{marginTop:8}}>
              Fenster und Türen auf eine Wand ziehen. Sie werden an die Wandachse gekoppelt und erzeugen in der 2D- und 3D-Wand eine sichtbare Öffnung.
            </div>
          </>
        )}


        {tab === 'building' && (
          <>
            <h2>Geschosse, Räume und Gebäudestruktur</h2>

            <div className="buildingLevelToolbar">
              <div className="grid2">
                <button className="btn primary" onClick={addBuildingLevel}>Geschoss hinzufügen</button>
                <button className="btn blue" onClick={duplicateActiveBuildingLevel}>Aktives Geschoss duplizieren</button>
                <button className="btn" onClick={detectRoomsOnActiveLevel}>Räume automatisch erkennen</button>
              </div>

              <label style={{marginTop:8}}>
                <input type="checkbox" checked={showAllLevels} onChange={e=>setShowAllLevels(e.target.checked)}/>
                Alle sichtbaren Geschosse im 2D-Plan zeigen
              </label>
            </div>

            <div className="levelTree" style={{marginTop:10}}>
              {[...levels].sort((a,b)=>a.elevation-b.elevation).map(level => {
                const levelObjects = objects.filter(obj=>isLevelBoundObject(obj) && (obj.level ?? 0)===level.id);
                const levelRooms = rooms.filter(room=>room.level===level.id);

                return (
                  <div key={level.id} className={`levelCard ${activeLevel===level.id?'active':''}`}>
                    <button className="levelCardHeader" onClick={()=>setActiveLevel(level.id)}>
                      <strong>{level.name}</strong>
                      <span>{level.elevation.toFixed(2)} m · {levelObjects.length} Bauteile · {levelRooms.length} Räume</span>
                    </button>

                    <div className="grid2">
                      <label>Name<input value={level.name} onChange={e=>updateBuildingLevel(level.id,{name:e.target.value})}/></label>
                      <label>Höhe ab 0,00<input type="number" step="0.05" value={level.elevation} onChange={e=>updateBuildingLevel(level.id,{elevation:Number(e.target.value)})}/></label>
                      <label>Geschosshöhe<input type="number" step="0.05" min="0.5" value={level.height} onChange={e=>updateBuildingLevel(level.id,{height:Number(e.target.value)})}/></label>
                      <label><input type="checkbox" checked={level.visible} onChange={e=>updateBuildingLevel(level.id,{visible:e.target.checked})}/> Sichtbar in 3D</label>
                    </div>

                    {level.id!==0 && (
                      <button className="btn danger" onClick={()=>deleteBuildingLevel(level.id)}>Geschoss löschen</button>
                    )}
                  </div>
                );
              })}
            </div>

            <h2 style={{marginTop:14}}>Bauteile auf aktivem Geschoss</h2>
            <div className="grid3">
              {([
                ['floor','Bodenplatte'],['wall','Außenwand'],['interiorWall','Innenwand'],['roof','Dach'],['window','Fenster'],['door','Tür'],['slidingDoor','Schiebetür'],['balcony','Balkon'],['railing','Geländer'],['column','Stütze'],['carport','Carport'],['winterGarden','Wintergarten'],['select','Auswählen']
              ] as [Tool,string][]).map(([id,label]) => <button key={id} className={`tool ${tool===id?'active':''}`} onClick={()=>setTool(id)}>{label}</button>)}
            </div>

            <div className="hint" style={{marginTop:10}}>
              Aktives Geschoss: <strong>{levels.find(level=>level.id===activeLevel)?.name || activeLevel}</strong>. Neue Architektur-Bauteile werden automatisch diesem Geschoss zugeordnet.
            </div>

            <h2 style={{marginTop:14}}>Erkannte Räume</h2>
            <div className="roomList">
              {rooms.filter(room=>room.level===activeLevel).map(room=>(
                <button
                  key={room.id}
                  className={`item roomListItem ${selectedRoomId===room.id?'active':''}`}
                  onClick={()=>setSelection('room',room.id,`${room.name} ausgewählt.`)}
                >
                  <strong>{room.name}</strong>
                  <span>{room.area.toFixed(2)} m²</span>
                </button>
              ))}
              {!rooms.some(room=>room.level===activeLevel) && (
                <div className="hint">Noch keine Räume erkannt. Geschlossene Wandzüge erstellen und „Räume automatisch erkennen“ wählen.</div>
              )}
            </div>
          </>
        )}

        {tab === 'scan' && (
          <>
            <h2>Mobile Scan / LiDAR</h2>
            <div className="list">
              <div className="item"><strong>Native LiDAR-/Depth-Bridge</strong><span>iOS-/Android-App-Bridge vorbereitet.</span></div>
              <div className="item"><strong>Kamera-Fallback</strong><span>Direkt über die Scan-Seite nutzbar.</span></div>
              <div className="item"><strong>Dateiimport</strong><span>PLY, OBJ, GLB, GLTF, USDZ, JSON, ZIP.</span></div>
              <div className="item"><strong>Ziel</strong><span>Punktwolke → Mesh → Gelände → Bestandsobjekte.</span></div>
            </div>
            <a className="btn primary" style={{display:'block',marginTop:10,textAlign:'center',textDecoration:'none'}} href="/scan">Scan Studio öffnen</a>
          </>
        )}

        {tab === 'library' && (
          <>
            <h2>Pflanzenbibliothek</h2>

            <div className="kpis">
              <div className="kpi"><small>Arten</small><strong>{PLANT_CATALOG.length}</strong></div>
              <div className="kpi"><small>Im Projekt</small><strong>{objects.filter(object=>object.speciesId).length}</strong></div>
              <div className="kpi"><small>Kritisch</small><strong>{criticalPlantChecks}</strong></div>
              <div className="kpi"><small>Warnungen</small><strong>{warningPlantChecks}</strong></div>
            </div>

            <div className="plantFilterPanel">
              <label>Suche<input value={plantSearch} onChange={e=>setPlantSearch(e.target.value)} placeholder="Name oder botanischer Name"/></label>

              <div className="grid3">
                <label>Kategorie<select value={plantCategoryFilter} onChange={e=>setPlantCategoryFilter(e.target.value as 'all'|PlantCategory)}>
                  <option value="all">Alle</option>
                  <option value="tree">Bäume</option>
                  <option value="shrub">Sträucher</option>
                  <option value="hedge">Hecken</option>
                  <option value="perennial">Stauden</option>
                  <option value="grass">Gräser</option>
                </select></label>

                <label>Licht<select value={plantLightFilter} onChange={e=>setPlantLightFilter(e.target.value as 'all'|PlantLight)}>
                  <option value="all">Alle</option>
                  <option value="Sonne">Sonne</option>
                  <option value="Halbschatten">Halbschatten</option>
                  <option value="Schatten">Schatten</option>
                </select></label>

                <label>Wasser<select value={plantWaterFilter} onChange={e=>setPlantWaterFilter(e.target.value==='all'?'all':Number(e.target.value) as PlantWater)}>
                  <option value="all">Alle</option>
                  <option value="1">1 niedrig</option>
                  <option value="2">2</option>
                  <option value="3">3 mittel</option>
                  <option value="4">4</option>
                  <option value="5">5 hoch</option>
                </select></label>
              </div>

              <div className="grid2">
                <label>Projekt-Winterhärtezone<select value={projectHardinessZone} onChange={e=>setProjectHardinessZone(Number(e.target.value))}>
                  {[3,4,5,6,7,8,9].map(zone=><option key={zone} value={zone}>Zone {zone}</option>)}
                </select></label>

                <label>Standard-Standortlicht<select value={defaultPlantSiteLight} onChange={e=>setDefaultPlantSiteLight(e.target.value as PlantLight)}>
                  <option value="Sonne">Sonne</option>
                  <option value="Halbschatten">Halbschatten</option>
                  <option value="Schatten">Schatten</option>
                </select></label>
              </div>
            </div>

            <div className="plantCatalogGrid">
              {filteredPlantCatalog.map(species=>(
                <article key={species.id} className={`plantSpeciesCard ${selectedPlantSpeciesId===species.id?'active':''}`}>
                  <div className="plantSpeciesColor" style={{background:species.foliageColor}}/>
                  <div>
                    <strong>{species.commonName}</strong>
                    <em>{species.botanicalName}</em>
                  </div>

                  <div className="plantSpeciesFacts">
                    <span>{species.matureHeight.toFixed(1)} × {species.matureWidth.toFixed(1)} m</span>
                    <span>Abstand {species.recommendedSpacing.toFixed(2)} m</span>
                    <span>Wasser {species.waterNeed}/5</span>
                    <span>{species.light.join(' · ')}</span>
                    <span>Zone {species.hardinessMin}–{species.hardinessMax}</span>
                    <span>{species.evergreen?'immergrün':'laubabwerfend'}</span>
                  </div>

                  <p>{species.notes}</p>
                  <button className="btn primary" onClick={()=>choosePlantSpecies(species)}>Im Plan platzieren</button>
                </article>
              ))}
              {!filteredPlantCatalog.length && <div className="hint">Keine Pflanze entspricht den gewählten Filtern.</div>}
            </div>

            <h2 style={{marginTop:14}}>Pflanzenwachstum</h2>

            <div className="plantGrowthPanel">
              <div className="kpis">
                <div className="kpi"><small>Jahr</small><strong>{growthYear}</strong></div>
                <div className="kpi"><small>Pflanzen</small><strong>{projectPlants.length}</strong></div>
                <div className="kpi"><small>Ø Entwicklung</small><strong>{Math.round(averagePlantGrowthProgress*100)} %</strong></div>
              </div>

              <div className="growthYearButtons">
                {[0,1,3,5,10,15,20].map(year=>(
                  <button
                    key={year}
                    className={`pill ${growthYear===year?'active':''}`}
                    onClick={()=>setGrowthYear(year)}
                  >
                    Jahr {year}
                  </button>
                ))}
              </div>

              <label>
                Freies Entwicklungsjahr
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={growthYear}
                  onChange={e=>setGrowthYear(Number(e.target.value))}
                />
                <span>{growthYear} Jahre</span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={showMaturePlantOutline}
                  onChange={e=>setShowMaturePlantOutline(e.target.checked)}
                />
                Endgröße im 2D-Plan als Umriss anzeigen
              </label>

              <div className="growthStageSummary">
                {Object.entries(plantGrowthSummary).map(([stage,count])=>(
                  <span key={stage}>{stage}: {count}</span>
                ))}
                {!projectPlants.length && <span>Noch keine konkreten Pflanzenarten platziert.</span>}
              </div>

              <div className="grid2">
                <button
                  className={`btn ${growthTimelineMode==='year'?'primary':''}`}
                  onClick={()=>setGrowthTimelineMode('year')}
                >
                  Einzeljahr
                </button>
                <button
                  className={`btn ${growthTimelineMode==='compare'?'primary':''}`}
                  onClick={()=>setGrowthTimelineMode('compare')}
                >
                  Vergleich
                </button>
              </div>

              {growthTimelineMode==='compare' && (
                <div className="grid2">
                  <label>Vergleich A
                    <select value={growthCompareYearA} onChange={e=>setGrowthCompareYearA(Number(e.target.value))}>
                      {[0,1,3,5,10,15,20,30].map(year=><option key={year} value={year}>Jahr {year}</option>)}
                    </select>
                  </label>
                  <label>Vergleich B
                    <select value={growthCompareYearB} onChange={e=>setGrowthCompareYearB(Number(e.target.value))}>
                      {[0,1,3,5,10,15,20,30].map(year=><option key={year} value={year}>Jahr {year}</option>)}
                    </select>
                  </label>
                </div>
              )}

              {growthTimelineMode==='compare' && projectPlants.length>0 && (
                <div className="growthCompareGrid">
                  <div className="item">
                    <strong>Jahr {growthCompareYearA}</strong>
                    <span>Ø {Math.round(projectPlants.reduce((sum,plant)=>sum+currentPlantDimensions(plant,growthCompareYearA).progress,0)/projectPlants.length*100)} % Entwicklung</span>
                  </div>
                  <div className="item">
                    <strong>Jahr {growthCompareYearB}</strong>
                    <span>Ø {Math.round(projectPlants.reduce((sum,plant)=>sum+currentPlantDimensions(plant,growthCompareYearB).progress,0)/projectPlants.length*100)} % Entwicklung</span>
                  </div>
                </div>
              )}

              <div className="hint">
                Wachstum wird aus Endgröße, Pflanzgröße, Kategorie und Wachstumsgeschwindigkeit abgeleitet.
              </div>
            </div>

            <h2 style={{marginTop:14}}>Standort- und Pflanzprüfungen</h2>

            <div className="plantCheckList">
              {plantChecks.map(check=>(
                <button
                  key={check.id}
                  className={`plantCheck ${check.severity}`}
                  onClick={()=>{const firstId=check.objectIds[0];if(firstId)selectObject(firstId,false);}}
                >
                  <strong>{check.title}</strong>
                  <span>{check.message}</span>
                </button>
              ))}
              {!plantChecks.length && <div className="hint">Keine automatischen Konflikte erkannt.</div>}
            </div>

            <div className="hint" style={{marginTop:10}}>
              Die hinterlegten Pflanzenwerte sind editierbare Planungsrichtwerte. Standort, Sorte, Mikroklima und Pflege können die tatsächliche Entwicklung verändern.
            </div>
          </>
        )}

        {tab === 'water' && (
          <>
            <h2>Wasser und Entwässerung</h2>

            <div className="grid2">
              <button className={`tool ${tool==='pool'?'active':''}`} onClick={()=>setTool('pool')}>Pool</button>
              <button className={`tool ${tool==='pond'?'active':''}`} onClick={()=>setTool('pond')}>Teich</button>
              <button className={`tool ${tool==='irrigation'?'active':''}`} onClick={()=>setTool('irrigation')}>Bewässerung setzen</button>
              <button className={`tool ${tool==='drainage'?'active':''}`} onClick={()=>setTool('drainage')}>Drainage</button>
              <button className={`tool ${tool==='depression'?'active':''}`} onClick={()=>setTool('depression')}>Retentionsmulde</button>
            </div>

            <div className="kpis" style={{marginTop:10}}>
              <div className="kpi"><small>Regner/Tropfer</small><strong>{irrigationEmitters.length}</strong></div>
              <div className="kpi"><small>Auto-Leitungen</small><strong>{irrigationPipes.filter(pipe=>pipe.autoRouted).length}</strong></div>
              <div className="kpi"><small>Tiefpunkte</small><strong>{lowPoints.length || terrainBlobs.filter(b=>b.height<0).length}</strong></div>
              <div className="kpi"><small>Rückhalt grob</small><strong>{(retentionCells.length ? retentionVolumeEstimate : Math.max(0,(stats.cut*0.65))).toFixed(1)} m³</strong></div>
            </div>

            <div className="irrigationPanel">
              <h3>Smart Irrigation</h3>

              <div className="grid2">
                <label>Aktive Zone
                  <select value={activeIrrigationZoneId} onChange={e=>setActiveIrrigationZoneId(e.target.value)}>
                    {irrigationZones.map(zone=><option key={zone.id} value={zone.id}>{zone.name}</option>)}
                  </select>
                </label>
                <button className="btn primary" onClick={addIrrigationZone}>Zone hinzufügen</button>
              </div>

              <div className="irrigationZoneList">
                {irrigationZones.map(zone=>{
                  const stat=irrigationZoneStats.find(item=>item.zone.id===zone.id);
                  return (
                    <div key={zone.id} className={`irrigationZoneCard ${activeIrrigationZoneId===zone.id?'active':''}`}>
                      <button className="irrigationZoneHeader" onClick={()=>setActiveIrrigationZoneId(zone.id)}>
                        <span className="zoneDot" style={{background:zone.color}}></span>
                        <strong>{zone.name}</strong>
                        <span>{stat?.count || 0} Verbraucher · {(stat?.flow || 0).toFixed(1)} l/min</span>
                      </button>

                      <div className="grid2">
                        <label>Name<input value={zone.name} onChange={e=>updateIrrigationZone(zone.id,{name:e.target.value})}/></label>
                        <label>Typ<select value={zone.emitterType} onChange={e=>updateIrrigationZone(zone.id,{emitterType:e.target.value as 'sprinkler'|'drip'})}>
                          <option value="sprinkler">Regner</option>
                          <option value="drip">Tropfbewässerung</option>
                        </select></label>
                        <label>Max. Durchfluss l/min<input type="number" step="1" min="1" value={zone.maxFlowLMin} onChange={e=>updateIrrigationZone(zone.id,{maxFlowLMin:Number(e.target.value)})}/></label>
                        <label>Zieldruck bar<input type="number" step="0.1" min="0.5" value={zone.targetPressureBar} onChange={e=>updateIrrigationZone(zone.id,{targetPressureBar:Number(e.target.value)})}/></label>
                      </div>

                      {irrigationZones.length>1 && (
                        <button className="btn danger" onClick={()=>deleteIrrigationZone(zone.id)}>Zone löschen</button>
                      )}
                    </div>
                  );
                })}
              </div>

              {irrigationZones.find(zone=>zone.id===activeIrrigationZoneId)?.emitterType==='sprinkler' ? (
                <div className="grid3">
                  <label>Reichweite<input type="number" min="0.5" step="0.25" value={defaultSprinklerRadius} onChange={e=>setDefaultSprinklerRadius(Number(e.target.value))}/></label>
                  <label>Sektor °<input type="number" min="15" max="360" step="15" value={defaultSprinklerArc} onChange={e=>setDefaultSprinklerArc(Number(e.target.value))}/></label>
                  <label>Durchfluss l/min<input type="number" min="0.5" step="0.5" value={defaultSprinklerFlow} onChange={e=>setDefaultSprinklerFlow(Number(e.target.value))}/></label>
                </div>
              ) : (
                <label>Tropf-Wirkbereich<input type="number" min="0.2" step="0.1" value={defaultDripRadius} onChange={e=>setDefaultDripRadius(Number(e.target.value))}/></label>
              )}

              <div className="grid2">
                <button className="btn primary" onClick={()=>setTool('irrigation')}>Verbraucher im Plan setzen</button>
                <button className="btn blue" onClick={autoRouteIrrigationPipes}>Leitungen automatisch routen</button>
                <button className="btn" onClick={clearAutoRoutedIrrigationPipes}>Auto-Leitungen löschen</button>
              </div>

              <div className="grid2">
                <label><input type="checkbox" checked={showIrrigationCoverage2D} onChange={e=>setShowIrrigationCoverage2D(e.target.checked)}/> Reichweiten anzeigen</label>
                <label><input type="checkbox" checked={showIrrigationPipes2D} onChange={e=>setShowIrrigationPipes2D(e.target.checked)}/> Leitungen anzeigen</label>
              </div>

              <div className="item">
                <strong>Wasseranschluss</strong>
                <span>X {irrigationSourcePoint.x.toFixed(2)} · Y {irrigationSourcePoint.y.toFixed(2)}</span>
              </div>
              <div className="grid2">
                <label>Anschluss X<input type="number" step="0.1" value={irrigationSourcePoint.x} onChange={e=>setIrrigationSourcePoint({...irrigationSourcePoint,x:Number(e.target.value)})}/></label>
                <label>Anschluss Y<input type="number" step="0.1" value={irrigationSourcePoint.y} onChange={e=>setIrrigationSourcePoint({...irrigationSourcePoint,y:Number(e.target.value)})}/></label>
              </div>

              <h3>Prüfungen</h3>
              <div className="plantCheckList">
                {irrigationChecks.map(check=>(
                  <button
                    key={check.id}
                    className={`plantCheck ${check.severity}`}
                    onClick={()=>{const first=check.objectIds[0];if(first)selectObject(first,false);}}
                  >
                    <strong>{check.title}</strong>
                    <span>{check.message}</span>
                  </button>
                ))}
                {!irrigationChecks.length && <div className="hint">Keine Bewässerungskonflikte erkannt.</div>}
              </div>
            </div>

            <div className="waterAnalysisPanel">
              <h3>Abfluss- und Gefälleanalyse</h3>
              <div className="grid2">
                <button className="btn primary" disabled={waterAnalysisBusy} onClick={runWaterFlowAnalysis}>
                  {waterAnalysisBusy ? 'Analyse läuft …' : 'Fließanalyse berechnen'}
                </button>
                <button className="btn" disabled={!flowVectors.length && !lowPoints.length} onClick={clearWaterFlowAnalysis}>
                  Analyse ausblenden
                </button>
              </div>

              <div className="waterKpis">
                <div className="item"><strong>Ø Gefälle</strong><span>{runoffAverageSlope ? runoffAverageSlope.toFixed(2) : '—'} %</span></div>
                <div className="item"><strong>Max. Gefälle</strong><span>{runoffMaxSlope ? runoffMaxSlope.toFixed(2) : '—'} %</span></div>
                <div className="item"><strong>Hauptrichtung</strong><span>{dominantRunoffDirection}</span></div>
                <div className="item"><strong>Retentionspotenzial</strong><span>{retentionVolumeEstimate ? retentionVolumeEstimate.toFixed(1) : '—'} m³</span></div>
              </div>

              <label><input type="checkbox" checked={showFlowOverlay2D} onChange={e=>setShowFlowOverlay2D(e.target.checked)} /> Fließrichtungen anzeigen</label>
              <label><input type="checkbox" checked={showLowPoints2D} onChange={e=>setShowLowPoints2D(e.target.checked)} /> Tiefpunkte anzeigen</label>
              <label><input type="checkbox" checked={showRetentionOverlay2D} onChange={e=>setShowRetentionOverlay2D(e.target.checked)} /> Retentionszellen anzeigen</label>
            </div>
          </>
        )}

        {tab === 'climate' && (
          <>
            <h2>Sonne, Schatten und Simulation</h2>

            <div className="kpis">
              <div className="kpi"><small>Azimut</small><strong>{sunAzimuth.toFixed(0)}°</strong></div>
              <div className="kpi"><small>Sonnenhöhe</small><strong>{sunElevation.toFixed(1)}°</strong></div>
              <div className="kpi"><small>Ø Sonne</small><strong>{sunHoursGrid.length?sunHoursSummary.average.toFixed(1):'—'} h</strong></div>
              <div className="kpi"><small>Performance</small><strong>{performanceMode}</strong></div>
            </div>

            <div className="form">
              <label>Jahreszeit
                <select value={season} onChange={e=>setSeason(e.target.value as any)}>
                  <option>Frühling</option>
                  <option>Sommer</option>
                  <option>Herbst</option>
                  <option>Winter</option>
                </select>
              </label>

              <label>
                <input type="checkbox" checked={sunAutoPosition} onChange={e=>setSunAutoPosition(e.target.checked)}/>
                Sonnenstand aus Datum, Uhrzeit und Breitengrad berechnen
              </label>

              <div className="grid3">
                <label>Datum
                  <input type="date" value={sunAnalysisDate} onChange={e=>setSunAnalysisDate(e.target.value)}/>
                </label>
                <label>Uhrzeit
                  <input type="number" min="0" max="23.75" step="0.25" value={sunAnalysisHour} onChange={e=>setSunAnalysisHour(Number(e.target.value))}/>
                </label>
                <label>Breitengrad
                  <input type="number" min="-66" max="66" step="0.1" value={sunLatitude} onChange={e=>setSunLatitude(Number(e.target.value))}/>
                </label>
              </div>

              {!sunAutoPosition && (
                <>
                  <label>Sonnenrichtung °
                    <input type="range" min="0" max="360" value={sunAzimuth} onChange={e=>setSunAzimuth(Number(e.target.value))}/>
                    <span>{sunAzimuth}°</span>
                  </label>
                  <label>Sonnenhöhe °
                    <input type="range" min="1" max="85" value={sunElevation} onChange={e=>setSunElevation(Number(e.target.value))}/>
                    <span>{sunElevation}°</span>
                  </label>
                </>
              )}

              <label>Performance-Modus
                <select value={performanceMode} onChange={e=>setPerformanceMode(e.target.value as PerformanceMode)}>
                  <option value="auto">Auto</option>
                  <option value="quality">Qualität</option>
                  <option value="balanced">Ausgewogen</option>
                  <option value="fast">Schnell</option>
                </select>
              </label>

              <label>Kamera
                <select value={cameraMode} onChange={e=>setCameraMode(e.target.value as any)}>
                  <option value="orbit">Orbit</option>
                  <option value="walk">Begehen</option>
                  <option value="top">Draufsicht</option>
                </select>
              </label>

              <label><input type="checkbox" checked={showShadowOverlay2D} onChange={e=>setShowShadowOverlay2D(e.target.checked)}/> Aktuellen Schatten im 2D-Plan anzeigen</label>
              <label><input type="checkbox" checked={enable3DShadows} onChange={e=>setEnable3DShadows(e.target.checked)}/> Echte 3D-Schatten aktivieren</label>
              <label><input type="checkbox" checked={nightMode} onChange={e=>setNightMode(e.target.checked)}/> Nachtmodus</label>
              <label><input type="checkbox" checked={showContours} onChange={e=>setShowContours(e.target.checked)}/> 3D-Höhenlinien</label>
              <label><input type="checkbox" checked={showGrid3D} onChange={e=>setShowGrid3D(e.target.checked)}/> 3D-Raster</label>
            </div>

            <div className="grid2">
              <button className="btn primary" disabled={sunAnalysisBusy} onClick={runSunHoursAnalysis}>
                {sunAnalysisBusy?'Analyse läuft …':'Sonnenstunden berechnen'}
              </button>
              <button className="btn" disabled={!sunHoursGrid.length} onClick={clearSunHoursAnalysis}>
                Analyse ausblenden
              </button>
            </div>

            {sunHoursGrid.length>0 && (
              <div className="sunHoursSummary">
                <div className="item"><strong>Minimum</strong><span>{sunHoursSummary.min.toFixed(1)} h</span></div>
                <div className="item"><strong>Durchschnitt</strong><span>{sunHoursSummary.average.toFixed(1)} h</span></div>
                <div className="item"><strong>Maximum</strong><span>{sunHoursSummary.max.toFixed(1)} h</span></div>
              </div>
            )}

            <div className="hint" style={{marginTop:10}}>
              Die Sonnenstundenanalyse tastet den Plan zwischen 08:00 und 18:00 Uhr stündlich ab. Gebäude, Mauern, Pergolen und Pflanzen werden als Schattengeber berücksichtigt.
            </div>

            <h2 style={{marginTop:14}}>Pflanzenentwicklung</h2>
            <div className="grid2">
              {[0,1,3,5,10,15,20].map(y=><button key={y} className={`btn ${growthYear===y?'active':''}`} onClick={()=>setGrowthYear(y)}>{y===0?'heute':y+' Jahre'}</button>)}
            </div>
          </>
        )}

        {tab === 'scene' && (
          <>
            <h2>3D-Szene und importierte Modelle</h2>
            <div className="list">
              <div className="item"><strong>Importierte 3D-Modelle</strong><span>{importedModels.length} Modell(e)</span></div>
            </div>
            <a className="btn primary" style={{display:'block',marginTop:10,textAlign:'center',textDecoration:'none'}} href="/video-to-3d">Neues Video-3D-Modell erzeugen</a>
            <div className="importedModelList" style={{marginTop:10}}>
              {importedModels.map(model => (
                <button key={model.id} className={`item importedModelItem ${selectedImportedModelId===model.id?'active':''}`} onClick={()=>{setSelectedImportedModelId(model.id);setView('3d');setStatus(`${model.name} ausgewählt.`);}}>
                  <strong>{model.name}</strong><span>{model.width.toFixed(2)} × {model.height.toFixed(2)} m</span>
                </button>
              ))}
              {!importedModels.length && <div className="hint">Noch kein Video-3D-Modell übernommen.</div>}
            </div>
          </>
        )}

        {tab === 'reports' && (
          <>
            <h2>Finaler Projektbericht</h2>

            <div className="kpis">
              <div className="kpi"><small>Positionen</small><strong>{quantityLines.length}</strong></div>
              <div className="kpi"><small>Gesamtschätzung</small><strong>{formatEuro(projectGrandTotal)}</strong></div>
              <div className="kpi"><small>Budget</small><strong>{formatEuro(projectInfo.budget)}</strong></div>
              <div className="kpi"><small>Qualität</small><strong>{projectAudit?`${projectAudit.score}/100`:'—'}</strong></div>
            </div>

            <div className="budgetProgressPanel">
              <div className="item"><strong>Budgetauslastung</strong><span>{budgetUsagePercent.toFixed(1)} %</span></div>
              <div className="budgetTrack"><i style={{width:`${Math.min(100,budgetUsagePercent)}%`}} className={budgetUsagePercent>100?'over':''}/></div>
              <div className="item"><strong>{budgetDifference>=0?'Budgetreserve':'Überschreitung'}</strong><span>{formatEuro(Math.abs(budgetDifference))}</span></div>
            </div>

            <div className="grid2" style={{marginTop:10}}>
              <button className="btn primary" onClick={exportQuantityCsv}>Mengen + Kosten CSV</button>
              <button className="btn blue" onClick={exportCsvReport}>Objektbericht CSV</button>
              <button className="btn" onClick={exportHtmlReport}>HTML-Bericht herunterladen</button>
              <button className="btn primary" onClick={openPrintableReport}>Druckansicht / PDF</button>
            </div>

            <h2 style={{marginTop:14}}>Kosten nach Kategorie</h2>
            <div className="finalCostList">
              {costGroups.map(group=>(
                <div className="finalCostRow" key={group.category}>
                  <span>{group.category}<small>{group.lines} Position(en)</small></span>
                  <strong>{formatEuro(group.total)}</strong>
                </div>
              ))}
            </div>

            <h2 style={{marginTop:14}}>Mengenübersicht</h2>
            <div className="quantityTableWrap">
              <table className="quantityTable">
                <thead><tr><th>Kategorie</th><th>Position</th><th>Einheit</th><th>Menge</th><th>Gesamt</th></tr></thead>
                <tbody>
                  {quantityLines.map(line=>(
                    <tr key={line.id}>
                      <td>{line.category}</td><td>{line.name}</td><td>{line.unit}</td><td>{line.quantity.toFixed(2)}</td><td>{formatEuro(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="hint" style={{marginTop:10}}>
              Die Druckansicht ist für A4 aufbereitet und kann über den Browser-Druckdialog als PDF gespeichert werden. Mengen und Kosten sind Planungsansätze und vor Ausführung fachlich zu prüfen.
            </div>
          </>
        )}

        {tab === 'materials' && (
          <>
            <h2>Materialien und Oberflächen</h2>

            <div className="kpis">
              <div className="kpi"><small>Materialien</small><strong>{MATERIAL_LIBRARY.length}</strong></div>
              <div className="kpi"><small>Verwendet</small><strong>{materialUsageStats.length}</strong></div>
              <div className="kpi"><small>Auswahl</small><strong>{selectedObjectIds.length}</strong></div>
            </div>

            <div className="materialFilterPanel">
              <label>Suche
                <input value={materialSearch} onChange={e=>setMaterialSearch(e.target.value)} placeholder="Material suchen"/>
              </label>
              <label>Kategorie
                <select value={materialCategoryFilter} onChange={e=>setMaterialCategoryFilter(e.target.value as 'all'|MaterialCategory)}>
                  <option value="all">Alle</option>
                  <option value="stone">Naturstein</option>
                  <option value="wood">Holz</option>
                  <option value="concrete">Beton</option>
                  <option value="metal">Metall</option>
                  <option value="glass">Glas</option>
                  <option value="plaster">Putz</option>
                  <option value="paving">Pflaster</option>
                  <option value="gravel">Kies/Splitt</option>
                  <option value="soil">Boden</option>
                  <option value="water">Wasser</option>
                </select>
              </label>
            </div>

            <div className="materialLibraryGrid">
              {filteredMaterialLibrary.map(material=>(
                <article key={material.id} className={`materialCard ${selectedMaterialId===material.id?'active':''}`}>
                  <button className="materialSwatch" style={{background:material.baseColor}} onClick={()=>setSelectedMaterialId(material.id)} aria-label={material.name}></button>
                  <div className="materialCardBody">
                    <strong>{material.name}</strong>
                    <span>{material.category} · Rauheit {material.roughness.toFixed(2)} · Metall {material.metalness.toFixed(2)}</span>
                    <p>{material.description}</p>
                    <div className="materialTags">
                      <span>{material.texturePattern}</span>
                      <span>{material.unitCostM2.toFixed(0)} €/m²</span>
                    </div>
                  </div>
                  <button className="btn primary" onClick={()=>applyMaterialToSelectedObjects(material.id)} disabled={!selectedObjectIds.length}>
                    Auf Auswahl anwenden
                  </button>
                </article>
              ))}
            </div>

            <h2 style={{marginTop:14}}>Verwendung im Projekt</h2>
            <div className="materialUsageList">
              {materialUsageStats.map(item=>(
                <div className="item" key={item.material.id}>
                  <strong>{item.material.name}</strong>
                  <span>{item.count} Objekt(e)</span>
                </div>
              ))}
              {!materialUsageStats.length && <div className="hint">Noch keine Materialien zugeordnet.</div>}
            </div>

            <div className="hint" style={{marginTop:10}}>
              Die 3D-Texturen werden prozedural im Browser erzeugt. Dadurch werden keine externen Texturbilder benötigt und das Projekt bleibt portabel.
            </div>
          </>
        )}

        {tab === 'layers' && (
          <>
            <h2>Layerverwaltung</h2>
            {Object.keys(layers).map(key => (
              <div className="item" key={key} style={{marginBottom:8}}>
                <strong>{key}</strong>
                <label><input type="checkbox" checked={(layers as any)[key]} onChange={e=>setLayers({...layers,[key]:e.target.checked})}/> sichtbar</label>
                <label><input type="checkbox" checked={(lockedLayers as any)[key]} onChange={e=>setLockedLayers({...lockedLayers,[key]:e.target.checked})}/> gesperrt</label>
              </div>
            ))}
          </>
        )}

        {tab === 'costs' && (
          <>
            <h2>Mengen und Kosten</h2>
            <div className="kpis">
              <div className="kpi"><small>Gesamtschätzung</small><strong>{formatEuro(projectGrandTotal)}</strong></div>
              <div className="kpi"><small>Budget</small><strong>{formatEuro(projectInfo.budget)}</strong></div>
              <div className="kpi"><small>Auslastung</small><strong>{budgetUsagePercent.toFixed(1)} %</strong></div>
              <div className="kpi"><small>{budgetDifference>=0?'Reserve':'Über Budget'}</small><strong>{formatEuro(Math.abs(budgetDifference))}</strong></div>
            </div>

            <div className="finalCostList" style={{marginTop:10}}>
              {costGroups.map(group=>(
                <div className="finalCostRow" key={group.category}>
                  <span>{group.category}<small>{group.lines} Position(en)</small></span>
                  <strong>{formatEuro(group.total)}</strong>
                </div>
              ))}
            </div>

            <button className="btn primary" style={{marginTop:10}} onClick={exportQuantityCsv}>Mengen- und Kostenliste exportieren</button>
          </>
        )}

        {tab === 'analysis' && (
          <>
            <h2>Projektprüfung und Qualität</h2>

            <div className="grid2">
              <button className="btn primary" disabled={auditBusy} onClick={runProjectAudit}>
                {auditBusy?'Prüfung läuft …':'Projekt automatisch prüfen'}
              </button>
              <button className="btn blue" disabled={!projectAudit} onClick={applySafeAuditFixes}>
                Sichere Optimierungen anwenden
              </button>
            </div>

            {projectAudit ? (
              <>
                <div className="auditScoreCard">
                  <div className="auditGrade">{projectAudit.grade}</div>
                  <div>
                    <strong>{projectAudit.score}/100</strong>
                    <span>Gesamtqualität</span>
                  </div>
                </div>

                <div className="auditCategoryGrid">
                  {(Object.entries(projectAudit.categoryScores) as [string,number][]).map(([category,score])=>(
                    <div className="auditCategory" key={category}>
                      <span>{category}</span>
                      <strong>{Math.round(score)}</strong>
                      <div className="auditBar"><i style={{width:`${score}%`}}/></div>
                    </div>
                  ))}
                </div>

                <h2 style={{marginTop:14}}>Konflikte und Hinweise</h2>
                <div className="auditIssueList">
                  {projectAudit.issues.map(issue=>(
                    <button
                      key={issue.id}
                      className={`auditIssue ${issue.severity}`}
                      onClick={()=>{const first=issue.objectIds[0];if(first)selectObject(first,false);}}
                    >
                      <strong>{issue.title}</strong>
                      <span>{issue.message}</span>
                      <small>{issue.category} · {issue.fixable?'automatisch teilweise behebbar':'manuell prüfen'}</small>
                    </button>
                  ))}
                  {!projectAudit.issues.length && <div className="hint">Keine Konflikte erkannt.</div>}
                </div>

                <h2 style={{marginTop:14}}>Stärken</h2>
                <div className="list">
                  {projectAudit.strengths.map((strength,index)=><div className="item" key={index}><strong>✓</strong><span>{strength}</span></div>)}
                </div>

                <h2 style={{marginTop:14}}>Empfehlungen</h2>
                <div className="list">
                  {projectAudit.recommendations.map((recommendation,index)=><div className="item" key={index}><strong>{index+1}.</strong><span>{recommendation}</span></div>)}
                </div>
              </>
            ) : (
              <div className="hint" style={{marginTop:10}}>
                Die Prüfung bewertet Geometrie, Gelände, Bepflanzung, Wasser, Sonne, Materialien, Budget und Architektur.
              </div>
            )}

            <h2 style={{marginTop:14}}>Bestehende Kennzahlen</h2>
            <div className="kpis">
              <div className="kpi"><small>Geländeformen</small><strong>{terrainBlobs.length}</strong></div>
              <div className="kpi"><small>Objekte</small><strong>{objects.length}</strong></div>
              <div className="kpi"><small>Zonen</small><strong>{zones.length}</strong></div>
              <div className="kpi"><small>Grünfläche</small><strong>{metrics.greenArea} m²</strong></div>
            </div>
          </>
        )}

        {tab === 'agents' && (
          <>
            <h2>Mehragenten-KI</h2>
            <div className="list">
              {['Landschaftsplaner','Botaniker','Kostenkalkulator','Bewässerungsexperte','Architekturagent','Nachhaltigkeitsagent','Lichtplaner','Geländemodellierer','Ausschreibungsagent'].map((agent,i)=><div className="item" key={agent}><strong>{agent}</strong><span>{i===0?'Layout und Flächen':i===1?'Pflanzen, Abstände, Standort':i===2?'Mengen und Kosten':i===3?'Wasserbedarf und Zonen':i===4?'Gebäude und Gartenarchitektur':'CO₂, Regenwasser und Biodiversität'}</span></div>)}
            </div>
          </>
        )}

        {tab === 'export' && (
          <>
            <h2>Export</h2>
            <div className="grid2">
              <button className="btn blue" onClick={exportProject}>Projekt .algreen</button>
              <button className="btn primary" onClick={exportQuantityCsv}>Mengen/Kosten CSV</button>
              <button className="btn" onClick={exportHtmlReport}>Projektbericht HTML</button>
              <button className="btn" onClick={openPrintableReport}>Druckansicht / PDF</button>
            </div>
          </>
        )}
      </aside>

      <div className="workspace">
        <div className="topbar">
          <span className="pill brandPill">V0.32 AI COPILOT</span>
          <span className="pill">Terrain {terrainBlobs.length}</span>
          <span className="pill">Zonen {zones.length}</span>
          <span className="pill">Objekte {objects.length}</span>
          <label className="compactControl">Raster <select value={gridSize} onChange={e=>setGridSize(Number(e.target.value))}><option value={0.01}>1 cm</option><option value={0.05}>5 cm</option><option value={0.1}>10 cm</option><option value={0.25}>25 cm</option><option value={0.5}>50 cm</option><option value={1}>1 m</option></select></label>
          <button className={`pill ${snapEnabled?'active':''}`} onClick={()=>setSnapEnabled(v=>!v)}>Fang {snapEnabled?'AN':'AUS'}</button>
          <label className="compactControl">Geschoss <select value={activeLevel} onChange={e=>setActiveLevel(Number(e.target.value))}>{[...levels].sort((a,b)=>a.elevation-b.elevation).map(level=><option key={level.id} value={level.id}>{level.name}</option>)}</select></label>
          <span className="pill">Auswahl {selectedObjectIds.length}</span>
          <button className={`pill ${autosaveEnabled?'active':''}`} onClick={()=>setAutosaveEnabled(v=>!v)}>Autosave {autosaveEnabled?'AN':'AUS'}</button>
          <label className="compactControl">Leistung <select value={performanceMode} onChange={e=>setPerformanceMode(e.target.value as PerformanceMode)}><option value="auto">Auto</option><option value="quality">Qualität</option><option value="balanced">Ausgewogen</option><option value="fast">Schnell</option></select></label>
          <span className="pill">Speicher {autosaveState==='saving'?'…':autosaveState==='saved'?'✓':autosaveState==='error'?'!':'bereit'}</span>
          <button className="pill" disabled={selectedObjectIds.length<2} onClick={groupSelected}>Gruppieren</button>
          <button className="pill" disabled={!selectedObjectIds.length} onClick={duplicateSelected}>Duplizieren</button>
          <button className={`pill ${view==='2d'?'active':''}`} onClick={()=>setView('2d')}>2D</button>
          <button className={`pill ${view==='3d'?'active':''}`} onClick={()=>setView('3d')}>3D</button>
          <button className={`pill ${view==='splitVertical'?'active':''}`} onClick={()=>setView('splitVertical')}>Split ↔</button>
          <button className={`pill ${view==='splitHorizontal'?'active':''}`} onClick={()=>setView('splitHorizontal')}>Split ↕</button>
          <button className="pill presentationTrigger" onClick={()=>startPresentation('overview')}>Präsentation</button>
        </div>
        <div className="canvasWrap">
          {presentationMode && (
            <div className="presentationToolbar">
              <div className="presentationBrand">
                <div className="miniLogo">AL</div>
                <div><strong>{projectInfo.name}</strong><span>{presentationCaption}</span></div>
              </div>
              <div className="presentationActions">
                <button className={presentationPreset==='overview'?'active':''} onClick={()=>startPresentation('overview')}>Übersicht</button>
                <button className={presentationPreset==='day'?'active':''} onClick={()=>startPresentation('day')}>Tag</button>
                <button className={presentationPreset==='night'?'active':''} onClick={()=>startPresentation('night')}>Nacht</button>
                <button className={presentationPreset==='growth10'?'active':''} onClick={()=>startPresentation('growth10')}>Jahr 10</button>
                <button className="close" onClick={exitPresentation}>Präsentation beenden</button>
              </div>
            </div>
          )}
          {view === '2d' ? (
            <svg
              ref={svgRef}
              className="canvas"
              viewBox={`${VIEWBOX.x * SCALE} ${VIEWBOX.y * SCALE} ${VIEWBOX.width * SCALE} ${VIEWBOX.height * SCALE}`}
              onClick={handleCanvasClick}
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              onPointerCancel={handleSvgPointerUp}
              onContextMenu={handleContextMenu}
            >
              <defs>
                {layers.terrain && terrainBlobs.map(blob => (
                  <radialGradient id={`g-${blob.id}`} key={blob.id}>
                    <stop offset="0%" stopColor={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stopOpacity="0.85" />
                    <stop offset="45%" stopColor={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stopOpacity="0.24" />
                    <stop offset="100%" stopColor={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stopOpacity="0" />
                  </radialGradient>
                ))}
              </defs>
              <Grid />
              {tab==='climate' && showSunHoursHeatmap && sunHoursGrid.map((cell,index)=>{
                const ratio=cell.sampleCount?cell.sunHours/cell.sampleCount:0;
                const hue=Math.round(ratio*120);
                return (
                  <rect
                    key={`sun-cell-${index}`}
                    x={cell.x*SCALE}
                    y={cell.y*SCALE}
                    width={cell.width*SCALE}
                    height={cell.height*SCALE}
                    fill={`hsl(${hue} 72% 48%)`}
                    fillOpacity="0.24"
                    stroke="none"
                    pointerEvents="none"
                  />
                );
              })}

              {tab==='climate' && showShadowOverlay2D && currentShadowPolygons.map(item=>(
                <polygon
                  key={`shadow-${item.id}`}
                  points={item.polygon.map(point=>`${point.x*SCALE},${point.y*SCALE}`).join(' ')}
                  fill="#334155"
                  fillOpacity="0.22"
                  stroke="#475569"
                  strokeOpacity="0.26"
                  strokeWidth="1"
                  pointerEvents="none"
                />
              ))}

              {tab==='water' && showIrrigationCoverage2D && irrigationEmitters.map(emitter=>{
                const radius=Math.max(0.1,emitter.irrigationRadius || 2.5);
                const arc=clamp(emitter.irrigationArc || 360,15,360);
                const zone=irrigationZones.find(item=>item.id===emitter.irrigationZoneId);
                return arc>=359.9 ? (
                  <circle
                    key={`coverage-${emitter.id}`}
                    cx={emitter.x*SCALE}
                    cy={emitter.y*SCALE}
                    r={radius*SCALE}
                    fill={zone?.color || '#be123c'}
                    fillOpacity={emitter.emitterType==='drip'?0.12:0.08}
                    stroke={zone?.color || '#be123c'}
                    strokeDasharray="7 5"
                    strokeWidth="1.4"
                    pointerEvents="none"
                  />
                ) : (
                  <path
                    key={`coverage-${emitter.id}`}
                    d={irrigationArcPath(emitter.x,emitter.y,radius,arc,emitter.rotation || 0)}
                    fill={zone?.color || '#be123c'}
                    fillOpacity="0.09"
                    stroke={zone?.color || '#be123c'}
                    strokeDasharray="7 5"
                    strokeWidth="1.4"
                    pointerEvents="none"
                  />
                );
              })}

              {tab==='water' && showIrrigationPipes2D && irrigationPipes.map(pipe=>(
                <path
                  key={`irrigation-pipe-${pipe.id}`}
                  d={svgPathForPolyline(absolutePolyline(pipe),false)}
                  fill="none"
                  stroke={irrigationZones.find(zone=>zone.id===pipe.irrigationZoneId)?.color || '#9f1239'}
                  strokeWidth="4"
                  strokeOpacity="0.72"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              ))}

              {tab==='water' && (
                <g pointerEvents="none">
                  <circle cx={irrigationSourcePoint.x*SCALE} cy={irrigationSourcePoint.y*SCALE} r="8" fill="#fff1f2" stroke="#881337" strokeWidth="3"/>
                  <text x={irrigationSourcePoint.x*SCALE+10} y={irrigationSourcePoint.y*SCALE-10} fontSize="11" fill="#6b1024" paintOrder="stroke" stroke="#fff" strokeWidth="4">Wasseranschluss</text>
                </g>
              )}

              {tab==='water' && showRetentionOverlay2D && retentionCells.map((cell,index)=>(
                <rect
                  key={`retention-${index}`}
                  x={cell.x*SCALE}
                  y={cell.y*SCALE}
                  width={cell.width*SCALE}
                  height={cell.height*SCALE}
                  fill="#7f1d1d"
                  fillOpacity="0.14"
                  stroke="#9f1239"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  pointerEvents="none"
                />
              ))}

              {tab==='water' && showFlowOverlay2D && flowVectors.map((vector,index)=>(
                <g key={`flow-${index}`} pointerEvents="none">
                  <line
                    x1={vector.x*SCALE}
                    y1={vector.y*SCALE}
                    x2={vector.toX*SCALE}
                    y2={vector.toY*SCALE}
                    stroke="#9f1239"
                    strokeWidth="2"
                    strokeOpacity="0.7"
                  />
                  <circle cx={vector.toX*SCALE} cy={vector.toY*SCALE} r="2.5" fill="#be123c" />
                </g>
              ))}

              {tab==='water' && showLowPoints2D && lowPoints.map((point,index)=>(
                <g key={`low-${index}`} pointerEvents="none">
                  <circle cx={point.x*SCALE} cy={point.y*SCALE} r="8" fill="#fef2f2" stroke="#881337" strokeWidth="2"/>
                  <text x={point.x*SCALE+10} y={point.y*SCALE-10} fontSize="11" fill="#7f1d1d" paintOrder="stroke" stroke="#fff" strokeWidth="4">
                    Tiefpunkt {point.z.toFixed(2)} m
                  </text>
                </g>
              ))}

              {tab==='climate' && (
                <g pointerEvents="none">
                  <line
                    x1={-9*SCALE}
                    y1={-5.7*SCALE}
                    x2={(-9+Math.sin(degToRad(sunAzimuth))*1.4)*SCALE}
                    y2={(-5.7-Math.cos(degToRad(sunAzimuth))*1.4)*SCALE}
                    stroke="#f59e0b"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <circle cx={-9*SCALE} cy={-5.7*SCALE} r="8" fill="#fbbf24" stroke="#fff" strokeWidth="2"/>
                  <text x={-8.7*SCALE} y={-5.85*SCALE} fontSize="11" fill="#92400e" paintOrder="stroke" stroke="#fff" strokeWidth="4">
                    Sonne {sunElevation.toFixed(0)}°
                  </text>
                </g>
              )}

              {tab==='hardscape' && hardscapeDraftPoints.length>0 && (
                <g pointerEvents="none">
                  <path
                    d={svgPathForPolyline(hardscapeDraftPoints, hardscapeDraftType==='path' && smartPathCurve)}
                    fill="none"
                    stroke={hardscapeDraftType==='path'?'#0284c7':'#475569'}
                    strokeWidth={(hardscapeDraftType==='path'?smartPathWidth:gardenWallThickness)*SCALE}
                    strokeOpacity="0.42"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {hardscapeDraftPoints.map((point,index)=>(
                    <g key={`draft-hardscape-${index}`}>
                      <circle cx={point.x*SCALE} cy={point.y*SCALE} r="6" fill="#ffffff" stroke="#0ea5e9" strokeWidth="2"/>
                      <text x={point.x*SCALE+9} y={point.y*SCALE-8} fontSize="10" fill="#0f172a" paintOrder="stroke" stroke="#fff" strokeWidth="4">{index+1}</text>
                    </g>
                  ))}
                </g>
              )}

              {tab==='hardscape' && stairDraftStart && (
                <g pointerEvents="none">
                  <circle cx={stairDraftStart.x*SCALE} cy={stairDraftStart.y*SCALE} r="8" fill="#ffffff" stroke="#f59e0b" strokeWidth="3"/>
                  <text x={stairDraftStart.x*SCALE+10} y={stairDraftStart.y*SCALE-10} fontSize="11" fill="#92400e" paintOrder="stroke" stroke="#fff" strokeWidth="4">Treppenstart</text>
                </g>
              )}

              {showTerrainContours2D && contourSegments2D.map((segment,index)=>(
                <line
                  key={`contour-${segment.level}-${index}`}
                  x1={segment.x1*SCALE}
                  y1={segment.y1*SCALE}
                  x2={segment.x2*SCALE}
                  y2={segment.y2*SCALE}
                  stroke={activeTerrainSurface==='existing'?'#64748b':'#0284c7'}
                  strokeWidth="1"
                  opacity="0.72"
                  pointerEvents="none"
                />
              ))}

              {elevationPoints
                .filter(point=>point.kind===activeTerrainSurface)
                .map(point=>(
                  <g key={`elevation-${point.id}`} pointerEvents="none">
                    <circle
                      cx={point.x*SCALE}
                      cy={point.y*SCALE}
                      r="6"
                      fill={point.kind==='existing'?'#ffffff':'#dbeafe'}
                      stroke={point.kind==='existing'?'#334155':'#0284c7'}
                      strokeWidth="2"
                    />
                    <text
                      x={point.x*SCALE+9}
                      y={point.y*SCALE-8}
                      fontSize="10"
                      fill="#0f172a"
                      paintOrder="stroke"
                      stroke="#ffffff"
                      strokeWidth="4"
                    >
                      {point.elevation.toFixed(2)} m
                    </text>
                  </g>
                ))}
              {objects.filter(isWallObject).flatMap(wall =>
                wallEndpoints(wall).map((endpoint,index)=>(
                  <circle
                    key={`wall-node-${wall.id}-${index}`}
                    cx={endpoint.x*SCALE}
                    cy={endpoint.y*SCALE}
                    r="4"
                    fill="#ffffff"
                    stroke="#64748b"
                    strokeWidth="1.5"
                    pointerEvents="none"
                  />
                ))
              )}
              {wallDraftStart && (tool==='wall' || tool==='interiorWall') && (
                <>
                  <circle cx={wallDraftStart.x*SCALE} cy={wallDraftStart.y*SCALE} r="7" fill="#ffffff" stroke={tool==='wall'?'#0f172a':'#64748b'} strokeWidth="3" pointerEvents="none"/>
                  <text x={wallDraftStart.x*SCALE} y={wallDraftStart.y*SCALE-12} textAnchor="middle" fontSize="11" fill="#0f172a" paintOrder="stroke" stroke="#ffffff" strokeWidth="4" pointerEvents="none">Startpunkt</text>
                </>
              )}
              {image && imageApplied && <image href={image.dataUrl} x={-10 * SCALE} y={-6.5 * SCALE} width={20 * SCALE} height={13 * SCALE} opacity={imageOpacity} preserveAspectRatio={imageFit==='contain'?'xMidYMid meet':'none'} pointerEvents="none" />}

              {layers.zones && zones.map(zone => (
                <g key={zone.id} onClick={(e)=>{e.stopPropagation(); setSelection('zone', zone.id, `${zone.name} ausgewählt.`);}} onPointerDown={(e)=>start2DDrag(e,'zone',zone.id,zone.x,zone.y,zone.name)}>
                  <rect x={(zone.x - zone.width/2) * SCALE} y={(zone.y - zone.depth/2) * SCALE} width={zone.width * SCALE} height={zone.depth * SCALE} fill={zone.color} fillOpacity="0.42" stroke={selectedKind==='zone' && selectedId===zone.id ? '#f59e0b':'#334155'} strokeWidth={selectedKind==='zone' && selectedId===zone.id ? 3 : 1.5} rx="6" />
                  <text x={zone.x * SCALE} y={zone.y * SCALE} fontSize="12" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{zone.name}</text>
                </g>
              ))}

              {terrainBlobs.map(blob => (
                <g key={blob.id} onClick={(e)=>{e.stopPropagation(); setSelection('terrain', blob.id, `${blob.name} ausgewählt.`);}} onPointerDown={(e)=>start2DDrag(e,'terrain',blob.id,blob.x,blob.y,blob.name)}>
                  <circle cx={blob.x * SCALE} cy={blob.y * SCALE} r={blob.radius * SCALE * blob.softness} fill={`url(#g-${blob.id})`} />
                  {showContours && [0.35,0.55,0.75,0.95].map(level=><circle key={level} cx={blob.x*SCALE} cy={blob.y*SCALE} r={blob.radius*SCALE*blob.softness*level} fill="none" stroke={blob.height>=0?'#4d7c0f':'#2563eb'} strokeOpacity="0.32" strokeWidth="1"/>) }
                  <circle cx={blob.x * SCALE} cy={blob.y * SCALE} r={Math.max(6, blob.radius * SCALE * 0.25)} fill={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stroke={selectedKind==='terrain' && selectedId===blob.id ? '#f59e0b' : '#ffffff'} strokeWidth={selectedKind==='terrain' && selectedId===blob.id ? 3 : 1.5} />
                </g>
              ))}

              {visibleRoomsForPlan.map(room => {
                const center = polygonCentroid(room.points);
                return (
                  <g key={`room-${room.id}`} onClick={(e)=>{e.stopPropagation();setSelection('room',room.id,`${room.name} ausgewählt.`);}}>
                    <polygon
                      points={room.points.map(point=>`${point.x*SCALE},${point.y*SCALE}`).join(' ')}
                      fill={room.color}
                      fillOpacity={selectedRoomId===room.id?0.5:0.24}
                      stroke={selectedRoomId===room.id?'#f59e0b':'#64748b'}
                      strokeWidth={selectedRoomId===room.id?3:1.3}
                    />
                    <text x={center.x*SCALE} y={center.y*SCALE} textAnchor="middle" fontSize="12" fill="#0f172a" paintOrder="stroke" stroke="#ffffff" strokeWidth="4">
                      {room.name} · {room.area.toFixed(1)} m²
                    </text>
                  </g>
                );
              })}

              {visibleObjectsForPlan.filter(obj => (layers as any)[objectLayer(obj)]).map(obj => (
                <GardenObject2D
                  key={obj.id}
                  obj={obj}
                  openings={isWallObject(obj) ? objects.filter(opening => opening.parentId===obj.id && isOpeningObject(opening)) : []}
                  selected={selectedKind==='object' && selectedObjectIds.includes(obj.id)}
                  growthYear={growthYear}
                  showMaturePlantOutline={showMaturePlantOutline}
                  onClick={(e)=>{e.stopPropagation(); selectObject(obj.id,e.shiftKey||e.metaKey||e.ctrlKey);}}
                  onPointerDown={(e)=>start2DDrag(e,'object',obj.id,obj.x,obj.y,obj.name)}
                />
              ))}
              {snapGuides?.x !== undefined && <line x1={snapGuides.x*SCALE} y1={VIEWBOX.y*SCALE} x2={snapGuides.x*SCALE} y2={(VIEWBOX.y+VIEWBOX.height)*SCALE} stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="8 5" pointerEvents="none"/>}
              {snapGuides?.y !== undefined && <line x1={VIEWBOX.x*SCALE} y1={snapGuides.y*SCALE} x2={(VIEWBOX.x+VIEWBOX.width)*SCALE} y2={snapGuides.y*SCALE} stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="8 5" pointerEvents="none"/>}
              {selectedObject && selectedObjectIds.length===1 && <ObjectTransformHandles obj={selectedObject} onScaleStart={startScaleObject} onRotateStart={startRotateObject}/>}
            </svg>
          ) : view === '3d' ? (
            <Terrain3D terrainBlobs={terrainBlobs} elevationPoints={elevationPoints} zones={zones} objects={objects} levels={levels} rooms={rooms} importedModels={importedModels} selectedImportedModelId={selectedImportedModelId} selectedId={selectedId} selectedKind={selectedKind} nightMode={nightMode} growthYear={growthYear} season={season} sunAzimuth={sunAzimuth} sunElevation={sunElevation} showContours={showContours} showGrid3D={showGrid3D} enableShadows={enable3DShadows} performanceMode={performanceMode} cameraMode={cameraMode} onObjectMove={(id, x, y) => {
              setObjects(v => v.map(o => o.id === id ? { ...o, x: snapValue(x), y: snapValue(y) } : o));
            }} onObjectSelect={(id) => {
              const obj = objects.find(o => o.id === id);
              if (obj) {
                setSelectedImportedModelId(null);
                setSelection('object', id, `${obj.name} in 3D ausgewählt.`);
              }
            }} onImportedModelSelect={(id) => {
              setSelectedImportedModelId(id);
              setSelectedObjectIds([]);
              setSelectedKind(null);
              setSelectedId(null);
              setStatus('Importiertes Video-3D-Modell ausgewählt.');
            }} onStatus={setStatus} />
          ) : (
            <div className={`splitWorkspace ${view==='splitHorizontal'?'horizontal':''}`}>
              <div className="splitPane">
                <PlanOverview2D terrainBlobs={terrainBlobs} zones={zones} objects={visibleObjectsForPlan} rooms={visibleRoomsForPlan} selectedRoomId={selectedRoomId} selectedId={selectedId} selectedKind={selectedKind} />
              </div>
              <div className="splitPane">
                <Terrain3D terrainBlobs={terrainBlobs} elevationPoints={elevationPoints} zones={zones} objects={objects} levels={levels} rooms={rooms} importedModels={importedModels} selectedImportedModelId={selectedImportedModelId} selectedId={selectedId} selectedKind={selectedKind} nightMode={nightMode} growthYear={growthYear} season={season} sunAzimuth={sunAzimuth} sunElevation={sunElevation} showContours={showContours} showGrid3D={showGrid3D} enableShadows={enable3DShadows} performanceMode={performanceMode} cameraMode={cameraMode} onObjectMove={(id, x, y) => {
                  setObjects(v => v.map(o => o.id === id ? { ...o, x: snapValue(x), y: snapValue(y) } : o));
                }} onObjectSelect={(id) => {
              const obj = objects.find(o => o.id === id);
              if (obj) {
                setSelectedImportedModelId(null);
                setSelection('object', id, `${obj.name} in 3D ausgewählt.`);
              }
            }} onImportedModelSelect={(id) => {
              setSelectedImportedModelId(id);
              setSelectedObjectIds([]);
              setSelectedKind(null);
              setSelectedId(null);
              setStatus('Importiertes Video-3D-Modell ausgewählt.');
            }} onStatus={setStatus} />
              </div>
            </div>
          )}
        </div>
        <div className="status"><span>{status}</span><span>Auftrag {stats.fill.toFixed(1)} m³ · Abtrag {stats.cut.toFixed(1)} m³</span></div>
      </div>

      <aside className="panel">
        <h2>Projekt-Kennzahlen</h2>
        <div className="kpis">
          <div className="kpi"><small>Auftrag</small><strong>{stats.fill.toFixed(1)} m³</strong></div>
          <div className="kpi"><small>Abtrag</small><strong>{stats.cut.toFixed(1)} m³</strong></div>
          <div className="kpi"><small>Versiegelt</small><strong>{metrics.sealed}%</strong></div>
          <div className="kpi"><small>Pflanzenobjekte</small><strong>{metrics.plantCount}</strong></div>
          <div className="kpi"><small>Grünfläche</small><strong>{metrics.greenArea.toFixed(1)} m²</strong></div>
          <div className="kpi"><small>Biodiversität</small><strong>{metrics.biodiversity}/100</strong></div>
        </div>

        <hr />
        <h2>Eigenschaften</h2>
        {selectedBlob && (
          <div className="form">
            <label>Name<input value={selectedBlob.name} onChange={e=>setTerrainBlobs(v=>v.map(b=>b.id===selectedBlob.id?{...b,name:e.target.value}:b))} /></label>
            <label>X<input type="number" step="0.1" value={selectedBlob.x} onChange={e=>setTerrainBlobs(v=>v.map(b=>b.id===selectedBlob.id?{...b,x:Number(e.target.value)}:b))} /></label>
            <label>Y<input type="number" step="0.1" value={selectedBlob.y} onChange={e=>setTerrainBlobs(v=>v.map(b=>b.id===selectedBlob.id?{...b,y:Number(e.target.value)}:b))} /></label>
            <label>Radius<input type="number" step="0.1" value={selectedBlob.radius} onChange={e=>setTerrainBlobs(v=>v.map(b=>b.id===selectedBlob.id?{...b,radius:Number(e.target.value)}:b))} /></label>
            <label>Höhe / Tiefe<input type="number" step="0.05" value={selectedBlob.height} onChange={e=>setTerrainBlobs(v=>v.map(b=>b.id===selectedBlob.id?{...b,height:Number(e.target.value)}:b))} /></label>
            <label>Weichheit<input type="number" step="0.05" value={selectedBlob.softness} onChange={e=>setTerrainBlobs(v=>v.map(b=>b.id===selectedBlob.id?{...b,softness:Number(e.target.value)}:b))} /></label>
            <button className="btn danger" onClick={()=>{ setTerrainBlobs(v=>v.filter(b=>b.id!==selectedBlob.id)); setSelection(null,null,'Terrain-Form gelöscht.'); }}>Löschen</button>
          </div>
        )}
        {selectedZone && (
          <div className="form">
            <label>Name<input value={selectedZone.name} onChange={e=>setZones(v=>v.map(z=>z.id===selectedZone.id?{...z,name:e.target.value}:z))} /></label>
            <label>X<input type="number" step="0.1" value={selectedZone.x} onChange={e=>setZones(v=>v.map(z=>z.id===selectedZone.id?{...z,x:Number(e.target.value)}:z))} /></label>
            <label>Y<input type="number" step="0.1" value={selectedZone.y} onChange={e=>setZones(v=>v.map(z=>z.id===selectedZone.id?{...z,y:Number(e.target.value)}:z))} /></label>
            <label>Breite<input type="number" step="0.1" value={selectedZone.width} onChange={e=>setZones(v=>v.map(z=>z.id===selectedZone.id?{...z,width:Number(e.target.value)}:z))} /></label>
            <label>Tiefe<input type="number" step="0.1" value={selectedZone.depth} onChange={e=>setZones(v=>v.map(z=>z.id===selectedZone.id?{...z,depth:Number(e.target.value)}:z))} /></label>
            <button className="btn danger" onClick={()=>{ setZones(v=>v.filter(z=>z.id!==selectedZone.id)); setSelection(null,null,'Zone gelöscht.'); }}>Zone löschen</button>
          </div>
        )}
        {selectedRoom && (
          <div className="form roomProperties">
            <h2>Raum</h2>
            <label>Name<input value={selectedRoom.name} onChange={e=>renameRoom(selectedRoom.id,e.target.value)}/></label>
            <label>Geschoss<select value={selectedRoom.level} onChange={e=>setRooms(current=>current.map(room=>room.id===selectedRoom.id?{...room,level:Number(e.target.value)}:room))}>{levels.map(level=><option key={level.id} value={level.id}>{level.name}</option>)}</select></label>
            <label>Fläche<input value={`${selectedRoom.area.toFixed(2)} m²`} readOnly/></label>
            <label>Farbe<input type="color" value={selectedRoom.color} onChange={e=>setRooms(current=>current.map(room=>room.id===selectedRoom.id?{...room,color:e.target.value}:room))}/></label>
            <div className="hint">Quelle: {selectedRoom.source==='auto'?'automatisch aus geschlossenen Wandzügen':'manuell'}</div>
            <button className="btn danger" onClick={()=>deleteRoom(selectedRoom.id)}>Raum löschen</button>
          </div>
        )}

        {selectedObjectIds.length > 1 && (
          <div className="cadSelectionPanel">
            <h2>Mehrfachauswahl</h2>
            <div className="kpis">
              <div className="kpi"><small>Objekte</small><strong>{selectedObjectIds.length}</strong></div>
              <div className="kpi"><small>Gruppen</small><strong>{new Set(selectedObjects.map(o=>o.groupId).filter(Boolean)).size}</strong></div>
            </div>
            <div className="grid3" style={{marginTop:8}}>
              <button className="tool" onClick={()=>alignSelected('left')}>Links</button>
              <button className="tool" onClick={()=>alignSelected('centerX')}>Mitte X</button>
              <button className="tool" onClick={()=>alignSelected('right')}>Rechts</button>
              <button className="tool" onClick={()=>alignSelected('top')}>Oben</button>
              <button className="tool" onClick={()=>alignSelected('centerY')}>Mitte Y</button>
              <button className="tool" onClick={()=>alignSelected('bottom')}>Unten</button>
            </div>
            <div className="grid2" style={{marginTop:8}}>
              <button className="btn primary" onClick={groupSelected}>Gruppieren</button>
              <button className="btn" onClick={ungroupSelected}>Gruppierung lösen</button>
              <button className="btn blue" onClick={duplicateSelected}>Duplizieren</button>
              <button className="btn danger" onClick={deleteSelection}>Auswahl löschen</button>
            </div>
          </div>
        )}
        {selectedImportedModel && (
          <div className="form importedModelProperties">
            <h2>Importiertes 3D-Modell</h2>
            <label>Name<input value={selectedImportedModel.name} onChange={e=>updateImportedModel(selectedImportedModel.id,{name:e.target.value})}/></label>
            <label>Position X<input type="number" step="0.1" value={selectedImportedModel.x} onChange={e=>updateImportedModel(selectedImportedModel.id,{x:Number(e.target.value)})}/></label>
            <label>Höhe Y<input type="number" step="0.1" value={selectedImportedModel.y} onChange={e=>updateImportedModel(selectedImportedModel.id,{y:Number(e.target.value)})}/></label>
            <label>Position Z<input type="number" step="0.1" value={selectedImportedModel.z} onChange={e=>updateImportedModel(selectedImportedModel.id,{z:Number(e.target.value)})}/></label>
            <label>Drehung Y°<input type="number" step="1" value={selectedImportedModel.rotationY} onChange={e=>updateImportedModel(selectedImportedModel.id,{rotationY:Number(e.target.value)})}/></label>
            <label>Maßstab<input type="number" min="0.01" step="0.05" value={selectedImportedModel.scale} onChange={e=>updateImportedModel(selectedImportedModel.id,{scale:Math.max(0.01,Number(e.target.value)||1)})}/></label>
            <label>Transparenz<input type="range" min="0.1" max="1" step="0.05" value={selectedImportedModel.opacity} onChange={e=>updateImportedModel(selectedImportedModel.id,{opacity:Number(e.target.value)})}/><span>{Math.round(selectedImportedModel.opacity*100)}%</span></label>
            <label><input type="checkbox" checked={selectedImportedModel.visible} onChange={e=>updateImportedModel(selectedImportedModel.id,{visible:e.target.checked})}/> Sichtbar</label>
            <div className="grid2">
              <button className="btn" onClick={()=>updateImportedModel(selectedImportedModel.id,{x:0,y:0,z:0,rotationY:0,scale:1})}>Zurücksetzen</button>
              <button className="btn blue" onClick={()=>duplicateImportedModel(selectedImportedModel.id)}>Duplizieren</button>
              <button className="btn danger" onClick={()=>deleteImportedModel(selectedImportedModel.id)}>Löschen</button>
            </div>
            <div className="hint">Das Modell ist Bestandteil deiner 3D-Szene. Position, Höhe, Drehung und Maßstab können hier eingestellt werden.</div>
          </div>
        )}

        {selectedObject && (
          <div className="form">
            <label>Name<input value={selectedObject.name} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,name:e.target.value}:o))} /></label>
            <label>Typ<select value={selectedObject.type} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,type:e.target.value as GardenObjectType}:o))}><option>building</option><option>pool</option><option>pond</option><option>pergola</option><option>wall</option><option>fence</option><option>gate</option><option>stairs</option><option>path</option><option>tree</option><option>shrub</option><option>hedge</option><option>planter</option><option>bench</option><option>light</option><option>firepit</option><option>rock</option><option>irrigation</option><option>drainage</option><option>floor</option><option>interiorWall</option><option>roof</option><option>window</option><option>door</option><option>slidingDoor</option><option>balcony</option><option>railing</option><option>column</option><option>carport</option><option>winterGarden</option></select></label>
            <label>X<input type="number" step="0.1" value={selectedObject.x} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,x:Number(e.target.value)}:o))} /></label>
            <label>Y<input type="number" step="0.1" value={selectedObject.y} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,y:Number(e.target.value)}:o))} /></label>
            <label>Breite<input type="number" step="0.1" value={selectedObject.width} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,width:Number(e.target.value)}:o))} /></label>
            <label>Tiefe<input type="number" step="0.1" value={selectedObject.depth} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,depth:Number(e.target.value)}:o))} /></label>
            <label>Höhe<input type="number" step="0.1" value={selectedObject.height} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,height:Number(e.target.value)}:o))} /></label>
            <label>Drehung °<input type="number" step="1" value={selectedObject.rotation} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,rotation:Number(e.target.value)}:o))} /></label>
            <label>Material
              <select
                value={selectedObject.materialId || defaultMaterialIdForObject(selectedObject) || ''}
                onChange={e=>applyMaterialToObject(selectedObject.id,e.target.value)}
              >
                <option value="">Kein Bibliotheksmaterial</option>
                {MATERIAL_LIBRARY.map(material=><option key={material.id} value={material.id}>{material.name}</option>)}
              </select>
            </label>

            {selectedObject.materialId && (
              <div className="objectMaterialPanel">
                <div className="grid2">
                  <label>Textur-Skalierung
                    <input type="number" min="0.2" max="8" step="0.1" value={selectedObject.textureScale || materialDefinitionById(selectedObject.materialId)?.textureScale || 1} onChange={e=>setObjects(current=>current.map(object=>object.id===selectedObject.id?{...object,textureScale:Number(e.target.value)}:object))}/>
                  </label>
                  <label>Rauheit
                    <input type="number" min="0" max="1" step="0.05" value={selectedObject.roughnessOverride ?? materialDefinitionById(selectedObject.materialId)?.roughness ?? 0.8} onChange={e=>setObjects(current=>current.map(object=>object.id===selectedObject.id?{...object,roughnessOverride:Number(e.target.value)}:object))}/>
                  </label>
                  <label>Metallanteil
                    <input type="number" min="0" max="1" step="0.05" value={selectedObject.metalnessOverride ?? materialDefinitionById(selectedObject.materialId)?.metalness ?? 0} onChange={e=>setObjects(current=>current.map(object=>object.id===selectedObject.id?{...object,metalnessOverride:Number(e.target.value)}:object))}/>
                  </label>
                </div>

                {['path','floor','stairs','gardenWall'].includes(selectedObject.type) && (
                  <>
                    <h3>Oberflächenaufbau</h3>
                    <div className="surfaceLayerList">
                      {(selectedObject.surfaceLayers || []).map((layer,index)=>(
                        <div className="surfaceLayerCard" key={layer.id}>
                          <strong>Schicht {index+1}</strong>
                          <input value={layer.name} onChange={e=>updateSurfaceLayer(selectedObject.id,layer.id,{name:e.target.value})}/>
                          <div className="grid2">
                            <label>Dicke mm<input type="number" min="1" step="5" value={layer.thicknessMm} onChange={e=>updateSurfaceLayer(selectedObject.id,layer.id,{thicknessMm:Number(e.target.value)})}/></label>
                            <label>Material<select value={layer.materialId} onChange={e=>updateSurfaceLayer(selectedObject.id,layer.id,{materialId:e.target.value})}>{MATERIAL_LIBRARY.map(material=><option key={material.id} value={material.id}>{material.name}</option>)}</select></label>
                          </div>
                          <button className="btn danger" onClick={()=>deleteSurfaceLayer(selectedObject.id,layer.id)}>Schicht löschen</button>
                        </div>
                      ))}
                    </div>
                    <button className="btn" onClick={()=>addSurfaceLayer(selectedObject.id)}>Schicht hinzufügen</button>
                    <div className="item">
                      <strong>Gesamtdicke</strong>
                      <span>{(selectedObject.surfaceLayers || []).reduce((sum,layer)=>sum+layer.thicknessMm,0)} mm</span>
                    </div>
                  </>
                )}
              </div>
            )}
            {['building','floor','wall','interiorWall','roof','window','door','slidingDoor','balcony','railing','column','carport','winterGarden'].includes(selectedObject.type) && <>
              <label>Ebene / Geschoss<select value={Number(selectedObject.level||0)} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,level:Number(e.target.value)}:o))}>{levels.map(level=><option key={level.id} value={level.id}>{level.name} · {level.elevation.toFixed(2)} m</option>)}</select></label>
              <label>Dicke / Stärke<input type="number" step="0.01" value={Number(selectedObject.thickness||selectedObject.depth||0.2)} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,thickness:Number(e.target.value)}:o))}/></label>
              <label>Untertyp / Dachform<input value={selectedObject.subtype||''} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,subtype:e.target.value}:o))}/></label>
            </>}
            <label>Kostenansatz<input type="number" step="1" value={Number(selectedObject.unitCost||0)} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,unitCost:Number(e.target.value)}:o))} /></label>
            {selectedObject.type==='irrigation' && selectedObject.emitterType && (
              <div className="smartHardscapeProperties">
                <h3>Bewässerung</h3>
                <label>Zone<select value={selectedObject.irrigationZoneId || ''} onChange={e=>setObjects(current=>current.map(object=>object.id===selectedObject.id?{...object,irrigationZoneId:e.target.value,color:irrigationZones.find(zone=>zone.id===e.target.value)?.color || object.color}:object))}>
                  {irrigationZones.map(zone=><option key={zone.id} value={zone.id}>{zone.name}</option>)}
                </select></label>
                <label>Typ<select value={selectedObject.emitterType} onChange={e=>setObjects(current=>current.map(object=>object.id===selectedObject.id?{...object,emitterType:e.target.value as 'sprinkler'|'drip'}:object))}>
                  <option value="sprinkler">Regner</option>
                  <option value="drip">Tropfbewässerung</option>
                </select></label>
                <label>Reichweite<input type="number" min="0.2" step="0.1" value={selectedObject.irrigationRadius || 1} onChange={e=>setObjects(current=>current.map(object=>object.id===selectedObject.id?{...object,irrigationRadius:Number(e.target.value)}:object))}/></label>
                {selectedObject.emitterType==='sprinkler' && <label>Sektor °<input type="number" min="15" max="360" step="15" value={selectedObject.irrigationArc || 360} onChange={e=>setObjects(current=>current.map(object=>object.id===selectedObject.id?{...object,irrigationArc:Number(e.target.value)}:object))}/></label>}
                <label>Durchfluss l/min<input type="number" min="0.1" step="0.5" value={selectedObject.irrigationFlowLMin || 1} onChange={e=>setObjects(current=>current.map(object=>object.id===selectedObject.id?{...object,irrigationFlowLMin:Number(e.target.value)}:object))}/></label>
                <label>Leitungsdurchmesser mm<input type="number" min="12" step="1" value={selectedObject.pipeDiameterMm || 20} onChange={e=>setObjects(current=>current.map(object=>object.id===selectedObject.id?{...object,pipeDiameterMm:Number(e.target.value)}:object))}/></label>
              </div>
            )}

            {selectedObject.type==='path' && selectedObject.points?.length && (
              <div className="smartHardscapeProperties">
                <h3>Intelligenter Weg</h3>
                <div className="item"><strong>Länge</strong><span>{polylineLength(selectedObject.points).toFixed(2)} m</span></div>
                <label>Wegbreite<input type="number" min="0.3" step="0.1" value={selectedObject.pathWidth || 1.2} onChange={e=>setObjects(current=>current.map(obj=>obj.id===selectedObject.id?{...obj,pathWidth:Number(e.target.value)}:obj))}/></label>
                <label>Material<input value={selectedObject.material || ''} onChange={e=>setObjects(current=>current.map(obj=>obj.id===selectedObject.id?{...obj,material:e.target.value}:obj))}/></label>
                <label><input type="checkbox" checked={!!selectedObject.curve} onChange={e=>setObjects(current=>current.map(obj=>obj.id===selectedObject.id?{...obj,curve:e.target.checked}:obj))}/> Linienzug glätten</label>
                <div className="item"><strong>Gefälle Anfang → Ende</strong><span>{selectedObject.startElevation!==undefined && selectedObject.endElevation!==undefined ? (((selectedObject.endElevation-selectedObject.startElevation)/Math.max(0.01,polylineLength(selectedObject.points)))*100).toFixed(2) : '0.00'} %</span></div>
              </div>
            )}

            {selectedObject.type==='gardenWall' && selectedObject.points?.length && (
              <div className="smartHardscapeProperties">
                <h3>Gartenmauer</h3>
                <div className="item"><strong>Länge</strong><span>{polylineLength(selectedObject.points).toFixed(2)} m</span></div>
                <label>Höhe<input type="number" min="0.2" step="0.05" value={selectedObject.height} onChange={e=>setObjects(current=>current.map(obj=>obj.id===selectedObject.id?{...obj,height:Number(e.target.value)}:obj))}/></label>
                <label>Dicke<input type="number" min="0.1" step="0.02" value={selectedObject.thickness || 0.28} onChange={e=>setObjects(current=>current.map(obj=>obj.id===selectedObject.id?{...obj,thickness:Number(e.target.value)}:obj))}/></label>
                <label>Fundamenttiefe<input type="number" min="0" step="0.05" value={selectedObject.foundationDepth || 0} onChange={e=>setObjects(current=>current.map(obj=>obj.id===selectedObject.id?{...obj,foundationDepth:Number(e.target.value)}:obj))}/></label>
              </div>
            )}

            {selectedObject.type==='stairs' && selectedObject.points?.length===2 && (
              <div className="smartHardscapeProperties">
                <h3>Intelligente Treppe</h3>
                <div className="kpis">
                  <div className="kpi"><small>Stufen</small><strong>{selectedObject.stepCount || 1}</strong></div>
                  <div className="kpi"><small>Steigung</small><strong>{(selectedObject.riserHeight || 0).toFixed(3)} m</strong></div>
                  <div className="kpi"><small>Auftritt</small><strong>{(selectedObject.treadDepth || 0).toFixed(3)} m</strong></div>
                </div>
                <label>Breite<input type="number" min="0.5" step="0.1" value={selectedObject.width} onChange={e=>setObjects(current=>current.map(obj=>obj.id===selectedObject.id?{...obj,width:Number(e.target.value)}:obj))}/></label>
                <div className="item"><strong>Höhendifferenz</strong><span>{Math.abs((selectedObject.endElevation||0)-(selectedObject.startElevation||0)).toFixed(2)} m</span></div>
              </div>
            )}

            {isOpeningObject(selectedObject) && (
              <div className="architectureOpeningPanel">
                <h3>Wandöffnung</h3>
                <div className="item">
                  <strong>Wandkopplung</strong>
                  <span>
                    {selectedObject.parentId
                      ? (objects.find(obj=>obj.id===selectedObject.parentId)?.name || `Wand ${selectedObject.parentId}`)
                      : 'Nicht gekoppelt'}
                  </span>
                </div>

                {selectedObject.parentId && (
                  <label>
                    Position entlang Wand
                    <input type="number" step="0.05" value={selectedObject.hostOffset ?? 0} onChange={e=>updateHostedOpeningOffset(selectedObject.id,Number(e.target.value))}/>
                  </label>
                )}

                {selectedObject.type==='window' && (
                  <label>
                    Brüstungshöhe
                    <input type="number" min="0" step="0.05" value={selectedObject.sillHeight ?? 0.9} onChange={e=>setObjects(current=>current.map(obj=>obj.id===selectedObject.id?{...obj,sillHeight:Number(e.target.value)}:obj))}/>
                  </label>
                )}

                <div className="grid2">
                  <button className="btn blue" onClick={()=>attachOpeningToNearestWall(selectedObject.id)}>An nächste Wand koppeln</button>
                  <button className="btn" disabled={!selectedObject.parentId} onClick={()=>detachOpening(selectedObject.id)}>Von Wand lösen</button>
                </div>
              </div>
            )}

            {nearestObjectInfo && <div className="item"><strong>Nächster Abstand</strong><span>{nearestObjectInfo.distance.toFixed(2)} m zu {nearestObjectInfo.object.name}</span></div>}
            <div className="item"><strong>Maße</strong><span>{selectedObject.width.toFixed(2)} × {selectedObject.depth.toFixed(2)} m · Fläche {(selectedObject.width*selectedObject.depth).toFixed(2)} m²</span></div>
            <div className="grid2">
              <button className="btn" onClick={()=>selectGroupOf(selectedObject.id)} disabled={!selectedObject.groupId}>Gruppe auswählen</button>
              <button className="btn" onClick={duplicateSelected}>Duplizieren</button>
              {['wall','interiorWall'].includes(selectedObject.type) && <button className="btn blue" onClick={connectSelectedWall}>Wand verbinden</button>}
            </div>

            {['tree','shrub','hedge'].includes(selectedObject.type) && (
              <div className="plantObjectProperties">
                <h3>Pflanzendaten</h3>

                {selectedObject.speciesId ? (
                  <>
                    <div className="item"><strong>{selectedObject.name}</strong><span>{selectedObject.botanicalName}</span></div>

                    <label>Art wechseln<select value={selectedObject.speciesId} onChange={e=>{
                      const species=PLANT_CATALOG.find(item=>item.id===e.target.value);
                      if(species)replacePlantSpecies(selectedObject.id,species);
                    }}>
                      {PLANT_CATALOG.map(species=><option key={species.id} value={species.id}>{species.commonName} · {species.botanicalName}</option>)}
                    </select></label>

                    <div className="grid2">
                      <div className="item"><strong>Endhöhe</strong><span>{(selectedObject.matureHeight||0).toFixed(1)} m</span></div>
                      <div className="item"><strong>Endbreite</strong><span>{(selectedObject.matureWidth||0).toFixed(1)} m</span></div>
                      <div className="item"><strong>Pflanzabstand</strong><span>{(selectedObject.recommendedSpacing||0).toFixed(2)} m</span></div>
                      <div className="item"><strong>Wuchs</strong><span>{selectedObject.growthRate||'—'}</span></div>
                    </div>

                    <label>Geplanter Standort<select value={selectedObject.siteLight||defaultPlantSiteLight} onChange={e=>setObjects(current=>current.map(object=>object.id===selectedObject.id?{...object,siteLight:e.target.value as PlantLight}:object))}>
                      <option value="Sonne">Sonne</option>
                      <option value="Halbschatten">Halbschatten</option>
                      <option value="Schatten">Schatten</option>
                    </select></label>

                    <label>Wasserbedarf<input type="number" min="1" max="5" value={Number(selectedObject.waterNeed||2)} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,waterNeed:Number(e.target.value)}:o))}/></label>

                    <div className="item"><strong>Boden</strong><span>{selectedObject.soilNeeds?.join(', ')||'—'}</span></div>
                    <div className="item"><strong>Blüte</strong><span>{selectedObject.bloomMonths?.length?selectedObject.bloomMonths.join(', '):'—'} · {selectedObject.bloomColor||'—'}</span></div>
                    <div className="item"><strong>Winterhärte</strong><span>Zone {selectedObject.hardinessMin}–{selectedObject.hardinessMax}</span></div>
                    {(() => {
                      const dims=currentPlantDimensions(selectedObject,growthYear);
                      return (
                        <div className="plantGrowthFacts">
                          <div className="item"><strong>Entwicklungsphase</strong><span>{growthStageLabel(dims.progress)}</span></div>
                          <div className="item"><strong>Größe Jahr {growthYear}</strong><span>{dims.height.toFixed(2)} × {dims.width.toFixed(2)} m</span></div>
                          <div className="item"><strong>Endgröße</strong><span>{(selectedObject.matureHeight||selectedObject.height).toFixed(2)} × {(selectedObject.matureWidth||selectedObject.width).toFixed(2)} m</span></div>
                        </div>
                      );
                    })()}

                    <div className="grid2">
                      <label>Pflanzhöhe
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={selectedObject.installationHeight ?? selectedObject.height}
                          onChange={e=>setObjects(current=>current.map(object=>object.id===selectedObject.id?{...object,installationHeight:Number(e.target.value)}:object))}
                        />
                      </label>
                      <label>Pflanzbreite
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={selectedObject.installationWidth ?? selectedObject.width}
                          onChange={e=>setObjects(current=>current.map(object=>object.id===selectedObject.id?{...object,installationWidth:Number(e.target.value)}:object))}
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="hint">Generisches Pflanzenobjekt. Eine konkrete Art kann jetzt zugeordnet werden.</div>
                    <label>Art zuordnen<select defaultValue="" onChange={e=>{
                      const species=PLANT_CATALOG.find(item=>item.id===e.target.value);
                      if(species)replacePlantSpecies(selectedObject.id,species);
                    }}>
                      <option value="" disabled>Art wählen …</option>
                      {PLANT_CATALOG.map(species=><option key={species.id} value={species.id}>{species.commonName}</option>)}
                    </select></label>
                  </>
                )}
              </div>
            )}
            <button className="btn danger" onClick={()=>{ setObjects(v=>v.filter(o=>o.id!==selectedObject.id)); setSelection(null,null,'Objekt gelöscht.'); }}>Objekt löschen</button>
          </div>
        )}
        {!selectedBlob && !selectedZone && !selectedObject && <p className="small">Objekt, Zone oder Terrain anklicken.</p>}
      </aside>

      {contextMenu && (
        <div
          className="editorContextMenu"
          style={{left:contextMenu.x,top:contextMenu.y}}
          onPointerDown={e=>e.stopPropagation()}
        >
          {contextMenu.targetKind==='object' ? (
            <>
              <button onClick={()=>{copySelectedObjects();closeContextMenu();}}>Kopieren</button>
              <button onClick={()=>{cutSelectedObjects();closeContextMenu();}}>Ausschneiden</button>
              <button onClick={()=>{duplicateSelected();closeContextMenu();}}>Duplizieren</button>
              <button onClick={()=>{deleteSelection();closeContextMenu();}}>Löschen</button>
            </>
          ) : (
            <>
              <button disabled={!editorClipboardRef.current.length} onClick={()=>{pasteObjects(contextMenu.worldX,contextMenu.worldY);closeContextMenu();}}>Hier einfügen</button>
              <button onClick={()=>{setTool('select');closeContextMenu();}}>Auswahlwerkzeug</button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function ObjectTransformHandles({ obj, onScaleStart, onRotateStart }: {
  obj: GardenObject;
  onScaleStart: (e: React.PointerEvent<SVGCircleElement>, obj: GardenObject) => void;
  onRotateStart: (e: React.PointerEvent<SVGCircleElement>, obj: GardenObject) => void;
}) {
  const halfW=Math.max(obj.width,0.12)*SCALE/2;
  const halfD=Math.max(obj.depth,0.08)*SCALE/2;
  const rotateY=-halfD-32;
  return (
    <g transform={`translate(${obj.x*SCALE},${obj.y*SCALE}) rotate(${obj.rotation})`} pointerEvents="none">
      <rect x={-halfW} y={-halfD} width={halfW*2} height={halfD*2} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="7 4"/>
      <line x1="0" y1={-halfD} x2="0" y2={rotateY} stroke="#f59e0b" strokeWidth="1.5"/>
      <circle cx="0" cy={rotateY} r="8" fill="#fff" stroke="#f59e0b" strokeWidth="3" pointerEvents="all" className="rotateHandle" onPointerDown={e=>onRotateStart(e,obj)}/>
      {[[-halfW,-halfD],[halfW,-halfD],[-halfW,halfD],[halfW,halfD]].map(([x,y],index)=><circle key={index} cx={x} cy={y} r="7" fill="#fff" stroke="#0ea5e9" strokeWidth="3" pointerEvents="all" className="scaleHandle" onPointerDown={e=>onScaleStart(e,obj)}/>)}
      <text x="0" y={halfD+20} textAnchor="middle" fontSize="11" fill="#0f172a" paintOrder="stroke" stroke="#fff" strokeWidth="4">{obj.width.toFixed(2)} × {obj.depth.toFixed(2)} m · {obj.rotation.toFixed(1)}°</text>
    </g>
  );
}

function Grid() {
  const lines = [];
  for (let x = -100; x <= 100; x += 0.5) lines.push(<line key={`vx-${x}`} x1={x * SCALE} y1={-100 * SCALE} x2={x * SCALE} y2={100 * SCALE} stroke={x % 1 === 0 ? '#d1d9e6' : '#e6edf6'} strokeWidth={x % 1 === 0 ? 1 : 0.6} />);
  for (let y = -100; y <= 100; y += 0.5) lines.push(<line key={`hy-${y}`} x1={-100 * SCALE} y1={y * SCALE} x2={100 * SCALE} y2={y * SCALE} stroke={y % 1 === 0 ? '#d1d9e6' : '#e6edf6'} strokeWidth={y % 1 === 0 ? 1 : 0.6} />);
  return <g>{lines}</g>;
}

function GardenObject2D({ obj, openings = [], selected, growthYear = 0, showMaturePlantOutline = false, onClick, onPointerDown }: { obj: GardenObject; openings?: GardenObject[]; selected: boolean; growthYear?: number; showMaturePlantOutline?: boolean; onClick: (e: React.MouseEvent<SVGGElement>) => void; onPointerDown: (e: React.PointerEvent<SVGGElement>) => void }) {
  const stroke = selected ? '#f59e0b' : '#1f2937';
  const sw = selected ? 3 : 1.5;
  const tx = obj.x * SCALE;
  const ty = obj.y * SCALE;
  const rot = obj.rotation;

  if (isWallObject(obj)) {
    const thickness = Math.max(obj.thickness || obj.depth, 0.08);
    return (
      <g onClick={onClick} onPointerDown={onPointerDown} transform={`translate(${tx},${ty}) rotate(${rot})`}>
        <rect x={(-obj.width/2)*SCALE} y={(-thickness/2)*SCALE} width={obj.width*SCALE} height={thickness*SCALE} fill={obj.color} fillOpacity={obj.type==='interiorWall'?0.72:0.92} stroke={stroke} strokeWidth={sw}/>
        {openings.map(opening => {
          const offset = wallOpeningOffset(obj, opening);
          return (
            <g key={`opening-cut-${opening.id}`}>
              <rect x={(offset-opening.width/2)*SCALE} y={(-thickness/2)*SCALE-1} width={opening.width*SCALE} height={thickness*SCALE+2} fill="#ffffff" stroke={selected ? '#f59e0b' : '#0ea5e9'} strokeWidth="1.5"/>
              <line x1={(offset-opening.width/2)*SCALE} y1={0} x2={(offset+opening.width/2)*SCALE} y2={0} stroke={opening.type==='door'?'#92400e':'#0284c7'} strokeWidth="3"/>
            </g>
          );
        })}
        <circle cx={(-obj.width/2)*SCALE} cy="0" r="4" fill="#fff" stroke="#475569" strokeWidth="1.5"/>
        <circle cx={(obj.width/2)*SCALE} cy="0" r="4" fill="#fff" stroke="#475569" strokeWidth="1.5"/>
        <text x="0" y={-thickness*SCALE/2-8} fontSize="11" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{obj.name} · {obj.width.toFixed(2)} m</text>
      </g>
    );
  }

  if (obj.type==='irrigation' && obj.emitterType) {
    return (
      <g onClick={onClick} onPointerDown={onPointerDown} transform={`translate(${tx},${ty}) rotate(${rot})`}>
        <circle cx="0" cy="0" r="8" fill={obj.color} stroke={stroke} strokeWidth={sw}/>
        {obj.emitterType==='sprinkler' ? (
          <>
            <circle cx="0" cy="0" r="3" fill="#fff"/>
            <line x1="-6" y1="0" x2="6" y2="0" stroke="#fff" strokeWidth="1.5"/>
            <line x1="0" y1="-6" x2="0" y2="6" stroke="#fff" strokeWidth="1.5"/>
          </>
        ) : <circle cx="0" cy="0" r="3.5" fill="#fff"/>}
        <text x="0" y="22" fontSize="10" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{obj.name}</text>
      </g>
    );
  }

  if ((obj.type==='path' || obj.type==='gardenWall') && obj.points?.length) {
    const localPath = svgPathForPolyline(obj.points,obj.type==='path' && !!obj.curve);
    const pathStrokeWidth = (obj.type==='path' ? (obj.pathWidth || 1) : (obj.thickness || 0.28))*SCALE;
    return (
      <g onClick={onClick} onPointerDown={onPointerDown} transform={`translate(${tx},${ty})`}>
        {obj.type==='path' ? (
          <>
            <path d={localPath} fill="none" stroke={stroke} strokeWidth={pathStrokeWidth+6} strokeLinecap="round" strokeLinejoin="round" opacity={selected?1:0.45}/>
            <path d={localPath} fill="none" stroke={obj.color} strokeWidth={pathStrokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            <path d={localPath} fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="2" strokeDasharray="12 8"/>
          </>
        ) : (
          <>
            <path d={localPath} fill="none" stroke={stroke} strokeWidth={pathStrokeWidth+5} strokeLinecap="round" strokeLinejoin="round"/>
            <path d={localPath} fill="none" stroke={obj.color} strokeWidth={pathStrokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
          </>
        )}
        {selected && obj.points.map((point,index)=><circle key={`poly-point-${index}`} cx={point.x*SCALE} cy={point.y*SCALE} r="5" fill="#fff" stroke="#f59e0b" strokeWidth="2"/>)}
        <text x="0" y="-12" fontSize="11" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="4">{obj.name} · {polylineLength(obj.points).toFixed(2)} m</text>
      </g>
    );
  }

  if (obj.type==='stairs' && obj.points?.length===2) {
    const start=obj.points[0];
    const end=obj.points[1];
    const dx=end.x-start.x;
    const dy=end.y-start.y;
    const run=Math.max(0.01,Math.hypot(dx,dy));
    const angle=Math.atan2(dy,dx)*180/Math.PI;
    const steps=Math.max(1,obj.stepCount || 1);
    return (
      <g onClick={onClick} onPointerDown={onPointerDown} transform={`translate(${tx},${ty})`}>
        <g transform={`rotate(${angle} ${(start.x+end.x)/2*SCALE} ${(start.y+end.y)/2*SCALE})`}>
          <rect x={start.x*SCALE} y={(start.y-obj.width/2)*SCALE} width={run*SCALE} height={obj.width*SCALE} fill={obj.color} fillOpacity="0.8" stroke={stroke} strokeWidth={sw}/>
          {Array.from({length:steps+1}).map((_,index)=>{
            const px=(start.x + (dx/run)*(run*index/steps))*SCALE;
            const py=start.y*SCALE;
            return <line key={index} x1={px} y1={py-obj.width*SCALE/2} x2={px} y2={py+obj.width*SCALE/2} stroke="#78716c" strokeWidth="1"/>;
          })}
        </g>
        <text x="0" y="-14" fontSize="11" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="4">{steps} Stufen</text>
      </g>
    );
  }

  if (['window','door','slidingDoor'].includes(obj.type)) {
    return (
      <g onClick={onClick} onPointerDown={onPointerDown} transform={`translate(${tx},${ty}) rotate(${rot})`}>
        <rect x={(-obj.width/2)*SCALE} y={(-Math.max(obj.depth,0.08)/2)*SCALE} width={obj.width*SCALE} height={Math.max(obj.depth,0.08)*SCALE} fill={obj.type==='door'?'#92400e':'#7dd3fc'} fillOpacity={obj.type==='door'?0.85:0.55} stroke={stroke} strokeWidth={sw}/>
        {obj.type==='door' && <path d={`M ${-obj.width/2*SCALE} 0 A ${obj.width*SCALE} ${obj.width*SCALE} 0 0 1 ${obj.width/2*SCALE} ${-obj.width*SCALE}`} fill="none" stroke="#92400e" strokeWidth="1.5"/>}
        <text x="0" y={-8} fontSize="11" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{obj.name}</text>
      </g>
    );
  }
  if (obj.type === 'roof') {
    return (
      <g onClick={onClick} onPointerDown={onPointerDown} transform={`translate(${tx},${ty}) rotate(${rot})`}>
        <rect x={(-obj.width/2)*SCALE} y={(-obj.depth/2)*SCALE} width={obj.width*SCALE} height={obj.depth*SCALE} fill={obj.color} fillOpacity="0.18" stroke={stroke} strokeDasharray="8 5" strokeWidth={sw}/>
        <line x1={0} y1={(-obj.depth/2)*SCALE} x2={0} y2={(obj.depth/2)*SCALE} stroke="#7c2d12" strokeWidth="2"/>
        <text x="0" y="0" fontSize="12" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{obj.name}</text>
      </g>
    );
  }
  if (obj.speciesId && obj.plantForm==='grass') {
    const dims=currentPlantDimensions(obj,growthYear);
    const renderWidth=dims.width;
    return (
      <g onClick={onClick} onPointerDown={onPointerDown} transform={`translate(${tx},${ty}) rotate(${rot})`}>
        <circle cx="0" cy="0" r={(renderWidth/2)*SCALE} fill={obj.color} fillOpacity="0.22" stroke={stroke} strokeWidth={sw}/>
        {Array.from({length:12}).map((_,index)=>{
          const angle=(index/12)*Math.PI*2;
          return <line key={index} x1="0" y1="0" x2={Math.cos(angle)*(renderWidth*0.28)*SCALE} y2={Math.sin(angle)*(renderWidth*0.28)*SCALE} stroke={obj.color} strokeWidth="2"/>;
        })}
        <text x="0" y={(renderWidth/2+0.28)*SCALE} fontSize="11" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{obj.name}</text>
      </g>
    );
  }

  if (obj.speciesId && obj.plantForm==='perennial') {
    const dims=currentPlantDimensions(obj,growthYear);
    const renderWidth=dims.width;
    return (
      <g onClick={onClick} onPointerDown={onPointerDown} transform={`translate(${tx},${ty}) rotate(${rot})`}>
        <circle cx="0" cy="0" r={(renderWidth/2)*SCALE} fill={obj.color} fillOpacity="0.42" stroke={stroke} strokeWidth={sw}/>
        {[[-0.18,-0.12],[0.2,-0.1],[-0.05,0.18]].map(([x,y],index)=>(
          <circle key={index} cx={x*renderWidth*SCALE} cy={y*renderWidth*SCALE} r="4" fill={obj.bloomColor?.includes('violett')?'#8b5cf6':'#f472b6'} opacity="0.9"/>
        ))}
        <text x="0" y={(renderWidth/2+0.28)*SCALE} fontSize="11" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{obj.name}</text>
      </g>
    );
  }

  if (['tree','shrub','rock','firepit','light'].includes(obj.type)) {
    const dims=obj.speciesId?currentPlantDimensions(obj,growthYear):null;
    const renderWidth=dims?.width || obj.width;
    return (
      <g onClick={onClick} onPointerDown={onPointerDown} transform={`translate(${tx},${ty}) rotate(${rot})`}>
        {obj.speciesId && showMaturePlantOutline && (
          <circle cx="0" cy="0" r={((obj.matureWidth || renderWidth)/2)*SCALE} fill="none" stroke="#16a34a" strokeDasharray="7 6" strokeWidth="1.5" opacity="0.55"/>
        )}
        <circle cx="0" cy="0" r={(renderWidth / 2) * SCALE} fill={obj.color} fillOpacity="0.85" stroke={stroke} strokeWidth={sw} />
        <text x="0" y={(renderWidth / 2 + 0.3) * SCALE} fontSize="12" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{obj.name}</text>
      </g>
    );
  }
  return (
    <g onClick={onClick} onPointerDown={onPointerDown} transform={`translate(${tx},${ty}) rotate(${rot})`}>
      <rect x={(-obj.width/2) * SCALE} y={(-obj.depth/2) * SCALE} width={obj.width * SCALE} height={obj.depth * SCALE} rx={obj.type === 'pool' ? 8 : 3} fill={obj.color} fillOpacity={obj.type === 'pool' ? 0.75 : 0.8} stroke={stroke} strokeWidth={sw} />
      <text x="0" y="0" fontSize="12" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{obj.name}</text>
    </g>
  );
}


function PlanOverview2D({
  terrainBlobs,
  zones,
  objects,
  rooms,
  selectedRoomId,
  selectedId,
  selectedKind
}: {
  terrainBlobs: TerrainBlob[];
  zones: Zone[];
  objects: GardenObject[];
  rooms: Room[];
  selectedRoomId: number | null;
  selectedId: number | null;
  selectedKind: SelectedKind;
}) {
  return (
    <svg className="canvas splitPlan" viewBox={`${VIEWBOX.x * SCALE} ${VIEWBOX.y * SCALE} ${VIEWBOX.width * SCALE} ${VIEWBOX.height * SCALE}`}>
      <defs>
        {terrainBlobs.map(blob => (
          <radialGradient id={`split-g-${blob.id}`} key={blob.id}>
            <stop offset="0%" stopColor={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stopOpacity="0.7"/>
            <stop offset="100%" stopColor={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stopOpacity="0"/>
          </radialGradient>
        ))}
      </defs>
      <Grid/>
      {rooms.map(room => {
        const center = polygonCentroid(room.points);
        return (
          <g key={`split-room-${room.id}`}>
            <polygon points={room.points.map(point=>`${point.x*SCALE},${point.y*SCALE}`).join(' ')} fill={room.color} fillOpacity={selectedRoomId===room.id?0.48:0.20} stroke={selectedRoomId===room.id?'#f59e0b':'#64748b'} strokeWidth={selectedRoomId===room.id?2.5:1}/>
            <text x={center.x*SCALE} y={center.y*SCALE} textAnchor="middle" fontSize="10" fill="#0f172a">{room.name} · {room.area.toFixed(1)} m²</text>
          </g>
        );
      })}
      {zones.map(zone => (
        <rect key={zone.id} x={(zone.x-zone.width/2)*SCALE} y={(zone.y-zone.depth/2)*SCALE} width={zone.width*SCALE} height={zone.depth*SCALE} fill={zone.color} fillOpacity="0.35" stroke={selectedKind==='zone'&&selectedId===zone.id?'#f59e0b':'#475569'} strokeWidth="1.5"/>
      ))}
      {terrainBlobs.map(blob => (
        <circle key={blob.id} cx={blob.x*SCALE} cy={blob.y*SCALE} r={blob.radius*SCALE*blob.softness} fill={`url(#split-g-${blob.id})`}/>
      ))}
      {objects.map(obj => {
        const selected = selectedKind==='object'&&selectedId===obj.id;
        if (['tree','shrub','rock','firepit','light','column'].includes(obj.type)) {
          return <circle key={obj.id} cx={obj.x*SCALE} cy={obj.y*SCALE} r={Math.max(5,obj.width*SCALE/2)} fill={obj.color} fillOpacity="0.75" stroke={selected?'#f59e0b':'#1f2937'} strokeWidth={selected?3:1.2}/>;
        }
        return <rect key={obj.id} x={(obj.x-obj.width/2)*SCALE} y={(obj.y-obj.depth/2)*SCALE} width={obj.width*SCALE} height={Math.max(obj.depth,0.08)*SCALE} fill={obj.color} fillOpacity={obj.type==='window'||obj.type==='slidingDoor'?0.42:0.62} stroke={selected?'#f59e0b':'#1f2937'} strokeWidth={selected?3:1.2} transform={`rotate(${obj.rotation} ${obj.x*SCALE} ${obj.y*SCALE})`}/>;
      })}
    </svg>
  );
}

function Terrain3D({
  terrainBlobs,
  elevationPoints,
  zones,
  objects,
  levels,
  rooms,
  importedModels,
  selectedImportedModelId,
  selectedId,
  selectedKind,
  nightMode,
  growthYear,
  season,
  sunAzimuth,
  sunElevation,
  showContours,
  showGrid3D,
  enableShadows,
  performanceMode,
  cameraMode,
  onObjectMove,
  onObjectSelect,
  onImportedModelSelect,
  onStatus
}: {
  terrainBlobs: TerrainBlob[];
  elevationPoints: ElevationPoint[];
  zones: Zone[];
  objects: GardenObject[];
  levels: BuildingLevel[];
  rooms: Room[];
  importedModels: ImportedReliefModel[];
  selectedImportedModelId: string | null;
  selectedId: number | null;
  selectedKind: SelectedKind;
  nightMode: boolean;
  growthYear: number;
  season: string;
  sunAzimuth: number;
  sunElevation: number;
  showContours: boolean;
  showGrid3D: boolean;
  enableShadows: boolean;
  performanceMode: PerformanceMode;
  cameraMode: 'orbit' | 'walk' | 'top';
  onObjectMove: (id: number, x: number, y: number) => void;
  onObjectSelect: (id: number) => void;
  onImportedModelSelect: (id: string) => void;
  onStatus: (msg: string) => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onObjectMoveRef = useRef(onObjectMove);
  const onObjectSelectRef = useRef(onObjectSelect);
  const onImportedModelSelectRef = useRef(onImportedModelSelect);
  const onStatusRef = useRef(onStatus);

  useEffect(() => {
    onObjectMoveRef.current = onObjectMove;
    onObjectSelectRef.current = onObjectSelect;
    onImportedModelSelectRef.current = onImportedModelSelect;
    onStatusRef.current = onStatus;
  }, [onObjectMove,onObjectSelect,onImportedModelSelect,onStatus]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(nightMode ? 0x0f172a : season==='Winter' ? 0xe2e8f0 : 0xeaf2fb);
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(cameraMode==='top'?0:cameraMode==='walk'?7:16, cameraMode==='top'?24:cameraMode==='walk'?2.2:13, cameraMode==='top'?0.1:cameraMode==='walk'?9:18);
    const resolvedPerformance: Exclude<PerformanceMode,'auto'> =
      performanceMode==='auto'
        ? (objects.length>90?'fast':objects.length>40?'balanced':'quality')
        : performanceMode;

    const renderer = new THREE.WebGLRenderer({
      antialias: resolvedPerformance!=='fast',
      powerPreference: 'high-performance'
    });

    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        resolvedPerformance==='quality' ? 1.75 :
        resolvedPerformance==='balanced' ? 1.35 :
        1
      )
    );

    renderer.shadowMap.enabled = enableShadows && resolvedPerformance!=='fast';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = resolvedPerformance!=='fast';
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(nightMode ? 0x9db4ff : 0xffffff, nightMode ? 0.38 : 0.82));
    const sun = new THREE.DirectionalLight(nightMode ? 0x94a3b8 : 0xffffff, nightMode ? 0.35 : 1.25);
    const az = degToRad(sunAzimuth);
    const el = degToRad(sunElevation);
    sun.position.set(Math.cos(az)*Math.cos(el)*30, Math.sin(el)*30, Math.sin(az)*Math.cos(el)*30);
    sun.castShadow = renderer.shadowMap.enabled;
    if (sun.castShadow) {
      const shadowSize = resolvedPerformance==='quality' ? 2048 : 1024;
      sun.shadow.mapSize.set(shadowSize,shadowSize);
      sun.shadow.camera.left = -22;
      sun.shadow.camera.right = 22;
      sun.shadow.camera.top = 18;
      sun.shadow.camera.bottom = -18;
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 90;
      sun.shadow.bias = -0.0008;
    }
    scene.add(sun);
    if (showGrid3D) scene.add(new THREE.GridHelper(28, 28, 0x94a3b8, nightMode ? 0x334155 : 0xd7e0eb));

    const terrainSizeX = 24;
    const terrainSizeY = 16;
    const segX = resolvedPerformance==='quality' ? 140 : resolvedPerformance==='balanced' ? 92 : 56;
    const segY = resolvedPerformance==='quality' ? 100 : resolvedPerformance==='balanced' ? 66 : 40;
    const geometry = new THREE.PlaneGeometry(terrainSizeX, terrainSizeY, segX, segY);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position;
    const colors: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i); const z = pos.getZ(i);
      const y = terrainSurfaceHeight(x, z, elevationPoints, terrainBlobs, elevationPoints.some(point=>point.kind==='proposed')?'proposed':'existing');
      pos.setY(i, y);
      const t = clamp((y + 1.2) / 2.8, 0, 1);
      const lowColor = season==='Winter' ? '#cbd5e1' : '#60a5fa'; const highColor = season==='Herbst' ? '#d97706' : season==='Winter' ? '#f8fafc' : '#84cc16'; const color = new THREE.Color().lerpColors(new THREE.Color(lowColor), new THREE.Color(highColor), t);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: false });
    const terrainMesh = new THREE.Mesh(geometry, terrainMat);
    terrainMesh.receiveShadow = renderer.shadowMap.enabled;
    scene.add(terrainMesh);
    if (showContours) scene.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometry), new THREE.LineBasicMaterial({ color: nightMode ? 0x94a3b8 : 0x64748b, transparent: true, opacity: 0.12 })));

    zones.forEach(zone => {
      const h = terrainSurfaceHeight(zone.x, zone.y, elevationPoints, terrainBlobs, elevationPoints.some(point=>point.kind==='proposed')?'proposed':'existing');
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(zone.width, zone.kind === 'hardscape' ? 0.12 : 0.05, zone.depth), new THREE.MeshStandardMaterial({ color: zone.color, transparent: true, opacity: zone.kind === 'hardscape' ? 0.92 : 0.55 }));
      mesh.position.set(zone.x, h + (zone.kind === 'hardscape' ? 0.08 : 0.03), zone.y);
      scene.add(mesh);
    });

    const importedModelGroups: { id: string; group: THREE.Group }[] = [];
    let disposed = false;

    importedModels.filter(model => model.visible).forEach(model => {
      const group = new THREE.Group();
      group.position.set(model.x, model.y, model.z);
      group.rotation.set(degToRad(model.rotationX), degToRad(model.rotationY), degToRad(model.rotationZ));
      group.scale.setScalar(model.scale);
      group.userData.importedModelId = model.id;
      scene.add(group);
      importedModelGroups.push({ id: model.id, group });

      const image = new Image();
      image.onload = () => {
        if (disposed) return;
        const w = 96;
        const h = Math.max(48, Math.round(w / Math.max(0.1, model.aspect)));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(image, 0, 0, w, h);
        const pixels = ctx.getImageData(0, 0, w, h).data;

        const geometry = new THREE.PlaneGeometry(model.width, model.height, w - 1, h - 1);
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          const xIndex = i % w;
          const yIndex = Math.floor(i / w);
          const idx = (yIndex * w + xIndex) * 4;
          const r = pixels[idx] / 255;
          const g = pixels[idx + 1] / 255;
          const b = pixels[idx + 2] / 255;
          const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const centerBias = 1 - Math.min(1, Math.hypot(xIndex / w - 0.5, yIndex / h - 0.5) * 1.1);
          positions.setZ(i, (1 - luminance) * model.depthStrength * (0.55 + centerBias * 0.45));
        }
        geometry.computeVertexNormals();

        const texture = new THREE.Texture(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.9,
          metalness: 0,
          side: THREE.DoubleSide,
          transparent: model.opacity < 1,
          opacity: model.opacity
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.03;
        mesh.userData.importedModelId = model.id;
        group.add(mesh);

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry, 24),
          new THREE.LineBasicMaterial({
            color: selectedImportedModelId === model.id ? 0xf59e0b : 0x475569,
            transparent: true,
            opacity: selectedImportedModelId === model.id ? 0.85 : 0.18
          })
        );
        mesh.add(edges);
      };
      image.src = model.imageDataUrl;
    });

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (renderer.shadowMap.enabled) {
      scene.traverse(node => {
        if (node instanceof THREE.Mesh && node !== terrainMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const objectGroups: { id: number; group: THREE.Group }[] = [];
    let draggedId: number | null = null;
    let dragOffsetX = 0;
    let dragOffsetZ = 0;
    let pendingDrag: { id: number; x: number; z: number } | null = null;

    const addEdge = (mesh: THREE.Mesh, color = 0x334155) => {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color }));
      mesh.add(edges);
    };

    rooms
      .filter(room => levels.find(level=>level.id===room.level)?.visible !== false)
      .forEach(room => {
        if (room.points.length < 3) return;
        const shape = new THREE.Shape();
        room.points.forEach((point,index)=>{
          if (index===0) shape.moveTo(point.x, point.y);
          else shape.lineTo(point.x, point.y);
        });
        shape.closePath();

        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshStandardMaterial({
          color: room.color,
          transparent: true,
          opacity: 0.38,
          side: THREE.DoubleSide,
          roughness: 0.92
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = levelElevationFor(levels, room.level) + 0.025;
        scene.add(mesh);
      });

    const sceneObjects = objects.filter(obj => {
      if (!isLevelBoundObject(obj)) return true;
      return levels.find(level=>level.id===(obj.level ?? 0))?.visible !== false;
    });

    sceneObjects.forEach(obj => {
      const baseH = terrainSurfaceHeight(obj.x, obj.y, elevationPoints, terrainBlobs, elevationPoints.some(point=>point.kind==='proposed')?'proposed':'existing');
      const levelBase = isLevelBoundObject(obj) ? levelElevationFor(levels, obj.level ?? 0) : 0;
      const group = new THREE.Group();
      group.position.set(obj.x, baseH, obj.y);
      group.rotation.y = -degToRad(obj.rotation);
      group.userData.objectId = obj.id;
      scene.add(group);
      objectGroups.push({ id: obj.id, group });

      if (obj.type === 'floor') {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(obj.width, Math.max(obj.height,0.08), obj.depth), new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.85 }));
        slab.position.y = Math.max(obj.height,0.08)/2 + levelBase;
        group.add(slab); addEdge(slab, selectedKind==='object'&&selectedId===obj.id?0xf59e0b:0x475569);
      }

      if (obj.type === 'roof') {
        if ((obj.subtype||'gable') === 'flat') {
          const roof = new THREE.Mesh(new THREE.BoxGeometry(obj.width, Math.max(obj.height,0.18), obj.depth), threeMaterialForObject(obj,obj.color));
          roof.position.y = levelBase + obj.height/2;
          group.add(roof); addEdge(roof);
        } else {
          const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(obj.width,obj.depth)*0.72, Math.max(obj.height,0.6), 4), threeMaterialForObject(obj,obj.color));
          roof.scale.z = obj.depth/Math.max(obj.width,obj.depth);
          roof.rotation.y = Math.PI/4;
          roof.position.y = levelBase + obj.height/2;
          group.add(roof);
        }
      }

      if (obj.type === 'window' || obj.type === 'slidingDoor') {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(obj.width, obj.height, Math.max(obj.depth,0.06)), new THREE.MeshStandardMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.48, metalness: 0.15, roughness: 0.2 }));
        panel.position.y = levelBase + openingSill(obj) + obj.height/2;
        group.add(panel); addEdge(panel, selectedKind==='object'&&selectedId===obj.id?0xf59e0b:0x0ea5e9);
      }

      if (obj.type === 'door') {
        const door = new THREE.Mesh(new THREE.BoxGeometry(obj.width, obj.height, Math.max(obj.depth,0.08)), threeMaterialForObject(obj,obj.color));
        door.position.y = levelBase + openingSill(obj) + obj.height/2;
        group.add(door); addEdge(door);
      }

      if (obj.type === 'balcony') {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(obj.width, Math.max(obj.height,0.14), obj.depth), threeMaterialForObject(obj,obj.color));
        slab.position.y = levelBase;
        group.add(slab); addEdge(slab);
      }

      if (obj.type === 'railing') {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(obj.width, obj.height, Math.max(obj.depth,0.06)), new THREE.MeshStandardMaterial({ color: obj.color, transparent: true, opacity: 0.72 }));
        rail.position.y = levelBase + obj.height/2;
        group.add(rail); addEdge(rail);
      }

      if (obj.type === 'column') {
        const column = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(obj.width,0.12)/2, Math.max(obj.width,0.12)/2, obj.height, 16), threeMaterialForObject(obj,obj.color));
        column.position.y = levelBase + obj.height/2;
        group.add(column);
      }

      if (obj.type === 'carport') {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(obj.width,0.18,obj.depth),new THREE.MeshStandardMaterial({color:obj.color}));
        roof.position.y=obj.height;group.add(roof);
        [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{
          const post=new THREE.Mesh(new THREE.BoxGeometry(0.14,obj.height,0.14),new THREE.MeshStandardMaterial({color:obj.color}));
          post.position.set(sx*(obj.width/2-0.12),obj.height/2,sz*(obj.depth/2-0.12));group.add(post);
        });
      }

      if (obj.type === 'winterGarden') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(obj.width,obj.height,obj.depth),new THREE.MeshStandardMaterial({color:'#bae6fd',transparent:true,opacity:0.28,metalness:0.08,roughness:0.18}));
        body.position.y=obj.height/2;group.add(body);addEdge(body,selectedKind==='object'&&selectedId===obj.id?0xf59e0b:0x0284c7);
      }

      if (obj.type === 'building') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(obj.width, obj.height, obj.depth), threeMaterialForObject(obj,obj.color));
        body.position.y = obj.height / 2;
        group.add(body);
        addEdge(body, selectedKind === 'object' && selectedId === obj.id ? 0xf59e0b : 0x475569);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(obj.width, obj.depth) * 0.75, 1.0, 4), new THREE.MeshStandardMaterial({ color: '#8b5a3c' }));
        roof.position.y = obj.height + 0.5;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);
      }
      if (obj.type === 'pool') {
        const border = new THREE.Mesh(new THREE.BoxGeometry(obj.width, 0.16, obj.depth), new THREE.MeshStandardMaterial({ color: '#d6eaf8' }));
        border.position.y = 0.08;
        group.add(border);
        addEdge(border, selectedKind === 'object' && selectedId === obj.id ? 0xf59e0b : 0x475569);
        const water = new THREE.Mesh(new THREE.BoxGeometry(obj.width * 0.9, 0.06, obj.depth * 0.9), new THREE.MeshStandardMaterial({ color: '#38bdf8', transparent: true, opacity: 0.85 }));
        water.position.y = 0.02;
        group.add(water);
      }
      if (obj.type === 'pergola') {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(obj.width, 0.16, obj.depth), threeMaterialForObject(obj,obj.color));
        roof.position.y = obj.height;
        group.add(roof);
        addEdge(roof, selectedKind === 'object' && selectedId === obj.id ? 0xf59e0b : 0x475569);
        const postPos = [[-obj.width/2+0.12,-obj.depth/2+0.12],[obj.width/2-0.12,-obj.depth/2+0.12],[-obj.width/2+0.12,obj.depth/2-0.12],[obj.width/2-0.12,obj.depth/2-0.12]];
        postPos.forEach(([x,z]) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, obj.height, 0.12), threeMaterialForObject(obj,obj.color));
          post.position.set(x, obj.height/2, z);
          group.add(post);
        });
      }
      if (obj.type === 'wall' || obj.type === 'interiorWall') {
        const openings = objects.filter(opening => opening.parentId === obj.id && isOpeningObject(opening));
        buildWallWithOpenings3D(group, obj, openings, selectedKind === 'object' && selectedId === obj.id, levelBase);
      }
      if (obj.type === 'stairs') {
        if (obj.points?.length===2) {
          const start=obj.points[0];
          const end=obj.points[1];
          const dx=end.x-start.x;
          const dz=end.y-start.y;
          const run=Math.hypot(dx,dz);
          const steps=Math.max(1,obj.stepCount || 1);
          const rise=Math.abs((obj.endElevation||obj.height)-(obj.startElevation||0));
          const lowerElevation=Math.min(obj.startElevation||0,obj.endElevation||obj.height);
          const baseOffset=lowerElevation-baseH;
          const tread=run/steps;
          const angle=Math.atan2(dx,dz);

          for (let i=0;i<steps;i++) {
            const progress=(i+0.5)/steps;
            const x=start.x+dx*progress;
            const z=start.y+dz*progress;
            const blockHeight=Math.max(0.05,(rise/steps)*(i+1));
            const step=new THREE.Mesh(
              new THREE.BoxGeometry(obj.width,blockHeight,tread*1.04),
              threeMaterialForObject(obj,obj.color,{roughness:0.9})
            );
            step.position.set(
              x,
              baseOffset + blockHeight/2,
              z
            );
            step.rotation.y=angle;
            group.add(step);
          }
        } else {
          const steps = 4;
          for (let i = 0; i < steps; i++) {
            const stepH = obj.height / steps;
            const stepD = obj.depth / steps;
            const step = new THREE.Mesh(new THREE.BoxGeometry(obj.width, stepH, stepD), threeMaterialForObject(obj,obj.color));
            step.position.set(0, stepH / 2 + i * stepH, -obj.depth / 2 + stepD / 2 + i * stepD);
            group.add(step);
          }
        }
      }
      if (obj.type === 'pond') {
        const water = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(obj.width,obj.depth)*0.48,Math.max(obj.width,obj.depth)*0.52,0.08,32), new THREE.MeshStandardMaterial({ color: '#0ea5e9', transparent: true, opacity: 0.78, roughness: 0.18 }));
        water.scale.z = obj.depth/Math.max(obj.width,obj.depth);
        water.position.y = 0.03;
        group.add(water);
      }
      if (obj.type === 'fence' || obj.type === 'gate') {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(obj.width,obj.height,obj.depth), new THREE.MeshStandardMaterial({color:obj.color,transparent:true,opacity:obj.type==='fence'?0.72:1}));
        rail.position.y=obj.height/2; group.add(rail); addEdge(rail, selectedKind==='object'&&selectedId===obj.id?0xf59e0b:0x475569);
      }
      if ((obj.type==='path' || obj.type==='gardenWall') && obj.points?.length && obj.points.length>=2) {
        let localPoints = obj.points;

        if (obj.type==='path' && obj.curve && obj.points.length>=3) {
          const curve = new THREE.CatmullRomCurve3(
            obj.points.map(point=>new THREE.Vector3(point.x,0,point.y)),
            false,
            'centripetal'
          );
          localPoints = curve.getPoints(Math.max(18,obj.points.length*8)).map(point=>({x:point.x,y:point.z}));
        }

        const material = threeMaterialForObject(
          obj,
          obj.color,
          {roughness:obj.roughnessOverride ?? (obj.type==='path'?0.92:0.82)}
        );

        for (let i=1;i<localPoints.length;i++) {
          const a=localPoints[i-1];
          const b=localPoints[i];

          const worldA={x:obj.x+a.x,y:obj.y+a.y};
          const worldB={x:obj.x+b.x,y:obj.y+b.y};

          const hA=terrainSurfaceHeight(
            worldA.x,worldA.y,elevationPoints,terrainBlobs,
            elevationPoints.some(point=>point.kind==='proposed')?'proposed':'existing'
          );
          const hB=terrainSurfaceHeight(
            worldB.x,worldB.y,elevationPoints,terrainBlobs,
            elevationPoints.some(point=>point.kind==='proposed')?'proposed':'existing'
          );

          const averageTerrain=(hA+hB)/2-baseH;

          if (obj.type==='path') {
            buildLinearSegment3D(
              group,
              a,
              b,
              obj.pathWidth || 1.2,
              Math.max(0.05,obj.height),
              averageTerrain + Math.max(0.05,obj.height)/2 + 0.015,
              material
            );
          } else {
            const wallHeight=Math.max(0.2,obj.height);
            buildLinearSegment3D(
              group,
              a,
              b,
              obj.thickness || 0.28,
              wallHeight,
              averageTerrain + wallHeight/2,
              material
            );

            if ((obj.foundationDepth || 0) > 0.01) {
              const foundationMaterial = new THREE.MeshStandardMaterial({color:'#6b7280',roughness:1});
              buildLinearSegment3D(
                group,
                a,
                b,
                Math.max((obj.thickness || 0.28)+0.16,0.3),
                obj.foundationDepth || 0.5,
                averageTerrain - (obj.foundationDepth || 0.5)/2,
                foundationMaterial
              );
            }
          }
        }
      }

      if (obj.type==='irrigation' && obj.emitterType) {
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08,0.1,0.16,12),
          new THREE.MeshStandardMaterial({color:obj.color,roughness:0.55,metalness:0.15})
        );
        body.position.y=0.08;
        group.add(body);

        if (obj.emitterType==='sprinkler') {
          const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.1,12,8),
            new THREE.MeshStandardMaterial({color:'#f8fafc',roughness:0.4})
          );
          head.position.y=0.2;
          group.add(head);
        } else {
          const cap = new THREE.Mesh(
            new THREE.SphereGeometry(0.07,10,8),
            new THREE.MeshStandardMaterial({color:'#fecdd3',roughness:0.5})
          );
          cap.position.y=0.17;
          group.add(cap);
        }
      }

      if ((obj.type === 'path' && !obj.points?.length) || (obj.type === 'irrigation' && !obj.emitterType) || obj.type === 'drainage') {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(obj.width,Math.max(0.05,obj.height),obj.depth),new THREE.MeshStandardMaterial({color:obj.color,roughness:0.88}));
        slab.position.y=Math.max(0.03,obj.height/2); group.add(slab);
      }
      if (obj.type === 'planter') {
        const box = new THREE.Mesh(new THREE.BoxGeometry(obj.width,obj.height,obj.depth),new THREE.MeshStandardMaterial({color:obj.color}));
        box.position.y=obj.height/2; group.add(box); addEdge(box);
        const soil = new THREE.Mesh(new THREE.BoxGeometry(obj.width*0.88,0.08,obj.depth*0.82),new THREE.MeshStandardMaterial({color:'#3f2d1f'}));
        soil.position.y=obj.height+0.02; group.add(soil);
      }
      if (obj.type === 'bench') {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(obj.width,0.12,obj.depth),new THREE.MeshStandardMaterial({color:obj.color}));
        seat.position.y=0.48; group.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(obj.width,0.55,0.10),new THREE.MeshStandardMaterial({color:obj.color}));
        back.position.set(0,0.75,-obj.depth/2+0.05); group.add(back);
        [-(obj.speciesId?currentPlantDimensions(obj,growthYear).width:obj.width)*0.38,(obj.speciesId?currentPlantDimensions(obj,growthYear).width:obj.width)*0.38].forEach(x=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.48,0.1),new THREE.MeshStandardMaterial({color:'#475569'}));leg.position.set(x,0.24,0);group.add(leg);});
      }
      if (obj.type === 'light') {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,obj.height,12),new THREE.MeshStandardMaterial({color:'#475569'}));
        pole.position.y=obj.height/2;group.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14,16,12),new THREE.MeshStandardMaterial({color:'#fde68a',emissive:'#f59e0b',emissiveIntensity:nightMode?2.2:0.35}));
        lamp.position.y=obj.height;group.add(lamp);
        if(nightMode){const light=new THREE.PointLight(0xffd27a,1.4,5);light.position.y=obj.height;group.add(light);}
      }
      if (obj.type === 'firepit') {
        const pit = new THREE.Mesh(new THREE.CylinderGeometry(obj.width*0.45,obj.width*0.5,obj.height,24),new THREE.MeshStandardMaterial({color:'#57534e'}));
        pit.position.y=obj.height/2;group.add(pit);
        const fire = new THREE.Mesh(new THREE.ConeGeometry(obj.width*0.16,obj.height*1.4,12),new THREE.MeshStandardMaterial({color:'#fb923c',emissive:'#ef4444',emissiveIntensity:1.5}));
        fire.position.y=obj.height+0.2;group.add(fire);
      }
      if (obj.type === 'rock') {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(Math.max(obj.width,obj.depth)*0.42,1),new THREE.MeshStandardMaterial({color:obj.color,roughness:1}));
        rock.scale.set(1,obj.height/Math.max(obj.width,obj.depth),obj.depth/obj.width);rock.position.y=obj.height/2;group.add(rock);
      }
      if (obj.type === 'tree') {
        const growthData = obj.speciesId ? currentPlantDimensions(obj,growthYear) : null;
        const growthFactor = growthData
          ? Math.max(0.08,growthData.height/Math.max(obj.height,0.1))
          : growthYear===0?1:growthYear===3?1.2:growthYear===10?1.55:1.9;
        const widthGrowthFactor = growthData
          ? Math.max(0.08,growthData.width/Math.max(obj.width,0.1))
          : growthFactor;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, obj.height * 0.45 * growthFactor, 12), new THREE.MeshStandardMaterial({ color: '#7c4a2d' }));
        trunk.position.y = obj.height * 0.225 * growthFactor;
        group.add(trunk);
        const leafColor = season==='Herbst'?'#d97706':season==='Winter'?'#94a3b8':season==='Frühling'?'#22c55e':obj.color;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(Math.max(obj.width * 0.6 * widthGrowthFactor, 0.18), 18, 14), new THREE.MeshStandardMaterial({ color: leafColor, transparent: season==='Winter', opacity: season==='Winter'?0.45:1 }));
        crown.position.y = obj.height * 0.7 * growthFactor;
        if (obj.plantForm==='columnar') crown.scale.set(0.68,1.35,0.68);
        if (obj.plantForm==='multiStem') crown.scale.set(1.12,0.82,1.02);
        group.add(crown);
      }
      if (obj.type === 'shrub' && obj.plantForm === 'grass') {
        const grassMaterial=new THREE.MeshStandardMaterial({color:obj.color,roughness:0.95});
        for(let i=0;i<18;i++){
          const angle=(i/18)*Math.PI*2;
          const radius=(i%5)/5*Math.max(0.15,(obj.speciesId?currentPlantDimensions(obj,growthYear).width:obj.width)*0.28);
          const bladeHeight=(obj.speciesId?currentPlantDimensions(obj,growthYear).height:obj.height)*(0.65+((i*37)%30)/100);
          const blade=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.02,bladeHeight,5),grassMaterial);
          blade.position.set(Math.cos(angle)*radius,bladeHeight/2,Math.sin(angle)*radius);
          blade.rotation.z=Math.sin(angle)*0.16;
          blade.rotation.x=Math.cos(angle)*0.16;
          group.add(blade);
        }
      }

      if (obj.type === 'shrub' && obj.plantForm === 'perennial') {
        const stemMaterial=new THREE.MeshStandardMaterial({color:'#3f6212'});
        const flowerColor=obj.bloomColor?.includes('violett')?'#8b5cf6'
          :obj.bloomColor?.includes('blau')?'#6366f1'
          :obj.bloomColor?.includes('weiß')?'#f8fafc'
          :'#ec4899';

        for(let i=0;i<12;i++){
          const angle=(i/12)*Math.PI*2;
          const radius=(i%4)/4*Math.max(0.12,(obj.speciesId?currentPlantDimensions(obj,growthYear).width:obj.width)*0.3);
          const stemHeight=(obj.speciesId?currentPlantDimensions(obj,growthYear).height:obj.height)*(0.55+((i*29)%35)/100);
          const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.016,stemHeight,6),stemMaterial);
          stem.position.set(Math.cos(angle)*radius,stemHeight/2,Math.sin(angle)*radius);
          group.add(stem);

          const flower=new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.035,obj.width*0.055),8,6),new THREE.MeshStandardMaterial({color:flowerColor}));
          flower.position.set(Math.cos(angle)*radius,stemHeight,Math.sin(angle)*radius);
          group.add(flower);
        }
      }

      if (obj.type === 'shrub' && obj.plantForm !== 'grass' && obj.plantForm !== 'perennial') {
        const shrubColor = season==='Herbst'?'#b45309':season==='Winter'?'#94a3b8':obj.color;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(Math.max((obj.speciesId?currentPlantDimensions(obj,growthYear).width:obj.width*(growthYear===0?1:growthYear===3?1.15:growthYear===10?1.4:1.65))*0.5, 0.16), 16, 14), new THREE.MeshStandardMaterial({ color: shrubColor }));
        crown.position.y = obj.height * 0.45;
        crown.scale.y = 0.8;
        group.add(crown);
      }
      if (obj.type === 'hedge') {
    const dims=obj.speciesId?currentPlantDimensions(obj,growthYear):null;
    const renderDepth=dims?Math.min(obj.depth,Math.max(0.25,dims.width*0.35)):obj.depth;
        const hedge = new THREE.Mesh(new THREE.BoxGeometry(obj.width, obj.height, obj.depth), threeMaterialForObject(obj,obj.color));
        hedge.position.y = obj.height / 2;
        group.add(hedge);
      }
    });

    const getPointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleDown = (event: PointerEvent) => {
      getPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const allSelectableGroups = [...objectGroups.map(o => o.group), ...importedModelGroups.map(o => o.group)];
      const intersects = raycaster.intersectObjects(allSelectableGroups, true);
      if (intersects.length) {
        let g: THREE.Object3D | null = intersects[0].object;
        while (g && !(g instanceof THREE.Group && (g.userData.objectId || g.userData.importedModelId))) g = g.parent;
        if (g && g instanceof THREE.Group && g.userData.importedModelId) {
          onImportedModelSelect(g.userData.importedModelId as string);
          onStatus('Importiertes Video-3D-Modell ausgewählt. Position, Drehung und Maßstab rechts einstellen.');
          return;
        }
        if (g && g instanceof THREE.Group) {
          draggedId = g.userData.objectId as number;
          onObjectSelect(draggedId);
          controls.enabled = false;
          renderer.domElement.setPointerCapture?.(event.pointerId);
          const planeHit = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(plane, planeHit)) {
            dragOffsetX = g.position.x - planeHit.x;
            dragOffsetZ = g.position.z - planeHit.z;
          } else {
            dragOffsetX = 0;
            dragOffsetZ = 0;
          }
          pendingDrag = { id: draggedId, x: g.position.x, z: g.position.z };
          onStatus('3D-Verschiebung aktiv. Objekt bleibt unter dem Griffpunkt und springt nicht mehr.');
        }
      }
    };

    const handleMove = (event: PointerEvent) => {
      if (draggedId === null) return;
      getPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, hit)) {
        const item = objectGroups.find(o => o.id === draggedId);
        if (!item) return;
        const x = clamp(hit.x + dragOffsetX, -11, 11);
        const z = clamp(hit.z + dragOffsetZ, -7, 7);
        const y = terrainSurfaceHeight(x, z, elevationPoints, terrainBlobs, elevationPoints.some(point=>point.kind==='proposed')?'proposed':'existing');
        item.group.position.set(x, y, z);
        pendingDrag = { id: draggedId, x, z };
        onStatusRef.current(`3D Position X ${x.toFixed(2)} m · Z ${z.toFixed(2)} m`);
      }
    };

    const handleUp = (event?: PointerEvent) => {
      if (pendingDrag) {
        onObjectMoveRef.current(pendingDrag.id, pendingDrag.x, pendingDrag.z);
        onStatusRef.current(`3D-Verschiebung abgeschlossen: X ${pendingDrag.x.toFixed(2)} m · Z ${pendingDrag.z.toFixed(2)} m`);
      }
      if (event) {
        try { renderer.domElement.releasePointerCapture?.(event.pointerId); } catch {}
      }
      pendingDrag = null;
      draggedId = null;
      controls.enabled = true;
    };

    renderer.domElement.addEventListener('pointerdown', handleDown);
    renderer.domElement.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    let frame = 0;
    let lastRenderAt = 0;
    const targetFrameMs =
      resolvedPerformance==='quality' ? 0 :
      resolvedPerformance==='balanced' ? 24 :
      40;

    const animate = (time = 0) => {
      frame = requestAnimationFrame(animate);
      if (document.visibilityState === 'hidden') return;
      if (targetFrameMs && time-lastRenderAt < targetFrameMs) return;
      lastRenderAt = time;
      controls.update();
      renderer.render(scene,camera);
    };

    animate();
    const resize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerup', handleUp);
      renderer.domElement.removeEventListener('pointerdown', handleDown);
      renderer.domElement.removeEventListener('pointermove', handleMove);
      controls.dispose(); renderer.dispose(); geometry.dispose(); terrainMat.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [terrainBlobs, elevationPoints, zones, objects, levels, rooms, importedModels, selectedImportedModelId, selectedId, selectedKind, nightMode, growthYear, season, sunAzimuth, sunElevation, showContours, showGrid3D, enableShadows, performanceMode, cameraMode]);

  return <div ref={mountRef} className="three" />;
}
