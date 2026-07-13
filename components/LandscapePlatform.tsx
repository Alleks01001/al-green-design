
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type ViewMode = '2d' | '3d';
type Tab = 'chat' | 'image' | 'terrain' | 'scene' | 'export';
type Tool = 'select' | 'mound' | 'depression' | 'plantZone' | 'hardscape';

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

const SCALE = 50;
const VIEWBOX = { x: -12, y: -8, width: 24, height: 16 };

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
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

  const [tab, setTab] = useState<Tab>('image');
  const [view, setView] = useState<ViewMode>('2d');
  const [tool, setTool] = useState<Tool>('select');
  const [status, setStatus] = useState('Bereit: Bild hochladen oder Terrain-Werkzeug wählen.');
  const [chat, setChat] = useState('Erstelle ein sanftes Gelände mit zwei Erhebungen, einer Mulde und einem pflegeleichten Garten.');
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

  const [selectedBlobId, setSelectedBlobId] = useState<number | null>(1);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  const selectedBlob = terrainBlobs.find(b => b.id === selectedBlobId) || null;
  const selectedZone = zones.find(z => z.id === selectedZoneId) || null;
  const stats = useMemo(() => terrainStats(terrainBlobs), [terrainBlobs]);

  const eco = useMemo(() => {
    const roughness = terrainBlobs.reduce((s, b) => s + Math.abs(b.height) * b.radius, 0);
    const greenArea = zones.filter(z => z.kind === 'plantZone').reduce((s, z) => s + z.width * z.depth, 0);
    const hardArea = zones.filter(z => z.kind === 'hardscape').reduce((s, z) => s + z.width * z.depth, 0);
    const sealed = clamp(Math.round((hardArea / Math.max(1, hardArea + greenArea)) * 100), 0, 100);
    const rain = clamp(Math.round(100 - sealed + stats.cut * 6), 0, 100);
    const biodiversity = clamp(Math.round(50 + greenArea * 1.5 - sealed * 0.2), 0, 100);
    const comfort = clamp(Math.round(55 + roughness * 4), 0, 100);
    return { sealed, rain, biodiversity, comfort };
  }, [zones, terrainBlobs, stats.cut]);

  function handleCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    const p = worldFromEvent(svgRef.current, e);
    if (tool === 'select') {
      setSelectedBlobId(null);
      setSelectedZoneId(null);
      return;
    }
    if (tool === 'mound' || tool === 'depression') {
      const id = Date.now();
      const blob: TerrainBlob = {
        id,
        name: tool === 'mound' ? 'Neue Erhebung' : 'Neue Mulde',
        x: p.x,
        y: p.y,
        radius: tool === 'mound' ? 2.1 : 1.8,
        height: tool === 'mound' ? 0.55 : -0.45,
        softness: 1.35,
        source: 'Manuell'
      };
      setTerrainBlobs(v => [...v, blob]);
      setSelectedBlobId(id);
      setSelectedZoneId(null);
      setStatus(`${blob.name} gesetzt. In 3D wird sie weich modelliert.`);
      return;
    }
    if (tool === 'plantZone' || tool === 'hardscape') {
      const id = Date.now();
      const zone: Zone = {
        id,
        kind: tool,
        name: tool === 'plantZone' ? 'Neue Pflanzzone' : 'Neue Belagsfläche',
        x: p.x,
        y: p.y,
        width: 3.4,
        depth: 2.0,
        color: tool === 'plantZone' ? '#a7f3d0' : '#b8b0a2'
      };
      setZones(v => [...v, zone]);
      setSelectedZoneId(id);
      setSelectedBlobId(null);
      setStatus(`${zone.name} gesetzt.`);
    }
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
    if (!image) {
      setStatus('Bitte zuerst ein Bild hochladen.');
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = 96;
      const h = 64;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const blobs: TerrainBlob[] = [];
      const newZones: Zone[] = [];
      let id = Date.now();
      const cellsX = 8;
      const cellsY = 6;
      const cellW = Math.floor(w / cellsX);
      const cellH = Math.floor(h / cellsY);
      for (let gy = 0; gy < cellsY; gy++) {
        for (let gx = 0; gx < cellsX; gx++) {
          let r = 0, g = 0, b = 0, count = 0;
          for (let yy = gy * cellH; yy < (gy + 1) * cellH; yy += 2) {
            for (let xx = gx * cellW; xx < (gx + 1) * cellW; xx += 2) {
              const idx = (yy * w + xx) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              count++;
            }
          }
          r /= count; g /= count; b /= count;
          const brightness = (r + g + b) / 3;
          const worldX = -10 + gx * 2.8;
          const worldY = -6 + gy * 2.3;
          if (brightness > 175) {
            blobs.push({
              id: id++, name: 'KI Erhebung', x: worldX, y: worldY,
              radius: 1.7, height: 0.22 + (brightness - 175) / 255 * 0.45, softness: 1.55, source: 'Bildanalyse'
            });
          } else if (brightness < 95) {
            blobs.push({
              id: id++, name: 'KI Senke', x: worldX, y: worldY,
              radius: 1.6, height: -(0.18 + (95 - brightness) / 255 * 0.38), softness: 1.65, source: 'Bildanalyse'
            });
          }
          if (g > r * 1.08 && g > b * 1.04) {
            newZones.push({ id: id++, kind: 'plantZone', name: 'KI Pflanzzone', x: worldX, y: worldY, width: 2.4, depth: 1.8, color: '#a7f3d0' });
          } else if (brightness > 160 && Math.abs(r - g) < 35 && Math.abs(r - b) < 45) {
            newZones.push({ id: id++, kind: 'hardscape', name: 'KI Trocken-/Belagszone', x: worldX, y: worldY, width: 2.2, depth: 1.6, color: '#d8c8a8' });
          }
        }
      }
      const softened = blobs.map((b, index) => ({ ...b, radius: index % 3 === 0 ? b.radius * 1.2 : b.radius, softness: b.softness + (index % 2 === 0 ? 0.1 : 0) }));
      setTerrainBlobs(softened.length ? softened : terrainBlobs);
      setZones(newZones.slice(0, 18));
      setSelectedBlobId(softened[0]?.id ?? null);
      setSelectedZoneId(null);
      setStatus(`KI-Bildanalyse fertig: ${softened.length} weiche Terrain-Formen und ${newZones.length} Zonen erzeugt.`);
    };
    img.src = image.dataUrl;
  }

  function generateFromChat() {
    const text = chat.toLowerCase();
    const base = Date.now();
    const generatedBlobs: TerrainBlob[] = [];
    const generatedZones: Zone[] = [];
    if (text.includes('zwei erhebungen') || text.includes('zwei hügel') || text.includes('hügel')) {
      generatedBlobs.push(
        { id: base + 1, name: 'KI Hügel 1', x: -3.8, y: -1.5, radius: 2.5, height: 0.9, softness: 1.45, source: 'KI-Chat' },
        { id: base + 2, name: 'KI Hügel 2', x: 3.1, y: 1.2, radius: 2.0, height: 0.65, softness: 1.35, source: 'KI-Chat' }
      );
    }
    if (text.includes('mulde') || text.includes('senke')) {
      generatedBlobs.push({ id: base + 3, name: 'KI Mulde', x: 0.8, y: -2.8, radius: 1.9, height: -0.48, softness: 1.55, source: 'KI-Chat' });
    }
    if (text.includes('sanft') || text.includes('weich')) {
      generatedBlobs.forEach(b => { b.softness = Math.max(b.softness, 1.6); });
    }
    if (text.includes('pflegeleicht') || text.includes('garten')) {
      generatedZones.push({ id: base + 101, kind: 'plantZone', name: 'KI Pflegeleichte Pflanzzone', x: 4.8, y: -2.2, width: 4.0, depth: 2.1, color: '#a7f3d0' });
    }
    if (text.includes('terrasse') || text.includes('sitzplatz')) {
      generatedZones.push({ id: base + 102, kind: 'hardscape', name: 'KI Terrasse', x: -5.2, y: 3.2, width: 4.4, depth: 2.5, color: '#b8b0a2' });
    }
    if (generatedBlobs.length === 0) {
      generatedBlobs.push(
        { id: base + 1, name: 'KI Form 1', x: -3.0, y: -1.0, radius: 2.2, height: 0.55, softness: 1.55, source: 'KI-Chat' },
        { id: base + 2, name: 'KI Form 2', x: 1.5, y: -2.2, radius: 1.8, height: -0.32, softness: 1.6, source: 'KI-Chat' },
        { id: base + 3, name: 'KI Form 3', x: 3.5, y: 1.8, radius: 1.8, height: 0.38, softness: 1.45, source: 'KI-Chat' }
      );
    }
    setTerrainBlobs(generatedBlobs);
    if (generatedZones.length) setZones(generatedZones);
    setSelectedBlobId(generatedBlobs[0]?.id ?? null);
    setSelectedZoneId(null);
    setStatus(`KI-Chat hat ${generatedBlobs.length} weiche Terrain-Formen grob vorgesteckt.`);
  }

  function exportProject() {
    download('al-green-design-v0131-soft-terrain.algreen', JSON.stringify({ terrainBlobs, zones, imageName: image?.name ?? null }, null, 2), 'application/json');
  }

  return (
    <section className="platform">
      <aside className="panel">
        <h2>Module</h2>
        <div className="grid2">
          {([
            ['chat', 'KI-Chat'],
            ['image', 'Bild/KI'],
            ['terrain', 'Terrain'],
            ['scene', 'Szene'],
            ['export', 'Export']
          ] as [Tab, string][]).map(([id, label]) => (
            <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <hr />
        {tab === 'chat' && (
          <>
            <h2>KI-Gelände grob vorstecken</h2>
            <textarea className="full" value={chat} onChange={e => setChat(e.target.value)} />
            <button className="btn primary" style={{ marginTop: 8 }} onClick={generateFromChat}>KI-Chat generiert weiches Gelände</button>
            <div className="hint" style={{ marginTop: 8 }}>Die KI erzeugt jetzt keine harten Kanten mehr, sondern grobe weiche Terrain-Formen mit Radius, Höhe und Weichheit.</div>
          </>
        )}
        {tab === 'image' && (
          <>
            <h2>Bild-Upload und KI-Bildanalyse</h2>
            <label className="file">Bild hochladen<input type="file" accept="image/*" onChange={e => uploadImage(e.target.files?.[0] ?? null)} /></label>
            <button className="btn primary" style={{ marginTop: 8 }} onClick={analyzeImageToSoftTerrain}>KI-Bildanalyse → weiches Terrain erzeugen</button>
            <div className="hint" style={{ marginTop: 8 }}>Aus Helligkeit und Bildstruktur entstehen überlagernde Erhöhungen und Senken. Diese verlaufen weich ineinander und sind danach editierbar.</div>
            <div className="preview">{image ? <img src={image.dataUrl} alt="Upload" /> : <span className="small">Noch kein Bild geladen</span>}</div>
          </>
        )}
        {tab === 'terrain' && (
          <>
            <h2>Terrain-Werkzeuge</h2>
            <div className="grid2">
              {([
                ['select', 'Auswählen'],
                ['mound', 'Erhebung'],
                ['depression', 'Mulde'],
                ['plantZone', 'Pflanzzone'],
                ['hardscape', 'Belag']
              ] as [Tool, string][]).map(([id, label]) => (
                <button key={id} className={`tool ${tool === id ? 'active' : ''}`} onClick={() => setTool(id)}>{label}</button>
              ))}
            </div>
            <div className="softLegend" style={{ marginTop: 10 }}>
              <div><span className="swatch pos"></span><span>weiche positive Erhebung</span></div>
              <div><span className="swatch neg"></span><span>weiche negative Senke/Mulde</span></div>
            </div>
            <div className="hint" style={{ marginTop: 10 }}>In 2D siehst du die Wirkung als weiche Zonen. In 3D wird daraus ein echtes Höhenmodell. Änderungen rechts an Höhe, Radius und Weichheit wirken sofort auf das Gelände.</div>
          </>
        )}
        {tab === 'scene' && <><h2>Szene</h2><div className="hint">Das Gelände wird in 3D als Höhenfeld berechnet. Mehrere Erhebungen und Senken überlagern sich und verschmelzen zu einer sanften Form.</div></>}
        {tab === 'export' && <><h2>Export</h2><button className="btn blue" onClick={exportProject}>Projekt exportieren</button></>}
      </aside>

      <div className="workspace">
        <div className="topbar">
          <span className="pill">V0.13.1 SOFT TERRAIN</span>
          <span className="pill">{terrainBlobs.length} Terrain-Formen</span>
          <span className="pill">{zones.length} Zonen</span>
          <button className={`pill ${view === '2d' ? 'active' : ''}`} onClick={() => setView('2d')}>2D</button>
          <button className={`pill ${view === '3d' ? 'active' : ''}`} onClick={() => setView('3d')}>3D</button>
        </div>
        <div className="canvasWrap">
          {view === '2d' ? (
            <svg ref={svgRef} className="canvas" viewBox={`${VIEWBOX.x * SCALE} ${VIEWBOX.y * SCALE} ${VIEWBOX.width * SCALE} ${VIEWBOX.height * SCALE}`} onClick={handleCanvasClick}>
              <defs>
                {terrainBlobs.map(blob => (
                  <radialGradient id={`g-${blob.id}`} key={blob.id}>
                    <stop offset="0%" stopColor={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stopOpacity="0.85" />
                    <stop offset="45%" stopColor={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stopOpacity="0" />
                  </radialGradient>
                ))}
              </defs>
              <Grid />
              {image && <image href={image.dataUrl} x={-10 * SCALE} y={-6.5 * SCALE} width={20 * SCALE} height={13 * SCALE} opacity="0.28" preserveAspectRatio="none" />}
              {zones.map(zone => (
                <g key={zone.id} onClick={(e) => { e.stopPropagation(); setSelectedZoneId(zone.id); setSelectedBlobId(null); setStatus(`${zone.name} ausgewählt.`); }}>
                  <rect x={(zone.x - zone.width / 2) * SCALE} y={(zone.y - zone.depth / 2) * SCALE} width={zone.width * SCALE} height={zone.depth * SCALE} fill={zone.color} fillOpacity="0.45" stroke={selectedZoneId === zone.id ? '#f59e0b' : '#334155'} strokeWidth={selectedZoneId === zone.id ? 3 : 1.5} rx="6" />
                  <text x={zone.x * SCALE} y={zone.y * SCALE} fontSize="12" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{zone.name}</text>
                </g>
              ))}
              {terrainBlobs.map(blob => (
                <g key={blob.id} onClick={(e) => { e.stopPropagation(); setSelectedBlobId(blob.id); setSelectedZoneId(null); setStatus(`${blob.name} ausgewählt.`); }}>
                  <circle cx={blob.x * SCALE} cy={blob.y * SCALE} r={blob.radius * SCALE * blob.softness} fill={`url(#g-${blob.id})`} />
                  <circle cx={blob.x * SCALE} cy={blob.y * SCALE} r={Math.max(6, blob.radius * SCALE * 0.25)} fill={blob.height >= 0 ? '#84cc16' : '#60a5fa'} stroke={selectedBlobId === blob.id ? '#f59e0b' : '#ffffff'} strokeWidth={selectedBlobId === blob.id ? 3 : 1.5} />
                  <text x={blob.x * SCALE} y={(blob.y - 0.15) * SCALE} fontSize="12" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{blob.height >= 0 ? `+${blob.height.toFixed(2)} m` : `${blob.height.toFixed(2)} m`}</text>
                </g>
              ))}
            </svg>
          ) : (
            <Terrain3D terrainBlobs={terrainBlobs} zones={zones} />
          )}
        </div>
        <div className="status"><span>{status}</span><span>Auftrag {stats.fill.toFixed(1)} m³ · Abtrag {stats.cut.toFixed(1)} m³</span></div>
      </div>

      <aside className="panel">
        <h2>Gelände-Kennzahlen</h2>
        <div className="kpis">
          <div className="kpi"><small>Auftrag</small><strong>{stats.fill.toFixed(1)} m³</strong></div>
          <div className="kpi"><small>Abtrag</small><strong>{stats.cut.toFixed(1)} m³</strong></div>
          <div className="kpi"><small>Regenrückhalt</small><strong>{eco.rain}/100</strong></div>
          <div className="kpi"><small>Biodiversität</small><strong>{eco.biodiversity}/100</strong></div>
        </div>
        <hr />
        <h2>Ausgewählte Terrain-Form</h2>
        {!selectedBlob && <p className="small">Eine Erhebung oder Mulde anklicken.</p>}
        {selectedBlob && (
          <div className="form">
            <label>Name<input value={selectedBlob.name} onChange={e => setTerrainBlobs(v => v.map(b => b.id === selectedBlob.id ? { ...b, name: e.target.value } : b))} /></label>
            <label>X Position<input type="number" step="0.1" value={selectedBlob.x} onChange={e => setTerrainBlobs(v => v.map(b => b.id === selectedBlob.id ? { ...b, x: Number(e.target.value) } : b))} /></label>
            <label>Y Position<input type="number" step="0.1" value={selectedBlob.y} onChange={e => setTerrainBlobs(v => v.map(b => b.id === selectedBlob.id ? { ...b, y: Number(e.target.value) } : b))} /></label>
            <label>Radius<input type="number" step="0.1" min="0.3" value={selectedBlob.radius} onChange={e => setTerrainBlobs(v => v.map(b => b.id === selectedBlob.id ? { ...b, radius: Number(e.target.value) } : b))} /></label>
            <label>Höhe / Tiefe<input type="number" step="0.05" value={selectedBlob.height} onChange={e => setTerrainBlobs(v => v.map(b => b.id === selectedBlob.id ? { ...b, height: Number(e.target.value) } : b))} /></label>
            <label>Weichheit<input type="number" step="0.05" min="0.4" max="2.5" value={selectedBlob.softness} onChange={e => setTerrainBlobs(v => v.map(b => b.id === selectedBlob.id ? { ...b, softness: Number(e.target.value) } : b))} /></label>
            <div className="grid2">
              <button className="btn warn" onClick={() => { const copy = { ...selectedBlob, id: Date.now(), x: selectedBlob.x + 0.8, y: selectedBlob.y + 0.8, name: selectedBlob.name + ' Kopie' }; setTerrainBlobs(v => [...v, copy]); setSelectedBlobId(copy.id); }}>Duplizieren</button>
              <button className="btn danger" onClick={() => { setTerrainBlobs(v => v.filter(b => b.id !== selectedBlob.id)); setSelectedBlobId(null); }}>Löschen</button>
            </div>
            <div className="hint">Radius bestimmt die Ausdehnung. Weichheit steuert, wie sanft die Form in das restliche Gelände übergeht.</div>
          </div>
        )}
        <hr />
        <h2>Ausgewählte Zone</h2>
        {!selectedZone && <p className="small">Optional eine Zone anklicken.</p>}
        {selectedZone && (
          <div className="form">
            <label>Name<input value={selectedZone.name} onChange={e => setZones(v => v.map(z => z.id === selectedZone.id ? { ...z, name: e.target.value } : z))} /></label>
            <label>X Position<input type="number" step="0.1" value={selectedZone.x} onChange={e => setZones(v => v.map(z => z.id === selectedZone.id ? { ...z, x: Number(e.target.value) } : z))} /></label>
            <label>Y Position<input type="number" step="0.1" value={selectedZone.y} onChange={e => setZones(v => v.map(z => z.id === selectedZone.id ? { ...z, y: Number(e.target.value) } : z))} /></label>
            <label>Breite<input type="number" step="0.1" min="0.5" value={selectedZone.width} onChange={e => setZones(v => v.map(z => z.id === selectedZone.id ? { ...z, width: Number(e.target.value) } : z))} /></label>
            <label>Tiefe<input type="number" step="0.1" min="0.5" value={selectedZone.depth} onChange={e => setZones(v => v.map(z => z.id === selectedZone.id ? { ...z, depth: Number(e.target.value) } : z))} /></label>
            <button className="btn danger" onClick={() => { setZones(v => v.filter(z => z.id !== selectedZone.id)); setSelectedZoneId(null); }}>Zone löschen</button>
          </div>
        )}
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

function Terrain3D({ terrainBlobs, zones }: { terrainBlobs: TerrainBlob[]; zones: Zone[] }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeaf2fb);
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(14, 12, 16);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(12, 18, 10);
    scene.add(sun);
    scene.add(new THREE.GridHelper(28, 28, 0x94a3b8, 0xd7e0eb));

    const terrainSizeX = 24;
    const terrainSizeY = 16;
    const segX = 140;
    const segY = 100;
    const geometry = new THREE.PlaneGeometry(terrainSizeX, terrainSizeY, segX, segY);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position;
    const colors: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = terrainHeightAt(x, z, terrainBlobs);
      pos.setY(i, y);
      const t = clamp((y + 1.2) / 2.8, 0, 1);
      const color = new THREE.Color().lerpColors(new THREE.Color('#60a5fa'), new THREE.Color('#84cc16'), t);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: false });
    const terrainMesh = new THREE.Mesh(geometry, terrainMat);
    scene.add(terrainMesh);
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.12 }));
    scene.add(wire);

    zones.forEach(zone => {
      const h = terrainHeightAt(zone.x, zone.y, terrainBlobs);
      const box = new THREE.Mesh(new THREE.BoxGeometry(zone.width, zone.kind === 'hardscape' ? 0.12 : 0.06, zone.depth), new THREE.MeshStandardMaterial({ color: zone.color, transparent: true, opacity: zone.kind === 'hardscape' ? 0.92 : 0.55 }));
      box.position.set(zone.x, h + (zone.kind === 'hardscape' ? 0.08 : 0.04), zone.y);
      scene.add(box);
    });

    let frame = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
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
      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      terrainMat.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [terrainBlobs, zones]);
  return <div ref={mountRef} className="three" />;
}
