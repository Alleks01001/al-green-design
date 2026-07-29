"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { makeId } from "@/core/cad/geometry";
import { createHostedOpeningEntity, isHostedOpening } from "@/core/cad/openings";
import { CONSTRUCTION_CATALOG, CONSTRUCTION_CATEGORIES, type ConstructionCategory } from "@/data/constructions/catalog";
import { PLANT_CATALOG } from "@/data/plants/catalog";
import { MATERIAL_CATALOG } from "@/data/materials/catalog";
import { OBJECT_CATALOG, OBJECT_CATEGORIES, type ObjectCategory } from "@/data/objects/catalog";
import { useProjectStore } from "@/stores/projectStore";
import type { BimProperties, CadEntity, LightRequirement, MaterialDefinition, PlantDefinition } from "@/types/domain";

export type LibraryTab = "objects" | "constructions" | "plants" | "materials";
type PlantCategory = PlantDefinition["category"];
type MaterialCategory = MaterialDefinition["category"];

const PLANT_CATEGORY_LABELS: Record<PlantCategory, string> = {
  tree: "Bäume",
  shrub: "Sträucher",
  hedge: "Hecken",
  perennial: "Stauden",
  grass: "Gräser"
};

const LIGHT_LABELS: Record<LightRequirement, string> = {
  sun: "Sonne",
  "partial-shade": "Halbschatten",
  shade: "Schatten"
};

const plantPlanningPrice: Record<PlantCategory, number> = {
  tree: 420,
  shrub: 68,
  hedge: 34,
  perennial: 9.5,
  grass: 11.5
};

function constructionQuantity(unit: BimProperties["unit"], size: [number, number, number]) {
  if (unit === "m") return size[0];
  if (unit === "m²") return size[0] * size[1];
  if (unit === "m³") return size[0] * size[1] * size[2];
  return 1;
}

export function LibraryPanel({ workspace = false, initialTab = "objects" }: { workspace?: boolean; initialTab?: LibraryTab }) {
  const store = useProjectStore();
  const { entities, selectedIds, addEntityWithBim, updateEntity, isHydrated } = store;
  const [tab, setTab] = useState<LibraryTab>(initialTab);
  const [query, setQuery] = useState("");
  const [objectCategory, setObjectCategory] = useState<"Alle" | ObjectCategory>("Alle");
  const [constructionCategory, setConstructionCategory] = useState<"Alle" | ConstructionCategory>("Alle");
  const [plantCategory, setPlantCategory] = useState<"Alle" | PlantCategory>("Alle");
  const [plantLight, setPlantLight] = useState<"Alle" | LightRequirement>("Alle");
  const [nativeOnly, setNativeOnly] = useState(false);
  const [materialCategory, setMaterialCategory] = useState<"Alle" | MaterialCategory>("Alle");
  const [lastAction, setLastAction] = useState("");

  const term = query.trim().toLowerCase();
  const filteredObjects = useMemo(() => OBJECT_CATALOG.filter(item => {
    const matchesCategory = objectCategory === "Alle" || item.category === objectCategory;
    const haystack = `${item.name} ${item.category} ${item.classification} ${item.keywords.join(" ")}`.toLowerCase();
    return matchesCategory && (!term || haystack.includes(term));
  }), [objectCategory, term]);

  const filteredConstructions = useMemo(() => CONSTRUCTION_CATALOG.filter(item => {
    const matchesCategory = constructionCategory === "Alle" || item.category === constructionCategory;
    const layerText = item.layers.map(layer => `${layer.name} ${layer.specification}`).join(" ");
    const haystack = `${item.name} ${item.category} ${item.classification} ${item.keywords.join(" ")} ${layerText}`.toLowerCase();
    return matchesCategory && (!term || haystack.includes(term));
  }), [constructionCategory, term]);

  const filteredPlants = useMemo(() => PLANT_CATALOG.filter(item => {
    const matchesCategory = plantCategory === "Alle" || item.category === plantCategory;
    const matchesLight = plantLight === "Alle" || item.light === plantLight;
    const haystack = `${item.commonName} ${item.botanicalName} ${item.usage?.join(" ") ?? ""} ${item.siteNote ?? ""}`.toLowerCase();
    return matchesCategory && matchesLight && (!nativeOnly || item.native) && (!term || haystack.includes(term));
  }), [nativeOnly, plantCategory, plantLight, term]);

  const filteredMaterials = useMemo(() => MATERIAL_CATALOG.filter(item => {
    const matchesCategory = materialCategory === "Alle" || item.category === materialCategory;
    const haystack = `${item.name} ${item.category} ${item.specification ?? ""} ${item.technicalNote ?? ""}`.toLowerCase();
    return matchesCategory && (!term || haystack.includes(term));
  }), [materialCategory, term]);

  if (!workspace) {
    return (
      <aside className="libraryLauncherPanel" id="objektdatenbank">
        <div className="panelHeading">
          <div><span className="eyebrow">V3.1 Alpha 8</span><h3>Professional Library</h3></div>
          <span>{OBJECT_CATALOG.length + CONSTRUCTION_CATALOG.length + PLANT_CATALOG.length + MATERIAL_CATALOG.length}</span>
        </div>
        <p>Die Datenbank öffnet als eigene große Arbeitsseite. Kein eingebettetes Kartenraster und kein horizontaler Scrollbalken.</p>
        <div className="libraryLauncherStats">
          <span><strong>{PLANT_CATALOG.length}</strong>Pflanzen</span>
          <span><strong>{CONSTRUCTION_CATALOG.length}</strong>Bauweisen</span>
          <span><strong>{MATERIAL_CATALOG.length}</strong>Materialien</span>
          <span><strong>{OBJECT_CATALOG.length}</strong>Objekte</span>
        </div>
        <div className="libraryLauncherLinks">
          <Link className="libraryLauncherPrimary" href="/library?tab=plants">🌿 Pflanzendatenbank öffnen</Link>
          <Link href="/library?tab=constructions">▥ Mauern, Beläge & Böden</Link>
          <Link href="/library?tab=objects">▣ Objektdatenbank</Link>
          <Link href="/library?tab=materials">◈ Materialdatenbank</Link>
        </div>
        <small>Hinzufügen erfolgt dort über eine eindeutige Schaltfläche. Danach mit „Zurück zum Studio“ weiterarbeiten.</small>
      </aside>
    );
  }

  function nextPosition(kind: string) {
    const count = entities.filter(entity => entity.metadata?.databaseCategory === kind).length;
    return { x: -5 + (count % 5) * 2.4, y: -4 + Math.floor(count / 5) * 2.1 };
  }

  function addObject(definitionId: string) {
    const definition = OBJECT_CATALOG.find(item => item.id === definitionId);
    if (!definition) return;
    const selectedEntity = entities.find(entity => selectedIds.includes(entity.id));
    const hostWall = selectedEntity?.kind === "wall"
      ? selectedEntity
      : selectedEntity && isHostedOpening(selectedEntity)
        ? entities.find(entity => entity.id === selectedEntity.metadata?.hostWallId)
        : undefined;
    if (definition.hostRequired && (!hostWall || (hostWall.shape !== "line" && hostWall.shape !== "polyline"))) {
      setLastAction(`${definition.name}: Zuerst im Studio eine Wand auswählen.`);
      return;
    }
    const position = nextPosition(definition.category);
    const id = makeId(definition.objectType);
    const points = definition.shape === "line"
      ? [{ x: position.x - definition.width / 2, y: position.y }, { x: position.x + definition.width / 2, y: position.y }]
      : [];
    const standardEntity: CadEntity = {
      id,
      kind: definition.kind,
      shape: definition.shape,
      name: definition.name,
      points,
      position,
      width: definition.shape === "line" ? Math.max(.08, definition.depth) : definition.width,
      depth: definition.shape === "line" ? definition.width : definition.depth,
      height: definition.height,
      radius: definition.shape === "circle" ? definition.width / 2 : undefined,
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
        databaseVersion: "3.1-alpha.4"
      }
    };
    const entity = definition.hostRequired && hostWall
      ? createHostedOpeningEntity(definition, hostWall, .5)
      : standardEntity;
    if (!entity) {
      setLastAction(`${definition.name}: Die gewählte Wand ist zu kurz.`);
      return;
    }
    if (definition.hostRequired && hostWall) {
      const requiredWallHeight = (definition.sillHeight ?? 0) + definition.height + .15;
      if (hostWall.height < requiredWallHeight) {
        updateEntity(hostWall.id, { height: requiredWallHeight }, `Wandhöhe für ${definition.name} angepasst`);
      }
    }
    addEntityWithBim(entity, {
      entityId: entity.id,
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
      custom: {
        objectDefinitionId: definition.id,
        objectType: definition.objectType,
        priceBasis: "editierbarer Planungsrichtwert netto",
        ...(definition.hostRequired && hostWall ? { hostWallId: hostWall.id, hostWallName: hostWall.name, sillHeight: definition.sillHeight ?? 0 } : {})
      }
    }, definition.hostRequired && hostWall ? `${definition.name} in ${hostWall.name} eingesetzt` : `${definition.name} aus Objektdatenbank platziert`);
    setLastAction(definition.hostRequired && hostWall ? `${definition.name} wurde in ${hostWall.name} eingesetzt.` : `${definition.name} wurde zum Projekt hinzugefügt.`);
  }

  function addConstruction(definitionId: string) {
    const definition = CONSTRUCTION_CATALOG.find(item => item.id === definitionId);
    if (!definition) return;
    const position = nextPosition(definition.category);
    const [length, width, height] = definition.size;
    const id = makeId("construction");
    const points = definition.shape === "line"
      ? [{ x: position.x - length / 2, y: position.y }, { x: position.x + length / 2, y: position.y }]
      : [];
    const layerBuildUp = definition.layers.map(layer => `${layer.name} ${layer.thicknessMm} mm: ${layer.specification}`).join(" | ");
    const entity: CadEntity = {
      id,
      kind: definition.kind,
      shape: definition.shape,
      name: definition.name,
      points,
      position,
      width: definition.shape === "line" ? width : length,
      depth: definition.shape === "line" ? length : width,
      height,
      rotation: 0,
      layerId: definition.layerId,
      materialId: definition.materialId,
      strokeWidth: definition.shape === "line" ? width : .05,
      linePattern: "solid",
      visible: true,
      locked: false,
      metadata: {
        constructionDefinitionId: definition.id,
        databaseCategory: definition.category,
        classification: definition.classification,
        layerBuildUp,
        sourceBasis: definition.sourceBasis,
        databaseVersion: "3.1-alpha.4",
        ...definition.properties
      }
    };
    addEntityWithBim(entity, {
      entityId: id,
      category: definition.category,
      classification: definition.classification,
      phase: "Neubau",
      unit: definition.unit,
      quantity: constructionQuantity(definition.unit, definition.size),
      wastePercent: definition.unit === "Stk." ? 0 : 7,
      unitPrice: definition.unitPrice,
      laborUnitPrice: definition.laborUnitPrice,
      carbonKgPerUnit: definition.carbonKgPerUnit,
      lifespanYears: definition.serviceLifeYears,
      maintenanceCycle: definition.maintenanceCycle,
      custom: {
        constructionDefinitionId: definition.id,
        layerBuildUp,
        sourceBasis: definition.sourceBasis,
        priceBasis: "editierbarer Planungsrichtwert netto",
        ...definition.properties
      }
    }, `${definition.name} als CAD/BIM-Aufbau platziert`);
    setLastAction(`${definition.name} wurde mit Schicht- und BIM-Daten hinzugefügt.`);
  }

  function addPlant(plantId: string) {
    const plant = PLANT_CATALOG.find(item => item.id === plantId);
    if (!plant) return;
    const count = entities.filter(entity => entity.kind === "plant").length;
    const id = makeId("plant");
    const entity: CadEntity = {
      id,
      kind: "plant",
      shape: "symbol",
      name: plant.commonName,
      points: [],
      position: { x: 3.5 + (count % 4) * 1.8, y: -3.5 + Math.floor(count / 4) * 1.8 },
      width: Math.max(.5, plant.matureWidth),
      depth: Math.max(.5, plant.matureWidth),
      height: plant.matureHeight,
      rotation: 0,
      layerId: "layer-planting",
      fillColor: plant.flowerColor,
      visible: true,
      locked: false,
      metadata: {
        plantDefinitionId: plant.id,
        databaseCategory: PLANT_CATEGORY_LABELS[plant.category],
        botanicalName: plant.botanicalName,
        spacing: plant.spacing,
        plantingQuality: plant.plantingQuality ?? "Qualität projektbezogen festlegen",
        waterNeed: plant.waterNeed,
        light: plant.light,
        native: plant.native,
        pollinatorValue: plant.pollinatorValue,
        bloomMonths: plant.bloomMonths.join(","),
        siteNote: plant.siteNote ?? "Standort projektbezogen prüfen",
        databaseVersion: "3.1-alpha.4"
      }
    };
    addEntityWithBim(entity, {
      entityId: id,
      category: PLANT_CATEGORY_LABELS[plant.category],
      classification: `AGD-9${["tree", "shrub", "hedge", "perennial", "grass"].indexOf(plant.category) + 1}`,
      phase: "Neubau",
      unit: "Stk.",
      quantity: 1,
      wastePercent: plant.category === "perennial" || plant.category === "grass" ? 5 : 0,
      unitPrice: plantPlanningPrice[plant.category],
      laborUnitPrice: plant.category === "tree" ? 240 : plant.category === "shrub" || plant.category === "hedge" ? 24 : 5.5,
      carbonKgPerUnit: plant.category === "tree" ? -18 : plant.category === "shrub" || plant.category === "hedge" ? -3 : -.4,
      maintenanceCycle: plant.category === "tree" ? "jährlich" : "quartalsweise",
      custom: {
        plantDefinitionId: plant.id,
        botanicalName: plant.botanicalName,
        plantingQuality: plant.plantingQuality ?? "projektbezogen",
        spacingM: plant.spacing,
        native: plant.native,
        pollinatorValue: plant.pollinatorValue,
        siteNote: plant.siteNote ?? "Standort projektbezogen prüfen",
        priceBasis: "editierbarer Planungsrichtwert netto"
      }
    }, `${plant.commonName} mit Pflanz- und BIM-Daten platziert`);
    setLastAction(`${plant.commonName} wurde als Pflanze zum Projekt hinzugefügt.`);
  }

  function applyMaterial(materialId: string) {
    for (const id of selectedIds) updateEntity(id, { materialId }, "Material zugewiesen");
    const material = MATERIAL_CATALOG.find(item => item.id === materialId);
    if (material) setLastAction(`${material.name} wurde auf ${selectedIds.length} ausgewählte Objekte angewendet.`);
  }

  return (
    <aside className="libraryPanel objectDatabasePanel libraryWorkspace" id="objektdatenbank" aria-label="Professional Library">
      <div className="panelHeading">
        <div><span className="eyebrow">V3.1 Alpha 8 · Vollseiten-Datenbank</span><h3>Professional Library</h3></div>
        <div className="libraryHeadingActions">
          <span>{OBJECT_CATALOG.length + CONSTRUCTION_CATALOG.length + PLANT_CATALOG.length + MATERIAL_CATALOG.length}</span>
          <Link className="libraryBackLink" href="/">← Zurück zum Studio</Link>
        </div>
      </div>

      <div className="libraryTabs">
        <button type="button" className={tab === "objects" ? "active" : ""} onClick={() => { setTab("objects"); setQuery(""); }}>Objekte ({OBJECT_CATALOG.length})</button>
        <button type="button" className={tab === "constructions" ? "active" : ""} onClick={() => { setTab("constructions"); setQuery(""); }}>Bauweisen ({CONSTRUCTION_CATALOG.length})</button>
        <button type="button" className={tab === "plants" ? "active" : ""} onClick={() => { setTab("plants"); setQuery(""); }}>Pflanzen ({PLANT_CATALOG.length})</button>
        <button type="button" className={tab === "materials" ? "active" : ""} onClick={() => { setTab("materials"); setQuery(""); }}>Materialien ({MATERIAL_CATALOG.length})</button>
      </div>

      <div className={`libraryActionStatus${isHydrated ? " ready" : " loading"}`} role="status" aria-live="polite">
        {!isHydrated ? <span>Projekt wird geladen …</span> : lastAction ? <><strong>✓ {lastAction}</strong><Link href="/">Im Studio ansehen</Link></> : <span>Projekt geladen. Datensatz auswählen und „Zum Projekt hinzufügen“ drücken.</span>}
      </div>

      {tab === "objects" && (
        <>
          <div className="libraryFilters">
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Objekt suchen …" aria-label="Objekt suchen" />
            <select value={objectCategory} onChange={event => setObjectCategory(event.target.value as "Alle" | ObjectCategory)} aria-label="Objektkategorie">
              <option value="Alle">Alle Kategorien</option>
              {OBJECT_CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <p className="panelHint">Maßstäbliche Ausstattung und Bauteile mit editierbaren BIM-Kennwerten.</p>
          <div className="libraryGrid objectGrid">
            {filteredObjects.map(item => (
              <button type="button" className="libraryItem objectLibraryItem" key={item.id} onClick={() => addObject(item.id)} disabled={!isHydrated} aria-label={`${item.name} zum Projekt hinzufügen`}>
                <span className="objectThumb">{item.icon}</span>
                <strong>{item.name}</strong>
                <small>{item.category} · {item.width} × {item.depth} × {item.height} m</small>
                <em>{item.unitPrice.toLocaleString("de-DE")} € · {item.classification}</em>
                <span className="libraryCardAction">{item.hostRequired ? "＋ In gewählte Wand einsetzen" : "＋ Zum Projekt hinzufügen"}</span>
              </button>
            ))}
          </div>
          {!filteredObjects.length && <p className="emptyLibrary">Keine passenden Objekte gefunden.</p>}
        </>
      )}

      {tab === "constructions" && (
        <>
          <div className="libraryFilters">
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Mauer, Belag, Boden …" aria-label="Bauweise suchen" />
            <select value={constructionCategory} onChange={event => setConstructionCategory(event.target.value as "Alle" | ConstructionCategory)} aria-label="Bauweisenkategorie">
              <option value="Alle">Alle Bauweisen</option>
              {CONSTRUCTION_CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <p className="panelHint">Herstellerneutrale Fachaufbauten. Ein Klick platziert Geometrie, Schichten, Kosten, CO₂ und Lebensdauer gemeinsam.</p>
          <div className="libraryGrid objectGrid constructionGrid">
            {filteredConstructions.map(item => (
              <button type="button" className="libraryItem constructionItem" key={item.id} onClick={() => addConstruction(item.id)} disabled={!isHydrated} aria-label={`${item.name} zum Projekt hinzufügen`}>
                <span className="objectThumb">{item.icon}</span>
                <strong>{item.name}</strong>
                <small>{item.category} · {item.layers.length} Schichten · {item.size[2]} m</small>
                <em>{item.unitPrice.toLocaleString("de-DE")} €/{item.unit} · {item.classification}</em>
                <span className="librarySpec">{item.layers.map(layer => `${layer.name} ${layer.thicknessMm} mm`).join(" · ")}</span>
                <span className="libraryCardAction">＋ Zum Projekt hinzufügen</span>
              </button>
            ))}
          </div>
          {!filteredConstructions.length && <p className="emptyLibrary">Keine passende Bauweise gefunden.</p>}
        </>
      )}

      {tab === "plants" && (
        <>
          <div className="libraryFilters plantFilters">
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Deutsch oder botanisch …" aria-label="Pflanze suchen" />
            <select value={plantCategory} onChange={event => setPlantCategory(event.target.value as "Alle" | PlantCategory)} aria-label="Pflanzenkategorie">
              <option value="Alle">Alle Pflanzentypen</option>
              {(Object.entries(PLANT_CATEGORY_LABELS) as Array<[PlantCategory, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={plantLight} onChange={event => setPlantLight(event.target.value as "Alle" | LightRequirement)} aria-label="Lichtbedarf">
              <option value="Alle">Alle Lichtlagen</option>
              {(Object.entries(LIGHT_LABELS) as Array<[LightRequirement, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="nativePlantFilter"><input type="checkbox" checked={nativeOnly} onChange={event => setNativeOnly(event.target.checked)} /> nur heimische</label>
          </div>
          <p className="panelHint">Reale Arten und Sorten mit Wuchs, Abstand, Standort, Blüte, Ökologie, Pflanzqualität und BIM-Daten.</p>
          <div className="libraryGrid plantLibraryGrid">
            {filteredPlants.map(item => (
              <button type="button" className="libraryItem plantLibraryItem" key={item.id} onClick={() => addPlant(item.id)} disabled={!isHydrated} aria-label={`${item.commonName} zum Projekt hinzufügen`}>
                <span className="plantThumb">{item.category === "tree" ? "♣" : item.category === "grass" ? "≋" : "✦"}</span>
                <strong>{item.commonName}</strong>
                <small>{item.botanicalName}</small>
                <em>{item.matureHeight} × {item.matureWidth} m · Abstand {item.spacing} m</em>
                <span className="librarySpec">{LIGHT_LABELS[item.light]} · Wasser {item.waterNeed}/5 · {item.native ? "heimisch" : "kultiviert"} · Insekten {item.pollinatorValue}/5</span>
                <span className="libraryCardAction">＋ Zum Projekt hinzufügen</span>
              </button>
            ))}
          </div>
          {!filteredPlants.length && <p className="emptyLibrary">Keine passende Pflanze gefunden.</p>}
        </>
      )}

      {tab === "materials" && (
        <>
          <div className="libraryFilters">
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Material suchen …" aria-label="Material suchen" />
            <select value={materialCategory} onChange={event => setMaterialCategory(event.target.value as "Alle" | MaterialCategory)} aria-label="Materialkategorie">
              <option value="Alle">Alle Materialien</option>
              {[...new Set(MATERIAL_CATALOG.map(item => item.category))].map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <p className="panelHint">Material auf die aktuelle Auswahl anwenden. Preise sind editierbare Planungsrichtwerte, keine Händlerangebote.</p>
          <div className="libraryGrid materialLibraryGrid">
            {filteredMaterials.map(item => (
              <button type="button" className="libraryItem materialLibraryItem" key={item.id} onClick={() => applyMaterial(item.id)} disabled={!isHydrated || selectedIds.length === 0} aria-label={`${item.name} auf Auswahl anwenden`}>
                <span className="materialThumb" style={{ background: item.color }} />
                <strong>{item.name}</strong>
                <small>{item.specification ?? item.category}</small>
                <em>{item.pricePerSquareMeter} €/{item.priceUnit ?? "m²"}{item.serviceLifeYears ? ` · ${item.serviceLifeYears} a` : ""}</em>
                {item.technicalNote && <span className="librarySpec">{item.technicalNote}</span>}
                <span className="libraryCardAction">✓ Auf Auswahl anwenden</span>
              </button>
            ))}
          </div>
          {!filteredMaterials.length && <p className="emptyLibrary">Kein passendes Material gefunden.</p>}
        </>
      )}

      <p className="libraryDisclaimer">Fachliche Vorplanung: Dimensionierung, Statik, Entwässerung, Normkonformität, lokale Eignung und Angebote sind je Projekt zu prüfen.</p>
    </aside>
  );
}
