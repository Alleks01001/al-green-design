import type { ProjectFile } from "@/types/domain";

const RECOVERY_KEY = "al-green-design-studio-3-recovery";
const MAX_SNAPSHOTS = 8;

export type RecoverySnapshot = {
  id: string;
  label: string;
  createdAt: string;
  file: ProjectFile;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readRecoverySnapshots(): RecoverySnapshot[] {
  if (!isBrowser()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECOVERY_KEY) ?? "[]") as RecoverySnapshot[];
    return Array.isArray(parsed) ? parsed.filter(item => item?.id && item?.file?.project) : [];
  } catch {
    return [];
  }
}

export function createRecoverySnapshot(file: ProjectFile, label = "Manueller Sicherungspunkt"): RecoverySnapshot[] {
  const snapshot: RecoverySnapshot = {
    id: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    createdAt: new Date().toISOString(),
    file
  };
  const next = [snapshot, ...readRecoverySnapshots()].slice(0, MAX_SNAPSHOTS);
  if (isBrowser()) window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(next));
  return next;
}

export function deleteRecoverySnapshot(id: string): RecoverySnapshot[] {
  const next = readRecoverySnapshots().filter(snapshot => snapshot.id !== id);
  if (isBrowser()) window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(next));
  return next;
}
