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
  //     | CoatRack       [BOOKCASES -11.17, Z 0.2-5.0]     [BEDROOM: BED]   |
  //     | (-10.8,7.8)                                      (11.4,5.55)      |
  //     |                                                  cabinet(8.4,8.4) |
  //     |                [LOUNGE]               sideTable                   |
  //     |  sofa(-8.5,-1.5)  coffee(-6.4,-0.35)  (1.5,3.5)  [WORK: DESK]     |
  //   0 +--------------------------------------------------desk(10.7,0.5)----+
  //     |  floorLamp(-9.5,-2.2)                            chair(9.9,1.6)   |
  //     |  TV cab(-11.17,-3.3)                             trashcan(11,-0.3)|
  //     |                                                  plant(10.5,-7.5) |
  //     |  cardboard(-3.5,-7.5)                                             |
  //  -9 +---------------------[mouse-hole @ X=-7]---------------------------+
  //
  // =========================================================================

  // ── LOUNGE ZONE (left-centre, facing into room & TV) ──────────────────────

  // Sofa (loungeSofa.glb)
  // Native: X[0..0.98], Z[-0.41..0]. Scale=3 → world 2.94(X) x 1.23(Z)
  // Placed at: x=-8.50, z=-1.50, rot=0
  // World footprint: X[-8.50, -5.56]  Z[-2.73, -1.50]
  // Collider centre: cx=-7.03, cz=-2.115
  await add(FURN + "loungeSofa.glb",
    -8.50, -1.50, 0, 3,
    -7.03, -2.115, 2.94, 1.23);

  // Coffee table (tableCoffeeSquare.glb)
  // Native: X[-0.461..-0.061], Z[-0.30..0.10], height 0.23m. Scale=2.5 → 1.0x1.0m, table top at 0.58m
  // Placed at: x=-6.38, z=-0.35, rot=0 → centered at X=-7.03, Z=-0.60
  // Table underside clearance is 0.45m high — mouse (0.15m) walks freely underneath!
  // Collision: 4 thin corner leg colliders (0.10x0.10m), leaving center completely open.
  await add(FURN + "tableCoffeeSquare.glb",
    -6.38, -0.35, 0, 2.5,
    0, 0, 0, 0); // No full box collider
  colliders.push(
    box(-7.48, -0.15, 0.10, 0.10), // Front-left leg
    box(-6.58, -0.15, 0.10, 0.10), // Front-right leg
    box(-7.48, -1.05, 0.10, 0.10), // Back-left leg
    box(-6.58, -1.05, 0.10, 0.10), // Back-right leg
  );

  // Lounge chair (loungeChair.glb) — right of coffee table, facing left towards table
  // Native: X[0..0.49], Z[-0.41..0]. Scale=2.5 → 1.225(X) x 1.025(Z)
  // Placed at x=-4.50, z=-1.10, rot=-PI/2
  // World footprint: X[-4.50, -3.47]  Z[-1.10, 0.12]
  // Collider centre: cx=-3.985, cz=-0.49
  await add(FURN + "loungeChair.glb",
    -4.50, -1.10, -Math.PI / 2, 2.5,
    -3.985, -0.49, 1.03, 1.22);

  // Rug under lounge (decorative, no collider)
  // Centered under sofa and table: spans X[-9.15, -4.44], Z[-2.78, -0.02]
  await add(FURN + "rugRectangle.glb",
    -9.15, -0.02, 0, 3,
    0, 0, 0, 0);

  // Floor lamp — behind / beside sofa
  // Placed at x=-9.50, z=-2.20
  // World footprint: X[-9.50, -9.20]  Z[-2.50, -2.20]
  // Collider centre: cx=-9.35, cz=-2.35
  await add(FURN + "lampSquareFloor.glb",
    -9.50, -2.20, 0, 2.5,
    -9.35, -2.35, 0.30, 0.30);

  // ── BEDROOM ZONE (front-right corner: Z near +8.92, X near +11.92) ────────

  // Bed (bedDouble.glb)
  // Native: X[0..0.956], Z[-1.125..0]. Scale=3 → world 2.87(X) x 3.375(Z), height 1.125m
  // Headboard is at local Z=-1.125. At rot=PI, headboard rotates to +Z (+3.375m from pos).
  // Placed at: x=11.40, z=5.545, rot=PI
  // Headboard rests flush against front wall skirting at Z=8.92 (5.545 + 3.375 = 8.92).
  // World footprint: X[8.53, 11.40]  Z[5.55, 8.92]. Leaves 0.52m corridor to right wall.
  // Collision: Headboard back panel + two front corner posts.
  // The mouse (0.15m high) can walk freely under the bed!
  await add(FURN + "bedDouble.glb",
    11.40, 5.545, Math.PI, 3,
    0, 0, 0, 0); // Simplified colliders added below
  colliders.push(
    box(9.965, 8.76, 2.87, 0.32), // Solid headboard against front wall
    box(8.65, 5.65, 0.20, 0.20),  // Front-left post
    box(11.25, 5.65, 0.20, 0.20), // Front-right post
  );

  // Bedside cabinet (cabinetBedDrawer.glb) — left of bed
  // Native: X[0..0.266], Z[-0.217..0], height 0.263m. Scale=2.5 → 0.665(X) x 0.54(Z), height 0.66m
  // Placed at x=8.40, z=8.38, rot=PI
  // World footprint: X[7.74, 8.40]  Z[8.38, 8.92] (flush with front wall skirting)
  // Collider centre: cx=8.07, cz=8.65
  await add(FURN + "cabinetBedDrawer.glb",
    8.40, 8.38, Math.PI, 2.5,
    8.07, 8.65, 0.66, 0.54);

  // Lamp on bedside cabinet (decorative, no collider)
  // Cabinet height is 0.66m. Centered on top of cabinet at X=8.07, Z=8.65.
  await add(FURN + "lampRoundTable.glb",
    8.07, 8.65, 0, 2.0,
    0, 0, 0, 0, 0.66);

  // ── WORK / STORAGE ZONE (right wall: X=11.92, Z around +1.5) ─────────────

  // Desk (desk.glb)
  // Native: X[0..0.734], Z[-0.392..0], height 0.384m. Scale=3 → 2.20(Z) x 1.18(X), height 1.15m
  // Placed at x=10.74, z=0.47, rot=-PI/2
  // Back rests flush against right wall skirting at X=11.92. Front at X=10.74.
  // Z span: Z[0.47, 2.67], center Z = 1.57.
  // Collision: Drawer pedestal on one side + far end panel.
  // Central footwell (Z 1.10 to 2.50, height 1.15m) is open so mouse can walk under the desk!
  await add(FURN + "desk.glb",
    10.74, 0.47, -Math.PI / 2, 3,
    0, 0, 0, 0); // Footwell open; simplified colliders below
  colliders.push(
    box(11.33, 0.785, 1.18, 0.63), // Drawer pedestal
    box(11.33, 2.585, 1.18, 0.17), // Far end support panel
  );

  // Computer screen on desk surface (desk top at Y=1.15m)
  await add(FURN + "computerScreen.glb",
    11.35, 1.57, -Math.PI / 2, 2.5,
    0, 0, 0, 0, 1.15);

  // Desk chair (chairDesk.glb) — in front of desk, facing the desk (+X)
  // Native: 0.335x0.314. Scale=2.5 → 0.84x0.78m
  // Placed at x=9.90, z=1.57, rot=PI/2
  // Compact center-post collider so mouse can easily scurry around the chair
  await add(FURN + "chairDesk.glb",
    9.90, 1.57, Math.PI / 2, 2.5,
    9.90, 1.57, 0.40, 0.40);

  // ── BOOKCASE WALL (left wall, front quadrant) ─────────────────────────────

  // All bookcases at rot=PI/2 against left wall skirting (X=-11.92).
  // At rot=PI/2: local X [0, width] → world Z [pos.z - width*scale, pos.z]
  //              local Z [-0.25, 0] → world X [pos.x - 0.75, pos.x]
  // With pos.x = -11.17: world X is [-11.92, -11.17], exactly flush with left skirting!
  // Collider cx = -11.545, colW = 0.75.

  // bookcaseClosedWide: native width 0.80m, scale=3 → 2.40m(Z)
  // pos.z = 2.60 → world Z [0.20, 2.60], cz = 1.40
  await add(FURN + "bookcaseClosedWide.glb",
    -11.17, 2.60, Math.PI / 2, 3,
    -11.545, 1.40, 0.75, 2.40);

  // bookcaseOpen: native width 0.40m, scale=3 → 1.20m(Z)
  // pos.z = 3.80 → world Z [2.60, 3.80], cz = 3.20
  await add(FURN + "bookcaseOpen.glb",
    -11.17, 3.80, Math.PI / 2, 3,
    -11.545, 3.20, 0.75, 1.20);

  // bookcaseClosed: native width 0.40m, scale=3 → 1.20m(Z)
  // pos.z = 5.00 → world Z [3.80, 5.00], cz = 4.40
  await add(FURN + "bookcaseClosed.glb",
    -11.17, 5.00, Math.PI / 2, 3,
    -11.545, 4.40, 0.75, 1.20);

  // Books decoration on bookcase shelf (height ~0.75m)
  await add(FURN + "books.glb",
    -11.35, 3.20, Math.PI / 2, 2.5,
    0, 0, 0, 0, 0.75);

  // ── TV / ENTERTAINMENT (left wall, back half) ─────────────────────────────

  // cabinetTelevision: native 0.80x0.25, scale=3 → 2.4(Z) x 0.75(X), rot=PI/2
  // Placed at: x=-11.17, z=-3.30, rot=PI/2
  // World footprint: back at X=-11.92 (resting on skirting board), front at X=-11.17
  // Z span: Z[-5.70, -3.30]
  // Collider centre: cx=-11.545, cz=-4.50
  await add(FURN + "cabinetTelevision.glb",
    -11.17, -3.30, Math.PI / 2, 3,
    -11.545, -4.50, 0.75, 2.40);

  // Television centered on top of cabinet (cabinet top at Y=0.93m)
  // Origin is centered at (0,0) in X and Z, so placing at cabinet center perfectly centers it.
  await add(FURN + "televisionModern.glb",
    -11.545, -4.50, Math.PI / 2, 3,
    0, 0, 0, 0, 0.93);

  // ── DECORATIVE / PROPS ────────────────────────────────────────────────────

  // Potted plant — right side, back corner
  // Native ~0.26x0.29, scale=2.5 → 0.64(X) x 0.73(Z)
  // Placed at x=10.5, z=-7.5 → world X[10.39, 11.03], Z[-8.10, -7.38]
  // Collider centre: cx=10.71, cz=-7.74
  await add(FURN + "pottedPlant.glb",
    10.5, -7.5, 0, 2.5,
    10.71, -7.74, 0.64, 0.73);

  // Small plant near desk (decorative on desk surface, no collider)
  await add(FURN + "plantSmall1.glb",
    11.35, 2.45, 0, 2.0,
    0, 0, 0, 0, 1.15);

  // Trashcan near desk (right wall)
  // Centered native origin, scale 1.5 → diameter ~0.7m
  // Placed at x=11.0, z=-0.30
  await add(FURN + "trashcan.glb",
    11.0, -0.30, 0, 1.5,
    11.0, -0.30, 0.60, 0.60);

  // Coat rack — front-left corner
  // Centered native origin, scale 2.5 → diameter ~0.68m
  // Placed at x=-10.8, z=7.80
  await add(FURN + "coatRackStanding.glb",
    -10.8, 7.80, 0, 2.5,
    -10.8, 7.80, 0.50, 0.50);

  // Cardboard box near mouse-hole (story prop; clear of doorway at x=-7)
  // Native 0.212x0.212, scale=2.5 → 0.53x0.53
  // Placed at x=-3.50, z=-7.50 → world X[-3.50, -2.97], Z[-8.03, -7.50]
  // Collider centre: cx=-3.235, cz=-7.765
  await add(FURN + "cardboardBoxClosed.glb",
    -3.50, -7.50, 0, 2.5,
    -3.235, -7.765, 0.53, 0.53);

  // Doormat near front wall (decorative, no collider)
  await add(FURN + "rugDoormat.glb",
    -1.0, 8.0, 0, 2.5,
    0, 0, 0, 0);

  // Side table in corridor / transition area
  // Native 0.53x0.22, scale=2.5 → 1.33(X) x 0.55(Z), height 0.96m
  // Placed at x=1.50, z=3.50 → world X[1.49, 2.82], Z[2.97, 3.52]
  // Under-table clearance allows mouse to pass freely; compact center-stem collider
  await add(FURN + "sideTable.glb",
    1.50, 3.50, 0, 2.5,
    2.16, 3.25, 0.50, 0.40);

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
