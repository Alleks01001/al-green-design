'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { IMPORTED_MODEL_STORAGE_KEY, ImportedReliefModel } from '@/types/importedModel';

type FrameItem = { time: number; dataUrl: string };
type Stage = 'idle' | 'video-ready' | 'extracting' | 'frames-ready' | 'preview-ready' | 'prepared';

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeBaseName(name: string) {
  const base = name.replace(/\.[^.]+$/, '').trim() || 'video-model';
  return base.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '-').replace(/-+/g, '-');
}

export default function VideoTo3DStudio() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const rendererCleanup = useRef<(() => void) | null>(null);
  const previewMeshRef = useRef<THREE.Mesh | null>(null);
  const previewSceneRef = useRef<THREE.Scene | null>(null);

  const [videoUrl, setVideoUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [frameTarget, setFrameTarget] = useState(12);
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [depthStrength, setDepthStrength] = useState(1.6);
  const [modelWidth, setModelWidth] = useState(8);
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
    previewMeshRef.current = null;
    previewSceneRef.current = null;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setFileName(file.name);
    setFrames([]);
    setStage('video-ready');
    setStatus('Video geladen. Metadaten werden gelesen.');
  }

  function waitForEvent(
    target: HTMLMediaElement,
    eventName: string,
    timeoutMs = 8000
  ) {
    return new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error(`${eventName} timeout`));
      }, timeoutMs);

      const done = () => {
        cleanup();
        resolve();
      };

      const fail = () => {
        cleanup();
        reject(new Error(target.error?.message || `Medienfehler bei ${eventName}`));
      };

      const cleanup = () => {
        window.clearTimeout(timer);
        target.removeEventListener(eventName, done);
        target.removeEventListener('error', fail);
      };

      target.addEventListener(eventName, done, { once: true });
      target.addEventListener('error', fail, { once: true });
    });
  }

  async function waitForVideoReady(video: HTMLVideoElement) {
    if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) {
      if (video.readyState >= 2) return;
    }

    if (video.readyState < 1) {
      await waitForEvent(video, 'loadedmetadata', 10000);
    }

    if (video.readyState < 2) {
      try {
        await waitForEvent(video, 'loadeddata', 10000);
      } catch {
        if (video.readyState < 1) throw new Error('Videodaten konnten nicht geladen werden.');
      }
    }

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error('Ungültige oder nicht lesbare Videolänge.');
    }
  }

  async function waitForPresentedFrame(video: HTMLVideoElement, timeoutMs = 2500) {
    const maybeVideo = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
    };

    if (typeof maybeVideo.requestVideoFrameCallback === 'function') {
      await new Promise<void>((resolve) => {
        let finished = false;
        const timer = window.setTimeout(() => {
          if (!finished) {
            finished = true;
            resolve();
          }
        }, timeoutMs);

        maybeVideo.requestVideoFrameCallback?.(() => {
          if (!finished) {
            finished = true;
            window.clearTimeout(timer);
            resolve();
          }
        });
      });
      return;
    }

    await new Promise<void>(resolve => window.setTimeout(resolve, 140));
  }

  async function seekRobust(video: HTMLVideoElement, time: number, attempt = 1) {
    const safeTime = Math.max(0.05, Math.min(time, Math.max(0.05, video.duration - 0.08)));

    if (Math.abs(video.currentTime - safeTime) < 0.015) {
      await waitForPresentedFrame(video);
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => {
          cleanup();
          reject(new Error(`Seek timeout bei ${safeTime.toFixed(2)} s`));
        }, 6000);

        const done = () => {
          cleanup();
          resolve();
        };

        const fail = () => {
          cleanup();
          reject(new Error(video.error?.message || 'Seek fehlgeschlagen'));
        };

        const cleanup = () => {
          window.clearTimeout(timer);
          video.removeEventListener('seeked', done);
          video.removeEventListener('error', fail);
        };

        video.addEventListener('seeked', done, { once: true });
        video.addEventListener('error', fail, { once: true });
        video.currentTime = safeTime;
      });

      await waitForPresentedFrame(video);
    } catch (error) {
      if (attempt < 3) {
        await new Promise<void>(resolve => window.setTimeout(resolve, 180 * attempt));
        return seekRobust(video, safeTime + attempt * 0.025, attempt + 1);
      }
      throw error;
    }
  }

  async function createExtractionVideo() {
    if (!videoUrl) throw new Error('Kein Video geladen.');

    const extractionVideo = document.createElement('video');
    extractionVideo.src = videoUrl;
    extractionVideo.preload = 'auto';
    extractionVideo.muted = true;
    extractionVideo.playsInline = true;
    extractionVideo.setAttribute('playsinline', '');
    extractionVideo.setAttribute('webkit-playsinline', '');
    extractionVideo.style.position = 'fixed';
    extractionVideo.style.left = '-10000px';
    extractionVideo.style.top = '0';
    extractionVideo.style.width = '2px';
    extractionVideo.style.height = '2px';
    extractionVideo.style.opacity = '0';
    extractionVideo.style.pointerEvents = 'none';

    document.body.appendChild(extractionVideo);
    extractionVideo.load();

    await waitForVideoReady(extractionVideo);
    extractionVideo.pause();

    return extractionVideo;
  }

  async function extractFrames() {
    if (!videoUrl) {
      setStatus('Bitte zuerst ein Video auswählen.');
      return;
    }

    setStage('extracting');
    setFrames([]);
    setJobInfo('');
    setStatus('Video wird für die Frame-Extraktion vorbereitet.');

    let extractionVideo: HTMLVideoElement | null = null;

    try {
      extractionVideo = await createExtractionVideo();

      const duration = extractionVideo.duration;
      const sourceWidth = extractionVideo.videoWidth;
      const sourceHeight = extractionVideo.videoHeight;

      if (!sourceWidth || !sourceHeight) {
        throw new Error('Die Videoauflösung konnte nicht gelesen werden.');
      }

      const maxWidth = 720;
      const ratio = Math.min(1, maxWidth / sourceWidth);

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(2, Math.round(sourceWidth * ratio));
      canvas.height = Math.max(2, Math.round(sourceHeight * ratio));

      const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
      if (!ctx) throw new Error('Canvas konnte nicht erstellt werden.');

      const count = Math.max(6, Math.min(24, frameTarget));
      const start = Math.max(0.08, duration * 0.04);
      const end = Math.max(start + 0.1, duration * 0.96);
      const output: FrameItem[] = [];
      const failed: string[] = [];

      for (let i = 0; i < count; i++) {
        const progress = count === 1 ? 0.5 : i / (count - 1);
        const t = start + (end - start) * progress;
        setStatus(`Frame ${i + 1}/${count} wird gelesen · ${t.toFixed(1)} s`);

        try {
          await seekRobust(extractionVideo, t);

          if (extractionVideo.readyState < 2) {
            await new Promise<void>(resolve => window.setTimeout(resolve, 180));
          }

          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(extractionVideo, 0, 0, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          if (!dataUrl || dataUrl.length < 1000) throw new Error('Leerer Frame');

          output.push({ time: extractionVideo.currentTime, dataUrl });
          await new Promise<void>(resolve => window.setTimeout(resolve, 50));
        } catch (error) {
          failed.push(`${i + 1}: ${String(error)}`);
        }
      }

      if (!output.length) {
        throw new Error(failed.length ? `Kein Frame konnte gelesen werden. ${failed[0]}` : 'Kein Frame konnte gelesen werden.');
      }

      setFrames(output);
      setSelectedFrame(Math.floor(output.length / 2));
      setStage('frames-ready');

      if (failed.length) {
        setStatus(`${output.length} von ${count} Frames erfolgreich. ${failed.length} Frame(s) wurden übersprungen. Du kannst trotzdem fortfahren.`);
      } else {
        setStatus(`${output.length} Frames erfolgreich extrahiert. Frame auswählen und 3D-Modell erzeugen.`);
      }
    } catch (error) {
      setStage('video-ready');
      setStatus(`Frame-Extraktion fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (extractionVideo) {
        extractionVideo.pause();
        extractionVideo.removeAttribute('src');
        extractionVideo.load();
        extractionVideo.remove();
      }
    }
  }

  function buildQuick3D() {
    const mount = previewRef.current;
    const frame = frames[selectedFrame];
    if (!mount || !frame) return;

    rendererCleanup.current?.();
    previewMeshRef.current = null;
    previewSceneRef.current = null;
    mount.innerHTML = '';
    setStatus('3D-Reliefmodell wird aufgebaut.');

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

      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(mount.clientWidth || 800, mount.clientHeight || 560);
      mount.appendChild(renderer.domElement);

      const heightMeters = modelWidth * h / w;
      const geometry = new THREE.PlaneGeometry(modelWidth, heightMeters, w - 1, h - 1);
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
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.88,
        metalness: 0,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = safeBaseName(fileName || 'video-model');
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.05;
      scene.add(mesh);
      previewMeshRef.current = mesh;
      previewSceneRef.current = scene;

      scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 1.5));
      const sun = new THREE.DirectionalLight(0xffffff, 1.4);
      sun.position.set(4, 7, 6);
      scene.add(sun);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(0, 0.4, 0);

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
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      };

      setStage('preview-ready');
      setStatus('3D-Modell erstellt. Du kannst es jetzt direkt ins Projekt übernehmen oder als GLB/OBJ exportieren.');
    };
    img.src = frame.dataUrl;
  }

  function exportGLB() {
    const mesh = previewMeshRef.current;
    if (!mesh) {
      setStatus('Bitte zuerst die 3D-Vorschau erzeugen.');
      return;
    }

    const exportRoot = new THREE.Group();
    exportRoot.name = 'ALGreenVideoModel';
    exportRoot.add(mesh.clone());

    const exporter = new GLTFExporter();
    exporter.parse(
      exportRoot,
      result => {
        if (result instanceof ArrayBuffer) {
          downloadBlob(new Blob([result], { type: 'model/gltf-binary' }), `${safeBaseName(fileName)}-algreen.glb`);
          setStatus('GLB-Datei exportiert.');
        } else {
          downloadBlob(new Blob([JSON.stringify(result)], { type: 'model/gltf+json' }), `${safeBaseName(fileName)}-algreen.gltf`);
          setStatus('GLTF-Datei exportiert.');
        }
      },
      error => setStatus(`GLB-Export fehlgeschlagen: ${String(error)}`),
      { binary: true }
    );
  }

  function exportOBJ() {
    const mesh = previewMeshRef.current;
    if (!mesh) {
      setStatus('Bitte zuerst die 3D-Vorschau erzeugen.');
      return;
    }

    const exportRoot = new THREE.Group();
    exportRoot.name = 'ALGreenVideoModel';
    exportRoot.add(mesh.clone());
    const exporter = new OBJExporter();
    const objText = exporter.parse(exportRoot);
    downloadBlob(new Blob([objText], { type: 'text/plain' }), `${safeBaseName(fileName)}-algreen.obj`);
    setStatus('OBJ-Datei exportiert. Hinweis: OBJ enthält die Geometrie; die direkte Projektübernahme behält die Fototextur.');
  }

  function takeIntoProject() {
    const frame = frames[selectedFrame];
    if (!frame || stage !== 'preview-ready') {
      setStatus('Bitte zuerst eine 3D-Vorschau erzeugen.');
      return;
    }

    const img = new Image();
    img.onload = () => {
      const model: ImportedReliefModel = {
        id: `video-model-${Date.now()}`,
        name: `${safeBaseName(fileName)} · Frame ${selectedFrame + 1}`,
        source: 'video-frame',
        imageDataUrl: frame.dataUrl,
        aspect: img.width / Math.max(1, img.height),
        depthStrength,
        width: modelWidth,
        height: modelWidth / Math.max(0.1, img.width / img.height),
        x: 0,
        y: 0,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scale: 1,
        opacity: 1,
        visible: true,
        createdAt: new Date().toISOString()
      };

      let existing: ImportedReliefModel[] = [];
      try {
        existing = JSON.parse(localStorage.getItem(IMPORTED_MODEL_STORAGE_KEY) || '[]');
        if (!Array.isArray(existing)) existing = [];
      } catch {
        existing = [];
      }

      localStorage.setItem(IMPORTED_MODEL_STORAGE_KEY, JSON.stringify([...existing, model]));
      localStorage.setItem('al-green-v0192-open-imported-model', model.id);
      setStatus('3D-Modell wurde in dein AL-Green-Projekt übernommen. Hauptprojekt wird geöffnet.');
      window.setTimeout(() => {
        window.location.href = '/?imported3d=1';
      }, 300);
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
      setStatus('Präzisions-Pipeline vorbereitet. Für die echte dichte Rekonstruktion wird weiterhin ein separater 3D-Worker benötigt.');
    } else {
      setStatus(`Fehler: ${data?.error || 'Unbekannt'}`);
    }
  }

  return (
    <main className="video3dPage">
      <section className="video3dHero">
        <p>AL Green Design · V0.19.2.1</p>
        <h1>VIDEO → 3D → PROJEKT</h1>
        <p>Video laden, Frames extrahieren, 3D-Modell erzeugen, als GLB/OBJ exportieren oder direkt in dein Hauptprojekt übernehmen.</p>
      </section>

      <section className="video3dLayout">
        <aside className="panel">
          <h2>1. Video</h2>
          <label className="file">Video auswählen<input type="file" accept="video/*" onChange={e => onVideo(e.target.files?.[0] ?? null)} /></label>
          <label style={{ marginTop: 10 }}>Anzahl Frames<input type="number" min="6" max="24" value={frameTarget} onChange={e => setFrameTarget(Number(e.target.value))} /></label>
          <button className="btn primary" style={{ width: '100%', marginTop: 10 }} disabled={!videoUrl || stage === 'extracting'} onClick={extractFrames}>{stage === 'extracting' ? 'Frames werden erzeugt …' : frames.length ? 'Frames neu extrahieren' : 'Frames extrahieren'}</button>
          <div className="hint" style={{ marginTop: 8 }}>Für iPhone/Safari werden die Frames jetzt mit einem separaten Extraktions-Video erzeugt. Das sichtbare Video kann währenddessen angehalten oder an einer anderen Position stehen.</div>

          <h2 style={{ marginTop: 18 }}>2. 3D erzeugen</h2>
          <label>Modellbreite in Metern<input type="number" min="0.5" max="100" step="0.1" value={modelWidth} onChange={e => setModelWidth(Math.max(0.5, Number(e.target.value) || 8))} /></label>
          <label>Tiefenstärke<input type="range" min="0.1" max="5" step="0.1" value={depthStrength} onChange={e => setDepthStrength(Number(e.target.value))} /><span>{depthStrength.toFixed(1)}</span></label>
          <button className="btn blue" style={{ width: '100%', marginTop: 10 }} disabled={!frames.length} onClick={buildQuick3D}>3D-Modell erzeugen</button>

          <h2 style={{ marginTop: 18 }}>3. Verwenden</h2>
          <button className="btn primary" style={{ width: '100%' }} disabled={stage !== 'preview-ready'} onClick={takeIntoProject}>In Projekt übernehmen</button>
          <div className="grid2" style={{ marginTop: 8 }}>
            <button className="btn" disabled={stage !== 'preview-ready'} onClick={exportGLB}>GLB exportieren</button>
            <button className="btn" disabled={stage !== 'preview-ready'} onClick={exportOBJ}>OBJ exportieren</button>
          </div>

          <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={!frames.length} onClick={preparePrecisionJob}>Präzise Rekonstruktion vorbereiten</button>

          <div className="hint" style={{ marginTop: 12 }}>{status}</div>
          {jobInfo && <div className="item" style={{ marginTop: 10 }}><strong>Rekonstruktionsauftrag</strong><span>{jobInfo}</span></div>}
        </aside>

        <section className="video3dMain">
          <div className="video3dVideoWrap">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                onLoadedMetadata={e => setStatus(`Video bereit: ${e.currentTarget.duration.toFixed(1)} Sekunden.`)}
              />
            ) : <div className="scanPlaceholder">Noch kein Video geladen</div>}
          </div>
          <div ref={previewRef} className="video3dPreview"><div className="scanPlaceholder">3D-Vorschau</div></div>
        </section>

        <aside className="panel">
          <h2>Extrahierte Frames</h2>
          <div className="frameGrid">
            {frames.map((frame, index) => (
              <button
                key={`${frame.time}-${index}`}
                className={`frameButton ${selectedFrame === index ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFrame(index);
                  setStage('frames-ready');
                  previewMeshRef.current = null;
                  setStatus(`Frame ${index + 1} gewählt. 3D-Modell erneut erzeugen.`);
                }}
              >
                <img src={frame.dataUrl} alt={`Frame ${index + 1}`} />
                <span>{frame.time.toFixed(1)} s</span>
              </button>
            ))}
          </div>
          {!frames.length && <div className="hint">Nach der Extraktion erscheinen hier die Videoframes.</div>}
        </aside>
      </section>
    </main>
  );
}
