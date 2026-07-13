import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AL Green Design – Garden Studio 3D V0.9',
  description: 'Garden Studio V0.9 mit CAD-Funktionen, PDF-Maßstab, 3D, Wänden, Bauteilen und DXF.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
