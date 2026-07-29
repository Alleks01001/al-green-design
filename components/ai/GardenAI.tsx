"use client";

import { useState } from "react";
import { entitiesFromGardenLayout, interpretGardenCommand, type GardenRemoteLayout } from "@/engines/ai/localGardenAI";
import { useProjectStore } from "@/stores/projectStore";

const examples = ["Moderner Garten mit Pool, Pergola und 5 Bäumen", "Terrasse 5 × 3 m mit Weg", "Naturnaher Garten für Bienen", "Mauer 7 m und Sichtschutz"];

export function GardenAI() {
  const store = useProjectStore();
  const [command, setCommand] = useState("Erstelle eine Rasenfläche 8 x 5 Meter");
  const [message, setMessage] = useState("Garden-KI bereit. Jede Generierung erzeugt bearbeitbare CAD-Objekte.");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"bereit" | "online" | "lokal" | "fehler">("bereit");

  function applyResult(result: ReturnType<typeof interpretGardenCommand>, source: "online" | "lokal", note?: string) {
    store.setEntities(result.entities, `Garden-KI (${source}) hat ${result.createdIds.length} Objekte erzeugt`);
    store.setSelectedIds(result.createdIds);
    if (result.terrainPreset) store.applyTerrainPreset(result.terrainPreset);
    store.setViewMode("split");
    setMode(source);
    setMessage(`${result.message}${note ? ` ${note}` : ""} Die neuen Elemente sind ausgewählt und können sofort bearbeitet werden.`);
  }

  async function execute() {
    const prompt = command.trim();
    if (!prompt) {
      setMode("fehler");
      setMessage("Bitte beschreibe zuerst, was im Garten erzeugt werden soll.");
      return;
    }
    setBusy(true);
    setMode("bereit");
    setMessage("Entwurf wird ausgewertet und in CAD-Objekte übersetzt …");
    try {
      const response = await fetch("/api/garden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json() as { ok?: boolean; layout?: GardenRemoteLayout; error?: string; details?: unknown };
      if (response.ok && data.ok && data.layout) {
        const online = entitiesFromGardenLayout(data.layout, store);
        if (online.createdIds.length > 0) {
          applyResult(online, "online");
          return;
        }
      }
      const local = interpretGardenCommand(prompt, store);
      const offlineReason = data.error?.includes("OPENAI_API_KEY")
        ? "Online-KI ist noch nicht verbunden; der zuverlässige lokale Generator wurde verwendet."
        : "Die Online-Antwort war nicht verwendbar; der lokale Generator wurde automatisch verwendet.";
      applyResult(local, "lokal", offlineReason);
    } catch {
      try {
        const local = interpretGardenCommand(prompt, store);
        applyResult(local, "lokal", "Die Online-Verbindung war nicht erreichbar; lokal wurde trotzdem generiert.");
      } catch (error) {
        setMode("fehler");
        setMessage(error instanceof Error ? `Generierung fehlgeschlagen: ${error.message}` : "Generierung fehlgeschlagen. Bitte erneut versuchen.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="aiPanel">
      <div className="panelHeading">
        <div><span className="eyebrow">Intelligence · Alpha 7</span><h3>Garden-KI</h3></div>
        <span className="aiStatus">{mode}</span>
      </div>
      <textarea value={command} onChange={event => setCommand(event.target.value)} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void execute(); }} aria-label="Garden-KI-Befehl" placeholder="Zum Beispiel: Moderner Garten mit Pool, Pergola, Weg und fünf Bäumen …" />
      <button type="button" onClick={() => void execute()} disabled={busy}>{busy ? "KI generiert CAD-Objekte …" : "Jetzt generieren & in den Plan einsetzen"}</button>
      <div className="aiExamples">
        {examples.map(example => <button type="button" key={example} onClick={() => setCommand(example)}>{example}</button>)}
      </div>
      <div className="aiGenerationMeta"><span>{mode === "online" ? "OpenAI + CAD" : mode === "lokal" ? "Lokaler CAD-Fallback" : mode === "fehler" ? "Eingabe prüfen" : "Automatischer Modus"}</span><small>Strg/Cmd + Enter</small></div>
      <p className={mode === "fehler" ? "aiMessageError" : mode === "online" || mode === "lokal" ? "aiMessageSuccess" : ""} role="status" aria-live="polite">{message}</p>
    </section>
  );
}
