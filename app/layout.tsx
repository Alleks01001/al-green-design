import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AL Green Design – Landscape Architecture V0.11.2',
  description: 'Landschaftsarchitektur-Plattform mit 3D und Geländemodellierung mit CAD, GIS, BIM, Pflanzen, Gelände, Kosten, Bewässerung und Projektmanagement.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
