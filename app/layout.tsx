import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AL Green Design – V0.19.2 NATIVE LIDAR',
  description: 'Erweitertes Garten- und Landschaftsplanungsstudio mit Projektverwaltung, Layern, Soft Terrain, verschiebbaren Gebäuden/Zonen, Kosten, Analysen und OpenAI-JSON-Schema.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
