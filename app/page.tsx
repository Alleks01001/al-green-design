import GardenStudio from '@/components/GardenStudio';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.6</p>
        <h1>Garden Studio 3D</h1>
        <div>2D-Draufsicht mit Zoom, Pan, Raster, Flächen, Objekten, Eigenschaften und Export.</div>
      </section>
      <GardenStudio />
    </main>
  );
}
