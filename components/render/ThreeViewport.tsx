"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MATERIAL_CATALOG } from "@/data/materials/catalog";
import { useProjectStore } from "@/stores/projectStore";
import { elevationAt } from "@/engines/terrain/terrainEngine";
import { definitionForEntity, growthFactor } from "@/engines/plants/plantIntelligence";
import type { CadEntity, Vec2 } from "@/types/domain";

function materialColor(entity: CadEntity) {
  const definition = MATERIAL_CATALOG.find(item => item.id === entity.materialId);
  if (definition) return definition.color;
  if (entity.kind === "building") return "#d8d1ca";
  if (entity.kind === "wall") return "#91877c";
  if (entity.kind === "water") return "#57a0be";
  if (entity.kind === "path") return "#a98d69";
  if (entity.name.toLowerCase().includes("terrasse")) return "#9d7657";
  return "#78a47b";
}

function addSegment(group: THREE.Group, entity: CadEntity, start: Vec2, end: Vec2) {
  const dx = end.x - start.x;
  const dz = end.y - start.y;
  const length = Math.hypot(dx, dz);
  if (length < 0.001) return;
  const isWall = entity.kind === "wall";
  const height = isWall ? Math.max(entity.height, 0.1) : Math.max(entity.height, 0.04);
  const width = isWall ? Math.max(entity.width, 0.05) : Math.max(entity.width, 0.12);
  const material = new THREE.MeshStandardMaterial({
    color: materialColor(entity),
    roughness: isWall ? 0.88 : 0.95,
    metalness: 0.02
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), material);
  mesh.position.set((start.x + end.x) / 2, height / 2, (start.y + end.y) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  mesh.castShadow = isWall;
  mesh.receiveShadow = true;
  group.add(mesh);
}

export function ThreeViewport() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { entities, layers, selectedIds, terrain, plantingSettings } = useProjectStore();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e9e4e2");
    scene.fog = new THREE.Fog("#e9e4e2", 28, 70);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 250);
    camera.position.set(16, 13, 17);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#fff8ef", "#5a3940", 1.7));
    const sun = new THREE.DirectionalLight("#fff0d2", 3.2);
    sun.position.set(14, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    scene.add(sun);

    const fill = new THREE.DirectionalLight("#c8d9ff", 0.75);
    fill.position.set(-10, 8, -12);
    scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);
    const layerMap = new Map(layers.map(layer => [layer.id, layer]));

    if (terrain.enabled && terrain.points.length === terrain.resolutionX * terrain.resolutionZ) {
      const geometry = new THREE.PlaneGeometry(terrain.width, terrain.depth, terrain.resolutionX - 1, terrain.resolutionZ - 1);
      geometry.rotateX(-Math.PI / 2);
      const position = geometry.getAttribute("position");
      for (let index = 0; index < position.count; index += 1) {
        const point = terrain.points[index];
        position.setY(index, (point?.elevation ?? 0) + terrain.baseElevation);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
      const terrainMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#76936f", roughness: 1, metalness: 0, side: THREE.DoubleSide }));
      terrainMesh.receiveShadow = true;
      terrainMesh.castShadow = true;
      group.add(terrainMesh);

      const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), new THREE.LineBasicMaterial({ color: "#36533b", transparent: true, opacity: 0.16 }));
      wire.position.y = 0.006;
      group.add(wire);
    }

    for (const entity of entities.filter(item => item.visible && layerMap.get(item.layerId)?.visible !== false)) {
      if (entity.kind === "annotation") continue;
      const selected = selectedIds.includes(entity.id);

      if (entity.kind === "plant") {
        const factor = growthFactor(definitionForEntity(entity), plantingSettings.growthYears);
        const renderWidth = Math.max(0.25, entity.width * factor);
        const renderHeight = Math.max(0.35, entity.height * factor);
        const trunkHeight = Math.max(0.35, renderHeight * 0.45);
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(Math.max(0.05, renderWidth * 0.07), Math.max(0.08, renderWidth * 0.1), trunkHeight, 10),
          new THREE.MeshStandardMaterial({ color: "#684333", roughness: 0.95 })
        );
        const terrainY = elevationAt(terrain, entity.position.x, entity.position.y);
        trunk.position.set(entity.position.x, terrainY + trunkHeight / 2, entity.position.y);
        trunk.castShadow = true;
        group.add(trunk);

        const crown = new THREE.Mesh(
          new THREE.IcosahedronGeometry(Math.max(0.2, renderWidth * 0.48), 2),
          new THREE.MeshStandardMaterial({ color: selected ? "#6fa65d" : "#397044", roughness: 0.97 })
        );
        crown.scale.y = Math.max(0.85, renderHeight / Math.max(renderWidth, 0.1) * 0.45);
        crown.position.set(entity.position.x, terrainY + trunkHeight + Math.max(0.2, renderHeight * 0.18), entity.position.y);
        crown.castShadow = true;
        crown.receiveShadow = true;
        group.add(crown);
        continue;
      }

      if (entity.shape === "line" || entity.shape === "polyline") {
        for (let index = 1; index < entity.points.length; index += 1) {
          addSegment(group, entity, entity.points[index - 1], entity.points[index]);
        }
        continue;
      }

      const color = selected ? "#d9a05e" : materialColor(entity);
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: entity.kind === "water" ? 0.25 : 0.84,
        metalness: 0.02,
        transparent: entity.kind === "water",
        opacity: entity.kind === "water" ? 0.78 : 1
      });
      const height = Math.max(entity.height, 0.06);
      const geometry = entity.shape === "circle"
        ? new THREE.CylinderGeometry(entity.radius ?? entity.width / 2, entity.radius ?? entity.width / 2, height, 48)
        : new THREE.BoxGeometry(entity.width, height, entity.depth);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(entity.position.x, elevationAt(terrain, entity.position.x, entity.position.y) + height / 2, entity.position.y);
      mesh.rotation.y = THREE.MathUtils.degToRad(entity.rotation);
      mesh.castShadow = entity.kind === "building" || height > 0.5;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    if (!terrain.enabled) {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 40),
        new THREE.MeshStandardMaterial({ color: "#739373", roughness: 1 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.025;
      ground.receiveShadow = true;
      scene.add(ground);
    }

    const grid = new THREE.GridHelper(40, 40, "#794556", "#9cb19a");
    grid.position.y = 0.003;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.28;
    scene.add(grid);

    let frame = 0;
    let pointerDown = false;
    let lastPointer = { x: 0, y: 0 };
    let azimuth = Math.atan2(camera.position.x, camera.position.z);
    let elevation = 0.63;
    let radius = 26;

    function updateCamera() {
      const horizontal = Math.cos(elevation) * radius;
      camera.position.set(Math.sin(azimuth) * horizontal, Math.sin(elevation) * radius, Math.cos(azimuth) * horizontal);
      camera.lookAt(0, 0.8, 0);
    }

    function pointerStart(event: PointerEvent) {
      pointerDown = true;
      lastPointer = { x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture(event.pointerId);
    }

    function pointerMove(event: PointerEvent) {
      if (!pointerDown) return;
      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;
      lastPointer = { x: event.clientX, y: event.clientY };
      azimuth -= dx * 0.006;
      elevation = Math.max(0.18, Math.min(1.35, elevation + dy * 0.005));
      updateCamera();
    }

    function pointerEnd(event: PointerEvent) {
      pointerDown = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
    }

    function wheel(event: WheelEvent) {
      event.preventDefault();
      radius = Math.max(8, Math.min(60, radius + event.deltaY * 0.018));
      updateCamera();
    }

    renderer.domElement.addEventListener("pointerdown", pointerStart);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerEnd);
    renderer.domElement.addEventListener("pointercancel", pointerEnd);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });

    const animate = () => {
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    const resize = () => {
      camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", pointerStart);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerEnd);
      renderer.domElement.removeEventListener("pointercancel", pointerEnd);
      renderer.domElement.removeEventListener("wheel", wheel);
      cancelAnimationFrame(frame);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach(materialItem => materialItem.dispose());
          else object.material.dispose();
        }
      });
      renderer.dispose();
      mount.replaceChildren();
    };
  }, [entities, layers, selectedIds, terrain, plantingSettings]);

  return (
    <section className="viewportCard threeCard">
      <div className="viewportTitle"><strong>3D ENGINE</strong><span>Ziehen: Orbit · Mausrad: Zoom</span></div>
      <div className="renderBadge">Terrain Mesh · Pflanzenwachstum · PBR</div>
      <div ref={mountRef} className="threeViewport" />
    </section>
  );
}
