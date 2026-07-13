import LandscapePlatform from '@/components/LandscapePlatform';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p>AL Green Design · Entwicklungsstand V0.13 IMAGE AI</p>
        <h1>Landscape Architecture AI Platform</h1>
        <div>
          MVP mit KI-Chat, Bild-Upload, Grundstücks-/Geländeanalyse aus Bildern,
          2D-Planeditor, 3D-Viewer, Pflanzdatenbank, Kostenrechner, Projektverwaltung,
          Rollen, Memory und SaaS-Roadmap.
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
