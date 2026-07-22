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
  { id: "cad", name: "Professional CAD Core", version: "3.0-alpha", status: "active", capabilities: ["draw", "snap", "select", "undo-redo"] },
  { id: "bim", name: "Landscape BIM", version: "2.2", status: "active", capabilities: ["properties", "quantities", "costs", "carbon"] },
  { id: "terrain", name: "Terrain Engine", version: "2.3", status: "active", capabilities: ["terrain-grid", "contours", "cut-fill"] },
  { id: "plants", name: "Plant Intelligence", version: "2.4", status: "active", capabilities: ["suitability", "bloom-calendar", "growth"] },
  { id: "render", name: "Render Engine", version: "2.5", status: "active", capabilities: ["presets", "lighting", "png-export"] },
  { id: "ai-designer", name: "AI Garden Designer", version: "2.6", status: "active", capabilities: ["variants", "budget", "editable-output"] },
  { id: "documentation", name: "Documentation", version: "3.0-alpha", status: "foundation", capabilities: ["plan-layout", "reports", "revision-data"] },
  { id: "collaboration", name: "Collaboration", version: "3.0-alpha", status: "planned", capabilities: ["comments", "tasks", "versioning"] },
  { id: "exchange", name: "Professional Import/Export", version: "3.0-alpha", status: "foundation", capabilities: ["algreen", "png", "csv"] }
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
