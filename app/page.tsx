import LandscapePlatform from '@/components/LandscapePlatform';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.13.1 SOFT TERRAIN</p>
        <h1>Landscape Architecture – Soft Terrain</h1>
        <div>
          Echte weiche 3D-Geländemodellierung mit Bild-Upload, KI-Bildanalyse,
          Terrain-Blobs, 2D-Editor, 3D-Viewer und nachträglicher Anpassung.
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
