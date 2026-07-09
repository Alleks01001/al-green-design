'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type Mode = 'select' | 'pan' | 'drawArea' | 'placeObject';
type ViewMode = '2d' | '3d';
type Point = { x: number; y: number };
type AreaType =
  | 'Rasen'
  | 'Terrasse'
  | 'Pflaster'
  | 'Kies'
  | 'Beet'
  | 'Wasser'
  | 'Beton'
  | 'Holzdeck'
  | 'Naturstein'
  | 'Mulch'
  | 'Sand'
  | 'Erde';

type ObjectType =
  | 'Baum'
  | 'Strauch'
  | 'Hecke'
  | 'Mauer'
  | 'Wand'
  | 'Zaun'
  | 'Pool'
  | 'Treppe'
  | 'Hochbeet'
  | 'Gebäude'
  | 'Tür'
  | 'Fenster'
  | 'Tor'
  | 'Dach'
  | 'Boden innen'
  | 'Boden außen'
  | 'Wintergarten'
  | 'Pergola'
  | 'Gartenhaus'
  | 'Stein'
  | 'Leuchte';

type Area = {
  id: number;
  levelId: string;
  type: AreaType;
  points: Point[];
  material: string;
  thickness: number;
};

type GardenObject = {
  id: number;
  levelId: string;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  material: string;
};

type Background = {
  name: string;
  dataUrl: string;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  sourceType: 'image' | 'pdf';
};

type Camera = { x: number; y: number; width: number; height: number };
type Drag =
  | null
  | { type: 'pan'; startX: number; startY: number; startCamera: Camera }
  | { type: 'object'; id: number; offsetX: number; offsetY: number }
  | { type: 'resize'; id: number }
  | { type: 'rotate'; id: number }
  | { type: 'areaPoint'; areaId: number; pointIndex: number };

const SCALE = 50;
const STORAGE_KEY = 'al-green-design-v08';

const LEVELS = [
  { id: 'terrain', name: 'Gelände', elevation: 0 },
  { id: 'eg', name: 'EG / Terrasse', elevation: 0.35 },
  { id: 'og1', name: '1. OG / Balkon', elevation: 3.2 },
  { id: 'roof', name: 'Dach / Pergola', elevation: 6.2 }
];

const AREA_COLORS: Record<AreaType, string> = {
  Rasen: '#3a9f4f',
  Terrasse: '#a47b4b',
  Pflaster: '#777777',
  Kies: '#b3aaa4',
  Beet: '#6b3f22',
  Wasser: '#2d7dd2',
  Beton: '#b9c1c9',
  Holzdeck: '#986437',
  Naturstein: '#8a8178',
  Mulch: '#704214',
  Sand: '#d8b36a',
  Erde: '#7c4f2c'
};

const OBJECTS: Record<ObjectType, { width: number; depth: number; height: number; material: string; color: string }> = {
  Baum: { width: 1.2, depth: 1.2, height: 3.2, material: 'Laubbaum', color: '#15803d' },
  Strauch: { width: 1, depth: 1, height: 1.1, material: 'Strauch', color: '#16a34a' },
  Hecke: { width: 3, depth: 0.45, height: 1.4, material: 'Hecke', color: '#15803d' },
  Mauer: { width: 3, depth: 0.28, height: 1.2, material: 'Beton / Stein', color: '#78716c' },
  Wand: { width: 3, depth: 0.2, height: 2.7, material: 'Ziegel / Putz', color: '#cbd5e1' },
  Zaun: { width: 3, depth: 0.12, height: 1.1, material: 'Holz / Metall', color: '#92400e' },
  Pool: { width: 4, depth: 2.4, height: 1.3, material: 'Pool / Wasser', color: '#2563eb' },
  Treppe: { width: 1.6, depth: 2.2, height: 0.9, material: 'Beton / Stein', color: '#a8a29e' },
  Hochbeet: { width: 2, depth: 1, height: 0.7, material: 'Holz', color: '#854d0e' },
  Gebäude: { width: 5, depth: 4, height: 3, material: 'Putz', color: '#cbd5e1' },
  Tür: { width: 1, depth: 0.12, height: 2.1, material: 'Holz / Glas', color: '#7c2d12' },
  Fenster: { width: 1.2, depth: 0.1, height: 1.1, material: 'Glas', color: '#93c5fd' },
  Tor: { width: 2.8, depth: 0.16, height: 1.8, material: 'Metall / Holz', color: '#78350f' },
  Dach: { width: 5, depth: 4, height: 0.35, material: 'Ziegel / Blech', color: '#7f1d1d' },
  'Boden innen': { width: 3, depth: 3, height: 0.08, material: 'Fliese / Holz', color: '#d6d3d1' },
  'Boden außen': { width: 3, depth: 3, height: 0.08, material: 'Stein / Beton', color: '#a8a29e' },
  Wintergarten: { width: 3.5, depth: 2.5, height: 2.6, material: 'Glas / Aluminium', color: '#60a5fa' },
  Pergola: { width: 3, depth: 2.5, height: 2.4, material: 'Holz / Metall', color: '#92400e' },
  Gartenhaus: { width: 3, depth: 2.5, height: 2.4, material: 'Holz', color: '#a16207' },
  Stein: { width: 0.6, depth: 0.4, height: 0.25, material: 'Naturstein', color: '#71717a' },
  Leuchte: { width: 0.25, depth: 0.25, height: 0.8, material: 'Metall / Licht', color: '#f59e0b' }
};

function polygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum / 2);
}

function rotatePoint(point: Point, center: Point, angleDeg: number): Point {
  const angle = angleDeg * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

function objectCorners(object: GardenObject): Point[] {
  const halfWidth = object.width / 2;
  const halfDepth = object.depth / 2;
  const center = { x: object.x, y: object.y };
  return [
    rotatePoint({ x: object.x - halfWidth, y: object.y - halfDepth }, center, object.rotation),
    rotatePoint({ x: object.x + halfWidth, y: object.y - halfDepth }, center, object.rotation),
    rotatePoint({ x: object.x + halfWidth, y: object.y + halfDepth }, center, object.rotation),
    rotatePoint({ x: object.x - halfWidth, y: object.y + halfDepth }, center, object.rotation)
  ];
}

function pointsToSvg(points: Point[]): string {
  return points.map((point) => `${point.x * SCALE},${point.y * SCALE}`).join(' ');
}

function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function levelElevation(id: string): number {
  return LEVELS.find((level) => level.id === id)?.elevation ?? 0;
}

function hexToNumber(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

function areaCenter(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  return points.reduce(
    (acc, point) => ({
      x: acc.x + point.x / points.length,
      y: acc.y + point.y / points.length
    }),
    { x: 0, y: 0 }
  );
}

function createLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.8, 0.7, 1);
  return sprite;
}

function createAreaMesh(area: Area): THREE.Object3D {
  const group = new THREE.Group();
  if (area.points.length < 3) return group;

  const shape = new THREE.Shape();
  shape.moveTo(area.points[0].x, -area.points[0].y);
  area.points.slice(1).forEach((point) => shape.lineTo(point.x, -point.y));
  shape.lineTo(area.points[0].x, -area.points[0].y);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(area.thickness, 0.03),
    bevelEnabled: false
  });
  geometry.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: hexToNumber(AREA_COLORS[area.type]),
      roughness: 0.8,
      metalness: 0.05
    })
  );
  mesh.position.y = levelElevation(area.levelId);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh);

  const center = areaCenter(area.points);
  const label = createLabel(`${area.type} ${polygonArea(area.points).toFixed(1)} m²`);
  label.position.set(center.x, levelElevation(area.levelId) + 0.35, center.y);
  group.add(label);

  return group;
}

function createObjectMesh(object: GardenObject): THREE.Object3D {
  const group = new THREE.Group();
  const defaults = OBJECTS[object.type];
  const color = hexToNumber(defaults.color);
  const baseY = levelElevation(object.levelId);

  if (object.type === 'Baum') {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, Math.max(object.height * 0.45, 0.4), 12),
      new THREE.MeshStandardMaterial({ color: 0x7c4a21 })
    );
    trunk.position.set(object.x, baseY + object.height * 0.225, object.y);

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(object.width * 0.55, 0.3), 24, 18),
      new THREE.MeshStandardMaterial({ color })
    );
    crown.position.set(object.x, baseY + object.height * 0.72, object.y);
    crown.scale.y = 1.15;
    group.add(trunk, crown);
    return group;
  }

  if (object.type === 'Strauch') {
    const shrub = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(object.width * 0.5, 0.25), 20, 16),
      new THREE.MeshStandardMaterial({ color })
    );
    shrub.position.set(object.x, baseY + object.height * 0.45, object.y);
    shrub.scale.y = 0.65;
    group.add(shrub);
    return group;
  }

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(object.width, Math.max(object.height, 0.05), object.depth),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: object.type === 'Tor' || object.type === 'Leuchte' ? 0.25 : 0.05,
      transparent: object.type === 'Fenster' || object.type === 'Wintergarten',
      opacity: object.type === 'Fenster' || object.type === 'Wintergarten' ? 0.55 : 1
    })
  );
  mesh.position.set(object.x, baseY + Math.max(object.height, 0.05) / 2, object.y);
  mesh.rotation.y = object.rotation * Math.PI / 180;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

function ThreeView({
  areas,
  objects,
  canvasHostRef
}: {
  areas: Area[];
  objects: GardenObject[];
  canvasHostRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    canvasHostRef.current = mount;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdbeafe);

    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(15, 14, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 1.25);
    directional.position.set(10, 18, 10);
    directional.castShadow = true;
    scene.add(directional);

    const grid = new THREE.GridHelper(50, 50, 0x64748b, 0xcbd5e1);
    scene.add(grid);

    const content = new THREE.Group();
    contentRef.current = content;
    scene.add(content);

    let animationId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const resize = () => {
      if (!mountRef.current) return;
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      canvasHostRef.current = null;
    };
  }, [canvasHostRef]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    while (content.children.length > 0) {
      const child = content.children[0];
      content.remove(child);
    }

    areas.forEach((area) => content.add(createAreaMesh(area)));
    objects.forEach((object) => content.add(createObjectMesh(object)));
  }, [areas, objects]);

  return <div ref={mountRef} className="three-canvas" />;
}

export default function GardenStudio() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const threeHostRef = useRef<HTMLDivElement | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [activeLevelId, setActiveLevelId] = useState('terrain');
  const [mode, setMode] = useState<Mode>('select');
  const [snapOn, setSnapOn] = useState(true);
  const [showMeasures, setShowMeasures] = useState(true);
  const [areaType, setAreaType] = useState<AreaType>('Rasen');
  const [objectType, setObjectType] = useState<ObjectType>('Mauer');
  const [areas, setAreas] = useState<Area[]>([]);
  const [objects, setObjects] = useState<GardenObject[]>([]);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [background, setBackground] = useState<Background | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: -10, y: -8, width: 24, height: 16 });
  const [drag, setDrag] = useState<Drag>(null);
  const [status, setStatus] = useState('Bereit: V0.8.1 mit erweiterten Formaten.');

  const activeLevel = LEVELS.find((level) => level.id === activeLevelId) ?? LEVELS[0];
  const selectedArea = areas.find((area) => area.id === selectedAreaId) ?? null;
  const selectedObject = objects.find((object) => object.id === selectedObjectId) ?? null;

  const totals = useMemo(() => {
    const areaM2 = areas.reduce((sum, area) => sum + polygonArea(area.points), 0);
    const areaM3 = areas.reduce((sum, area) => sum + polygonArea(area.points) * area.thickness, 0);
    const objectM3 = objects.reduce((sum, object) => sum + object.width * object.depth * object.height, 0);
    return { areaM2, m3: areaM3 + objectM3 };
  }, [areas, objects]);

  function svgPoint(event: React.PointerEvent | React.MouseEvent | React.WheelEvent): Point {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = camera.x + ((event.clientX - rect.left) / rect.width) * camera.width;
    const y = camera.y + ((event.clientY - rect.top) / rect.height) * camera.height;
    return snapOn ? { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 } : { x, y };
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>): void {
    event.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pointerX = camera.x + ((event.clientX - rect.left) / rect.width) * camera.width;
    const pointerY = camera.y + ((event.clientY - rect.top) / rect.height) * camera.height;
    const factor = event.deltaY < 0 ? 0.86 : 1.16;
    const nextWidth = Math.max(4, Math.min(80, camera.width * factor));
    const nextHeight = Math.max(3, Math.min(60, camera.height * factor));
    const ratioX = (pointerX - camera.x) / camera.width;
    const ratioY = (pointerY - camera.y) / camera.height;
    setCamera({
      x: pointerX - ratioX * nextWidth,
      y: pointerY - ratioY * nextHeight,
      width: nextWidth,
      height: nextHeight
    });
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>): void {
    if (event.button === 2 || mode === 'pan') {
      event.preventDefault();
      setDrag({
        type: 'pan',
        startX: event.clientX,
        startY: event.clientY,
        startCamera: camera
      });
      setStatus('Ansicht verschieben.');
    }
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>): void {
    if (!drag) return;

    if (drag.type === 'pan') {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((event.clientX - drag.startX) / rect.width) * drag.startCamera.width;
      const dy = ((event.clientY - drag.startY) / rect.height) * drag.startCamera.height;
      setCamera({
        ...drag.startCamera,
        x: drag.startCamera.x - dx,
        y: drag.startCamera.y - dy
      });
      return;
    }

    const point = svgPoint(event);

    if (drag.type === 'object') {
      setObjects((prev) =>
        prev.map((object) =>
          object.id === drag.id
            ? { ...object, x: point.x - drag.offsetX, y: point.y - drag.offsetY }
            : object
        )
      );
      return;
    }

    if (drag.type === 'resize') {
      setObjects((prev) =>
        prev.map((object) =>
          object.id === drag.id
            ? {
                ...object,
                width: Math.max(0.2, Math.abs(point.x - object.x) * 2),
                depth: Math.max(0.2, Math.abs(point.y - object.y) * 2)
              }
            : object
        )
      );
      return;
    }

    if (drag.type === 'rotate') {
      setObjects((prev) =>
        prev.map((object) => {
          if (object.id !== drag.id) return object;
          const angle = Math.atan2(point.y - object.y, point.x - object.x) * (180 / Math.PI);
          return { ...object, rotation: snapOn ? Math.round(angle / 15) * 15 : angle };
        })
      );
      return;
    }

    if (drag.type === 'areaPoint') {
      setAreas((prev) =>
        prev.map((area) =>
          area.id === drag.areaId
            ? {
                ...area,
                points: area.points.map((oldPoint, index) =>
                  index === drag.pointIndex ? point : oldPoint
                )
              }
            : area
        )
      );
    }
  }

  function handleCanvasClick(event: React.MouseEvent<SVGSVGElement>): void {
    if ((event.target as Element).closest('[data-interactive="true"]')) return;
    const point = svgPoint(event);

    if (mode === 'drawArea') {
      setDrawingPoints((prev) => [...prev, point]);
      setStatus('Punkt gesetzt. Ab 3 Punkten Fläche erzeugen.');
      return;
    }

    if (mode === 'placeObject') {
      const defaults = OBJECTS[objectType];
      const newObject: GardenObject = {
        id: Date.now(),
        levelId: activeLevelId,
        type: objectType,
        x: point.x,
        y: point.y,
        width: defaults.width,
        depth: defaults.depth,
        height: defaults.height,
        rotation: 0,
        material: defaults.material
      };
      setObjects((prev) => [...prev, newObject]);
      setSelectedObjectId(newObject.id);
      setSelectedAreaId(null);
      setMode('select');
      setStatus(`${objectType} gesetzt und ausgewählt.`);
    }
  }

  function closeArea(): void {
    if (drawingPoints.length < 3) {
      setStatus('Mindestens 3 Punkte nötig.');
      return;
    }
    const newArea: Area = {
      id: Date.now(),
      levelId: activeLevelId,
      type: areaType,
      points: drawingPoints,
      material: areaType,
      thickness: 0.1
    };
    setAreas((prev) => [...prev, newArea]);
    setSelectedAreaId(newArea.id);
    setSelectedObjectId(null);
    setDrawingPoints([]);
    setMode('select');
    setStatus(`${areaType} erzeugt und ausgewählt.`);
  }

  function updateObject(patch: Partial<GardenObject>): void {
    if (!selectedObject) return;
    setObjects((prev) =>
      prev.map((object) =>
        object.id === selectedObject.id ? { ...object, ...patch } : object
      )
    );
  }

  function updateArea(patch: Partial<Area>): void {
    if (!selectedArea) return;
    setAreas((prev) =>
      prev.map((area) => (area.id === selectedArea.id ? { ...area, ...patch } : area))
    );
  }

  function deleteSelection(): void {
    if (selectedObject) {
      setObjects((prev) => prev.filter((object) => object.id !== selectedObject.id));
      setSelectedObjectId(null);
      return;
    }
    if (selectedArea) {
      setAreas((prev) => prev.filter((area) => area.id !== selectedArea.id));
      setSelectedAreaId(null);
    }
  }

  function duplicateSelection(): void {
    if (selectedObject) {
      const copy = {
        ...selectedObject,
        id: Date.now(),
        x: selectedObject.x + 0.7,
        y: selectedObject.y + 0.7
      };
      setObjects((prev) => [...prev, copy]);
      setSelectedObjectId(copy.id);
      return;
    }

    if (selectedArea) {
      const copy = {
        ...selectedArea,
        id: Date.now(),
        points: selectedArea.points.map((point) => ({ x: point.x + 0.7, y: point.y + 0.7 }))
      };
      setAreas((prev) => [...prev, copy]);
      setSelectedAreaId(copy.id);
    }
  }

  function zoomButton(factor: number): void {
    const centerX = camera.x + camera.width / 2;
    const centerY = camera.y + camera.height / 2;
    const nextWidth = Math.max(4, Math.min(80, camera.width * factor));
    const nextHeight = Math.max(3, Math.min(60, camera.height * factor));
    setCamera({
      x: centerX - nextWidth / 2,
      y: centerY - nextHeight / 2,
      width: nextWidth,
      height: nextHeight
    });
  }

  function exportProject(): void {
    const project = { version: '0.8.1', levels: LEVELS, areas, objects, background };
    downloadFile('al-green-design-v08.algreen', JSON.stringify(project, null, 2), 'application/json');
  }

  function exportJson(): void {
    const project = { version: '0.8.1', levels: LEVELS, areas, objects, background };
    downloadFile('al-green-design-v08.json', JSON.stringify(project, null, 2), 'application/json');
  }

  function exportTxt(): void {
    const lines = [
      'AL Green Design – Garden Studio V0.8',
      '',
      `Flächen: ${areas.length}`,
      `Objekte: ${objects.length}`,
      `Gesamtfläche: ${totals.areaM2.toFixed(2)} m²`,
      `Gesamtvolumen: ${totals.m3.toFixed(2)} m³`,
      '',
      'Flächen:',
      ...areas.map((area, index) => `${index + 1}. ${area.type} · ${polygonArea(area.points).toFixed(2)} m² · ${(polygonArea(area.points) * area.thickness).toFixed(2)} m³ · Ebene ${area.levelId}`),
      '',
      'Objekte:',
      ...objects.map((object, index) => `${index + 1}. ${object.type} · ${object.width.toFixed(2)} × ${object.depth.toFixed(2)} × ${object.height.toFixed(2)} m · Ebene ${object.levelId}`)
    ];
    downloadFile('al-green-design-v08.txt', lines.join('\n'), 'text/plain;charset=utf-8');
  }

  function importProject(file: File | null): void {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const project = JSON.parse(String(reader.result));
        setAreas(project.areas ?? []);
        setObjects(project.objects ?? []);
        setBackground(project.background ?? null);
        setSelectedAreaId(null);
        setSelectedObjectId(null);
        setStatus('Projekt geladen.');
      } catch {
        setStatus('Projekt konnte nicht gelesen werden.');
      }
    };
    reader.readAsText(file);
  }

  function saveBrowser(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: '0.8.1', levels: LEVELS, areas, objects, background })
    );
    setStatus('Im Browser gespeichert.');
  }

  function loadBrowser(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setStatus('Kein Browser-Projekt gefunden.');
      return;
    }
    const project = JSON.parse(raw);
    setAreas(project.areas ?? []);
    setObjects(project.objects ?? []);
    setBackground(project.background ?? null);
    setStatus('Aus Browser geladen.');
  }

  function exportCsv(): void {
    const rows = [
      ['Kategorie', 'Ebene', 'Typ', 'Material', 'Breite/Länge', 'Tiefe/Dicke', 'Höhe/Stärke', 'm²', 'm³'],
      ...areas.map((area) => [
        'Fläche',
        area.levelId,
        area.type,
        area.material,
        '',
        '',
        area.thickness.toFixed(2),
        polygonArea(area.points).toFixed(2),
        (polygonArea(area.points) * area.thickness).toFixed(2)
      ]),
      ...objects.map((object) => [
        'Objekt',
        object.levelId,
        object.type,
        object.material,
        object.width.toFixed(2),
        object.depth.toFixed(2),
        object.height.toFixed(2),
        '',
        (object.width * object.depth * object.height).toFixed(2)
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
    downloadFile('al-green-design-mengenliste-v08.csv', csv, 'text/csv;charset=utf-8');
  }

  function serializeSvg(): string {
    const svg = svgRef.current;
    if (!svg) return '';
    return new XMLSerializer().serializeToString(svg);
  }

  function triggerDownloadFromDataUrl(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }

  function get3DCanvas(): HTMLCanvasElement | null {
    if (!threeHostRef.current) return null;
    return threeHostRef.current.querySelector('canvas');
  }

  async function exportRaster(type: 'png' | 'jpeg' | 'webp') {
    if (viewMode === '2d') {
      const source = serializeSvg();
      if (!source) return;
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1800;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#eef2f7';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const mime = type === 'png' ? 'image/png' : type === 'jpeg' ? 'image/jpeg' : 'image/webp';
        const file = type === 'png' ? 'garden-studio-v08.png' : type === 'jpeg' ? 'garden-studio-v08.jpg' : 'garden-studio-v08.webp';
        triggerDownloadFromDataUrl(canvas.toDataURL(mime, 0.92), file);
        URL.revokeObjectURL(url);
      };
      image.src = url;
      return;
    }

    const canvas = get3DCanvas();
    if (!canvas) return;
    const mime = type === 'png' ? 'image/png' : type === 'jpeg' ? 'image/jpeg' : 'image/webp';
    const file = type === 'png' ? 'garden-studio-3d-v08.png' : type === 'jpeg' ? 'garden-studio-3d-v08.jpg' : 'garden-studio-3d-v08.webp';
    triggerDownloadFromDataUrl(canvas.toDataURL(mime, 0.92), file);
  }

  function exportSvg() {
    if (viewMode !== '2d') {
      setStatus('SVG-Export nur in der 2D-Ansicht.');
      return;
    }
    const source = serializeSvg();
    if (!source) return;
    downloadFile('garden-studio-v08.svg', source, 'image/svg+xml;charset=utf-8');
  }

  async function exportPdf() {
    const { jsPDF } = await import('jspdf');

    if (viewMode === '2d') {
      const source = serializeSvg();
      if (!source) return;
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1800;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#eef2f7';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('garden-studio-v08.pdf');
        URL.revokeObjectURL(url);
      };

      image.src = url;
      return;
    }

    const canvas = get3DCanvas();
    if (!canvas) return;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('garden-studio-3d-v08.pdf');
  }

  function placeBackground(dataUrl: string, fileName: string, sourceType: 'image' | 'pdf', imageWidth: number, imageHeight: number) {
    const aspect = imageWidth / imageHeight;
    const width = 14;
    const height = width / aspect;

    setBackground({
      name: fileName,
      dataUrl,
      opacity: 0.45,
      x: -7,
      y: -height / 2,
      width,
      height,
      sourceType
    });
  }

  async function uploadBackground(file: File | null) {
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        // @ts-ignore
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const bytes = await file.arrayBuffer();
        // @ts-ignore
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport, canvas } as any).promise;
        placeBackground(canvas.toDataURL('image/png'), file.name, 'pdf', canvas.width, canvas.height);
        setStatus('PDF als Hintergrund geladen.');
      } catch {
        setStatus('PDF konnte nicht geladen werden.');
      }
      return;
    }

    if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        const image = new Image();
        image.onload = () => {
          placeBackground(dataUrl, file.name, 'image', image.width, image.height);
          setStatus('Bild als Hintergrund geladen.');
        };
        image.src = dataUrl;
      };
      reader.readAsDataURL(file);
      return;
    }

    setStatus('Dieses Dateiformat wird für den Hintergrund nicht unterstützt.');
  }

  const gridLines = [];
  for (let x = -50; x <= 50; x += 0.5) {
    gridLines.push(
      <line
        key={`v-${x}`}
        x1={x * SCALE}
        y1={-50 * SCALE}
        x2={x * SCALE}
        y2={50 * SCALE}
        stroke={x % 1 === 0 ? '#cbd5e1' : '#e2e8f0'}
        strokeWidth={x % 1 === 0 ? 1.1 : 0.7}
      />
    );
  }
  for (let y = -50; y <= 50; y += 0.5) {
    gridLines.push(
      <line
        key={`h-${y}`}
        x1={-50 * SCALE}
        y1={y * SCALE}
        x2={50 * SCALE}
        y2={y * SCALE}
        stroke={y % 1 === 0 ? '#cbd5e1' : '#e2e8f0'}
        strokeWidth={y % 1 === 0 ? 1.1 : 0.7}
      />
    );
  }

  return (
    <section className="studio">
      <aside className="panel">
        <h2>Ansicht</h2>
        <div className="grid2">
          <button className={`btn ${viewMode === '2d' ? 'active' : ''}`} onClick={() => setViewMode('2d')}>2D-Draufsicht</button>
          <button className={`btn ${viewMode === '3d' ? 'active' : ''}`} onClick={() => setViewMode('3d')}>3D-Ansicht</button>
        </div>
        <div className="hint">In 3D: linke Maustaste drehen, Mausrad zoomen, rechte Maustaste verschieben.</div>

        <hr />

        <h2>Steuerung 2D</h2>
        <div className="hint">
          Mausrad = Zoom. Rechte Maustaste oder Hand-Modus = Plan verschieben.
          Objekt anklicken = auswählen. Objekt ziehen = verschieben.
          Eckpunkte ziehen = Größe ändern. Gelber Kreis = drehen.
        </div>

        <div className="grid2">
          <button className="btn" onClick={() => zoomButton(0.82)}>Zoom +</button>
          <button className="btn" onClick={() => zoomButton(1.18)}>Zoom -</button>
          <button className="btn" onClick={() => setCamera({ x: -10, y: -8, width: 24, height: 16 })}>Reset</button>
          <button className={`btn ${mode === 'pan' ? 'active' : ''}`} onClick={() => setMode(mode === 'pan' ? 'select' : 'pan')}>Hand / Pan</button>
        </div>

        <hr />

        <h2>Arbeitsmodus</h2>
        <div className="grid2">
          <button className={`tool ${mode === 'select' ? 'active' : ''}`} onClick={() => setMode('select')}>Auswählen</button>
          <button className={`tool ${mode === 'drawArea' ? 'active' : ''}`} onClick={() => setMode('drawArea')}>Fläche zeichnen</button>
          <button className={`tool ${mode === 'placeObject' ? 'active' : ''}`} onClick={() => setMode('placeObject')}>Objekt setzen</button>
          <button className={`tool ${snapOn ? 'active' : ''}`} onClick={() => setSnapOn(!snapOn)}>Raster {snapOn ? 'AN' : 'AUS'}</button>
        </div>

        <hr />

        <h2>Ebene</h2>
        <div className="grid2">
          {LEVELS.map((level) => (
            <button
              key={level.id}
              className={`tool ${activeLevelId === level.id ? 'active' : ''}`}
              onClick={() => setActiveLevelId(level.id)}
            >
              {level.name}<br />{level.elevation.toFixed(2)} m
            </button>
          ))}
        </div>

        <hr />

        <h2>Flächen</h2>
        <select className="btn" value={areaType} onChange={(event) => setAreaType(event.target.value as AreaType)}>
          {Object.keys(AREA_COLORS).map((key) => <option key={key}>{key}</option>)}
        </select>

        <div className="grid2" style={{ marginTop: 8 }}>
          <button className="btn primary" onClick={closeArea}>Fläche erzeugen</button>
          <button className="btn" onClick={() => setDrawingPoints((prev) => prev.slice(0, -1))}>Punkt zurück</button>
        </div>

        <hr />

        <h2>Objekte</h2>
        <select
          className="btn"
          value={objectType}
          onChange={(event) => {
            setObjectType(event.target.value as ObjectType);
            setMode('placeObject');
          }}
        >
          {Object.keys(OBJECTS).map((key) => <option key={key}>{key}</option>)}
        </select>

        <div className="grid2" style={{ marginTop: 8 }}>
          <button className={`btn ${showMeasures ? 'active' : ''}`} onClick={() => setShowMeasures(!showMeasures)}>Maße {showMeasures ? 'AN' : 'AUS'}</button>
          <button className="btn warn" onClick={duplicateSelection} disabled={!selectedObject && !selectedArea}>Duplizieren</button>
          <button className="btn danger" onClick={deleteSelection} disabled={!selectedObject && !selectedArea}>Löschen</button>
        </div>
      </aside>

      <div className="canvas-wrap">
        <div className="canvas-topbar">
          <span className="pill">V0.8.1</span>
          <span className="pill">{viewMode === '2d' ? '2D-Draufsicht' : '3D-Ansicht'}</span>
          <span className="pill">Ebene: {activeLevel.name}</span>
          <span className="pill">Raster: {snapOn ? '50 cm' : 'frei'}</span>
          {background && <span className="pill">Hintergrund: {background.name}</span>}
        </div>

        {viewMode === '3d' ? (
          <ThreeView areas={areas} objects={objects} canvasHostRef={threeHostRef} />
        ) : (
          <svg
            ref={svgRef}
            className="svg-canvas"
            viewBox={`${camera.x * SCALE} ${camera.y * SCALE} ${camera.width * SCALE} ${camera.height * SCALE}`}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => setDrag(null)}
            onPointerCancel={() => setDrag(null)}
            onClick={handleCanvasClick}
            onContextMenu={(event) => event.preventDefault()}
          >
            <g>{gridLines}</g>

            <line x1={-50 * SCALE} y1={0} x2={50 * SCALE} y2={0} stroke="#94a3b8" strokeWidth={2} />
            <line x1={0} y1={-50 * SCALE} x2={0} y2={50 * SCALE} stroke="#94a3b8" strokeWidth={2} />

            {background && (
              <image
                href={background.dataUrl}
                x={background.x * SCALE}
                y={background.y * SCALE}
                width={background.width * SCALE}
                height={background.height * SCALE}
                opacity={background.opacity}
                preserveAspectRatio="none"
              />
            )}

            {areas.map((area) => {
              const selected = area.id === selectedAreaId;
              const areaM2 = polygonArea(area.points);
              const center = area.points.reduce(
                (acc, point) => ({
                  x: acc.x + point.x / area.points.length,
                  y: acc.y + point.y / area.points.length
                }),
                { x: 0, y: 0 }
              );

              return (
                <g key={area.id} data-interactive="true">
                  <polygon
                    points={pointsToSvg(area.points)}
                    fill={AREA_COLORS[area.type]}
                    fillOpacity={selected ? 0.85 : 0.58}
                    stroke={selected ? '#f59e0b' : '#0f172a'}
                    strokeWidth={selected ? 4 : 2}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedAreaId(area.id);
                      setSelectedObjectId(null);
                    }}
                  />
                  {showMeasures && selected && (
                    <text
                      x={center.x * SCALE}
                      y={center.y * SCALE}
                      fontSize={18}
                      fontWeight="700"
                      fill="#052e16"
                      textAnchor="middle"
                      paintOrder="stroke"
                      stroke="#ffffff"
                      strokeWidth={4}
                    >
                      {areaM2.toFixed(2)} m² / {(areaM2 * area.thickness).toFixed(2)} m³
                    </text>
                  )}
                  {selected &&
                    area.points.map((point, index) => (
                      <circle
                        key={`${area.id}-${index}`}
                        cx={point.x * SCALE}
                        cy={point.y * SCALE}
                        r={8}
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth={2}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          setDrag({ type: 'areaPoint', areaId: area.id, pointIndex: index });
                        }}
                      />
                    ))}
                </g>
              );
            })}

            {drawingPoints.length > 0 && (
              <g>
                <polyline points={pointsToSvg(drawingPoints)} fill="none" stroke="#f97316" strokeWidth={3} strokeDasharray="8 6" />
                {drawingPoints.map((point, index) => (
                  <circle key={index} cx={point.x * SCALE} cy={point.y * SCALE} r={6} fill={index === 0 ? '#22c55e' : '#facc15'} />
                ))}
              </g>
            )}

            {objects.map((object) => {
              const selected = object.id === selectedObjectId;
              const defaults = OBJECTS[object.type];
              const corners = objectCorners(object);
              const rotateHandle = rotatePoint(
                { x: object.x, y: object.y - object.depth / 2 - 0.55 },
                { x: object.x, y: object.y },
                object.rotation
              );

              return (
                <g key={object.id} data-interactive="true">
                  <polygon
                    points={pointsToSvg(corners)}
                    fill={defaults.color}
                    fillOpacity={selected ? 0.9 : 0.7}
                    stroke={selected ? '#f59e0b' : '#0f172a'}
                    strokeWidth={selected ? 4 : 2}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      const point = svgPoint(event);
                      setSelectedObjectId(object.id);
                      setSelectedAreaId(null);
                      setMode('select');
                      setDrag({
                        type: 'object',
                        id: object.id,
                        offsetX: point.x - object.x,
                        offsetY: point.y - object.y
                      });
                    }}
                  />
                  <text
                    x={object.x * SCALE}
                    y={object.y * SCALE + 5}
                    fontSize={13}
                    fontWeight="700"
                    fill="#0f172a"
                    textAnchor="middle"
                    paintOrder="stroke"
                    stroke="#ffffff"
                    strokeWidth={3}
                    pointerEvents="none"
                  >
                    {object.type}
                  </text>
                  {showMeasures && selected && (
                    <text
                      x={object.x * SCALE}
                      y={(object.y + object.depth / 2 + 0.42) * SCALE}
                      fontSize={16}
                      fontWeight="700"
                      fill="#92400e"
                      textAnchor="middle"
                      paintOrder="stroke"
                      stroke="#ffffff"
                      strokeWidth={4}
                    >
                      {object.width.toFixed(2)} × {object.depth.toFixed(2)} m · H {object.height.toFixed(2)} m
                    </text>
                  )}
                  {selected && (
                    <>
                      {corners.map((corner, index) => (
                        <rect
                          key={index}
                          x={(corner.x - 0.08) * SCALE}
                          y={(corner.y - 0.08) * SCALE}
                          width={0.16 * SCALE}
                          height={0.16 * SCALE}
                          fill="#ffffff"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setDrag({ type: 'resize', id: object.id });
                          }}
                        />
                      ))}
                      <line
                        x1={object.x * SCALE}
                        y1={object.y * SCALE}
                        x2={rotateHandle.x * SCALE}
                        y2={rotateHandle.y * SCALE}
                        stroke="#f59e0b"
                        strokeWidth={2}
                      />
                      <circle
                        cx={rotateHandle.x * SCALE}
                        cy={rotateHandle.y * SCALE}
                        r={10}
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth={3}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          setDrag({ type: 'rotate', id: object.id });
                        }}
                      />
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        <div className="status">
          <span>{status}</span>
          <span className="badge">{viewMode}</span>
        </div>
      </div>

      <aside className="panel">
        <h2>Projekt</h2>
        <div className="kpis">
          <div className="kpi"><small>Flächen</small><strong>{areas.length}</strong></div>
          <div className="kpi"><small>Objekte</small><strong>{objects.length}</strong></div>
          <div className="kpi"><small>Gesamtfläche</small><strong>{totals.areaM2.toFixed(2)} m²</strong></div>
          <div className="kpi"><small>Volumen</small><strong>{totals.m3.toFixed(2)} m³</strong></div>
        </div>

        <hr />

        <h2>Eigenschaften</h2>
        {!selectedObject && !selectedArea && <p>Kein Element ausgewählt.</p>}

        {selectedObject && (
          <div className="prop">
            <label>Typ
              <select
                value={selectedObject.type}
                onChange={(event) => {
                  const type = event.target.value as ObjectType;
                  updateObject({ type, material: OBJECTS[type].material });
                }}
              >
                {Object.keys(OBJECTS).map((key) => <option key={key}>{key}</option>)}
              </select>
            </label>
            <label>Material<input value={selectedObject.material} onChange={(event) => updateObject({ material: event.target.value })} /></label>
            <label>Breite m<input type="number" step="0.05" value={selectedObject.width} onChange={(event) => updateObject({ width: Number(event.target.value) })} /></label>
            <label>Tiefe m<input type="number" step="0.05" value={selectedObject.depth} onChange={(event) => updateObject({ depth: Number(event.target.value) })} /></label>
            <label>Höhe m<input type="number" step="0.05" value={selectedObject.height} onChange={(event) => updateObject({ height: Number(event.target.value) })} /></label>
            <label>Drehung °<input type="number" step="5" value={Math.round(selectedObject.rotation)} onChange={(event) => updateObject({ rotation: Number(event.target.value) })} /></label>
            <label>X m<input type="number" step="0.05" value={selectedObject.x} onChange={(event) => updateObject({ x: Number(event.target.value) })} /></label>
            <label>Y m<input type="number" step="0.05" value={selectedObject.y} onChange={(event) => updateObject({ y: Number(event.target.value) })} /></label>
          </div>
        )}

        {selectedArea && (
          <div className="prop">
            <label>Typ
              <select
                value={selectedArea.type}
                onChange={(event) => updateArea({ type: event.target.value as AreaType, material: event.target.value })}
              >
                {Object.keys(AREA_COLORS).map((key) => <option key={key}>{key}</option>)}
              </select>
            </label>
            <label>Material<input value={selectedArea.material} onChange={(event) => updateArea({ material: event.target.value })} /></label>
            <label>Stärke m<input type="number" step="0.01" value={selectedArea.thickness} onChange={(event) => updateArea({ thickness: Number(event.target.value) })} /></label>
            <label>m²<input readOnly value={polygonArea(selectedArea.points).toFixed(2)} /></label>
          </div>
        )}

        <hr />

        <h2>Upload</h2>
        <div className="grid2">
          <label className="file">.algreen import<input type="file" accept=".algreen,application/json" onChange={(event) => importProject(event.target.files?.[0] ?? null)} /></label>
          <label className="file">PDF / Bild<input type="file" accept=".pdf,image/*,.svg" onChange={(event) => uploadBackground(event.target.files?.[0] ?? null)} /></label>
          <button className="btn" onClick={() => setBackground(null)} disabled={!background}>Hintergrund entfernen</button>
          <button className="btn" onClick={saveBrowser}>Browser speichern</button>
          <button className="btn" onClick={loadBrowser}>Browser laden</button>
        </div>

        <hr />

        <h2>Download</h2>
        <div className="grid2">
          <button className="btn blue" onClick={exportProject}>.algreen</button>
          <button className="btn" onClick={exportJson}>JSON</button>
          <button className="btn" onClick={() => exportRaster('png')}>PNG</button>
          <button className="btn" onClick={() => exportRaster('jpeg')}>JPG</button>
          <button className="btn" onClick={() => exportRaster('webp')}>WEBP</button>
          <button className="btn" onClick={exportSvg}>SVG</button>
          <button className="btn" onClick={exportPdf}>PDF</button>
          <button className="btn" onClick={exportCsv}>CSV</button>
          <button className="btn" onClick={exportTxt}>TXT</button>
        </div>

        <hr />

        <h2>Objekte</h2>
        <div className="list">
          {objects.length === 0 ? <p>Keine Objekte vorhanden.</p> : objects.map((object, index) => (
            <div key={object.id} className={`item ${object.id === selectedObjectId ? 'selected' : ''}`}>
              <button onClick={() => { setSelectedObjectId(object.id); setSelectedAreaId(null); }}>
                <strong>{index + 1}. {object.type}</strong>
                <span>{object.width.toFixed(2)} × {object.depth.toFixed(2)} × {object.height.toFixed(2)} m · {object.material}</span>
              </button>
            </div>
          ))}
        </div>

        <hr />

        <h2>Flächen</h2>
        <div className="list">
          {areas.length === 0 ? <p>Keine Flächen vorhanden.</p> : areas.map((area, index) => (
            <div key={area.id} className={`item ${area.id === selectedAreaId ? 'selected' : ''}`}>
              <button onClick={() => { setSelectedAreaId(area.id); setSelectedObjectId(null); }}>
                <strong>{index + 1}. {area.type}</strong>
                <span>{polygonArea(area.points).toFixed(2)} m² · {(polygonArea(area.points) * area.thickness).toFixed(2)} m³</span>
              </button>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
