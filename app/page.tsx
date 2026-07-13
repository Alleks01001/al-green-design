import LandscapePlatform from '@/components/LandscapePlatform';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.13.4 MOVE 3D OPENAI</p>
        <h1>Landscape Architecture – Move 3D + OpenAI</h1>
        <div>
          Weiches 3D-Gelände mit verschiebbaren Gebäuden und Objekten, Pflanzen, Pergola, Mauer, Pool, Treppe, Belägen und Pflanzzonen. Dazu ein OpenAI-vorbereiteter Chat für Entwurfsideen.
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
