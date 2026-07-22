"use client";

import { useMemo, useState } from "react";
import { distance, entityCenter, makeId } from "@/core/cad/geometry";
import { useProjectStore } from "@/stores/projectStore";
import type { CadEntity, CadTool, LinePattern } from "@/types/domain";

const detailTools: Array<{ id: CadTool; label: string; icon: string }> = [
  { id: "freehand", label: "Freihand", icon: "〰" },
  { id: "polygon", label: "Polygon", icon: "⬡" },
  { id: "triangle", label: "Dreieck", icon: "△" },
  { id: "pentagon", label: "Fünfeck", icon: "⬠" },
  { id: "hexagon", label: "Sechseck", icon: "⬡" },
  { id: "star", label: "Stern", icon: "★" },
  { id: "ellipse", label: "Ellipse", icon: "⬭" },
  { id: "rounded", label: "Abgerundet", icon: "▢" },
  { id: "dimension", label: "Bemaßung", icon: "↔" },
  { id: "path", label: "Weg", icon: "⌁" },
  { id: "terrace", label: "Terrasse", icon: "▤" },
  { id: "bed", label: "Beet", icon: "▧" },
  { id: "stairs", label: "Treppe", icon: "▰" },
  { id: "fence", label: "Zaun", icon: "╫" },
  { id: "hedge", label: "Hecke", icon: "♒" },
  { id: "pool", label: "Pool", icon: "▭" },
  { id: "water", label: "Wasserfläche", icon: "≈" }
];

type AlignMode = "left" | "right" | "top" | "bottom" | "center-x" | "center-y";
type CopiedStyle = Pick<CadEntity, "fillColor" | "strokeColor" | "opacity" | "strokeWidth" | "linePattern" | "arrowStart" | "arrowEnd" | "materialId">;

function centerOf(entity: CadEntity) {
  return entityCenter(entity);
}

function entityWidth(entity: CadEntity) {
  if (entity.shape === "line" || entity.shape === "polyline") return Math.max(entity.width, .05);
  return entity.width;
}

function entityDepth(entity: CadEntity) {
  if ((entity.shape === "line" || entity.shape === "polyline") && entity.points.length >= 2) return distance(entity.points[0], entity.points.at(-1)!);
  return entity.depth;
}

export function DetailToolsPanel() {
  const store = useProjectStore();
  const [copiedStyle, setCopiedStyle] = useState<CopiedStyle | null>(null);
  const selected = useMemo(
    () => store.entities.filter(entity => store.selectedIds.includes(entity.id)),
    [store.entities, store.selectedIds]
  );
  const first = selected[0];

  function replaceSelected(mapper: (entity: CadEntity, index: number) => CadEntity, label: string) {
    if (!selected.length) return;
    const ids = new Set(selected.map(entity => entity.id));
    let index = 0;
    store.setEntities(
      store.entities.map(entity => ids.has(entity.id) ? mapper(entity, index++) : entity),
      label
    );
  }

  function patchSelected(patch: Partial<CadEntity>, label: string) {
    replaceSelected(entity => ({ ...entity, ...patch }), label);
  }

  function patchMetadata(patch: Record<string, string | number | boolean>, label: string) {
    replaceSelected(entity => ({ ...entity, metadata: { ...(entity.metadata ?? {}), ...patch } }), label);
  }

  function rotate(delta: number) {
    replaceSelected(entity => ({ ...entity, rotation: (entity.rotation + delta + 360) % 360 }), `Auswahl um ${delta}° gedreht`);
  }

  function align(mode: AlignMode) {
    if (selected.length < 2) return;
    const left = Math.min(...selected.map(entity => centerOf(entity).x - entityWidth(entity) / 2));
    const right = Math.max(...selected.map(entity => centerOf(entity).x + entityWidth(entity) / 2));
    const top = Math.min(...selected.map(entity => centerOf(entity).y - entityDepth(entity) / 2));
    const bottom = Math.max(...selected.map(entity => centerOf(entity).y + entityDepth(entity) / 2));
    const centerX = selected.reduce((sum, entity) => sum + centerOf(entity).x, 0) / selected.length;
    const centerY = selected.reduce((sum, entity) => sum + centerOf(entity).y, 0) / selected.length;

    replaceSelected(entity => {
      const current = centerOf(entity);
      const target = { ...current };
      if (mode === "left") target.x = left + entityWidth(entity) / 2;
      if (mode === "right") target.x = right - entityWidth(entity) / 2;
      if (mode === "top") target.y = top + entityDepth(entity) / 2;
      if (mode === "bottom") target.y = bottom - entityDepth(entity) / 2;
      if (mode === "center-x") target.x = centerX;
      if (mode === "center-y") target.y = centerY;
      const delta = { x: target.x - current.x, y: target.y - current.y };
      const pointBased = entity.shape === "line" || entity.shape === "polyline" || entity.shape === "polygon";
      return pointBased
        ? { ...entity, position: { x: entity.position.x + delta.x, y: entity.position.y + delta.y }, points: entity.points.map(point => ({ x: point.x + delta.x, y: point.y + delta.y })) }
        : { ...entity, position: target };
    }, "Auswahl ausgerichtet");
  }

  function distribute(axis: "x" | "y") {
    if (selected.length < 3) return;
    const ordered = [...selected].sort((a, b) => axis === "x" ? centerOf(a).x - centerOf(b).x : centerOf(a).y - centerOf(b).y);
    const start = axis === "x" ? centerOf(ordered[0]).x : centerOf(ordered[0]).y;
    const end = axis === "x" ? centerOf(ordered.at(-1)!).x : centerOf(ordered.at(-1)!).y;
    const step = (end - start) / (ordered.length - 1);
    const targets = new Map(ordered.map((entity, index) => [entity.id, start + step * index]));
    replaceSelected(entity => {
      const current = centerOf(entity);
      const target = axis === "x"
        ? { x: targets.get(entity.id) ?? current.x, y: current.y }
        : { x: current.x, y: targets.get(entity.id) ?? current.y };
      const delta = { x: target.x - current.x, y: target.y - current.y };
      const pointBased = entity.shape === "line" || entity.shape === "polyline" || entity.shape === "polygon";
      return pointBased
        ? { ...entity, position: { x: entity.position.x + delta.x, y: entity.position.y + delta.y }, points: entity.points.map(point => ({ x: point.x + delta.x, y: point.y + delta.y })) }
        : { ...entity, position: target };
    }, axis === "x" ? "Horizontal verteilt" : "Vertikal verteilt");
  }

  function equalize(mode: "width" | "depth" | "size") {
    if (!first || selected.length < 2) return;
    replaceSelected(entity => ({
      ...entity,
      width: mode === "depth" ? entity.width : first.width,
      depth: mode === "width" ? entity.depth : first.depth,
      radius: entity.shape === "circle" && mode !== "depth" ? first.width / 2 : entity.radius
    }), mode === "width" ? "Gleiche Breite" : mode === "depth" ? "Gleiche Tiefe" : "Gleiche Größe");
  }

  function reorder(direction: "front" | "back") {
    if (!selected.length) return;
    const ids = new Set(selected.map(entity => entity.id));
    const chosen = store.entities.filter(entity => ids.has(entity.id));
    const rest = store.entities.filter(entity => !ids.has(entity.id));
    store.setEntities(direction === "front" ? [...rest, ...chosen] : [...chosen, ...rest], direction === "front" ? "Nach vorne gestellt" : "Nach hinten gestellt");
  }

  function copyStyle() {
    if (!first) return;
    setCopiedStyle({
      fillColor: first.fillColor,
      strokeColor: first.strokeColor,
      opacity: first.opacity,
      strokeWidth: first.strokeWidth,
      linePattern: first.linePattern,
      arrowStart: first.arrowStart,
      arrowEnd: first.arrowEnd,
      materialId: first.materialId
    });
  }

  function pasteStyle() {
    if (!copiedStyle) return;
    patchSelected(copiedStyle, "Stil eingesetzt");
  }

  function orthogonalize() {
    replaceSelected(entity => {
      if (entity.points.length < 2) return entity;
      const points = [entity.points[0]];
      for (let index = 1; index < entity.points.length; index += 1) {
        const previous = points[index - 1];
        const original = entity.points[index];
        const dx = Math.abs(original.x - previous.x);
        const dy = Math.abs(original.y - previous.y);
        points.push(dx >= dy ? { x: original.x, y: previous.y } : { x: previous.x, y: original.y });
      }
      return { ...entity, points, position: entityCenter({ ...entity, points }) };
    }, "Linien orthogonalisiert");
  }

  function connectSelection() {
    if (selected.length !== 2) return;
    const start = centerOf(selected[0]);
    const end = centerOf(selected[1]);
    const id = makeId("connector");
    store.addEntity({
      id,
      kind: "annotation",
      shape: "line",
      name: `${selected[0].name} ↔ ${selected[1].name}`,
      points: [start, end],
      position: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      width: .05,
      depth: distance(start, end),
      height: .02,
      rotation: 0,
      layerId: store.layers.some(layer => layer.id === "layer-dimensions") ? "layer-dimensions" : store.activeLayerId,
      strokeColor: "#5f1526",
      strokeWidth: .05,
      linePattern: "dashed",
      arrowEnd: true,
      visible: true,
      locked: false,
      metadata: { connectionStartId: selected[0].id, connectionEndId: selected[1].id, dynamicConnection: true }
    }, "Dynamische Verbindung erstellt");
  }

  return (
    <section className="detailToolsPanel" id="detailwerkzeuge">
      <div className="panelHeading">
        <div><span className="eyebrow">CAD Professional</span><h3>Detailwerkzeuge</h3></div>
        <span>{selected.length} gewählt</span>
      </div>

      <div className="detailToolGrid" aria-label="Detail-Zeichenwerkzeuge">
        {detailTools.map(tool => (
          <button key={tool.id} type="button" className={store.activeTool === tool.id ? "active" : ""} onClick={() => store.setTool(tool.id)}>
            <span>{tool.icon}</span><small>{tool.label}</small>
          </button>
        ))}
      </div>

      <h4>Geometrie & Schnellaktionen</h4>
      <div className="compactButtonGrid">
        <button type="button" disabled={!selected.length} onClick={() => rotate(-15)}>↶ 15°</button>
        <button type="button" disabled={!selected.length} onClick={() => rotate(15)}>↷ 15°</button>
        <button type="button" disabled={!selected.length} onClick={store.duplicateSelected}>Duplizieren</button>
        <button type="button" disabled={!selected.length} onClick={store.deleteSelected}>Löschen</button>
        <button type="button" disabled={!selected.length} onClick={() => patchSelected({ locked: !selected.every(entity => entity.locked) }, "Sperre geändert")}>{selected.every(entity => entity.locked) ? "Entsperren" : "Sperren"}</button>
        <button type="button" disabled={!selected.length} onClick={() => patchSelected({ visible: !selected.every(entity => entity.visible) }, "Sichtbarkeit geändert")}>{selected.every(entity => entity.visible) ? "Ausblenden" : "Einblenden"}</button>
        <button type="button" disabled={!selected.length} onClick={() => reorder("front")}>Nach vorne</button>
        <button type="button" disabled={!selected.length} onClick={() => reorder("back")}>Nach hinten</button>
        <button type="button" disabled={!first} onClick={copyStyle}>Stil kopieren</button>
        <button type="button" disabled={!copiedStyle || !selected.length} onClick={pasteStyle}>Stil einsetzen</button>
        <button type="button" disabled={!selected.some(entity => entity.points.length >= 2)} onClick={orthogonalize}>90°-Linie</button>
        <button type="button" disabled={!selected.length} onClick={() => patchMetadata({ curve: !selected.every(entity => entity.metadata?.curve === true) }, "Kurvendarstellung geändert")}>Kurve an/aus</button>
        <button type="button" disabled={selected.length !== 2} onClick={connectSelection}>Auswahl verbinden</button>
      </div>

      <h4>Ausrichten, Verteilen & Angleichen</h4>
      <div className="compactButtonGrid alignGrid">
        <button type="button" disabled={selected.length < 2} onClick={() => align("left")}>Links</button>
        <button type="button" disabled={selected.length < 2} onClick={() => align("center-x")}>Mitte X</button>
        <button type="button" disabled={selected.length < 2} onClick={() => align("right")}>Rechts</button>
        <button type="button" disabled={selected.length < 2} onClick={() => align("top")}>Oben</button>
        <button type="button" disabled={selected.length < 2} onClick={() => align("center-y")}>Mitte Y</button>
        <button type="button" disabled={selected.length < 2} onClick={() => align("bottom")}>Unten</button>
        <button type="button" disabled={selected.length < 3} onClick={() => distribute("x")}>↔ Verteilen</button>
        <button type="button" disabled={selected.length < 3} onClick={() => distribute("y")}>↕ Verteilen</button>
        <button type="button" disabled={selected.length < 2} onClick={() => equalize("width")}>Gleiche Breite</button>
        <button type="button" disabled={selected.length < 2} onClick={() => equalize("depth")}>Gleiche Tiefe</button>
        <button type="button" disabled={selected.length < 2} onClick={() => equalize("size")}>Gleiche Größe</button>
      </div>

      <h4>Stil & Abmessungen</h4>
      <div className="detailFields">
        <label>Füllfarbe<input type="color" value={first?.fillColor ?? "#9f7658"} disabled={!first} onChange={event => patchSelected({ fillColor: event.target.value }, "Füllfarbe geändert")} /></label>
        <label>Linienfarbe<input type="color" value={first?.strokeColor ?? "#5f1526"} disabled={!first} onChange={event => patchSelected({ strokeColor: event.target.value }, "Linienfarbe geändert")} /></label>
        <label>Deckkraft<input type="range" min="0.1" max="1" step="0.05" value={first?.opacity ?? 1} disabled={!first} onChange={event => patchSelected({ opacity: Number(event.target.value) }, "Deckkraft geändert")} /></label>
        <label>Linienart<select value={first?.linePattern ?? "solid"} disabled={!first} onChange={event => patchSelected({ linePattern: event.target.value as LinePattern }, "Linienart geändert")}><option value="solid">Durchgezogen</option><option value="dashed">Gestrichelt</option><option value="dotted">Gepunktet</option></select></label>
        <label>Breite m<input type="number" min="0.05" step="0.05" value={first?.width ?? 1} disabled={!first} onChange={event => patchSelected({ width: Math.max(.05, Number(event.target.value) || .05) }, "Breite geändert")} /></label>
        <label>Tiefe m<input type="number" min="0.05" step="0.05" value={first?.depth ?? 1} disabled={!first} onChange={event => patchSelected({ depth: Math.max(.05, Number(event.target.value) || .05) }, "Tiefe geändert")} /></label>
        <label>Höhe m<input type="number" min="0.02" step="0.05" value={first?.height ?? .1} disabled={!first} onChange={event => patchSelected({ height: Math.max(.02, Number(event.target.value) || .02) }, "Höhe geändert")} /></label>
        <label>Linie m<input type="number" min="0.02" step="0.02" value={first?.strokeWidth ?? first?.width ?? .1} disabled={!first} onChange={event => patchSelected({ strokeWidth: Math.max(.02, Number(event.target.value) || .02) }, "Linienstärke geändert")} /></label>
        <label className="checkField"><input type="checkbox" checked={first?.arrowStart ?? false} disabled={!first} onChange={event => patchSelected({ arrowStart: event.target.checked }, "Startpfeil geändert")} /> Pfeil Start</label>
        <label className="checkField"><input type="checkbox" checked={first?.arrowEnd ?? false} disabled={!first} onChange={event => patchSelected({ arrowEnd: event.target.checked }, "Endpfeil geändert")} /> Pfeil Ende</label>
      </div>
      <p className="panelHint">Mehrfachauswahl mit Shift oder Strg. Dynamische Verbindungen folgen den verbundenen Objekten beim Verschieben.</p>
    </section>
  );
}
