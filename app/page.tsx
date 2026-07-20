import LandscapePlatform from '@/components/LandscapePlatform';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.36 SMART DRAW TOOLBAR</p>
        <h1>Landscape Architecture – ADVANCED STUDIO – Gelände, Architektur, Pflanzen, Wasser, Licht, KI</h1>
        <div>
          Planungsstudio mit lernfähiger Garden Intelligence und direkter Werkzeugleiste für Auswahl, Bewegung, Füllfarben, Formen, Linienzüge und dynamische Objektverbindungen.
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
