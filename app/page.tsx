import LandscapePlatform from '@/components/LandscapePlatform';
import BrandLogo3D from '@/components/BrandLogo3D';

export default function Home() {
  return (
    <main className="premiumAppShell">
      <section className="premiumHero3D">
        <div className="premiumHeroCopy">
          <div className="premiumHeroBrand">
            <BrandLogo3D />
            <div>
              <p>AL Green Design · V0.39 DETAILED SCENE & LAYER STUDIO</p>
              <strong>Landscape Architecture Studio</strong>
            </div>
          </div>
          <h1>Planen, gestalten und präsentieren – in einer räumlichen Premium-Arbeitsumgebung.</h1>
          <div className="premiumHeroText">
            Burgunderrot, Roségold und echte Tiefenwirkung verbinden die erweiterte CAD-Werkzeugleiste, 2D-/3D-Planung, Gelände, Architektur, Pflanzen, Wasser und die Adaptive Garden Intelligence zu einem einheitlichen Studio.
          </div>
          <div className="premiumHeroFeatures" aria-label="Schwerpunkte">
            <span>3D Markenlogo</span>
            <span>Premium Werkzeugleiste</span>
            <span>2D / 3D Split Studio</span>
            <span>Präsentationsmodus</span>
          </div>
        </div>
        <div className="premiumHeroVisual">
          <img src="/brand/al-green-design-3d-studio.webp" alt="3D Designkonzept von AL Green Design" />
          <div className="premiumHeroVisualGlass">
            <BrandLogo3D compact={true} animated={false} />
            <div><strong>V0.39</strong><span>Detailed Scene System</span></div>
          </div>
        </div>
      </section>
      <LandscapePlatform />
    </main>
  );
}
