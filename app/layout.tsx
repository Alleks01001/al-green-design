import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "AL Green Design Studio 2.1",
  description: "Professioneller CAD-Kern für Garten- und Landschaftsplanung"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
