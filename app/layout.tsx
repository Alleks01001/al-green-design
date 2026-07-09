import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AL Green Design – Garden Studio 3D V0.8.1',
  description: 'Garden Studio V0.8.1 mit 2D, 3D sowie erweiterten Upload- und Download-Formaten.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
