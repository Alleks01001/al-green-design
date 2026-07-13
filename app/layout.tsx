import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AL Green Design – Landscape Architecture V0.12.1',
  description: 'Bereinigte Prototyp-Plattform für Landschaftsarchitektur mit 2D, 3D, Pflanzen, Gelände, Kosten und KI-Design.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
