"use client";

import { makeId } from "@/core/cad/geometry";
import { PLANT_CATALOG } from "@/data/plants/catalog";
import { MATERIAL_CATALOG } from "@/data/materials/catalog";
import { useProjectStore } from "@/stores/projectStore";

export function LibraryPanel() {
  const store = useProjectStore();
  const { entities, selectedIds, addEntity, updateEntity } = store;

  function addPlant(plantId: string) {
    const plant = PLANT_CATALOG.find(item => item.id === plantId);
    if (!plant) return;
    const count = entities.filter(entity => entity.kind === "plant").length;
    addEntity({
      id: makeId("plant"),
      kind: "plant",
      shape: "symbol",
      name: plant.commonName,
      points: [],
      position: { x: 3.5 + (count % 4) * 1.8, y: -3.5 + Math.floor(count / 4) * 1.8 },
      width: Math.max(0.5, plant.matureWidth),
      depth: Math.max(0.5, plant.matureWidth),
      height: plant.matureHeight,
      rotation: 0,
      layerId: "layer-planting",
      visible: true,
      locked: false,
      metadata: {
        plantDefinitionId: plant.id,
        botanicalName: plant.botanicalName,
        spacing: plant.spacing,
        waterNeed: plant.waterNeed,
        light: plant.light,
        native: plant.native,
        pollinatorValue: plant.pollinatorValue,
        bloomMonths: plant.bloomMonths.join(",")
      }
    }, `${plant.commonName} platziert`);
  }

  function applyMaterial(materialId: string) {
    for (const id of selectedIds) updateEntity(id, { materialId }, "Material zugewiesen");
  }

  return (
    <aside className="libraryPanel">
      <div className="panelHeading"><div><span className="eyebrow">Parametrisch</span><h3>Objektbibliothek</h3></div><span>{PLANT_CATALOG.length + MATERIAL_CATALOG.length}</span></div>
      <p className="panelHint">Pflanze antippen, um sie zu platzieren. Material auf die aktuelle Auswahl anwenden.</p>
      <h4>Pflanzen</h4>
      <div className="libraryGrid">
        {PLANT_CATALOG.map(item => (
          <button type="button" className="libraryItem" key={item.id} onClick={() => addPlant(item.id)}>
            <span className="plantThumb">✦</span>
            <strong>{item.commonName}</strong>
            <small>{item.botanicalName}</small>
            <em>{item.matureHeight} m · Abstand {item.spacing} m · {item.native ? "heimisch" : "kultiviert"}</em>
          </button>
        ))}
      </div>
      <h4>Materialien</h4>
      <div className="libraryGrid">
        {MATERIAL_CATALOG.map(item => (
          <button type="button" className="libraryItem" key={item.id} onClick={() => applyMaterial(item.id)} disabled={selectedIds.length === 0}>
            <span className="materialThumb" style={{ background: item.color }} />
            <strong>{item.name}</strong>
            <small>{item.pricePerSquareMeter} €/m²</small>
            <em>{item.category}</em>
          </button>
        ))}
      </div>
    </aside>
  );
}
