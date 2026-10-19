// Scene setup: renderer-independent room shell + lighting.
// Furniture is now loaded asynchronously via furniture.ts using Kenney GLB assets.
// The procedural placeholder shapes that ARE replaced by GLBs have been removed.
// Preserved intact: floor plane (visible until GLB tiles load), walls, arched mouse hole,
// nook, skirting, window, cheese spots, home marker, and all colliders.
import * as THREE from "three";
import { box, platform, type Box, type Platform } from "./collision";
import {
  bedroomArtTexture,
  burrowPlanksTexture,
  framedArtTexture,
  libraryArtTexture,
  matchboxBlanketTexture,
  matchboxCoverTexture,
  miniPortraitTexture,
  patchworkRugTexture,
  stampTableclothTexture,
  studyBlueprintTexture,
  threadSpoolTexture,
  wallpaper,
  woodFloor,
  woodFloorBump,
  woodFloorRoughness,
} from "./textures";

export const ROOM = { minX: -8.0, maxX: 8.0, minZ: -6.5, maxZ: 6.5, h: 9.0 };
export const HOLE = { x: -5.0, w: 0.40, h: 0.38 };
export const NOOK = { minX: -6.00, maxX: -4.00, minZ: -8.40, maxZ: -6.80, h: 0.70 };
export const START = { x: -5.0, z: -7.60, yaw: 0 };
export const CHEESE_SPOTS: [number, number][] = [
  [4.50, -2.40], // Study beside desk
  [5.50, -5.50], // Study corner plant
  [-6.00, 5.00], // Library reading corner
];

export function isHome(x: number, z: number) {
  return z < -6.75 && x > NOOK.minX && x < NOOK.maxX;
}

const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, cast = true) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = cast;
  o.receiveShadow = true;
  return o;
}

export interface World {
  group: THREE.Group;
  colliders: Box[];
  platforms: Platform[];
  homeMarker: THREE.Mesh;
  dispose: () => void;
}

export function buildWorld(scene: THREE.Scene): World {
  const g = new THREE.Group();
  const colliders: Box[] = [];
  const platforms: Platform[] = [];
  const W = ROOM.maxX - ROOM.minX; // 16.0m
  const D = ROOM.maxZ - ROOM.minZ; // 13.0m

  scene.background = new THREE.Color("#e8d5b0");
  scene.fog = new THREE.Fog("#e8d5b0", 20, 45);

  // ── Lights ───────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight("#fffaf0", "#8c6b45", 0.95);
  const sun = new THREE.DirectionalLight("#ffe4be", 2.8);
  sun.position.set(8, 16, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 40;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 2.0;

  // Warm overhead room lights for each distinct zone
  const fill = new THREE.PointLight("#ffe8cc", 1.0, 25, 1.2);
  fill.position.set(0, 5, 0);

  const lightLiving = new THREE.PointLight("#ffeedd", 1.1, 14, 1.2);
  lightLiving.position.set(-4.5, 3.2, -3.8);

  // Golden floor lamp accent glow in SW living room corner
  const livingFloorLamp = new THREE.PointLight("#ffb86c", 0.85, 8.0, 1.4);
  livingFloorLamp.position.set(-7.40, 1.95, -5.80);

  // Library overhead ambient & warm reading floor lamp glow
  const lightLibrary = new THREE.PointLight("#ffeedd", 0.9, 12, 1.3);
  lightLibrary.position.set(-4.0, 3.2, 3.25);
  const libraryReadingLamp = new THREE.PointLight("#ffb86c", 0.85, 7.0, 1.4);
  libraryReadingLamp.position.set(-4.40, 2.15, 4.50);

  // Bedroom overhead ambient & cozy bedside nightstand lamp glow
  const lightBedroom = new THREE.PointLight("#ffeedd", 0.9, 12, 1.3);
  lightBedroom.position.set(4.0, 3.2, 3.25);
  const bedroomNightstandLamp = new THREE.PointLight("#ffb86c", 0.75, 5.5, 1.4);
  bedroomNightstandLamp.position.set(3.33, 1.15, 6.15);

  // Study overhead ambient & focused warm architect desk lamp glow
  const lightStudy = new THREE.PointLight("#ffeedd", 0.9, 12, 1.3);
  lightStudy.position.set(4.0, 3.2, -3.25);
  const studyDeskLamp = new THREE.PointLight("#ffe0b2", 0.80, 5.0, 1.4);
  studyDeskLamp.position.set(7.35, 1.65, -3.40);

  g.add(
    hemi,
    sun,
    fill,
    lightLiving,
    livingFloorLamp,
    lightLibrary,
    libraryReadingLamp,
    lightBedroom,
    bedroomNightstandLamp,
    lightStudy,
    studyDeskLamp
  );

  // ── Floor (Scandinavian Honey Oak Hardwood Planks with PBR maps) ──
  const floorMat = new THREE.MeshStandardMaterial({
    map: woodFloor(),
    bumpMap: woodFloorBump(),
    bumpScale: 0.012,
    roughnessMap: woodFloorRoughness(),
    roughness: 0.52,
    metalness: 0.02,
  });
  const floor = mesh(new THREE.PlaneGeometry(W, D), floorMat, 0, 0, 0, false);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  // ── Outer Perimeter Walls ─────────────────────────────────────────────
  const wallTex = wallpaper();
  const wallMat = mat("#ffffff", { map: wallTex, roughness: 0.92 });
  const side = (w: number, x: number, z: number, ry: number) => {
    const m = mesh(new THREE.PlaneGeometry(w, ROOM.h), wallMat, x, ROOM.h / 2, z, false);
    m.rotation.y = ry;
    g.add(m);
  };
  side(D, ROOM.minX, 0, Math.PI / 2);
  side(D, ROOM.maxX, 0, -Math.PI / 2);
  side(W, 0, ROOM.maxZ, Math.PI);

  // ── Cohesive Framed Wall Art Across Rooms ──────────────────────────────
  const frameDarkWood = mat("#3b2314", { roughness: 0.5, metalness: 0.05 });
  const frameLightWood = mat("#5c3a21", { roughness: 0.55, metalness: 0.04 });
  const frameModernBlack = mat("#1e1e1e", { roughness: 0.40, metalness: 0.20 });

  // 1. Living Room: Framed Oil Landscape on West Wall
  const livingArtCanvasM = mat("#ffffff", { map: framedArtTexture(), roughness: 0.85 });
  g.add(mesh(new THREE.BoxGeometry(0.06, 1.10, 1.50), frameDarkWood, ROOM.minX + 0.03, 2.40, -3.80));
  const livingArtCanvas = mesh(new THREE.PlaneGeometry(1.40, 1.00), livingArtCanvasM, ROOM.minX + 0.065, 2.40, -3.80, false);
  livingArtCanvas.rotation.y = Math.PI / 2;
  g.add(livingArtCanvas);

  // 2. Library: Framed Antique Celestial Star Chart on North Wall
  const libraryArtCanvasM = mat("#ffffff", { map: libraryArtTexture(), roughness: 0.85 });
  g.add(mesh(new THREE.BoxGeometry(1.50, 1.10, 0.06), frameDarkWood, -3.80, 2.40, ROOM.maxZ - 0.03));
  const libraryArtCanvas = mesh(new THREE.PlaneGeometry(1.40, 1.00), libraryArtCanvasM, -3.80, 2.40, ROOM.maxZ - 0.065, false);
  libraryArtCanvas.rotation.y = Math.PI;
  g.add(libraryArtCanvas);

  // 3. Bedroom: Serene Scandinavian Botanical Art on North Wall
  const bedroomArtCanvasM = mat("#ffffff", { map: bedroomArtTexture(), roughness: 0.85 });
  g.add(mesh(new THREE.BoxGeometry(1.30, 1.00, 0.06), frameLightWood, 1.80, 2.40, ROOM.maxZ - 0.03));
  const bedroomArtCanvas = mesh(new THREE.PlaneGeometry(1.20, 0.90), bedroomArtCanvasM, 1.80, 2.40, ROOM.maxZ - 0.065, false);
  bedroomArtCanvas.rotation.y = Math.PI;
  g.add(bedroomArtCanvas);

  // 4. Study: Precision Apparatus Technical Blueprint on East Wall above Desk
  const studyArtCanvasM = mat("#ffffff", { map: studyBlueprintTexture(), roughness: 0.85 });
  g.add(mesh(new THREE.BoxGeometry(0.06, 1.00, 1.40), frameModernBlack, ROOM.maxX - 0.03, 2.40, -2.70));
  const studyArtCanvas = mesh(new THREE.PlaneGeometry(1.30, 0.90), studyArtCanvasM, ROOM.maxX - 0.065, 2.40, -2.70, false);
  studyArtCanvas.rotation.y = -Math.PI / 2;
  g.add(studyArtCanvas);

  // Back wall with discreet arched mouse-hole cutout at HOLE.x = -5.0
  const shape = new THREE.Shape();
  shape.moveTo(ROOM.minX, 0);
  shape.lineTo(ROOM.maxX, 0);
  shape.lineTo(ROOM.maxX, ROOM.h);
  shape.lineTo(ROOM.minX, ROOM.h);
  shape.closePath();
  const r = HOLE.w / 2; // 0.20m
  const hole = new THREE.Path();
  hole.moveTo(HOLE.x - r, 0);
  hole.lineTo(HOLE.x - r, HOLE.h - r);
  hole.absarc(HOLE.x, HOLE.h - r, r, Math.PI, 0, true);
  hole.lineTo(HOLE.x + r, 0);
  hole.closePath();
  shape.holes.push(hole);
  const backTex = wallpaper();
  backTex.repeat.set(0.25, 0.25);
  const back = mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false, curveSegments: 20 }),
    mat("#ffffff", { map: backTex, roughness: 0.9 }),
    0, 0, ROOM.minZ - 0.3, false,
  );
  back.receiveShadow = false;
  g.add(back);

  // Arch trim around discreet mouse hole
  const trim = mesh(
    new THREE.TorusGeometry(r + 0.025, 0.03, 8, 24, Math.PI),
    mat("#8a5a36"),
    HOLE.x, HOLE.h - r, ROOM.minZ + 0.02,
  );
  g.add(trim);
  for (const s of [-1, 1]) {
    g.add(mesh(
      new THREE.BoxGeometry(0.06, HOLE.h - r, 0.06),
      mat("#8a5a36"),
      HOLE.x + s * (r + 0.025), (HOLE.h - r) / 2, ROOM.minZ + 0.02,
    ));
  }

  // Outer skirting boards (notched neatly around discreet mouse hole)
  const skirt = mat("#f5ead6");
  g.add(mesh(new THREE.BoxGeometry(W, 0.35, 0.08), skirt, 0, 0.175, ROOM.maxZ - 0.04));
  g.add(mesh(new THREE.BoxGeometry(HOLE.x - r - ROOM.minX, 0.35, 0.08), skirt, (ROOM.minX + HOLE.x - r) / 2, 0.175, ROOM.minZ + 0.04));
  g.add(mesh(new THREE.BoxGeometry(ROOM.maxX - (HOLE.x + r), 0.35, 0.08), skirt, (ROOM.maxX + HOLE.x + r) / 2, 0.175, ROOM.minZ + 0.04));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.35, D), skirt, ROOM.minX + 0.04, 0.175, 0));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.35, D), skirt, ROOM.maxX - 0.04, 0.175, 0));

  // Bedroom Window (East wall at Z = 3.5)
  const win = mesh(
    new THREE.PlaneGeometry(3.6, 3.2),
    new THREE.MeshBasicMaterial({ color: "#e8f4ff" }),
    ROOM.maxX - 0.02, 4.5, 3.5, false,
  );
  win.rotation.y = -Math.PI / 2;
  g.add(win);
  const frameM = mat("#fbf3e4");
  g.add(mesh(new THREE.BoxGeometry(0.15, 0.15, 3.8), frameM, ROOM.maxX - 0.05, 4.5, 3.5));
  g.add(mesh(new THREE.BoxGeometry(0.15, 3.4, 0.15), frameM, ROOM.maxX - 0.05, 4.5, 3.5));
  // Sunlight ray effect through bedroom window
  const sunShaft = new THREE.SpotLight("#fff3dd", 1.5, 20, Math.PI / 8, 0.7, 1.5);
  sunShaft.position.set(ROOM.maxX - 0.5, 4.5, 3.5);
  sunShaft.target.position.set(4, 0, 3.5);
  g.add(sunShaft, sunShaft.target);

  // ── Internal Partition Walls & Human Doorways ─────────────────────────
  // Architecture: 4 distinct rooms divided by 2.80m tall walls with 2.20m wide human doorways.
  // Central spine wall along X = 0 (Z from -6.5 to +6.5)
  // Cross dividing wall along Z = 0 (X from -8.0 to +8.0)
  const H_WALL = 2.80;
  const T_WALL = 0.16; // wall thickness (colliders match +/- 0.10 including skirting)
  const H_DOOR = 2.50; // human doorway clear height
  const doorTrimM = mat("#7c4e2d"); // warm wood door casing
  const crownM = mat("#f5ead6"); // crown molding on partition top

  // Helper for adding partition wall segments with baseboards on both faces
  const addWallZ = (zMin: number, zMax: number) => {
    const len = zMax - zMin;
    const zMid = (zMin + zMax) / 2;
    // Solid wall box
    g.add(mesh(new THREE.BoxGeometry(T_WALL, H_WALL, len), wallMat, 0, H_WALL / 2, zMid));
    // Skirting boards on West face (X = -0.09) and East face (X = +0.09)
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.35, len), skirt, -0.09, 0.175, zMid));
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.35, len), skirt, 0.09, 0.175, zMid));
    // Collider
    colliders.push({ minX: -0.10, maxX: 0.10, minZ: zMin, maxZ: zMax });
  };

  const addWallX = (xMin: number, xMax: number) => {
    const len = xMax - xMin;
    const xMid = (xMin + xMax) / 2;
    // Solid wall box
    g.add(mesh(new THREE.BoxGeometry(len, H_WALL, T_WALL), wallMat, xMid, H_WALL / 2, 0));
    // Skirting boards on South face (Z = -0.09) and North face (Z = +0.09)
    g.add(mesh(new THREE.BoxGeometry(len, 0.35, 0.02), skirt, xMid, 0.175, -0.09));
    g.add(mesh(new THREE.BoxGeometry(len, 0.35, 0.02), skirt, xMid, 0.175, 0.09));
    // Collider
    colliders.push({ minX: xMin, maxX: xMax, minZ: -0.10, maxZ: 0.10 });
  };

  // Doorway lintel & trim builders (openings are completely clear at floor level for mouse/human)
  const addDoorwayZ = (zMin: number, zMax: number) => {
    const len = zMax - zMin;
    const zMid = (zMin + zMax) / 2;
    const lintelH = H_WALL - H_DOOR;
    // Wall lintel above doorway (Y from 2.50 to 2.80)
    g.add(mesh(new THREE.BoxGeometry(T_WALL, lintelH, len), wallMat, 0, H_DOOR + lintelH / 2, zMid));
    // Architectural door casing
    g.add(mesh(new THREE.BoxGeometry(0.20, 0.08, len + 0.08), doorTrimM, 0, H_DOOR - 0.04, zMid));
    g.add(mesh(new THREE.BoxGeometry(0.20, H_DOOR, 0.06), doorTrimM, 0, H_DOOR / 2, zMin + 0.03));
    g.add(mesh(new THREE.BoxGeometry(0.20, H_DOOR, 0.06), doorTrimM, 0, H_DOOR / 2, zMax - 0.03));
  };

  const addDoorwayX = (xMin: number, xMax: number) => {
    const len = xMax - xMin;
    const xMid = (xMin + xMax) / 2;
    const lintelH = H_WALL - H_DOOR;
    // Wall lintel above doorway (Y from 2.50 to 2.80)
    g.add(mesh(new THREE.BoxGeometry(len, lintelH, T_WALL), wallMat, xMid, H_DOOR + lintelH / 2, 0));
    // Architectural door casing
    g.add(mesh(new THREE.BoxGeometry(len + 0.08, 0.08, 0.20), doorTrimM, xMid, H_DOOR - 0.04, 0));
    g.add(mesh(new THREE.BoxGeometry(0.06, H_DOOR, 0.20), doorTrimM, xMin + 0.03, H_DOOR / 2, 0));
    g.add(mesh(new THREE.BoxGeometry(0.06, H_DOOR, 0.20), doorTrimM, xMax - 0.03, H_DOOR / 2, 0));
  };

  // A. Central Spine Wall along X = 0 (Z: -6.50 -> +6.50)
  // Segment C1: South boundary to Doorway 1
  addWallZ(-6.50, -2.50);
  // Doorway 1 (Living Room <-> Study): Z from -2.50 to -0.30 (2.20m wide)
  addDoorwayZ(-2.50, -0.30);
  // Segment C2: Doorway 1 to Doorway 4
  addWallZ(-0.30, 2.30);
  // Doorway 4 (Library <-> Bedroom): Z from 2.30 to 4.50 (2.20m wide)
  addDoorwayZ(2.30, 4.50);
  // Segment C3: Doorway 4 to North boundary
  addWallZ(4.50, 6.50);

  // B. Cross Dividing Wall along Z = 0 (X: -8.00 -> +8.00)
  // Segment W1: West outer wall to Doorway 2
  addWallX(-8.00, -4.50);
  // Doorway 2 (Living Room <-> Library): X from -4.50 to -2.30 (2.20m wide)
  addDoorwayX(-4.50, -2.30);
  // Segment W2: Doorway 2 to Central Wall
  addWallX(-2.30, -0.10);
  // Segment E1: Central Wall to Doorway 3
  addWallX(0.10, 1.80);
  // Doorway 3 (Study <-> Bedroom): X from 1.80 to 4.00 (2.20m wide)
  addDoorwayX(1.80, 4.00);
  // Segment E2: Doorway 3 to East outer wall
  addWallX(4.00, 8.00);

  // Partition Wall Crown Capping (crisp architectural trim along top at Y = 2.80m)
  g.add(mesh(new THREE.BoxGeometry(0.20, 0.05, D), crownM, 0, H_WALL + 0.025, 0));
  g.add(mesh(new THREE.BoxGeometry(W, 0.05, 0.20), crownM, 0, H_WALL + 0.025, 0));

  // ── Outer room wall colliders ─────────────────────────────────────────
  const doorHalf = HOLE.w / 2; // 0.20m
  const gapMargin = 0.03; // precise clearance for 0.11m radius mouse
  const skirtT = 0.08;
  // Back wall left side: terminates at left edge of mouse hole
  colliders.push({
    minX: ROOM.minX - 1,
    maxX: HOLE.x - doorHalf - gapMargin, // -5.23
    minZ: ROOM.minZ - 1,
    maxZ: ROOM.minZ + skirtT,
  });
  // Back wall right side: starts at right edge of mouse hole
  colliders.push({
    minX: HOLE.x + doorHalf + gapMargin, // -4.77
    maxX: ROOM.maxX + 1,
    minZ: ROOM.minZ - 1,
    maxZ: ROOM.minZ + skirtT,
  });
  // Left wall
  colliders.push({
    minX: ROOM.minX - 1,
    maxX: ROOM.minX + skirtT,
    minZ: ROOM.minZ - 1,
    maxZ: ROOM.maxZ + 1,
  });
  // Right wall
  colliders.push({
    minX: ROOM.maxX - skirtT,
    maxX: ROOM.maxX + 1,
    minZ: ROOM.minZ - 1,
    maxZ: ROOM.maxZ + 1,
  });
  // Front wall
  colliders.push({
    minX: ROOM.minX - 1,
    maxX: ROOM.maxX + 1,
    minZ: ROOM.maxZ - skirtT,
    maxZ: ROOM.maxZ + 1,
  });

  // ── Mouse home (Cozy Miniature Mouse Burrow behind the discreet mouse hole) ──
  // Expanded burrow: 2.00m width (X[-6.00, -4.00]), 1.60m depth (Z[-8.40, -6.80]), 0.70m height.
  // Interior length expanded by +33.3% extending rear into subfloor crawlspace.
  const n = NOOK;
  const nw = n.maxX - n.minX, nd = n.maxZ - n.minZ;
  const ncx = (n.minX + n.maxX) / 2, ncz = (n.minZ + n.maxZ) / 2;

  // 1. Burrow rustic timber walls & ceiling
  const burrowWallTex = burrowPlanksTexture(2);
  const burrowWallM = mat("#825432", { map: burrowWallTex, roughness: 0.9, side: THREE.DoubleSide });

  const plane = (w: number, h: number, x: number, y: number, z: number, rx: number, ry: number) => {
    const p = mesh(new THREE.PlaneGeometry(w, h), burrowWallM, x, y, z, false);
    p.receiveShadow = false;
    p.rotation.set(rx, ry, 0);
    g.add(p);
  };
  plane(nw, n.h, ncx, n.h / 2, n.minZ, 0, 0); // back wall at z = -8.40
  plane(nd, n.h, n.minX, n.h / 2, ncz, 0, Math.PI / 2); // left wall at x = -6.00
  plane(nd, n.h, n.maxX, n.h / 2, ncz, 0, Math.PI / 2); // right wall at x = -4.00
  plane(nw, nd, ncx, n.h, ncz, Math.PI / 2, 0); // low ceiling at y = 0.70

  // Exposed subfloor timber joists overhead (Y = 0.68)
  const joistM = mat("#4a2c16", { roughness: 0.85 });
  for (const jz of [-8.15, -7.75, -7.35, -6.95]) {
    g.add(mesh(new THREE.BoxGeometry(nw - 0.04, 0.04, 0.06), joistM, ncx, n.h - 0.02, jz, false));
  }

  // Burrow floor: stays strictly within nest boundary [Z: -8.40 to -6.80]
  const burrowFloorTex = burrowPlanksTexture(2);
  const nfloor = mesh(
    new THREE.PlaneGeometry(nw, nd),
    mat("#764728", { map: burrowFloorTex, roughness: 0.8 }),
    ncx, 0.003, ncz, false,
  );
  nfloor.rotation.x = -Math.PI / 2;
  g.add(nfloor);

  // Register burrow floor as walkable platform so mouse stands cleanly on pine planks
  platforms.push(platform(ncx, ncz, nw, nd, 0.003));

  // Colorful braided patchwork rag rug in center of living space (expanded radius 0.44m)
  const patchRug = mesh(
    new THREE.CircleGeometry(0.44, 32),
    mat("#ffffff", { map: patchworkRugTexture(), roughness: 0.95 }),
    -4.95, 0.005, -7.55, false,
  );
  patchRug.rotation.x = -Math.PI / 2;
  g.add(patchRug);

  // Entrance threshold: seamlessly bridges the 0.30m wall thickness between nest and room
  const threshold = mesh(
    new THREE.PlaneGeometry(HOLE.w, 0.30),
    mat("#5c361c", { roughness: 0.75 }),
    HOLE.x, 0.002, -6.65, false,
  );
  threshold.rotation.x = -Math.PI / 2;
  g.add(threshold);
  platforms.push(platform(HOLE.x, -6.65, HOLE.w, 0.30, 0.002));

  colliders.push(
    { minX: n.minX - 1, maxX: n.minX, minZ: n.minZ - 1, maxZ: ROOM.minZ },
    { minX: n.maxX, maxX: n.maxX + 1, minZ: n.minZ - 1, maxZ: ROOM.minZ },
    { minX: n.minX - 1, maxX: n.maxX + 1, minZ: n.minZ - 1, maxZ: n.minZ },
  );

  // 2. Sleeping Nook (West Alcove: X ~ -5.60, Z ~ -7.70)
  // Vintage Matchbox Bed: outer slide sleeve as headboard + slid-out cardboard tray
  const kraftM = mat("#c8a87b", { roughness: 0.85 });
  const matchCoverM = mat("#ffffff", { map: matchboxCoverTexture(), roughness: 0.8 });
  const woodMatchM = mat("#ebd0a0", { roughness: 0.6 });
  const sulfurM = mat("#ba2c1f", { roughness: 0.5 });

  // Matchbox sleeve stood up as headboard against West wall (X = -5.86)
  const headboard = mesh(new THREE.BoxGeometry(0.04, 0.28, 0.36), matchCoverM, -5.86, 0.16, -7.70);
  headboard.rotation.z = -0.06;
  g.add(headboard);

  // Slide-out inner cardboard tray
  g.add(mesh(new THREE.BoxGeometry(0.44, 0.08, 0.32), kraftM, -5.60, 0.065, -7.70));

  // 4 Matchstick bedpost legs with red sulfur tips
  for (const [mx, mz] of [[-5.78, -7.84], [-5.42, -7.84], [-5.78, -7.56], [-5.42, -7.56]]) {
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), woodMatchM, mx, 0.025, mz));
    g.add(mesh(new THREE.SphereGeometry(0.014, 8, 6), sulfurM, mx, 0.006, mz));
  }

  // Padded cream cotton mattress inside tray
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.05, 0.30), mat("#fbf5ea"), -5.60, 0.11, -7.70));

  // Cozy diamond-quilted patchwork blanket with turned-down white cuff
  const quiltM = mat("#ffffff", { map: matchboxBlanketTexture(), roughness: 0.9 });
  g.add(mesh(new THREE.BoxGeometry(0.28, 0.035, 0.31), quiltM, -5.53, 0.14, -7.70));
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.038, 0.31), mat("#ffffff"), -5.69, 0.14, -7.70));

  // Folded spare fleece blanket draped across foot of bed
  const spareBlanketM = mat("#d48c46", { roughness: 0.92 });
  g.add(mesh(new THREE.BoxGeometry(0.10, 0.035, 0.28), spareBlanketM, -5.38, 0.14, -7.70));

  // Plump cotton pillow
  const pillowM = mat("#fcf9f2", { roughness: 0.9 });
  g.add(mesh(new THREE.BoxGeometry(0.10, 0.05, 0.24), pillowM, -5.74, 0.16, -7.70));

  // Bedside Reading Candle (tiny metal washer + birthday candle stub with glowing wick)
  const washerM = mat("#a0a0a0", { metalness: 0.8, roughness: 0.3 });
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 12), washerM, -5.80, 0.004, -7.35));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.045, 10), mat("#f03434"), -5.80, 0.03, -7.35));
  g.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.015, 6), mat("#222222"), -5.80, 0.055, -7.35));
  g.add(mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffe066" }), -5.80, 0.065, -7.35, false));

  // Miniature Wooden Trinket Chest / Matchbox Nightstand in sleeping corner
  const chestWoodM = mat("#4e2d15", { roughness: 0.65 });
  g.add(mesh(new THREE.BoxGeometry(0.18, 0.08, 0.14), chestWoodM, -5.82, 0.04, -8.15));
  // Tiny brass latch
  g.add(mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), mat("#d4af37", { metalness: 0.85 }), -5.72, 0.045, -8.15));

  // Subtle warm glowing nightlight illuminating the sleeping corner
  const bedNightlight = new THREE.PointLight("#ffaa55", 0.75, 2.0, 1.4);
  bedNightlight.position.set(-5.70, 0.35, -7.65);
  g.add(bedNightlight);

  colliders.push(box(-5.62, -7.75, 0.56, 0.90));

  // 3. Living & Dining Area (East Alcove: X ~ -4.40, Z ~ -7.70)
  // Wooden Thread Spool Table
  const spoolWoodM = mat("#a37446", { roughness: 0.55 });
  const spoolThreadM = mat("#ffffff", { map: threadSpoolTexture(), roughness: 0.7 });

  // Top flange with center spindle hole
  g.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 24), spoolWoodM, -4.40, 0.23, -7.70));
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.022, 12), mat("#2e1c0c"), -4.40, 0.231, -7.70));
  // Thread core
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.17, 20), spoolThreadM, -4.40, 0.135, -7.70));
  // Bottom flange
  g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24), spoolWoodM, -4.40, 0.01, -7.70));

  // Postage stamp runner atop spool table
  const stampM = mat("#ffffff", { map: stampTableclothTexture(), roughness: 0.85 });
  const stampRunner = mesh(new THREE.PlaneGeometry(0.16, 0.16), stampM, -4.40, 0.242, -7.70, false);
  stampRunner.rotation.x = -Math.PI / 2;
  stampRunner.rotation.z = Math.PI / 6;
  g.add(stampRunner);

  // Tiny acorn teacup atop stamp runner with curled brass wire handle
  g.add(mesh(new THREE.SphereGeometry(0.022, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat("#4a2c14"), -4.42, 0.252, -7.65));
  const teaHandle = mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 12, Math.PI), mat("#d4af37", { metalness: 0.8 }), -4.40, 0.252, -7.65);
  teaHandle.rotation.y = Math.PI / 2;
  g.add(teaHandle);

  // Thimble Lamp (mounted beside spool with bent brass arm)
  const brassM = mat("#d4af37", { metalness: 0.85, roughness: 0.25 });
  const thimbleM = mat("#dcdcdc", { metalness: 0.92, roughness: 0.20 });
  // Wooden button base
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 16), mat("#3d220f"), -4.24, 0.246, -7.78));
  // Slender curved brass arm
  const arm = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.10, 8), brassM, -4.26, 0.295, -7.76);
  arm.rotation.z = -0.2;
  g.add(arm);
  // Dimpled silver thimble shade
  g.add(mesh(new THREE.CylinderGeometry(0.032, 0.046, 0.065, 16), thimbleM, -4.30, 0.35, -7.72));
  // Luminous amber bulb inside
  g.add(mesh(new THREE.SphereGeometry(0.022, 12, 10), new THREE.MeshBasicMaterial({ color: "#ffb648" }), -4.30, 0.33, -7.72, false));

  // Warm golden lamp glow illuminating the living nook
  const lamp = new THREE.PointLight("#ffa73e", 1.4, 2.5, 1.4);
  lamp.position.set(-4.32, 0.36, -7.68);
  g.add(lamp);

  // Fluted metal bottle-cap stool with cork cushion
  const capM = mat("#c8c8c8", { metalness: 0.85, roughness: 0.3 });
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.045, 20), capM, -4.40, 0.022, -7.30));
  g.add(mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.015, 16), mat("#ba8d5d", { roughness: 0.9 }), -4.40, 0.05, -7.30));

  colliders.push(
    box(-4.40, -7.50, 0.42, 0.65),
  );

  // 4. The Pantry (East / Northeast Area: X ~ -4.40, Z ~ -6.95)
  // Rustic wooden crate / tray holding foraged pantry goods
  const crateM = mat("#6e4726", { roughness: 0.9 });
  g.add(mesh(new THREE.BoxGeometry(0.24, 0.04, 0.20), crateM, -4.40, 0.02, -6.95));

  // 3 Sculpted Golden Acorns
  const acornNutM = mat("#8c4d1f", { roughness: 0.35 });
  const acornCapM = mat("#3e2510", { roughness: 0.9 });
  const makeAcorn = (ax: number, ay: number, az: number, rx = 0, rz = 0) => {
    const nut = mesh(new THREE.SphereGeometry(0.032, 12, 10), acornNutM, ax, ay, az);
    nut.scale.set(1, 1.28, 1);
    nut.rotation.set(rx, 0, rz);
    const cap = mesh(new THREE.SphereGeometry(0.036, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), acornCapM, ax, ay + 0.02, az);
    cap.rotation.set(rx, 0, rz);
    g.add(nut, cap);
  };
  makeAcorn(-4.45, 0.05, -6.98, 0.1, 0.2);
  makeAcorn(-4.36, 0.05, -6.96, -0.2, -0.15);
  makeAcorn(-4.42, 0.09, -6.95, 0.3, 0.1);

  // Sunflower Seeds (striped pointed seeds)
  const seedM = mat("#222222", { roughness: 0.4 });
  const seedList: [number, number, number][] = [
    [-4.48, -6.88, 0.4],
    [-4.34, -6.89, -0.6],
    [-4.42, -6.86, 1.2],
  ];
  for (const [sx, sz, srot] of seedList) {
    const seed = mesh(new THREE.ConeGeometry(0.012, 0.035, 6), seedM, sx, 0.03, sz);
    seed.rotation.x = Math.PI / 2;
    seed.rotation.z = srot;
    g.add(seed);
  }

  // Ruby Berries / Cranberries
  const berryM = mat("#c0392b", { roughness: 0.2, metalness: 0.05 });
  g.add(mesh(new THREE.SphereGeometry(0.016, 10, 8), berryM, -4.34, 0.045, -7.02));
  g.add(mesh(new THREE.SphereGeometry(0.014, 10, 8), berryM, -4.32, 0.04, -6.97));

  // Burlap Grain Sack with gathered neck and twine string collar
  const sackM = mat("#cbb08a", { roughness: 0.95 });
  const sack = mesh(new THREE.SphereGeometry(0.09, 12, 10), sackM, -4.48, 0.09, -6.85);
  sack.scale.set(1, 1.25, 1);
  g.add(sack);
  // Twine string collar
  g.add(mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12), mat("#7a5b3a"), -4.48, 0.16, -6.85));

  // Miniature Swiss Cheese Wedge nibble
  const cheeseNibbleM = mat("#f5b027", { roughness: 0.45 });
  const cheeseWedge = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 3), cheeseNibbleM, -4.32, 0.04, -6.82);
  cheeseWedge.rotation.y = Math.PI / 4;
  g.add(cheeseWedge);

  colliders.push(box(-4.40, -6.90, 0.36, 0.36));

  // 5. Personal Details on Walls & Props
  // Framed Crayon Sketch of Cheese on Back Wall (Z = -8.38)
  const frameWoodM = mat("#3a2212", { roughness: 0.6 });
  const sketchM = mat("#ffffff", { map: miniPortraitTexture(), roughness: 0.85 });
  g.add(mesh(new THREE.BoxGeometry(0.18, 0.18, 0.02), frameWoodM, -5.00, 0.42, -8.38));
  const sketchCanvas = mesh(new THREE.PlaneGeometry(0.15, 0.15), sketchM, -5.00, 0.42, -8.368, false);
  g.add(sketchCanvas);

  // Miniature Wall Shelf (wooden popsicle stick mounted with safety pins)
  g.add(mesh(new THREE.BoxGeometry(0.30, 0.015, 0.05), spoolWoodM, -4.35, 0.46, -8.37));
  // 2 miniature books on shelf
  g.add(mesh(new THREE.BoxGeometry(0.03, 0.065, 0.045), mat("#8b2635"), -4.40, 0.50, -8.37));
  g.add(mesh(new THREE.BoxGeometry(0.025, 0.06, 0.045), mat("#2b4c7e"), -4.36, 0.498, -8.37));
  // Rolled parchment map
  const scroll = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 8), mat("#eae0cb"), -4.28, 0.475, -8.37);
  scroll.rotation.z = Math.PI / 2;
  g.add(scroll);

  // Miniature Wooden Peg Rack on Back Wall (X = -5.65)
  g.add(mesh(new THREE.BoxGeometry(0.24, 0.03, 0.015), frameWoodM, -5.65, 0.44, -8.38));
  for (const px of [-5.73, -5.65, -5.57]) {
    g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.02, 6), frameWoodM, px, 0.44, -8.37));
  }
  // Tiny hanging silver key / paperclip treasure
  const keyRing = mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 12), brassM, -5.57, 0.41, -8.36);
  g.add(keyRing);

  // Giant Golden Safety Pin leaning casually in the corner
  const pinM = mat("#d4af37", { metalness: 0.9, roughness: 0.2 });
  const pin = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.22, 8), pinM, -5.90, 0.10, -8.25);
  pin.rotation.z = 0.22;
  pin.rotation.x = 0.15;
  g.add(pin);

  // ── Home marker ────────────────────────────────────────────────────────
  const homeMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.38, 32),
    new THREE.MeshBasicMaterial({ color: "#ffcf4a", transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  homeMarker.rotation.x = -Math.PI / 2;
  homeMarker.position.set(HOLE.x, 0.02, ROOM.minZ - 0.50);
  homeMarker.visible = false;
  g.add(homeMarker);

  scene.add(g);

  return {
    group: g,
    colliders,
    platforms,
    homeMarker,
    dispose: () => {
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material as THREE.MeshStandardMaterial;
          m.map?.dispose();
          m.dispose();
        }
      });
      scene.remove(g);
    },
  };
}
