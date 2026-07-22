"use client";

import { useState } from "react";
import { interpretGardenCommand } from "@/engines/ai/localGardenAI";
import { useProjectStore } from "@/stores/projectStore";

const examples = ["Terrasse 5 x 3 m", "8 Hortensien", "Mauer 7 m", "Gartenweg 9 m"];

export function GardenAI() {
  const store = useProjectStore();
  const [command, setCommand] = useState("Erstelle eine Rasenfläche 8 x 5 Meter");
  const [message, setMessage] = useState("Lokale Garden-KI 2.1 bereit.");

  function execute() {
    const result = interpretGardenCommand(command, store);
    store.setEntities(result.entities, "Garden-KI-Befehl ausgeführt");
    setMessage(result.message);
  }

  return (
    <section className="aiPanel">
      <div className="panelHeading">
        <div><span className="eyebrow">Intelligence</span><h3>Garden-KI</h3></div>
        <span className="aiStatus">lokal</span>
      </div>
      <textarea value={command} onChange={event => setCommand(event.target.value)} aria-label="Garden-KI-Befehl" />
      <button type="button" onClick={execute}>Befehl als CAD-Objekte ausführen</button>
      <div className="aiExamples">
        {examples.map(example => <button type="button" key={example} onClick={() => setCommand(example)}>{example}</button>)}
      </div>
      <p>{message}</p>
    </section>
  );
}
