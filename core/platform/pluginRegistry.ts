export type StudioModuleStatus = "active" | "foundation" | "planned";

export type StudioPlugin = {
  id: string;
  name: string;
  version: string;
  status: StudioModuleStatus;
  capabilities: string[];
  dependencies?: string[];
};

const plugins: StudioPlugin[] = [
  { id: "cad", name: "Professional CAD Core", version: "3.1-alpha.8", status: "active", capabilities: ["detail-tools", "draw", "new-project-assistant", "property-boundary", "object-snap", "intersection-snap", "ortho", "precision-transform", "groups", "blocks", "layers", "elevation-levels", "object-z-offset", "front-view", "side-view", "hosted-doors", "hosted-windows", "wall-openings", "wall-follow-connections", "associative-dimensions", "offset", "mirror", "rectangular-array", "polar-array", "trim-extend", "align", "dynamic-connectors", "material-aware-2d-symbols", "undo-redo"] },
  { id: "bim", name: "Landscape BIM", version: "2.2", status: "active", capabilities: ["properties", "quantities", "costs", "carbon"] },
  { id: "terrain", name: "Terrain Engine", version: "2.3", status: "active", capabilities: ["terrain-grid", "contours", "cut-fill"] },
  { id: "plants", name: "Plant Intelligence", version: "3.1-alpha.8", status: "active", capabilities: ["suitability", "bloom-calendar", "growth", "botanical-3d-forms"] },
  { id: "render", name: "Render Engine", version: "3.1-alpha.8", status: "active", capabilities: ["presets", "lighting", "png-export", "interactive-3d-selection", "shift-multiselect", "pbr-material-preview", "persistent-camera", "elevation-aware-placement", "orthographic-elevations", "wall-cut-rendering", "architectural-opening-models"] },
  { id: "ai-designer", name: "AI Garden Designer", version: "3.1-alpha.8", status: "active", capabilities: ["free-text-cad-generation", "online-openai", "reliable-local-fallback", "instant-first-variant", "variants", "budget", "editable-output"] },
  { id: "object-library", name: "Professional Library", version: "3.1-alpha.8", status: "active", capabilities: ["objects", "real-plant-taxa", "construction-assemblies", "architectural-openings", "soils", "technical-materials", "professional-filters", "standalone-library", "persistent-placement", "2d-3d-visualization", "bim-placement"] },
  { id: "media-import", name: "Media & Reality Capture", version: "3.1-alpha.8", status: "active", capabilities: ["image-reference", "pdf-plan-import", "video-to-3d", "scan-lidar"] },
  { id: "documentation", name: "Documentation", version: "3.1-alpha.8", status: "foundation", capabilities: ["pdf-plan-export", "printable-layers", "plan-layout", "reports", "revision-data"] },
  { id: "collaboration", name: "Collaboration", version: "3.1-alpha.8", status: "planned", capabilities: ["comments", "tasks", "versioning"] },
  { id: "exchange", name: "Professional Import/Export", version: "3.1-alpha.8", status: "foundation", capabilities: ["algreen", "pdf", "png", "csv"] }
];

export function getStudioPlugins(): StudioPlugin[] {
  return plugins.map(plugin => ({ ...plugin, capabilities: [...plugin.capabilities], dependencies: plugin.dependencies ? [...plugin.dependencies] : undefined }));
}

export function getStudioPlugin(id: string): StudioPlugin | undefined {
  return getStudioPlugins().find(plugin => plugin.id === id);
}

export function validatePluginGraph(): string[] {
  const ids = new Set(plugins.map(plugin => plugin.id));
  return plugins.flatMap(plugin => (plugin.dependencies ?? [])
    .filter(dependency => !ids.has(dependency))
    .map(dependency => `${plugin.id}: fehlende Abhängigkeit ${dependency}`));
}
