
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ImportedReliefModel, IMPORTED_MODEL_STORAGE_KEY } from '@/types/importedModel';

type ViewMode = '2d' | '3d' | 'splitVertical' | 'splitHorizontal';
type Tab = 'dashboard' | 'project' | 'chat' | 'image' | 'video3d' | 'terrain' | 'architecture' | 'building' | 'scan' | 'library' | 'layers' | 'costs' | 'analysis' | 'water' | 'climate' | 'agents' | 'scene' | 'reports' | 'export';
type Tool = 'select' | 'mound' | 'depression' | 'plantZone' | 'hardscape' | 'building' | 'pool' | 'pond' | 'pergola' | 'wall' | 'fence' | 'gate' | 'stairs' | 'path' | 'tree' | 'shrub' | 'hedge' | 'planter' | 'bench' | 'light' | 'firepit' | 'rock' | 'irrigation' | 'drainage' | 'floor' | 'interiorWall' | 'roof' | 'window' | 'door' | 'slidingDoor' | 'balcony' | 'railing' | 'column' | 'carport' | 'winterGarden';
type SelectedKind = 'terrain' | 'zone' | 'object' | 'room' | null;
type MoveStart = { id: number; x: number; y: number };
type Drag2D =
  | { mode: 'move'; kind: Exclude<SelectedKind, null>; id: number; pointerId: number; offsetX: number; offsetY: number; startPointerX: number; startPointerY: number; groupStart: MoveStart[] }
  | { mode: 'scale'; kind: 'object'; id: number; pointerId: number; startWidth: number; startDepth: number; startX: number; startY: number; rotation: number }
  | { mode: 'rotate'; kind: 'object'; id: number; pointerId: number; centerX: number; centerY: number; startAngle: number; startRotation: number }
  | null;

type EditorSnapshot = {
  terrainBlobs: TerrainBlob[];
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

type GardenObjectType = 'building' | 'pool' | 'pond' | 'pergola' | 'wall' | 'fence' | 'gate' | 'stairs' | 'path' | 'tree' | 'shrub' | 'hedge' | 'planter' | 'bench' | 'light' | 'firepit' | 'rock' | 'irrigation' | 'drainage' | 'floor' | 'interiorWall' | 'roof' | 'window' | 'door' | 'slidingDoor' | 'balcony' | 'railing' | 'column' | 'carport' | 'winterGarden';

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
};

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
  const material = new THREE.MeshStandardMaterial({
    color: wall.color,
    roughness: 0.82,
    metalness: 0
  });
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
  const [status, setStatus] = useState('Bereit: V0.21 FLOORS + ROOMS – Objekte, Gelände und Zonen sind in 2D verschiebbar; Objekte auch in 3D.');
  const [chat, setChat] = useState('Erstelle ein sanftes Gelände mit zwei Hügeln, einer Terrasse im Süden und einem modernen Glashaus im Norden.');
  const [chatEngine, setChatEngine] = useState<ChatEngine>('local');
  const [openAiModel, setOpenAiModel] = useState('gpt-4o');
  const [openAiNote, setOpenAiNote] = useState('OpenAI vorbereitet. Für echten Live-Betrieb OPENAI_API_KEY in Vercel setzen.');
  const [openAiLastAnswer, setOpenAiLastAnswer] = useState('');
  const [image, setImage] = useState<{ name: string; dataUrl: string; width: number; height: number } | null>(null);
  const [imageApplied, setImageApplied] = useState(false);
  const [imageOpacity, setImageOpacity] = useState(0.32);
  const [imageFit, setImageFit] = useState<'stretch' | 'contain'>('contain');
  const [importedModels, setImportedModels] = useState<ImportedReliefModel[]>([]);
  const [selectedImportedModelId, setSelectedImportedModelId] = useState<string | null>(null);
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
  const [growthYear, setGrowthYear] = useState<0 | 3 | 10 | 20>(0);
  const [season, setSeason] = useState<'Frühling' | 'Sommer' | 'Herbst' | 'Winter'>('Sommer');
  const [sunAzimuth, setSunAzimuth] = useState(135);
  const [sunElevation, setSunElevation] = useState(42);
  const [showContours, setShowContours] = useState(true);
  const [showGrid3D, setShowGrid3D] = useState(true);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'walk' | 'top'>('orbit');
  const [layers, setLayers] = useState({ terrain: true, zones: true, buildings: true, plants: true, water: true, structures: true, lighting: true, utilities: true, furniture: true });
  const [lockedLayers, setLockedLayers] = useState({ terrain: false, zones: false, buildings: false, plants: false, water: false, structures: false, lighting: false, utilities: false, furniture: false });
  const [history, setHistory] = useState<any[]>([]);
  const [future, setFuture] = useState<any[]>([]);

  const [drag2D, setDrag2D] = useState<Drag2D>(null);

  const [terrainBlobs, setTerrainBlobs] = useState<TerrainBlob[]>([
    { id: 1, name: 'Hügel Nord', x: -3.5, y: -1.2, radius: 2.4, height: 0.85, softness: 1.35, source: 'Start' },
    { id: 2, name: 'Hügel Süd', x: 2.8, y: 2.2, radius: 1.9, height: 0.55, softness: 1.2, source: 'Start' },
    { id: 3, name: 'Mulde Mitte', x: 1.0, y: -2.8, radius: 1.8, height: -0.45, softness: 1.4, source: 'Start' }
  ]);

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
  }, [autosaveEnabled, projectInfo, terrainBlobs, zones, objects, rooms, levels, activeLevel, importedModels, layers, gridSize, snapEnabled]);

  function restoreAutosave() {
    try {
      const raw = localStorage.getItem('al-green-v0193-autosave');
      if (!raw) { setStatus('Kein Autosave vorhanden.'); return; }
      const data = JSON.parse(raw);
      snapshot();
      if (data.projectInfo) setProjectInfo(data.projectInfo);
      if (Array.isArray(data.terrainBlobs)) setTerrainBlobs(data.terrainBlobs);
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

  const stats = useMemo(() => terrainStats(terrainBlobs), [terrainBlobs]);

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
    if (['tree','shrub','hedge'].includes(obj.type)) return 'plants';
    if (['pool','pond'].includes(obj.type)) return 'water';
    if (obj.type === 'light') return 'lighting';
    if (['irrigation','drainage'].includes(obj.type)) return 'utilities';
    if (['bench','planter','firepit','rock'].includes(obj.type)) return 'furniture';
    return 'structures';
  }

  function saveBrowserProject() {
    localStorage.setItem('al-green-v021-project', JSON.stringify({ projectInfo, terrainBlobs, zones, objects, rooms, levels, activeLevel, importedModels, layers, gridSize, snapEnabled }));
    setStatus('Projekt im Browser gespeichert.');
  }

  function loadBrowserProject() {
    const raw = localStorage.getItem('al-green-v021-project') || localStorage.getItem('al-green-v0192-project') || localStorage.getItem('al-green-v019-project');
    if (!raw) { setStatus('Kein gespeichertes Browserprojekt gefunden.'); return; }
    try {
      const data = JSON.parse(raw);
      snapshot();
      if (data.projectInfo) setProjectInfo(data.projectInfo);
      if (data.terrainBlobs) setTerrainBlobs(data.terrainBlobs);
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
    const obj: GardenObject = {
      ...draftObject,
      level: isLevelBoundObject(draftObject) ? activeLevel : preset.level
    };
    setObjects(v => [...v, obj]);
    setSelection('object', id, `${obj.name} gesetzt.`);
  }

  function handleCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    const rawPoint = worldFromEvent(svgRef.current, e);
    const p = snapPointToWallEndpoints(rawPoint);

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

  function exportCsvReport() {
    const rows = [
      ['Kategorie','Name','Typ','X','Y','Breite','Tiefe','Höhe','Material','Kostenansatz'],
      ...objects.map(o=>['Objekt',o.name,o.type,o.x,o.y,o.width,o.depth,o.height,o.material||'',Number(o.unitCost||0)]),
      ...zones.map(z=>['Zone',z.name,z.kind,z.x,z.y,z.width,z.depth,0,'',0]),
      ...terrainBlobs.map(b=>['Gelände',b.name,b.height>=0?'Erhebung':'Senke',b.x,b.y,b.radius*2,b.radius*2,b.height,'Erde',48])
    ];
    const csv = rows.map(row=>row.map(cell=>`"${String(cell).replaceAll('"','""')}"`).join(';')).join('\n');
    download('al-green-design-v019-bericht.csv', csv, 'text/csv;charset=utf-8');
    setStatus('CSV-Bericht exportiert.');
  }

  function exportProject() {
    download('al-green-design-v019-pro-studio.algreen', JSON.stringify({ version:'0.21.0', projectInfo, terrainBlobs, zones, objects, layers, lockedLayers, gridSize, snapEnabled, imageName: image?.name ?? null, chatEngine, openAiModel }, null, 2), 'application/json');
  }


  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelection();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return (
    <section className="platform">
      <aside className="panel">
        <h2>Module</h2>
        <div className="grid2">
          {([
            ['dashboard','Dashboard'],['project','Projekt'],['chat','KI-Chat'],['image','Bild/KI'],['video3d','Video → 3D'],['terrain','Terrain'],['architecture','Architektur'],['building','Bauteile'],['scan','Scan/LiDAR'],['library','Bibliothek'],['layers','Layer'],['costs','Kosten'],['analysis','Analyse'],['water','Wasser'],['climate','Klima/Sonne'],['agents','KI-Agenten'],['scene','3D-Szene'],['reports','Berichte'],['export','Export']
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
            <h2>KI-Garten grob erzeugen</h2>
            <label>
              Chat-Engine
              <select value={chatEngine} onChange={e => setChatEngine(e.target.value as ChatEngine)}>
                <option value="local">Lokale KI</option>
                <option value="openai">OpenAI vorbereitet</option>
              </select>
            </label>
            <label>
              OpenAI-Modell
              <select value={openAiModel} onChange={e => setOpenAiModel(e.target.value)}>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                <option value="gpt-5">gpt-5</option>
                <option value="gpt-5-mini">gpt-5-mini</option>
                <option value="o4-mini">o4-mini</option>
                <option value="o3">o3</option>
                <option value="custom">custom / eigenes Modell unten</option>
              </select>
              <input value={openAiModel} onChange={e => setOpenAiModel(e.target.value)} placeholder="Modellname frei eingeben" />
            </label>
            <textarea className="full" value={chat} onChange={e=>setChat(e.target.value)} />
            <button className="btn primary" style={{marginTop:8}} onClick={generateFromChat}>Entwurf generieren</button>
            <div className="hint" style={{marginTop:8}}>{openAiNote}</div>{openAiLastAnswer && <div className="hint" style={{marginTop:8}}>OpenAI/JSON-Schema: {openAiLastAnswer}</div>}
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
            <h2>Terrain-Werkzeuge</h2>
            <div className="grid2">
              {([
                ['select','Auswählen'],['mound','Erhebung'],['depression','Mulde'],['plantZone','Pflanzzone'],['hardscape','Belag']
              ] as [Tool,string][]).map(([id,label]) => <button key={id} className={`tool ${tool===id?'active':''}`} onClick={()=>setTool(id)}>{label}</button>)}
            </div>
            <div className="hint" style={{marginTop:10}}>Erhebungen und Senken bleiben weich. Gebäude und andere Objekte können unabhängig davon verschoben werden.</div>
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
            <h2>Objekt- und Pflanzenbibliothek</h2>
            <div className="grid3">
              {([
                ['tree','Baum'],['shrub','Strauch'],['hedge','Hecke'],['planter','Hochbeet'],['bench','Sitzbank'],['light','Leuchte'],['firepit','Feuerstelle'],['rock','Felsen'],['irrigation','Bewässerung'],['drainage','Drainage'],['select','Auswählen']
              ] as [Tool,string][]).map(([id,label]) => <button key={id} className={`tool ${tool===id?'active':''}`} onClick={()=>setTool(id)}>{label}</button>)}
            </div>
            <div className="hint" style={{marginTop:10}}>Objekt wählen und in den 2D-Plan klicken. Danach kann es in 2D und 3D verschoben und rechts angepasst werden.</div>
          </>
        )}

        {tab === 'water' && (
          <>
            <h2>Wasser und Entwässerung</h2>
            <div className="grid2">
              <button className={`tool ${tool==='pool'?'active':''}`} onClick={()=>setTool('pool')}>Pool</button>
              <button className={`tool ${tool==='pond'?'active':''}`} onClick={()=>setTool('pond')}>Teich</button>
              <button className={`tool ${tool==='irrigation'?'active':''}`} onClick={()=>setTool('irrigation')}>Bewässerung</button>
              <button className={`tool ${tool==='drainage'?'active':''}`} onClick={()=>setTool('drainage')}>Drainage</button>
              <button className={`tool ${tool==='depression'?'active':''}`} onClick={()=>setTool('depression')}>Retentionsmulde</button>
            </div>
            <div className="kpis" style={{marginTop:10}}>
              <div className="kpi"><small>Wasserobjekte</small><strong>{objects.filter(o=>['pool','pond'].includes(o.type)).length}</strong></div>
              <div className="kpi"><small>Leitungen</small><strong>{objects.filter(o=>['irrigation','drainage'].includes(o.type)).length}</strong></div>
              <div className="kpi"><small>Mulden</small><strong>{terrainBlobs.filter(b=>b.height<0).length}</strong></div>
              <div className="kpi"><small>Rückhalt grob</small><strong>{Math.max(0,(stats.cut*0.65)).toFixed(1)} m³</strong></div>
            </div>
          </>
        )}

        {tab === 'climate' && (
          <>
            <h2>Klima, Sonne und Simulation</h2>
            <div className="form">
              <label>Jahreszeit<select value={season} onChange={e=>setSeason(e.target.value as any)}><option>Frühling</option><option>Sommer</option><option>Herbst</option><option>Winter</option></select></label>
              <label>Sonnenrichtung °<input type="range" min="0" max="360" value={sunAzimuth} onChange={e=>setSunAzimuth(Number(e.target.value))}/><span>{sunAzimuth}°</span></label>
              <label>Sonnenhöhe °<input type="range" min="5" max="85" value={sunElevation} onChange={e=>setSunElevation(Number(e.target.value))}/><span>{sunElevation}°</span></label>
              <label>Kamera<select value={cameraMode} onChange={e=>setCameraMode(e.target.value as any)}><option value="orbit">Orbit</option><option value="walk">Begehen</option><option value="top">Draufsicht</option></select></label>
              <label><input type="checkbox" checked={nightMode} onChange={e=>setNightMode(e.target.checked)}/> Nachtmodus</label>
              <label><input type="checkbox" checked={showContours} onChange={e=>setShowContours(e.target.checked)}/> Höhenlinien</label>
              <label><input type="checkbox" checked={showGrid3D} onChange={e=>setShowGrid3D(e.target.checked)}/> 3D-Raster</label>
            </div>
            <div className="grid2">
              {[0,3,10,20].map(y=><button key={y} className={`btn ${growthYear===y?'active':''}`} onClick={()=>setGrowthYear(y as any)}>{y===0?'heute':y+' Jahre'}</button>)}
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
            <h2>Berichte und Listen</h2>
            <div className="list">
              <div className="item"><strong>Objektliste</strong><span>{objects.length} Objekte im Projekt</span></div>
              <div className="item"><strong>Pflanzenliste</strong><span>{objects.filter(o=>['tree','shrub','hedge'].includes(o.type)).length} Pflanzenobjekte</span></div>
              <div className="item"><strong>Wassertechnik</strong><span>{objects.filter(o=>['pool','pond','irrigation','drainage'].includes(o.type)).length} Elemente</span></div>
              <div className="item"><strong>Geländebericht</strong><span>Auftrag {stats.fill.toFixed(1)} m³ · Abtrag {stats.cut.toFixed(1)} m³</span></div>
            </div>
            <button className="btn blue" style={{marginTop:10}} onClick={exportCsvReport}>CSV-Bericht exportieren</button>
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
            <h2>Kostenübersicht</h2>
            <div className="kpis">
              <div className="kpi"><small>Gebäude</small><strong>{(objects.filter(o=>o.type==='building').reduce((a,o)=>a+o.width*o.depth*Number(o.unitCost||650),0)).toFixed(0)} €</strong></div>
              <div className="kpi"><small>Wasser</small><strong>{(objects.filter(o=>['pool','pond'].includes(o.type)).reduce((a,o)=>a+o.width*o.depth*Number(o.unitCost||500),0)).toFixed(0)} €</strong></div>
              <div className="kpi"><small>Pflanzen</small><strong>{(objects.filter(o=>['tree','shrub','hedge'].includes(o.type)).reduce((a,o)=>a+Number(o.unitCost||(o.type==='tree'?320:o.type==='hedge'?180:65)),0)).toFixed(0)} €</strong></div>
              <div className="kpi"><small>Ausstattung</small><strong>{(objects.filter(o=>['bench','planter','light','firepit','rock'].includes(o.type)).reduce((a,o)=>a+Number(o.unitCost||250),0)).toFixed(0)} €</strong></div>
              <div className="kpi"><small>Technik</small><strong>{(objects.filter(o=>['irrigation','drainage'].includes(o.type)).reduce((a,o)=>a+o.width*Number(o.unitCost||25),0)).toFixed(0)} €</strong></div>
              <div className="kpi"><small>Erdarbeiten</small><strong>{((stats.fill+stats.cut)*48).toFixed(0)} €</strong></div>
            </div>
          </>
        )}

        {tab === 'analysis' && (
          <>
            <h2>Standort- und Projektanalyse</h2>
            <div className="kpis">
              <div className="kpi"><small>Versiegelung</small><strong>{metrics.sealed}%</strong></div>
              <div className="kpi"><small>Biodiversität</small><strong>{metrics.biodiversity}/100</strong></div>
              <div className="kpi"><small>Auftrag</small><strong>{stats.fill.toFixed(1)} m³</strong></div>
              <div className="kpi"><small>Abtrag</small><strong>{stats.cut.toFixed(1)} m³</strong></div>
              <div className="kpi"><small>Regenrückhalt</small><strong>{Math.min(100,Math.round((100-metrics.sealed)+stats.cut*5))}/100</strong></div>
              <div className="kpi"><small>Grünanteil</small><strong>{Math.min(100,Math.round(metrics.greenArea/Math.max(1,projectInfo.area)*100))}%</strong></div>
            </div>
            <div className="grid2" style={{marginTop:10}}>
              <button className={`btn ${nightMode?'active':''}`} onClick={()=>setNightMode(!nightMode)}>Nachtmodus</button>
              {[0,3,10,20].map(y=><button key={y} className={`btn ${growthYear===y?'active':''}`} onClick={()=>setGrowthYear(y as any)}>{y===0?'heute':y+' Jahre'}</button>)}
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

        {tab === 'export' && <><h2>Export</h2><button className="btn blue" onClick={exportProject}>Projekt exportieren</button></>}
      </aside>

      <div className="workspace">
        <div className="topbar">
          <span className="pill">V0.21 FLOORS + ROOMS</span>
          <span className="pill">Terrain {terrainBlobs.length}</span>
          <span className="pill">Zonen {zones.length}</span>
          <span className="pill">Objekte {objects.length}</span>
          <label className="compactControl">Raster <select value={gridSize} onChange={e=>setGridSize(Number(e.target.value))}><option value={0.01}>1 cm</option><option value={0.05}>5 cm</option><option value={0.1}>10 cm</option><option value={0.25}>25 cm</option><option value={0.5}>50 cm</option><option value={1}>1 m</option></select></label>
          <button className={`pill ${snapEnabled?'active':''}`} onClick={()=>setSnapEnabled(v=>!v)}>Fang {snapEnabled?'AN':'AUS'}</button>
          <label className="compactControl">Geschoss <select value={activeLevel} onChange={e=>setActiveLevel(Number(e.target.value))}>{[...levels].sort((a,b)=>a.elevation-b.elevation).map(level=><option key={level.id} value={level.id}>{level.name}</option>)}</select></label>
          <span className="pill">Auswahl {selectedObjectIds.length}</span>
          <button className={`pill ${autosaveEnabled?'active':''}`} onClick={()=>setAutosaveEnabled(v=>!v)}>Autosave {autosaveEnabled?'AN':'AUS'}</button>
          <span className="pill">Speicher {autosaveState==='saving'?'…':autosaveState==='saved'?'✓':autosaveState==='error'?'!':'bereit'}</span>
          <button className="pill" disabled={selectedObjectIds.length<2} onClick={groupSelected}>Gruppieren</button>
          <button className="pill" disabled={!selectedObjectIds.length} onClick={duplicateSelected}>Duplizieren</button>
          <button className={`pill ${view==='2d'?'active':''}`} onClick={()=>setView('2d')}>2D</button>
          <button className={`pill ${view==='3d'?'active':''}`} onClick={()=>setView('3d')}>3D</button>
          <button className={`pill ${view==='splitVertical'?'active':''}`} onClick={()=>setView('splitVertical')}>Split ↔</button>
          <button className={`pill ${view==='splitHorizontal'?'active':''}`} onClick={()=>setView('splitHorizontal')}>Split ↕</button>
        </div>
        <div className="canvasWrap">
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
                  onClick={(e)=>{e.stopPropagation(); selectObject(obj.id,e.shiftKey||e.metaKey||e.ctrlKey);}}
                  onPointerDown={(e)=>start2DDrag(e,'object',obj.id,obj.x,obj.y,obj.name)}
                />
              ))}
              {snapGuides?.x !== undefined && <line x1={snapGuides.x*SCALE} y1={VIEWBOX.y*SCALE} x2={snapGuides.x*SCALE} y2={(VIEWBOX.y+VIEWBOX.height)*SCALE} stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="8 5" pointerEvents="none"/>}
              {snapGuides?.y !== undefined && <line x1={VIEWBOX.x*SCALE} y1={snapGuides.y*SCALE} x2={(VIEWBOX.x+VIEWBOX.width)*SCALE} y2={snapGuides.y*SCALE} stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="8 5" pointerEvents="none"/>}
              {selectedObject && selectedObjectIds.length===1 && <ObjectTransformHandles obj={selectedObject} onScaleStart={startScaleObject} onRotateStart={startRotateObject}/>}
            </svg>
          ) : view === '3d' ? (
            <Terrain3D terrainBlobs={terrainBlobs} zones={zones} objects={objects} levels={levels} rooms={rooms} importedModels={importedModels} selectedImportedModelId={selectedImportedModelId} selectedId={selectedId} selectedKind={selectedKind} nightMode={nightMode} growthYear={growthYear} season={season} sunAzimuth={sunAzimuth} sunElevation={sunElevation} showContours={showContours} showGrid3D={showGrid3D} cameraMode={cameraMode} onObjectMove={(id, x, y) => {
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
                <Terrain3D terrainBlobs={terrainBlobs} zones={zones} objects={objects} levels={levels} rooms={rooms} importedModels={importedModels} selectedImportedModelId={selectedImportedModelId} selectedId={selectedId} selectedKind={selectedKind} nightMode={nightMode} growthYear={growthYear} season={season} sunAzimuth={sunAzimuth} sunElevation={sunElevation} showContours={showContours} showGrid3D={showGrid3D} cameraMode={cameraMode} onObjectMove={(id, x, y) => {
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
            <label>Material<input value={selectedObject.material||''} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,material:e.target.value}:o))} /></label>
            {['building','floor','wall','interiorWall','roof','window','door','slidingDoor','balcony','railing','column','carport','winterGarden'].includes(selectedObject.type) && <>
              <label>Ebene / Geschoss<select value={Number(selectedObject.level||0)} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,level:Number(e.target.value)}:o))}>{levels.map(level=><option key={level.id} value={level.id}>{level.name} · {level.elevation.toFixed(2)} m</option>)}</select></label>
              <label>Dicke / Stärke<input type="number" step="0.01" value={Number(selectedObject.thickness||selectedObject.depth||0.2)} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,thickness:Number(e.target.value)}:o))}/></label>
              <label>Untertyp / Dachform<input value={selectedObject.subtype||''} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,subtype:e.target.value}:o))}/></label>
            </>}
            <label>Kostenansatz<input type="number" step="1" value={Number(selectedObject.unitCost||0)} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,unitCost:Number(e.target.value)}:o))} /></label>
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
            {['tree','shrub','hedge'].includes(selectedObject.type) && <><label>Wasserbedarf<input type="number" min="1" max="5" value={Number(selectedObject.waterNeed||2)} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,waterNeed:Number(e.target.value)}:o))}/></label><label>Lichtbedarf<input value={selectedObject.lightNeed||''} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,lightNeed:e.target.value}:o))}/></label></>}
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

function GardenObject2D({ obj, openings = [], selected, onClick, onPointerDown }: { obj: GardenObject; openings?: GardenObject[]; selected: boolean; onClick: (e: React.MouseEvent<SVGGElement>) => void; onPointerDown: (e: React.PointerEvent<SVGGElement>) => void }) {
  const stroke = selected ? '#f59e0b' : '#1f2937';
  const sw = selected ? 3 : 1.5;
  const tx = obj.x * SCALE;
  const ty = obj.y * SCALE;
  const rot = obj.rotation;
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
  if (['tree','shrub','rock','firepit','light'].includes(obj.type)) {
    return (
      <g onClick={onClick} onPointerDown={onPointerDown} transform={`translate(${tx},${ty}) rotate(${rot})`}>
        <circle cx="0" cy="0" r={(obj.width / 2) * SCALE} fill={obj.color} fillOpacity="0.85" stroke={stroke} strokeWidth={sw} />
        <text x="0" y={(obj.width / 2 + 0.3) * SCALE} fontSize="12" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{obj.name}</text>
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
  cameraMode,
  onObjectMove,
  onObjectSelect,
  onImportedModelSelect,
  onStatus
}: {
  terrainBlobs: TerrainBlob[];
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
  cameraMode: 'orbit' | 'walk' | 'top';
  onObjectMove: (id: number, x: number, y: number) => void;
  onObjectSelect: (id: number) => void;
  onImportedModelSelect: (id: string) => void;
  onStatus: (msg: string) => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(nightMode ? 0x0f172a : season==='Winter' ? 0xe2e8f0 : 0xeaf2fb);
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(cameraMode==='top'?0:cameraMode==='walk'?7:16, cameraMode==='top'?24:cameraMode==='walk'?2.2:13, cameraMode==='top'?0.1:cameraMode==='walk'?9:18);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(nightMode ? 0x9db4ff : 0xffffff, nightMode ? 0.38 : 0.82));
    const sun = new THREE.DirectionalLight(nightMode ? 0x94a3b8 : 0xffffff, nightMode ? 0.35 : 1.25);
    const az = degToRad(sunAzimuth);
    const el = degToRad(sunElevation);
    sun.position.set(Math.cos(az)*Math.cos(el)*30, Math.sin(el)*30, Math.sin(az)*Math.cos(el)*30);
    scene.add(sun);
    if (showGrid3D) scene.add(new THREE.GridHelper(28, 28, 0x94a3b8, nightMode ? 0x334155 : 0xd7e0eb));

    const terrainSizeX = 24, terrainSizeY = 16, segX = 140, segY = 100;
    const geometry = new THREE.PlaneGeometry(terrainSizeX, terrainSizeY, segX, segY);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position;
    const colors: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i); const z = pos.getZ(i);
      const y = terrainHeightAt(x, z, terrainBlobs);
      pos.setY(i, y);
      const t = clamp((y + 1.2) / 2.8, 0, 1);
      const lowColor = season==='Winter' ? '#cbd5e1' : '#60a5fa'; const highColor = season==='Herbst' ? '#d97706' : season==='Winter' ? '#f8fafc' : '#84cc16'; const color = new THREE.Color().lerpColors(new THREE.Color(lowColor), new THREE.Color(highColor), t);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: false });
    const terrainMesh = new THREE.Mesh(geometry, terrainMat);
    scene.add(terrainMesh);
    if (showContours) scene.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometry), new THREE.LineBasicMaterial({ color: nightMode ? 0x94a3b8 : 0x64748b, transparent: true, opacity: 0.12 })));

    zones.forEach(zone => {
      const h = terrainHeightAt(zone.x, zone.y, terrainBlobs);
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
      const baseH = terrainHeightAt(obj.x, obj.y, terrainBlobs);
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
          const roof = new THREE.Mesh(new THREE.BoxGeometry(obj.width, Math.max(obj.height,0.18), obj.depth), new THREE.MeshStandardMaterial({ color: obj.color }));
          roof.position.y = levelBase + obj.height/2;
          group.add(roof); addEdge(roof);
        } else {
          const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(obj.width,obj.depth)*0.72, Math.max(obj.height,0.6), 4), new THREE.MeshStandardMaterial({ color: obj.color }));
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
        const door = new THREE.Mesh(new THREE.BoxGeometry(obj.width, obj.height, Math.max(obj.depth,0.08)), new THREE.MeshStandardMaterial({ color: obj.color }));
        door.position.y = levelBase + openingSill(obj) + obj.height/2;
        group.add(door); addEdge(door);
      }

      if (obj.type === 'balcony') {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(obj.width, Math.max(obj.height,0.14), obj.depth), new THREE.MeshStandardMaterial({ color: obj.color }));
        slab.position.y = levelBase;
        group.add(slab); addEdge(slab);
      }

      if (obj.type === 'railing') {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(obj.width, obj.height, Math.max(obj.depth,0.06)), new THREE.MeshStandardMaterial({ color: obj.color, transparent: true, opacity: 0.72 }));
        rail.position.y = levelBase + obj.height/2;
        group.add(rail); addEdge(rail);
      }

      if (obj.type === 'column') {
        const column = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(obj.width,0.12)/2, Math.max(obj.width,0.12)/2, obj.height, 16), new THREE.MeshStandardMaterial({ color: obj.color }));
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
        const body = new THREE.Mesh(new THREE.BoxGeometry(obj.width, obj.height, obj.depth), new THREE.MeshStandardMaterial({ color: obj.color }));
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
        const roof = new THREE.Mesh(new THREE.BoxGeometry(obj.width, 0.16, obj.depth), new THREE.MeshStandardMaterial({ color: obj.color }));
        roof.position.y = obj.height;
        group.add(roof);
        addEdge(roof, selectedKind === 'object' && selectedId === obj.id ? 0xf59e0b : 0x475569);
        const postPos = [[-obj.width/2+0.12,-obj.depth/2+0.12],[obj.width/2-0.12,-obj.depth/2+0.12],[-obj.width/2+0.12,obj.depth/2-0.12],[obj.width/2-0.12,obj.depth/2-0.12]];
        postPos.forEach(([x,z]) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, obj.height, 0.12), new THREE.MeshStandardMaterial({ color: obj.color }));
          post.position.set(x, obj.height/2, z);
          group.add(post);
        });
      }
      if (obj.type === 'wall' || obj.type === 'interiorWall') {
        const openings = objects.filter(opening => opening.parentId === obj.id && isOpeningObject(opening));
        buildWallWithOpenings3D(group, obj, openings, selectedKind === 'object' && selectedId === obj.id, levelBase);
      }
      if (obj.type === 'stairs') {
        const steps = 4;
        for (let i = 0; i < steps; i++) {
          const stepH = obj.height / steps;
          const stepD = obj.depth / steps;
          const step = new THREE.Mesh(new THREE.BoxGeometry(obj.width, stepH, stepD), new THREE.MeshStandardMaterial({ color: obj.color }));
          step.position.set(0, stepH / 2 + i * stepH, -obj.depth / 2 + stepD / 2 + i * stepD);
          group.add(step);
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
      if (obj.type === 'path' || obj.type === 'irrigation' || obj.type === 'drainage') {
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
        [-obj.width*0.38,obj.width*0.38].forEach(x=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.48,0.1),new THREE.MeshStandardMaterial({color:'#475569'}));leg.position.set(x,0.24,0);group.add(leg);});
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
        const growthFactor = growthYear===0?1:growthYear===3?1.2:growthYear===10?1.55:1.9;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, obj.height * 0.45 * growthFactor, 12), new THREE.MeshStandardMaterial({ color: '#7c4a2d' }));
        trunk.position.y = obj.height * 0.225 * growthFactor;
        group.add(trunk);
        const leafColor = season==='Herbst'?'#d97706':season==='Winter'?'#94a3b8':season==='Frühling'?'#22c55e':obj.color;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(Math.max(obj.width * 0.6 * growthFactor, 0.8), 18, 14), new THREE.MeshStandardMaterial({ color: leafColor, transparent: season==='Winter', opacity: season==='Winter'?0.45:1 }));
        crown.position.y = obj.height * 0.7 * growthFactor;
        group.add(crown);
      }
      if (obj.type === 'shrub') {
        const shrubColor = season==='Herbst'?'#b45309':season==='Winter'?'#94a3b8':obj.color;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(Math.max(obj.width * 0.5 * (growthYear===0?1:growthYear===3?1.15:growthYear===10?1.4:1.65), 0.45), 16, 14), new THREE.MeshStandardMaterial({ color: shrubColor }));
        crown.position.y = obj.height * 0.45;
        crown.scale.y = 0.8;
        group.add(crown);
      }
      if (obj.type === 'hedge') {
        const hedge = new THREE.Mesh(new THREE.BoxGeometry(obj.width, obj.height, obj.depth), new THREE.MeshStandardMaterial({ color: obj.color }));
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
        const y = terrainHeightAt(x, z, terrainBlobs);
        item.group.position.set(x, y, z);
        pendingDrag = { id: draggedId, x, z };
        onStatus(`3D Position X ${x.toFixed(2)} m · Z ${z.toFixed(2)} m`);
      }
    };

    const handleUp = (event?: PointerEvent) => {
      if (pendingDrag) {
        onObjectMove(pendingDrag.id, pendingDrag.x, pendingDrag.z);
        onStatus(`3D-Verschiebung abgeschlossen: X ${pendingDrag.x.toFixed(2)} m · Z ${pendingDrag.z.toFixed(2)} m`);
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
    const animate = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(animate); };
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
  }, [terrainBlobs, zones, objects, levels, rooms, importedModels, selectedImportedModelId, selectedId, selectedKind, nightMode, growthYear, season, sunAzimuth, sunElevation, showContours, showGrid3D, cameraMode, onObjectMove, onObjectSelect, onImportedModelSelect, onStatus]);

  return <div ref={mountRef} className="three" />;
}
