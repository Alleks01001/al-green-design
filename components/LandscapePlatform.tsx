'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type Point = { x: number; y: number };
type ViewMode = '2d' | '3d';
type Tab =
  | 'cad' | 'gis' | 'bim' | 'plants' | 'ai' | 'terrain' | 'water' | 'drainage'
  | 'lighting' | 'costs' | 'analysis' | 'growth' | 'chat' | 'saas' | 'roadmap' | 'project' | 'exports';
type Tool =
  | 'select' | 'rect' | 'circle' | 'line' | 'plant' | 'terrainMound' | 'terrainDepression'
  | 'terrainSlope' | 'terrainPoint' | 'irrigation' | 'drainage' | 'light';

type DesignObject = {
  id: number;
  kind: Tool;
  name: string;
  layer: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  radius: number;
  height: number;
  points: Point[];
  color: string;
  opacity: number;
  attrs: Record<string, any>;
};

type Plant = {
  id: number;
  german: string;
  botanical: string;
  family: string;
  type: string;
  hardinessZone: string;
  waterNeed: number;
  light: string;
  soil: string;
  growthRate: string;
  startHeight: number;
  startWidth: number;
  finalHeight: number;
  finalWidth: number;
  bloomTime: string;
  flowerColor: string;
  pruningTolerance: string;
  maintenance: string;
  insectFriendly: boolean;
  co2: number;
  biodiversity: number;
  price: number;
};

const SCALE = 45;

const PLANTS: Plant[] = [
  { id: 1, german: 'Felsenbirne', botanical: 'Amelanchier lamarckii', family: 'Rosaceae', type: 'Baum/Strauch', hardinessZone: '5-8', waterNeed: 2, light: 'Sonne/Halbschatten', soil: 'normal/frisch', growthRate: 'mittel', startHeight: 2.2, startWidth: 1.4, finalHeight: 6, finalWidth: 4.5, bloomTime: 'April', flowerColor: 'weiß', pruningTolerance: 'gut', maintenance: 'niedrig', insectFriendly: true, co2: 42, biodiversity: 88, price: 68 },
  { id: 2, german: 'Lavendel', botanical: 'Lavandula angustifolia', family: 'Lamiaceae', type: 'Staude', hardinessZone: '6-9', waterNeed: 1, light: 'Sonne', soil: 'trocken/durchlässig', growthRate: 'mittel', startHeight: .35, startWidth: .35, finalHeight: .65, finalWidth: .55, bloomTime: 'Juni-August', flowerColor: 'violett', pruningTolerance: 'sehr gut', maintenance: 'niedrig', insectFriendly: true, co2: 2, biodiversity: 80, price: 4.8 },
  { id: 3, german: 'Hainbuche', botanical: 'Carpinus betulus', family: 'Betulaceae', type: 'Hecke/Baum', hardinessZone: '4-8', waterNeed: 2, light: 'Sonne/Halbschatten/Schatten', soil: 'normal', growthRate: 'schnell', startHeight: 1.5, startWidth: .6, finalHeight: 12, finalWidth: 7, bloomTime: 'April-Mai', flowerColor: 'gelblich', pruningTolerance: 'sehr gut', maintenance: 'mittel', insectFriendly: true, co2: 95, biodiversity: 82, price: 18 },
  { id: 4, german: 'Salbei', botanical: 'Salvia nemorosa', family: 'Lamiaceae', type: 'Staude', hardinessZone: '5-9', waterNeed: 1, light: 'Sonne', soil: 'trocken/normal', growthRate: 'mittel', startHeight: .3, startWidth: .35, finalHeight: .55, finalWidth: .45, bloomTime: 'Juni-September', flowerColor: 'blauviolett', pruningTolerance: 'sehr gut', maintenance: 'niedrig', insectFriendly: true, co2: 2, biodiversity: 86, price: 4.2 },
  { id: 5, german: 'Kornelkirsche', botanical: 'Cornus mas', family: 'Cornaceae', type: 'Strauch/Baum', hardinessZone: '5-8', waterNeed: 2, light: 'Sonne/Halbschatten', soil: 'normal/trocken', growthRate: 'langsam', startHeight: 2.0, startWidth: 1.5, finalHeight: 6, finalWidth: 4, bloomTime: 'Februar-März', flowerColor: 'gelb', pruningTolerance: 'gut', maintenance: 'niedrig', insectFriendly: true, co2: 40, biodiversity: 91, price: 54 },
  { id: 6, german: 'Rosmarin', botanical: 'Salvia rosmarinus', family: 'Lamiaceae', type: 'Halbstrauch', hardinessZone: '7-10', waterNeed: 1, light: 'Sonne', soil: 'trocken/durchlässig', growthRate: 'langsam', startHeight: .35, startWidth: .35, finalHeight: 1.1, finalWidth: 1.0, bloomTime: 'April-Juni', flowerColor: 'blau', pruningTolerance: 'gut', maintenance: 'niedrig', insectFriendly: true, co2: 3, biodiversity: 74, price: 8.5 }
];

function areaOf(o: DesignObject) {
  if (o.kind === 'circle' || o.kind === 'plant' || o.kind === 'terrainMound' || o.kind === 'terrainDepression') return Math.PI * o.radius * o.radius;
  return Math.abs(o.width * o.depth);
}

function lineLength(points: Point[]) {
  return points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function csv(rows: any[][]) {
  return rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';')).join('\n');
}

export default function LandscapePlatform() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tab, setTab] = useState<Tab>('cad');
  const [view, setView] = useState<ViewMode>('2d');
  const [tool, setTool] = useState<Tool>('rect');
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState('Bereit: V0.12.1 FIX.');
  const [cam] = useState({ x: -12, y: -8, width: 28, height: 18 });
  const [prompt, setPrompt] = useState('Mediterraner Garten, 400 m², wenig Pflege, Pool vorhanden');
  const [chat, setChat] = useState('Ich habe zwei Kinder und wenig Zeit.');
  const [season, setSeason] = useState<'Frühling' | 'Sommer' | 'Herbst' | 'Winter'>('Sommer');
  const [growthYear, setGrowthYear] = useState<0 | 3 | 10 | 20>(0);
  const [nightMode, setNightMode] = useState(false);
  const [walkMode, setWalkMode] = useState(false);
  const [project, setProject] = useState({ location: 'Wien', light: 'Halbschatten', soil: 'trocken', care: 'pflegeleicht', budget: 5000, area: 400 });
  const [objects, setObjects] = useState<DesignObject[]>([
    { id: 1, kind: 'rect', name: 'Grundstück 400 m²', layer: 'Bestand', x: 0, y: 0, width: 20, depth: 20, radius: 0, height: .05, points: [], color: '#dcfce7', opacity: .55, attrs: { bim: 'Site', area: 400 } },
    { id: 2, kind: 'rect', name: 'Terrasse Naturstein', layer: 'Belag', x: -4, y: 4, width: 5, depth: 3, radius: 0, height: .12, points: [], color: '#a8a29e', opacity: .86, attrs: { material: 'Naturstein', unitPrice: 115 } },
    { id: 3, kind: 'plant', name: 'Felsenbirne', layer: 'Pflanzen', x: 4, y: -2, width: 0, depth: 0, radius: 1.1, height: 2.2, points: [], color: '#16a34a', opacity: .9, attrs: { plantId: 1 } },
    { id: 4, kind: 'terrainMound', name: 'runde Erhebung', layer: 'Gelände', x: -2, y: -3, width: 0, depth: 0, radius: 2, height: .8, points: [], color: '#a3e635', opacity: .68, attrs: { earthVolume: 4.2, costPerM3: 45 } }
  ]);

  const selectedObject = objects.find((o) => o.id === selected) || null;

  const plantSuggestions = useMemo(() => {
    const light = project.light.toLowerCase();
    const soil = project.soil.toLowerCase();
    return PLANTS
      .filter((p) => p.light.toLowerCase().includes(light.split('/')[0]) || project.light === 'egal' || p.light.includes('Halbschatten'))
      .filter((p) => p.soil.toLowerCase().includes(soil) || project.soil === 'egal')
      .filter((p) => project.care !== 'pflegeleicht' || p.maintenance === 'niedrig')
      .sort((a, b) => b.biodiversity + (b.waterNeed === 1 ? 10 : 0) - (a.biodiversity + (a.waterNeed === 1 ? 10 : 0)));
  }, [project]);

  const costs = useMemo(() => {
    const plants = objects.filter((o) => o.kind === 'plant').reduce((sum, o) => sum + (PLANTS.find((p) => p.id === Number(o.attrs.plantId))?.price ?? 25), 0);
    const paving = objects.filter((o) => o.layer === 'Belag').reduce((sum, o) => sum + areaOf(o) * Number(o.attrs.unitPrice ?? 85), 0);
    const earth = objects.filter((o) => ['terrainMound', 'terrainDepression', 'terrainSlope'].includes(o.kind)).reduce((sum, o) => sum + Number(o.attrs.earthVolume ?? areaOf(o) * Math.abs(o.height) * .45) * Number(o.attrs.costPerM3 ?? 45), 0);
    const water = objects.filter((o) => o.kind === 'irrigation').reduce((sum, o) => sum + lineLength(o.points) * 9 + 180, 0);
    const light = objects.filter((o) => o.kind === 'light').length * 185;
    const labor = (plants + paving + earth + water + light) * .28;
    return { plants, paving, earth, water, light, labor, total: plants + paving + earth + water + light + labor };
  }, [objects]);

  const eco = useMemo(() => {
    const plantObjects = objects.filter((o) => o.kind === 'plant');
    const plantData = plantObjects.map((o) => PLANTS.find((p) => p.id === Number(o.attrs.plantId))).filter(Boolean) as Plant[];
    const biodiversity = plantData.length ? plantData.reduce((s, p) => s + p.biodiversity, 0) / plantData.length : 40;
    const co2 = plantData.reduce((s, p) => s + p.co2, 0);
    const hard = objects.filter((o) => o.layer === 'Belag').reduce((s, o) => s + areaOf(o), 0);
    const green = objects.filter((o) => o.layer === 'Pflanzen' || o.name.toLowerCase().includes('rasen')).reduce((s, o) => s + Math.max(areaOf(o), 1), 0);
    const sealed = Math.min(100, Math.round((hard / Math.max(1, hard + green)) * 100));
    const rain = Math.max(0, Math.min(100, 100 - sealed + objects.filter((o) => o.kind === 'drainage').length * 12));
    const heat = Math.max(0, Math.min(100, green * 2 + plantObjects.length * 4));
    return { biodiversity: Math.round(biodiversity), co2: Math.round(co2), sealed, rain, heat, score: Math.round((biodiversity + rain + heat + (100 - sealed)) / 4) };
  }, [objects]);

  function pointFromEvent(e: React.MouseEvent<SVGSVGElement>): Point {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = cam.x + ((e.clientX - rect.left) / rect.width) * cam.width;
    const y = cam.y + ((e.clientY - rect.top) / rect.height) * cam.height;
    return { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 };
  }

  function addAt(p: Point) {
    const id = Date.now();
    const base = { id, layer: activeLayer(tool), x: p.x, y: p.y, points: [] as Point[], opacity: .82, attrs: {} as Record<string, any> };
    if (tool === 'rect') setObjects((v) => [...v, { ...base, kind: 'rect', name: 'Fläche / Belag', width: 3, depth: 2, radius: 0, height: .08, color: '#a7f3d0' }]);
    if (tool === 'circle') setObjects((v) => [...v, { ...base, kind: 'circle', name: 'Kreisfläche', width: 0, depth: 0, radius: 1, height: .08, color: '#93c5fd' }]);
    if (tool === 'plant') {
      const p0 = plantSuggestions[0] || PLANTS[0];
      setObjects((v) => [...v, { ...base, kind: 'plant', layer: 'Pflanzen', name: p0.german, width: p0.startWidth, depth: p0.startWidth, radius: Math.max(.25, p0.startWidth / 2), height: p0.startHeight, color: '#16a34a', attrs: { plantId: p0.id, finalHeight: p0.finalHeight, finalWidth: p0.finalWidth } }]);
    }
    if (tool === 'terrainMound') setObjects((v) => [...v, { ...base, kind: 'terrainMound', layer: 'Gelände', name: 'runde Erhebung', width: 0, depth: 0, radius: 1.8, height: .8, color: '#a3e635', opacity: .68, attrs: { earthVolume: 3.5, costPerM3: 45 } }]);
    if (tool === 'terrainDepression') setObjects((v) => [...v, { ...base, kind: 'terrainDepression', layer: 'Gelände', name: 'Mulde / Senke', width: 0, depth: 0, radius: 1.6, height: -.55, color: '#60a5fa', opacity: .55, attrs: { earthVolume: 2.8, costPerM3: 48 } }]);
    if (tool === 'terrainSlope') setObjects((v) => [...v, { ...base, kind: 'terrainSlope', layer: 'Gelände', name: 'Böschung / Rampe', width: 4, depth: 2, radius: 0, height: .9, color: '#d9a441', opacity: .72, attrs: { startHeight: 0, endHeight: .9, earthVolume: 3.6, costPerM3: 46 } }]);
    if (tool === 'terrainPoint') setObjects((v) => [...v, { ...base, kind: 'terrainPoint', layer: 'Gelände', name: 'Höhenpunkt', width: 0, depth: 0, radius: .18, height: 1, color: '#7c3aed', attrs: { height: 1 } }]);
    if (tool === 'irrigation') setObjects((v) => [...v, { ...base, kind: 'irrigation', layer: 'Bewässerung', name: 'Tropfleitung', width: 0, depth: 0, radius: 0, height: 0, color: '#2563eb', points: [p, { x: p.x + 4, y: p.y }], attrs: { diameter: 16, pressure: 2.2 } }]);
    if (tool === 'drainage') setObjects((v) => [...v, { ...base, kind: 'drainage', layer: 'Regenwasser', name: 'Drainage / Rinne', width: 0, depth: 0, radius: 0, height: 0, color: '#0f766e', points: [p, { x: p.x + 3, y: p.y + 1 }], attrs: { retentionM3: 1.2 } }]);
    if (tool === 'light') setObjects((v) => [...v, { ...base, kind: 'light', layer: 'Licht', name: 'Bodenstrahler', width: 0, depth: 0, radius: .3, height: .8, color: '#f59e0b', attrs: { lux: 120, powerW: 6 } }]);
    setSelected(id);
  }

  function activeLayer(t: Tool) {
    if (t === 'plant') return 'Pflanzen';
    if (t.startsWith('terrain')) return 'Gelände';
    if (t === 'irrigation') return 'Bewässerung';
    if (t === 'drainage') return 'Regenwasser';
    if (t === 'light') return 'Licht';
    return 'Entwurf';
  }

  function handleCanvas(e: React.MouseEvent<SVGSVGElement>) {
    if (tool === 'select') return;
    addAt(pointFromEvent(e));
  }

  function generateDesign() {
    const base = Date.now();
    const newObjects: DesignObject[] = [
      { id: base + 1, kind: 'rect', name: 'KI Sitzbereich', layer: 'Belag', x: -4, y: 3, width: 5, depth: 3, radius: 0, height: .12, points: [], color: '#a8a29e', opacity: .86, attrs: { unitPrice: 115, material: 'Naturstein hell' } },
      { id: base + 2, kind: 'rect', name: 'pflegeleichte Pflanzfläche', layer: 'Pflanzen', x: 2, y: -3, width: 7, depth: 2.5, radius: 0, height: .06, points: [], color: '#bbf7d0', opacity: .65, attrs: { maintenance: 'niedrig' } },
      { id: base + 3, kind: 'irrigation', name: 'KI Tropfleitung', layer: 'Bewässerung', x: 0, y: 0, width: 0, depth: 0, radius: 0, height: 0, points: [{ x: -2, y: -4 }, { x: 2, y: -4 }, { x: 5, y: -3 }], color: '#2563eb', opacity: 1, attrs: { diameter: 16, pressure: 2.1 } },
      { id: base + 4, kind: 'light', name: 'KI Akzentlicht', layer: 'Licht', x: -5.5, y: 2, width: 0, depth: 0, radius: .3, height: .8, points: [], color: '#f59e0b', opacity: .9, attrs: { lux: 180 } }
    ];
    plantSuggestions.slice(0, 4).forEach((plant, pi) => {
      const count = pi === 0 ? 2 : pi === 1 ? 8 : 5;
      for (let i = 0; i < count; i += 1) {
        newObjects.push({
          id: base + 100 + pi * 20 + i,
          kind: 'plant',
          name: plant.german,
          layer: 'Pflanzen',
          x: -1 + pi * 1.35 + (i % 4) * .5,
          y: -3.4 + Math.floor(i / 4) * .5,
          width: plant.startWidth,
          depth: plant.startWidth,
          radius: Math.max(.18, plant.startWidth / 2),
          height: plant.startHeight,
          points: [],
          color: '#16a34a',
          opacity: .9,
          attrs: { plantId: plant.id, finalHeight: plant.finalHeight, finalWidth: plant.finalWidth }
        });
      }
    });
    setObjects((v) => [...v, ...newObjects]);
    setStatus('KI-Design erzeugt: Layout, Pflanzen, Bewässerung, Licht und Kosten.');
  }

  function applyChat() {
    const text = chat.toLowerCase();
    if (text.includes('kinder')) setStatus('Chat erkannt: Kinder → mehr Rasen/Spielbereich, giftige Pflanzen vermeiden, Schatten priorisieren.');
    else if (text.includes('wenig zeit') || text.includes('pflege')) setStatus('Chat erkannt: Pflegeaufwand reduzieren, trockentolerante Pflanzen bevorzugen.');
    else setStatus('Chat ausgewertet. Regeln können erweitert werden.');
  }

  function updateSelected(patch: Partial<DesignObject>) {
    if (!selectedObject) return;
    setObjects((v) => v.map((o) => o.id === selectedObject.id ? { ...o, ...patch } : o));
  }

  function updateAttr(key: string, value: any) {
    if (!selectedObject) return;
    setObjects((v) => v.map((o) => o.id === selectedObject.id ? { ...o, attrs: { ...o.attrs, [key]: value } } : o));
  }

  function exportProject() {
    download('al-green-design-v0121-fix.algreen', JSON.stringify({ version: '0.12.1', project, objects, season, growthYear }, null, 2), 'application/json');
  }

  function exportCsv() {
    download('kosten-v0121.csv', csv([
      ['Bereich', 'Kosten'],
      ['Pflanzen', costs.plants.toFixed(2)],
      ['Pflaster/Beläge', costs.paving.toFixed(2)],
      ['Erdarbeiten', costs.earth.toFixed(2)],
      ['Bewässerung', costs.water.toFixed(2)],
      ['Licht', costs.light.toFixed(2)],
      ['Lohn', costs.labor.toFixed(2)],
      ['Gesamt', costs.total.toFixed(2)]
    ]), 'text/csv;charset=utf-8');
  }

  function exportGeoJson() {
    const features = objects.map((o) => ({
      type: 'Feature',
      properties: { id: o.id, name: o.name, layer: o.layer, kind: o.kind, ...o.attrs },
      geometry: o.points.length ? { type: 'LineString', coordinates: o.points.map((p) => [p.x, p.y]) } : { type: 'Point', coordinates: [o.x, o.y] }
    }));
    download('al-green-design-v0121.geojson', JSON.stringify({ type: 'FeatureCollection', features }, null, 2), 'application/geo+json');
  }

  const tabButtons: [Tab, string][] = [
    ['cad', 'CAD'], ['plants', 'Pflanzen'], ['ai', 'KI-Design'], ['terrain', 'Gelände'], ['water', 'Wasser'], ['drainage', 'Regen'], ['lighting', 'Licht'], ['costs', 'Kosten'], ['analysis', 'Analyse'], ['growth', 'Wachstum'], ['chat', 'Chat'], ['saas', 'SaaS'], ['roadmap', 'Technik'], ['project', 'Projekt'], ['exports', 'Export'], ['gis', 'GIS'], ['bim', 'BIM']
  ];

  return (
    <section className="platform">
      <aside className="panel">
        <h2>Module</h2>
        <div className="grid2">
          {tabButtons.map(([id, label]) => <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
        </div>
        <hr />

        {tab === 'cad' && (
          <>
            <h2>Werkzeuge</h2>
            <div className="grid2">
              {([
                ['select', 'Auswählen'], ['rect', 'Rechteck'], ['circle', 'Kreis'], ['plant', 'Pflanze'],
                ['terrainMound', 'Erhebung'], ['terrainDepression', 'Mulde'], ['terrainSlope', 'Böschung'],
                ['terrainPoint', 'Höhenpunkt'], ['irrigation', 'Bewässerung'], ['drainage', 'Drainage'], ['light', 'Licht']
              ] as [Tool, string][]).map(([id, label]) => (
                <button key={id} className={`tool ${tool === id ? 'active' : ''}`} onClick={() => setTool(id)}>{label}</button>
              ))}
            </div>
            <div className="hint">Werkzeug wählen und in den 2D-Plan klicken. In 3D wird daraus ein Modell.</div>
          </>
        )}

        {tab === 'plants' && (
          <>
            <h2>Intelligente Pflanzvorschläge</h2>
            <div className="form">
              <label>Standort<input value={project.location} onChange={(e) => setProject({ ...project, location: e.target.value })} /></label>
              <label>Licht<select value={project.light} onChange={(e) => setProject({ ...project, light: e.target.value })}><option>Sonne</option><option>Halbschatten</option><option>Schatten</option><option>egal</option></select></label>
              <label>Boden<select value={project.soil} onChange={(e) => setProject({ ...project, soil: e.target.value })}><option>trocken</option><option>normal</option><option>frisch</option><option>feucht</option><option>egal</option></select></label>
              <label>Budget €<input type="number" value={project.budget} onChange={(e) => setProject({ ...project, budget: Number(e.target.value) })} /></label>
            </div>
            <div className="list" style={{ marginTop: 8 }}>
              {plantSuggestions.map((p) => (
                <div className="item" key={p.id}>
                  <strong>{p.german}</strong>
                  <span>{p.botanical} · Zone {p.hardinessZone} · {p.light} · Wasser {p.waterNeed}/5 · Endgröße {p.finalHeight}×{p.finalWidth} m · {p.bloomTime} {p.flowerColor} · CO₂ {p.co2} · Bio {p.biodiversity}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'ai' && (
          <>
            <h2>KI-Designgenerator</h2>
            <textarea className="full" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <button className="btn primary" style={{ marginTop: 8 }} onClick={generateDesign}>KI-Design erzeugen</button>
            <div className="hint">Regelbasierter Prototyp: erzeugt Layout, Pflanzen, Sitzbereich, Licht, Bewässerung und Kosten.</div>
          </>
        )}

        {tab === 'growth' && (
          <>
            <h2>Wachstumsprognose</h2>
            <div className="grid2">
              {[0, 3, 10, 20].map((year) => <button key={year} className={`btn ${growthYear === year ? 'active' : ''}`} onClick={() => setGrowthYear(year as 0 | 3 | 10 | 20)}>{year === 0 ? 'heute' : `${year} Jahre`}</button>)}
            </div>
            <div className="hint">Die 3D-Pflanzen wachsen je nach Prognosejahr.</div>
          </>
        )}

        {tab === 'lighting' && (
          <>
            <h2>3D Licht / Ansicht</h2>
            <div className="grid2">
              <button className={`btn ${nightMode ? 'active' : ''}`} onClick={() => setNightMode(!nightMode)}>Nachtmodus</button>
              <button className={`btn ${walkMode ? 'active' : ''}`} onClick={() => setWalkMode(!walkMode)}>Walk-Modus</button>
            </div>
            <label className="small">Jahreszeit</label>
            <select style={{ width: '100%', marginTop: 6 }} value={season} onChange={(e) => setSeason(e.target.value as any)}>
              <option>Frühling</option><option>Sommer</option><option>Herbst</option><option>Winter</option>
            </select>
          </>
        )}

        {tab === 'chat' && (
          <>
            <h2>Garten-Chat</h2>
            <textarea className="full" value={chat} onChange={(e) => setChat(e.target.value)} />
            <button className="btn primary" style={{ marginTop: 8 }} onClick={applyChat}>Chat auswerten</button>
          </>
        )}

        {tab === 'saas' && <SaasBox />}
        {tab === 'roadmap' && <RoadmapBox />}
        {tab === 'exports' && (
          <>
            <h2>Export</h2>
            <div className="grid2">
              <button className="btn blue" onClick={exportProject}>.algreen</button>
              <button className="btn" onClick={exportCsv}>Kosten CSV</button>
              <button className="btn" onClick={exportGeoJson}>GeoJSON</button>
            </div>
          </>
        )}
        {['terrain','water','drainage','costs','analysis','project','gis','bim'].includes(tab) && <InfoModule tab={tab} />}
      </aside>

      <div className="workspace">
        <div className="topbar">
          <span className="pill">V0.12.1 FIX</span>
          <span className="pill">{tab.toUpperCase()}</span>
          <span className="pill">{season}</span>
          <span className="pill">{growthYear === 0 ? 'heute' : `${growthYear} Jahre`}</span>
          <button className={`pill ${view === '2d' ? 'active' : ''}`} onClick={() => setView('2d')}>2D</button>
          <button className={`pill ${view === '3d' ? 'active' : ''}`} onClick={() => setView('3d')}>3D</button>
        </div>
        {view === '2d' ? (
          <svg ref={svgRef} className="canvas" viewBox={`${cam.x * SCALE} ${cam.y * SCALE} ${cam.width * SCALE} ${cam.height * SCALE}`} onClick={handleCanvas}>
            <Grid />
            {objects.map((o) => <Object2D key={o.id} o={o} selected={selected === o.id} onSelect={(e: any) => { e.stopPropagation(); setSelected(o.id); setStatus(`${o.name} ausgewählt.`); }} />)}
          </svg>
        ) : (
          <ThreeView objects={objects} selected={selected} setSelected={setSelected} setStatus={setStatus} season={season} growthYear={growthYear} nightMode={nightMode} walkMode={walkMode} />
        )}
        <div className="status"><span>{status}</span><span>{objects.length} Objekte · {view}</span></div>
      </div>

      <aside className="panel">
        <h2>Kennzahlen</h2>
        <div className="kpis">
          <div className="kpi"><small>Pflanzen</small><strong>{costs.plants.toFixed(0)} €</strong></div>
          <div className="kpi"><small>Erdarbeiten</small><strong>{costs.earth.toFixed(0)} €</strong></div>
          <div className="kpi"><small>Beläge</small><strong>{costs.paving.toFixed(0)} €</strong></div>
          <div className="kpi"><small>Projektkosten</small><strong>{costs.total.toFixed(0)} €</strong></div>
          <div className="kpi"><small>Öko-Score</small><strong>{eco.score}/100</strong></div>
          <div className="kpi"><small>CO₂</small><strong>{eco.co2} kg</strong></div>
        </div>
        <hr />
        <h2>Objekt / BIM</h2>
        {!selectedObject && <p>Objekt anklicken, um Daten zu bearbeiten.</p>}
        {selectedObject && (
          <div className="form">
            <label>Name<input value={selectedObject.name} onChange={(e) => updateSelected({ name: e.target.value })} /></label>
            <label>Layer<input value={selectedObject.layer} onChange={(e) => updateSelected({ layer: e.target.value })} /></label>
            <label>Breite<input type="number" step=".1" value={selectedObject.width} onChange={(e) => updateSelected({ width: Number(e.target.value) })} /></label>
            <label>Tiefe<input type="number" step=".1" value={selectedObject.depth} onChange={(e) => updateSelected({ depth: Number(e.target.value) })} /></label>
            <label>Radius<input type="number" step=".1" value={selectedObject.radius} onChange={(e) => updateSelected({ radius: Number(e.target.value) })} /></label>
            <label>Höhe<input type="number" step=".1" value={selectedObject.height} onChange={(e) => updateSelected({ height: Number(e.target.value) })} /></label>
            <label>Erdmasse m³<input type="number" step=".1" value={Number(selectedObject.attrs.earthVolume ?? 0)} onChange={(e) => updateAttr('earthVolume', Number(e.target.value))} /></label>
            <label>Kosten €/m³<input type="number" step="1" value={Number(selectedObject.attrs.costPerM3 ?? 45)} onChange={(e) => updateAttr('costPerM3', Number(e.target.value))} /></label>
            <button className="btn danger" onClick={() => { setObjects((v) => v.filter((o) => o.id !== selectedObject.id)); setSelected(null); }}>Löschen</button>
            <button className="btn warn" onClick={() => setObjects((v) => [...v, { ...selectedObject, id: Date.now(), x: selectedObject.x + 1, y: selectedObject.y + 1, name: selectedObject.name + ' Kopie' }])}>Duplizieren</button>
          </div>
        )}
        <hr />
        <h2>Öko-Analyse</h2>
        {[
          ['Biodiversität', eco.biodiversity],
          ['Regenrückhalt', eco.rain],
          ['Hitzeschutz', eco.heat],
          ['Entsiegelung', 100 - eco.sealed]
        ].map(([label, val]) => (
          <div className="item" key={label as string}>
            <strong>{label}: {val}</strong>
            <div className="score"><span style={{ width: `${val}%` }} /></div>
          </div>
        ))}
      </aside>
    </section>
  );
}

function Grid() {
  const lines = [];
  for (let x = -100; x <= 100; x += .5) lines.push(<line key={'v' + x} x1={x * SCALE} y1={-100 * SCALE} x2={x * SCALE} y2={100 * SCALE} stroke={x % 1 === 0 ? '#cbd5e1' : '#e2e8f0'} strokeWidth={x % 1 === 0 ? 1 : .6} />);
  for (let y = -100; y <= 100; y += .5) lines.push(<line key={'h' + y} x1={-100 * SCALE} y1={y * SCALE} x2={100 * SCALE} y2={y * SCALE} stroke={y % 1 === 0 ? '#cbd5e1' : '#e2e8f0'} strokeWidth={y % 1 === 0 ? 1 : .6} />);
  return <g>{lines}<line x1={-100 * SCALE} y1={0} x2={100 * SCALE} y2={0} stroke="#94a3b8" strokeWidth={2} /><line x1={0} y1={-100 * SCALE} x2={0} y2={100 * SCALE} stroke="#94a3b8" strokeWidth={2} /></g>;
}

function Object2D({ o, selected, onSelect }: { o: DesignObject; selected: boolean; onSelect: any }) {
  const stroke = selected ? '#f59e0b' : '#0f172a';
  const sw = selected ? 4 : 2;
  if (o.points.length > 1) {
    return <g onClick={onSelect}><polyline points={o.points.map((p) => `${p.x * SCALE},${p.y * SCALE}`).join(' ')} fill="none" stroke={o.color} strokeWidth={sw + 1} strokeDasharray={o.kind === 'drainage' ? '6 5' : ''} /><text x={o.points[0].x * SCALE} y={(o.points[0].y - .2) * SCALE} fontSize={12} paintOrder="stroke" stroke="#fff" strokeWidth={3}>{o.name}</text></g>;
  }
  if (o.kind === 'rect' || o.kind === 'terrainSlope') {
    return <g onClick={onSelect}><rect x={(o.x - o.width / 2) * SCALE} y={(o.y - o.depth / 2) * SCALE} width={o.width * SCALE} height={o.depth * SCALE} fill={o.color} fillOpacity={o.opacity} stroke={stroke} strokeWidth={sw} strokeDasharray={o.kind === 'terrainSlope' ? '8 5' : ''} /><text x={o.x * SCALE} y={o.y * SCALE} fontSize={13} textAnchor="middle" fontWeight="700" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{o.name}</text></g>;
  }
  return <g onClick={onSelect}><circle cx={o.x * SCALE} cy={o.y * SCALE} r={Math.max(o.radius, .18) * SCALE} fill={o.color} fillOpacity={o.opacity} stroke={stroke} strokeWidth={sw} strokeDasharray={o.kind.startsWith('terrain') ? '8 5' : ''} /><text x={o.x * SCALE} y={(o.y + Math.max(o.radius, .3) + .25) * SCALE} fontSize={12} textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{o.name}</text></g>;
}

function ThreeView(props: { objects: DesignObject[]; selected: number | null; setSelected: (id: number | null) => void; setStatus: (s: string) => void; season: string; growthYear: number; nightMode: boolean; walkMode: boolean }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(props.nightMode ? 0x0f172a : 0xdbeafe);
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, .1, 1000);
    camera.position.set(props.walkMode ? 6 : 14, props.walkMode ? 2.1 : 13, props.walkMode ? 9 : 18);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(props.nightMode ? 0x9db4ff : 0xffffff, props.nightMode ? .35 : .82));
    const sun = new THREE.DirectionalLight(props.nightMode ? 0x94a3b8 : 0xffffff, props.nightMode ? .35 : 1.25);
    sun.position.set(9, 16, 10);
    scene.add(sun);
    scene.add(new THREE.GridHelper(60, 60, 0x64748b, 0xcbd5e1));

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: props.nightMode ? 0x1e293b : 0xf8fafc, roughness: .95 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    let frame = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    };
    loop();

    const resize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [props.nightMode, props.walkMode]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    while (group.children.length) group.remove(group.children[0]);
    props.objects.forEach((o) => group.add(make3D(o, props.selected === o.id, props.season, props.growthYear)));
  }, [props.objects, props.selected, props.season, props.growthYear]);

  return <div ref={mountRef} className="three" />;
}

function material(color: string, opacity = 1) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), transparent: opacity < 1, opacity, roughness: .72 });
}

function make3D(o: DesignObject, selected: boolean, season: string, growthYear: number) {
  const group = new THREE.Group();
  const op = Math.max(.25, o.opacity);
  if (o.kind === 'rect') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(o.width, .1), Math.max(o.height, .06), Math.max(o.depth, .1)), material(o.color, op));
    mesh.position.set(o.x, Math.max(o.height, .06) / 2, o.y);
    group.add(mesh);
  } else if (o.kind === 'plant') {
    const plant = PLANTS.find((p) => p.id === Number(o.attrs.plantId));
    const finalHeight = plant?.finalHeight ?? Number(o.attrs.finalHeight ?? o.height);
    const factor = growthYear === 0 ? 1 : growthYear === 3 ? 1.25 : growthYear === 10 ? Math.min(2.2, finalHeight / Math.max(o.height, .1) * .75) : Math.min(3, finalHeight / Math.max(o.height, .1));
    const h = Math.max(.35, o.height * factor);
    const r = Math.max(.22, o.radius * (growthYear === 0 ? 1 : growthYear === 3 ? 1.2 : growthYear === 10 ? 1.65 : 2.1));
    const leaf = season === 'Herbst' ? '#d97706' : season === 'Winter' ? '#94a3b8' : season === 'Frühling' ? '#22c55e' : '#16a34a';
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.08, .14, Math.max(.5, h * .35), 12), material('#7c2d12'));
    trunk.position.set(o.x, Math.max(.5, h * .35) / 2, o.y);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), material(leaf, season === 'Winter' ? .45 : .9));
    crown.position.set(o.x, h * .65, o.y);
    group.add(trunk, crown);
  } else if (o.kind === 'terrainMound' || o.kind === 'terrainDepression') {
    const geo = new THREE.SphereGeometry(Math.max(o.radius, .2), 32, 16, 0, Math.PI * 2, o.kind === 'terrainDepression' ? Math.PI / 2 : 0, Math.PI / 2);
    const mesh = new THREE.Mesh(geo, material(o.color, op));
    mesh.scale.y = Math.max(.1, Math.abs(o.height));
    mesh.position.set(o.x, o.kind === 'terrainDepression' ? .02 : 0, o.y);
    group.add(mesh);
  } else if (o.kind === 'terrainSlope') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(o.width, .1), .18, Math.max(o.depth, .1)), material(o.color, op));
    mesh.position.set(o.x, Math.max(.1, o.height) / 2, o.y);
    mesh.rotation.z = o.height * .08;
    group.add(mesh);
  } else if (o.points.length > 1) {
    for (let i = 0; i < o.points.length - 1; i += 1) {
      const a = o.points[i], b = o.points[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, len, 12), material(o.color));
      tube.position.set((a.x + b.x) / 2, .09, (a.y + b.y) / 2);
      tube.rotation.z = Math.PI / 2;
      tube.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x);
      group.add(tube);
    }
  } else {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(o.radius, .18), Math.max(o.radius, .18), Math.max(o.height, .1), 24), material(o.color, op));
    mesh.position.set(o.x, Math.max(o.height, .1) / 2, o.y);
    group.add(mesh);
  }
  if (selected) {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 12), material('#f59e0b'));
    marker.position.set(o.x || 0, 1.5, o.y || 0);
    group.add(marker);
  }
  return group;
}

function InfoModule({ tab }: { tab: string }) {
  const text: Record<string, string> = {
    terrain: 'Gelände: Erhebungen, Mulden, Böschungen, Höhenpunkte, Abtrag/Auftrag und Erdmassen.',
    water: 'Bewässerung: Tropfleitungen, Druck, Rohrlängen, Wasserbedarf je Pflanze.',
    drainage: 'Regenwasser: Drainagen, Retention, Zisternenvolumen und Versickerung.',
    costs: 'Kosten: Pflanzen, Erdarbeiten, Bewässerung, Beläge, Licht und Arbeitsstunden.',
    analysis: 'Analyse: Biodiversität, CO₂, Versiegelung, Regenrückhalt und Hitzeschutz.',
    project: 'Projekt: Standort, Budget, Kundendaten, Versionen und Aufgaben.',
    gis: 'GIS: GeoJSON vorbereitet, später OSM/PostGIS/WMS/SHP.',
    bim: 'BIM: Jedes Objekt besitzt Attribute, Material, Kosten und Klassifizierung.'
  };
  return <div><h2>{tab.toUpperCase()}</h2><div className="hint">{text[tab]}</div></div>;
}

function SaasBox() {
  return <div><h2>SaaS-Modell</h2><div className="list"><div className="item"><strong>Free</strong><span>2D-Gartenplanung, einfache Pflanzen</span></div><div className="item"><strong>Pro</strong><span>KI-Design, 3D, Kosten, Export</span></div><div className="item"><strong>Enterprise</strong><span>CAD, BIM, GIS, Teamarbeit, Ausschreibung</span></div></div></div>;
}

function RoadmapBox() {
  return <div><h2>Technik</h2><div className="list">{['React', 'TypeScript', 'Three.js', 'PostgreSQL + PostGIS', 'OpenStreetMap', 'AI Design Agent', 'Plant Database API', 'DXF Import/Export', 'IFC Support'].map((x) => <div className="item" key={x}><strong>{x}</strong></div>)}</div></div>;
}
