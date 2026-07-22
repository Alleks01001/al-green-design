"use client";

import { useMemo } from "react";
import { terrainMetrics } from "@/engines/terrain/terrainEngine";
import { useProjectStore } from "@/stores/projectStore";

function format(value: number) { return value.toLocaleString("de-AT", { maximumFractionDigits: 2 }); }

export function TerrainPanel() {
  const { terrain, updateTerrain, updateTerrainPoint, applyTerrainPreset } = useProjectStore();
  const metrics = useMemo(() => terrainMetrics(terrain), [terrain]);
  const featured = terrain.points.filter((_, index) => index % Math.max(1, Math.floor(terrain.points.length / 6)) === 0).slice(0, 6);

  return (
    <section className="terrainPanel">
      <div className="panelHeading">
        <div><span className="eyebrow">STUDIO 2.3</span><h3>Terrain Engine</h3></div>
        <button className={terrain.enabled ? "terrainToggle active" : "terrainToggle"} onClick={() => updateTerrain({ enabled: !terrain.enabled }, "Gelände ein/aus")}>{terrain.enabled ? "AN" : "AUS"}</button>
      </div>
      <p className="panelHint">Digitales Geländemodell mit Höhenpunkten, Böschungsvorlagen sowie Aushub- und Aufschüttungsbilanz.</p>
      <div className="terrainPresets">
        <button onClick={() => applyTerrainPreset("flat")}>Eben</button>
        <button onClick={() => applyTerrainPreset("slope")}>Gefälle</button>
        <button onClick={() => applyTerrainPreset("mound")}>Hügel</button>
        <button onClick={() => applyTerrainPreset("swale")}>Mulde</button>
      </div>
      <div className="propertyPair terrainFields">
        <label>Basishöhe m<input type="number" step="0.05" value={terrain.baseElevation} onChange={event => updateTerrain({ baseElevation: Number(event.target.value) })} /></label>
        <label>Bezugshöhe m<input type="number" step="0.05" value={terrain.cutFillReference} onChange={event => updateTerrain({ cutFillReference: Number(event.target.value) })} /></label>
      </div>
      <label className="compactField">Höhenlinien-Abstand
        <select value={terrain.contourInterval} onChange={event => updateTerrain({ contourInterval: Number(event.target.value) })}>
          <option value={0.1}>0,10 m</option><option value={0.25}>0,25 m</option><option value={0.5}>0,50 m</option><option value={1}>1,00 m</option>
        </select>
      </label>
      <div className="terrainMetrics">
        <div><span>Minimum</span><strong>{format(metrics.minElevation)} m</strong></div>
        <div><span>Maximum</span><strong>{format(metrics.maxElevation)} m</strong></div>
        <div><span>Aushub</span><strong>{format(metrics.cutVolume)} m³</strong></div>
        <div><span>Aufschüttung</span><strong>{format(metrics.fillVolume)} m³</strong></div>
      </div>
      <details className="terrainPoints">
        <summary>Höhenpunkte bearbeiten</summary>
        {featured.map(point => <label key={point.id}><span>{point.x.toFixed(1)} / {point.z.toFixed(1)} m</span><input type="number" step="0.05" value={point.elevation} onChange={event => updateTerrainPoint(point.id, Number(event.target.value))} /></label>)}
      </details>
    </section>
  );
}
