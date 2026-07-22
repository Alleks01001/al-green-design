"use client";

import { useEffect, useMemo, useState } from "react";
import { getStudioPlugins, validatePluginGraph } from "@/core/platform/pluginRegistry";
import { createRecoverySnapshot, deleteRecoverySnapshot, readRecoverySnapshots, type RecoverySnapshot } from "@/core/platform/recovery";
import { studioEventBus } from "@/core/platform/eventBus";
import { useProjectStore } from "@/stores/projectStore";
import { STUDIO_PACKAGE_VERSION, STUDIO_SCHEMA_VERSION } from "@/core/platform/version";

export function FoundationPanel() {
  const { id, entities, layers, history, exportProjectFile, importProjectFile } = useProjectStore();
  const [open, setOpen] = useState(true);
  const [snapshots, setSnapshots] = useState<RecoverySnapshot[]>([]);
  const plugins = useMemo(() => getStudioPlugins(), []);
  const graphErrors = useMemo(() => validatePluginGraph(), []);

  useEffect(() => {
    setSnapshots(readRecoverySnapshots());
    studioEventBus.emit("studio:ready", { version: STUDIO_SCHEMA_VERSION, timestamp: Date.now() });
  }, []);

  function createSnapshot() {
    const next = createRecoverySnapshot(exportProjectFile(), `Sicherung – ${entities.length} Objekte`);
    setSnapshots(next);
    studioEventBus.emit("project:snapshot-created", { projectId: id, snapshotId: next[0].id, timestamp: Date.now() });
  }

  function restoreSnapshot(snapshot: RecoverySnapshot) {
    if (!window.confirm(`Sicherung „${snapshot.label}“ wiederherstellen?`)) return;
    importProjectFile(snapshot.file);
    studioEventBus.emit("project:restored", { projectId: id, snapshotId: snapshot.id, timestamp: Date.now() });
  }

  return (
    <section className="panel foundationPanel">
      <button type="button" className="panelHeaderButton" onClick={() => setOpen(value => !value)} aria-expanded={open}>
        <span><span className="eyebrow">V3.1 Professional CAD · {STUDIO_PACKAGE_VERSION}</span><strong>System & Wiederherstellung</strong></span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="foundationBody">
          <div className="foundationStats">
            <span><strong>{entities.length}</strong> Objekte</span>
            <span><strong>{layers.length}</strong> Layer</span>
            <span><strong>{history.length}</strong> Änderungen</span>
          </div>

          <div className="foundationSection">
            <div className="sectionTitle"><strong>Module</strong><small>{plugins.filter(plugin => plugin.status === "active").length} aktiv</small></div>
            <div className="moduleGrid">
              {plugins.map(plugin => (
                <div className={`moduleCard status-${plugin.status}`} key={plugin.id} title={plugin.capabilities.join(", ")}>
                  <span>{plugin.name}</span><small>{plugin.status === "active" ? "Aktiv" : plugin.status === "foundation" ? "Basis" : "Geplant"}</small>
                </div>
              ))}
            </div>
            {graphErrors.length > 0 && <p className="systemWarning">{graphErrors.join(" · ")}</p>}
          </div>

          <div className="foundationSection">
            <div className="sectionTitle"><strong>Sicherungspunkte</strong><button type="button" onClick={createSnapshot}>Jetzt sichern</button></div>
            {snapshots.length === 0 ? <p className="emptyState">Noch kein manueller Sicherungspunkt.</p> : (
              <div className="snapshotList">
                {snapshots.map(snapshot => (
                  <div className="snapshotRow" key={snapshot.id}>
                    <button type="button" className="snapshotRestore" onClick={() => restoreSnapshot(snapshot)}>
                      <span>{snapshot.label}</span><small>{new Date(snapshot.createdAt).toLocaleString("de-AT")}</small>
                    </button>
                    <button type="button" className="iconButton" title="Sicherung löschen" onClick={() => setSnapshots(deleteRecoverySnapshot(snapshot.id))}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
