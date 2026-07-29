"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MATERIAL_CATALOG } from "@/data/materials/catalog";
import { useProjectStore } from "@/stores/projectStore";
import { elevationAt } from "@/engines/terrain/terrainEngine";
import { definitionForEntity, growthFactor } from "@/engines/plants/plantIntelligence";
import { hostedOpeningsForSegment } from "@/core/cad/openings";
import type { CadEntity, PlantDefinition, Vec2 } from "@/types/domain";

function materialDefinition(entity: CadEntity) {
  return MATERIAL_CATALOG.find(item => item.id === entity.materialId);
}

function materialColor(entity: CadEntity) {
  if (entity.fillColor) return entity.fillColor;
  const definition = materialDefinition(entity);
  if (definition) return definition.color;
  if (entity.kind === "building") return "#d8d1ca";
  if (entity.kind === "wall") return "#91877c";
  if (entity.kind === "water") return "#57a0be";
  if (entity.kind === "path") return "#a98d69";
  if (entity.name.toLowerCase().includes("terrasse")) return "#9d7657";
  return "#78a47b";
}

function createEntityMaterial(
  entity: CadEntity,
  color = materialColor(entity),
  overrides: Partial<THREE.MeshStandardMaterialParameters> = {}
) {
  const definition = materialDefinition(entity);
  const glassLike = definition?.category === "glass";
  const waterLike = definition?.category === "water" || entity.kind === "water";
  const opacity = overrides.opacity ?? (waterLike ? entity.opacity ?? .76 : glassLike ? .48 : entity.opacity ?? 1);
  return new THREE.MeshStandardMaterial({
    color,
    roughness: definition?.roughness ?? (waterLike ? .18 : .86),
    metalness: definition?.metalness ?? .02,
    transparent: glassLike || waterLike || opacity < 1,
    opacity,
    ...overrides
  });
}

function addSegment(group: THREE.Group, entity: CadEntity, start: Vec2, end: Vec2, openings: CadEntity[] = []) {
  const dx = end.x - start.x;
  const dz = end.y - start.y;
  const length = Math.hypot(dx, dz);
  if (length < 0.001) return;
  const objectType = String(entity.metadata?.objectType ?? "");
  const databaseCategory = String(entity.metadata?.databaseCategory ?? "");
  const isHedge = objectType === "hedge";
  const isFence = databaseCategory === "Zäune & Sichtschutz" || objectType === "fence" || objectType === "screen" || objectType === "railing" || objectType === "glass-wall";
  const isScreen = /sichtschutz|windschutz/i.test(entity.name) || objectType === "screen" || objectType === "glass-wall";
  const isWall = entity.kind === "wall";
  const height = Math.max(entity.height, isWall ? 0.1 : 0.04);
  const width = Math.max(entity.strokeWidth ?? entity.width, isWall ? 0.05 : 0.08);
  const angle = -Math.atan2(dz, dx);
  const centerX = (start.x + end.x) / 2;
  const centerZ = (start.y + end.y) / 2;
  const cuts = openings.map(opening => {
    const center = Math.min(length, Math.max(0, Number(opening.metadata?.hostOffsetRatio ?? .5) * length));
    return {
      opening,
      from: Math.max(0, center - opening.width / 2),
      to: Math.min(length, center + opening.width / 2)
    };
  }).filter(cut => cut.to - cut.from > .02).sort((a, b) => a.from - b.from);
  const mergedCuts = cuts.reduce<Array<{ from: number; to: number }>>((merged, cut) => {
    const previous = merged[merged.length - 1];
    if (previous && cut.from <= previous.to) previous.to = Math.max(previous.to, cut.to);
    else merged.push({ from: cut.from, to: cut.to });
    return merged;
  }, []);
  const solidRanges: Array<{ from: number; to: number }> = [];
  let cursor = 0;
  for (const cut of mergedCuts) {
    if (cut.from > cursor + .01) solidRanges.push({ from: cursor, to: cut.from });
    cursor = Math.max(cursor, cut.to);
  }
  if (cursor < length - .01) solidRanges.push({ from: cursor, to: length });
  const pointAtDistance = (value: number): Vec2 => ({ x: start.x + dx * value / length, y: start.y + dz * value / length });

  if (cuts.length > 0 && (isHedge || isFence)) {
    for (const range of solidRanges) addSegment(group, entity, pointAtDistance(range.from), pointAtDistance(range.to));
    return;
  }

  if (isHedge) {
    const segments = Math.max(2, Math.ceil(length / 0.65));
    const material = createEntityMaterial(entity, materialColor(entity), { roughness: .98, metalness: 0 });
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
    const material = createEntityMaterial(entity);
    const postCount = Math.max(2, Math.ceil(length / 1.8));
    for (let index = 0; index <= postCount; index += 1) {
      const t = index / postCount;
      const post = new THREE.Mesh(new THREE.BoxGeometry(.09, height, .09), material);
      post.position.set(start.x + dx * t, height / 2, start.y + dz * t);
      post.castShadow = true;
      group.add(post);
    }
    if (isScreen) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(length, height * .82, Math.max(.025, width)), material);
      panel.position.set(centerX, height * .53, centerZ);
      panel.rotation.y = angle;
      panel.castShadow = materialDefinition(entity)?.category !== "glass";
      panel.receiveShadow = true;
      group.add(panel);
    } else {
      for (const y of [height * .28, height * .72]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(length, .08, Math.max(.06, width)), material);
        rail.position.set(centerX, y, centerZ);
        rail.rotation.y = angle;
        rail.castShadow = true;
        group.add(rail);
      }
    }
    return;
  }

  const material = createEntityMaterial(entity, materialColor(entity), materialDefinition(entity) ? {} : { roughness: isWall ? .88 : .95 });
  if (cuts.length > 0 && isWall) {
    const addWallPiece = (from: number, to: number, bottom: number, top: number) => {
      const pieceLength = to - from;
      const pieceHeight = top - bottom;
      if (pieceLength < .015 || pieceHeight < .015) return;
      const centerDistance = (from + to) / 2;
      const center = pointAtDistance(centerDistance);
      const piece = new THREE.Mesh(new THREE.BoxGeometry(pieceLength, pieceHeight, width), material);
      piece.position.set(center.x, bottom + pieceHeight / 2, center.y);
      piece.rotation.y = angle;
      piece.castShadow = true;
      piece.receiveShadow = true;
      group.add(piece);
    };
    for (const range of solidRanges) addWallPiece(range.from, range.to, 0, height);
    for (const cut of cuts) {
      const sill = Math.min(height, Math.max(0, Number(cut.opening.metadata?.sillHeight ?? 0)));
      const openingTop = Math.min(height, sill + Math.max(.04, cut.opening.height));
      addWallPiece(cut.from, cut.to, 0, sill);
      addWallPiece(cut.from, cut.to, openingTop, height);
    }
    return;
  }
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
  const architectureOpening = entity.metadata?.architectureOpening === true;
  const color = selected ? "#d9a05e" : materialColor(entity);
  const material = createEntityMaterial(entity, color);
  const dark = new THREE.MeshStandardMaterial({ color: "#3d312b", roughness: .82 });
  const lightMaterial = new THREE.MeshStandardMaterial({ color: "#ffd77a", emissive: "#ffbd54", emissiveIntensity: 1.8, roughness: .25 });
  const root = new THREE.Group();
  root.position.set(entity.position.x, y, entity.position.y);
  root.rotation.y = THREE.MathUtils.degToRad(architectureOpening ? -entity.rotation : entity.rotation);

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

  if (architectureOpening) {
    const frameWidth = Math.min(.09, Math.max(.045, entity.width * .055));
    const frameDepth = Math.max(.05, entity.depth * .82);
    const glass = new THREE.MeshStandardMaterial({ color: "#89b8c8", roughness: .14, metalness: .02, transparent: true, opacity: .42 });
    const frame = selected ? createEntityMaterial(entity, "#d9a05e") : dark;
    box(frameWidth, entity.height, frameDepth, -entity.width / 2 + frameWidth / 2, entity.height / 2, 0, frame);
    box(frameWidth, entity.height, frameDepth, entity.width / 2 - frameWidth / 2, entity.height / 2, 0, frame);
    box(entity.width, frameWidth, frameDepth, 0, entity.height - frameWidth / 2, 0, frame);
    if (objectType === "window") {
      box(entity.width - frameWidth * 2.2, entity.height - frameWidth * 2.2, .028, 0, entity.height / 2, 0, glass);
      box(frameWidth, entity.height - frameWidth * 2, .05, 0, entity.height / 2, 0, frame);
    } else if (objectType === "sliding-door") {
      box(entity.width * .52, entity.height - frameWidth * 2.2, .035, -entity.width * .22, entity.height / 2, -.025, glass);
      box(entity.width * .52, entity.height - frameWidth * 2.2, .035, entity.width * .22, entity.height / 2, .025, glass);
      box(frameWidth, entity.height - frameWidth * 2, .06, 0, entity.height / 2, 0, frame);
    } else if (objectType === "door") {
      box(entity.width - frameWidth * 2.3, entity.height - frameWidth * 1.5, .055, 0, (entity.height - frameWidth * 1.5) / 2, .035, material);
      const handle = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 9), new THREE.MeshStandardMaterial({ color: "#b89b62", metalness: .8, roughness: .25 }));
      handle.position.set(entity.metadata?.hingeSide === "right" ? -entity.width * .3 : entity.width * .3, entity.height * .48, .08);
      root.add(handle);
    } else if (objectType === "gate") {
      for (let index = -4; index <= 4; index += 1) box(.035, entity.height * .92, .035, index * entity.width / 9, entity.height * .46, 0, material);
      for (const py of [entity.height * .25, entity.height * .7]) box(entity.width - frameWidth * 2, .05, .05, 0, py, 0, material);
    }
    group.add(root);
    return true;
  }

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

function addPlantModel(group: THREE.Group, entity: CadEntity, terrainY: number, years: number, selected: boolean) {
  const definition = definitionForEntity(entity);
  const factor = growthFactor(definition, years);
  const renderWidth = Math.max(.25, entity.width * factor);
  const renderHeight = Math.max(.24, entity.height * factor);
  const category: PlantDefinition["category"] = definition?.category ?? (entity.height > 2.5 ? "tree" : "shrub");
  const leafColor = selected ? "#68a25d" : definition?.evergreen ? "#315f43" : category === "grass" ? "#78905d" : "#477848";
  const leafMaterial = new THREE.MeshStandardMaterial({ color: leafColor, roughness: .98, metalness: 0 });
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#684333", roughness: .96, metalness: 0 });
  const flowerMaterial = new THREE.MeshStandardMaterial({ color: entity.fillColor ?? definition?.flowerColor ?? "#d8b3c3", roughness: .84, metalness: 0 });
  group.position.set(entity.position.x, terrainY, entity.position.y);
  group.rotation.y = THREE.MathUtils.degToRad(entity.rotation);

  const addMesh = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  if (category === "tree") {
    const trunkHeight = Math.max(.4, renderHeight * .48);
    const trunk = addMesh(new THREE.Mesh(
      new THREE.CylinderGeometry(Math.max(.045, renderWidth * .055), Math.max(.07, renderWidth * .085), trunkHeight, 10),
      trunkMaterial
    ));
    trunk.position.y = trunkHeight / 2;
    if (definition?.evergreen) {
      const crown = addMesh(new THREE.Mesh(new THREE.ConeGeometry(renderWidth * .48, Math.max(.45, renderHeight * .68), 20), leafMaterial));
      crown.position.y = trunkHeight + renderHeight * .28;
    } else {
      const crownRadius = Math.max(.18, renderWidth * .34);
      const clusters = [
        { x: 0, y: trunkHeight + renderHeight * .25, z: 0, scale: 1.15 },
        { x: -renderWidth * .2, y: trunkHeight + renderHeight * .16, z: renderWidth * .08, scale: .82 },
        { x: renderWidth * .2, y: trunkHeight + renderHeight * .18, z: -renderWidth * .09, scale: .86 }
      ];
      for (const cluster of clusters) {
        const crown = addMesh(new THREE.Mesh(new THREE.IcosahedronGeometry(crownRadius * cluster.scale, 2), leafMaterial));
        crown.position.set(cluster.x, cluster.y, cluster.z);
        crown.scale.y = Math.max(.82, renderHeight / Math.max(renderWidth, .1) * .32);
      }
    }
    if ((definition?.bloomMonths.length ?? 0) > 0) {
      for (let index = 0; index < 7; index += 1) {
        const angle = index / 7 * Math.PI * 2;
        const blossom = addMesh(new THREE.Mesh(new THREE.SphereGeometry(Math.max(.025, renderWidth * .035), 10, 8), flowerMaterial));
        blossom.position.set(Math.cos(angle) * renderWidth * .3, trunkHeight + renderHeight * (.18 + (index % 3) * .06), Math.sin(angle) * renderWidth * .3);
      }
    }
    return;
  }

  if (category === "shrub" || category === "hedge") {
    const clusterCount = category === "hedge" ? 5 : 4;
    for (let index = 0; index < clusterCount; index += 1) {
      const angle = index / clusterCount * Math.PI * 2;
      const radius = index === 0 ? 0 : renderWidth * .2;
      const crown = addMesh(new THREE.Mesh(new THREE.IcosahedronGeometry(Math.max(.14, renderWidth * (index === 0 ? .34 : .26)), 2), leafMaterial));
      crown.position.set(Math.cos(angle) * radius, renderHeight * (index === 0 ? .48 : .38), Math.sin(angle) * radius);
      crown.scale.y = Math.max(.7, renderHeight / Math.max(renderWidth, .1) * .62);
    }
    for (let index = 0; index < 5; index += 1) {
      const angle = index / 5 * Math.PI * 2 + .35;
      const blossom = addMesh(new THREE.Mesh(new THREE.SphereGeometry(Math.max(.025, renderWidth * .045), 10, 8), flowerMaterial));
      blossom.position.set(Math.cos(angle) * renderWidth * .26, renderHeight * .65, Math.sin(angle) * renderWidth * .26);
    }
    return;
  }

  if (category === "grass") {
    const bladeCount = 13;
    for (let index = 0; index < bladeCount; index += 1) {
      const angle = index / bladeCount * Math.PI * 2;
      const bladeHeight = renderHeight * (.68 + (index % 4) * .08);
      const blade = addMesh(new THREE.Mesh(new THREE.ConeGeometry(Math.max(.015, renderWidth * .018), bladeHeight, 5), leafMaterial));
      blade.position.set(Math.cos(angle) * renderWidth * (index % 3) * .055, bladeHeight / 2, Math.sin(angle) * renderWidth * (index % 3) * .055);
      blade.rotation.z = Math.cos(angle) * .14;
      blade.rotation.x = Math.sin(angle) * .14;
    }
    return;
  }

  const stemCount = 9;
  for (let index = 0; index < stemCount; index += 1) {
    const angle = index / stemCount * Math.PI * 2;
    const radius = index === 0 ? 0 : renderWidth * .25;
    const stemHeight = renderHeight * (.62 + (index % 3) * .12);
    const stem = addMesh(new THREE.Mesh(new THREE.CylinderGeometry(.012, .018, stemHeight, 6), leafMaterial));
    stem.position.set(Math.cos(angle) * radius, stemHeight / 2, Math.sin(angle) * radius);
    const flower = addMesh(new THREE.Mesh(new THREE.SphereGeometry(Math.max(.035, renderWidth * .065), 12, 9), flowerMaterial));
    flower.position.set(stem.position.x, stemHeight, stem.position.z);
  }
}

export function ThreeViewport() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cameraStateRef = useRef({ azimuth: Math.atan2(16, 17), elevation: .63, radius: 26 });
  const { entities, layers, selectedIds, setSelectedIds, terrain, plantingSettings, renderSettings } = useProjectStore();
  const selectedNames = entities.filter(entity => selectedIds.includes(entity.id)).map(entity => entity.name);

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
    const initialCamera = cameraStateRef.current;
    const initialHorizontal = Math.cos(initialCamera.elevation) * initialCamera.radius;
    camera.position.set(Math.sin(initialCamera.azimuth) * initialHorizontal, Math.sin(initialCamera.elevation) * initialCamera.radius, Math.cos(initialCamera.azimuth) * initialHorizontal);
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
      const layerElevation = layerMap.get(entity.layerId)?.elevation ?? 0;
      const terrainY = elevationAt(terrain, entity.position.x, entity.position.y);
      const baseY = terrainY + layerElevation + (entity.elevationOffset ?? 0);
      const entityGroup = new THREE.Group();
      entityGroup.name = `entity:${entity.id}`;
      entityGroup.userData.entityId = entity.id;
      group.add(entityGroup);
      const finishEntity = () => {
        if (!selected || entityGroup.children.length === 0) return;
        const outline = new THREE.BoxHelper(entityGroup, "#ffb84d");
        outline.userData.pickable = false;
        group.add(outline);
      };

      if (entity.kind === "plant") {
        addPlantModel(entityGroup, entity, baseY, plantingSettings.growthYears, selected);
        finishEntity();
        continue;
      }

      if (entity.shape === "line" || entity.shape === "polyline") {
        entityGroup.position.y = baseY;
        for (let index = 1; index < entity.points.length; index += 1) {
          addSegment(entityGroup, entity, entity.points[index - 1], entity.points[index], hostedOpeningsForSegment(entities, entity.id, index - 1));
        }
        finishEntity();
        continue;
      }

      if (addCatalogObject(entityGroup, entity, baseY, selected)) {
        finishEntity();
        continue;
      }

      const color = selected ? "#d9a05e" : materialColor(entity);
      const material = createEntityMaterial(entity, color);
      const height = Math.max(entity.height, 0.06);
      const geometry = entity.shape === "circle" || entity.shape === "ellipse"
        ? new THREE.CylinderGeometry(entity.shape === "circle" ? (entity.radius ?? entity.width / 2) : entity.width / 2, entity.shape === "circle" ? (entity.radius ?? entity.width / 2) : entity.width / 2, height, 48)
        : new THREE.BoxGeometry(entity.width, height, entity.depth);
      const mesh = new THREE.Mesh(geometry, material);
      if (entity.shape === "ellipse") mesh.scale.z = entity.depth / Math.max(entity.width, .01);
      mesh.position.set(entity.position.x, baseY + height / 2, entity.position.y);
      mesh.rotation.y = THREE.MathUtils.degToRad(entity.rotation);
      mesh.castShadow = entity.kind === "building" || height > 0.5;
      mesh.receiveShadow = true;
      entityGroup.add(mesh);
      finishEntity();
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
    let pointerMoved = false;
    let pointerOrigin = { x: 0, y: 0 };
    let lastPointer = { x: 0, y: 0 };
    let azimuth = initialCamera.azimuth;
    let elevation = initialCamera.elevation;
    let radius = initialCamera.radius;

    function updateCamera() {
      const horizontal = Math.cos(elevation) * radius;
      camera.position.set(Math.sin(azimuth) * horizontal, Math.sin(elevation) * radius, Math.cos(azimuth) * horizontal);
      camera.lookAt(0, 0.8, 0);
      cameraStateRef.current = { azimuth, elevation, radius };
    }

    function pointerStart(event: PointerEvent) {
      if (event.button !== 0) return;
      pointerDown = true;
      pointerMoved = false;
      pointerOrigin = { x: event.clientX, y: event.clientY };
      lastPointer = { x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture(event.pointerId);
    }

    function pointerMove(event: PointerEvent) {
      if (!pointerDown) return;
      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;
      if (Math.hypot(event.clientX - pointerOrigin.x, event.clientY - pointerOrigin.y) > 4) pointerMoved = true;
      lastPointer = { x: event.clientX, y: event.clientY };
      if (!pointerMoved) return;
      azimuth -= dx * 0.006;
      elevation = Math.max(0.18, Math.min(1.35, elevation + dy * 0.005));
      updateCamera();
    }

    function pointerEnd(event: PointerEvent) {
      if (!pointerDown) return;
      pointerDown = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      if (pointerMoved) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1,
        -((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(group.children, true);
      let hitId = "";
      for (const intersection of intersections) {
        let current: THREE.Object3D | null = intersection.object;
        if (current.userData.pickable === false) continue;
        while (current && current !== group) {
          if (typeof current.userData.entityId === "string") {
            hitId = current.userData.entityId;
            break;
          }
          current = current.parent;
        }
        if (hitId) break;
      }
      if (!hitId) {
        if (!event.shiftKey) setSelectedIds([]);
        return;
      }
      if (event.shiftKey) {
        setSelectedIds(selectedIds.includes(hitId) ? selectedIds.filter(id => id !== hitId) : [...selectedIds, hitId]);
      } else {
        setSelectedIds([hitId]);
      }
    }

    function pointerCancel(event: PointerEvent) {
      pointerDown = false;
      pointerMoved = false;
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
    renderer.domElement.addEventListener("pointercancel", pointerCancel);
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
      renderer.domElement.removeEventListener("pointercancel", pointerCancel);
      renderer.domElement.removeEventListener("wheel", wheel);
      window.removeEventListener("algreen:export-render", exportRender);
      cancelAnimationFrame(frame);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach(materialItem => materialItem.dispose());
          else object.material.dispose();
        }
      });
      renderer.dispose();
      mount.replaceChildren();
    };
  }, [entities, layers, selectedIds, setSelectedIds, terrain, plantingSettings, renderSettings]);

  return (
    <section className="viewportCard threeCard">
      <div className="viewportTitle"><strong>3D ENGINE · INTERAKTIV</strong><span>Klick: Auswahl · Umschalt: mehrere · Ziehen: Orbit · Mausrad: Zoom</span></div>
      <div className="renderBadge">{renderSettings.preset} · {renderSettings.quality} · ACES · PBR</div>
      <div className={`threeSelectionHud${selectedNames.length ? " active" : ""}`}>
        {selectedNames.length ? <><strong>{selectedNames.length} gewählt</strong><span>{selectedNames.slice(0, 2).join(" · ")}{selectedNames.length > 2 ? " …" : ""}</span></> : <span>Objekt im 3D-Modell anklicken</span>}
      </div>
      <div ref={mountRef} className="threeViewport" />
    </section>
  );
}
