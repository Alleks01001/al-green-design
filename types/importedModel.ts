export type ImportedReliefModel = {
  id: string;
  name: string;
  source: 'video-frame' | 'image';
  imageDataUrl: string;
  aspect: number;
  depthStrength: number;
  width: number;
  height: number;
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  opacity: number;
  visible: boolean;
  createdAt: string;
};

export const IMPORTED_MODEL_STORAGE_KEY = 'al-green-v0192-imported-models';
