export type ProjectPersistencePhase = "loading" | "saved" | "error";

export type ProjectPersistenceState = {
  phase: ProjectPersistencePhase;
  lastSavedAt: string | null;
  error: string | null;
};

type StorageWriter = {
  setItem: (key: string, value: string) => void;
};

export const LOCAL_SAVE_ERROR_MESSAGE = "Lokales Speichern fehlgeschlagen. Bitte das Projekt jetzt als .algreen-Datei exportieren.";

export const INITIAL_PROJECT_PERSISTENCE: ProjectPersistenceState = {
  phase: "loading",
  lastSavedAt: null,
  error: null
};

export function persistProjectLocally(
  storage: StorageWriter,
  storageKey: string,
  file: unknown,
  savedAt: string,
  previous: ProjectPersistenceState
): ProjectPersistenceState {
  try {
    storage.setItem(storageKey, JSON.stringify(file));
    return {
      phase: "saved",
      lastSavedAt: savedAt,
      error: null
    };
  } catch {
    return {
      phase: "error",
      lastSavedAt: previous.lastSavedAt,
      error: LOCAL_SAVE_ERROR_MESSAGE
    };
  }
}
