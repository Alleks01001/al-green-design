export type LiDARBridgeStatus = {
  available: boolean;
  platform: 'ios-native' | 'android-native' | 'web-fallback';
  message: string;
};

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        ALGreenLiDAR?: {
          postMessage: (payload: unknown) => void;
        };
      };
    };
    ALGreenAndroidLiDAR?: {
      startScan?: (payload: string) => void;
      stopScan?: () => void;
    };
  }
}

export function detectLiDARBridge(): LiDARBridgeStatus {
  if (typeof window === 'undefined') {
    return { available: false, platform: 'web-fallback', message: 'Server-Kontext' };
  }

  if (window.webkit?.messageHandlers?.ALGreenLiDAR) {
    return {
      available: true,
      platform: 'ios-native',
      message: 'Native iOS-LiDAR-Bridge erkannt.'
    };
  }

  if (window.ALGreenAndroidLiDAR?.startScan) {
    return {
      available: true,
      platform: 'android-native',
      message: 'Native Android-Depth/LiDAR-Bridge erkannt.'
    };
  }

  return {
    available: false,
    platform: 'web-fallback',
    message: 'Keine native LiDAR-Bridge erkannt. Kamera-/Datei-Fallback ist verfügbar.'
  };
}

export function startNativeLiDARScan(projectId: string) {
  const payload = {
    action: 'start',
    projectId,
    requestedOutputs: ['mesh', 'pointCloud', 'depth', 'cameraFrames']
  };

  if (typeof window === 'undefined') return false;

  if (window.webkit?.messageHandlers?.ALGreenLiDAR) {
    window.webkit.messageHandlers.ALGreenLiDAR.postMessage(payload);
    return true;
  }

  if (window.ALGreenAndroidLiDAR?.startScan) {
    window.ALGreenAndroidLiDAR.startScan(JSON.stringify(payload));
    return true;
  }

  return false;
}
