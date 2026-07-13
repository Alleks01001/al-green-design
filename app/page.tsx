import GardenStudio from '@/components/GardenStudio';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.9 CAD</p>
        <h1>Garden Studio 3D</h1>
        <div>
          CAD-Ausbaustufe mit PDF-Maßstab, 2D/3D, Wänden, Türen/Fenstern,
          Vorschaubild-Speicher und DXF-Export.
        </div>
      </section>
      <GardenStudio />
    </main>
  );
}
