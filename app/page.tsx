import LandscapePlatform from '@/components/LandscapePlatform';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.12</p>
        <h1>Landscape Architecture Platform Pro</h1>
        <div>
          Pro-Plattform aus CAD, GIS, BIM, KI-Design, Pflanzendatenbank, Geländemodellierung, KI-Design, Pflanzen-Pro-Datenbank und Kostenrechner,
          Kostenkalkulation, Bewässerungsplanung, Öko-Analyse und Projektmanagement.
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
