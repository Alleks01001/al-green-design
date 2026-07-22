"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { renderPdfPlan } from "@/lib/pdf/pdfPlanImport";
import { useProjectStore } from "@/stores/projectStore";

export function MediaImportPanel() {
  const store = useProjectStore();
  const imageInput = useRef<HTMLInputElement | null>(null);
  const pdfInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Bild oder PDF-Plan als Zeichenreferenz einfügen.");

  function loadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      store.updatePlanReference({
        dataUrl: String(reader.result ?? ""),
        name: file.name,
        visible: true,
        opacity: 0.45,
        width: store.planReference?.width ?? 16,
        depth: store.planReference?.depth ?? 11,
        sourceType: "image",
        sourcePage: undefined,
        sourcePageCount: undefined
      });
      store.setViewMode("2d");
      setMessage(`${file.name} liegt jetzt als zeichnbare Planreferenz unter dem CAD.`);
    };
    reader.onerror = () => setMessage("Bild konnte nicht gelesen werden.");
    reader.readAsDataURL(file);
  }

  async function loadPdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setMessage("PDF wird gerendert …");
    try {
      const rendered = await renderPdfPlan(file, 1);
      const width = store.planReference?.width ?? 16;
      const depth = Math.max(0.5, width / Math.max(rendered.aspectRatio, 0.01));
      store.updatePlanReference({
        dataUrl: rendered.dataUrl,
        name: file.name,
        visible: true,
        opacity: 0.55,
        width,
        depth,
        sourceType: "pdf",
        sourcePage: rendered.pageNumber,
        sourcePageCount: rendered.pageCount
      });
      store.setViewMode("2d");
      setMessage(`${file.name}: Seite 1 von ${rendered.pageCount} wurde als Planreferenz eingefügt.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF konnte nicht gelesen werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mediaImportPanel">
      <div className="panelHeading"><div><span className="eyebrow">Import</span><h3>Bild · PDF · Video · Scan</h3></div></div>
      <div className="mediaImportActions">
        <button type="button" className="primaryWide" disabled={busy} onClick={() => imageInput.current?.click()}>Bild oder Foto einfügen</button>
        <button type="button" className="primaryWide pdfImportButton" disabled={busy} onClick={() => pdfInput.current?.click()}>{busy ? "PDF wird geladen …" : "PDF-Plan einfügen"}</button>
      </div>
      <input ref={imageInput} hidden type="file" accept="image/*" onChange={loadImage} />
      <input ref={pdfInput} hidden type="file" accept=".pdf,application/pdf" onChange={loadPdf} />
      {store.planReference && (
        <div className="referenceControls">
          <div className="referenceMeta">
            <strong>{store.planReference.name}</strong>
            <span>{store.planReference.sourceType === "pdf" ? `PDF · Seite ${store.planReference.sourcePage ?? 1} von ${store.planReference.sourcePageCount ?? 1}` : "Bildreferenz"}</span>
          </div>
          <label><span>Deckkraft</span><input type="range" min="0.05" max="1" step="0.05" value={store.planReference.opacity} onChange={e => store.updatePlanReference({opacity:Number(e.target.value)})}/></label>
          <label><span>Breite m</span><input type="number" min="0.1" step="0.1" value={store.planReference.width} onChange={e => store.updatePlanReference({width:Math.max(0.1, Number(e.target.value))})}/></label>
          <label><span>Tiefe m</span><input type="number" min="0.1" step="0.1" value={store.planReference.depth} onChange={e => store.updatePlanReference({depth:Math.max(0.1, Number(e.target.value))})}/></label>
          <div className="referenceButtons"><button type="button" onClick={() => store.updatePlanReference({visible:!store.planReference?.visible})}>{store.planReference.visible ? "Referenz ausblenden" : "Referenz einblenden"}</button><button type="button" onClick={() => store.updatePlanReference(null)}>Entfernen</button></div>
        </div>
      )}
      <div className="moduleLinks"><Link href="/video-to-3d">Video → 3D öffnen</Link><Link href="/scan">Scan/LiDAR öffnen</Link></div>
      <p>{message}</p>
    </section>
  );
}
