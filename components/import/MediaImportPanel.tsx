"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { useProjectStore } from "@/stores/projectStore";

export function MediaImportPanel() {
  const store = useProjectStore();
  const input = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("Foto, Plan, Video oder Scan importieren.");

  function loadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      store.updatePlanReference({
        dataUrl: String(reader.result ?? ""), name: file.name, visible: true, opacity: 0.45,
        width: store.planReference?.width ?? 16, depth: store.planReference?.depth ?? 11
      });
      store.setViewMode("2d");
      setMessage(`${file.name} liegt jetzt als zeichnbare Planreferenz unter dem CAD.`);
    };
    reader.onerror = () => setMessage("Bild konnte nicht gelesen werden.");
    reader.readAsDataURL(file);
  }

  return (
    <section className="mediaImportPanel">
      <div className="panelHeading"><div><span className="eyebrow">Import</span><h3>Bild · Video · Scan</h3></div></div>
      <button type="button" className="primaryWide" onClick={() => input.current?.click()}>Bild oder Plan einfügen</button>
      <input ref={input} hidden type="file" accept="image/*" onChange={loadImage} />
      {store.planReference && (
        <div className="referenceControls">
          <label><span>Deckkraft</span><input type="range" min="0.05" max="1" step="0.05" value={store.planReference.opacity} onChange={e => store.updatePlanReference({opacity:Number(e.target.value)})}/></label>
          <label><span>Breite m</span><input type="number" min="1" value={store.planReference.width} onChange={e => store.updatePlanReference({width:Number(e.target.value)})}/></label>
          <label><span>Tiefe m</span><input type="number" min="1" value={store.planReference.depth} onChange={e => store.updatePlanReference({depth:Number(e.target.value)})}/></label>
          <div className="referenceButtons"><button type="button" onClick={() => store.updatePlanReference({visible:!store.planReference?.visible})}>{store.planReference.visible ? "Bild ausblenden" : "Bild einblenden"}</button><button type="button" onClick={() => store.updatePlanReference(null)}>Entfernen</button></div>
        </div>
      )}
      <div className="moduleLinks"><Link href="/video-to-3d">Video → 3D öffnen</Link><Link href="/scan">Scan/LiDAR öffnen</Link></div>
      <p>{message}</p>
    </section>
  );
}
