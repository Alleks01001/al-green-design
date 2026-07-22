
import { ProjectStoreProvider } from "@/stores/projectStore";
import { StudioShell } from "@/components/layout/StudioShell";

export default function HomePage() {
  return <ProjectStoreProvider><StudioShell /></ProjectStoreProvider>;
}
