'use client';

import { useMemo, useRef, useState } from 'react';

type Mode = 'select' | 'pan' | 'drawArea' | 'placeObject';
type Point = { x: number; y: number };
type AreaType = 'Rasen' | 'Terrasse' | 'Pflaster' | 'Kies' | 'Beet' | 'Wasser' | 'Beton' | 'Holzdeck' | 'Naturstein' | 'Mulch' | 'Sand' | 'Erde';
type ObjectType = 'Baum' | 'Strauch' | 'Hecke' | 'Mauer' | 'Wand' | 'Zaun' | 'Pool' | 'Treppe' | 'Hochbeet' | 'Gebäude' | 'Tür' | 'Fenster' | 'Tor' | 'Dach' | 'Boden innen' | 'Boden außen' | 'Wintergarten' | 'Pergola' | 'Gartenhaus' | 'Stein' | 'Leuchte';

type Area = { id: number; levelId: string; type: AreaType; points: Point[]; material: string; thickness: number };
type GardenObject = { id: number; levelId: string; type: ObjectType; x: number; y: number; width: number; depth: number; height: number; rotation: number; material: string };
type Background = { name: string; dataUrl: string; opacity: number; x: number; y: number; width: number; height: number };
type Camera = { x: number; y: number; width: number; height: number };
type Drag = null | { type: 'pan'; startX: number; startY: number; startCamera: Camera } | { type: 'object'; id: number; offsetX: number; offsetY: number } | { type: 'resize'; id: number } | { type: 'rotate'; id: number } | { type: 'areaPoint'; areaId: number; pointIndex: number };

const SCALE = 50;
const STORAGE_KEY = 'al-green-design-v06';

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
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
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

export default function GardenStudio() {
  const svgRef = useRef<SVGSVGElement | null>(null);
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
  const [status, setStatus] = useState('Bereit: Mausrad zoomt, rechte Maustaste oder Hand-Modus verschiebt.');

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
      setDrag({ type: 'pan', startX: event.clientX, startY: event.clientY, startCamera: camera });
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
      setCamera({ ...drag.startCamera, x: drag.startCamera.x - dx, y: drag.startCamera.y - dy });
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
      const copy = { ...selectedObject, id: Date.now(), x: selectedObject.x + 0.7, y: selectedObject.y + 0.7 };
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
    const project = { version: '0.6.0', levels: LEVELS, areas, objects, background };
    downloadFile('al-green-design-v06.algreen', JSON.stringify(project, null, 2), 'application/json');
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
      } catch {
        setStatus('Projekt konnte nicht gelesen werden.');
      }
    };
    reader.readAsText(file);
  }

  function saveBrowser(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: '0.6.0', levels: LEVELS, areas, objects, background }));
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
      ...areas.map((area) => ['Fläche', area.levelId, area.type, area.material, '', '', area.thickness.toFixed(2), polygonArea(area.points).toFixed(2), (polygonArea(area.points) * area.thickness).toFixed(2)]),
      ...objects.map((object) => ['Objekt', object.levelId, object.type, object.material, object.width.toFixed(2), object.depth.toFixed(2), object.height.toFixed(2), '', (object.width * object.depth * object.height).toFixed(2)])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\\n');
    downloadFile('al-green-design-mengenliste-v06.csv', csv, 'text/csv;charset=utf-8');
  }

  function exportPngOrJpg(type: 'png' | 'jpeg'): void {
    const svg = svgRef.current;
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1800;
      canvas.height = 1200;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.fillStyle = '#eef2f7';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL(type === 'png' ? 'image/png' : 'image/jpeg', 0.92);
      const link = document.createElement('a');
      link.href = data;
      link.download = type === 'png' ? 'garden-studio-v06.png' : 'garden-studio-v06.jpg';
      link.click();
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  function uploadBackground(file: File | null): void {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setStatus('Bitte JPG/JPEG oder PNG hochladen.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const image = new Image();
      image.onload = () => {
        const aspect = image.width / image.height;
        const width = 14;
        const height = width / aspect;
        setBackground({ name: file.name, dataUrl, opacity: 0.45, x: -7, y: -height / 2, width, height });
      };
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  const gridLines = [];
  for (let x = -50; x <= 50; x += 0.5) {
    gridLines.push(<line key={`v-${x}`} x1={x * SCALE} y1={-50 * SCALE} x2={x * SCALE} y2={50 * SCALE} stroke={x % 1 === 0 ? '#cbd5e1' : '#e2e8f0'} strokeWidth={x % 1 === 0 ? 1.1 : 0.7} />);
  }
  for (let y = -50; y <= 50; y += 0.5) {
    gridLines.push(<line key={`h-${y}`} x1={-50 * SCALE} y1={y * SCALE} x2={50 * SCALE} y2={y * SCALE} stroke={y % 1 === 0 ? '#cbd5e1' : '#e2e8f0'} strokeWidth={y % 1 === 0 ? 1.1 : 0.7} />);
  }

  return (
    <section className="studio">
      <aside className="panel">
        <h2>Steuerung</h2>
        <div className="hint">Mausrad = Zoom. Rechte Maustaste oder Hand-Modus = Plan verschieben. Objekt anklicken = auswählen. Objekt ziehen = verschieben. Eckpunkte ziehen = Größe ändern. Gelber Kreis = drehen.</div>
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
            <button key={level.id} className={`tool ${activeLevelId === level.id ? 'active' : ''}`} onClick={() => setActiveLevelId(level.id)}>
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
        <select className="btn" value={objectType} onChange={(event) => { setObjectType(event.target.value as ObjectType); setMode('placeObject'); }}>
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
          <span className="pill">V0.6</span>
          <span className="pill">Ebene: {activeLevel.name}</span>
          <span className="pill">Zoom: {(24 / camera.width).toFixed(1)}×</span>
          <span className="pill">Raster: {snapOn ? '50 cm' : 'frei'}</span>
        </div>

        <svg ref={svgRef} className="svg-canvas" viewBox={`${camera.x * SCALE} ${camera.y * SCALE} ${camera.width * SCALE} ${camera.height * SCALE}`} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onClick={handleCanvasClick} onContextMenu={(event) => event.preventDefault()}>
          <g>{gridLines}</g>
          <line x1={-50 * SCALE} y1={0} x2={50 * SCALE} y2={0} stroke="#94a3b8" strokeWidth={2} />
          <line x1={0} y1={-50 * SCALE} x2={0} y2={50 * SCALE} stroke="#94a3b8" strokeWidth={2} />

          {background && <image href={background.dataUrl} x={background.x * SCALE} y={background.y * SCALE} width={background.width * SCALE} height={background.height * SCALE} opacity={background.opacity} preserveAspectRatio="none" />}

          {areas.map((area) => {
            const selected = area.id === selectedAreaId;
            const areaM2 = polygonArea(area.points);
            const center = area.points.reduce((acc, point) => ({ x: acc.x + point.x / area.points.length, y: acc.y + point.y / area.points.length }), { x: 0, y: 0 });

            return (
              <g key={area.id} data-interactive="true">
                <polygon points={pointsToSvg(area.points)} fill={AREA_COLORS[area.type]} fillOpacity={selected ? 0.85 : 0.58} stroke={selected ? '#f59e0b' : '#0f172a'} strokeWidth={selected ? 4 : 2} onPointerDown={(event) => { event.stopPropagation(); setSelectedAreaId(area.id); setSelectedObjectId(null); }} />
                {showMeasures && selected && <text x={center.x * SCALE} y={center.y * SCALE} fontSize={18} fontWeight="700" fill="#052e16" textAnchor="middle" paintOrder="stroke" stroke="#ffffff" strokeWidth={4}>{areaM2.toFixed(2)} m² / {(areaM2 * area.thickness).toFixed(2)} m³</text>}
                {selected && area.points.map((point, index) => <circle key={`${area.id}-${index}`} cx={point.x * SCALE} cy={point.y * SCALE} r={8} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} onPointerDown={(event) => { event.stopPropagation(); setDrag({ type: 'areaPoint', areaId: area.id, pointIndex: index }); }} />)}
              </g>
            );
          })}

          {drawingPoints.length > 0 && <g><polyline points={pointsToSvg(drawingPoints)} fill="none" stroke="#f97316" strokeWidth={3} strokeDasharray="8 6" />{drawingPoints.map((point, index) => <circle key={index} cx={point.x * SCALE} cy={point.y * SCALE} r={6} fill={index === 0 ? '#22c55e' : '#facc15'} />)}</g>}

          {objects.map((object) => {
            const selected = object.id === selectedObjectId;
            const defaults = OBJECTS[object.type];
            const corners = objectCorners(object);
            const rotateHandle = rotatePoint({ x: object.x, y: object.y - object.depth / 2 - 0.55 }, { x: object.x, y: object.y }, object.rotation);

            return (
              <g key={object.id} data-interactive="true">
                <polygon points={pointsToSvg(corners)} fill={defaults.color} fillOpacity={selected ? 0.9 : 0.7} stroke={selected ? '#f59e0b' : '#0f172a'} strokeWidth={selected ? 4 : 2} onPointerDown={(event) => { event.stopPropagation(); const point = svgPoint(event); setSelectedObjectId(object.id); setSelectedAreaId(null); setMode('select'); setDrag({ type: 'object', id: object.id, offsetX: point.x - object.x, offsetY: point.y - object.y }); }} />
                <text x={object.x * SCALE} y={object.y * SCALE + 5} fontSize={13} fontWeight="700" fill="#0f172a" textAnchor="middle" paintOrder="stroke" stroke="#ffffff" strokeWidth={3} pointerEvents="none">{object.type}</text>
                {showMeasures && selected && <text x={object.x * SCALE} y={(object.y + object.depth / 2 + 0.42) * SCALE} fontSize={16} fontWeight="700" fill="#92400e" textAnchor="middle" paintOrder="stroke" stroke="#ffffff" strokeWidth={4}>{object.width.toFixed(2)} × {object.depth.toFixed(2)} m · H {object.height.toFixed(2)} m</text>}
                {selected && <>
                  {corners.map((corner, index) => <rect key={index} x={(corner.x - 0.08) * SCALE} y={(corner.y - 0.08) * SCALE} width={0.16 * SCALE} height={0.16 * SCALE} fill="#ffffff" stroke="#f59e0b" strokeWidth={3} onPointerDown={(event) => { event.stopPropagation(); setDrag({ type: 'resize', id: object.id }); }} />)}
                  <line x1={object.x * SCALE} y1={object.y * SCALE} x2={rotateHandle.x * SCALE} y2={rotateHandle.y * SCALE} stroke="#f59e0b" strokeWidth={2} />
                  <circle cx={rotateHandle.x * SCALE} cy={rotateHandle.y * SCALE} r={10} fill="#f59e0b" stroke="#ffffff" strokeWidth={3} onPointerDown={(event) => { event.stopPropagation(); setDrag({ type: 'rotate', id: object.id }); }} />
                </>}
              </g>
            );
          })}
        </svg>
        <div className="status"><span>{status}</span><span className="badge">{mode}</span></div>
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
        {selectedObject && <div className="prop">
          <label>Typ<select value={selectedObject.type} onChange={(event) => { const type = event.target.value as ObjectType; updateObject({ type, material: OBJECTS[type].material }); }}>{Object.keys(OBJECTS).map((key) => <option key={key}>{key}</option>)}</select></label>
          <label>Material<input value={selectedObject.material} onChange={(event) => updateObject({ material: event.target.value })} /></label>
          <label>Breite m<input type="number" step="0.05" value={selectedObject.width} onChange={(event) => updateObject({ width: Number(event.target.value) })} /></label>
          <label>Tiefe m<input type="number" step="0.05" value={selectedObject.depth} onChange={(event) => updateObject({ depth: Number(event.target.value) })} /></label>
          <label>Höhe m<input type="number" step="0.05" value={selectedObject.height} onChange={(event) => updateObject({ height: Number(event.target.value) })} /></label>
          <label>Drehung °<input type="number" step="5" value={Math.round(selectedObject.rotation)} onChange={(event) => updateObject({ rotation: Number(event.target.value) })} /></label>
          <label>X m<input type="number" step="0.05" value={selectedObject.x} onChange={(event) => updateObject({ x: Number(event.target.value) })} /></label>
          <label>Y m<input type="number" step="0.05" value={selectedObject.y} onChange={(event) => updateObject({ y: Number(event.target.value) })} /></label>
        </div>}
        {selectedArea && <div className="prop">
          <label>Typ<select value={selectedArea.type} onChange={(event) => updateArea({ type: event.target.value as AreaType, material: event.target.value })}>{Object.keys(AREA_COLORS).map((key) => <option key={key}>{key}</option>)}</select></label>
          <label>Material<input value={selectedArea.material} onChange={(event) => updateArea({ material: event.target.value })} /></label>
          <label>Stärke m<input type="number" step="0.01" value={selectedArea.thickness} onChange={(event) => updateArea({ thickness: Number(event.target.value) })} /></label>
          <label>m²<input readOnly value={polygonArea(selectedArea.points).toFixed(2)} /></label>
        </div>}

        <hr />
        <h2>Upload / Download</h2>
        <div className="grid2">
          <button className="btn blue" onClick={exportProject}>.algreen export</button>
          <label className="file">.algreen import<input type="file" accept=".algreen,application/json" onChange={(event) => importProject(event.target.files?.[0] ?? null)} /></label>
          <label className="file">JPG/PNG Plan<input type="file" accept="image/jpeg,image/png" onChange={(event) => uploadBackground(event.target.files?.[0] ?? null)} /></label>
          <button className="btn" onClick={() => setBackground(null)} disabled={!background}>Plan entfernen</button>
          <button className="btn" onClick={() => exportPngOrJpg('png')}>PNG export</button>
          <button className="btn" onClick={() => exportPngOrJpg('jpeg')}>JPG export</button>
          <button className="btn" onClick={exportCsv}>CSV export</button>
          <button className="btn" onClick={saveBrowser}>Browser speichern</button>
          <button className="btn" onClick={loadBrowser}>Browser laden</button>
        </div>

        <hr />
        <h2>Objekte</h2>
        <div className="list">{objects.length === 0 ? <p>Keine Objekte vorhanden.</p> : objects.map((object, index) => <div key={object.id} className={`item ${object.id === selectedObjectId ? 'selected' : ''}`}><button onClick={() => { setSelectedObjectId(object.id); setSelectedAreaId(null); }}><strong>{index + 1}. {object.type}</strong><span>{object.width.toFixed(2)} × {object.depth.toFixed(2)} × {object.height.toFixed(2)} m · {object.material}</span></button></div>)}</div>

        <hr />
        <h2>Flächen</h2>
        <div className="list">{areas.length === 0 ? <p>Keine Flächen vorhanden.</p> : areas.map((area, index) => <div key={area.id} className={`item ${area.id === selectedAreaId ? 'selected' : ''}`}><button onClick={() => { setSelectedAreaId(area.id); setSelectedObjectId(null); }}><strong>{index + 1}. {area.type}</strong><span>{polygonArea(area.points).toFixed(2)} m² · {(polygonArea(area.points) * area.thickness).toFixed(2)} m³</span></button></div>)}</div>
      </aside>
    </section>
  );
}
