import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AL Green Design – V0.36 SMART DRAW TOOLBAR',
  description: 'Erweitertes Garten- und Landschaftsplanungsstudio mit Projektverwaltung, Layern, Soft Terrain, verschiebbaren Gebäuden/Zonen, Kosten, Analysen und lokaler lernfähiger Befehlslogik sowie professioneller Zeichenwerkzeugleiste für Formen, Farben, Linien und dynamische Verbindungen.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
