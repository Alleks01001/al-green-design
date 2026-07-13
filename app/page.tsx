import LandscapePlatform from '@/components/LandscapePlatform';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.13.2 ARCHITECTURE GARDEN</p>
        <h1>Landscape Architecture – Architektur + Garten</h1>
        <div>
          Weiches 3D-Gelände mit Gebäuden, Pflanzen, Pergola, Mauer, Pool,
          Treppe, Belägen und Pflanzzonen. Damit kannst du den kompletten Garten
          in 2D zeichnen und in 3D kontrollieren.
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
