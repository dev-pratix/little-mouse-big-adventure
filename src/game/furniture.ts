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
  //  +9 +-----------------------------------------------------------------------------------+
  //     | [COAT RACK]    [--- BOOKCASE SUITE ---]    [SIDE TABLE]  [--- DOUBLE BED ---] [NIGHT] |
  //     |  (-10.8, 7.8)   X: -11.92 to -11.17         (2.5, 8.4)    X: 5.63 to 8.50     STAND   |
  //     |                 Z: +0.50 to +5.30           (Flush front) Z: 5.55 to 8.92    (9.4,8.6)|
  //     |                 (Shelves face +X)                         (Under-bed open)   [LAMP]   |
  //     |                                                                                       |
  //     |                 [--- LIVING ROOM ---]                         [--- WORK ZONE ---]     |
  //     |                                                                [DESK]                 |
  //     |  [TV / CABINET]         [COFFEE TABLE]       [SOFA]            X: 10.7 to 11.9        |
  //     |  X: -11.9 to -11.2       X: -8.5 to -7.5     X: -6.5 to -5.3   Z: 0.4 to 2.6          |
  //     |  Z: -5.7 to -3.3         Z: -5.0 to -4.0     Z: -6.0 to -3.0  [CHAIR]   [TRASHCAN]    |
  //     |  (Screen faces +X)       (Legs only)         (Faces West -X)   (10.3,1.5)(11, -0.3)   |
  //   0 + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
  //     |                         [ARMCHAIR]                                                    |
  //     |                          X: -8.0 to -6.8                                              |
  //     |  [FLOOR LAMP]            Z: -3.4 to -2.4                               CHEESE #1      |
  //     |   (-11.0, -6.5)         (Faces South -Z)                                (6.0, -1.0)   |
  //     |                                                                                       |
  //     |                                        MAIN CIRCULATION                               |
  //     |                                            CORRIDOR                   [POTTED PLANT]  |
  //     |                                                                        (10.5, -7.5)   |
  //     |                                                                       CHEESE #2       |
  //     |              [BOX]                                                     (9.5, -6.5)    |
  //     |           (-3.5, -7.5)                                                                |
  //  -9 +----------------------[ MOUSE HOLE ]---------------------------------------------------+
  //
  // =========================================================================

  // ── LIVING ROOM ZONE (West wall, facing East toward sofa) ──────────────────

  // TV Cabinet (cabinetTelevision.glb) — flush against left wall skirting (X=-11.92)
  // Native: 0.80(W) x 0.25(D), scale=3 → 2.40(Z) x 0.75(X). Height 0.93m.
  // Back panel at local Z=0, front doors face local -Z.
  // At rot=-PI/2, back rests flush against X=-11.92, front doors face +X into room.
  // Z span: Z[-5.70, -3.30], centered at Z=-4.50.
  await add(FURN + "cabinetTelevision.glb",
    -11.92, -5.70, -Math.PI / 2, 3,
    -11.545, -4.50, 0.75, 2.40);

  // Modern Television (televisionModern.glb) — centered atop TV cabinet
  // Screen normal is local +Z. At rot=PI/2, screen normal points +X (East into room).
  // Native: 0.685(W) x 0.128(D), scale=3 → 2.05(Z) x 0.38(X). Height 1.36m.
  // Placed at cabinet top: Y=0.93m.
  await add(FURN + "televisionModern.glb",
    -11.545, -4.50, Math.PI / 2, 3,
    0, 0, 0, 0, 0.93);

  // Main Sofa (loungeSofa.glb) — facing West (-X) directly toward the TV
  // Native: 0.98(W) x 0.41(D), scale=3 → 2.94(Z) x 1.23(X). Height 1.38m.
  // Seat cushion faces local +Z. At rot=-PI/2, seat cushion faces -X (West).
  // Front of seat at X=-6.50, backrest at X=-5.27.
  // Z span: Z[-5.97, -3.03], centered at Z=-4.50 (aligned with TV center).
  await add(FURN + "loungeSofa.glb",
    -6.50, -5.97, -Math.PI / 2, 3,
    -5.885, -4.50, 1.23, 2.94);

  // Coffee Table (tableCoffeeSquare.glb) — centered between TV and sofa
  // Native: 0.40x0.40, scale=2.5 → 1.0x1.0m. Table top at Y=0.58m.
  // Placed at: X[-8.50, -7.50], Z[-5.00, -4.00]. Center: X=-8.00, Z=-4.50.
  // Leaves 1.0m knee room to sofa seat (X=-6.50) and 2.67m passage to TV (X=-11.17).
  // Underside clearance is 0.45m — mouse (0.15m) walks freely underneath!
  // Simplified 4-corner leg colliders:
  await add(FURN + "tableCoffeeSquare.glb",
    -7.35, -4.25, 0, 2.5,
    0, 0, 0, 0);
  colliders.push(
    box(-8.45, -4.95, 0.10, 0.10), // Back-left leg
    box(-7.55, -4.95, 0.10, 0.10), // Back-right leg
    box(-8.45, -4.05, 0.10, 0.10), // Front-left leg
    box(-7.55, -4.05, 0.10, 0.10), // Front-right leg
  );

  // Armchair (loungeChair.glb) — North flank, completing the L-shaped conversation group
  // Native: 0.49(W) x 0.41(D), scale=2.5 → 1.225(X) x 1.025(Z). Height 1.15m.
  // Seat faces local +Z. At rot=PI, seat faces South (-Z) toward coffee table and sofa.
  // Placed at: X[-8.02, -6.80], Z[-3.40, -2.38].
  await add(FURN + "loungeChair.glb",
    -6.80, -3.40, Math.PI, 2.5,
    -7.41, -2.89, 1.225, 1.025);

  // Living Room Rug (rugRectangle.glb) — frames sofa, table, and armchair suite (clear of south wall entrance corridor)
  await add(FURN + "rugRectangle.glb",
    -10.58, -4.80, 0, 3.2,
    0, 0, 0, 0);

  // Floor lamp — living room corner lighting
  await add(FURN + "lampSquareFloor.glb",
    -11.00, -6.50, 0, 2.5,
    -10.85, -6.65, 0.30, 0.30);

  // ── BEDROOM ZONE (front-right: Z near +8.92, X near +8.5) ──────────────────

  // Double Bed (bedDouble.glb)
  // Native: 0.956(W) x 1.125(D), scale=3 → 2.87(X) x 3.375(Z), height 1.125m.
  // Headboard is at local Z=-1.125. At rot=PI, headboard rotates to front wall skirting (Z=8.92).
  // World footprint: X[5.63, 8.50], Z[5.55, 8.92].
  // Clearance at foot: 2.85m to work area. Clearance to left: >5.6m to room center.
  // Clearance to right: 0.56m natural gap to nightstand, 3.42m to right wall skirting.
  // Collision: Headboard panel + two front corner posts (under-bed is open for mouse!).
  await add(FURN + "bedDouble.glb",
    8.50, 5.545, Math.PI, 3,
    0, 0, 0, 0);
  colliders.push(
    box(7.065, 8.76, 2.87, 0.32), // Solid headboard against front wall
    box(5.75, 5.65, 0.20, 0.20),  // Foot-left post
    box(8.35, 5.65, 0.20, 0.20),  // Foot-right post
  );

  // Bedside Nightstand (cabinetBedDrawer.glb) — right of bed, flush against front skirting
  // Native: 0.266(W) x 0.217(D), scale=2.5 → 0.665(X) x 0.543(Z), height 0.66m.
  // Placed at x=9.70, z=8.38, rot=PI → World X[9.06, 9.73], Z[8.38, 8.92].
  // 0.56m natural bedside gap to mattress; 2.19m open corridor to right wall.
  await add(FURN + "cabinetBedDrawer.glb",
    9.70, 8.38, Math.PI, 2.5,
    9.39, 8.65, 0.665, 0.543);

  // Bedside Lamp (lampRoundTable.glb) — centered atop nightstand (Y=0.66m)
  await add(FURN + "lampRoundTable.glb",
    9.39, 8.65, 0, 2.0,
    0, 0, 0, 0, 0.66);

  // ── WORKSTATION ZONE (right wall: X=11.92, Z around +1.5) ──────────────────

  // Study Desk (desk.glb)
  // Native: 0.734(W) x 0.392(D), scale=3 → 2.20(Z) x 1.18(X), height 1.15m.
  // Placed at x=10.74, z=0.50, rot=-PI/2.
  // Back rests flush against right wall skirting at X=11.92. Sitting front at X=10.70.
  // Z span: Z[0.44, 2.64], center Z = 1.54.
  // Central footwell (0.73m height, 1.40m width) is open for mouse exploration!
  await add(FURN + "desk.glb",
    10.74, 0.50, -Math.PI / 2, 3,
    0, 0, 0, 0);
  colliders.push(
    box(11.29, 0.755, 1.18, 0.63), // Drawer pedestal
    box(11.29, 2.555, 1.18, 0.17), // Far end support panel
  );

  // Desk Chair (chairDesk.glb) — tucked in front of desk, facing +X
  // Native: 0.335x0.314, scale=2.5 → 0.84(Z) x 0.79(X). Height 1.52m.
  // Placed at x=10.35, z=1.54, rot=PI/2.
  // Sits 0.35m from desk edge (ergonomically tucked in). Center post collider:
  await add(FURN + "chairDesk.glb",
    10.35, 1.54, Math.PI / 2, 2.5,
    9.95, 1.54, 0.40, 0.40);

  // Computer Screen (computerScreen.glb) — on desk surface (Y=1.15m)
  // Centered with desk chair at Z=1.54, facing West toward user.
  await add(FURN + "computerScreen.glb",
    11.35, 1.05, -Math.PI / 2, 2.5,
    0, 0, 0, 0, 1.15);

  // Small Desk Plant (plantSmall1.glb) — decorative on right corner of desk (Y=1.15m)
  await add(FURN + "plantSmall1.glb",
    11.35, 2.35, 0, 2.0,
    0, 0, 0, 0, 1.15);

  // Trashcan (trashcan.glb) — beside desk against right wall
  await add(FURN + "trashcan.glb",
    11.00, -0.30, 0, 1.5,
    11.00, -0.30, 0.60, 0.60);

  // ── BOOKCASE & STORAGE WALL (left wall: X=-11.92, Z around +0.5 to +5.3) ──

  // All bookcases at rot=-PI/2 against left wall skirting (X=-11.92).
  // Back rests against X=-11.92, open shelves face +X into the room!
  // bookcaseClosedWide: scale=3 → 2.40m(Z) x 0.75m(X). Z[0.50, 2.90]
  await add(FURN + "bookcaseClosedWide.glb",
    -11.92, 0.50, -Math.PI / 2, 3,
    -11.545, 1.70, 0.75, 2.40);

  // bookcaseOpen: scale=3 → 1.20m(Z) x 0.75m(X). Z[2.90, 4.10]
  await add(FURN + "bookcaseOpen.glb",
    -11.92, 2.90, -Math.PI / 2, 3,
    -11.545, 3.50, 0.75, 1.20);

  // bookcaseClosed: scale=3 → 1.20m(Z) x 0.75m(X). Z[4.10, 5.30]
  await add(FURN + "bookcaseClosed.glb",
    -11.92, 4.10, -Math.PI / 2, 3,
    -11.545, 4.70, 0.75, 1.20);

  // Books decoration on bookcase shelf (Y=0.75m)
  await add(FURN + "books.glb",
    -11.45, 3.50, -Math.PI / 2, 2.5,
    0, 0, 0, 0, 0.75);

  // ── CORNER ACCENTS & PROPS ────────────────────────────────────────────────

  // Coat rack — front-left corner
  await add(FURN + "coatRackStanding.glb",
    -10.80, 7.80, 0, 2.5,
    -10.80, 7.80, 0.50, 0.50);

  // Cardboard box near mouse-hole (story prop; clear of doorway at x=-7)
  await add(FURN + "cardboardBoxClosed.glb",
    -3.50, -7.50, 0, 2.5,
    -3.235, -7.765, 0.53, 0.53);

  // Potted plant — right side, back corner
  await add(FURN + "pottedPlant.glb",
    10.50, -7.50, 0, 2.5,
    10.50, -7.50, 0.53, 0.60);

  // Doormat near front wall (decorative, no collider)
  await add(FURN + "rugDoormat.glb",
    -1.00, 8.00, 0, 2.5,
    0, 0, 0, 0);

  // Side table — placed against front wall as an accent table
  await add(FURN + "sideTable.glb",
    2.50, 8.35, 0, 2.5,
    3.14, 8.62, 1.34, 0.55);

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
