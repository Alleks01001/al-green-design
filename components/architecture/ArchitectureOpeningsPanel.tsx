"use client";

import { useMemo, useState } from "react";
import { createHostedOpeningEntity, isHostedOpening } from "@/core/cad/openings";
import { ARCHITECTURE_OPENING_CATALOG } from "@/data/objects/catalog";
import { useProjectStore } from "@/stores/projectStore";

export function ArchitectureOpeningsPanel() {
  const store = useProjectStore();
  const [positionPercent, setPositionPercent] = useState(50);
  const [message, setMessage] = useState("Zuerst eine gezeichnete Wand auswählen.");
  const selectedEntity = store.entities.find(entity => store.selectedIds.includes(entity.id));
  const selectedWall = selectedEntity?.kind === "wall" && (selectedEntity.shape === "line" || selectedEntity.shape === "polyline")
    ? selectedEntity
    : selectedEntity && isHostedOpening(selectedEntity)
      ? store.entities.find(entity => entity.id === selectedEntity?.metadata?.hostWallId)
      : undefined;
  const hostedCount = useMemo(
    () => selectedWall ? store.entities.filter(entity => entity.metadata?.hostWallId === selectedWall.id).length : 0,
    [selectedWall, store.entities]
  );
  const wallLocked = Boolean(selectedWall?.locked || store.layers.find(layer => layer.id === selectedWall?.layerId)?.locked);

  function insertOpening(definitionId: string) {
    const definition = ARCHITECTURE_OPENING_CATALOG.find(item => item.id === definitionId);
    if (!definition || !selectedWall || wallLocked) {
      setMessage("Eine entsperrte Linie, Mauer, Wand oder einen Zaun auswählen.");
      return;
    }
    const entity = createHostedOpeningEntity(definition, selectedWall, positionPercent / 100);
    if (!entity) {
      setMessage(`Die gewählte Wand ist für ${definition.name} zu kurz.`);
      return;
    }
    const requiredWallHeight = (definition.sillHeight ?? 0) + definition.height + .15;
    const wallWasRaised = selectedWall.height < requiredWallHeight;
    if (wallWasRaised) {
      store.updateEntity(selectedWall.id, { height: requiredWallHeight }, `Wandhöhe für ${definition.name} angepasst`);
    }
    store.addEntityWithBim(entity, {
      entityId: entity.id,
      category: "Öffnungen",
      classification: definition.classification,
      phase: "Neubau",
      unit: "Stk.",
      quantity: 1,
      wastePercent: 0,
      unitPrice: definition.unitPrice,
      laborUnitPrice: 0,
      carbonKgPerUnit: definition.carbonKgPerUnit,
      maintenanceCycle: definition.maintenanceCycle,
      custom: {
        objectDefinitionId: definition.id,
        objectType: definition.objectType,
        hostWallId: selectedWall.id,
        hostWallName: selectedWall.name,
        sillHeight: definition.sillHeight ?? 0
      }
    }, `${definition.name} in ${selectedWall.name} eingesetzt`);
    store.setViewMode("split");
    setMessage(`${definition.name} wurde bei ${positionPercent}% eingesetzt und schneidet die Wand in 3D.${wallWasRaised ? ` Wandhöhe automatisch auf ${requiredWallHeight.toFixed(2)} m angepasst.` : ""}`);
  }

  return (
    <section className="architectureOpeningsPanel" id="architecture-openings">
      <div className="panelHeading">
        <div><span className="eyebrow">V3.1 Alpha 8</span><h3>Türen, Fenster & Öffnungen</h3></div>
        <span>{hostedCount}</span>
      </div>
      <div className={`hostWallStatus${selectedWall && !wallLocked ? " ready" : ""}`}>
        <span>{selectedWall ? "Aktuelle Wand" : "Keine Wand gewählt"}</span>
        <strong>{selectedWall?.name ?? "Im 2D-Plan eine Wand anklicken"}</strong>
        {selectedWall && <small>{selectedWall.points.length - 1} Segment(e) · {selectedWall.height.toFixed(2)} m hoch{wallLocked ? " · gesperrt" : ""}</small>}
      </div>
      <label className="openingPositionField">
        <span>Position auf der Wand <strong>{positionPercent}%</strong></span>
        <input type="range" min="5" max="95" step="1" value={positionPercent} onChange={event => setPositionPercent(Number(event.target.value))} />
      </label>
      <div className="openingCatalogGrid">
        {ARCHITECTURE_OPENING_CATALOG.map(definition => (
          <button key={definition.id} type="button" disabled={!selectedWall || wallLocked} onClick={() => insertOpening(definition.id)}>
            <span>{definition.icon}</span>
            <strong>{definition.name}</strong>
            <small>{definition.width.toFixed(2)} × {definition.height.toFixed(2)} m{definition.sillHeight ? ` · BRH ${definition.sillHeight.toFixed(2)} m` : ""}</small>
          </button>
        ))}
      </div>
      <p className={message.includes("wurde") ? "openingMessage success" : "openingMessage"}>{message}</p>
      <p className="panelHint">Die Öffnung bleibt mit der Wand gekoppelt. Beim Verschieben oder Drehen der Wand folgen Tür, Fenster oder Tor automatisch.</p>
    </section>
  );
}
