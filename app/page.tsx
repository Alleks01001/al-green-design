import LandscapePlatform from '@/components/LandscapePlatform';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.20 NATIVE LIDAR</p>
        <h1>Landscape Architecture – ADVANCED STUDIO – Gelände, Architektur, Pflanzen, Wasser, Licht, KI</h1>
        <div>
          Planungsstudio mit detaillierteren Architektur-Bauteilen, Split-View 2D/3D, weichem Gelände, KI-Planung und Mobile-Scan-/LiDAR-Grundlage.
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
