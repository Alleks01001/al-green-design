import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "AL Green Design Studio 3.0 Alpha",
  description: "CAD, BIM, Terrain, Pflanzenintelligenz, Rendering und AI Garden Designer"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
