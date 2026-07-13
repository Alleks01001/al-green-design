import GardenStudio from '@/components/GardenStudio';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.10</p>
        <h1>Garden Studio 3D</h1>
        <div>
          Verbesserte CAD-/SketchUp-Version mit detaillierten Objekten,
          3D-Zeichnen, bewegbaren Bodenflächen, 3D-Bild/PDF-Hintergrund
          und neuem Maßstab-Werkzeug.
        </div>
      </section>
      <GardenStudio />
    </main>
  );
}
