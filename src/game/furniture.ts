/**
 * furniture.ts
 * Loads Kenney GLB assets (Furniture Kit + Building Kit) and places them in the scene.
 * Returns collision boxes that merge into world.colliders.
 *
 * Design:
 *  - Each GLB is loaded once, then cloned for every placement → single HTTP fetch per model.
 *  - Building-kit wall segments tile around the room perimeter.
 *  - Furniture is arranged in a cohesive living-room layout with clear walking paths.
 *  - Collision boxes use simple axis-aligned rectangles matching visible footprints.
 *
 * Kenney conventions:
 *  - Furniture Kit models sit on Y=0 in a ~1×1 m footprint.
 *  - Building Kit wall / floor tiles are 1×1 m modular pieces.
 *  - The mouse (radius 0.13 m, height ~0.25 m) is tiny compared to furniture at 1:1.
 *    Scaling furniture 2.5–4× makes it look "human-sized" relative to the mouse.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { box, type Box } from "./collision";
import { ROOM } from "./world";

// ── Paths (relative to public/) ──────────────────────────────────────────────
const FURN = "/assets/kenney_furniture-kit/Models/GLTF format/";
const BLDG = "/assets/kenney_building-kit/Models/OBJ format/";

// ── Loader + cache ───────────────────────────────────────────────────────────
const loaderGLTF = new GLTFLoader();
const loaderOBJ = new OBJLoader();
const loaderMTL = new MTLLoader();
const cache = new Map<string, THREE.Group>();

async function loadModel(url: string): Promise<THREE.Group> {
  const cached = cache.get(url);
  if (cached) return cached;
  return new Promise<THREE.Group>((resolve, reject) => {
    if (url.endsWith('.glb') || url.endsWith('.gltf')) {
      loaderGLTF.load(url, (gltf) => {
        cache.set(url, gltf.scene);
        resolve(gltf.scene);
      }, undefined, reject);
    } else if (url.endsWith('.obj')) {
      const mtlUrl = url.replace(/\.obj$/i, '.mtl');
      loaderMTL.load(mtlUrl, (materials) => {
        materials.preload();
        loaderOBJ.setMaterials(materials);
        loaderOBJ.load(url, (obj) => {
          const group = new THREE.Group();
          group.add(obj);
          cache.set(url, group);
          resolve(group);
        }, undefined, reject);
      }, undefined, reject);
    } else {
      reject(new Error(`Unsupported model format for ${url}`));
    }
  });
}

/** Clone a loaded model and place it into the scene at (x, y, z) with rotation and scale. */
function place(
  parent: THREE.Group,
  model: THREE.Group,
  x: number,
  y: number,
  z: number,
  ry = 0,
  scale = 1,
): THREE.Group {
  const clone = model.clone(true);
  clone.position.set(x, y, z);
  clone.rotation.y = ry;
  clone.scale.setScalar(scale);
  clone.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  parent.add(clone);
  return clone;
}

// ── Public interface ─────────────────────────────────────────────────────────
export interface FurnitureResult {
  colliders: Box[];
  dispose: () => void;
}

/**
 * Load all Kenney GLB assets, place them, and return collision boxes.
 * Fire-and-forget from Engine (colliders are pushed once the Promise resolves).
 */
export async function loadFurniture(
  sceneGroup: THREE.Group,
): Promise<FurnitureResult> {
  const colliders: Box[] = [];
  const groups: THREE.Group[] = [];

  // ── Helper: load → place → collider ────────────────────────────────────
  const add = async (
    file: string,
    x: number,
    z: number,
    ry = 0,
    colW = 0,
    colD = 0,
    scale = 1,
    yOffset = 0,
  ) => {
    try {
      const model = await loadModel(file);
      const g = place(sceneGroup, model, x, yOffset, z, ry, scale);
      groups.push(g);
      if (colW > 0 && colD > 0) {
        colliders.push(box(x, z, colW * scale, colD * scale));
      }
      return g;
    } catch (e) {
      console.warn(`[furniture] failed to load ${file}`, e);
      return null;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  BUILDING KIT — floor tiles + wall segments
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Floor tiles ────────────────────────────────────────────────────────
  // Building-kit floor.glb is 1×1 m. We tile the room (X: -12..12, Z: -9..9).
  // Step by 1 unit; 24×18 = 432 clones. Skip the nook (Z < -9 is covered by world.ts).
  {
    const floorModel = null; // Kenney floor tiles disabled
    if (floorModel) {
      for (let xi = -12; xi < 12; xi++) {
        for (let zi = -9; zi < 9; zi++) {
          const f = floorModel.clone(true);
          f.position.set(xi + 0.5, -0.1, zi + 0.5);
          f.traverse((o) => {
            if (o instanceof THREE.Mesh) o.receiveShadow = true;
          });
          sceneGroup.add(f);
        }
      }
      groups.push(floorModel);
    }
  }

  // ── Wall segments along the room perimeter ─────────────────────────────
  // Building-kit wall.glb is 1 m wide × ~3 m tall. We scale it so one unit = ~3 m high.
  // Room height is 9 m → scale each wall piece by 3× (3×3 = 9 m tall, 3 m wide per piece).
  // We leave gaps for the arched mouse hole (handled by world.ts).
  const WALL_SCALE = 3;
  const WALL_STEP = WALL_SCALE; // each piece covers 3 m of wall length
  {
    const wallModel = await loadModel(BLDG + "wall.obj").catch(() => null);
    const wallWindowModel = await loadModel(BLDG + "wall-window-square.obj").catch(() => null);
    const wallCornerModel = await loadModel(BLDG + "wall-corner.obj").catch(() => null);

    if (wallModel) {
      // ── Back wall (Z = ROOM.minZ = -9) ─────────────────────────────────
      // Skip the segment around X = -7 where the mouse hole is
      for (let xi = ROOM.minX; xi < ROOM.maxX; xi += WALL_STEP) {
        // Skip the segment covering the mouse hole (around x = -7, width ~1.5)
        if (xi >= -9 && xi < -6) continue;
        place(sceneGroup, wallModel, xi + WALL_STEP / 2, 0, ROOM.minZ, 0, WALL_SCALE);
      }

      // ── Front wall (Z = ROOM.maxZ = 9) ─────────────────────────────────
      for (let xi = ROOM.minX; xi < ROOM.maxX; xi += WALL_STEP) {
        place(sceneGroup, wallModel, xi + WALL_STEP / 2, 0, ROOM.maxZ, Math.PI, WALL_SCALE);
      }

      // ── Left wall (X = ROOM.minX = -12) ────────────────────────────────
      for (let zi = ROOM.minZ; zi < ROOM.maxZ; zi += WALL_STEP) {
        place(sceneGroup, wallModel, ROOM.minX, 0, zi + WALL_STEP / 2, Math.PI / 2, WALL_SCALE);
      }

      // ── Right wall (X = ROOM.maxX = 12) — with a window segment ───────
      for (let zi = ROOM.minZ; zi < ROOM.maxZ; zi += WALL_STEP) {
        // Place a window segment around z = 0..3 on the right wall
        if (wallWindowModel && zi >= 0 && zi < 3) {
          place(sceneGroup, wallWindowModel, ROOM.maxX, 0, zi + WALL_STEP / 2, -Math.PI / 2, WALL_SCALE);
        } else {
          place(sceneGroup, wallModel, ROOM.maxX, 0, zi + WALL_STEP / 2, -Math.PI / 2, WALL_SCALE);
        }
      }

      groups.push(wallModel);
      if (wallWindowModel) groups.push(wallWindowModel);
    }

    // ── Corner columns ───────────────────────────────────────────────────
    if (wallCornerModel) {
      place(sceneGroup, wallCornerModel, ROOM.minX, 0, ROOM.minZ, Math.PI / 2, WALL_SCALE);
      place(sceneGroup, wallCornerModel, ROOM.maxX, 0, ROOM.minZ, 0, WALL_SCALE);
      place(sceneGroup, wallCornerModel, ROOM.minX, 0, ROOM.maxZ, Math.PI, WALL_SCALE);
      place(sceneGroup, wallCornerModel, ROOM.maxX, 0, ROOM.maxZ, -Math.PI / 2, WALL_SCALE);
      groups.push(wallCornerModel);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  FURNITURE KIT — cohesive living-room layout
  // ═══════════════════════════════════════════════════════════════════════════
  //
  //  Room layout (top-down, looking from above):
  //
  //    ┌────────────────────────────────────────────┐  Z = 9 (front wall)
  //    │  Potted plant   Bookcase wall   Bed area   │
  //    │  (NW corner)    (N center)      (NE)       │
  //    │                                            │
  //    │   Sofa + coffee table          Side table   │
  //    │   (center-left)               (near bed)   │
  //    │                                            │
  //    │   Lounge chair    Open space    Desk area   │  Z = 0 (center)
  //    │   (SW area)       (walking)    (E center)  │
  //    │                                            │
  //    │   Floor lamp      Rug          TV cabinet   │
  //    │                   Trashcan     + Bookcase   │
  //    │                                            │
  //    │   [mouse hole]                             │  Z = -9 (back wall)
  //    └────────────────────────────────────────────┘
  //    X = -12                                X = 12

  // ── BED AREA (top-right corner) ────────────────────────────────────────
  // bedDouble: ~1×1.8 footprint. Scale 3× → 3×5.4 m
  await add(FURN + "bedDouble.glb", 8.5, 6.5, -Math.PI / 2, 2.0, 1.0, 3);

  // Pillows on the bed
  await add(FURN + "pillow.glb", 9.5, 6.5, 0, 0, 0, 2.5, 1.6);
  await add(FURN + "pillowBlueLong.glb", 9.0, 5.5, 0.3, 0, 0, 2.5, 1.6);

  // Bedside cabinet (left of bed)
  await add(FURN + "cabinetBedDrawer.glb", 5.5, 7.0, 0, 0.5, 0.5, 2.5);

  // Lamp on the bedside table
  await add(FURN + "lampRoundTable.glb", 5.5, 7.0, 0, 0, 0, 2.5, 2.0);

  // ── DESK AREA (right side, center) ─────────────────────────────────────
  // desk: ~1×0.6 footprint. Scale 3× → 3×1.8 m
  await add(FURN + "desk.glb", 9.0, -1.0, Math.PI, 1.0, 0.6, 3);

  // Desk chair facing the desk
  await add(FURN + "chairDesk.glb", 9.0, 1.0, 0, 0.5, 0.5, 2.5);

  // Computer screen on desk
  await add(FURN + "computerScreen.glb", 9.0, -1.0, Math.PI, 0, 0, 2.5, 2.2);

  // Keyboard + mouse on desk
  await add(FURN + "computerKeyboard.glb", 8.5, -0.5, Math.PI, 0, 0, 2.5, 2.2);
  await add(FURN + "computerMouse.glb", 10.0, -0.5, Math.PI, 0, 0, 2.5, 2.2);

  // ── LOUNGE AREA (center-left) ──────────────────────────────────────────
  // Sofa facing inward (toward center of room)
  await add(FURN + "loungeSofa.glb", -5.0, 3.0, -Math.PI / 2, 1.0, 0.5, 3);

  // Coffee table in front of sofa
  await add(FURN + "tableCoffeeSquare.glb", -2.0, 3.0, 0, 0.8, 0.8, 2.5);

  // Lounge chair across from sofa (conversation layout)
  await add(FURN + "loungeChair.glb", -2.0, 6.0, Math.PI, 0.5, 0.5, 2.5);

  // ── BOOKCASE WALL (left side, upper area) ──────────────────────────────
  await add(FURN + "bookcaseClosed.glb", -10.5, 6.0, Math.PI / 2, 0.4, 1.0, 3);
  await add(FURN + "bookcaseOpen.glb", -10.5, 3.0, Math.PI / 2, 0.4, 1.0, 3);
  await add(FURN + "bookcaseClosedWide.glb", -10.5, 0.0, Math.PI / 2, 0.6, 1.2, 3);

  // Books scattered near bookcases — decorative, no collision
  await add(FURN + "books.glb", -9.5, 5.0, 0.3, 0, 0, 2.5);

  // ── TV / ENTERTAINMENT AREA (right side, lower area) ──────────────────
  // TV cabinet against the back-right wall
  await add(FURN + "cabinetTelevision.glb", 8.0, -6.0, 0, 1.2, 0.5, 3);

  // Television on top of cabinet
  await add(FURN + "televisionModern.glb", 8.0, -6.0, 0, 0, 0, 3, 2.5);

  // Tall bookcase next to TV area
  await add(FURN + "bookcaseClosedDoors.glb", 10.5, -7.5, 0, 0.5, 0.4, 3.5);

  // ── MISC FURNITURE ─────────────────────────────────────────────────────
  // Potted plant in north-west corner
  await add(FURN + "pottedPlant.glb", -10.5, 7.5, 0, 0.4, 0.4, 3);

  // Small plant near desk
  await add(FURN + "plantSmall2.glb", 10.5, -3.0, 0, 0, 0, 2.5);

  // Floor lamp near the lounge area
  await add(FURN + "lampSquareFloor.glb", -7.0, 5.5, 0, 0.3, 0.3, 3);

  // Rug in the center — decorative, no collision (colW=0)
  await add(FURN + "rugRectangle.glb", 0, 0, 0, 0, 0, 3);

  // Trashcan near desk
  await add(FURN + "trashcan.glb", 7.0, 0.5, 0, 0.3, 0.3, 2.5);

  // Side table between bed and sitting area
  await add(FURN + "sideTable.glb", 5.0, 3.5, 0, 0.4, 0.4, 2.5);

  // Coat rack near the front wall
  await add(FURN + "coatRackStanding.glb", -10.5, -7.5, 0, 0.3, 0.3, 3);

  // Cardboard box — environmental storytelling, near the mouse hole
  await add(FURN + "cardboardBoxClosed.glb", -4.0, -7.5, 0.2, 0.6, 0.6, 2.5);

  // Radio on the side table
  await add(FURN + "radio.glb", 5.0, 3.5, 0, 0, 0, 2.0, 1.8);

  // ── Doormat near the front wall entrance ──────────────────────────────
  await add(FURN + "rugDoormat.glb", 0, 8.2, 0, 0, 0, 2.5);

  return {
    colliders,
    dispose: () => {
      for (const g of groups) {
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            const m = Array.isArray(o.material) ? o.material : [o.material];
            m.forEach((mat) => (mat as THREE.Material).dispose());
          }
        });
        sceneGroup.remove(g);
      }
      cache.clear();
    },
  };
}
