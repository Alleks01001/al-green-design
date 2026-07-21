
"use client";

import { useState } from "react";
import { interpretGardenCommand } from "@/engines/ai/localGardenAI";
import { useProjectStore } from "@/stores/projectStore";

export function GardenAI() {
  const store = useProjectStore();
  const [command, setCommand] = useState("Erstelle eine Rasenfläche 8 x 5 Meter");
  const [message, setMessage] = useState("Lokale Garden-KI bereit.");

  function execute() {
    const result = interpretGardenCommand(command, store);
    store.setEntities(result.entities);
    setMessage(result.message);
  }

  return (
    <section className="aiPanel">
      <div>
        <strong>Garden-KI</strong>
        <span>lokal · direkt · kontrolliert</span>
      </div>
      <textarea value={command} onChange={event => setCommand(event.target.value)} />
      <button type="button" onClick={execute}>Befehl ausführen</button>
      <p>{message}</p>
    </section>
  );
}
