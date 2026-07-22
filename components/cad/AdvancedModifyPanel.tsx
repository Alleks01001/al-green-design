"use client";

import { useEffect, useMemo, useState } from "react";
import { entitiesBounds } from "@/core/cad/geometry";
import { useProjectStore } from "@/stores/projectStore";

export function AdvancedModifyPanel() {
  const store = useProjectStore();
  const selected = useMemo(() => {
    const byId = new Map(store.entities.map(entity => [entity.id, entity]));
    return store.selectedIds.map(id => byId.get(id)).filter((entity): entity is NonNullable<typeof entity> => Boolean(entity));
  }, [store.entities, store.selectedIds]);
  const bounds = useMemo(() => entitiesBounds(selected), [selected]);
  const selectionCenter = useMemo(() => ({
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2
  }), [bounds]);

  const [offset, setOffset] = useState(0.5);
  const [mirrorCopy, setMirrorCopy] = useState(true);
  const [rows, setRows] = useState(2);
  const [columns, setColumns] = useState(3);
  const [spacingX, setSpacingX] = useState(2);
  const [spacingY, setSpacingY] = useState(2);
  const [polarCount, setPolarCount] = useState(6);
  const [polarAngle, setPolarAngle] = useState(360);
  const [polarCenterX, setPolarCenterX] = useState(0);
  const [polarCenterY, setPolarCenterY] = useState(0);
  const [rotateItems, setRotateItems] = useState(true);

  useEffect(() => {
    setPolarCenterX(Math.round(selectionCenter.x * 1000) / 1000);
    setPolarCenterY(Math.round(selectionCenter.y * 1000) / 1000);
  }, [store.selectedIds.join("|")]);

  const lineEditReady = selected.length === 2 && selected.every(entity => entity.shape === "line" && entity.points.length === 2);

  return (
    <section className="advancedModifyPanel" id="advanced-modify">
      <div className="panelHeading">
        <div><span className="eyebrow">V3.1 Alpha 3</span><h3>Modify Engine</h3></div>
        <span>{selected.length}</span>
      </div>

      <h4>Versatz</h4>
      <div className="modifyInlineRow">
        <label>Abstand m<input type="number" step="0.05" value={offset} onChange={event => setOffset(Number(event.target.value) || 0)} /></label>
        <button type="button" disabled={!selected.length || Math.abs(offset) < .001} onClick={() => store.offsetSelected(offset)}>Versatzkopie</button>
        <button type="button" disabled={!selected.length || Math.abs(offset) < .001} onClick={() => store.offsetSelected(-offset)}>Gegenseite</button>
      </div>
      <p className="panelHint">Bei geschlossenen Flächen bedeutet ein positiver Wert außen, ein negativer innen. Material, Layer und BIM-Daten werden übernommen.</p>

      <h4>Spiegeln</h4>
      <label className="modifyCheck"><input type="checkbox" checked={mirrorCopy} onChange={event => setMirrorCopy(event.target.checked)} /> Original behalten und Spiegelkopie erstellen</label>
      <div className="modifyButtonGrid">
        <button type="button" disabled={!selected.length} onClick={() => store.mirrorSelected("horizontal", mirrorCopy)}>An X-Achse spiegeln</button>
        <button type="button" disabled={!selected.length} onClick={() => store.mirrorSelected("vertical", mirrorCopy)}>An Y-Achse spiegeln</button>
      </div>

      <h4>Rechteckige Anordnung</h4>
      <div className="modifyFieldGrid">
        <label>Zeilen<input type="number" min="1" max="10" step="1" value={rows} onChange={event => setRows(Number(event.target.value) || 1)} /></label>
        <label>Spalten<input type="number" min="1" max="10" step="1" value={columns} onChange={event => setColumns(Number(event.target.value) || 1)} /></label>
        <label>Abstand X m<input type="number" step="0.05" value={spacingX} onChange={event => setSpacingX(Number(event.target.value) || 0)} /></label>
        <label>Abstand Y m<input type="number" step="0.05" value={spacingY} onChange={event => setSpacingY(Number(event.target.value) || 0)} /></label>
      </div>
      <button type="button" className="modifyPrimary" disabled={!selected.length || rows * columns <= 1} onClick={() => store.createRectangularArray({ rows, columns, spacingX, spacingY })}>Anordnung mit {Math.max(1, Math.min(100, Math.round(rows) * Math.round(columns)))} Feldern erstellen</button>

      <h4>Polare Anordnung</h4>
      <div className="modifyFieldGrid">
        <label>Anzahl<input type="number" min="2" max="48" step="1" value={polarCount} onChange={event => setPolarCount(Number(event.target.value) || 2)} /></label>
        <label>Gesamtwinkel °<input type="number" min="-360" max="360" step="5" value={polarAngle} onChange={event => setPolarAngle(Number(event.target.value) || 0)} /></label>
        <label>Zentrum X m<input type="number" step="0.05" value={polarCenterX} onChange={event => setPolarCenterX(Number(event.target.value) || 0)} /></label>
        <label>Zentrum Y m<input type="number" step="0.05" value={polarCenterY} onChange={event => setPolarCenterY(Number(event.target.value) || 0)} /></label>
      </div>
      <label className="modifyCheck"><input type="checkbox" checked={rotateItems} onChange={event => setRotateItems(event.target.checked)} /> Objekte entlang des Winkels mitdrehen</label>
      <button type="button" className="modifyPrimary" disabled={!selected.length || polarCount < 2 || Math.abs(polarAngle) < .01} onClick={() => store.createPolarArray({ count: polarCount, totalAngle: polarAngle, center: { x: polarCenterX, y: polarCenterY }, rotateItems })}>Polare Anordnung erstellen</button>

      <h4>Kürzen / Verlängern</h4>
      {lineEditReady ? (
        <div className="lineEditSelection">
          <span>Ziel: <strong>{selected[0].name}</strong></span>
          <span>Begrenzung: <strong>{selected[1].name}</strong></span>
        </div>
      ) : <p className="panelHint">Zuerst die zu bearbeitende gerade Linie, danach mit Strg/Umschalt die Begrenzungslinie wählen.</p>}
      <div className="modifyButtonGrid">
        <button type="button" disabled={!lineEditReady} onClick={() => store.trimOrExtendSelected("trim")}>Bis Schnittpunkt kürzen</button>
        <button type="button" disabled={!lineEditReady} onClick={() => store.trimOrExtendSelected("extend")}>Bis Schnittpunkt verlängern</button>
      </div>

      <p className="panelHint">Alle Änderungen laufen über Rückgängig/Wiederholen. Gruppen, Blockinstanzen, Materialdaten und BIM-Eigenschaften bleiben bei Kopien erhalten.</p>
    </section>
  );
}
