"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { CadCanvas } from "@/components/cad/CadCanvas";
import { DetailToolsPanel } from "@/components/cad/DetailToolsPanel";
import { ThreeViewport } from "@/components/render/ThreeViewport";
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
  { id: "wall", label: "Mauer", icon: "▥" },
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
    showDimensions,
    toggleGrid,
    toggleSnap,
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
    clearProject,
    selectedIds,
    setSelectedIds,
    id: projectId,
    name: projectName
  } = store;
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [fileMessage, setFileMessage] = useState("Automatisch lokal gespeichert");

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
    try {
      if (viewMode === "3d") setViewMode("2d");
      if (selectedIds.length > 0) setSelectedIds([]);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await exportCadPlanToPdf(projectName);
      setFileMessage("PDF-Plan exportiert");
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : "PDF-Export fehlgeschlagen");
    } finally {
      if (previousSelection.length > 0) setSelectedIds(previousSelection);
      if (previousView === "3d") setViewMode(previousView);
    }
  }

  function startBlankProject() {
    const confirmed = window.confirm("Wirklich alles löschen und mit einem leeren Projekt neu beginnen? Die Aktion kann unmittelbar über Rückgängig wiederhergestellt werden.");
    if (!confirmed) return;
    clearProject();
    setFileMessage("Leeres Projekt erstellt – Rückgängig ist möglich");
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
            <button type="button" className={showDimensions ? "toggleOn" : ""} onClick={toggleDimensions}>Maße</button>
            <label className="layerSelect">
              <span>Aktiver Layer</span>
              <select value={activeLayerId} onChange={event => setActiveLayerId(event.target.value)}>
                {layers.filter(layer => !layer.locked).map(layer => <option key={layer.id} value={layer.id}>{layer.name}</option>)}
              </select>
            </label>
            <div className="versionIndicator" title={STUDIO_BUILD_LABEL}>V3.0 Alpha · {STUDIO_PACKAGE_VERSION} · PDF PLAN</div>
            <div className="fileActions">
              <button type="button" onClick={() => fileInput.current?.click()}>Projekt öffnen</button>
              <button type="button" onClick={exportProject}>.algreen speichern</button>
              <button type="button" onClick={exportPdfPlan}>PDF exportieren</button>
              <button type="button" className="dangerAction" onClick={startBlankProject}>Alles löschen</button>
              <input ref={fileInput} type="file" accept=".algreen,.json,application/json" onChange={importProject} hidden />
              <small>{fileMessage}</small>
            </div>
          </div>
        </div>
        <div className="viewSwitch">
          {(["2d", "3d", "split"] as const).map(mode => (
            <button key={mode} type="button" className={viewMode === mode ? "active" : ""} onClick={() => setViewMode(mode)}>
              {mode === "split" ? "2D + 3D" : mode.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <section className="studioGrid">
        <div className="leftColumn">
          <FoundationPanel />
          <MediaImportPanel />
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
        </div>
        <BimInspector />
      </section>
    </main>
  );
}
