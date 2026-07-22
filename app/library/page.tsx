import { LibraryPanel, type LibraryTab } from "@/components/library/LibraryPanel";
import { ProjectStoreProvider } from "@/stores/projectStore";

const validTabs: LibraryTab[] = ["objects", "constructions", "plants", "materials"];

export default function LibraryPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const requested = searchParams?.tab;
  const initialTab = validTabs.includes(requested as LibraryTab) ? requested as LibraryTab : "plants";
  return (
    <main className="libraryPage">
      <ProjectStoreProvider>
        <LibraryPanel workspace initialTab={initialTab} />
      </ProjectStoreProvider>
    </main>
  );
}
