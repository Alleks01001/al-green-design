"use client";

import { entityArea, entityCenter, entityVolume, polylineLength, roundMetric } from "@/core/cad/geometry";
import { calculateLineCost, calculateProjectCost } from "@/engines/cost/costEngine";
import { useProjectStore } from "@/stores/projectStore";
import type { BimProperties, CadEntity, MaintenanceCycle, ProjectPhase } from "@/types/domain";

const phases: ProjectPhase[] = ["Bestand", "Abbruch", "Neubau", "Optional"];
const cycles: MaintenanceCycle[] = ["keine", "monatlich", "quartalsweise", "jährlich", "mehrjährig"];

export function BimInspector() {
  const store = useProjectStore();
  const { entities, bim, selectedIds, layers, history, activeLayerId, setActiveLayerId, updateEntity, moveEntities,
    updateLayer, updateBim, ensureBim, deleteSelected, duplicateSelected, gridSize, setGridSize, vatPercent, setVatPercent } = store;
  const selected = entities.find(entity => selectedIds[0] === entity.id);
  const selectedBim = selected ? bim.find(item => item.entityId === selected.id) : undefined;
  const cost = calculateProjectCost(bim, vatPercent);
  const totalArea = entities.reduce((sum, entity) => sum + entityArea(entity), 0);
  const totalVolume = entities.reduce((sum, entity) => sum + entityVolume(entity), 0);

  function exportBimCsv() {
    const header = ["Objekt", "Kategorie", "Klassifikation", "Phase", "Einheit", "Menge", "Verschnitt %", "Material €/E", "Arbeit €/E", "Gesamt €", "CO2 kg"];
    const rows = bim.map(item => {
      const entity = entities.find(e => e.id === item.entityId);
      const line = calculateLineCost(item);
      return [entity?.name ?? item.entityId, item.category, item.classification, item.phase, item.unit, item.quantity, item.wastePercent,
        item.unitPrice, item.laborUnitPrice, line.total.toFixed(2), line.carbonKg.toFixed(2)];
    });
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "AL_Green_Design_BIM_Mengen_Kosten.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <aside className="inspector">
    <section className="inspectorSection">
      <div className="sectionHeading"><div><span className="eyebrow">CAD / BIM 2.2</span><h2>Eigenschaften</h2></div><span className="selectionCount">{selectedIds.length} gewählt</span></div>
      {selected ? <EntityProperties key={`${selected.id}-${selected.position.x}-${selected.position.y}-${selected.width}-${selected.depth}-${selected.height}-${selected.rotation}-${selected.layerId}`}
        entity={selected} layers={layers} onUpdate={(patch, label) => updateEntity(selected.id, patch, label)} onMove={delta => moveEntities([selected.id], delta, "Position geändert")} />
        : selectedIds.length > 1 ? <div className="multiSelectionCard"><strong>{selectedIds.length} Objekte ausgewählt</strong><p>Gemeinsam bewegen, duplizieren oder löschen.</p></div>
        : <p className="muted">Objekt im 2D-Plan auswählen.</p>}
      <div className="inspectorButtons"><button disabled={!selectedIds.length} onClick={duplicateSelected}>Duplizieren</button><button className="dangerButton" disabled={!selectedIds.length} onClick={deleteSelected}>Löschen</button></div>
    </section>

    <section className="inspectorSection bimDataSection">
      <div className="sectionHeading"><div><span className="eyebrow">BIM ENGINE</span><h2>Bauteildaten</h2></div><span>{bim.length}</span></div>
      {selected && !selectedBim && <button type="button" className="primaryWide" onClick={() => ensureBim(selected.id)}>BIM-Datensatz anlegen</button>}
      {selectedBim ? <BimEditor item={selectedBim} onUpdate={patch => updateBim(selectedBim.entityId, patch)} /> : <p className="muted">Ein Objekt mit BIM-Datensatz auswählen.</p>}
    </section>

    <section className="inspectorSection">
      <div className="sectionHeading"><h2>Kosten & Ökologie</h2><button type="button" onClick={exportBimCsv}>CSV</button></div>
      <label className="compactField"><span>Umsatzsteuer %</span><input type="number" min="0" step="0.5" defaultValue={vatPercent} onBlur={e => setVatPercent(Number(e.target.value) || 0)} /></label>
      <div className="metricGrid">
        <div><span>Material</span><strong>{money(cost.material)}</strong></div><div><span>Arbeit</span><strong>{money(cost.labor)}</strong></div>
        <div><span>Netto</span><strong>{money(cost.subtotal)}</strong></div><div><span>Brutto</span><strong>{money(cost.total)}</strong></div>
        <div><span>CO₂</span><strong>{roundMetric(cost.carbonKg)} kg</strong></div><div><span>BIM-Positionen</span><strong>{bim.length}</strong></div>
      </div>
    </section>

    <section className="inspectorSection"><div className="sectionHeading"><h2>Layer 2.0</h2><span>{layers.length}</span></div>
      <label className="compactField"><span>Aktiver Layer</span><select value={activeLayerId} onChange={e => setActiveLayerId(e.target.value)}>{layers.filter(l => !l.locked).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      {layers.map(layer => <div className={`layerCard ${layer.id === activeLayerId ? "activeLayer" : ""}`} key={layer.id}>
        <button className="layerColor" style={{ background: layer.color }} onClick={() => !layer.locked && setActiveLayerId(layer.id)} />
        <div><strong>{layer.name}</strong><small>{entities.filter(e => e.layerId === layer.id).length} Objekte · {layer.elevation.toFixed(2)} m</small></div>
        <div className="layerToggles"><button className={layer.visible ? "isOn" : ""} onClick={() => updateLayer(layer.id,{visible:!layer.visible})}>◉</button><button className={layer.locked ? "isOn" : ""} onClick={() => updateLayer(layer.id,{locked:!layer.locked})}>◆</button><button className={layer.printable ? "isOn" : ""} onClick={() => updateLayer(layer.id,{printable:!layer.printable})}>▣</button></div>
      </div>)}
    </section>

    <section className="inspectorSection"><h2>CAD-Einstellungen</h2><label className="compactField"><span>Rasterweite in Meter</span><input type="number" min="0.05" step="0.05" defaultValue={gridSize} onBlur={e => setGridSize(Number(e.target.value)||0.5)} /></label></section>
    <section className="inspectorSection"><h2>Projektkennzahlen</h2><div className="metricGrid"><div><span>Objekte</span><strong>{entities.length}</strong></div><div><span>Fläche</span><strong>{roundMetric(totalArea)} m²</strong></div><div><span>Volumen</span><strong>{roundMetric(totalVolume)} m³</strong></div><div><span>Brutto</span><strong>{money(cost.total)}</strong></div></div></section>
    <section className="inspectorSection historySection"><h2>Command History</h2>{history.length===0?<p className="muted">Noch keine Bearbeitung.</p>:history.slice(0,8).map(entry=><div className="historyItem" key={entry.id}><span>{entry.label}</span><time>{new Date(entry.timestamp).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</time></div>)}</section>
  </aside>;
}

function BimEditor({ item, onUpdate }: { item: BimProperties; onUpdate: (patch: Partial<BimProperties>) => void }) {
  const line = calculateLineCost(item);
  const num = (value: string, fallback: number) => Number.isFinite(Number(value.replace(",", "."))) ? Number(value.replace(",", ".")) : fallback;
  return <div className="propertyList bimEditor">
    <label>Kategorie<input defaultValue={item.category} onBlur={e => onUpdate({category:e.target.value})} /></label>
    <label>Klassifikation<input defaultValue={item.classification} onBlur={e => onUpdate({classification:e.target.value})} /></label>
    <div className="propertyPair"><label>Phase<select value={item.phase} onChange={e => onUpdate({phase:e.target.value as ProjectPhase})}>{phases.map(x=><option key={x}>{x}</option>)}</select></label><label>Einheit<select value={item.unit} onChange={e=>onUpdate({unit:e.target.value as BimProperties["unit"]})}>{["m","m²","m³","Stk."].map(x=><option key={x}>{x}</option>)}</select></label></div>
    <div className="propertyPair"><label>Menge<input type="number" min="0" step="0.01" defaultValue={item.quantity} onBlur={e=>onUpdate({quantity:Math.max(0,num(e.target.value,item.quantity))})}/></label><label>Verschnitt %<input type="number" min="0" step="0.5" defaultValue={item.wastePercent} onBlur={e=>onUpdate({wastePercent:Math.max(0,num(e.target.value,item.wastePercent))})}/></label></div>
    <div className="propertyPair"><label>Material €/E<input type="number" min="0" step="1" defaultValue={item.unitPrice} onBlur={e=>onUpdate({unitPrice:Math.max(0,num(e.target.value,item.unitPrice))})}/></label><label>Arbeit €/E<input type="number" min="0" step="1" defaultValue={item.laborUnitPrice} onBlur={e=>onUpdate({laborUnitPrice:Math.max(0,num(e.target.value,item.laborUnitPrice))})}/></label></div>
    <div className="propertyPair"><label>CO₂ kg/E<input type="number" min="0" step="0.1" defaultValue={item.carbonKgPerUnit} onBlur={e=>onUpdate({carbonKgPerUnit:Math.max(0,num(e.target.value,item.carbonKgPerUnit))})}/></label><label>Lebensdauer<input type="number" min="0" step="1" defaultValue={item.lifespanYears ?? 0} onBlur={e=>onUpdate({lifespanYears:Math.max(0,num(e.target.value,item.lifespanYears ?? 0))})}/></label></div>
    <label>Hersteller<input defaultValue={item.manufacturer ?? ""} onBlur={e=>onUpdate({manufacturer:e.target.value})}/></label>
    <label>Modell / Artikel<input defaultValue={item.model ?? ""} onBlur={e=>onUpdate({model:e.target.value})}/></label>
    <label>Lieferant<input defaultValue={item.supplier ?? ""} onBlur={e=>onUpdate({supplier:e.target.value})}/></label>
    <label>Wartung<select value={item.maintenanceCycle} onChange={e=>onUpdate({maintenanceCycle:e.target.value as MaintenanceCycle})}>{cycles.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Notizen<textarea defaultValue={item.notes ?? ""} onBlur={e=>onUpdate({notes:e.target.value})}/></label>
    <div className="readOnlyMetrics"><span>inkl. Verschnitt <strong>{roundMetric(line.effectiveQuantity)} {item.unit}</strong></span><span>Gesamt <strong>{money(line.total)}</strong></span><span>CO₂ <strong>{roundMetric(line.carbonKg)} kg</strong></span></div>
  </div>;
}

function EntityProperties({entity,layers,onUpdate,onMove}:{entity:CadEntity;layers:ReturnType<typeof useProjectStore>["layers"];onUpdate:(patch:Partial<CadEntity>,label?:string)=>void;onMove:(delta:{x:number;y:number})=>void}) {
  const center=entityCenter(entity); const length=entity.shape==="line"||entity.shape==="polyline"?polylineLength(entity.points):0;
  const n=(v:string,f:number)=>{const x=Number(v.replace(",","."));return Number.isFinite(x)?x:f};
  return <div className="propertyList"><label>Name<input defaultValue={entity.name} onBlur={e=>e.target.value!==entity.name&&onUpdate({name:e.target.value},"Name geändert")}/></label><label>Typ<input value={`${entity.kind} · ${entity.shape}`} readOnly/></label><label>Layer<select value={entity.layerId} onChange={e=>onUpdate({layerId:e.target.value},"Layerzuordnung geändert")}>{layers.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label><div className="propertyPair"><label>X<input type="number" step="0.05" defaultValue={roundMetric(center.x)} onBlur={e=>onMove({x:n(e.target.value,center.x)-center.x,y:0})}/></label><label>Y<input type="number" step="0.05" defaultValue={roundMetric(center.y)} onBlur={e=>onMove({x:0,y:n(e.target.value,center.y)-center.y})}/></label></div>{entity.shape==="line"||entity.shape==="polyline"?<><label>Länge<input value={`${roundMetric(length)} m`} readOnly/></label><label>Dicke<input type="number" min="0.01" step="0.01" defaultValue={entity.width} onBlur={e=>onUpdate({width:Math.max(.01,n(e.target.value,entity.width))},"Breite geändert")}/></label></>:<div className="propertyPair"><label>Breite<input type="number" min=".05" step=".05" defaultValue={entity.width} onBlur={e=>onUpdate({width:Math.max(.05,n(e.target.value,entity.width))},"Breite geändert")}/></label><label>Tiefe<input type="number" min=".05" step=".05" defaultValue={entity.depth} onBlur={e=>onUpdate({depth:Math.max(.05,n(e.target.value,entity.depth))},"Tiefe geändert")}/></label></div>}<div className="propertyPair"><label>Höhe<input type="number" min="0" step=".05" defaultValue={entity.height} onBlur={e=>onUpdate({height:Math.max(0,n(e.target.value,entity.height))},"Höhe geändert")}/></label><label>Drehung<input type="number" step="1" defaultValue={entity.rotation} onBlur={e=>onUpdate({rotation:n(e.target.value,entity.rotation)},"Drehung geändert")}/></label></div><div className="readOnlyMetrics"><span>Fläche <strong>{roundMetric(entityArea(entity))} m²</strong></span><span>Volumen <strong>{roundMetric(entityVolume(entity))} m³</strong></span></div><label className="checkField"><input type="checkbox" checked={entity.locked} onChange={e=>onUpdate({locked:e.target.checked},e.target.checked?"Objekt gesperrt":"Objekt entsperrt")}/><span>Objekt sperren</span></label></div>;
}

function money(value:number){return value.toLocaleString("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});}
