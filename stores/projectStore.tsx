"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { distance, entityCenter, makeId, translateEntity } from "@/core/cad/geometry";
import { applyTerrainPreset, createTerrainGrid } from "@/engines/terrain/terrainEngine";
import type {
  CadEntity,
  CadTool,
  HistoryEntry,
  Layer,
  BimProperties,
  ProjectFile,
  ProjectState,
  Vec2,
  TerrainModel,
  PlantingSettings,
  RenderSettings,
  PlanReference
} from "@/types/domain";

type CommandRecord = {
  label: string;
  snapshot: ProjectState;
};

type InternalState = {
  project: ProjectState;
  undo: CommandRecord[];
  redo: CommandRecord[];
  history: HistoryEntry[];
};

type Store = ProjectState & {
  canUndo: boolean;
  canRedo: boolean;
  history: HistoryEntry[];
  setTool: (tool: CadTool) => void;
  setViewMode: (mode: ProjectState["viewMode"]) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelectedId: (id: string) => void;
  setActiveLayerId: (id: string) => void;
  setEntities: (entities: CadEntity[], label?: string) => void;
  addEntity: (entity: CadEntity, label?: string) => void;
  addEntityWithBim: (entity: CadEntity, bim: BimProperties, label?: string) => void;
  addEntities: (entities: CadEntity[], label?: string) => void;
  updateEntity: (id: string, patch: Partial<CadEntity>, label?: string) => void;
  moveEntities: (ids: string[], delta: Vec2, label?: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  undo: () => void;
  redo: () => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleDimensions: () => void;
  setGridSize: (size: number) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  updateBim: (entityId: string, patch: Partial<BimProperties>) => void;
  ensureBim: (entityId: string) => void;
  setVatPercent: (value: number) => void;
  updateTerrain: (patch: Partial<TerrainModel>, label?: string) => void;
  updateTerrainPoint: (id: string, elevation: number) => void;
  updatePlantingSettings: (patch: Partial<PlantingSettings>) => void;
  updateRenderSettings: (patch: Partial<RenderSettings>) => void;
  updatePlanReference: (patch: Partial<PlanReference> | null) => void;
  applyTerrainPreset: (preset: "flat" | "slope" | "mound" | "swale") => void;
  exportProjectFile: () => ProjectFile;
  importProjectFile: (file: ProjectFile) => void;
  resetProject: () => void;
  clearProject: () => void;
};

const STORAGE_KEY = "al-green-design-studio-3.0-alpha.6";
const LEGACY_STORAGE_KEYS = [
  "al-green-design-studio-3.0-alpha.5",
  "al-green-design-studio-3.0-alpha.4",
  "al-green-design-studio-3.0-alpha.3",
  "al-green-design-studio-3.0-alpha",
  "al-green-design-studio-2.6",
  "al-green-design-studio-2.5",
  "al-green-design-studio-2.4"
];

const initialProject: ProjectState = {
  schemaVersion: "3.0-alpha.6",
  id: "project-main",
  name: "AL Green Design Studio 3.0 Alpha",
  activeTool: "select",
  viewMode: "split",
  selectedIds: [],
  activeLayerId: "layer-site",
  gridSize: 0.5,
  gridVisible: true,
  snapEnabled: true,
  snapModes: ["grid", "endpoint", "midpoint", "center"],
  showDimensions: true,
  projectCurrency: "EUR",
  vatPercent: 20,
  plantingSettings: { siteLight: "sun", soil: "loam", moisture: "fresh", hardinessZone: 7, growthYears: 5 },
  renderSettings: { preset: "daylight", quality: "high", hour: 14, azimuth: 135, exposure: 1.08, shadowStrength: 1, ambientStrength: 1, fogEnabled: true, fogDensity: 0.012, gridVisible3d: true },
  planReference: undefined,
  terrain: {
    enabled: true,
    width: 20,
    depth: 16,
    resolutionX: 9,
    resolutionZ: 7,
    baseElevation: 0,
    contourInterval: 0.25,
    points: createTerrainGrid(20, 16, 9, 7),
    cutFillReference: 0
  },
  layers: [
    { id: "layer-site", name: "Gelände", color: "#78966f", visible: true, locked: false, printable: true, opacity: 1, elevation: 0 },
    { id: "layer-building", name: "Architektur", color: "#9b7d6a", visible: true, locked: false, printable: true, opacity: 1, elevation: 0 },
    { id: "layer-paths", name: "Wege & Flächen", color: "#b69268", visible: true, locked: false, printable: true, opacity: 1, elevation: 0 },
    { id: "layer-planting", name: "Pflanzen", color: "#3f7648", visible: true, locked: false, printable: true, opacity: 1, elevation: 0 },
    { id: "layer-water", name: "Wasser", color: "#4c98bb", visible: true, locked: false, printable: true, opacity: 0.9, elevation: 0 },
    { id: "layer-furniture", name: "Ausstattung & Möbel", color: "#8a6448", visible: true, locked: false, printable: true, opacity: 1, elevation: 0 },
    { id: "layer-lighting", name: "Beleuchtung", color: "#d89b2b", visible: true, locked: false, printable: true, opacity: 1, elevation: 0 },
    { id: "layer-dimensions", name: "Bemaßung", color: "#6e2940", visible: true, locked: false, printable: true, opacity: 1, elevation: 0 }
  ],
  entities: [
    {
      id: "site-1",
      kind: "surface",
      shape: "rectangle",
      name: "Grundstück",
      points: [],
      position: { x: 0, y: 0 },
      width: 16,
      depth: 11,
      height: 0.1,
      rotation: 0,
      layerId: "layer-site",
      materialId: "mat-lawn",
      visible: true,
      locked: true
    },
    {
      id: "house-1",
      kind: "building",
      shape: "rectangle",
      name: "Wohnhaus",
      points: [],
      position: { x: -2.4, y: -1.1 },
      width: 6,
      depth: 4,
      height: 3.2,
      rotation: 0,
      layerId: "layer-building",
      materialId: "mat-concrete",
      visible: true,
      locked: false
    },
    {
      id: "terrace-1",
      kind: "surface",
      shape: "rectangle",
      name: "Terrasse",
      points: [],
      position: { x: 3.3, y: 2.6 },
      width: 5,
      depth: 3,
      height: 0.18,
      rotation: 0,
      layerId: "layer-paths",
      materialId: "mat-natural-stone",
      visible: true,
      locked: false
    },
    {
      id: "wall-1",
      kind: "wall",
      shape: "line",
      name: "Gartenmauer",
      points: [{ x: -6, y: 4 }, { x: 1, y: 4 }],
      position: { x: -2.5, y: 4 },
      width: 0.25,
      depth: 7,
      height: 1.1,
      rotation: 0,
      layerId: "layer-building",
      materialId: "mat-natural-stone",
      visible: true,
      locked: false
    },
    {
      id: "plant-1",
      kind: "plant",
      shape: "symbol",
      name: "Solitärahorn",
      points: [],
      position: { x: 5.2, y: -2.8 },
      width: 2.4,
      depth: 2.4,
      height: 4.2,
      rotation: 0,
      layerId: "layer-planting",
      visible: true,
      locked: false
    }
  ],
  bim: [
    { entityId: "house-1", category: "Gebäude", classification: "AGD-20", phase: "Bestand", unit: "m²", quantity: 24, wastePercent: 0, unitPrice: 0, laborUnitPrice: 0, carbonKgPerUnit: 0, maintenanceCycle: "jährlich", custom: { status: "Bestand" } },
    { entityId: "terrace-1", category: "Terrasse", classification: "AGD-31", phase: "Neubau", unit: "m²", quantity: 15, wastePercent: 7, unitPrice: 115, laborUnitPrice: 58, carbonKgPerUnit: 18, lifespanYears: 35, maintenanceCycle: "jährlich", warrantyYears: 5, custom: { material: "Naturstein" } },
    { entityId: "wall-1", category: "Mauer", classification: "AGD-22", phase: "Neubau", unit: "m", quantity: 7, wastePercent: 5, unitPrice: 290, laborUnitPrice: 145, carbonKgPerUnit: 42, lifespanYears: 50, maintenanceCycle: "mehrjährig", warrantyYears: 5, custom: { material: "Naturstein" } }
  ]
};

function refreshDynamicConnections(entities: CadEntity[]) {
  const byId = new Map(entities.map(entity => [entity.id, entity]));
  return entities.map(entity => {
    const startId = typeof entity.metadata?.connectionStartId === "string" ? entity.metadata.connectionStartId : undefined;
    const endId = typeof entity.metadata?.connectionEndId === "string" ? entity.metadata.connectionEndId : undefined;
    if (!startId || !endId) return entity;
    const startEntity = byId.get(startId);
    const endEntity = byId.get(endId);
    if (!startEntity || !endEntity) return entity;
    const start = entityCenter(startEntity);
    const end = entityCenter(endEntity);
    return {
      ...entity,
      points: [start, end],
      position: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      depth: distance(start, end)
    };
  });
}

function cloneProject(project: ProjectState): ProjectState {
  return JSON.parse(JSON.stringify(project)) as ProjectState;
}

function normalizeProject(project: ProjectState): ProjectState {
  return {
    ...project,
    schemaVersion: "3.0-alpha.6",
    selectedIds: [],
    activeTool: "select",
    snapModes: project.snapModes?.length ? project.snapModes : ["grid", "endpoint", "midpoint", "center"],
    entities: project.entities.map(entity => ({
      ...entity,
      shape: entity.shape ?? (entity.kind === "plant" ? "symbol" : "rectangle"),
      points: entity.points ?? [],
      fillColor: entity.fillColor,
      strokeColor: entity.strokeColor,
      opacity: entity.opacity ?? 1,
      strokeWidth: entity.strokeWidth ?? entity.width,
      linePattern: entity.linePattern ?? "solid",
      metadata: entity.metadata ?? {}
    })),
    projectCurrency: "EUR",
    vatPercent: Number.isFinite(project.vatPercent) ? project.vatPercent : 20,
    plantingSettings: project.plantingSettings ?? { siteLight: "sun", soil: "loam", moisture: "fresh", hardinessZone: 7, growthYears: 5 },
    renderSettings: project.renderSettings ?? { preset: "daylight", quality: "high", hour: 14, azimuth: 135, exposure: 1.08, shadowStrength: 1, ambientStrength: 1, fogEnabled: true, fogDensity: 0.012, gridVisible3d: true },
    planReference: project.planReference,
    terrain: project.terrain ?? {
      enabled: true, width: 20, depth: 16, resolutionX: 9, resolutionZ: 7,
      baseElevation: 0, contourInterval: 0.25, points: createTerrainGrid(20, 16, 9, 7), cutFillReference: 0
    },
    bim: (project.bim ?? []).map(item => ({
      ...item,
      classification: item.classification ?? "AGD-00",
      phase: item.phase ?? "Neubau",
      wastePercent: item.wastePercent ?? 0,
      laborUnitPrice: item.laborUnitPrice ?? 0,
      carbonKgPerUnit: item.carbonKgPerUnit ?? 0,
      maintenanceCycle: item.maintenanceCycle ?? "keine",
      custom: item.custom ?? {}
    })),
    layers: (() => {
      const normalized = project.layers.map(layer => ({
        ...layer,
        printable: layer.printable ?? true,
        opacity: layer.opacity ?? 1
      }));
      const required: Layer[] = [
        { id: "layer-furniture", name: "Ausstattung & Möbel", color: "#8a6448", visible: true, locked: false, printable: true, opacity: 1, elevation: 0 },
        { id: "layer-lighting", name: "Beleuchtung", color: "#d89b2b", visible: true, locked: false, printable: true, opacity: 1, elevation: 0 }
      ];
      for (const layer of required) if (!normalized.some(item => item.id === layer.id)) normalized.push(layer);
      return normalized;
    })()
  };
}

const Context = createContext<Store | null>(null);

export function ProjectStoreProvider({ children }: { children: ReactNode }) {
  const [internal, setInternal] = useState<InternalState>({
    project: initialProject,
    undo: [],
    redo: [],
    history: []
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) ?? LEGACY_STORAGE_KEYS.map(key => window.localStorage.getItem(key)).find(Boolean);
      if (!saved) return;
      const parsed = JSON.parse(saved) as ProjectFile;
      if (parsed.application === "AL Green Design Studio" && parsed.project) {
        setInternal(current => ({ ...current, project: normalizeProject(parsed.project) }));
      }
    } catch {
      // A damaged local file must never prevent the editor from starting.
    }
  }, []);

  useEffect(() => {
    const file: ProjectFile = {
      application: "AL Green Design Studio",
      version: "3.0-alpha.6",
      savedAt: new Date().toISOString(),
      project: internal.project
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
    } catch {
      // Large plan references can exceed the browser storage quota. The editor must keep running;
      // the full project can still be exported manually as an .algreen file.
    }
  }, [internal.project]);

  const updateUi = useCallback((producer: (project: ProjectState) => ProjectState) => {
    setInternal(current => ({ ...current, project: producer(current.project) }));
  }, []);

  const commit = useCallback((label: string, producer: (project: ProjectState) => ProjectState) => {
    setInternal(current => {
      const next = producer(current.project);
      const entry: HistoryEntry = { id: makeId("history"), label, timestamp: Date.now() };
      return {
        project: next,
        undo: [...current.undo, { label, snapshot: cloneProject(current.project) }].slice(-80),
        redo: [],
        history: [entry, ...current.history].slice(0, 30)
      };
    });
  }, []);

  const value = useMemo<Store>(() => {
    const project = internal.project;
    return {
      ...project,
      canUndo: internal.undo.length > 0,
      canRedo: internal.redo.length > 0,
      history: internal.history,
      setTool: activeTool => updateUi(current => ({ ...current, activeTool })),
      setViewMode: viewMode => updateUi(current => ({ ...current, viewMode })),
      setSelectedIds: selectedIds => updateUi(current => ({ ...current, selectedIds })),
      toggleSelectedId: id => updateUi(current => ({
        ...current,
        selectedIds: current.selectedIds.includes(id)
          ? current.selectedIds.filter(selectedId => selectedId !== id)
          : [...current.selectedIds, id]
      })),
      setActiveLayerId: activeLayerId => updateUi(current => ({ ...current, activeLayerId })),
      setEntities: (entities, label = "Objekte aktualisiert") => commit(label, current => ({ ...current, entities: refreshDynamicConnections(entities) })),
      addEntity: (entity, label = "Objekt erstellt") => commit(label, current => ({
        ...current,
        entities: [...current.entities, entity],
        selectedIds: [entity.id]
      })),
      addEntityWithBim: (entity, bim, label = "Bibliotheksobjekt erstellt") => commit(label, current => ({
        ...current,
        entities: [...current.entities, entity],
        bim: [...current.bim.filter(item => item.entityId !== entity.id), bim],
        selectedIds: [entity.id]
      })),
      addEntities: (entities, label = "Objekte erstellt") => commit(label, current => ({
        ...current,
        entities: [...current.entities, ...entities],
        selectedIds: entities.map(entity => entity.id)
      })),
      updateEntity: (id, patch, label = "Eigenschaft geändert") => commit(label, current => {
        const entities = current.entities.map(entity => entity.id === id ? { ...entity, ...patch } : entity);
        return { ...current, entities: refreshDynamicConnections(entities) };
      }),
      moveEntities: (ids, delta, label = "Objekte verschoben") => {
        if (Math.abs(delta.x) < 0.0001 && Math.abs(delta.y) < 0.0001) return;
        const idSet = new Set(ids);
        commit(label, current => {
          const entities = current.entities.map(entity => idSet.has(entity.id) ? translateEntity(entity, delta) : entity);
          return { ...current, entities: refreshDynamicConnections(entities) };
        });
      },
      deleteSelected: () => {
        if (project.selectedIds.length === 0) return;
        const selected = new Set(project.selectedIds);
        commit("Auswahl gelöscht", current => {
          const kept = current.entities.filter(entity => !selected.has(entity.id) || entity.locked);
          const keptIds = new Set(kept.map(entity => entity.id));
          const entities = kept.filter(entity => {
            const startId = typeof entity.metadata?.connectionStartId === "string" ? entity.metadata.connectionStartId : undefined;
            const endId = typeof entity.metadata?.connectionEndId === "string" ? entity.metadata.connectionEndId : undefined;
            return (!startId || keptIds.has(startId)) && (!endId || keptIds.has(endId));
          });
          return {
            ...current,
            entities: refreshDynamicConnections(entities),
            bim: current.bim.filter(item => !selected.has(item.entityId)),
            selectedIds: []
          };
        });
      },
      duplicateSelected: () => {
        const selected = project.entities.filter(entity => project.selectedIds.includes(entity.id) && !entity.locked);
        if (selected.length === 0) return;
        const duplicates = selected.map(entity => {
          const copy = translateEntity(entity, { x: 0.5, y: 0.5 });
          return { ...copy, id: makeId(entity.kind), name: `${entity.name} Kopie`, locked: false };
        });
        commit("Auswahl dupliziert", current => ({
          ...current,
          entities: [...current.entities, ...duplicates],
          selectedIds: duplicates.map(entity => entity.id)
        }));
      },
      undo: () => {
        setInternal(current => {
          const command = current.undo.at(-1);
          if (!command) return current;
          return {
            project: normalizeProject(command.snapshot),
            undo: current.undo.slice(0, -1),
            redo: [...current.redo, { label: command.label, snapshot: cloneProject(current.project) }].slice(-80),
            history: [{ id: makeId("history"), label: `Rückgängig: ${command.label}`, timestamp: Date.now() }, ...current.history].slice(0, 30)
          };
        });
      },
      redo: () => {
        setInternal(current => {
          const command = current.redo.at(-1);
          if (!command) return current;
          return {
            project: normalizeProject(command.snapshot),
            undo: [...current.undo, { label: command.label, snapshot: cloneProject(current.project) }].slice(-80),
            redo: current.redo.slice(0, -1),
            history: [{ id: makeId("history"), label: `Wiederholt: ${command.label}`, timestamp: Date.now() }, ...current.history].slice(0, 30)
          };
        });
      },
      toggleGrid: () => updateUi(current => ({ ...current, gridVisible: !current.gridVisible })),
      toggleSnap: () => updateUi(current => ({ ...current, snapEnabled: !current.snapEnabled })),
      toggleDimensions: () => updateUi(current => ({ ...current, showDimensions: !current.showDimensions })),
      setGridSize: gridSize => updateUi(current => ({ ...current, gridSize: Math.max(0.05, gridSize) })),
      updateLayer: (id, patch) => commit("Layer geändert", current => ({
        ...current,
        layers: current.layers.map(layer => layer.id === id ? { ...layer, ...patch } : layer)
      })),
      updateBim: (entityId, patch) => commit("BIM-Daten geändert", current => ({
        ...current,
        bim: current.bim.map(item => item.entityId === entityId ? { ...item, ...patch } : item)
      })),
      ensureBim: entityId => commit("BIM-Datensatz erstellt", current => {
        if (current.bim.some(item => item.entityId === entityId)) return current;
        const entity = current.entities.find(item => item.id === entityId);
        if (!entity) return current;
        const unit = entity.kind === "plant" || entity.kind === "furniture" ? "Stk." : entity.kind === "wall" || entity.kind === "path" ? "m" : "m²";
        return {
          ...current,
          bim: [...current.bim, {
            entityId,
            category: entity.kind,
            classification: "AGD-00",
            phase: "Neubau",
            unit,
            quantity: 1,
            wastePercent: 0,
            unitPrice: 0,
            laborUnitPrice: 0,
            carbonKgPerUnit: 0,
            maintenanceCycle: "keine",
            custom: {}
          }]
        };
      }),
      setVatPercent: vatPercent => updateUi(current => ({ ...current, vatPercent: Math.max(0, vatPercent) })),
      updateTerrain: (patch, label = "Gelände geändert") => commit(label, current => ({
        ...current, terrain: { ...current.terrain, ...patch }
      })),
      updateTerrainPoint: (id, elevation) => commit("Geländepunkt geändert", current => ({
        ...current, terrain: { ...current.terrain, points: current.terrain.points.map(point => point.id === id ? { ...point, elevation } : point) }
      })),
      updatePlantingSettings: patch => updateUi(current => ({ ...current, plantingSettings: { ...current.plantingSettings, ...patch } })),
      updateRenderSettings: patch => updateUi(current => ({ ...current, renderSettings: { ...current.renderSettings, ...patch } })),
      updatePlanReference: patch => commit("Planreferenz geändert", current => ({
        ...current,
        planReference: patch === null ? undefined : {
          ...(current.planReference ?? { dataUrl: "", name: "Planreferenz", visible: true, opacity: 0.45, width: 16, depth: 11, sourceType: "image" }),
          ...patch
        }
      })),
      applyTerrainPreset: preset => commit(`Geländevorlage: ${preset}`, current => ({
        ...current, terrain: applyTerrainPreset(current.terrain, preset)
      })),
      exportProjectFile: () => ({
        application: "AL Green Design Studio",
        version: "3.0-alpha.6",
        savedAt: new Date().toISOString(),
        project: cloneProject(project)
      }),
      importProjectFile: file => {
        if (file.application !== "AL Green Design Studio" || !file.project) {
          throw new Error("Keine gültige AL-Green-Projektdatei.");
        }
        setInternal(current => ({
          project: normalizeProject(file.project),
          undo: [...current.undo, { label: "Projekt importiert", snapshot: cloneProject(current.project) }].slice(-80),
          redo: [],
          history: [{ id: makeId("history"), label: "Projekt importiert", timestamp: Date.now() }, ...current.history].slice(0, 30)
        }));
      },
      resetProject: () => {
        setInternal(current => ({
          project: cloneProject(initialProject),
          undo: [...current.undo, { label: "Projekt zurückgesetzt", snapshot: cloneProject(current.project) }].slice(-80),
          redo: [],
          history: [{ id: makeId("history"), label: "Projekt zurückgesetzt", timestamp: Date.now() }, ...current.history].slice(0, 30)
        }));
      },
      clearProject: () => {
        setInternal(current => {
          const blank = cloneProject(initialProject);
          blank.id = makeId("project");
          blank.name = "Neues Gartenprojekt";
          blank.entities = [];
          blank.bim = [];
          blank.planReference = undefined;
          blank.selectedIds = [];
          blank.activeTool = "select";
          blank.viewMode = "2d";
          blank.terrain = {
            ...blank.terrain,
            enabled: false,
            baseElevation: 0,
            points: createTerrainGrid(blank.terrain.width, blank.terrain.depth, blank.terrain.resolutionX, blank.terrain.resolutionZ)
          };
          return {
            project: blank,
            undo: [...current.undo, { label: "Alles gelöscht", snapshot: cloneProject(current.project) }].slice(-80),
            redo: [],
            history: [{ id: makeId("history"), label: "Alles gelöscht – neues Projekt", timestamp: Date.now() }, ...current.history].slice(0, 30)
          };
        });
      }
    };
  }, [commit, internal, updateUi]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useProjectStore() {
  const value = useContext(Context);
  if (!value) throw new Error("useProjectStore must be used inside ProjectStoreProvider");
  return value;
}
