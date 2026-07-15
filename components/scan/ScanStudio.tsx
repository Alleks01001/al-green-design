'use client';

import { useEffect, useRef, useState } from 'react';
import { detectLiDARBridge, startNativeLiDARScan } from '@/lib/mobile/lidarBridge';

export default function ScanStudio() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [status, setStatus] = useState('Scan-Modul bereit.');
  const [bridge, setBridge] = useState(() => ({
    available: false,
    platform: 'web-fallback' as const,
    message: 'Prüfe Gerät...'
  }));
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    setBridge(detectLiDARBridge());
  }, []);

  async function startCamera() {
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
      setStatus('Kamera aktiv. Diese Browseransicht dient als visueller Fallback.');
    } catch (error) {
      setStatus(`Kamera konnte nicht gestartet werden: ${String(error)}`);
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setStatus('Kamera beendet.');
  }

  function startLiDAR() {
    const ok = startNativeLiDARScan('current-project');
    setStatus(
      ok
        ? 'Native Scan-Anforderung gesendet. Die App-Bridge kann jetzt Mesh, Punktwolke und Tiefendaten erfassen.'
        : 'Keine native LiDAR-Bridge vorhanden. Nutze Kamera oder importiere eine Scan-Datei.'
    );
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
        <p>AL Green Design · V0.18</p>
        <h1>Mobile Scan / LiDAR Studio</h1>
        <p>Bestandsaufnahme vorbereiten, Kamera nutzen oder native LiDAR-/Depth-Daten über eine App-Bridge übernehmen.</p>
      </section>

      <section className="scanGrid">
        <aside className="panel">
          <h2>Gerätestatus</h2>
          <div className="item">
            <strong>{bridge.available ? 'Native Bridge verfügbar' : 'Web-Fallback'}</strong>
            <span>{bridge.message}</span>
          </div>

          <h2 style={{ marginTop: 16 }}>Aktionen</h2>
          <div className="grid2">
            <button className="btn primary" onClick={startLiDAR}>LiDAR/Depth Scan starten</button>
            <button className="btn" onClick={cameraActive ? stopCamera : startCamera}>
              {cameraActive ? 'Kamera stoppen' : 'Kamera öffnen'}
            </button>
          </div>

          <label className="file" style={{ marginTop: 12 }}>
            Scan-Dateien importieren
            <input
              type="file"
              multiple
              accept=".ply,.obj,.glb,.gltf,.usdz,.json,.zip,image/*"
              onChange={event => onFiles(event.target.files)}
            />
          </label>

          <div className="hint" style={{ marginTop: 12 }}>
            Unterstützte Import-Grundlage: PLY, OBJ, GLB, GLTF, USDZ, JSON, ZIP und Bilder.
            Die native Bridge ist für spätere iOS-/Android-Scans vorgesehen.
          </div>
        </aside>

        <section className="scanViewer">
          <video ref={videoRef} className="scanVideo" playsInline muted />
          {!cameraActive && <div className="scanPlaceholder">Kamera- oder Scan-Vorschau</div>}
        </section>

        <aside className="panel">
          <h2>Scan-Status</h2>
          <div className="hint">{status}</div>

          <h2 style={{ marginTop: 16 }}>Ausgewählte Dateien</h2>
          <div className="list">
            {files.length === 0 && <div className="item"><span>Noch keine Scan-Datei ausgewählt.</span></div>}
            {files.map(file => <div className="item" key={file}><span>{file}</span></div>)}
          </div>

          <h2 style={{ marginTop: 16 }}>Zielverarbeitung</h2>
          <div className="list">
            {[
              'Punktwolke',
              'Oberflächen-Mesh',
              'Geländehöhen',
              'Gebäudekanten',
              'Mauern / Wege',
              'Import in 2D/3D-Projekt'
            ].map(item => <div className="item" key={item}><strong>{item}</strong></div>)}
          </div>
        </aside>
      </section>
    </main>
  );
}
