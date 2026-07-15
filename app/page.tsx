import LandscapePlatform from '@/components/LandscapePlatform';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.17 ADVANCED STUDIO</p>
        <h1>Landscape Architecture – ADVANCED STUDIO – Gelände, Architektur, Pflanzen, Wasser, Licht, KI</h1>
        <div>
          Erweitertes Planungsstudio mit weichem 3D-Gelände, Architektur, Wegen, Zäunen, Licht, Wasser, Pflanzen, Kosten, Klimasimulation, Berichten und KI-Unterstützung.
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
