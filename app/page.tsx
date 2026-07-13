import LandscapePlatform from '@/components/LandscapePlatform';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.11</p>
        <h1>Landscape Architecture Platform</h1>
        <div>
          Kombination aus CAD, GIS, BIM, Pflanzendatenbank, Geländemodellierung,
          Kostenkalkulation, Bewässerungsplanung, Öko-Analyse und Projektmanagement.
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
