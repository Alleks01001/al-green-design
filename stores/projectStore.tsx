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
import { distance, entitiesBounds, entityCenter, makeId, transformEntityAround, translateEntity } from "@/core/cad/geometry";
import { mirrorEntity, offsetEntity, polarTransformEntity, trimOrExtendLine, type LineEditMode, type MirrorAxis } from "@/core/cad/modify";
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
  PlanReference,
  SnapMode,
  DimensionSettings
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
  offsetSelected: (distance: number) => void;
  mirrorSelected: (axis: MirrorAxis, copy: boolean) => void;
  createRectangularArray: (options: { rows: number; columns: number; spacingX: number; spacingY: number }) => void;
  createPolarArray: (options: { count: number; totalAngle: number; center: Vec2; rotateItems: boolean }) => void;
  trimOrExtendSelected: (mode: LineEditMode) => void;
  undo: () => void;
  redo: () => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleSnapMode: (mode: SnapMode) => void;
  toggleOrthogonalMode: () => void;
  toggleDimensions: () => void;
  setGridSize: (size: number) => void;
  setNudgeStep: (size: number) => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  transformSelected: (options: { x?: number; y?: number; width?: number; depth?: number; rotationDelta?: number }, label?: string) => void;
  createBlockFromSelected: (name: string) => void;
  insertBlock: (definitionId: string) => void;
  deleteBlockDefinition: (definitionId: string) => void;
  addLayer: (name?: string) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  deleteLayer: (id: string) => void;
  moveLayer: (id: string, direction: -1 | 1) => void;
  moveSelectedToLayer: (layerId: string) => void;
  isolateLayer: (id: string) => void;
  showAllLayers: () => void;
  updateDimensionSettings: (patch: Partial<DimensionSettings>) => void;
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

const STORAGE_KEY = "al-green-design-studio-3.1-alpha.3";
const LEGACY_STORAGE_KEYS = [
  "al-green-design-studio-3.1-alpha.2",
  "al-green-design-studio-3.1-alpha.1",
  "al-green-design-studio-3.0-alpha.6",
  "al-green-design-studio-3.0-alpha.5",
  "al-green-design-studio-3.0-alpha.4",
  "al-green-design-studio-3.0-alpha.3",
  "al-green-design-studio-3.0-alpha",
  "al-green-design-studio-2.6",
  "al-green-design-studio-2.5",
  "al-green-design-studio-2.4"
];

const initialProject: ProjectState = {
  schemaVersion: "3.1-alpha.3",
  id: "project-main",
  name: "AL Green Design Studio 3.1 Professional CAD",
  activeTool: "select",
  viewMode: "split",
  selectedIds: [],
  activeLayerId: "layer-site",
  gridSize: 0.5,
  gridVisible: true,
  snapEnabled: true,
  snapModes: ["grid", "endpoint", "midpoint", "center", "intersection"],
  orthogonalMode: false,
  nudgeStep: 0.1,
  dimensionSettings: { mode: "aligned", unit: "m", decimals: 2, textScale: 1 },
  blockDefinitions: [],
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

function editableSelection(project: ProjectState) {
  const byId = new Map(project.entities.map(entity => [entity.id, entity]));
  return project.selectedIds
    .map(id => byId.get(id))
    .filter((entity): entity is CadEntity => Boolean(entity && !entity.locked && !project.layers.find(layer => layer.id === entity.layerId)?.locked));
}

function cloneSelectionBatch(
  source: CadEntity[],
  bim: BimProperties[],
  transform: (entity: CadEntity) => CadEntity | null,
  nameSuffix: string
) {
  const transformed = source.flatMap(entity => {
    const result = transform(entity);
    return result ? [{ source: entity, result }] : [];
  });
  const idMap = new Map(transformed.map(({ source }) => [source.id, makeId(source.kind)]));
  const groupMap = new Map<string, string>();
  const instanceMap = new Map<string, string>();
  const entities = transformed.map(({ source: original, result }) => {
    const metadata = { ...(result.metadata ?? {}) };
    const oldGroupId = typeof metadata.groupId === "string" ? metadata.groupId : undefined;
    const oldInstanceId = typeof metadata.blockInstanceId === "string" ? metadata.blockInstanceId : undefined;
    if (oldGroupId) {
      if (!groupMap.has(oldGroupId)) groupMap.set(oldGroupId, makeId("group"));
      metadata.groupId = groupMap.get(oldGroupId)!;
    }
    if (oldInstanceId) {
      if (!instanceMap.has(oldInstanceId)) instanceMap.set(oldInstanceId, makeId("instance"));
      metadata.blockInstanceId = instanceMap.get(oldInstanceId)!;
    }
    const startId = typeof metadata.connectionStartId === "string" ? metadata.connectionStartId : undefined;
    const endId = typeof metadata.connectionEndId === "string" ? metadata.connectionEndId : undefined;
    if (startId && endId && idMap.has(startId) && idMap.has(endId)) {
      metadata.connectionStartId = idMap.get(startId)!;
      metadata.connectionEndId = idMap.get(endId)!;
    } else if (startId || endId) {
      delete metadata.connectionStartId;
      delete metadata.connectionEndId;
      delete metadata.dynamicConnection;
      delete metadata.associativeDimension;
    }
    return {
      ...result,
      id: idMap.get(original.id)!,
      name: `${original.name} · ${nameSuffix}`,
      metadata,
      locked: false
    };
  });
  const bimCopies = bim.flatMap(item => {
    const entityId = idMap.get(item.entityId);
    return entityId ? [{ ...item, entityId, custom: { ...item.custom } }] : [];
  });
  return { entities, bim: bimCopies };
}

function normalizeProject(project: ProjectState): ProjectState {
  return {
    ...project,
    schemaVersion: "3.1-alpha.3",
    selectedIds: [],
    activeTool: "select",
    snapModes: project.snapModes?.length ? Array.from(new Set([...project.snapModes, "intersection" as SnapMode])) : ["grid", "endpoint", "midpoint", "center", "intersection"],
    orthogonalMode: project.orthogonalMode ?? false,
    nudgeStep: Number.isFinite(project.nudgeStep) ? Math.max(0.01, project.nudgeStep) : 0.1,
    dimensionSettings: {
      mode: project.dimensionSettings?.mode === "horizontal" || project.dimensionSettings?.mode === "vertical" ? project.dimensionSettings.mode : "aligned",
      unit: project.dimensionSettings?.unit === "cm" || project.dimensionSettings?.unit === "mm" ? project.dimensionSettings.unit : "m",
      decimals: Math.min(3, Math.max(0, Math.round(Number(project.dimensionSettings?.decimals ?? 2)))) as 0 | 1 | 2 | 3,
      textScale: Number.isFinite(project.dimensionSettings?.textScale) ? Math.min(2, Math.max(0.65, project.dimensionSettings.textScale)) : 1
    },
    blockDefinitions: (project.blockDefinitions ?? []).map(definition => ({
      ...definition,
      entities: (definition.entities ?? []).map(entity => ({ ...entity, metadata: entity.metadata ?? {} })),
      bim: definition.bim ?? []
    })),
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
        color: /^#[0-9a-f]{6}$/i.test(layer.color) ? layer.color : "#7b3650",
        printable: layer.printable ?? true,
        opacity: Number.isFinite(layer.opacity) ? Math.min(1, Math.max(0.1, layer.opacity)) : 1
      }));
      const required: Layer[] = [
        { id: "layer-furniture", name: "Ausstattung & Möbel", color: "#8a6448", visible: true, locked: false, printable: true, opacity: 1, elevation: 0 },
        { id: "layer-lighting", name: "Beleuchtung", color: "#d89b2b", visible: true, locked: false, printable: true, opacity: 1, elevation: 0 },
        { id: "layer-dimensions", name: "Bemaßung", color: "#6e2940", visible: true, locked: false, printable: true, opacity: 1, elevation: 0 }
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
      version: "3.1-alpha.3",
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
      setActiveLayerId: activeLayerId => updateUi(current => current.layers.some(layer => layer.id === activeLayerId && layer.visible && !layer.locked)
        ? { ...current, activeLayerId }
        : current),
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
        commit("Auswahl dupliziert", current => {
          const idMap = new Map(selected.map(entity => [entity.id, makeId(entity.kind)]));
          const groupMap = new Map<string, string>();
          const instanceMap = new Map<string, string>();
          const duplicates = selected.map(entity => {
            const copy = translateEntity(entity, { x: 0.5, y: 0.5 });
            const metadata = { ...(copy.metadata ?? {}) };
            const oldGroupId = typeof metadata.groupId === "string" ? metadata.groupId : undefined;
            const oldInstanceId = typeof metadata.blockInstanceId === "string" ? metadata.blockInstanceId : undefined;
            if (oldGroupId) {
              if (!groupMap.has(oldGroupId)) groupMap.set(oldGroupId, makeId("group"));
              metadata.groupId = groupMap.get(oldGroupId)!;
            }
            if (oldInstanceId) {
              if (!instanceMap.has(oldInstanceId)) instanceMap.set(oldInstanceId, makeId("instance"));
              metadata.blockInstanceId = instanceMap.get(oldInstanceId)!;
            }
            const oldStartId = typeof metadata.connectionStartId === "string" ? metadata.connectionStartId : undefined;
            const oldEndId = typeof metadata.connectionEndId === "string" ? metadata.connectionEndId : undefined;
            if (oldStartId && idMap.has(oldStartId)) metadata.connectionStartId = idMap.get(oldStartId)!;
            if (oldEndId && idMap.has(oldEndId)) metadata.connectionEndId = idMap.get(oldEndId)!;
            return { ...copy, id: idMap.get(entity.id)!, name: `${entity.name} Kopie`, metadata, locked: false };
          });
          const duplicateBim = current.bim.flatMap(item => {
            const entityId = idMap.get(item.entityId);
            return entityId ? [{ ...item, entityId, custom: { ...item.custom } }] : [];
          });
          return {
            ...current,
            entities: refreshDynamicConnections([...current.entities, ...duplicates]),
            bim: [...current.bim, ...duplicateBim],
            selectedIds: duplicates.map(entity => entity.id)
          };
        });
      },
      offsetSelected: offset => {
        if (!Number.isFinite(offset) || Math.abs(offset) < 0.001 || editableSelection(project).length === 0) return;
        commit("Versatzkopie erstellt", current => {
          const source = editableSelection(current);
          const copies = cloneSelectionBatch(source, current.bim, entity => offsetEntity(entity, offset), `Versatz ${offset.toFixed(2)} m`);
          if (!copies.entities.length) return current;
          return {
            ...current,
            entities: refreshDynamicConnections([...current.entities, ...copies.entities]),
            bim: [...current.bim, ...copies.bim],
            selectedIds: copies.entities.map(entity => entity.id)
          };
        });
      },
      mirrorSelected: (axis, copy) => {
        const selected = editableSelection(project);
        if (!selected.length) return;
        const bounds = entitiesBounds(selected);
        const origin = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
        commit(copy ? "Spiegelkopie erstellt" : "Auswahl gespiegelt", current => {
          const source = editableSelection(current);
          if (copy) {
            const copies = cloneSelectionBatch(source, current.bim, entity => mirrorEntity(entity, axis, origin), axis === "vertical" ? "Spiegel Y" : "Spiegel X");
            return {
              ...current,
              entities: refreshDynamicConnections([...current.entities, ...copies.entities]),
              bim: [...current.bim, ...copies.bim],
              selectedIds: copies.entities.map(entity => entity.id)
            };
          }
          const ids = new Set(source.map(entity => entity.id));
          return {
            ...current,
            entities: refreshDynamicConnections(current.entities.map(entity => ids.has(entity.id) ? mirrorEntity(entity, axis, origin) : entity))
          };
        });
      },
      createRectangularArray: options => {
        const rows = Math.min(10, Math.max(1, Math.round(options.rows)));
        const columns = Math.min(10, Math.max(1, Math.round(options.columns)));
        if (rows * columns <= 1 || editableSelection(project).length === 0) return;
        const spacingX = Number.isFinite(options.spacingX) ? options.spacingX : 0;
        const spacingY = Number.isFinite(options.spacingY) ? options.spacingY : 0;
        commit("Rechteckige Anordnung erstellt", current => {
          const source = editableSelection(current);
          const batches = [] as ReturnType<typeof cloneSelectionBatch>[];
          for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
              if (row === 0 && column === 0) continue;
              const delta = { x: column * spacingX, y: row * spacingY };
              batches.push(cloneSelectionBatch(source, current.bim, entity => translateEntity(entity, delta), `Array ${row + 1}/${column + 1}`));
            }
          }
          const entities = batches.flatMap(batch => batch.entities);
          const bim = batches.flatMap(batch => batch.bim);
          return {
            ...current,
            entities: refreshDynamicConnections([...current.entities, ...entities]),
            bim: [...current.bim, ...bim],
            selectedIds: entities.map(entity => entity.id)
          };
        });
      },
      createPolarArray: options => {
        const count = Math.min(48, Math.max(2, Math.round(options.count)));
        const totalAngle = Number.isFinite(options.totalAngle) ? options.totalAngle : 360;
        if (Math.abs(totalAngle) < 0.01 || editableSelection(project).length === 0) return;
        const step = Math.abs(totalAngle) >= 359.999 ? totalAngle / count : totalAngle / (count - 1);
        commit("Polare Anordnung erstellt", current => {
          const source = editableSelection(current);
          const batches = Array.from({ length: count - 1 }, (_, index) => {
            const angle = step * (index + 1);
            return cloneSelectionBatch(source, current.bim, entity => polarTransformEntity(entity, options.center, angle, options.rotateItems), `Polar ${index + 2}/${count}`);
          });
          const entities = batches.flatMap(batch => batch.entities);
          const bim = batches.flatMap(batch => batch.bim);
          return {
            ...current,
            entities: refreshDynamicConnections([...current.entities, ...entities]),
            bim: [...current.bim, ...bim],
            selectedIds: entities.map(entity => entity.id)
          };
        });
      },
      trimOrExtendSelected: mode => {
        const selected = editableSelection(project);
        if (selected.length !== 2) return;
        const result = trimOrExtendLine(selected[0], selected[1], mode);
        if (!result) return;
        commit(mode === "trim" ? "Linie bis Schnittpunkt gekürzt" : "Linie bis Schnittpunkt verlängert", current => ({
          ...current,
          entities: refreshDynamicConnections(current.entities.map(entity => entity.id === result.id ? result : entity))
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
      toggleSnapMode: mode => updateUi(current => ({
        ...current,
        snapModes: current.snapModes.includes(mode)
          ? current.snapModes.filter(item => item !== mode)
          : [...current.snapModes, mode]
      })),
      toggleOrthogonalMode: () => updateUi(current => ({ ...current, orthogonalMode: !current.orthogonalMode })),
      toggleDimensions: () => updateUi(current => ({ ...current, showDimensions: !current.showDimensions })),
      setGridSize: gridSize => updateUi(current => ({ ...current, gridSize: Math.max(0.05, gridSize) })),
      setNudgeStep: nudgeStep => updateUi(current => ({ ...current, nudgeStep: Math.max(0.01, nudgeStep) })),
      groupSelected: () => {
        if (project.selectedIds.length < 2) return;
        const selected = new Set(project.selectedIds);
        const groupId = makeId("group");
        commit("Auswahl gruppiert", current => ({
          ...current,
          entities: current.entities.map(entity => selected.has(entity.id) && !entity.locked
            ? { ...entity, metadata: { ...(entity.metadata ?? {}), groupId } }
            : entity)
        }));
      },
      ungroupSelected: () => {
        if (project.selectedIds.length === 0) return;
        const selected = new Set(project.selectedIds);
        commit("Gruppierung aufgehoben", current => ({
          ...current,
          entities: current.entities.map(entity => {
            if (!selected.has(entity.id) || entity.locked) return entity;
            const metadata = { ...(entity.metadata ?? {}) };
            delete metadata.groupId;
            return { ...entity, metadata };
          })
        }));
      },
      transformSelected: (options, label = "Auswahl präzise transformiert") => {
        if (project.selectedIds.length === 0) return;
        const selected = new Set(project.selectedIds);
        commit(label, current => {
          const editable = current.entities.filter(entity => selected.has(entity.id) && !entity.locked && !current.layers.find(layer => layer.id === entity.layerId)?.locked);
          if (editable.length === 0) return current;
          const bounds = entitiesBounds(editable);
          const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
          const currentWidth = Math.max(0.001, bounds.maxX - bounds.minX);
          const currentDepth = Math.max(0.001, bounds.maxY - bounds.minY);
          const scaleX = options.width === undefined ? 1 : Math.max(0.001, options.width) / currentWidth;
          const scaleY = options.depth === undefined ? 1 : Math.max(0.001, options.depth) / currentDepth;
          const translate = {
            x: options.x === undefined ? 0 : options.x - center.x,
            y: options.y === undefined ? 0 : options.y - center.y
          };
          const entities = current.entities.map(entity => selected.has(entity.id) && editable.some(item => item.id === entity.id)
            ? transformEntityAround(entity, center, { translate, scaleX, scaleY, rotationDegrees: options.rotationDelta ?? 0 })
            : entity);
          return { ...current, entities: refreshDynamicConnections(entities) };
        });
      },
      createBlockFromSelected: name => {
        const cleanName = name.trim();
        if (!cleanName || project.selectedIds.length === 0) return;
        const selected = new Set(project.selectedIds);
        commit(`Block erstellt: ${cleanName}`, current => {
          const source = current.entities.filter(entity => selected.has(entity.id) && !entity.locked);
          if (source.length === 0) return current;
          const bounds = entitiesBounds(source);
          const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
          const definitionId = makeId("block");
          const instanceId = makeId("instance");
          const groupId = makeId("group");
          const sourceIds = new Set(source.map(entity => entity.id));
          const templates = source.map(entity => {
            const relative = translateEntity(entity, { x: -center.x, y: -center.y });
            const metadata = { ...(relative.metadata ?? {}) };
            delete metadata.groupId;
            delete metadata.blockInstanceId;
            delete metadata.blockDefinitionId;
            const startId = typeof metadata.connectionStartId === "string" ? metadata.connectionStartId : undefined;
            const endId = typeof metadata.connectionEndId === "string" ? metadata.connectionEndId : undefined;
            if ((startId && !sourceIds.has(startId)) || (endId && !sourceIds.has(endId))) {
              delete metadata.connectionStartId;
              delete metadata.connectionEndId;
              delete metadata.dynamicConnection;
            }
            return { ...relative, metadata };
          });
          const definition = {
            id: definitionId,
            name: cleanName,
            createdAt: Date.now(),
            entities: templates,
            bim: current.bim.filter(item => selected.has(item.entityId)).map(item => ({ ...item, custom: { ...item.custom } }))
          };
          return {
            ...current,
            blockDefinitions: [...current.blockDefinitions, definition],
            entities: current.entities.map(entity => selected.has(entity.id)
              ? { ...entity, metadata: { ...(entity.metadata ?? {}), groupId, blockDefinitionId: definitionId, blockInstanceId: instanceId } }
              : entity)
          };
        });
      },
      insertBlock: definitionId => {
        commit("Block eingefügt", current => {
          const definition = current.blockDefinitions.find(item => item.id === definitionId);
          if (!definition) return current;
          const instanceId = makeId("instance");
          const groupId = makeId("group");
          const existingInstances = current.entities.filter(entity => entity.metadata?.blockDefinitionId === definitionId).length;
          const offset = { x: (existingInstances % 6) * 0.75, y: Math.floor(existingInstances / 6) * 0.75 };
          const idMap = new Map(definition.entities.map(entity => [entity.id, makeId(entity.kind)]));
          const inserted = definition.entities.map(entity => {
            const metadata = { ...(entity.metadata ?? {}) };
            const oldStartId = typeof metadata.connectionStartId === "string" ? metadata.connectionStartId : undefined;
            const oldEndId = typeof metadata.connectionEndId === "string" ? metadata.connectionEndId : undefined;
            if (oldStartId && idMap.has(oldStartId)) metadata.connectionStartId = idMap.get(oldStartId)!;
            if (oldEndId && idMap.has(oldEndId)) metadata.connectionEndId = idMap.get(oldEndId)!;
            metadata.groupId = groupId;
            metadata.blockDefinitionId = definitionId;
            metadata.blockInstanceId = instanceId;
            return translateEntity({ ...entity, id: idMap.get(entity.id)!, name: `${entity.name} · ${definition.name}`, metadata, locked: false }, offset);
          });
          const insertedBim = definition.bim.flatMap(item => {
            const entityId = idMap.get(item.entityId);
            return entityId ? [{ ...item, entityId, custom: { ...item.custom } }] : [];
          });
          return {
            ...current,
            entities: refreshDynamicConnections([...current.entities, ...inserted]),
            bim: [...current.bim, ...insertedBim],
            selectedIds: inserted.map(entity => entity.id)
          };
        });
      },
      deleteBlockDefinition: definitionId => commit("Blockdefinition gelöscht", current => ({
        ...current,
        blockDefinitions: current.blockDefinitions.filter(item => item.id !== definitionId)
      })),
      addLayer: (name = "Neuer Layer") => commit("Layer erstellt", current => {
        const id = makeId("layer");
        const palette = ["#7b3650", "#456f7e", "#657a45", "#9a6b36", "#70588f", "#8a5050", "#3f776b"];
        return {
          ...current,
          layers: [...current.layers, {
            id,
            name: `${name} ${current.layers.length + 1}`,
            color: palette[current.layers.length % palette.length],
            visible: true,
            locked: false,
            printable: true,
            opacity: 1,
            elevation: 0
          }],
          activeLayerId: id
        };
      }),
      updateLayer: (id, patch) => commit("Layer geändert", current => {
        const layers = current.layers.map(layer => layer.id === id ? { ...layer, ...patch } : layer);
        const active = layers.find(layer => layer.id === current.activeLayerId);
        const fallback = layers.find(layer => layer.visible && !layer.locked);
        return {
          ...current,
          layers,
          activeLayerId: active && active.visible && !active.locked ? active.id : fallback?.id ?? current.activeLayerId,
          selectedIds: current.selectedIds.filter(entityId => {
            const entity = current.entities.find(item => item.id === entityId);
            const layer = entity ? layers.find(item => item.id === entity.layerId) : undefined;
            return Boolean(entity && layer?.visible && !layer.locked);
          })
        };
      }),
      deleteLayer: id => commit("Leeren Layer gelöscht", current => {
        if (current.layers.length <= 1 || current.entities.some(entity => entity.layerId === id)) return current;
        const layers = current.layers.filter(layer => layer.id !== id);
        return {
          ...current,
          layers,
          activeLayerId: current.activeLayerId === id ? layers[0].id : current.activeLayerId
        };
      }),
      moveLayer: (id, direction) => commit("Layer-Reihenfolge geändert", current => {
        const index = current.layers.findIndex(layer => layer.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.layers.length) return current;
        const layers = [...current.layers];
        [layers[index], layers[target]] = [layers[target], layers[index]];
        return { ...current, layers };
      }),
      moveSelectedToLayer: layerId => {
        if (!project.selectedIds.length || !project.layers.some(layer => layer.id === layerId && !layer.locked)) return;
        const selected = new Set(project.selectedIds);
        commit("Auswahl auf Layer verschoben", current => ({
          ...current,
          entities: current.entities.map(entity => selected.has(entity.id) && !entity.locked ? { ...entity, layerId } : entity)
        }));
      },
      isolateLayer: id => commit("Layer isoliert", current => ({
        ...current,
        layers: current.layers.map(layer => ({ ...layer, visible: layer.id === id })),
        activeLayerId: id,
        selectedIds: current.selectedIds.filter(entityId => current.entities.some(entity => entity.id === entityId && entity.layerId === id))
      })),
      showAllLayers: () => commit("Alle Layer eingeblendet", current => ({
        ...current,
        layers: current.layers.map(layer => ({ ...layer, visible: true }))
      })),
      updateDimensionSettings: patch => updateUi(current => ({
        ...current,
        dimensionSettings: {
          ...current.dimensionSettings,
          ...patch,
          textScale: patch.textScale === undefined ? current.dimensionSettings.textScale : Math.min(2, Math.max(0.65, patch.textScale))
        }
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
        version: "3.1-alpha.3",
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
