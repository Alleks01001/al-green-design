import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AL Green Design – V0.13.3 Architecture Garden',
  description: 'Komplette Gartenplanung mit Soft Terrain, verschiebbaren Gebäuden in 2D/3D und OpenAI-vorbereitetem Chat.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
