"use client";

import { useMemo, useState } from "react";
import { createGardenConcepts, type DesignPriority, type GardenDesignBrief, type GardenStyle } from "@/engines/ai/gardenDesigner";
import { useProjectStore } from "@/stores/projectStore";

export function GardenDesignerPanel() {
  const store = useProjectStore();
  const [prompt, setPrompt] = useState("Moderner Garten mit Sitzplatz, blühenden Pflanzen und einem gut begehbaren Weg");
  const [style, setStyle] = useState<GardenStyle>("modern");
  const [priority, setPriority] = useState<DesignPriority>("relaxation");
  const [budget, setBudget] = useState<GardenDesignBrief["budget"]>("balanced");
  const [sunny, setSunny] = useState(true);
  const [generatedAt, setGeneratedAt] = useState(0);
  const [activeId, setActiveId] = useState("concept-1");
  const [message, setMessage] = useState("Beschreibe deinen Wunschgarten und erzeuge drei echte CAD-Varianten.");

  const concepts = useMemo(() => createGardenConcepts(store, { prompt, style, priority, budget, sunny }), [store.entities, store.layers, prompt, style, priority, budget, sunny, generatedAt]);
  const active = concepts.find(concept => concept.id === activeId) ?? concepts[0];

  function generate() {
    setGeneratedAt(Date.now());
    setActiveId("concept-1");
    const first = concepts[0];
    const base = store.entities.filter(item => item.metadata?.generatedBy !== "Garden Designer 2.6");
    store.setEntities([...base, ...first.entities], `AI-Entwurf „${first.title}“ sofort erzeugt`);
    store.setSelectedIds(first.entities.map(entity => entity.id));
    store.setViewMode("split");
    setMessage(`${first.title} wurde sofort mit ${first.entities.length} bearbeitbaren CAD-Objekten in den Plan eingesetzt. Du kannst darunter eine andere Variante wählen.`);
  }

  function applyConcept(replacePrevious: boolean) {
    const base = replacePrevious
      ? store.entities.filter(item => item.metadata?.generatedBy !== "Garden Designer 2.6")
      : store.entities;
    store.setEntities([...base, ...active.entities], `AI-Entwurf „${active.title}“ übernommen`);
    setMessage(`${active.title} wurde mit ${active.entities.length} bearbeitbaren CAD-Objekten übernommen.`);
  }

  return (
    <section className="gardenDesignerPanel">
      <div className="panelHeading">
        <div><span className="eyebrow">Studio Alpha 6</span><h3>AI Garden Designer</h3></div>
        <span className="aiStatus">lokal</span>
      </div>
      <textarea value={prompt} onChange={event => setPrompt(event.target.value)} aria-label="Entwurfsbeschreibung" />
      <div className="designerGrid">
        <label><span>Stil</span><select value={style} onChange={event => setStyle(event.target.value as GardenStyle)}><option value="modern">Modern</option><option value="natural">Naturnah</option><option value="family">Familiengarten</option><option value="low-maintenance">Pflegeleicht</option></select></label>
        <label><span>Schwerpunkt</span><select value={priority} onChange={event => setPriority(event.target.value as DesignPriority)}><option value="relaxation">Erholung</option><option value="biodiversity">Biodiversität</option><option value="entertaining">Gäste</option><option value="play">Spiel</option></select></label>
        <label><span>Budget</span><select value={budget} onChange={event => setBudget(event.target.value as GardenDesignBrief["budget"])}><option value="compact">Kompakt</option><option value="balanced">Ausgewogen</option><option value="premium">Premium</option></select></label>
        <label className="designerCheck"><input type="checkbox" checked={sunny} onChange={event => setSunny(event.target.checked)} /> sonniger Standort</label>
      </div>
      <button type="button" className="designerGenerate" onClick={generate}>3 Varianten erzeugen · erste sofort einsetzen</button>
      <div className="conceptTabs">
        {concepts.map(concept => <button type="button" key={concept.id} className={active.id === concept.id ? "active" : ""} onClick={() => setActiveId(concept.id)}>{concept.title}<small>{concept.score}/100</small></button>)}
      </div>
      <div className="conceptSummary">
        <strong>{active.title}</strong><p>{active.description}</p>
        <div className="conceptMetrics"><span>{active.estimatedArea} m² geplant</span><span>ca. {active.estimatedBudget.toLocaleString("de-AT")} €</span><span>{active.entities.length} Objekte</span></div>
        <ul>{active.highlights.map(item => <li key={item}>{item}</li>)}</ul>
      </div>
      <div className="designerActions"><button type="button" onClick={() => applyConcept(true)}>Vorherigen AI-Entwurf ersetzen</button><button type="button" onClick={() => applyConcept(false)}>Zum Plan hinzufügen</button></div>
      <p className="designerMessage">{message}</p>
    </section>
  );
}
