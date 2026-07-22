export type StudioEventMap = {
  "project:changed": { projectId: string; reason: string; timestamp: number };
  "project:snapshot-created": { projectId: string; snapshotId: string; timestamp: number };
  "project:restored": { projectId: string; snapshotId: string; timestamp: number };
  "plugin:registered": { pluginId: string; timestamp: number };
  "studio:ready": { version: string; timestamp: number };
};

type Listener<T> = (payload: T) => void;

class StudioEventBus {
  private listeners = new Map<keyof StudioEventMap, Set<Listener<never>>>();

  on<K extends keyof StudioEventMap>(event: K, listener: Listener<StudioEventMap[K]>): () => void {
    const listeners = this.listeners.get(event) ?? new Set<Listener<never>>();
    listeners.add(listener as Listener<never>);
    this.listeners.set(event, listeners);
    return () => listeners.delete(listener as Listener<never>);
  }

  emit<K extends keyof StudioEventMap>(event: K, payload: StudioEventMap[K]): void {
    this.listeners.get(event)?.forEach(listener => listener(payload as never));
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const studioEventBus = new StudioEventBus();
