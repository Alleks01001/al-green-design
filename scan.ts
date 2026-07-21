export type ScanSource = 'camera' | 'lidar' | 'depth' | 'file';

export type ScanSession = {
  id: string;
  source: ScanSource;
  createdAt: string;
  device?: string;
  files: string[];
  notes?: string;
};

export type NativeLiDARMessage =
  | { type: 'scan-started'; sessionId: string }
  | { type: 'scan-progress'; sessionId: string; progress: number }
  | { type: 'scan-completed'; sessionId: string; fileUrl?: string }
  | { type: 'scan-error'; message: string };
