import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AL Green Design – V0.37 EXTENDED STUDIO',
  description: 'Erweitertes Garten- und Landschaftsplanungsstudio mit Projektverwaltung, Layern, Soft Terrain, verschiebbaren Gebäuden/Zonen, Kosten, Analysen und lokaler lernfähiger Befehlslogik sowie erweiterter CAD-Zeichenwerkzeugleiste für zusätzliche Formen, variable Maße, Linienarten, Pfeile, dynamische Verbindungsrouten, Ebenenreihenfolge und Stilübertragung.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
