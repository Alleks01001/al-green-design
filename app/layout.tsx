import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AL Green Design – Landscape Architecture V0.13 IMAGE AI',
  description: 'MVP mit KI-Chat, Bild-Upload, Geländeanalyse, 2D, 3D, Datenbanken, Kosten und SaaS-Modulen.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
