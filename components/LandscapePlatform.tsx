
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type ViewMode = '2d' | '3d';
type Tab = 'chat' | 'image' | 'terrain' | 'architecture' | 'scene' | 'export';
type Tool = 'select' | 'mound' | 'depression' | 'plantZone' | 'hardscape' | 'building' | 'pool' | 'pergola' | 'wall' | 'stairs' | 'tree' | 'shrub' | 'hedge';
type SelectedKind = 'terrain' | 'zone' | 'object' | null;

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

type GardenObjectType = 'building' | 'pool' | 'pergola' | 'wall' | 'stairs' | 'tree' | 'shrub' | 'hedge';

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

function worldFromEvent(svg: SVGSVGElement | null, e: React.MouseEvent<SVGSVGElement>) {
  const rect = svg?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  const x = VIEWBOX.x + ((e.clientX - rect.left) / rect.width) * VIEWBOX.width;
  const y = VIEWBOX.y + ((e.clientY - rect.top) / rect.height) * VIEWBOX.height;
  return { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 };
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

export default function LandscapePlatform() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tab, setTab] = useState<Tab>('architecture');
  const [view, setView] = useState<ViewMode>('2d');
  const [tool, setTool] = useState<Tool>('select');
  const [status, setStatus] = useState('Bereit: Architektur- oder Gartenwerkzeug wählen.');
  const [chat, setChat] = useState('Erstelle ein sanftes Gelände mit zwei Hügeln, einer Terrasse im Süden und einem modernen Glashaus im Norden.');
  const [image, setImage] = useState<{ name: string; dataUrl: string; width: number; height: number } | null>(null);

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
    { id: 208, type: 'stairs', name: 'Stufen', x: -2.5, y: -2.0, width: 2.2, depth: 1.4, height: 0.9, rotation: 0, color: '#c8b6a6' }
  ]);

  const [selectedKind, setSelectedKind] = useState<SelectedKind>('object');
  const [selectedId, setSelectedId] = useState<number | null>(201);

  const selectedBlob = selectedKind === 'terrain' ? terrainBlobs.find(b => b.id === selectedId) || null : null;
  const selectedZone = selectedKind === 'zone' ? zones.find(z => z.id === selectedId) || null : null;
  const selectedObject = selectedKind === 'object' ? objects.find(o => o.id === selectedId) || null : null;
  const stats = useMemo(() => terrainStats(terrainBlobs), [terrainBlobs]);

  const metrics = useMemo(() => {
    const greenArea = zones.filter(z => z.kind === 'plantZone').reduce((s, z) => s + z.width * z.depth, 0);
    const hardArea = zones.filter(z => z.kind === 'hardscape').reduce((s, z) => s + z.width * z.depth, 0) + objects.filter(o => ['building','pool','pergola','stairs'].includes(o.type)).reduce((s, o) => s + o.width * o.depth, 0);
    const plantCount = objects.filter(o => ['tree','shrub','hedge'].includes(o.type)).length;
    const sealed = clamp(Math.round(hardArea / Math.max(1, hardArea + greenArea) * 100), 0, 100);
    const biodiversity = clamp(Math.round(45 + greenArea * 1.4 + plantCount * 4 - sealed * 0.2), 0, 100);
    return { greenArea, hardArea, plantCount, sealed, biodiversity };
  }, [zones, objects]);

  function setSelection(kind: SelectedKind, id: number | null, message?: string) {
    setSelectedKind(kind);
    setSelectedId(id);
    if (message) setStatus(message);
  }

  function addObject(type: GardenObjectType, x: number, y: number) {
    const id = Date.now();
    const presets: Record<GardenObjectType, Partial<GardenObject>> = {
      building: { name: 'Neues Gebäude', width: 4.0, depth: 3.0, height: 3.2, color: '#d6c4a7' },
      pool: { name: 'Neuer Pool', width: 4.2, depth: 2.4, height: 1.3, color: '#38bdf8' },
      pergola: { name: 'Neue Pergola', width: 3.0, depth: 2.4, height: 2.6, color: '#8b5e3c' },
      wall: { name: 'Neue Mauer', width: 3.0, depth: 0.25, height: 1.0, color: '#9ca3af' },
      stairs: { name: 'Neue Stufen', width: 2.2, depth: 1.4, height: 0.9, color: '#c8b6a6' },
      tree: { name: 'Neuer Baum', width: 1.4, depth: 1.4, height: 4.0, color: '#16a34a' },
      shrub: { name: 'Neuer Strauch', width: 1.0, depth: 1.0, height: 1.2, color: '#22c55e' },
      hedge: { name: 'Neue Hecke', width: 3.5, depth: 0.6, height: 1.5, color: '#15803d' }
    };
    const obj: GardenObject = { id, type, x, y, rotation: 0, note: '', ...(presets[type] as any) };
    setObjects(v => [...v, obj]);
    setSelection('object', id, `${obj.name} gesetzt.`);
  }

  function handleCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    const p = worldFromEvent(svgRef.current, e);
    if (tool === 'select') {
      setSelection(null, null, 'Auswahl aufgehoben.');
      return;
    }
    if (tool === 'mound' || tool === 'depression') {
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
      const id = Date.now();
      const zone: Zone = { id, kind: tool, name: tool === 'plantZone' ? 'Neue Pflanzzone' : 'Neue Belagsfläche', x: p.x, y: p.y, width: 3.4, depth: 2.0, color: tool === 'plantZone' ? '#a7f3d0' : '#b8b0a2' };
      setZones(v => [...v, zone]);
      setSelection('zone', id, `${zone.name} gesetzt.`);
      return;
    }
    addObject(tool as GardenObjectType, p.x, p.y);
  }

  function uploadImage(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () => {
        setImage({ name: file.name, dataUrl, width: img.width, height: img.height });
        setStatus('Bild hochgeladen. Jetzt KI-Bildanalyse starten.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
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
      setTerrainBlobs(blobs.length ? blobs : terrainBlobs);
      if (newZones.length) setZones(newZones.slice(0, 18));
      setSelection('terrain', blobs[0]?.id ?? null, `KI-Bildanalyse fertig: ${blobs.length} Terrain-Formen und ${newZones.length} Zonen erzeugt.`);
    };
    img.src = image.dataUrl;
  }

  function generateFromChat() {
    const text = chat.toLowerCase();
    const base = Date.now();

    const generatedBlobs: TerrainBlob[] = [];
    const generatedZones: Zone[] = [];
    const generatedObjects: GardenObject[] = [];

    // 1. Gelände-Erkennung
    if (text.includes('zwei erhebungen') || text.includes('zwei hügel') || text.includes('hügel') || text.includes('erhebung')) {
      generatedBlobs.push(
        { id: base + 1, name: 'KI Hügel Nord', x: -3.8, y: -2.5, radius: 2.8, height: 1.1, softness: 1.55, source: 'KI-Chat' },
        { id: base + 2, name: 'KI Hügel Süd', x: 4.0, y: 2.0, radius: 2.2, height: 0.75, softness: 1.45, source: 'KI-Chat' }
      );
    }

    if (text.includes('mulde') || text.includes('senke') || text.includes('teich')) {
      generatedBlobs.push({
        id: base + 3,
        name: text.includes('teich') ? 'KI Teich-Senke' : 'KI Senke Mitte',
        x: 0.5,
        y: -1.8,
        radius: 2.0,
        height: -0.6,
        softness: 1.65,
        source: 'KI-Chat'
      });
    }

    if (text.includes('sanft') || text.includes('weich')) {
      generatedBlobs.forEach(b => {
        b.softness = Math.max(b.softness, 1.7);
      });
    }

    // 2. Zonen-Erkennung
    if (text.includes('pflegeleicht') || text.includes('garten') || text.includes('pflanz')) {
      generatedZones.push({
        id: base + 101,
        kind: 'plantZone',
        name: 'KI pflegeleichte Gartenzone',
        x: 4.5,
        y: -2.0,
        width: 5.0,
        depth: 3.0,
        color: '#a7f3d0'
      });
    }

    if (text.includes('terrasse') || text.includes('sitzplatz') || text.includes('belag')) {
      let tx = -4.0;
      let ty = 2.5;

      if (text.includes('süden') || text.includes('süd')) {
        tx = 2.0;
        ty = 4.0;
      }
      if (text.includes('norden') || text.includes('nord')) {
        tx = -2.0;
        ty = -4.0;
      }

      generatedZones.push({
        id: base + 102,
        kind: 'hardscape',
        name: text.includes('terrasse') ? 'KI Terrasse' : 'KI Sitzplatz',
        x: tx,
        y: ty,
        width: 4.5,
        depth: 3.0,
        color: '#b8b0a2'
      });
    }

    // 3. Gebäude-Erkennung aus KI-Text
    if (
      text.includes('haus') ||
      text.includes('gebäude') ||
      text.includes('glashaus') ||
      text.includes('hütte') ||
      text.includes('turm') ||
      text.includes('pavillon') ||
      text.includes('atelier')
    ) {
      let bx = 0.0;
      let by = 0.0;
      let bw = 4.0;
      let bd = 5.0;
      let bh = 3.5;
      let bcolor = '#f8fafc';
      let bname = 'KI Gebäude';

      if (text.includes('norden') || text.includes('nord')) {
        bx = -2.0;
        by = -3.5;
      }
      if (text.includes('süden') || text.includes('süd')) {
        bx = 3.0;
        by = 3.5;
      }
      if (text.includes('osten') || text.includes('ost')) {
        bx = 5.2;
        by = 0.0;
      }
      if (text.includes('westen') || text.includes('west')) {
        bx = -5.2;
        by = 0.0;
      }

      if (text.includes('glashaus')) {
        bname = 'KI Glashaus';
        bw = 2.8;
        bd = 3.6;
        bh = 2.8;
        bcolor = '#e0f2fe';
      } else if (text.includes('turm')) {
        bname = 'KI Aussichtsturm';
        bw = 2.0;
        bd = 2.0;
        bh = 8.0;
        bcolor = '#cbd5e1';
      } else if (text.includes('hütte')) {
        bname = 'KI Gartenhütte';
        bw = 2.4;
        bd = 2.2;
        bh = 2.6;
        bcolor = '#78350f';
      } else if (text.includes('pavillon')) {
        bname = 'KI Pavillon';
        bw = 3.4;
        bd = 3.4;
        bh = 2.8;
        bcolor = '#d6c4a7';
      } else if (text.includes('atelier')) {
        bname = 'KI Gartenatelier';
        bw = 4.0;
        bd = 3.2;
        bh = 3.0;
        bcolor = '#f1f5f9';
      } else if (text.includes('modern')) {
        bname = 'KI Modernes Haus';
        bw = 5.0;
        bd = 6.0;
        bh = 4.2;
        bcolor = '#ffffff';
      }

      generatedObjects.push({
        id: base + 201,
        type: 'building',
        name: bname,
        x: bx,
        y: by,
        width: bw,
        depth: bd,
        height: bh,
        rotation: text.includes('schräg') ? 20 : 15,
        color: bcolor
      });
    }

    // 4. Gartenarchitektur-Erkennung
    if (text.includes('pool') || text.includes('schwimm')) {
      generatedObjects.push({
        id: base + 202,
        type: 'pool',
        name: 'KI Pool',
        x: 4.8,
        y: 2.8,
        width: 4.0,
        depth: 2.4,
        height: 1.3,
        rotation: 0,
        color: '#38bdf8'
      });
    }

    if (text.includes('pergola')) {
      generatedObjects.push({
        id: base + 203,
        type: 'pergola',
        name: 'KI Pergola',
        x: -5.2,
        y: 0.0,
        width: 3.0,
        depth: 2.2,
        height: 2.6,
        rotation: 0,
        color: '#8b5e3c'
      });
    }

    if (text.includes('mauer') || text.includes('wand')) {
      generatedObjects.push({
        id: base + 204,
        type: 'wall',
        name: 'KI Mauer',
        x: -0.6,
        y: -3.2,
        width: 3.5,
        depth: 0.25,
        height: 1.0,
        rotation: 15,
        color: '#9ca3af'
      });
    }

    if (text.includes('treppe') || text.includes('stufen')) {
      generatedObjects.push({
        id: base + 205,
        type: 'stairs',
        name: 'KI Stufen',
        x: -2.5,
        y: -2.0,
        width: 2.2,
        depth: 1.4,
        height: 0.9,
        rotation: 0,
        color: '#c8b6a6'
      });
    }

    if (text.includes('baum') || text.includes('bäume')) {
      generatedObjects.push({
        id: base + 206,
        type: 'tree',
        name: 'KI Baum',
        x: 4.0,
        y: 0.0,
        width: 1.4,
        depth: 1.4,
        height: 4.0,
        rotation: 0,
        color: '#16a34a'
      });
    }

    if (text.includes('strauch') || text.includes('sträucher')) {
      generatedObjects.push({
        id: base + 207,
        type: 'shrub',
        name: 'KI Strauch',
        x: 5.4,
        y: -1.5,
        width: 1.0,
        depth: 1.0,
        height: 1.2,
        rotation: 0,
        color: '#22c55e'
      });
    }

    if (text.includes('hecke')) {
      generatedObjects.push({
        id: base + 208,
        type: 'hedge',
        name: 'KI Hecke',
        x: 0.0,
        y: -4.5,
        width: 4.5,
        depth: 0.6,
        height: 1.5,
        rotation: 0,
        color: '#15803d'
      });
    }

    // 5. Fallbacks
    if (generatedBlobs.length === 0) {
      generatedBlobs.push({
        id: base + 1,
        name: 'KI Standard-Hügel',
        x: -2.0,
        y: -1.0,
        radius: 2.2,
        height: 0.6,
        softness: 1.55,
        source: 'KI-Chat'
      });
    }

    if (generatedObjects.length === 0 && (text.includes('architektur') || text.includes('bauwerk'))) {
      generatedObjects.push({
        id: base + 209,
        type: 'building',
        name: 'Architektur-Kubus',
        x: -1.0,
        y: 1.0,
        width: 4.0,
        depth: 4.0,
        height: 3.5,
        rotation: 0,
        color: '#f1f5f9'
      });
    }

    setTerrainBlobs(generatedBlobs);
    if (generatedZones.length) setZones(generatedZones);
    if (generatedObjects.length) setObjects(generatedObjects);

    setSelection('terrain', generatedBlobs[0]?.id ?? null, `KI-Chat interpretiert: ${generatedBlobs.length} Terrain-Formen, ${generatedZones.length} Zonen und ${generatedObjects.length} Architektur-/Gartenobjekte.`);
  }

  function exportProject() {
    download('al-green-design-v0133-building-ai-fix.algreen', JSON.stringify({ terrainBlobs, zones, objects, imageName: image?.name ?? null }, null, 2), 'application/json');
  }

  return (
    <section className="platform">
      <aside className="panel">
        <h2>Module</h2>
        <div className="grid2">
          {([
            ['chat','KI-Chat'],['image','Bild/KI'],['terrain','Terrain'],['architecture','Gebäude/Garten'],['scene','Szene'],['export','Export']
          ] as [Tab,string][]).map(([id,label]) => <button key={id} className={`tab ${tab===id?'active':''}`} onClick={()=>setTab(id)}>{label}</button>)}
        </div>
        <hr />

        {tab === 'chat' && (
          <>
            <h2>KI-Garten grob erzeugen</h2>
            <textarea className="full" value={chat} onChange={e=>setChat(e.target.value)} />
            <button className="btn primary" style={{marginTop:8}} onClick={generateFromChat}>KI-Chat generiert Entwurf</button>
            <div className="hint" style={{marginTop:8}}>Die KI kann jetzt Gelände, Zonen, Gebäude und Architektur-/Pflanzenobjekte grob setzen. Sie erkennt z. B. „Glashaus im Norden“, „Terrasse im Süden“, „Turm“, „Hütte“ und „modernes Haus“.</div>
          </>
        )}

        {tab === 'image' && (
          <>
            <h2>Bild-Upload und KI-Bildanalyse</h2>
            <label className="file">Bild hochladen<input type="file" accept="image/*" onChange={e=>uploadImage(e.target.files?.[0] ?? null)} /></label>
            <button className="btn primary" style={{marginTop:8}} onClick={analyzeImageToSoftTerrain}>KI-Bildanalyse → weiches Terrain erzeugen</button>
            <div className="hint" style={{marginTop:8}}>Die Analyse erzeugt weiche Erhöhungen und Senken sowie grobe Pflanz- und Belagszonen.</div>
            <div className="preview">{image ? <img src={image.dataUrl} alt="Upload" /> : <span className="small">Noch kein Bild geladen</span>}</div>
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
            <div className="softLegend" style={{marginTop:10}}>
              <div><span className="swatch pos"></span><span>weiche positive Erhebung</span></div>
              <div><span className="swatch neg"></span><span>weiche negative Senke/Mulde</span></div>
            </div>
            <div className="hint" style={{marginTop:10}}>Im 2D werden weiche Zonen dargestellt, im 3D ein echtes Terrain-Mesh.</div>
          </>
        )}

        {tab === 'architecture' && (
          <>
            <h2>Architektur + Pflanzen</h2>
            <div className="grid3">
              {([
                ['building','Gebäude/Haus'],['pool','Pool'],['pergola','Pergola'],['wall','Mauer'],['stairs','Stufen'],['tree','Baum'],['shrub','Strauch'],['hedge','Hecke'],['select','Auswählen']
              ] as [Tool,string][]).map(([id,label]) => <button key={id} className={`tool ${tool===id?'active':''}`} onClick={()=>setTool(id)}>{label}</button>)}
            </div>
            <div className="legendList" style={{marginTop:10}}>
              <div className="legendItem"><span className="legendSquare" style={{background:'#d6c4a7'}}></span><span>Gebäude</span></div>
              <div className="legendItem"><span className="legendSquare" style={{background:'#38bdf8'}}></span><span>Pool</span></div>
              <div className="legendItem"><span className="legendSquare" style={{background:'#8b5e3c'}}></span><span>Pergola</span></div>
              <div className="legendItem"><span className="legendSquare" style={{background:'#9ca3af'}}></span><span>Mauer</span></div>
              <div className="legendItem"><span className="legendSquare" style={{background:'#c8b6a6'}}></span><span>Stufen</span></div>
              <div className="legendItem"><span className="legendCircle" style={{background:'#16a34a'}}></span><span>Baum</span></div>
              <div className="legendItem"><span className="legendCircle" style={{background:'#22c55e'}}></span><span>Strauch</span></div>
              <div className="legendItem"><span className="legendSquare" style={{background:'#15803d'}}></span><span>Hecke</span></div>
            </div>
            <div className="hint" style={{marginTop:10}}>Objekt wählen und in die Fläche klicken. Alle Objekte liegen automatisch auf dem Gelände.</div>
          </>
        )}

        {tab === 'scene' && <><h2>Szene</h2><div className="hint">Alle Objekte werden in 3D auf der aktuellen Geländehöhe platziert.</div></>}
        {tab === 'export' && <><h2>Export</h2><button className="btn blue" onClick={exportProject}>Projekt exportieren</button></>}
      </aside>

      <div className="workspace">
        <div className="topbar">
          <span className="pill">V0.13.3 BUILDING AI FIX</span>
          <span className="pill">Terrain {terrainBlobs.length}</span>
          <span className="pill">Zonen {zones.length}</span>
          <span className="pill">Objekte {objects.length}</span>
          <button className={`pill ${view==='2d'?'active':''}`} onClick={()=>setView('2d')}>2D</button>
          <button className={`pill ${view==='3d'?'active':''}`} onClick={()=>setView('3d')}>3D</button>
        </div>
        <div className="canvasWrap">
          {view === '2d' ? (
            <svg ref={svgRef} className="canvas" viewBox={`${VIEWBOX.x * SCALE} ${VIEWBOX.y * SCALE} ${VIEWBOX.width * SCALE} ${VIEWBOX.height * SCALE}`} onClick={handleCanvasClick}>
              <defs>
                {terrainBlobs.map(blob => (
                  <radialGradient id={`g-${blob.id}`} key={blob.id}>
                    <stop offset="0%" stopColor={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stopOpacity="0.85" />
                    <stop offset="45%" stopColor={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stopOpacity="0.24" />
                    <stop offset="100%" stopColor={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stopOpacity="0" />
                  </radialGradient>
                ))}
              </defs>
              <Grid />
              {image && <image href={image.dataUrl} x={-10 * SCALE} y={-6.5 * SCALE} width={20 * SCALE} height={13 * SCALE} opacity="0.22" preserveAspectRatio="none" />}

              {zones.map(zone => (
                <g key={zone.id} onClick={(e)=>{e.stopPropagation(); setSelection('zone', zone.id, `${zone.name} ausgewählt.`);}}>
                  <rect x={(zone.x - zone.width/2) * SCALE} y={(zone.y - zone.depth/2) * SCALE} width={zone.width * SCALE} height={zone.depth * SCALE} fill={zone.color} fillOpacity="0.42" stroke={selectedKind==='zone' && selectedId===zone.id ? '#f59e0b':'#334155'} strokeWidth={selectedKind==='zone' && selectedId===zone.id ? 3 : 1.5} rx="6" />
                  <text x={zone.x * SCALE} y={zone.y * SCALE} fontSize="12" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{zone.name}</text>
                </g>
              ))}

              {terrainBlobs.map(blob => (
                <g key={blob.id} onClick={(e)=>{e.stopPropagation(); setSelection('terrain', blob.id, `${blob.name} ausgewählt.`);}}>
                  <circle cx={blob.x * SCALE} cy={blob.y * SCALE} r={blob.radius * SCALE * blob.softness} fill={`url(#g-${blob.id})`} />
                  <circle cx={blob.x * SCALE} cy={blob.y * SCALE} r={Math.max(6, blob.radius * SCALE * 0.25)} fill={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stroke={selectedKind==='terrain' && selectedId===blob.id ? '#f59e0b' : '#ffffff'} strokeWidth={selectedKind==='terrain' && selectedId===blob.id ? 3 : 1.5} />
                </g>
              ))}

              {objects.map(obj => (
                <GardenObject2D key={obj.id} obj={obj} selected={selectedKind==='object' && selectedId===obj.id} onClick={(e)=>{e.stopPropagation(); setSelection('object', obj.id, `${obj.name} ausgewählt.`);}} />
              ))}
            </svg>
          ) : (
            <Terrain3D terrainBlobs={terrainBlobs} zones={zones} objects={objects} />
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
            <div className="grid2">
              <button className="btn warn" onClick={()=>{ const copy={...selectedBlob,id:Date.now(),x:selectedBlob.x+0.8,y:selectedBlob.y+0.8,name:selectedBlob.name+' Kopie'}; setTerrainBlobs(v=>[...v,copy]); setSelection('terrain',copy.id); }}>Duplizieren</button>
              <button className="btn danger" onClick={()=>{ setTerrainBlobs(v=>v.filter(b=>b.id!==selectedBlob.id)); setSelection(null,null,'Terrain-Form gelöscht.'); }}>Löschen</button>
            </div>
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

        {selectedObject && (
          <div className="form">
            <label>Name<input value={selectedObject.name} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,name:e.target.value}:o))} /></label>
            <label>Typ<select value={selectedObject.type} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,type:e.target.value as GardenObjectType}:o))}><option>building</option><option>pool</option><option>pergola</option><option>wall</option><option>stairs</option><option>tree</option><option>shrub</option><option>hedge</option></select></label>
            <label>X<input type="number" step="0.1" value={selectedObject.x} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,x:Number(e.target.value)}:o))} /></label>
            <label>Y<input type="number" step="0.1" value={selectedObject.y} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,y:Number(e.target.value)}:o))} /></label>
            <label>Breite<input type="number" step="0.1" value={selectedObject.width} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,width:Number(e.target.value)}:o))} /></label>
            <label>Tiefe<input type="number" step="0.1" value={selectedObject.depth} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,depth:Number(e.target.value)}:o))} /></label>
            <label>Höhe<input type="number" step="0.1" value={selectedObject.height} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,height:Number(e.target.value)}:o))} /></label>
            <label>Drehung °<input type="number" step="1" value={selectedObject.rotation} onChange={e=>setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,rotation:Number(e.target.value)}:o))} /></label>
            <div className="grid2">
              <button className="btn warn" onClick={()=>{ const copy={...selectedObject,id:Date.now(),x:selectedObject.x+0.8,y:selectedObject.y+0.8,name:selectedObject.name+' Kopie'}; setObjects(v=>[...v,copy]); setSelection('object',copy.id); }}>Duplizieren</button>
              <button className="btn danger" onClick={()=>{ setObjects(v=>v.filter(o=>o.id!==selectedObject.id)); setSelection(null,null,'Objekt gelöscht.'); }}>Löschen</button>
            </div>
          </div>
        )}

        {!selectedBlob && !selectedZone && !selectedObject && <p className="small">Objekt, Zone oder Terrain anklicken.</p>}
      </aside>
    </section>
  );
}

function Grid() {
  const lines = [];
  for (let x = -100; x <= 100; x += 0.5) lines.push(<line key={`vx-${x}`} x1={x * SCALE} y1={-100 * SCALE} x2={x * SCALE} y2={100 * SCALE} stroke={x % 1 === 0 ? '#d1d9e6' : '#e6edf6'} strokeWidth={x % 1 === 0 ? 1 : 0.6} />);
  for (let y = -100; y <= 100; y += 0.5) lines.push(<line key={`hy-${y}`} x1={-100 * SCALE} y1={y * SCALE} x2={100 * SCALE} y2={y * SCALE} stroke={y % 1 === 0 ? '#d1d9e6' : '#e6edf6'} strokeWidth={y % 1 === 0 ? 1 : 0.6} />);
  return <g>{lines}</g>;
}

function GardenObject2D({ obj, selected, onClick }: { obj: GardenObject; selected: boolean; onClick: (e: React.MouseEvent<SVGGElement>) => void }) {
  const stroke = selected ? '#f59e0b' : '#1f2937';
  const sw = selected ? 3 : 1.5;
  const tx = obj.x * SCALE;
  const ty = obj.y * SCALE;
  const rot = obj.rotation;
  if (obj.type === 'tree' || obj.type === 'shrub') {
    return (
      <g onClick={onClick} transform={`translate(${tx},${ty}) rotate(${rot})`}>
        <circle cx="0" cy="0" r={(obj.width / 2) * SCALE} fill={obj.color} fillOpacity="0.85" stroke={stroke} strokeWidth={sw} />
        <text x="0" y={(obj.width / 2 + 0.3) * SCALE} fontSize="12" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{obj.name}</text>
      </g>
    );
  }
  return (
    <g onClick={onClick} transform={`translate(${tx},${ty}) rotate(${rot})`}>
      <rect x={(-obj.width/2) * SCALE} y={(-obj.depth/2) * SCALE} width={obj.width * SCALE} height={obj.depth * SCALE} rx={obj.type === 'pool' ? 8 : 3} fill={obj.color} fillOpacity={obj.type === 'pool' ? 0.75 : 0.8} stroke={stroke} strokeWidth={sw} />
      <text x="0" y="0" fontSize="12" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{obj.name}</text>
    </g>
  );
}

function Terrain3D({ terrainBlobs, zones, objects }: { terrainBlobs: TerrainBlob[]; zones: Zone[]; objects: GardenObject[] }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeaf2fb);
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(16, 13, 18);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(12, 18, 10); scene.add(sun);
    scene.add(new THREE.GridHelper(28, 28, 0x94a3b8, 0xd7e0eb));

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
      const color = new THREE.Color().lerpColors(new THREE.Color('#60a5fa'), new THREE.Color('#84cc16'), t);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: false });
    const terrainMesh = new THREE.Mesh(geometry, terrainMat); scene.add(terrainMesh);
    scene.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometry), new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.10 })));

    zones.forEach(zone => {
      const h = terrainHeightAt(zone.x, zone.y, terrainBlobs);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(zone.width, zone.kind === 'hardscape' ? 0.12 : 0.05, zone.depth), new THREE.MeshStandardMaterial({ color: zone.color, transparent: true, opacity: zone.kind === 'hardscape' ? 0.92 : 0.55 }));
      mesh.position.set(zone.x, h + (zone.kind === 'hardscape' ? 0.08 : 0.03), zone.y);
      scene.add(mesh);
    });

    objects.forEach(obj => {
      const baseH = terrainHeightAt(obj.x, obj.y, terrainBlobs);
      const group = new THREE.Group();
      group.position.set(obj.x, baseH, obj.y);
      group.rotation.y = -degToRad(obj.rotation);
      scene.add(group);

      if (obj.type === 'building') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(obj.width, obj.height, obj.depth), new THREE.MeshStandardMaterial({ color: obj.color }));
        body.position.y = obj.height / 2;
        group.add(body);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(obj.width, obj.depth) * 0.75, 1.0, 4), new THREE.MeshStandardMaterial({ color: '#8b5a3c' }));
        roof.position.y = obj.height + 0.5;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);
      }

      if (obj.type === 'pool') {
        const border = new THREE.Mesh(new THREE.BoxGeometry(obj.width, 0.16, obj.depth), new THREE.MeshStandardMaterial({ color: '#d6eaf8' }));
        border.position.y = 0.08;
        group.add(border);
        const water = new THREE.Mesh(new THREE.BoxGeometry(obj.width * 0.9, 0.06, obj.depth * 0.9), new THREE.MeshStandardMaterial({ color: '#38bdf8', transparent: true, opacity: 0.85 }));
        water.position.y = 0.02;
        group.add(water);
      }

      if (obj.type === 'pergola') {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(obj.width, 0.16, obj.depth), new THREE.MeshStandardMaterial({ color: obj.color }));
        roof.position.y = obj.height;
        group.add(roof);
        const postPos = [[-obj.width/2+0.12,-obj.depth/2+0.12],[obj.width/2-0.12,-obj.depth/2+0.12],[-obj.width/2+0.12,obj.depth/2-0.12],[obj.width/2-0.12,obj.depth/2-0.12]];
        postPos.forEach(([x,z]) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, obj.height, 0.12), new THREE.MeshStandardMaterial({ color: obj.color }));
          post.position.set(x, obj.height/2, z);
          group.add(post);
        });
      }

      if (obj.type === 'wall') {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(obj.width, obj.height, obj.depth), new THREE.MeshStandardMaterial({ color: obj.color }));
        wall.position.y = obj.height / 2;
        group.add(wall);
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

      if (obj.type === 'tree') {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, obj.height * 0.45, 12), new THREE.MeshStandardMaterial({ color: '#7c4a2d' }));
        trunk.position.y = obj.height * 0.225;
        group.add(trunk);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(Math.max(obj.width * 0.6, 0.8), 18, 14), new THREE.MeshStandardMaterial({ color: obj.color }));
        crown.position.y = obj.height * 0.7;
        group.add(crown);
      }

      if (obj.type === 'shrub') {
        const crown = new THREE.Mesh(new THREE.SphereGeometry(Math.max(obj.width * 0.5, 0.45), 16, 14), new THREE.MeshStandardMaterial({ color: obj.color }));
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
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      controls.dispose(); renderer.dispose(); geometry.dispose(); terrainMat.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [terrainBlobs, zones, objects]);
  return <div ref={mountRef} className="three" />;
}
