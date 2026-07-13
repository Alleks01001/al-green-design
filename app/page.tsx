import LandscapePlatform from '@/components/LandscapePlatform';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.14 MAX</p>
        <h1>Landscape Architecture – MAX – Architektur, 2D/3D, KI</h1>
        <div>
          Weiches 3D-Gelände mit verschiebbaren Gebäuden und Objekten, Pflanzen, Pergola, Mauer, Pool, Treppe, Belägen und Pflanzzonen. Dazu ein KI-Chat mit lokalem Fallback und vorbereitetem OpenAI-Backend.
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
