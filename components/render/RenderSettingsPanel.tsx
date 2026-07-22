"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import type { RenderPreset, RenderQuality } from "@/types/domain";

const presets: Array<{ id: RenderPreset; label: string }> = [
  { id: "daylight", label: "Tageslicht" },
  { id: "golden-hour", label: "Goldene Stunde" },
  { id: "overcast", label: "Bewölkt" },
  { id: "night", label: "Nacht" }
];

export function RenderSettingsPanel() {
  const { renderSettings, updateRenderSettings, setViewMode } = useProjectStore();
  const [message, setMessage] = useState("Bereit für Vorschau oder PNG-Export");

  function exportPng() {
    setViewMode("3d");
    setMessage("Render wird vorbereitet …");
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("algreen:export-render"));
      setMessage("PNG-Export ausgelöst");
    }, 350);
  }

  return (
    <section className="renderPanel">
      <div className="panelHeading">
        <div><span className="eyebrow">Studio 2.5</span><h3>Photoreal Render</h3></div>
        <span>HDR</span>
      </div>
      <p className="panelHint">Lichtstimmung, Qualität, Schatten und Ausgabe der 3D-Szene steuern.</p>

      <div className="renderPresets">
        {presets.map(preset => (
          <button key={preset.id} type="button" className={renderSettings.preset === preset.id ? "active" : ""}
            onClick={() => updateRenderSettings({ preset: preset.id })}>{preset.label}</button>
        ))}
      </div>

      <label className="renderField"><span>Renderqualität</span>
        <select value={renderSettings.quality} onChange={e => updateRenderSettings({ quality: e.target.value as RenderQuality })}>
          <option value="preview">Vorschau</option><option value="high">Hoch</option><option value="ultra">Ultra</option>
        </select>
      </label>
      <label className="renderField"><span>Tageszeit <strong>{renderSettings.hour.toFixed(1)} Uhr</strong></span>
        <input type="range" min="0" max="24" step="0.5" value={renderSettings.hour} onChange={e => updateRenderSettings({ hour: Number(e.target.value) })} />
      </label>
      <label className="renderField"><span>Sonnenrichtung <strong>{renderSettings.azimuth}°</strong></span>
        <input type="range" min="0" max="360" step="5" value={renderSettings.azimuth} onChange={e => updateRenderSettings({ azimuth: Number(e.target.value) })} />
      </label>
      <label className="renderField"><span>Belichtung <strong>{renderSettings.exposure.toFixed(2)}</strong></span>
        <input type="range" min="0.45" max="1.8" step="0.05" value={renderSettings.exposure} onChange={e => updateRenderSettings({ exposure: Number(e.target.value) })} />
      </label>
      <label className="renderField"><span>Schatten <strong>{Math.round(renderSettings.shadowStrength * 100)} %</strong></span>
        <input type="range" min="0" max="1.5" step="0.05" value={renderSettings.shadowStrength} onChange={e => updateRenderSettings({ shadowStrength: Number(e.target.value) })} />
      </label>
      <div className="renderToggles">
        <button type="button" className={renderSettings.fogEnabled ? "active" : ""} onClick={() => updateRenderSettings({ fogEnabled: !renderSettings.fogEnabled })}>Atmosphäre</button>
        <button type="button" className={renderSettings.gridVisible3d ? "active" : ""} onClick={() => updateRenderSettings({ gridVisible3d: !renderSettings.gridVisible3d })}>3D-Raster</button>
      </div>
      <button className="renderExport" type="button" onClick={exportPng}>3D-Ansicht als PNG exportieren</button>
      <small className="renderMessage">{message}</small>
    </section>
  );
}
