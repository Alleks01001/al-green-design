"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MATERIAL_CATALOG } from "@/data/materials/catalog";
import { useProjectStore } from "@/stores/projectStore";
import { elevationAt } from "@/engines/terrain/terrainEngine";
import { definitionForEntity, growthFactor } from "@/engines/plants/plantIntelligence";
import type { CadEntity, Vec2 } from "@/types/domain";

function materialColor(entity: CadEntity) {
  if (entity.fillColor) return entity.fillColor;
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
  const objectType = String(entity.metadata?.objectType ?? "");
  const isHedge = objectType === "hedge";
  const isFence = objectType === "fence" || objectType === "screen" || objectType === "railing" || objectType === "glass-wall";
  const isWall = entity.kind === "wall";
  const height = Math.max(entity.height, isWall ? 0.1 : 0.04);
  const width = Math.max(entity.strokeWidth ?? entity.width, isWall ? 0.05 : 0.08);
  const angle = -Math.atan2(dz, dx);
  const centerX = (start.x + end.x) / 2;
  const centerZ = (start.y + end.y) / 2;

  if (isHedge) {
    const segments = Math.max(2, Math.ceil(length / 0.65));
    const material = new THREE.MeshStandardMaterial({ color: materialColor(entity), roughness: 0.98 });
    for (let index = 0; index <= segments; index += 1) {
      const t = index / segments;
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(Math.max(.28, width * .72), 1), material);
      crown.scale.set(1, Math.max(.9, height / Math.max(width, .1) * .55), 1);
      crown.position.set(start.x + dx * t, height * .52, start.y + dz * t);
      crown.castShadow = true;
      crown.receiveShadow = true;
      group.add(crown);
    }
    return;
  }

  if (isFence) {
    const material = new THREE.MeshStandardMaterial({ color: materialColor(entity), roughness: .72, metalness: objectType === "glass-wall" ? 0 : .18, transparent: objectType === "glass-wall", opacity: objectType === "glass-wall" ? .48 : 1 });
    const postCount = Math.max(2, Math.ceil(length / 1.8));
    for (let index = 0; index <= postCount; index += 1) {
      const t = index / postCount;
      const post = new THREE.Mesh(new THREE.BoxGeometry(.09, height, .09), material);
      post.position.set(start.x + dx * t, height / 2, start.y + dz * t);
      post.castShadow = true;
      group.add(post);
    }
    for (const y of [height * .28, height * .72]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(length, .08, Math.max(.06, width)), material);
      rail.position.set(centerX, y, centerZ);
      rail.rotation.y = angle;
      rail.castShadow = true;
      group.add(rail);
    }
    return;
  }

  const material = new THREE.MeshStandardMaterial({
    color: materialColor(entity),
    roughness: isWall ? 0.88 : 0.95,
    metalness: 0.02,
    transparent: (entity.opacity ?? 1) < 1,
    opacity: entity.opacity ?? 1
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), material);
  mesh.position.set(centerX, height / 2, centerZ);
  mesh.rotation.y = angle;
  mesh.castShadow = isWall;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addCatalogObject(group: THREE.Group, entity: CadEntity, y: number, selected: boolean) {
  const objectType = String(entity.metadata?.objectType ?? "");
  if (!objectType) return false;
  const color = selected ? "#d9a05e" : materialColor(entity);
  const material = new THREE.MeshStandardMaterial({ color, roughness: .78, metalness: entity.materialId?.includes("metal") || entity.materialId === "mat-corten" ? .5 : .03 });
  const dark = new THREE.MeshStandardMaterial({ color: "#3d312b", roughness: .82 });
  const lightMaterial = new THREE.MeshStandardMaterial({ color: "#ffd77a", emissive: "#ffbd54", emissiveIntensity: 1.8, roughness: .25 });
  const root = new THREE.Group();
  root.position.set(entity.position.x, y, entity.position.y);
  root.rotation.y = THREE.MathUtils.degToRad(entity.rotation);

  const box = (w: number, h: number, d: number, x = 0, py = h / 2, z = 0, use = material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.03, w), Math.max(.03, h), Math.max(.03, d)), use);
    mesh.position.set(x, py, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const cylinder = (radius: number, h: number, x = 0, py = h / 2, z = 0, use = material) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(.02, radius), Math.max(.02, radius), Math.max(.03, h), 24), use);
    mesh.position.set(x, py, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };

  if (["bench", "sofa", "chair", "lounger"].includes(objectType)) {
    box(entity.width, Math.max(.12, entity.height * .16), entity.depth, 0, entity.height * .48);
    box(entity.width, Math.max(.12, entity.height * .48), Math.max(.08, entity.depth * .12), 0, entity.height * .72, entity.depth * .42);
    for (const x of [-entity.width * .38, entity.width * .38]) for (const z of [-entity.depth * .3, entity.depth * .3]) box(.09, entity.height * .45, .09, x, entity.height * .23, z, dark);
  } else if (objectType === "table" || objectType === "outdoor-kitchen" || objectType === "grill") {
    box(entity.width, Math.max(.08, entity.height * .12), entity.depth, 0, entity.height * .82);
    for (const x of [-entity.width * .4, entity.width * .4]) for (const z of [-entity.depth * .35, entity.depth * .35]) box(.09, entity.height * .76, .09, x, entity.height * .38, z, dark);
    if (objectType !== "table") box(entity.width * .75, entity.height * .45, entity.depth * .75, 0, entity.height * .48, 0, dark);
  } else if (["pergola", "carport", "pavilion"].includes(objectType)) {
    for (const x of [-entity.width * .45, entity.width * .45]) for (const z of [-entity.depth * .45, entity.depth * .45]) box(.14, entity.height, .14, x, entity.height / 2, z);
    box(entity.width, .14, entity.depth, 0, entity.height - .07);
    if (objectType === "pergola") for (let index = -4; index <= 4; index += 1) box(.08, .09, entity.depth, index * entity.width / 9, entity.height + .03, 0, dark);
  } else if (objectType === "stairs" || objectType === "ramp") {
    const steps = objectType === "stairs" ? 5 : 1;
    for (let index = 0; index < steps; index += 1) {
      const t = (index + 1) / steps;
      box(entity.width, entity.height * t, entity.depth / steps, 0, entity.height * t / 2, -entity.depth / 2 + (index + .5) * entity.depth / steps);
    }
  } else if (["bollard-light", "path-light", "pole-light", "ground-spot", "wall-light"].includes(objectType)) {
    const poleHeight = objectType === "ground-spot" ? .05 : Math.max(.18, entity.height * .82);
    cylinder(Math.max(.04, entity.width * .28), poleHeight, 0, poleHeight / 2, 0, dark);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(Math.max(.06, entity.width * .42), 20, 16), lightMaterial);
    bulb.position.y = Math.max(.08, entity.height * .88);
    root.add(bulb);
    const point = new THREE.PointLight("#ffd58a", objectType === "pole-light" ? 2.2 : 1.1, objectType === "pole-light" ? 8 : 4);
    point.position.copy(bulb.position);
    root.add(point);
  } else if (objectType === "firepit") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(entity.width * .32, Math.max(.06, entity.height * .18), 12, 36), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = entity.height * .55;
    root.add(ring);
    cylinder(entity.width * .27, entity.height * .3, 0, entity.height * .24, 0, dark);
  } else if (["fountain", "spring-stone"].includes(objectType)) {
    cylinder(entity.width * .48, Math.max(.12, entity.height * .18), 0, entity.height * .09);
    const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(entity.width * .3, 1), material);
    stone.scale.y = Math.max(.8, entity.height / Math.max(entity.width, .1));
    stone.position.y = entity.height * .48;
    root.add(stone);
  } else if (objectType === "rock") {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(entity.width * .45, 1), material);
    rock.scale.set(1, Math.max(.55, entity.height / Math.max(entity.width, .1)), entity.depth / Math.max(entity.width, .1));
    rock.position.y = entity.height * .45;
    rock.rotation.set(.15, .4, -.08);
    root.add(rock);
  } else if (["pool", "pond", "water-basin"].includes(objectType)) {
    const water = new THREE.Mesh(new THREE.BoxGeometry(entity.width * .94, .08, entity.depth * .94), new THREE.MeshStandardMaterial({ color: "#4ba7c7", transparent: true, opacity: .72, roughness: .12 }));
    water.position.y = .08;
    root.add(water);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(entity.width, .12, entity.depth), material);
    rim.position.y = .03;
    root.add(rim);
    const cutout = new THREE.Mesh(new THREE.BoxGeometry(entity.width * .91, .13, entity.depth * .91), new THREE.MeshStandardMaterial({ color: "#4ba7c7", transparent: true, opacity: .9 }));
    cutout.position.y = .09;
    root.add(cutout);
  } else if (["sunshade"].includes(objectType)) {
    cylinder(.05, entity.height, 0, entity.height / 2, 0, dark);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(entity.width / 2, .35, 32), material);
    canopy.position.y = entity.height;
    root.add(canopy);
  } else {
    return false;
  }

  group.add(root);
  return true;
}

export function ThreeViewport() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { entities, layers, selectedIds, terrain, plantingSettings, renderSettings } = useProjectStore();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const environment = {
      daylight: { sky: "#dfeaf2", ground: "#6e8d69", hemiSky: "#fff7ed", hemiGround: "#52614f", sun: "#fff1d2" },
      "golden-hour": { sky: "#e9c4a4", ground: "#6e805e", hemiSky: "#ffd9ad", hemiGround: "#654a45", sun: "#ffbd72" },
      overcast: { sky: "#d8dde0", ground: "#71836b", hemiSky: "#f2f4f5", hemiGround: "#59625b", sun: "#e7edf2" },
      night: { sky: "#172131", ground: "#35453c", hemiSky: "#7185ad", hemiGround: "#202822", sun: "#9db8ff" }
    }[renderSettings.preset];
    scene.background = new THREE.Color(environment.sky);
    scene.fog = renderSettings.fogEnabled ? new THREE.FogExp2(environment.sky, renderSettings.fogDensity) : null;

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 250);
    camera.position.set(16, 13, 17);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
    const qualityScale = renderSettings.quality === "ultra" ? 2.4 : renderSettings.quality === "high" ? 1.8 : 1.15;
    renderer.setPixelRatio(Math.min(devicePixelRatio, qualityScale));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = renderSettings.exposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(environment.hemiSky, environment.hemiGround, 1.55 * renderSettings.ambientStrength));
    const solarAltitude = Math.max(0.08, Math.sin(((renderSettings.hour - 6) / 12) * Math.PI));
    const sunIntensity = (renderSettings.preset === "night" ? 0.35 : renderSettings.preset === "overcast" ? 1.25 : 3.2) * renderSettings.shadowStrength;
    const sun = new THREE.DirectionalLight(environment.sun, sunIntensity);
    const sunAngle = THREE.MathUtils.degToRad(renderSettings.azimuth);
    sun.position.set(Math.sin(sunAngle) * 22, 4 + solarAltitude * 24, Math.cos(sunAngle) * 22);
    sun.castShadow = true;
    const shadowMapSize = renderSettings.quality === "ultra" ? 4096 : renderSettings.quality === "high" ? 2048 : 1024;
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
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

      const terrainY = elevationAt(terrain, entity.position.x, entity.position.y);
      if (addCatalogObject(group, entity, terrainY, selected)) continue;

      const color = selected ? "#d9a05e" : materialColor(entity);
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: entity.kind === "water" ? 0.25 : 0.84,
        metalness: 0.02,
        transparent: entity.kind === "water" || (entity.opacity ?? 1) < 1,
        opacity: entity.kind === "water" ? (entity.opacity ?? 0.78) : (entity.opacity ?? 1)
      });
      const height = Math.max(entity.height, 0.06);
      const geometry = entity.shape === "circle" || entity.shape === "ellipse"
        ? new THREE.CylinderGeometry(entity.shape === "circle" ? (entity.radius ?? entity.width / 2) : entity.width / 2, entity.shape === "circle" ? (entity.radius ?? entity.width / 2) : entity.width / 2, height, 48)
        : new THREE.BoxGeometry(entity.width, height, entity.depth);
      const mesh = new THREE.Mesh(geometry, material);
      if (entity.shape === "ellipse") mesh.scale.z = entity.depth / Math.max(entity.width, .01);
      mesh.position.set(entity.position.x, terrainY + height / 2, entity.position.y);
      mesh.rotation.y = THREE.MathUtils.degToRad(entity.rotation);
      mesh.castShadow = entity.kind === "building" || height > 0.5;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    if (!terrain.enabled) {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 40),
        new THREE.MeshStandardMaterial({ color: environment.ground, roughness: 0.94 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.025;
      ground.receiveShadow = true;
      scene.add(ground);
    }

    if (renderSettings.gridVisible3d) {
      const grid = new THREE.GridHelper(40, 40, "#794556", "#9cb19a");
      grid.position.y = 0.003;
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.22;
      scene.add(grid);
    }

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

    function exportRender() {
      renderer.render(scene, camera);
      const anchor = document.createElement("a");
      anchor.download = `AL_Green_Render_${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
      anchor.href = renderer.domElement.toDataURL("image/png");
      anchor.click();
    }
    window.addEventListener("algreen:export-render", exportRender);

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
      window.removeEventListener("algreen:export-render", exportRender);
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
  }, [entities, layers, selectedIds, terrain, plantingSettings, renderSettings]);

  return (
    <section className="viewportCard threeCard">
      <div className="viewportTitle"><strong>3D ENGINE</strong><span>Ziehen: Orbit · Mausrad: Zoom</span></div>
      <div className="renderBadge">{renderSettings.preset} · {renderSettings.quality} · ACES · PBR</div>
      <div ref={mountRef} className="threeViewport" />
    </section>
  );
}
