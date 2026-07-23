"use client";

import { useMemo, useState } from "react";
import { makeId } from "@/core/cad/geometry";
import { PLANT_CATALOG } from "@/data/plants/catalog";
import { MATERIAL_CATALOG } from "@/data/materials/catalog";
import { OBJECT_CATALOG, OBJECT_CATEGORIES, type ObjectCategory } from "@/data/objects/catalog";
import { useProjectStore } from "@/stores/projectStore";
import type { CadEntity } from "@/types/domain";

type LibraryTab = "objects" | "plants" | "materials";

export function LibraryPanel() {
  const store = useProjectStore();
  const { entities, selectedIds, addEntity, addEntityWithBim, updateEntity } = store;
  const [tab, setTab] = useState<LibraryTab>("objects");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"Alle" | ObjectCategory>("Alle");

  const filteredObjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    return OBJECT_CATALOG.filter(item => {
      const matchesCategory = category === "Alle" || item.category === category;
      const haystack = `${item.name} ${item.category} ${item.keywords.join(" ")}`.toLowerCase();
      return matchesCategory && (!term || haystack.includes(term));
    });
  }, [category, query]);

  function nextPosition(kind: string) {
    const count = entities.filter(entity => entity.metadata?.databaseCategory === kind).length;
    return { x: -5 + (count % 5) * 2.4, y: -4 + Math.floor(count / 5) * 2.1 };
  }

  function addObject(definitionId: string) {
    const definition = OBJECT_CATALOG.find(item => item.id === definitionId);
    if (!definition) return;
    const position = nextPosition(definition.category);
    const id = makeId(definition.objectType);
    const points = definition.shape === "line"
      ? [
          { x: position.x - definition.width / 2, y: position.y },
          { x: position.x + definition.width / 2, y: position.y }
        ]
      : [];
    const radius = definition.shape === "circle" ? definition.width / 2 : undefined;
    const entity: CadEntity = {
      id,
      kind: definition.kind,
      shape: definition.shape,
      name: definition.name,
      points,
      position,
      width: definition.shape === "line" ? Math.max(.08, definition.depth) : definition.width,
      depth: definition.shape === "line" ? definition.width : definition.depth,
      height: definition.height,
      radius,
      rotation: 0,
      layerId: definition.layerId,
      materialId: definition.materialId,
      fillColor: definition.color,
      opacity: definition.kind === "water" ? .78 : 1,
      strokeWidth: definition.shape === "line" ? Math.max(.08, definition.depth) : .05,
      linePattern: "solid",
      objectDefinitionId: definition.id,
      visible: true,
      locked: false,
      metadata: {
        objectType: definition.objectType,
        databaseCategory: definition.category,
        classification: definition.classification,
        databaseVersion: "V3-A4"
      }
    };
    addEntityWithBim(entity, {
      entityId: id,
      category: definition.category,
      classification: definition.classification,
      phase: "Neubau",
      unit: definition.unit,
      quantity: 1,
      wastePercent: 0,
      unitPrice: definition.unitPrice,
      laborUnitPrice: 0,
      carbonKgPerUnit: definition.carbonKgPerUnit,
      maintenanceCycle: definition.maintenanceCycle,
      custom: { objectDefinitionId: definition.id, objectType: definition.objectType }
    }, `${definition.name} aus Objektdatenbank platziert`);
  }

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
      fillColor: plant.flowerColor,
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
    <aside className="libraryPanel objectDatabasePanel" id="objektdatenbank">
      <div className="panelHeading">
        <div><span className="eyebrow">Katalog V3</span><h3>Objektdatenbank</h3></div>
        <span>{OBJECT_CATALOG.length + PLANT_CATALOG.length + MATERIAL_CATALOG.length}</span>
      </div>

      <div className="libraryTabs">
        <button type="button" className={tab === "objects" ? "active" : ""} onClick={() => setTab("objects")}>Objekte ({OBJECT_CATALOG.length})</button>
        <button type="button" className={tab === "plants" ? "active" : ""} onClick={() => setTab("plants")}>Pflanzen ({PLANT_CATALOG.length})</button>
        <button type="button" className={tab === "materials" ? "active" : ""} onClick={() => setTab("materials")}>Materialien ({MATERIAL_CATALOG.length})</button>
      </div>

      {tab === "objects" && (
        <>
          <div className="libraryFilters">
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Objekt suchen …" aria-label="Objekt suchen" />
            <select value={category} onChange={event => setCategory(event.target.value as "Alle" | ObjectCategory)} aria-label="Objektkategorie">
              <option value="Alle">Alle Kategorien</option>
              {OBJECT_CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <p className="panelHint">Objekt anklicken: Es wird maßstäblich mit BIM-Kosten- und Klassifikationsdaten platziert.</p>
          <div className="libraryGrid objectGrid">
            {filteredObjects.map(item => (
              <button type="button" className="libraryItem objectLibraryItem" key={item.id} onClick={() => addObject(item.id)}>
                <span className="objectThumb">{item.icon}</span>
                <strong>{item.name}</strong>
                <small>{item.category} · {item.width} × {item.depth} × {item.height} m</small>
                <em>{item.unitPrice.toLocaleString("de-DE")} € · {item.classification}</em>
              </button>
            ))}
          </div>
          {!filteredObjects.length && <p className="emptyLibrary">Keine passenden Objekte gefunden.</p>}
        </>
      )}

      {tab === "plants" && (
        <>
          <p className="panelHint">Pflanze antippen, um sie in den Pflanzlayer zu setzen.</p>
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
        </>
      )}

      {tab === "materials" && (
        <>
          <p className="panelHint">Material auf die aktuelle Auswahl anwenden.</p>
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
        </>
      )}
    </aside>
  );
}
