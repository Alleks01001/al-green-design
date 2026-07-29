"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { CadCanvas } from "@/components/cad/CadCanvas";
import { DetailToolsPanel } from "@/components/cad/DetailToolsPanel";
import { ProfessionalCadPanel } from "@/components/cad/ProfessionalCadPanel";
import { LayerDimensionPanel } from "@/components/cad/LayerDimensionPanel";
import { AdvancedModifyPanel } from "@/components/cad/AdvancedModifyPanel";
import { ArchitectureOpeningsPanel } from "@/components/architecture/ArchitectureOpeningsPanel";
import { ThreeViewport } from "@/components/render/ThreeViewport";
import { ElevationViewport } from "@/components/render/ElevationViewport";
import { RenderSettingsPanel } from "@/components/render/RenderSettingsPanel";
import { GardenAI } from "@/components/ai/GardenAI";
import { GardenDesignerPanel } from "@/components/ai/GardenDesignerPanel";
import { LibraryPanel } from "@/components/library/LibraryPanel";
import { BimInspector } from "@/components/bim/BimInspector";
import { TerrainPanel } from "@/components/terrain/TerrainPanel";
import { PlantIntelligencePanel } from "@/components/plants/PlantIntelligencePanel";
import { FoundationPanel } from "@/components/system/FoundationPanel";
import { MediaImportPanel } from "@/components/import/MediaImportPanel";
import { useProjectStore } from "@/stores/projectStore";
import type { CadTool, ProjectFile } from "@/types/domain";
import { STUDIO_BUILD_LABEL, STUDIO_PACKAGE_VERSION } from "@/core/platform/version";
import { exportCadPlanToPdf } from "@/lib/pdf/exportPlanPdf";

const tools: Array<{ id: CadTool; label: string; icon: string }> = [
  { id: "select", label: "Auswahl", icon: "↖" },
  { id: "pan", label: "Pan", icon: "✋" },
  { id: "move", label: "Verschieben", icon: "✥" },
  { id: "line", label: "Linie", icon: "╱" },
  { id: "polyline", label: "Polylinie", icon: "⌁" },
  { id: "rectangle", label: "Rechteck", icon: "▭" },
  { id: "circle", label: "Kreis", icon: "○" },
  { id: "ellipse", label: "Ellipse", icon: "⬭" },
  { id: "polygon", label: "Polygon", icon: "⬡" },
  { id: "wall", label: "Wand/Mauer", icon: "▥" },
  { id: "path", label: "Weg", icon: "⌁" },
  { id: "terrace", label: "Terrasse", icon: "▤" },
  { id: "bed", label: "Beet", icon: "▧" },
  { id: "fence", label: "Zaun", icon: "╫" },
  { id: "hedge", label: "Hecke", icon: "♒" },
  { id: "water", label: "Wasser", icon: "≈" },
  { id: "pool", label: "Pool", icon: "▭" },
  { id: "stairs", label: "Treppe", icon: "▰" },
  { id: "plant", label: "Pflanze", icon: "✦" },
  { id: "dimension", label: "Bemaßung", icon: "↔" }
];

export function StudioShell() {
  const store = useProjectStore();
  const {
    activeTool,
    setTool,
    viewMode,
    setViewMode,
    gridVisible,
    snapEnabled,
    orthogonalMode,
    showDimensions,
    toggleGrid,
    toggleSnap,
    toggleOrthogonalMode,
    toggleDimensions,
    undo,
    redo,
    canUndo,
    canRedo,
    layers,
    activeLayerId,
    setActiveLayerId,
    exportProjectFile,
    importProjectFile,
    createProject,
    clearProject,
    selectedIds,
    setSelectedIds,
    id: projectId,
    name: projectName
  } = store;
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [fileMessage, setFileMessage] = useState("Automatisch lokal gespeichert");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("Neues Gartenprojekt");
  const [newProjectWidth, setNewProjectWidth] = useState(20);
  const [newProjectDepth, setNewProjectDepth] = useState(15);
  const [createProperty, setCreateProperty] = useState(true);
  const [terrainEnabled, setTerrainEnabled] = useState(true);

  useEffect(() => {
    if (!newProjectOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNewProjectOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [newProjectOpen]);

  function exportProject() {
    const file = exportProjectFile();
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `AL_Green_Design_${new Date().toISOString().slice(0, 10)}.algreen`;
    anchor.click();
    URL.revokeObjectURL(url);
    setFileMessage("Projektdatei exportiert");
  }


  async function exportPdfPlan() {
    const previousView = viewMode;
    const previousSelection = [...selectedIds];
    const changedView = viewMode !== "2d" && viewMode !== "split";
    try {
      if (changedView) setViewMode("2d");
      if (selectedIds.length > 0) setSelectedIds([]);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await exportCadPlanToPdf(projectName);
      setFileMessage("PDF-Plan exportiert");
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : "PDF-Export fehlgeschlagen");
    } finally {
      if (previousSelection.length > 0) setSelectedIds(previousSelection);
      if (changedView) setViewMode(previousView);
    }
  }

  function startBlankProject() {
    const confirmed = window.confirm("Wirklich die gesamte Zeichnung in diesem Projekt leeren? Projektname und Grundeinstellungen bleiben erhalten. Die Aktion kann unmittelbar über Rückgängig wiederhergestellt werden.");
    if (!confirmed) return;
    clearProject();
    setFileMessage("Zeichnung geleert – Rückgängig ist möglich");
  }

  function submitNewProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const width = Math.min(200, Math.max(3, Number(newProjectWidth) || 20));
    const depth = Math.min(200, Math.max(3, Number(newProjectDepth) || 15));
    createProject({ name: newProjectName, width, depth, createProperty, terrainEnabled });
    setNewProjectOpen(false);
    setFileMessage(`${newProjectName.trim() || "Neues Gartenprojekt"} · ${width} × ${depth} m erstellt`);
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as ProjectFile;
      importProjectFile(parsed);
      setFileMessage(`${file.name} geladen`);
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : "Projekt konnte nicht geladen werden");
    }
  }

  return (
    <main className="studio">
      {newProjectOpen && (
        <div className="newProjectOverlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setNewProjectOpen(false); }}>
          <form className="newProjectDialog" role="dialog" aria-modal="true" aria-labelledby="new-project-title" onSubmit={submitNewProject}>
            <div className="newProjectHeading">
              <div><span>Projektassistent · Alpha 8</span><h2 id="new-project-title">Neues Projekt erstellen</h2></div>
              <button type="button" aria-label="Dialog schließen" onClick={() => setNewProjectOpen(false)}>×</button>
            </div>
            <p>Lege eine neue Zeichenfläche an. Das Grundstück wird maßstäblich erzeugt und kann sofort weitergezeichnet werden.</p>
            <label className="newProjectName"><span>Projektname</span><input autoFocus value={newProjectName} maxLength={80} onChange={event => setNewProjectName(event.target.value)} /></label>
            <div className="newProjectDimensions">
              <label><span>Grundstücksbreite</span><div><input type="number" min="3" max="200" step="0.5" value={newProjectWidth} onChange={event => setNewProjectWidth(Number(event.target.value))} /><em>m</em></div></label>
              <label><span>Grundstückstiefe</span><div><input type="number" min="3" max="200" step="0.5" value={newProjectDepth} onChange={event => setNewProjectDepth(Number(event.target.value))} /><em>m</em></div></label>
            </div>
            <div className="newProjectPresets" aria-label="Grundstücksvorlagen">
              <button type="button" onClick={() => { setNewProjectWidth(15); setNewProjectDepth(10); }}>15 × 10 m</button>
              <button type="button" onClick={() => { setNewProjectWidth(20); setNewProjectDepth(15); }}>20 × 15 m</button>
              <button type="button" onClick={() => { setNewProjectWidth(30); setNewProjectDepth(20); }}>30 × 20 m</button>
            </div>
            <div className="newProjectOptions">
              <label><input type="checkbox" checked={createProperty} onChange={event => setCreateProperty(event.target.checked)} /><span><strong>Grundstück anlegen</strong><small>Erzeugt eine editierbare Fläche auf dem Gelände-Layer.</small></span></label>
              <label><input type="checkbox" checked={terrainEnabled} onChange={event => setTerrainEnabled(event.target.checked)} /><span><strong>3D-Gelände aktivieren</strong><small>Passt das Geländeraster an die eingegebenen Maße an.</small></span></label>
            </div>
            <div className="newProjectSummary"><strong>{Math.max(3, newProjectWidth || 0)} × {Math.max(3, newProjectDepth || 0)} m</strong><span>{Math.round(Math.max(3, newProjectWidth || 0) * Math.max(3, newProjectDepth || 0))} m² Zeichenfläche</span></div>
            <div className="newProjectActions"><button type="button" onClick={() => setNewProjectOpen(false)}>Abbrechen</button><button type="submit">＋ Projekt erstellen</button></div>
            <small className="newProjectNote">Das bisherige Projekt bleibt unmittelbar über „Rückgängig“ erreichbar und kann vorher zusätzlich als .algreen gespeichert werden.</small>
          </form>
        </div>
      )}
      <header className="topbar">
        <BrandLogo />
        <div className="topbarMain">
          <div className="topActions" aria-label="CAD-Werkzeuge">
            {tools.map(tool => (
              <button
                key={tool.id}
                type="button"
                title={tool.label}
                className={activeTool === tool.id ? "active" : ""}
                onClick={() => setTool(tool.id)}
              >
                <span className="toolIcon">{tool.icon}</span>
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
          <div className="cadControlRow">
            <button type="button" disabled={!canUndo} onClick={undo} title="Strg/Cmd + Z">↶ Rückgängig</button>
            <button type="button" disabled={!canRedo} onClick={redo} title="Strg/Cmd + Umschalt + Z">↷ Wiederholen</button>
            <button type="button" className={gridVisible ? "toggleOn" : ""} onClick={toggleGrid}>Raster</button>
            <button type="button" className={snapEnabled ? "toggleOn" : ""} onClick={toggleSnap}>Objektfang</button>
            <button type="button" className={orthogonalMode ? "toggleOn" : ""} onClick={toggleOrthogonalMode}>ORTHO</button>
            <button type="button" className={showDimensions ? "toggleOn" : ""} onClick={toggleDimensions}>Maße</button>
            <label className="layerSelect">
              <span>Aktiver Layer</span>
              <select value={activeLayerId} onChange={event => setActiveLayerId(event.target.value)}>
                {layers.filter(layer => layer.id === activeLayerId || (!layer.locked && layer.visible)).map(layer => <option key={layer.id} value={layer.id}>{layer.name}</option>)}
              </select>
            </label>
            <div className="versionIndicator" title={STUDIO_BUILD_LABEL}>V3.1 Professional CAD · {STUDIO_PACKAGE_VERSION}</div>
            <div className="fileActions">
              <button type="button" className="newProjectAction" onClick={() => setNewProjectOpen(true)}>＋ Neues Projekt</button>
              <button type="button" onClick={() => fileInput.current?.click()}>Projekt öffnen</button>
              <button type="button" onClick={exportProject}>.algreen speichern</button>
              <button type="button" onClick={exportPdfPlan}>PDF exportieren</button>
              <button type="button" className="dangerAction" onClick={startBlankProject}>Zeichnung leeren</button>
              <input ref={fileInput} type="file" accept=".algreen,.json,application/json" onChange={importProject} hidden />
              <small>{fileMessage}</small>
            </div>
          </div>
        </div>
        <div className="viewSwitch">
          {(["2d", "3d", "front", "side", "split"] as const).map(mode => (
            <button key={mode} type="button" className={viewMode === mode ? "active" : ""} onClick={() => setViewMode(mode)}>
              {mode === "split" ? "2D + 3D" : mode === "front" ? "Front" : mode === "side" ? "Seite" : mode.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <section className="studioGrid">
        <div className="leftColumn">
          <FoundationPanel />
          <MediaImportPanel />
          <ProfessionalCadPanel />
          <ArchitectureOpeningsPanel />
          <LayerDimensionPanel />
          <AdvancedModifyPanel />
          <DetailToolsPanel />
          <LibraryPanel />
          <TerrainPanel />
          <PlantIntelligencePanel />
          <RenderSettingsPanel />
          <GardenDesignerPanel />
          <GardenAI />
        </div>
        <div className={`workspace view-${viewMode}`}>
          {(viewMode === "2d" || viewMode === "split") && <CadCanvas key={`cad-${projectId}`} />}
          {(viewMode === "3d" || viewMode === "split") && <ThreeViewport key={`three-${projectId}`} />}
          {viewMode === "front" && <ElevationViewport direction="front" />}
          {viewMode === "side" && <ElevationViewport direction="side" />}
        </div>
        <BimInspector />
      </section>
    </main>
  );
}
