'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type FrameItem = { time: number; dataUrl: string };
type Stage = 'idle' | 'video-ready' | 'extracting' | 'frames-ready' | 'preview-ready' | 'prepared';

export default function VideoTo3DStudio() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const rendererCleanup = useRef<(() => void) | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [frameTarget, setFrameTarget] = useState(18);
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [depthStrength, setDepthStrength] = useState(1.6);
  const [stage, setStage] = useState<Stage>('idle');
  const [status, setStatus] = useState('Video auswählen.');
  const [jobInfo, setJobInfo] = useState('');

  useEffect(() => () => {
    rendererCleanup.current?.();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  function onVideo(file: File | null) {
    if (!file) return;
    rendererCleanup.current?.();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setFileName(file.name);
    setFrames([]);
    setStage('video-ready');
    setStatus('Video geladen. Metadaten werden gelesen.');
  }

  async function seek(video: HTMLVideoElement, time: number) {
    return new Promise<void>((resolve, reject) => {
      const done = () => { cleanup(); resolve(); };
      const fail = () => { cleanup(); reject(new Error('Frame konnte nicht gelesen werden.')); };
      const cleanup = () => {
        video.removeEventListener('seeked', done);
        video.removeEventListener('error', fail);
      };
      video.addEventListener('seeked', done, { once: true });
      video.addEventListener('error', fail, { once: true });
      video.currentTime = Math.max(0, Math.min(time, Math.max(0, video.duration - 0.05)));
    });
  }

  async function extractFrames() {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      setStatus('Video ist noch nicht bereit.');
      return;
    }
    setStage('extracting');
    setFrames([]);
    setStatus('Geeignete Frames werden extrahiert.');

    const canvas = document.createElement('canvas');
    const maxWidth = 960;
    const ratio = Math.min(1, maxWidth / Math.max(1, video.videoWidth));
    canvas.width = Math.max(2, Math.round(video.videoWidth * ratio));
    canvas.height = Math.max(2, Math.round(video.videoHeight * ratio));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const count = Math.max(6, Math.min(48, frameTarget));
    const output: FrameItem[] = [];
    for (let i = 0; i < count; i++) {
      const t = video.duration * ((i + 0.5) / count);
      await seek(video, t);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      output.push({ time: t, dataUrl: canvas.toDataURL('image/jpeg', 0.86) });
      setStatus(`Frames extrahieren: ${i + 1}/${count}`);
    }
    setFrames(output);
    setSelectedFrame(Math.floor(output.length / 2));
    setStage('frames-ready');
    setStatus(`${output.length} Frames extrahiert. Frame wählen und 3D-Vorschau erzeugen.`);
  }

  function buildQuick3D() {
    const mount = previewRef.current;
    const frame = frames[selectedFrame];
    if (!mount || !frame) return;
    rendererCleanup.current?.();
    mount.innerHTML = '';
    setStatus('Schnelle 3D-Reliefvorschau wird aufgebaut.');

    const img = new Image();
    img.onload = () => {
      const sample = document.createElement('canvas');
      const w = 96;
      const h = Math.max(48, Math.round(w * img.height / img.width));
      sample.width = w;
      sample.height = h;
      const ctx = sample.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const pixels = ctx.getImageData(0, 0, w, h).data;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xe8eef5);
      const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
      camera.position.set(0, 4.8, 8.5);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(mount.clientWidth || 800, mount.clientHeight || 560);
      mount.appendChild(renderer.domElement);

      const geometry = new THREE.PlaneGeometry(8, 8 * h / w, w - 1, h - 1);
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const xIndex = i % w;
        const yIndex = Math.floor(i / w);
        const idx = (yIndex * w + xIndex) * 4;
        const r = pixels[idx] / 255;
        const g = pixels[idx + 1] / 255;
        const b = pixels[idx + 2] / 255;
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const centerBias = 1 - Math.min(1, Math.hypot(xIndex / w - 0.5, yIndex / h - 0.5) * 1.1);
        pos.setZ(i, (1 - luminance) * depthStrength * (0.55 + centerBias * 0.45));
      }
      geometry.computeVertexNormals();

      const texture = new THREE.TextureLoader().load(frame.dataUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88, metalness: 0, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -0.18;
      scene.add(mesh);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 1.5));
      const sun = new THREE.DirectionalLight(0xffffff, 1.4);
      sun.position.set(4, 7, 6);
      scene.add(sun);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(0, 0, 0.7);
      let raf = 0;
      const animate = () => {
        controls.update();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      animate();
      const resize = () => {
        const width = mount.clientWidth || 800;
        const height = mount.clientHeight || 560;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', resize);
      resize();

      rendererCleanup.current = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        controls.dispose();
        geometry.dispose();
        material.dispose();
        texture.dispose();
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      };
      setStage('preview-ready');
      setStatus('Schnelle 3D-Reliefvorschau erstellt. Das ist eine Tiefenschätzung, noch keine präzise Mehrbild-Photogrammetrie.');
    };
    img.src = frame.dataUrl;
  }

  async function preparePrecisionJob() {
    if (!frames.length) return;
    setStatus('Präzisen Rekonstruktionsauftrag vorbereiten.');
    const response = await fetch('/api/video-to-3d/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, frameCount: frames.length })
    });
    const data = await response.json();
    if (data?.ok) {
      setStage('prepared');
      setJobInfo(`${data.job.id} · ${data.job.frameCount} Frames · ${data.job.pipeline.join(' → ')}`);
      setStatus('Präzisions-Pipeline vorbereitet. Für die echte dichte Rekonstruktion wird als nächster Schritt ein 3D-Worker angeschlossen.');
    } else {
      setStatus(`Fehler: ${data?.error || 'Unbekannt'}`);
    }
  }

  return (
    <main className="video3dPage">
      <section className="video3dHero">
        <p>AL Green Design · V0.19</p>
        <h1>VIDEO → 3D Studio</h1>
        <p>Video laden, Frames extrahieren, schnelle 3D-Tiefenvorschau erzeugen und eine präzise Mehrbild-Rekonstruktion vorbereiten.</p>
      </section>
      <section className="video3dLayout">
        <aside className="panel">
          <h2>1. Video</h2>
          <label className="file">Video auswählen<input type="file" accept="video/*" onChange={e => onVideo(e.target.files?.[0] ?? null)} /></label>
          <label style={{ marginTop: 10 }}>Anzahl Frames<input type="number" min="6" max="48" value={frameTarget} onChange={e => setFrameTarget(Number(e.target.value))} /></label>
          <button className="btn primary" style={{ width: '100%', marginTop: 10 }} disabled={!videoUrl || stage === 'extracting'} onClick={extractFrames}>Frames extrahieren</button>
          <h2 style={{ marginTop: 18 }}>2. 3D</h2>
          <label>Tiefenstärke Vorschau<input type="range" min="0.3" max="3" step="0.1" value={depthStrength} onChange={e => setDepthStrength(Number(e.target.value))} /></label>
          <button className="btn blue" style={{ width: '100%', marginTop: 10 }} disabled={!frames.length} onClick={buildQuick3D}>Schnelle 3D-Vorschau</button>
          <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={!frames.length} onClick={preparePrecisionJob}>Präzise Rekonstruktion vorbereiten</button>
          <div className="hint" style={{ marginTop: 12 }}>{status}</div>
          {jobInfo && <div className="item" style={{ marginTop: 10 }}><strong>Rekonstruktionsauftrag</strong><span>{jobInfo}</span></div>}
        </aside>
        <section className="video3dMain">
          <div className="video3dVideoWrap">
            {videoUrl ? <video ref={videoRef} src={videoUrl} controls playsInline onLoadedMetadata={e => setStatus(`Video bereit: ${e.currentTarget.duration.toFixed(1)} Sekunden.`)} /> : <div className="scanPlaceholder">Noch kein Video geladen</div>}
          </div>
          <div ref={previewRef} className="video3dPreview"><div className="scanPlaceholder">3D-Vorschau</div></div>
        </section>
        <aside className="panel">
          <h2>Extrahierte Frames</h2>
          <div className="frameGrid">
            {frames.map((frame, index) => <button key={`${frame.time}-${index}`} className={`frameButton ${selectedFrame === index ? 'active' : ''}`} onClick={() => setSelectedFrame(index)}><img src={frame.dataUrl} alt={`Frame ${index + 1}`} /><span>{frame.time.toFixed(1)} s</span></button>)}
          </div>
          {!frames.length && <div className="hint">Nach der Extraktion erscheinen hier die Videoframes.</div>}
        </aside>
      </section>
    </main>
  );
}
