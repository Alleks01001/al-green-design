import LandscapePlatform from '@/components/LandscapePlatform';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.12.2 FIX</p>
        <h1>Landscape Architecture Platform</h1>
        <div>
          Bereinigte Plattform mit CAD, GIS, BIM, Pflanzen-Pro-Datenbank, Gelände,
          3D-Ansicht, KI-Design und eigenständigem Garten-Chat, Kosten, Bewässerung, Regenwasser und Projektmodulen.
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
