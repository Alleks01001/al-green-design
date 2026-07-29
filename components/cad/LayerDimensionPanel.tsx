"use client";

import { useMemo, useState, type FormEvent } from "react";
import { distance, entityCenter, makeId } from "@/core/cad/geometry";
import { useProjectStore } from "@/stores/projectStore";
import type { CadEntity, DimensionMode, DimensionUnit } from "@/types/domain";

const DIMENSION_MODES: Array<{ id: DimensionMode; label: string; icon: string }> = [
  { id: "aligned", label: "Ausgerichtet", icon: "⟷" },
  { id: "horizontal", label: "Horizontal", icon: "↔" },
  { id: "vertical", label: "Vertikal", icon: "↕" }
];

const DIMENSION_UNITS: Array<{ id: DimensionUnit; label: string }> = [
  { id: "m", label: "Meter" },
  { id: "cm", label: "Zentimeter" },
  { id: "mm", label: "Millimeter" }
];

export function LayerDimensionPanel() {
  const store = useProjectStore();
  const [levelName, setLevelName] = useState("Neue Ebene");
  const [levelElevation, setLevelElevation] = useState(0);
  const selected = useMemo(
    () => store.entities.filter(entity => store.selectedIds.includes(entity.id)),
    [store.entities, store.selectedIds]
  );
  const entityCountByLayer = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entity of store.entities) counts.set(entity.layerId, (counts.get(entity.layerId) ?? 0) + 1);
    return counts;
  }, [store.entities]);

  function createLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    store.addLayer(levelName, levelElevation);
    setLevelName("Neue Ebene");
  }

  function createAssociativeDimension() {
    if (selected.length !== 2) return;
    const start = entityCenter(selected[0]);
    const end = entityCenter(selected[1]);
    const mode = store.dimensionSettings.mode;
    const layerId = store.layers.some(layer => layer.id === "layer-dimensions" && layer.visible && !layer.locked)
      ? "layer-dimensions"
      : store.activeLayerId;
    const entity: CadEntity = {
      id: makeId("dimension"),
      kind: "annotation",
      shape: "line",
      name: `Assoziatives Maß · ${selected[0].name} / ${selected[1].name}`,
      points: [start, end],
      position: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      width: 0.04,
      depth: distance(start, end),
      height: 0.02,
      rotation: 0,
      layerId,
      strokeColor: "#6e2940",
      strokeWidth: 0.04,
      linePattern: "solid",
      visible: true,
      locked: false,
      metadata: {
        dimension: true,
        associativeDimension: true,
        connectionStartId: selected[0].id,
        connectionEndId: selected[1].id,
        dynamicConnection: true,
        dimensionMode: mode,
        dimensionUnit: store.dimensionSettings.unit,
        dimensionDecimals: store.dimensionSettings.decimals,
        dimensionTextScale: store.dimensionSettings.textScale
      }
    };
    store.addEntity(entity, "Assoziative Bemaßung erstellt");
  }

  return (
    <section className="layerDimensionPanel" id="layer-dimensions">
      <div className="panelHeading">
        <div><span className="eyebrow">V3.1 Alpha 8</span><h3>Ebenen & Bemaßung</h3></div>
        <span>{store.layers.length}</span>
      </div>

      <h4>Professionelle Bemaßung</h4>
      <div className="dimensionModeGrid">
        {DIMENSION_MODES.map(mode => (
          <button
            key={mode.id}
            type="button"
            className={store.dimensionSettings.mode === mode.id ? "active" : ""}
            onClick={() => store.updateDimensionSettings({ mode: mode.id })}
          >
            <strong>{mode.icon}</strong><small>{mode.label}</small>
          </button>
        ))}
      </div>
      <div className="dimensionSettingsGrid">
        <label>Einheit
          <select value={store.dimensionSettings.unit} onChange={event => store.updateDimensionSettings({ unit: event.target.value as DimensionUnit })}>
            {DIMENSION_UNITS.map(unit => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
          </select>
        </label>
        <label>Nachkommastellen
          <select value={store.dimensionSettings.decimals} onChange={event => store.updateDimensionSettings({ decimals: Number(event.target.value) as 0 | 1 | 2 | 3 })}>
            {[0, 1, 2, 3].map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="dimensionScaleField">Textgröße <strong>{store.dimensionSettings.textScale.toFixed(2)}×</strong>
          <input type="range" min="0.65" max="2" step="0.05" value={store.dimensionSettings.textScale} onChange={event => store.updateDimensionSettings({ textScale: Number(event.target.value) })} />
        </label>
      </div>
      <div className="dimensionActions">
        <button type="button" className={store.activeTool === "dimension" ? "active" : ""} onClick={() => store.setTool("dimension")}>Maß im Plan setzen</button>
        <button type="button" disabled={selected.length !== 2} onClick={createAssociativeDimension}>2 Objekte assoziativ bemaßen</button>
      </div>
      <p className="panelHint">Assoziative Maße folgen automatisch, wenn eines der beiden verknüpften Objekte verschoben wird.</p>

      <div className="layerHeadingRow">
        <h4>Ebenen-Manager</h4>
        <div><button type="button" onClick={store.showAllLayers}>Alle zeigen</button></div>
      </div>
      <form className="levelCreator" onSubmit={createLevel}>
        <label>Name<input value={levelName} maxLength={40} onChange={event => setLevelName(event.target.value)} /></label>
        <label>Höhe Z<div><input type="number" min="-50" max="200" step="0.05" value={levelElevation} onChange={event => setLevelElevation(Number(event.target.value))} /><span>m</span></div></label>
        <button type="submit">＋ Ebene</button>
      </form>
      <div className="levelPresets" aria-label="Höhenvorlagen">
        <button type="button" onClick={() => store.addLayer("Terrasse", .45)}>Terrasse +0,45</button>
        <button type="button" onClick={() => store.addLayer("Erdgeschoss", .30)}>EG +0,30</button>
        <button type="button" onClick={() => store.addLayer("1. Obergeschoss", 3.20)}>1. OG +3,20</button>
        <button type="button" onClick={() => store.addLayer("Pool", -1.20)}>Pool −1,20</button>
      </div>

      {selected.length > 0 && (
        <label className="selectionLayerMove">Auswahl ({selected.length}) auf Layer verschieben
          <select value="" onChange={event => event.target.value && store.moveSelectedToLayer(event.target.value)}>
            <option value="" disabled>Layer wählen …</option>
            {store.layers.filter(layer => !layer.locked).map(layer => <option key={layer.id} value={layer.id}>{layer.name} · {layer.elevation >= 0 ? "+" : "−"}{Math.abs(layer.elevation).toFixed(2)} m</option>)}
          </select>
        </label>
      )}

      <div className="layerList">
        {store.layers.map((layer, index) => {
          const count = entityCountByLayer.get(layer.id) ?? 0;
          const active = store.activeLayerId === layer.id;
          return (
            <article key={`${layer.id}:${layer.name}:${layer.elevation}`} className={active ? "active" : ""}>
              <button type="button" className="layerColorButton" disabled={layer.locked} title={layer.locked ? "Gesperrte Layer können nicht aktiv sein" : "Als aktiven Layer verwenden"} onClick={() => store.setActiveLayerId(layer.id)}>
                <span style={{ background: layer.color }} />
              </button>
              <div className="layerMain">
                <input
                  className="layerNameInput"
                  defaultValue={layer.name}
                  aria-label="Layername"
                  onBlur={event => event.target.value.trim() && event.target.value.trim() !== layer.name && store.updateLayer(layer.id, { name: event.target.value.trim() })}
                />
                <small>{count} Objekte{active ? " · aktiv" : ""}</small>
                <label className="layerElevationField">Höhe Z
                  <span><input type="number" min="-50" max="200" step="0.05" defaultValue={layer.elevation} onBlur={event => store.updateLayer(layer.id, { elevation: Number(event.target.value) || 0 })} /><em>m</em></span>
                </label>
                <div className="layerOpacityRow">
                  <span>Deckkraft</span>
                  <input type="range" min="0.1" max="1" step="0.05" value={layer.opacity} onChange={event => store.updateLayer(layer.id, { opacity: Number(event.target.value) })} />
                  <strong>{Math.round(layer.opacity * 100)}%</strong>
                </div>
              </div>
              <div className="layerControls">
                <input type="color" value={layer.color} title="Layerfarbe" onChange={event => store.updateLayer(layer.id, { color: event.target.value })} />
                <button type="button" className={layer.visible ? "on" : ""} title="Sichtbarkeit" onClick={() => store.updateLayer(layer.id, { visible: !layer.visible })}>{layer.visible ? "◉" : "○"}</button>
                <button type="button" className={layer.locked ? "on" : ""} title="Sperre" onClick={() => store.updateLayer(layer.id, { locked: !layer.locked })}>{layer.locked ? "🔒" : "🔓"}</button>
                <button type="button" className={layer.printable ? "on" : ""} title="Im PDF drucken" onClick={() => store.updateLayer(layer.id, { printable: !layer.printable })}>{layer.printable ? "▣" : "□"}</button>
                <button type="button" title="Layer isolieren" onClick={() => store.isolateLayer(layer.id)}>ISO</button>
                <button type="button" disabled={index === 0} title="Layer nach oben" onClick={() => store.moveLayer(layer.id, -1)}>↑</button>
                <button type="button" disabled={index === store.layers.length - 1} title="Layer nach unten" onClick={() => store.moveLayer(layer.id, 1)}>↓</button>
                <button type="button" className="dangerMini" disabled={count > 0 || store.layers.length <= 1} title={count > 0 ? "Nur leere Layer können gelöscht werden" : "Layer löschen"} onClick={() => store.deleteLayer(layer.id)}>×</button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="panelHint">Es wird immer auf der aktiven Ebene gezeichnet. Ihre Höhe wirkt sofort in 3D, Front- und Seitenansicht. Sichtbarkeit, Sperre, PDF-Druck, Farbe und Deckkraft bleiben im Projekt gespeichert.</p>
    </section>
  );
}
