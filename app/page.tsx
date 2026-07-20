import LandscapePlatform from '@/components/LandscapePlatform';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.37 EXTENDED STUDIO</p>
        <h1>Landscape Architecture – ADVANCED STUDIO – Gelände, Architektur, Pflanzen, Wasser, Licht, KI</h1>
        <div>
          Planungsstudio mit lernfähiger Garden Intelligence und um rund 30 % ausgebauter CAD-Werkzeugleiste: zusätzliche Formen, getrennte Maße, Linienarten, Pfeile, rechtwinklige und gebogene Verbindungen, Stilübertragung, Sperren, Ebenenreihenfolge und präzise Mehrfachbearbeitung.
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
