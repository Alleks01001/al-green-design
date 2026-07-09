import GardenStudio from '@/components/GardenStudio';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.8</p>
        <h1>Garden Studio 3D</h1>
        <div>
          2D-Draufsicht und 3D-Ansicht mit erweiterten Datei-Formaten für
          Upload und Download inklusive PDF.
        </div>
      </section>
      <GardenStudio />
    </main>
  );
}
