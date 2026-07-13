import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AL Green Design – V0.13.1 Soft Terrain',
  description: 'Landschaftsarchitektur mit weichem 3D-Gelände, Bildanalyse, KI-Chat und Terrain-Bearbeitung.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
