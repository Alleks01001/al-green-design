"use client";

import { useEffect, useMemo, useState } from "react";
import { entitiesBounds } from "@/core/cad/geometry";
import { useProjectStore } from "@/stores/projectStore";
import type { SnapMode } from "@/types/domain";

const SNAP_OPTIONS: Array<{ id: SnapMode; label: string; short: string }> = [
  { id: "grid", label: "Raster", short: "RASTER" },
  { id: "endpoint", label: "Endpunkt", short: "END" },
  { id: "midpoint", label: "Mittelpunkt", short: "MITTE" },
  { id: "center", label: "Zentrum", short: "ZENTRUM" },
  { id: "intersection", label: "Schnittpunkt", short: "SCHNITT" }
];

function metric(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function ProfessionalCadPanel() {
  const store = useProjectStore();
  const selected = useMemo(
    () => store.entities.filter(entity => store.selectedIds.includes(entity.id)),
    [store.entities, store.selectedIds]
  );
  const selectionBounds = useMemo(() => entitiesBounds(selected), [selected]);
  const selectionCenter = useMemo(() => ({
    x: (selectionBounds.minX + selectionBounds.maxX) / 2,
    y: (selectionBounds.minY + selectionBounds.maxY) / 2
  }), [selectionBounds]);
  const selectionWidth = Math.max(0, selectionBounds.maxX - selectionBounds.minX);
  const selectionDepth = Math.max(0, selectionBounds.maxY - selectionBounds.minY);

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [width, setWidth] = useState(1);
  const [depth, setDepth] = useState(1);
  const [rotationDelta, setRotationDelta] = useState(0);
  const [proportional, setProportional] = useState(false);
  const [blockName, setBlockName] = useState("Neue Blockdefinition");

  useEffect(() => {
    setX(metric(selectionCenter.x));
    setY(metric(selectionCenter.y));
    setWidth(metric(Math.max(0.001, selectionWidth)));
    setDepth(metric(Math.max(0.001, selectionDepth)));
    setRotationDelta(0);
  }, [selectionCenter.x, selectionCenter.y, selectionWidth, selectionDepth, store.selectedIds.join("|")]);

  function applyTransform() {
    if (selected.length === 0) return;
    store.transformSelected({ x, y, width, depth, rotationDelta }, "Präzise CAD-Transformation");
    setRotationDelta(0);
  }

  function changeWidth(value: number) {
    const next = Math.max(0.001, value || 0.001);
    if (proportional && width > 0) setDepth(metric(depth * (next / width)));
    setWidth(next);
  }

  function changeDepth(value: number) {
    const next = Math.max(0.001, value || 0.001);
    if (proportional && depth > 0) setWidth(metric(width * (next / depth)));
    setDepth(next);
  }

  function isSelectable(entity: (typeof store.entities)[number]) {
    const layer = store.layers.find(item => item.id === entity.layerId);
    return entity.visible && !entity.locked && layer?.visible !== false && !layer?.locked;
  }

  function selectAll() {
    store.setSelectedIds(store.entities.filter(isSelectable).map(entity => entity.id));
  }

  function selectSameKind() {
    const first = selected[0];
    if (!first) return;
    store.setSelectedIds(store.entities.filter(entity => entity.kind === first.kind && isSelectable(entity)).map(entity => entity.id));
  }

  function selectSameLayer() {
    const first = selected[0];
    if (!first) return;
    store.setSelectedIds(store.entities.filter(entity => entity.layerId === first.layerId && isSelectable(entity)).map(entity => entity.id));
  }

  function invertSelection() {
    const current = new Set(store.selectedIds);
    store.setSelectedIds(store.entities.filter(entity => isSelectable(entity) && !current.has(entity.id)).map(entity => entity.id));
  }

  function createBlock() {
    if (!blockName.trim() || selected.length === 0) return;
    store.createBlockFromSelected(blockName);
    setBlockName(`Block ${store.blockDefinitions.length + 2}`);
  }

  return (
    <section className="professionalCadPanel" id="professional-cad">
      <div className="panelHeading">
        <div><span className="eyebrow">V3.1 Precision CAD</span><h3>Fang, Gruppen & Blöcke</h3></div>
        <span>{selected.length} gewählt</span>
      </div>

      <h4>Objektfang & Zeichnungspräzision</h4>
      <div className="snapModeGrid">
        {SNAP_OPTIONS.map(option => (
          <button
            key={option.id}
            type="button"
            title={option.label}
            className={store.snapModes.includes(option.id) ? "active" : ""}
            onClick={() => store.toggleSnapMode(option.id)}
          >
            <strong>{option.short}</strong><small>{option.label}</small>
          </button>
        ))}
      </div>
      <div className="precisionSettingsRow">
        <button type="button" className={store.orthogonalMode ? "active" : ""} onClick={store.toggleOrthogonalMode}>ORTHO 0° / 45° / 90°</button>
        <label>Raster m<input type="number" min="0.05" step="0.05" value={store.gridSize} onChange={event => store.setGridSize(Number(event.target.value) || .05)} /></label>
        <label>Schritt m<input type="number" min="0.01" step="0.01" value={store.nudgeStep} onChange={event => store.setNudgeStep(Number(event.target.value) || .01)} /></label>
      </div>

      <h4>Präzise Transformation</h4>
      <div className="precisionTransformGrid">
        <label>Mittelpunkt X m<input type="number" step="0.01" value={x} disabled={!selected.length} onChange={event => setX(Number(event.target.value) || 0)} /></label>
        <label>Mittelpunkt Y m<input type="number" step="0.01" value={y} disabled={!selected.length} onChange={event => setY(Number(event.target.value) || 0)} /></label>
        <label>Gesamtbreite m<input type="number" min="0.001" step="0.01" value={width} disabled={!selected.length} onChange={event => changeWidth(Number(event.target.value))} /></label>
        <label>Gesamttiefe m<input type="number" min="0.001" step="0.01" value={depth} disabled={!selected.length} onChange={event => changeDepth(Number(event.target.value))} /></label>
        <label>Drehung Δ°<input type="number" step="1" value={rotationDelta} disabled={!selected.length} onChange={event => setRotationDelta(Number(event.target.value) || 0)} /></label>
        <label className="checkField"><input type="checkbox" checked={proportional} onChange={event => setProportional(event.target.checked)} /> Proportionen</label>
      </div>
      <button type="button" className="primaryWideAction" disabled={!selected.length} onClick={applyTransform}>Transformation anwenden</button>

      <h4>Auswahl & Gruppen</h4>
      <div className="compactButtonGrid">
        <button type="button" onClick={selectAll}>Alles wählen</button>
        <button type="button" disabled={!selected.length} onClick={selectSameKind}>Gleicher Typ</button>
        <button type="button" disabled={!selected.length} onClick={selectSameLayer}>Gleicher Layer</button>
        <button type="button" onClick={invertSelection}>Auswahl umkehren</button>
        <button type="button" disabled={selected.length < 2} onClick={store.groupSelected}>Gruppieren</button>
        <button type="button" disabled={!selected.some(entity => typeof entity.metadata?.groupId === "string")} onClick={store.ungroupSelected}>Gruppierung lösen</button>
      </div>

      <h4>Wiederverwendbare Blöcke</h4>
      <div className="blockCreateRow">
        <input value={blockName} maxLength={60} onChange={event => setBlockName(event.target.value)} placeholder="Blockname" />
        <button type="button" disabled={!selected.length || !blockName.trim()} onClick={createBlock}>Aus Auswahl erstellen</button>
      </div>
      <div className="blockDefinitionList">
        {store.blockDefinitions.length === 0 && <p className="panelHint">Noch keine Blöcke gespeichert. Wähle Objekte und erstelle daraus einen wiederverwendbaren Block.</p>}
        {store.blockDefinitions.map(definition => (
          <article key={definition.id}>
            <div><strong>{definition.name}</strong><small>{definition.entities.length} Objekte · {new Date(definition.createdAt).toLocaleDateString("de-AT")}</small></div>
            <div><button type="button" onClick={() => store.insertBlock(definition.id)}>Einfügen</button><button type="button" className="dangerMini" onClick={() => store.deleteBlockDefinition(definition.id)}>×</button></div>
          </article>
        ))}
      </div>

      <p className="panelHint">Klick auf ein Gruppenobjekt wählt die ganze Gruppe. Alt + Klick wählt nur das einzelne Objekt. Tastatur: Strg+A, Strg+D, Strg+G, Strg+Umschalt+G und Pfeiltasten.</p>
    </section>
  );
}
