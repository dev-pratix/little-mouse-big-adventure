// Scene setup: renderer-independent room shell + lighting.
// Furniture is now loaded asynchronously via furniture.ts using Kenney GLB assets.
// The procedural placeholder shapes that ARE replaced by GLBs have been removed.
// Preserved intact: floor plane (visible until GLB tiles load), walls, arched mouse hole,
// nook, skirting, window, cheese spots, home marker, and all colliders.
import * as THREE from "three";
import { box, platform, type Box, type Platform } from "./collision";
import { rug, wallpaper, woodFloor } from "./textures";

export const ROOM = { minX: -12, maxX: 12, minZ: -9, maxZ: 9, h: 9 };
export const HOLE = { x: -7, w: 0.9, h: 0.9 };
export const NOOK = { minX: -8.3, maxX: -5.7, minZ: -11.6, maxZ: -9.3, h: 1.4 };
export const START = { x: -7, z: -10.3, yaw: 0 };
export const CHEESE_SPOTS: [number, number][] = [
  [7.5, -1.0], // under the desk
  [9.5, -6.5], // beside the TV cabinet / bookcase
  [-9.0, 7.0], // behind the potted plant corner
];

export function isHome(x: number, z: number) {
  return z < NOOK.maxZ - 0.15 && x > NOOK.minX && x < NOOK.maxX;
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
  const W = ROOM.maxX - ROOM.minX;
  const D = ROOM.maxZ - ROOM.minZ;

  scene.background = new THREE.Color("#e8d5b0");
  scene.fog = new THREE.Fog("#e8d5b0", 24, 52);

  // ── Lights ───────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight("#fff8ee", "#9c7a55", 0.9);
  const sun = new THREE.DirectionalLight("#ffe0b0", 2.8);
  sun.position.set(8, 16, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 45;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  // Warm fill from above (like a ceiling lamp)
  const fill = new THREE.PointLight("#ffe8cc", 1.2, 30, 1.2);
  fill.position.set(0, 8, 0);
  g.add(hemi, sun, fill);

  // ── Floor (procedural — visible immediately; GLB tiles load on top) ──
  const floor = mesh(
    new THREE.PlaneGeometry(W, D),
    mat("#ffffff", { map: woodFloor(), roughness: 0.6 }),
    0, 0, 0, false,
  );
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);

  // ── Walls ─────────────────────────────────────────────────────────────
  const wallTex = wallpaper();
  const wallMat = mat("#ffffff", { map: wallTex, roughness: 0.9 });
  const side = (w: number, x: number, z: number, ry: number) => {
    const m = mesh(new THREE.PlaneGeometry(w, ROOM.h), wallMat, x, ROOM.h / 2, z, false);
    m.rotation.y = ry;
    g.add(m);
  };
  side(D, ROOM.minX, 0, Math.PI / 2);
  side(D, ROOM.maxX, 0, -Math.PI / 2);
  side(W, 0, ROOM.maxZ, Math.PI);

  // Back wall with arched mouse-hole cutout
  const shape = new THREE.Shape();
  shape.moveTo(ROOM.minX, 0);
  shape.lineTo(ROOM.maxX, 0);
  shape.lineTo(ROOM.maxX, ROOM.h);
  shape.lineTo(ROOM.minX, ROOM.h);
  shape.closePath();
  const r = HOLE.w / 2;
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

  // Arch trim around mouse hole
  const trim = mesh(
    new THREE.TorusGeometry(r + 0.04, 0.05, 8, 24, Math.PI),
    mat("#8a5a36"),
    HOLE.x, HOLE.h - r, ROOM.minZ + 0.02,
  );
  g.add(trim);
  for (const s of [-1, 1]) {
    g.add(mesh(
      new THREE.BoxGeometry(0.1, HOLE.h - r, 0.1),
      mat("#8a5a36"),
      HOLE.x + s * (r + 0.04), (HOLE.h - r) / 2, ROOM.minZ + 0.02,
    ));
  }

  // Skirting boards
  const skirt = mat("#f5ead6");
  g.add(mesh(new THREE.BoxGeometry(W, 0.35, 0.08), skirt, 0, 0.175, ROOM.maxZ - 0.04));
  g.add(mesh(new THREE.BoxGeometry(HOLE.x - r - ROOM.minX, 0.35, 0.08), skirt, (ROOM.minX + HOLE.x - r) / 2, 0.175, ROOM.minZ + 0.04));
  g.add(mesh(new THREE.BoxGeometry(ROOM.maxX - HOLE.x - r, 0.35, 0.08), skirt, (ROOM.maxX + HOLE.x + r) / 2, 0.175, ROOM.minZ + 0.04));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.35, D), skirt, ROOM.minX + 0.04, 0.175, 0));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.35, D), skirt, ROOM.maxX - 0.04, 0.175, 0));

  // Window (right wall)
  const win = mesh(
    new THREE.PlaneGeometry(5, 4),
    new THREE.MeshBasicMaterial({ color: "#e8f4ff" }),
    ROOM.maxX - 0.02, 5.5, 1, false,
  );
  win.rotation.y = -Math.PI / 2;
  g.add(win);
  const frameM = mat("#fbf3e4");
  g.add(mesh(new THREE.BoxGeometry(0.15, 0.15, 5.2), frameM, ROOM.maxX - 0.05, 5.5, 1));
  g.add(mesh(new THREE.BoxGeometry(0.15, 4.2, 0.15), frameM, ROOM.maxX - 0.05, 5.5, 1));
  // Sunlight ray effect through window
  const sunShaft = new THREE.SpotLight("#fff3dd", 1.5, 20, Math.PI / 8, 0.7, 1.5);
  sunShaft.position.set(ROOM.maxX - 0.5, 5.5, 1);
  sunShaft.target.position.set(4, 0, 1);
  g.add(sunShaft, sunShaft.target);

  // ── Room wall colliders ───────────────────────────────────────────────
    // Room wall colliders with a gap for the mouse hole doorway
    const doorHalf = HOLE.w / 2;
    const gapMargin = 0.05;
    // Back wall left side
    colliders.push({
      minX: ROOM.minX - 1,
      maxX: HOLE.x - doorHalf - gapMargin,
      minZ: ROOM.minZ - 1,
      maxZ: ROOM.minZ,
    });
    // Back wall right side
    colliders.push({
      minX: HOLE.x + doorHalf + gapMargin,
      maxX: ROOM.maxX + 1,
      minZ: ROOM.minZ - 1,
      maxZ: ROOM.minZ,
    });
    // Left wall
    colliders.push({
      minX: ROOM.minX - 1,
      maxX: ROOM.minX + 1,
      minZ: ROOM.minZ - 1,
      maxZ: ROOM.maxZ + 1,
    });
    // Right wall
    colliders.push({
      minX: ROOM.maxX - 1,
      maxX: ROOM.maxX + 1,
      minZ: ROOM.minZ - 1,
      maxZ: ROOM.maxZ + 1,
    });
    // Front wall
    colliders.push({
      minX: ROOM.minX - 1,
      maxX: ROOM.maxX + 1,
      minZ: ROOM.maxZ - 1,
      maxZ: ROOM.maxZ + 1,
    });

  // ── Rug ───────────────────────────────────────────────────────────────
  // Keep the procedural rug for immediate visual feedback; Kenney rugRectangle loads on top
  const rg = mesh(
    new THREE.PlaneGeometry(9, 6),
    mat("#ffffff", { map: rug(), roughness: 1 }),
    0, 0.01, -1.5, false,
  );
  rg.rotation.x = -Math.PI / 2;
  g.add(rg);

  // ── Mouse home (nook behind the arched hole) ──────────────────────────
  const n = NOOK;
  const nw = n.maxX - n.minX, nd = n.maxZ - n.minZ;
  const nookM = mat("#c99a6b", { side: THREE.DoubleSide, roughness: 1 });
  const ncx = (n.minX + n.maxX) / 2, ncz = (n.minZ + n.maxZ) / 2;
  const plane = (w: number, h: number, x: number, y: number, z: number, rx: number, ry: number) => {
    const p = mesh(new THREE.PlaneGeometry(w, h), nookM, x, y, z, false);
    p.receiveShadow = false;
    p.rotation.set(rx, ry, 0);
    g.add(p);
  };
  plane(nw, n.h, ncx, n.h / 2, n.minZ, 0, 0);
  plane(nd, n.h, n.minX, n.h / 2, ncz, 0, Math.PI / 2);
  plane(nd, n.h, n.maxX, n.h / 2, ncz, 0, Math.PI / 2);
  plane(nw, nd, ncx, n.h, ncz, Math.PI / 2, 0);
  const nfloor = mesh(
    new THREE.PlaneGeometry(nw, nd),
    mat("#9e6b44"),
    (n.minX + n.maxX) / 2, 0.005, (n.minZ + n.maxZ) / 2, false,
  );
  nfloor.rotation.x = -Math.PI / 2;
  g.add(nfloor);
  colliders.push(
    { minX: n.minX - 1, maxX: n.minX, minZ: n.minZ - 1, maxZ: ROOM.minZ },
    { minX: n.maxX, maxX: n.maxX + 1, minZ: n.minZ - 1, maxZ: ROOM.minZ },
    { minX: n.minX - 1, maxX: n.maxX + 1, minZ: n.minZ - 1, maxZ: n.minZ },
  );

  // Matchbox bed (mouse-scale furniture in the nook)
  g.add(mesh(new THREE.BoxGeometry(0.75, 0.18, 0.45), mat("#d8473b"), -7.85, 0.09, -11.15));
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.06, 0.4), mat("#f1d9a6"), -7.85, 0.21, -11.15));
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.08, 0.3), mat("#ffffff"), -8.1, 0.27, -11.15));
  colliders.push(box(-7.85, -11.15, 0.75, 0.45));

  // Spool table
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16), mat("#d9b07a"), -6.4, 0.3, -11.0));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.26, 12), mat("#5b88a8"), -6.4, 0.15, -11.0));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16), mat("#d9b07a"), -6.4, 0.02, -11.0));
  colliders.push(box(-6.4, -11.0, 0.4, 0.4));

  // Bottle-cap stool
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 14), mat("#c9302c", { metalness: 0.5, roughness: 0.4 }), -6.75, 0.035, -10.6));

  // Thimble lamp
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 12), mat("#c0c0c0", { metalness: 0.7, roughness: 0.3 }), -6.1, 0.07, -11.35));
  g.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffd27a" }), -6.1, 0.2, -11.35, false));
  const lamp = new THREE.PointLight("#ffbf66", 2.2, 3.2, 1.5);
  lamp.position.set(-6.4, 0.6, -10.6);
  g.add(lamp);

  // Food storage
  g.add(mesh(new THREE.SphereGeometry(0.12, 12, 10), mat("#8c5a2b"), -5.95, 0.1, -10.0));
  g.add(mesh(new THREE.SphereGeometry(0.1, 12, 10), mat("#a06a35"), -6.05, 0.08, -9.75));
  const sack = mesh(new THREE.SphereGeometry(0.16, 12, 10), mat("#cbb08a", { roughness: 1 }), -8.05, 0.14, -9.85);
  sack.scale.y = 1.2;
  g.add(sack);
  colliders.push(box(-6.0, -9.9, 0.3, 0.5), box(-8.05, -9.85, 0.3, 0.3));

  // ── Home marker ────────────────────────────────────────────────────────
  const homeMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.5, 32),
    new THREE.MeshBasicMaterial({ color: "#ffcf4a", transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  homeMarker.rotation.x = -Math.PI / 2;
  homeMarker.position.set(HOLE.x, 0.02, ROOM.minZ - 0.9);
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
