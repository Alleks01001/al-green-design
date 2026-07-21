import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AL Green Design – V0.38 3D BRAND & PREMIUM INTERFACE',
  description: 'Premium Garten- und Landschaftsplanungsstudio mit dreidimensionalem AL-Green-Design-Markenauftritt, plastischer CAD-Werkzeugleiste, 2D-/3D-Studio, Gelände, Architektur, Pflanzen, Wasser und Adaptive Garden Intelligence.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
