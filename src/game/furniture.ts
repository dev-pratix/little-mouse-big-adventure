/**
 * furniture.ts
 * Loads Kenney GLB assets and places them in the scene.
 * Returns collision boxes that merge into world.colliders.
 *
 * Design:
 *  - Each GLB is loaded once, then cloned for every placement → single HTTP fetch per model.
 *  - Furniture is arranged in three recognisable zones: lounge, bedroom, work/storage.
 *  - Room perimeter walls are handled entirely by world.ts (PlaneGeometry + ExtrudeGeometry).
 *  - Collision boxes use simple axis-aligned rectangles matching visible footprints.
 *
 * Kenney GLB convention: the model's local origin is at ONE CORNER of its base,
 * NOT at the geometric centre. When we call place(model, x, 0, z) the corner
 * lands at (x, z). To centre a collider on the VISUAL footprint we must add
 * half the world-space extent to form the AABB centre.
 *
 * All placements below document the expected world footprint explicitly so
 * future edits can verify positions without loading the scene.
 *
 * Room extents (X: -12 → +12, Z: -9 → +9). Wall colliders block at |X|>=11, Z>=8, Z<=-9.
 * Mouse hole at X=-7, Z=-9. Mouse radius = 0.13 m.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { box, type Box } from "./collision";
import { ROOM } from "./world";

// ── Paths (relative to public/) ──────────────────────────────────────────────
const FURN = "/assets/kenney_furniture-kit/Models/GLTF format/";

// ── Loader + cache ───────────────────────────────────────────────────────────
const loaderGLTF = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

async function loadModel(url: string): Promise<THREE.Group> {
  const cached = cache.get(url);
  if (cached) return cached;
  return new Promise<THREE.Group>((resolve, reject) => {
    loaderGLTF.load(url, (gltf) => {
      cache.set(url, gltf.scene);
      resolve(gltf.scene);
    }, undefined, reject);
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

  /**
   * add — load model, place in scene, register collider.
   *
   * colCX / colCZ = WORLD-SPACE CENTRE of the visible footprint (not the placement origin).
   * colW / colD   = WORLD-SPACE full extents (already scaled).
   * Pass colW=0, colD=0 for purely decorative objects with no collision.
   */
  const add = async (
    file: string,
    x: number,
    z: number,
    ry = 0,
    scale = 1,
    colCX = 0,
    colCZ = 0,
    colW = 0,
    colD = 0,
    yOff = 0,
  ) => {
    try {
      const model = await loadModel(file);
      const g = place(sceneGroup, model, x, yOff, z, ry, scale);
      groups.push(g);
      if (colW > 0 && colD > 0) {
        colliders.push(box(colCX, colCZ, colW, colD));
      }
      return g;
    } catch (e) {
      console.warn(`[furniture] failed to load ${file}`, e);
      return null;
    }
  };

  // =========================================================================
  //  LAYOUT — top-down (X: -12 left → +12 right, Z: -9 back → +9 front)
  //
  //  +9 +------------------------------------------------------------------+
  //     | CoatRack   [bookcase wall -11.75, z 1.5-7.7]  [bedroom: bed]    |
  //     | (-10.5,7.5)                    sideTable(1.5,3.5)  bed(10,3.2)  |
  //     |                                                   cabinet(4.5,5.5)|
  //     |              [LOUNGE]                                             |
  //     |  sofa(-9.5,-1.73)  coffee(-7.5,0.5)  chair(-4.5,0.5)            |
  //   0 +------------------------------------------------------------------+
  //     |  floorLamp(-10.5,-2.5)               desk(9.3,0.1) rot=-pi/2    |
  //     |  TV cab(-11.75,-5.7)                 deskChair(8.0,-1.6)        |
  //     |                                      plant(10.0,-7.5)           |
  //     |  cardboard(-3.5,-7.5)                                            |
  //  -9 +---------------------[mouse-hole @ X=-7]------------------------  +
  //
  // =========================================================================

  // ── LOUNGE ZONE (left-centre, straddles Z=0) ──────────────────────────────

  // Sofa (loungeSofa.glb)
  // Native: X[0..0.98], Z[-0.41..0]. Scale=3 → world 2.94(X) x 1.23(Z)
  // Placed at corner: x=-9.5, z=-1.73, rot=0
  // World footprint: X[-9.5, -6.56]  Z[-1.73, -0.50]
  // Collider centre: cx=-8.03, cz=-1.115
  await add(FURN + "loungeSofa.glb",
    -9.5, -1.73, 0, 3,
    -8.03, -1.115, 2.94, 1.23);

  // Coffee table (tableCoffeeSquare.glb)
  // Native: 0.40x0.40. Scale=2.5 → 1.0x1.0 world
  // Placed at corner: x=-7.5, z=0.5, rot=0
  // World footprint: X[-7.5, -6.5]  Z[0.5, 1.5]
  // Collider centre: cx=-7.0, cz=1.0
  await add(FURN + "tableCoffeeSquare.glb",
    -7.5, 0.5, 0, 2.5,
    -7.0, 1.0, 1.0, 1.0);

  // Lounge chair (loungeChair.glb) — right of coffee table, faces sofa (rot=PI)
  // Native: X[0..0.49], Z[-0.41..0]. Scale=2.5 → 1.225(X) x 1.025(Z)
  // At rot=PI: local +X -> world -X, local -Z -> world +Z
  //   World X from pos: [pos.x - 1.225, pos.x]
  //   World Z from pos: [pos.z, pos.z + 1.025]
  // Place at x=-4.5, z=0.5 → world X[-5.725, -4.5]  Z[0.5, 1.525]
  // Collider centre: cx=-5.1125, cz=1.0125
  await add(FURN + "loungeChair.glb",
    -4.5, 0.5, Math.PI, 2.5,
    -5.1125, 1.0125, 1.225, 1.025);

  // Rug under lounge (decorative, no collider)
  await add(FURN + "rugRectangle.glb",
    -9.5, -2.0, 0, 3,
    0, 0, 0, 0);

  // Floor lamp — between bookcases and sofa
  // Native: ~0.15x0.15. Scale=2.5 → 0.375x0.375
  // Place at x=-10.5, z=-2.5 → world X[-10.5,-10.125]  Z[-2.5,-2.125]
  // Collider centre: cx=-10.3125, cz=-2.3125
  await add(FURN + "lampSquareFloor.glb",
    -10.5, -2.5, 0, 2.5,
    -10.3125, -2.3125, 0.375, 0.375);

  // ── BEDROOM ZONE (right side, front half) ─────────────────────────────────

  // Bed (bedDouble.glb)
  // Native: X[-0.06..1.56], Z[-1.89..0.02]. WIDTH=1.62, DEPTH=1.91
  // Scale=3 → 4.86(X) x 5.73(Z)
  // At rot=PI: local +X -> world -X, local +Z -> world -Z (model is mirrored)
  //   World X: [pos.x - 1.56*3, pos.x + 0.06*3] = [pos.x-4.68, pos.x+0.18]
  //   World Z: [pos.z - 0.02*3, pos.z + 1.89*3] = [pos.z-0.06, pos.z+5.67]
  // Target: headboard near front wall (z=9). Set pos.z+5.67=8.9 → pos.z=3.23 → use 3.2
  //   X: right side of room. pos.x-4.68=5.32 → pos.x=10.0
  //   World X: [5.32, 10.18]  Z: [3.14, 8.87]  both inside room. Wall at x=12. ✓
  // Collider centre: cx=7.75, cz=6.005
  await add(FURN + "bedDouble.glb",
    10.0, 3.2, Math.PI, 3,
    7.75, 6.005, 4.86, 5.73);

  // Bedside cabinet (cabinetBedDrawer.glb) — left of bed
  // Native: 0.27x0.38. Scale=2.5 → 0.675(X) x 0.95(Z), rot=0
  // Place at x=4.5, z=5.5 → world X[4.5, 5.175]  Z[5.5, 6.45]
  // Collider centre: cx=4.8375, cz=5.975
  await add(FURN + "cabinetBedDrawer.glb",
    4.5, 5.5, 0, 2.5,
    4.8375, 5.975, 0.675, 0.95);

  // Lamp on bedside cabinet (decorative, no collider)
  // Cabinet height: 0.263*2.5 = 0.66 m
  await add(FURN + "lampRoundTable.glb",
    4.5, 5.5, 0, 2.0,
    0, 0, 0, 0, 0.66);

  // ── WORK / STORAGE ZONE (right wall, back half) ───────────────────────────

  // Desk (desk.glb)
  // Native: X[0..0.73], Z[-0.56..0]. Scale=3
  // At rot=-PI/2: local X → world -Z, local Z → world +X
  //   World X: [pos.x, pos.x + 0.56*3] = [pos.x, pos.x+1.68]
  //   World Z: [pos.z - 0.73*3, pos.z] = [pos.z-2.19, pos.z]
  // Right wall inner at x=11. Desk maxX = pos.x+1.68 <= 11 → pos.x <= 9.32. Use 9.3.
  // Z: pos.z=0.1 → world Z[-2.09, 0.1]
  // Collider centre: cx=10.14, cz=-0.995
  await add(FURN + "desk.glb",
    9.3, 0.1, -Math.PI / 2, 3,
    10.14, -0.995, 1.68, 2.19);

  // Computer screen on desk (decorative, no collider)
  await add(FURN + "computerScreen.glb",
    9.3, 0.1, -Math.PI / 2, 2.5,
    0, 0, 0, 0, 1.15);

  // Desk chair (chairDesk.glb) — in front of desk
  // Native: X[0..0.48], Z[-0.44..0]. Scale=2.5 → 1.2(X) x 1.1(Z)
  // At rot=PI/2: local X → world +Z, local Z → world -X
  //   World X: [pos.x - 0.44*2.5, pos.x] = [pos.x-1.1, pos.x]
  //   World Z: [pos.z, pos.z + 0.48*2.5] = [pos.z, pos.z+1.2]
  // Place at x=8.0, z=-1.6 → world X[6.9, 8.0]  Z[-1.6, -0.4]
  // Collider centre: cx=7.45, cz=-1.0
  await add(FURN + "chairDesk.glb",
    8.0, -1.6, Math.PI / 2, 2.5,
    7.45, -1.0, 1.1, 1.2);

  // ── BOOKCASE WALL (left wall, front quadrant) ─────────────────────────────

  // All bookcases at rot=PI/2 against left wall (x=-11.75).
  // At rot=PI/2: local X → world +Z, local Z → world +X
  //   World X: [pos.x, pos.x + depth*scale] = [-11.75, -11.0]
  //   World Z: [pos.z, pos.z + width*scale]
  // Wall collider inner edge is at x=-11. Bookcase maxX=-11.0 — flush with boundary. ✓

  // bookcaseClosed: native 0.40x0.25, scale=3 → 1.2(Z) x 0.75(X)
  // Place at x=-11.75, z=6.5 → world Z[6.5, 7.7]
  // Collider centre: cx=-11.375, cz=7.1
  await add(FURN + "bookcaseClosed.glb",
    -11.75, 6.5, Math.PI / 2, 3,
    -11.375, 7.1, 0.75, 1.2);

  // bookcaseOpen: same native size
  // Place at x=-11.75, z=4.5 → world Z[4.5, 5.7]
  // Collider centre: cx=-11.375, cz=5.1
  await add(FURN + "bookcaseOpen.glb",
    -11.75, 4.5, Math.PI / 2, 3,
    -11.375, 5.1, 0.75, 1.2);

  // bookcaseClosedWide: native 0.80x0.25, scale=3 → 2.4(Z) x 0.75(X)
  // Place at x=-11.75, z=1.5 → world Z[1.5, 3.9]
  // Collider centre: cx=-11.375, cz=2.7
  await add(FURN + "bookcaseClosedWide.glb",
    -11.75, 1.5, Math.PI / 2, 3,
    -11.375, 2.7, 0.75, 2.4);

  // Books decoration — no collider
  await add(FURN + "books.glb",
    -10.8, 5.5, 0.3, 2.5,
    0, 0, 0, 0);

  // ── TV / ENTERTAINMENT (left wall, back half) ─────────────────────────────

  // cabinetTelevision: native 0.80x0.25, scale=3 → 2.4(Z) x 0.75(X), rot=PI/2
  // Place at x=-11.75, z=-5.7 → world X[-11.75,-11.0]  Z[-5.7,-3.3]
  // Collider centre: cx=-11.375, cz=-4.5
  await add(FURN + "cabinetTelevision.glb",
    -11.75, -5.7, Math.PI / 2, 3,
    -11.375, -4.5, 0.75, 2.4);

  // Television on top (cabinet height: 0.31*3 = 0.93 m)
  await add(FURN + "televisionModern.glb",
    -11.75, -5.7, Math.PI / 2, 3,
    0, 0, 0, 0, 0.93);

  // ── DECORATIVE / PROPS ────────────────────────────────────────────────────

  // Potted plant — right side, back corner
  // Native ~0.35x0.35, scale=2.5 → 0.875x0.875
  // Place at x=10.0, z=-7.5 → world X[10.0,10.875]  Z[-7.5,-6.625]
  // Collider centre: cx=10.4375, cz=-7.0625
  await add(FURN + "pottedPlant.glb",
    10.0, -7.5, 0, 2.5,
    10.4375, -7.0625, 0.875, 0.875);

  // Small plant near desk (decorative, no collider)
  await add(FURN + "plantSmall1.glb",
    9.3, -2.5, 0, 2.0,
    0, 0, 0, 0);

  // Trashcan near desk
  // ~0.15x0.15 native, scale=2.0 → 0.3x0.3
  // Collider centre: cx=8.65, cz=0.65
  await add(FURN + "trashcan.glb",
    8.5, 0.5, 0, 2.0,
    8.65, 0.65, 0.3, 0.3);

  // Coat rack — front-left corner, z=7.5 keeps it clear of front-wall collider (minZ=8)
  // ~0.15x0.15 native, scale=2.5 → 0.375x0.375
  // Collider centre: cx=-10.3125, cz=7.6875
  await add(FURN + "coatRackStanding.glb",
    -10.5, 7.5, 0, 2.5,
    -10.3125, 7.6875, 0.375, 0.375);

  // Cardboard box near mouse-hole (story prop; clear of doorway at x=-7)
  // ~0.43x0.43 native, scale=2.5 → 1.075x1.075
  // Place at x=-3.5, z=-7.5 → world X[-3.5,-2.425]  Z[-7.5,-6.425]
  // Collider centre: cx=-2.9625, cz=-6.9625
  await add(FURN + "cardboardBoxClosed.glb",
    -3.5, -7.5, 0.2, 2.5,
    -2.9625, -6.9625, 1.075, 1.075);

  // Doormat near front wall (decorative, no collider)
  await add(FURN + "rugDoormat.glb",
    -1.0, 8.0, 0, 2.5,
    0, 0, 0, 0);

  // Side table between lounge and bedroom
  // ~0.30x0.30 native, scale=2.5 → 0.75x0.75
  // Place at x=1.5, z=3.5 → world X[1.5,2.25]  Z[3.5,4.25]
  // Collider centre: cx=1.875, cz=3.875
  await add(FURN + "sideTable.glb",
    1.5, 3.5, 0, 2.5,
    1.875, 3.875, 0.75, 0.75);

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
