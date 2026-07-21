'use client';

import { useEffect, useRef, useState } from 'react';
import { detectLiDARBridge, startNativeLiDARScan, type LiDARBridgeStatus } from '@/lib/mobile/lidarBridge';

type NativeResult = {
  type?: string;
  sessionId?: string;
  progress?: number;
  fileUrl?: string;
  message?: string;
};

export default function ScanStudio() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [status, setStatus] = useState('Scan-Modul bereit.');
  const [progress, setProgress] = useState(0);
  const [bridge, setBridge] = useState<LiDARBridgeStatus>(() => ({
    available: false,
    platform: 'web-fallback',
    message: 'Prüfe Gerät...'
  }));
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    setBridge(detectLiDARBridge());

    window.ALGreenNativeScanResult = (payload: unknown) => {
      const result = payload as NativeResult;

      if (result?.type === 'scan-progress') {
        setProgress(Math.max(0, Math.min(100, Number(result.progress || 0))));
        setStatus(`LiDAR-Scan läuft: ${Math.round(Number(result.progress || 0))}%`);
      }

      if (result?.type === 'scan-completed') {
        setProgress(100);
        setStatus(`LiDAR-Scan abgeschlossen${result.fileUrl ? ` · ${result.fileUrl}` : ''}`);
      }

      if (result?.type === 'scan-error') {
        setStatus(`LiDAR-Fehler: ${result.message || 'Unbekannter Fehler'}`);
      }
    };

    return () => {
      delete window.ALGreenNativeScanResult;
    };
  }, []);

  async function startCameraFallback() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setStatus('Kamera-Fallback aktiv. Achtung: Das ist kein LiDAR-Scan.');
    } catch (error) {
      setStatus(`Kamera konnte nicht gestartet werden: ${String(error)}`);
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setStatus('Kamera-Fallback beendet.');
  }

  function startLiDAR() {
    if (!bridge.available) {
      setStatus('Echter LiDAR-Scan nicht verfügbar: Es wurde keine native iOS-/Android-Bridge erkannt.');
      return;
    }

    const ok = startNativeLiDARScan('current-project');

    if (ok) {
      setProgress(0);
      setStatus('Native LiDAR-/Depth-Scan-Anforderung gesendet.');
    } else {
      setStatus('Native Bridge wurde erkannt, Scan konnte aber nicht gestartet werden.');
    }
  }

  function onFiles(selected: FileList | null) {
    if (!selected) return;
    const names = Array.from(selected).map(file => `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    setFiles(names);
    setStatus(`${names.length} Scan-Datei(en) ausgewählt.`);
  }

  return (
    <main className="scanPage">
      <section className="scanHero">
        <p>AL Green Design · V0.39 WEB SCAN BRIDGE</p>
        <h1>Scan- und Import-Studio</h1>
        <p>Webbasierter Scan- und Dateiimport mit optionaler nativer Geräte-Bridge. Es ist kein Apple-/iOS-Projekt enthalten.</p>
      </section>

      <section className="scanGrid">
        <aside className="panel">
          <h2>Gerätestatus</h2>

          <div className="item">
            <strong>{bridge.available ? 'Native Scan-Bridge verfügbar' : 'Kein nativer LiDAR-Zugriff'}</strong>
            <span>{bridge.message}</span>
          </div>

          <h2 style={{ marginTop: 16 }}>Scan-Modi</h2>

          <button
            className="btn primary"
            style={{ width: '100%', marginBottom: 8 }}
            onClick={startLiDAR}
            disabled={!bridge.available}
          >
            Echter LiDAR-/Depth-Scan
          </button>

          <button
            className="btn"
            style={{ width: '100%', marginBottom: 8 }}
            onClick={cameraActive ? stopCamera : startCameraFallback}
          >
            {cameraActive ? 'Kamera-Fallback stoppen' : 'Kamera-Fallback öffnen'}
          </button>

          <label className="file">
            Scan-Dateien importieren
            <input
              type="file"
              multiple
              accept=".ply,.obj,.glb,.gltf,.usdz,.json,.zip,image/*"
              onChange={event => onFiles(event.target.files)}
            />
          </label>

          <div className="hint" style={{ marginTop: 12 }}>
            Die normale Browser-Kamera liefert kein vollständiges LiDAR-Mesh. Für echten Scan muss die Web-App in einer nativen iOS-/Android-Hülle mit Bridge laufen.
          </div>
        </aside>

        <section className="scanViewer">
          <video ref={videoRef} className="scanVideo" playsInline muted />
          {!cameraActive && (
            <div className="scanPlaceholder">
              {bridge.available ? 'Native LiDAR-/Depth-Scan bereit' : 'Kamera-/Datei-Fallback'}
            </div>
          )}

          {progress > 0 && (
            <div className="scanProgress">
              <div className="scanProgressBar" style={{ width: `${progress}%` }} />
              <span>{Math.round(progress)}%</span>
            </div>
          )}
        </section>

        <aside className="panel">
          <h2>Status</h2>
          <div className="hint">{status}</div>

          <h2 style={{ marginTop: 16 }}>Ausgewählte Dateien</h2>
          <div className="list">
            {files.length === 0 && <div className="item"><span>Noch keine Scan-Datei ausgewählt.</span></div>}
            {files.map(file => <div className="item" key={file}><span>{file}</span></div>)}
          </div>

          <h2 style={{ marginTop: 16 }}>Native Zielausgabe</h2>
          <div className="list">
            {[
              'ARKit Scene Mesh',
              'Punktwolke / Vertices',
              'Tiefendaten',
              'Kamera-Frames',
              'Geländemodell',
              'Import in 2D/3D'
            ].map(item => <div className="item" key={item}><strong>{item}</strong></div>)}
          </div>
        </aside>
      </section>
    </main>
  );
}
